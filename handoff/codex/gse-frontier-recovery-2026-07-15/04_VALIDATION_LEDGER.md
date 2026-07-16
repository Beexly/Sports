# Validation Ledger

## 2026-07-16 selected-game Cockpit continuation

| Check | Result | Honest boundary |
|---|---|---|
| `npm.cmd run test --workspace=apps/web -- __tests__/cockpit-lib-docstrings.test.ts __tests__/lib-file-header.test.ts __tests__/cockpit-page-a11y.test.ts __tests__/cockpit-selected-game-playback.test.tsx __tests__/cockpit-nav-coverage.test.ts __tests__/cockpit-page-auth.test.ts __tests__/playback-consumers.test.ts` | 164/164 passed | Covers the new route's static a11y/header contracts, Cockpit docstring/header conventions, admin-before-data, one-query Game Room loading, withheld/unavailable states, cited Brain output, and raw-output exclusion. |
| `GSE_QA_BASE_URL=http://127.0.0.1:3210 GSE_QA_GAME_ID=cmrm6vyzq00b5ozb9rjmuw9hw node scripts/qa/cockpit-selected-game-playback-browser.mjs` | Exit 0 | Desktop 1440x900 and mobile 390x844 both returned 200 with one H1, main landmark, honest unavailable reason/message, no Brain answer, no raw marker, no overlay, no console/page errors, no document overflow at 200% text zoom, and zero axe WCAG A/AA violations. Local DB was intentionally stubbed; this proves the actual owner route's unavailable path, not a live eligible playback row. |
| `npm.cmd run lint` | Exit 0 | All workspace lint scripts, zero warnings. |
| `npm.cmd run typecheck` | Exit 0 | All workspace TypeScript projects passed. |
| `npm.cmd test` | Exit 0 | 9,327/9,327 assertions passed across 746 test files: web 7,796 + crypto 13 + data ingestion 170 + DB 14 + ingestion pipeline 106 + prediction engine 1,151 + shared types 72 + content worker 5. |
| `npm.cmd run guardrails` | Exit 0 | Trust, model freeze, draft-only, Claude use, secret, API-v1, commercial/performance claims, NGS rights, partner, API payload, OpenAPI, ZK, AWS compatibility, and eval contracts passed. |
| `DATABASE_URL=postgresql://gse_build:gse_build@127.0.0.1:65432/gse_build?connect_timeout=1 AUTH_SECRET=local-build-placeholder-not-production npm.cmd run build` | Exit 0 | Next 14.2.35 compiled, checked types, generated all 205 routes, and emitted `/cockpit/market-twin/[gameId]`. Expected Sentry/OpenTelemetry dynamic-require warning and unreachable placeholder DB logs were present; no real DB or production secret was used. |
| `NODE_PATH="$PWD/node_modules" ./node_modules/.bin/tsx .../check-no-excuse-rules.ts <touched TS/TSX files>` | Exit 0 | Exact bundled TypeScript no-excuse checker returned no violations on the selected-game slice. |
| `git diff --check` | Exit 0 | No whitespace errors. |

All results below were observed on 2026-07-15 in the recovery worktree.

| Check | Result | Honest boundary |
|---|---|---|
| `npm.cmd test` | 9,309 passed | 7,778 web + 13 crypto + 170 data ingestion + 14 DB + 106 ingestion pipeline + 1,151 prediction engine + 72 types + 5 content worker. Persistence/providers are mocked or stubbed where tests require it. |
| Final focused playback run | 14/14 passed | Delta, consumers, UI, and focusable scroll region after the accessibility fix. |
| `npm.cmd run typecheck` | Exit 0 | All workspaces. |
| `npm.cmd run lint` | Exit 0 | All workspace lint scripts, zero warnings. |
| `npm.cmd run build` | Exit 0 | Next 14.2.35 optimized build; type validity; 205 routes; `/room/[gameId]` dynamic. Used an unreachable non-secret local Postgres URL and local auth placeholder. |
| `npm.cmd run guardrails` | Exit 0 | Trust, model freeze, draft-only, Claude use, secret, API-v1, commercial/performance claims, NGS rights, partner, API payload, OpenAPI, ZK, AWS, and 34 eval contracts. |
| No-excuse checker | 32 files, zero violations | Exact bundled TypeScript rules; one non-null assertion was found and removed before commit. |
| `git diff --check` | Exit 0 | No whitespace errors in the staged implementation slice. |
| Commit hook | Exit 0 | Staged secret scan passed for all 35 implementation files. |
| Playwright + axe-core | Exit 0, both viewports | 1440x900 and 390x844; zero WCAG A/AA violations; no browser console/page errors; no page overflow; keyboard, scrubber, focus, transcript/table, reduced motion, and 200% text zoom passed. |

## Expected warnings, not hidden failures

- Next build emits the known Sentry/OpenTelemetry dynamic-require warning.
- The deliberate unreachable DB logs Prisma connection failures during legacy prerender loaders. Build still completes and degraded states render; this does not prove a live DB.
- Vite reports its CJS Node API deprecation warning during tests.

No result above proves production deployment identity, live provider data, production cron execution, or a real persisted playback record.
