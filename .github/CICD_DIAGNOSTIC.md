# CI/CD Diagnostic Report

**Updated:** 2026-06-29 (slim fork CI)

## Summary

This fork runs a lean GitHub Actions gate centered on [`build.yml`](.github/workflows/build.yml). The router detects path changes and dispatches only the checks needed for day-to-day PDF tool development.

## Active workflows (11)

| Workflow | Trigger | Role |
|----------|---------|------|
| [`build.yml`](.github/workflows/build.yml) | PR / merge_group / manual | Router + **`All checks passed`** gate |
| [`backend-build.yml`](.github/workflows/backend-build.yml) | via `build.yml` | Java build, Spotless, tests |
| [`frontend-validation.yml`](.github/workflows/frontend-validation.yml) | via `build.yml` (frontend paths) | ESLint, typecheck, vitest, Prettier |
| [`ai-engine.yml`](.github/workflows/ai-engine.yml) | via `build.yml` (engine paths) + push to `main` | Python engine checks + tool model sync |
| [`pre_commit.yml`](.github/workflows/pre_commit.yml) | via `build.yml` | Repo-wide lint/format/secret checks |
| [`check-openapi.yml`](.github/workflows/check-openapi.yml) | via `build.yml` (openapi paths) | OpenAPI spec consistency |
| [`check-licence.yml`](.github/workflows/check-licence.yml) | via `build.yml` (build paths) | License compliance |
| [`dependency-review.yml`](.github/workflows/dependency-review.yml) | via `build.yml` | GitHub dependency security scan |
| [`build-enterprise.yml`](.github/workflows/build-enterprise.yml) | via `build.yml` (proprietary paths) | Enterprise Playwright E2E |
| [`tauri-build.yml`](.github/workflows/tauri-build.yml) | via `build.yml` (tauri paths) | Desktop (Tauri) builds |
| [`_runner-pick.yml`](.github/workflows/_runner-pick.yml) | via reusable workflows | Depot vs `ubuntu-latest` runner selection |

## Path filters

Configured in [`.github/config/.files.yaml`](.github/config/.files.yaml):

| Filter | Gates |
|--------|-------|
| `build` | backend build, license check |
| `openapi` | OpenAPI consistency |
| `frontend` | frontend validation |
| `tauri` | Tauri desktop build |
| `engine` | AI engine validation |
| `proprietary` | enterprise E2E |

## Branch protection

Require a single check: **`All checks passed`** from `build.yml`.

Remove stale required checks from the upstream Stirling repo if present (e.g. `playwright-e2e-live`, `docker-compose-tests`, `db-migration-test`, `ai-title-review`, `check-files`).

## Local equivalents

Removed CI jobs remain runnable locally:

- Backend: `task backend:check`
- Frontend: `task frontend:check:all`
- Engine: `task engine:check`
- Full gate: `task check`
- Docker integration: `./test.sh`
- E2E: `task e2e:*` (see `.taskfiles/e2e.yml`)

## Verification

1. Open a PR touching backend + frontend files.
2. Confirm only path-gated jobs run and **`All checks passed`** succeeds.
3. Run `task check` locally before pushing.
