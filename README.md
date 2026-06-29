<p align="center">
  <img src="mint/public/mint-logo.svg" width="110" alt="Mint" />
</p>

<h1 align="center">Mint</h1>

<p align="center">
  <strong>The print shop's revenue front-end.</strong><br>
  Quote print-aware, invoice branded, prep print-ready files — and hand the ledger to QuickBooks and the PDF plumbing to Stirling.
</p>

<p align="center">
  <a href="mint/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT" /></a>
  <a href=".github/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/mbx30/mocha/ci.yml?style=flat-square&label=CI" alt="CI status" /></a>
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Tauri-v2-FFC131?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/PDF-Stirling%20sidecar-1abc9c?style=flat-square" alt="Stirling PDF sidecar" />
  <img src="https://img.shields.io/badge/status-MVP%20(1%20item%20open)-f0ad4e?style=flat-square" alt="Status: MVP" />
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start ↓</b></a> ·
  <a href="#️-architecture">Architecture</a> ·
  <a href="#️-status">Status</a> ·
  <a href="#-docs">Docs</a>
</p>

---

Mint is the lean, focused tool a **one-person print shop** actually needs. Instead of rebuilding accounting and a PDF engine from scratch, it stays a *thin specialized layer on top of mature tools*: it owns the parts that are unique to print — **print-aware quoting, branded invoices, and print-ready file prep** — and delegates everything else.

This repository is a **monorepo** that ships Mint and its PDF service together:

