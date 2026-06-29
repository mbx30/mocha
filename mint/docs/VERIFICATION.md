# Mint MVP Verification Checklist

Run from `mocha-merge/` unless noted.

## Pre-merge (monorepo)

- [ ] `docker compose up -d --build` — Stirling healthy on `:8080`
- [ ] `curl http://127.0.0.1:8080/api/v1/info/status` returns 200
- [ ] `cd stirling && ./gradlew :stirling-pdf:test --tests PreflightControllerTest`
- [ ] `cd mint && npm test && cd src-tauri && cargo test`

## Phase 0 — Launch + CRUD

- [ ] `cd mint && npm run tauri:dev` opens the app
- [ ] Sidebar: Dashboard, Clients, Estimates, Invoices, QuickBooks, PDF Tools, Settings
- [ ] Create client → create estimate → save → reload persists
- [ ] Create invoice → edit dates/terms → save → reload persists

## Phase 1 — Stirling PDF Tools

- [ ] PDF Tools shows **online** (local build, not upstream `stirlingtools/stirling-pdf:latest`)
- [ ] Merge 2 PDFs → valid output file
- [ ] Split with page range → valid PDF or ZIP on disk
- [ ] Compress → smaller or equal file size

## Phase 2 — Print preflight (bleed)

- [ ] Pick no-bleed PDF → Preview bleed → output larger than source
- [ ] Approve & save → print-ready PDF opens in viewer
- [ ] Manual eyeball: photo-edge and solid-edge samples (Stirling PDFBox extension)
- [ ] `PreflightControllerTest` green in CI

## Phase 3 — Quote → invoice

- [ ] Settings → Price Book includes **350gsm**
- [ ] QuoteBuilder: 500× 3.5×2, 4/4, lamination → ~40% margin in preview
- [ ] Line items sum to quote price (not raw cost)
- [ ] Approve estimate → Convert to invoice → totals match

## Phase 4 — QuickBooks

1. Intuit Developer sandbox app, redirect `http://127.0.0.1:9876/callback`
2. Settings → Integrations → save credentials → Connect
3. Invoice with client, status **Sent** → QuickBooks tab → Sync
4. Confirm in QBO sandbox; `qb_sync_status` = synced
5. Export CSV → file with line items

## End-to-end

**Flow A:** Client → quote → approve → convert → email (PDF attached) → QB sync (< 1 min with test data)

**Flow B:** Drop print file in PDF Tools → preview bleed → approve → print-ready export

## Known limitations (v1.1)

- Native Rust `pdf/` bleed router (mirror vs flat per edge) not shipped; Stirling PDFBox handles bleed
- Vector-preserving bleed deferred
