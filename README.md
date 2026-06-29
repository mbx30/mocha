# mocha-merge

Monorepo combining **Mint** (print-shop ERP) and **Stirling** (PDF sidecar with print-preflight).

## Layout

- `mint/` — Tauri desktop app (invoices, estimates, QuickBooks, PDF Tools client)
- `stirling/` — Stirling PDF fork (`feature/print-preflight`) with `POST /api/v1/general/print-preflight`
- `docker-compose.yml` — builds local Stirling image (not `stirlingtools/stirling-pdf:latest`)

## Prerequisites

- Docker Desktop
- Node.js 22+
- Rust 1.77+
- JDK 25 + Gradle (for Stirling backend tests only)

## Quick start

```powershell
# Start Stirling sidecar (first build may take 15–30 min)
cd C:\.dev\mocha-merge
docker compose up -d --build

# Verify health
curl http://127.0.0.1:8080/api/v1/info/status

# Run Mint
cd mint
npm install
npm run tauri:dev
```

## Tests

```powershell
# Mint frontend
cd mint && npm ci && npm test && npm run build

# Mint Rust
cd mint\src-tauri && cargo test

# Stirling backend (from stirling/)
cd stirling && .\gradlew :stirling-pdf:test --tests "stirling.software.SPDF.controller.api.PreflightControllerTest"
```

## Environment

- `STIRLING_URL` — override sidecar URL (default `http://127.0.0.1:8080`)
- `MOCHA_MERGE_ROOT` — path to this repo root (auto-detected when `mint/` is a child)