- **`mint/`** — the desktop app: a Tauri shell with a React 19 print-shop UI (Estimates · Invoicing · QuickBooks · PDF Tools) over a thin Rust core.
- **`stirling/`** — a fork of [Stirling PDF](https://github.com/Stirling-Tools/Stirling-PDF) that adds a `print-preflight` endpoint, run as a Dockerized HTTP sidecar.

> 🖨️ Mint started life as **Frappe**, an all-in-one print-shop app that grew bloated (management + finance + PDF editor + preflight in one binary). Mint keeps only what a small shop runs day to day and lets specialized tools handle the rest.

---

## ✨ Why Mint?

A print shop is not a generic ERP, and a print-ready PDF is not a generic document. Mint treats both as first-class — and is deliberate about what it *doesn't* build:

| Concern | Mint owns | Delegated to |
|---|---|---|
| **Quoting & pricing** | print-aware quote engine (substrate, size, qty-breaks, finishing, margin check) | — |
| **Invoicing** | branded invoices, estimates, deposits | — |
| **Accounting ledger** | a clean sync boundary | **QuickBooks / Xero** |
| **PDF plumbing** | a thin HTTP client | **Stirling PDF** (merge/split/rotate/compress/convert/stamp) |
| **Bleed & preflight** | a thin print layer | **Stirling `print-preflight`** (server-side, PDFBox) |

The result: no from-scratch accounting back-end to maintain, and no native PDF engine in the desktop binary — the Rust core depends on `reqwest` for PDF work and calls the sidecar over HTTP.

---

## 🏛️ Architecture

```text
┌─────────────────────────────────────────────┐
│  Tauri Desktop App (Mint)                     │
│                                               │
│  React 19 + design-system (print-shop kit)    │
│    Estimates · Invoicing · QuickBooks · PDF   │
│        │                    │                 │
│        ▼ (Tauri IPC)        ▼ (Tauri IPC)     │
│  Rust shell (thin)                            │
│    db (SQLite) · estimates/invoices · QB      │
│    Stirling HTTP client (reqwest) ────────────┼──► Stirling PDF
│    sidecar lifecycle manager                  │     (Docker, :8080)
└─────────────────────────────────────────────┘
```

**Bleed runs server-side in v1.** The Stirling fork ships a working implementation at `POST /api/v1/general/print-preflight` (a Java PDFBox layer extension), so Mint just calls it over HTTP — no reintroduced Rust PDF dependencies, no new client raster code to ship the MVP. A finer per-edge **mirror + flat-fill canvas router** (client-side) is deferred to v1.1.

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Needed for |
|------|---------|------------|
| Docker | Desktop / Engine | Stirling PDF sidecar |
| Node.js | 22+ | Mint frontend |
| Rust | 1.77+ | Mint desktop shell |
| JDK + Gradle | JDK 25 | Stirling backend tests only |

### Run it

```bash
# 1. Start the Stirling sidecar (first build may take 15–30 min)
docker compose up -d --build

# 2. Verify it's healthy
curl http://127.0.0.1:8080/api/v1/info/status

# 3. Launch Mint
cd mint
npm install
npm run tauri:dev
```

The Tauri dev window opens automatically; the Estimates and Invoicing screens render against the existing Rust commands, and PDF Tools talks to the sidecar. If the sidecar is down, Mint surfaces a **"Start PDF service"** affordance.

> The root `docker-compose.yml` builds the **local** `stirling/` fork image (`Dockerfile.ultra-lite`) — not `stirlingtools/stirling-pdf:latest` — because v1 bleed needs the fork's `print-preflight` endpoint, which upstream doesn't have.

---

## 🗺️ Status

Nearly the entire MVP is done. The monorepo, combined CI, and Phases 0 / 1 / 3 / 4 plus end-to-end flows are complete. **Wiring the Stirling bleed endpoint into Mint (Phase 2) is the only open MVP item.**

| Phase | Scope | Status |
|-------|-------|--------|
| Pre-MVP | `mocha-merge` monorepo + combined CI | ✅ Complete |
| 0 | Launch + finance CRUD + MVP nav | ✅ Complete |
| 1 | Stirling sidecar (local build) + PDF Tools | ✅ Complete |
| 2 | Bleed via Stirling `print-preflight` | 🔲 Pending (Mint client + UI + tests) |
| 3 | Quote → invoice | ✅ Complete |
| 4 | QuickBooks sandbox sync | ✅ Complete |
| E2E | Quote → invoice → email → QuickBooks; drop file → auto-bleed → print-ready PDF | ✅ Complete |

**Out of scope for MVP (deferred):** POS, Inventory, Orders/Kanban, Fulfillment, OCR, redaction, eSign, and AI-outpainting bleed.

---

## 🧪 Tests

```bash
# Mint frontend (tsc + build + vitest)
cd mint && npm ci && npm test && npm run build

# Mint Rust core (native-pdf tests gated off)
cd mint/src-tauri && cargo test

# Stirling print-preflight backend
cd stirling && ./gradlew :stirling-pdf:test \
  --tests "stirling.software.SPDF.controller.api.PreflightControllerTest"
```

CI runs five focused jobs on every push — `mint-frontend`, `mint-rust`, `stirling-preflight-test`, and `integration-smoke` (compose up → curl health + `print-preflight`). See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## ⚙️ Environment

| Variable | Purpose | Default |
|----------|---------|---------|
| `STIRLING_URL` | Override the sidecar URL | `http://127.0.0.1:8080` |
| `MOCHA_MERGE_ROOT` | Path to this repo root (used to resolve the compose file) | auto-detected when `mint/` is a child |

---

## 📚 Docs

- **[mint/README.md](mint/README.md)** — the desktop app in depth
- **[mint/BUILD.md](mint/BUILD.md)** — per-platform build requirements
- **[mint/docs/VERIFICATION.md](mint/docs/VERIFICATION.md)** — bleed/preflight verification notes
- **[mint/SECURITY_GUIDE.md](mint/SECURITY_GUIDE.md)** — security model and path validation
- **[stirling/README.md](stirling/README.md)** — the Stirling PDF fork

---

## 📜 License

[MIT](mint/LICENSE) — Mint, and the [Stirling PDF](https://github.com/Stirling-Tools/Stirling-PDF) fork it builds on.
