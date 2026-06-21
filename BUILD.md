# Build Requirements

This document lists the system-level dependencies and toolchain requirements for building Frappe on each platform. The Rust source code itself is platform-agnostic — these are C libraries and system tools that the Rust crates need at build time.

## Common requirements (all platforms)

- **Rust 1.77.2+** with `cargo` (use [rustup](https://rustup.rs/))
- **Node.js 22+** and **npm 10+** (for the frontend)
- **Tauri CLI 2.x** (`npm install` will install this as a devDependency)

## Linux (Ubuntu 22.04+ / Debian 12+)

The Rust crates `pdfium-render`, `keyring` (via `secret-service`/`dbus`), `ring` (used by rustls for TLS), and Tauri itself require the following system packages:

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libdbus-1-dev \
  pkg-config \
  build-essential \
  libsoup-3.0-dev
```

Notes:
- The `reqwest` crate is configured with `rustls-tls` (not `native-tls`) so **no OpenSSL development headers are needed** (libssl-dev is not required).
- `pkg-config` and `libdbus-1-dev` are required for `keyring` to build its `dbus` backend.
- `build-essential` provides `gcc` for the C code in `ring` (used by rustls).
- `libwebkit2gtk-4.1-dev` is the runtime webview used by Tauri on Linux.

## macOS (11 Big Sur+)

- **Xcode Command Line Tools**: `xcode-select --install`
- **No additional packages** required. The Rust toolchain includes the macOS SDK.
- `keyring` uses the macOS Keychain API directly.
- `pdfium-render` will try to load `libpdfium.dylib` from `src-tauri/resources/`. Bundle one in production.

## Windows (10/11)

- **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload (provides MSVC `link.exe` and the Windows SDK)
- **No additional packages** required. The Rust toolchain includes the Windows SDK headers via the `x86_64-pc-windows-msvc` target.
- `keyring` uses the Windows Credential Manager API directly.
- `pdfium-render` will try to load `pdfium.dll` from `src-tauri/resources/`. Bundle one in production.

## Verifying your setup

```bash
# From the repo root
cd src-tauri
cargo check                  # Should pass cleanly
cd ..
npx tsc -b --noEmit          # Should pass cleanly
```

## Common build errors

### `Could not find directory of OpenSSL installation` (Linux)
This means `reqwest` was compiled with `native-tls` enabled. The fix is in `src-tauri/Cargo.toml`:
```toml
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
```

### `failed to find tool "x86_64-linux-gnu-gcc"` (cross-compile)
You need the Linux cross-compilation toolchain. Easier: build on a Linux host (or in a Docker container based on `rust:bookworm`).

### `libdbus-1-dev` not found (Linux)
`sudo apt-get install libdbus-1-dev pkg-config`

### `pkg-config has not been configured to support cross-compilation`
You're trying to cross-compile from a non-Linux host without setting up a Linux sysroot. Either build on Linux, or use a Docker-based build:
```bash
docker run --rm -v "$PWD:/app" rust:bookworm bash -c "cd /app/src-tauri && apt-get update && apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libdbus-1-dev pkg-config build-essential libsoup-3.0-dev && cargo check"
```

## CI

The GitHub Actions workflow at `.github/workflows/ci.yml` runs the build on `ubuntu-latest`, `windows-latest`, and `macos-latest` in parallel. The Linux job installs the required apt packages via `sudo apt-get install`.
