# Mint

<p align="center">
  <img src="src/assets/hero.png" width="320" alt="Mint — print-shop revenue front-end" />
</p>

<p align="center">
  <strong>The print shop's revenue front-end.</strong><br>
  Quote print-aware, invoice branded, prep print-ready files — and hand the ledger to QuickBooks and the PDF plumbing to Stirling.
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License: MIT" /></a>
  <a href="../.github/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/mbx30/mocha/ci.yml?style=flat-square&label=CI" alt="CI status" /></a>
  <img src="https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Tauri-v2-FFC131?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Rust-1.77%2B-000000?style=flat-square&logo=rust&logoColor=white" alt="Rust 1.77+" />
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="Platform: Windows | macOS | Linux" />
</p>

<p align="center">
  <a href="#-quick-start"><b>Quick Start ↓</b></a> ·
  <a href="#️-architecture">Architecture</a> ·
  <a href="#-status">Status</a> ·
  <a href="#-faq">FAQ</a>
</p>

Mint is a desktop app for a **single-location, often one-person, print shop**. It runs the money end of the business — **quotes, estimates, branded invoices, deposits, clients** — and the file end — **PDF tooling and print preflight** — in one Tauri shell. Data lives in a local SQLite database; the desktop keeps working when the internet doesn't.

The strategy is to be a *thin specialized layer over mature tools*, not to rebuild them: Mint owns the parts unique to print and hands the rest to **[QuickBooks](https://quickbooks.intuit.com/)** (the accounting ledger) and **[Stirling PDF](https://github.com/Stirling-Tools/Stirling-PDF)** (PDF plumbing, run as a sidecar). If you've ever hand-built a job ticket in Word, fought a customer's RGB PDF, or quoted 500 business cards on the back of an envelope, Mint is for you.

> 🖨️ Mint lives in the [`mocha-merge`](../README.md) monorepo alongside the Stirling fork it talks to. This README covers the desktop app; see the [root README](../README.md) for the sidecar and the combined build.

---

## ✨ Why Mint?

A print shop is not a generic ERP, and a print-ready PDF is not a generic document. Mint treats both as first-class — and is deliberate about what it *doesn't* build:

| Concern | Mint owns | Delegated to |
|---|---|---|
| **Quoting & pricing** | a print-aware quote engine (substrate, size, qty-breaks, finishing, margin check) | — |
| **Invoicing** | branded invoices, estimates, deposits | — |
| **Accounting ledger** | a clean sync boundary + CSV fallback | **QuickBooks Online** |
| **PDF plumbing** | a thin HTTP client | **Stirling PDF** (merge/split/rotate/compress/convert/stamp) |
| **Bleed & preflight** | a thin print layer | **Stirling `print-preflight`** (server-side, PDFBox) |

The payoff: no from-scratch accounting back-end to maintain, and **no native PDF engine in the desktop binary**. The Rust core's only PDF dependency is `reqwest` (HTTP, `rustls-tls`) — it calls the Stirling sidecar over HTTP for every PDF operation.

---

## 🚀 Quick Start

Mint needs the **Stirling sidecar** running for PDF and preflight features. Start it from the monorepo root, then launch the app.

```bash
# 1. From the repo root, start the Stirling PDF sidecar
#    (first build may take 15–30 min). See ../README.md for details.
cd ..
docker compose up -d --build
curl http://127.0.0.1:8080/api/v1/info/status   # expect 200

# 2. Run Mint
cd mint
npm install
npm run tauri:dev
```

The Tauri dev window opens automatically. Onboarding creates a workbook; the **Estimates** and **Invoices** screens render against the Rust commands immediately, and **PDF Tools** talks to the sidecar. If the sidecar is down, Mint surfaces a **"Start PDF service"** affordance instead of failing silently.

System build prerequisites (WebView/GTK, toolchains) are per-platform — see **[BUILD.md](./BUILD.md)**.

> **Tip:** Mint uses `rustls-tls` (not OpenSSL) for both `reqwest` and `lettre`, so you can skip `libssl-dev` on Linux — fewer system packages, faster CI.

---

## 📚 Features

### 🧾 Finance (the revenue front-end)

- **Print-aware quote builder** — pick substrate / size / qty / sides / finishing → compute price with qty-break and spoilage math → emit standard estimate line items. Lives in [`src/pricing/`](./src/pricing/) (`priceBook.ts`, `QuoteBuilder.tsx`, `PriceBookEditor.tsx`).
- **Margin check at quote time** — "cost \$X, quoting \$Y → Z%", so you don't quote yourself out of a profit.
- **Estimates → Invoices** — convert a quote to an invoice without re-keying; line items, tax, terms, deposits.
- **Branded invoice PDFs** — rendered via the Stirling sidecar (stamp/merge) and emailed straight from the app ([`invoice_pdf.rs`](./src-tauri/src/invoice_pdf.rs), [`email.rs`](./src-tauri/src/email.rs)).
- **Clients** — contact info and history tied to estimates and invoices.

### ⚡ QuickBooks sync

- **QuickBooks Online OAuth2** (Intuit) handled in the Rust shell ([`src-tauri/src/qb/`](./src-tauri/src/qb/)); tokens stored in the OS keychain.
- **One-click invoice sync** — map an invoice to a QBO invoice and flip its `qb_sync_status`.
- **CSV export fallback** for offline / no-connection workflows.

### 📄 PDF Tools (Stirling client)

Mint ships a thin Rust client ([`pdf_cmds.rs`](./src-tauri/src/pdf_cmds.rs)) over the Stirling endpoints on the print critical path:

- `convert/pdf/img` · `convert/img/pdf` — rasterize / rebuild
- `general/merge-pdfs` · `general/split-pages` · `general/rotate-pdf` · `general/rearrange-pages` (imposition)
- `misc/compress-pdf`
- `security/add-stamp` — crop marks / overlays
- `general/print-preflight` — **bleed generation + crop marks (v1)**

Endpoints off the print path (eSign, forms, OCR, office conversions, redaction) are intentionally **not** wired.

### 🩹 Bleed & preflight

- **v1 (current):** bleed is generated **server-side by the Stirling fork** via `POST /api/v1/general/print-preflight` (a Java PDFBox layer extension). Mint exposes it as the `pdf_print_preflight` command + a Bleed tab in PDF Tools: file → bleed size + crop-marks toggle → preview → approve & save.
- **v1.1 (deferred):** a finer client-side per-edge **mirror + flat-fill canvas router** for instant preview before baking back into the PDF.

---

## 🏛️ Architecture

```text
React 19 UI (design-system print-shop kit)
  Dashboard · Clients · Estimates · Invoices · QuickBooks · PDF Tools
        │ (Tauri IPC)
        ▼
Rust shell (thin)
  SQLite (rusqlite, WAL) · estimates/invoices · QuickBooks OAuth · keychain
  Stirling HTTP client (reqwest, rustls-tls) ───────────► Stirling PDF
  sidecar lifecycle manager                                (Docker, :8080)
```

- **Local-first** — SQLite is the source of truth; the desktop runs offline. The cloud is backup-only in v1 ([`cloud_backup.rs`](./src-tauri/src/cloud_backup.rs)).
- **Multi-tenant ready** — tables carry a `tenant_id`, so the same code serves a single-shop pilot and a future multi-tenant deployment without a re-architecture.
- **Event log** — changes are recorded for deterministic cloud backup and a future sync engine.
- **No native PDF engine** — the Rust shell calls the Stirling sidecar over HTTP; there is no `pdfium`/`lopdf`/`printpdf` in the dependency tree.
- **Opt-in at-rest encryption** — SQLCipher behind a Cargo feature flag (`--features sqlcipher`); default builds use plain SQLite.
- **Tauri v2 IPC** — commands live in [`src-tauri/src/`](./src-tauri/src/) and are registered in [`lib.rs`](./src-tauri/src/lib.rs); TypeScript types in [`src/types.ts`](./src/types.ts) mirror the Rust models.

---

## 🏗️ Tech Stack

| Layer | Library / Tool | Version |
|-------|----------------|---------|
| **Frontend** | React | 19 |
| | TypeScript + Vite | — |
| | react-data-grid | 7 |
| **Desktop shell** | Tauri (+ dialog, log plugins) | v2 |
| **Backend** | Rust edition / MSRV | 2021 / 1.77.2 |
| | reqwest (`rustls-tls`, multipart) | 0.12 |
| | rusqlite (bundled, WAL) | 0.34 |
| | keyring | 3 |
| | lettre + suppaftp (`rustls`) | 0.11 / 6 |
| | tracing / metrics | 0.1 / 0.24 |
| | serde / uuid / chrono | — |
| **PDF** | Stirling PDF sidecar (HTTP) | local fork |
| **Encryption (opt-in)** | SQLCipher (`--features sqlcipher`) | — |

---

## 🗺️ Status

Mint is at **MVP** with one open item. Finance CRUD, the Stirling sidecar integration, the quote → invoice flow, and QuickBooks sandbox sync are done; wiring the bleed endpoint's client/UI is the remaining work. Full phase detail lives in the [root README](../README.md#️-status).

| Area | Status |
|------|--------|
| Launch + finance CRUD + MVP nav | ✅ Done |
| Stirling sidecar + PDF Tools | ✅ Done |
| Print-aware quote → invoice | ✅ Done |
| QuickBooks sandbox sync | ✅ Done |
| Bleed via Stirling `print-preflight` (client + UI + tests) | 🔲 Open |

**In the tree but unrouted (deferred past MVP):** POS, Inventory, Orders/Kanban, Fulfillment, Reminders. The code is present but cut from the nav — it'll be removed or revived in a later pass.

---

## 🛠️ Develop

```bash
npm run tauri:dev      # Tauri dev shell (hot reload) — the app
npm run dev            # Vite only (frontend in a browser, no Tauri)
npm run build          # tsc -b + production frontend bundle
npm run lint           # ESLint
npm test               # Vitest (includes the price-book unit tests)
```

From inside `src-tauri/`:

```bash
cargo check            # Rust type check
cargo test             # Rust tests (native-pdf tests gated off)
```

### Project layout

```
mint/
├── src/                       # React 19 + TypeScript frontend
│   ├── components/            # Dashboard, EstimateEditor, InvoiceEditor,
│   │                          #   QBSyncPanel, PDFToolsPanel, ManagementView …
│   ├── pricing/               # Print-aware quote engine (priceBook, QuoteBuilder)
│   ├── design-system/         # Tokens, components, print-shop UI kit
│   └── types.ts               # TS mirror of Rust models
├── src-tauri/                 # Rust + Tauri v2 backend
│   └── src/
│       ├── pdf_cmds.rs        # Stirling HTTP client (incl. pdf_print_preflight)
│       ├── finance_cmds.rs    # estimates / invoices
│       ├── qb/                # QuickBooks OAuth + sync (api, oauth, mapper, cmds)
│       ├── invoice_pdf.rs     # branded invoice rendering (via Stirling)
│       ├── email.rs, ftp.rs   # delivery
│       ├── db.rs              # SQLite + migrations
│       ├── keychain.rs        # OS keychain
│       ├── security.rs        # path validation
│       └── lib.rs             # Tauri app setup & command registration
├── docs/                      # VERIFICATION, COMPATIBILITY-MATRIX, SECURITY-AUDIT …
├── BUILD.md                   # Per-platform build requirements
└── README.md
```

---

## ❓ FAQ

**Q: Do I need Docker to run Mint?**
A: For PDF and preflight features, yes — they call the Stirling sidecar (a local Docker container on `:8080`). Finance features (quotes, estimates, invoices) work without it. Packaging Stirling for end users (bundled Docker vs. hosted vs. native) is an open pre-release decision.

**Q: Is this production-ready?**
A: Treat it as **alpha**. The finance flow (quote → invoice → QuickBooks) and the Stirling-backed PDF tools are functional; server-side bleed is the last MVP item being wired. Watch the [status table](#-status).

**Q: How is my data stored?**
A: In a local SQLite database on the desktop (WAL mode). Default builds use plain SQLite; for at-rest encryption, build with the `sqlcipher` Cargo feature and supply a key. Nothing leaves the machine except explicit, opt-in cloud backup and the QuickBooks sync you trigger.

**Q: Can I use it fully offline?**
A: The core finance workflow, yes — the desktop is the source of truth. PDF/preflight needs the local sidecar (still offline, just a local container). QuickBooks sync needs a connection, with CSV export as the offline fallback.

**Q: Where did the native PDF engine go?**
A: Removed. Earlier versions embedded a Rust PDF engine (`pdfium`/`lopdf`/`printpdf`); Mint now delegates all PDF work to the Stirling sidecar over HTTP. The Rust core's only PDF-related dependency is `reqwest`.

**Q: Why Tauri and not Electron?**
A: Smaller binaries, lower memory, Rust's type system on the backend where the SQLite and HTTP-client work lives, and `rustls-tls` keeps the build off OpenSSL.

**Q: How do I extend it?**
A: New Tauri commands go in `src-tauri/src/` and are registered in `lib.rs`; new PDF operations are thin wrappers over Stirling endpoints in `pdf_cmds.rs`. Frontend types mirror the Rust models, so `tsc` catches contract drift.

---

## 🤝 Contributing

1. Fork and branch (`git checkout -b feature/your-thing`)
2. Run `npm run lint`, `npm run build`, and `cargo check` before pushing
3. Open a Pull Request — CI runs the mint frontend, mint Rust, and Stirling preflight jobs

Bug reports and feature requests: **[open an issue](../../issues)**. For security issues, please open a private security advisory rather than a public issue — see [SECURITY_GUIDE.md](./SECURITY_GUIDE.md).

---

## 📜 License

[MIT](./LICENSE) © Mint contributors. Built on the [Stirling PDF](https://github.com/Stirling-Tools/Stirling-PDF) fork in [`../stirling/`](../stirling/).
