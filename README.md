<p align="center">
  <img src="https://raw.githubusercontent.com/Stirling-Tools/Stirling-PDF/main/docs/stirling.png" width="80" alt="Stirling PDF logo">
</p>

<h1 align="center">Mocha</h1>

<p align="center">
  <strong>A Stirling PDF fork built for print production.</strong><br>
  Everything Stirling already does — plus server-side bleed and crop marks via <code>print-preflight</code>.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT" /></a>
  <a href=".github/workflows/build.yml"><img src="https://img.shields.io/github/actions/workflow/status/mbx30/mocha/build.yml?style=flat-square&label=CI" alt="CI status" /></a>
  <a href="https://github.com/Stirling-Tools/Stirling-PDF"><img src="https://img.shields.io/badge/upstream-Stirling--PDF-2c3e50?style=flat-square" alt="Upstream: Stirling PDF" /></a>
  <img src="https://img.shields.io/badge/print--preflight-bleed%20%2B%20crop%20marks-8e44ad?style=flat-square" alt="Print preflight" />
  <img src="https://img.shields.io/badge/tools-50%2B%20PDF%20ops-1abc9c?style=flat-square" alt="50+ PDF tools" />
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start ↓</b></a> ·
  <a href="#-why-mocha">Why Mocha</a> ·
  <a href="#-print-preflight">Print Preflight</a> ·
  <a href="#-development">Development</a> ·
  <a href="#-syncing-with-upstream">Upstream Sync</a>
</p>

---

