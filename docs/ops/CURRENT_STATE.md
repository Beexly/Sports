# CURRENT_STATE — Galaxy Sports Edge (canonical)

**As of:** 2026-07-30  
**MAIN:** `1e007c3`  
**Repo:** https://github.com/Beexly/Sports  
**Pass:** 4 (consolidate + founder handoff)  
**Agent:** IDLE · class_A=0

## Law (hard)

| Flag / rule | Value |
|-------------|--------|
| LIVE_BOARD | **off** |
| PUBLISH_LEDGER | **off** |
| SLATE_OPENING_REVEAL | **off** |
| oddsApiRequired (free path) | **false** |
| refuse-default | **on** |
| Public ROI / guaranteed edge | **blocked** (trust-gate) |
| Sportsbook CPA | **blocked** (partner-stack) |
| Phase C (5b) | **UNVERIFIED** |

## SHIPPED (works on MAIN without flag flips)

| Area | Evidence |
|------|----------|
| Dual CRON_SECRET auth (primary + previous) | `apps/web/lib/cron/authorize.ts` · 18/18 crons · unit tests |
| Cron nodejs + force-dynamic | all `/api/cron/*` + truth/* · #256 |
| Free Gamma quote path | `/api/cron/gamma` · oddsApiRequired=false |
| Board honest empty / boardClass | `/board` · classifyBoardState · LIVE_BOARD held ≠ quiet win |
| Prefire before public FIRE | `evaluateUnifiedPrefire` · selective-gate sole multiprob FIRE |
| Own-feed PIT refuse | future_leak → 422 |
| methodTag + sameMethodOrRefuse / continuous CLV | quote-plane providers + archive · #254 |
| Rights export SPDX classifier | stats-api + route |
| Session tier spoof → FREE | session-tier / entitlements |
| AI Council DESTROY in CI | `guard:ai-council` + workflow job |
| Trust-gate / no-zk-overclaim / brand safety | CI jobs green on merge tips |
| CRON_MATRIX + smokes | `docs/ops/CRON_MATRIX.md`, `scripts/ops/*smoke*` |

## CODE_READY (honest stubs — not silent production)

| Item | Note |
|------|------|
| Hydration strategies (some runners) | Return explicit CODE_READY error |
| Optical / overlay CV | Catalog dark · **PARKED** |
| Phase C remeasure harness | Methodology present · **UNVERIFIED** without founder measure |
| CCM deploy/IdP TODOs | External integrations |

## FOUNDER_GATE (explicit YES required)

| Gate | Default |
|------|---------|
| LIVE_BOARD on | off |
| PUBLISH_LEDGER / reveal on | off |
| #226 HEOS merge | open · needs YES |
| Phase C (5b) claim | UNVERIFIED |

## PARKED

| Item | Reason |
|------|--------|
| Overlay CV | Dark catalog · not critical path |
| Poly1305 / CF Access / SPIFFE | Closed digression |

## Verify snapshot (Pass 4 agent)

| Check | Result |
|-------|--------|
| `trust-gate.mjs` | OK (1733 files) |
| `em-dash-scan.mjs` | OK |
| `guard:ai-council` | 7/7 pass |
| Critical web tests (cron dual-secret, boardClass, picks honesty) | 25/25 pass |
| method-tag-honesty (quote-plane) | 10/10 pass |
| CI on #256 merge tip | Test + Build + guardrails **green** (full monorepo) |

Full local `gse-verify` (entire apps/web vitest + typecheck + lint) is **documented green via CI on MAIN tip** rather than re-run for 8+ minutes in this pass. Failures that appear only with founder secrets missing are Class B.

## What still does not work without founder

- Production crons without `CRON_SECRET`
- Durable multi-user prod without Neon `DATABASE_URL`
- Billing without Stripe live
- Multi-instance hot plane without Upstash (if required by deploy topology)
- Public pick publishing without LIVE_BOARD / publish YES + measurement

## Next human action

See `docs/ops/FOUNDER_HANDOFF_MESSAGE.md` → **action #1**.