**Mocha** (`mbx30/mocha`) is a maintained fork of [Stirling PDF](https://github.com/Stirling-Tools/Stirling-PDF) — the open-source PDF platform for desktop, browser, and self-hosted deployments. This fork keeps Stirling's full toolset and adds **print-ready preflight** (bleed extension and optional crop marks) for small print shops and the [Mocha print-stack](https://github.com/mbx30/mocha/tree/mocha-merge).

Use it as a **Docker sidecar** over HTTP, run it locally for development, or deploy it like upstream Stirling. Documents stay on your infrastructure.

> This is a **fork**, not the upstream Stirling repo. Bug reports and contributions for fork-specific work belong here; general Stirling platform issues may still belong upstream.

---

## ✨ Why Mocha?

Stirling PDF already covers merge, split, rotate, convert, OCR, sign, redact, compress, and dozens of other operations. Print shops still need one thing upstream does not ship today: **automatic bleed and trim marks** before files hit the RIP or press.

| Layer | Upstream Stirling | Mocha fork |
| --- | --- | --- |
| General PDF tooling | ✅ 50+ tools, UI, API, desktop | ✅ Inherited — stays in sync |
| Print bleed generation | ❌ | ✅ `POST /api/v1/general/print-preflight` |
| US-style crop marks | ❌ | ✅ Optional per request |
| Lean fork CI | Full upstream matrix | Focused gate for active development |

Mocha is intentionally narrow on *new* surface area: one production-critical print endpoint, wired through the same Stirling editor and API patterns you already know.

---

## 🚀 Quick Start

### Docker (fastest)

```bash
docker run -p 8080:8080 docker.stirlingpdf.com/stirlingtools/stirling-pdf
```

For this fork's **print-preflight** endpoint, build the local image instead of pulling upstream `latest`:

```bash
task docker:build
task docker:up
```

Then open http://localhost:8080

### Local development

Prerequisites: **JDK 25**, **Node.js**, [Task](https://taskfile.dev/), and optionally [uv](https://docs.astral.sh/uv/) for the AI engine.

```bash
git clone https://github.com/mbx30/mocha.git
cd mocha
task install
task dev
```

- Backend: http://localhost:8080
- Frontend editor: http://localhost:5173 (proxies `/api` to the backend)

Add the engine with `task dev:all` if you need AI features.

### Verify print-preflight

```bash
curl -f http://localhost:8080/api/v1/info/status

curl -X POST http://localhost:8080/api/v1/general/print-preflight \
  -F "fileInput=@your-file.pdf" \
  -F "bleedSizeInches=0.125" \
  -F "addCropMarks=true" \
  --output print-ready.pdf
```

---

![Stirling PDF dashboard](images/home-light.png)

---

## 🖨️ Print Preflight

The fork's main addition is **server-side print preflight** via PDFBox:

- Adds configurable bleed (default **0.125 in**) on all four edges
- Optionally draws **US-style crop marks** at trim corners
- Detects pages that already appear to have bleed and **passes them through unchanged**
- Exposed in the **editor UI** (Print Preflight tool) and the **REST API**

Endpoint: `POST /api/v1/general/print-preflight`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `fileInput` | file | — | Input PDF |
| `bleedSizeInches` | float | `0.125` | Bleed width in inches |
| `addCropMarks` | boolean | `true` | Trim-corner crop marks |

Implementation: `app/core/.../PreflightController.java` · UI: `frontend/editor/.../PrintPreflight.tsx`

---

## Key Capabilities (from Stirling)

- **Everywhere you work** — Desktop client, browser UI, and self-hosted server with a private API
- **50+ PDF tools** — Edit, merge, split, sign, redact, convert, OCR, compress, and more
- **Automation & workflows** — Pipelines in the UI plus APIs for batch processing
- **Enterprise-grade** — SSO, auditing, and flexible on-prem deployments (when enabled)
- **Developer platform** — REST APIs for nearly all tools
- **Global UI** — Interface available in 40+ languages

Full feature list: https://docs.stirlingpdf.com

---

## 🛠️ Development

This project uses [Task](https://taskfile.dev/) as the unified command runner. Run `task` with no arguments to see common commands.

| Command | What it does |
| --- | --- |
| `task dev` | Backend + frontend concurrently |
| `task dev:all` | Backend + frontend + AI engine |
| `task check` | Lint, typecheck, and test gate |
| `task backend:dev` | Spring Boot on :8080 |
| `task frontend:dev` | Vite editor on :5173 |
| `task docker:build` | Build the standard Docker image |
| `task docker:up` | Start the compose stack |

See [DeveloperGuide.md](DeveloperGuide.md) and [AGENTS.md](AGENTS.md) for architecture, layering, and contributor conventions.

---

## 🔄 Syncing with upstream

Mocha tracks [Stirling-Tools/Stirling-PDF `main`](https://github.com/Stirling-Tools/Stirling-PDF). You do **not** need write access to Stirling's repo — only read access to pull their changes into your fork.

```bash
git remote add upstream https://github.com/Stirling-Tools/Stirling-PDF.git
git remote set-url --push upstream DISABLED   # optional: prevent accidental pushes

git fetch upstream
git checkout main
git merge upstream/main
# resolve conflicts, then:
git push origin main
```

Keep fork-specific files (for example `PreflightController`, print-preflight UI, lean CI workflows) when merging. Re-run `task check` after syncing.

---

## Resources

- [Stirling documentation](https://docs.stirlingpdf.com)
- [Stirling homepage](https://stirling.com)
- [API docs](https://registry.scalar.com/@stirlingpdf/apis/stirling-pdf-processing-api/)
- [Mocha implementation plan (Notion)](https://app.notion.com/p/38e9cb079ddb804aacb0c535f6bf25d5) — print-stack context
- Monorepo with the Mocha desktop shell: [`mocha-merge` branch](https://github.com/mbx30/mocha/tree/mocha-merge)

## Support

- **Upstream community:** [Discord](https://discord.gg/HYmhKj45pU)
- **Fork issues:** [GitHub issues](https://github.com/mbx30/mocha/issues)

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). For new PDF tools, see [ADDING_TOOLS.md](ADDING_TOOLS.md).

## License

Open-core, inherited from Stirling PDF. See [LICENSE](LICENSE).
