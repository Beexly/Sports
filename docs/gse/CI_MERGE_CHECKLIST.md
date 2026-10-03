# CI / Merge checklist — GSE open PR stack

**Binding:** no LIVE_BOARD=1 in git · no 6h widen · no pav/ivap rewrite · no invented quotes/ROI

## 0) Pre-flight (every PR)

- [ ] `git fetch origin && git checkout <branch> && git merge origin/main` (resolve conflicts)
- [ ] `npm ci` (or repo-standard install) at monorepo root
- [ ] `npm run db:generate` if Prisma touched
- [ ] Typecheck: package + web as required by CI
- [ ] Lint: no new errors
- [ ] Unit tests: vitest for touched packages
- [ ] Grep guard: `LIVE_BOARD_GATE_SLATE=1` **not** introduced in config committed to repo
- [ ] Grep: `MAX_CANDIDATE_ODDS_AGE_MS` still `6 * 60 * 60 * 1000`

## 1) Merge order

| Order | PR | Title | Package focus |
|------|-----|-------|----------------|
| 1 | **#220** | DecisionCertificate stack | `packages/prediction-engine/src/certificate/**` |
| 2 | **#218** | 402 circuit breaker | ingestion |
| 3 | **#219** | Toxiproxy chaos staging | `docker/chaos/**` |
| 4 | **#221** | fetchedAt monitor + cron wire | `data-reliability/**`, `refresh-odds/route.ts` |
| 5 | **#222** | Neon pool monitor | `packages/db/src/neon-pool-monitor*` + **index export** |

## 2) PR-specific checks

### #220 Certificates
- [ ] Files present: decision-certificate, gate-certificate-bridge, stratum-coverage, selective-abstention, proper-scoring, kelly-lower-endpoint, index, `__tests__`
- [ ] Tests: NO_BET requires reasons; FIRE cannot carry noBetReasons; mapExclusionToReasons includes STALE_ODDS / q / handicap
- [ ] Kelly **not** imported from public HTTP routes
- [ ] No call that enables LIVE_BOARD
- [ ] Does not rewrite pav.ts/ivap.ts

### #218 Circuit breaker
- [ ] 402 opens circuit; fail-closed; no synthetic odds in fallback
- [ ] Compatible with offline provider adapter (#216 on main)

### #219 Toxiproxy
- [ ] `docker/chaos` only — not wired as prod ODDS_API_BASE_URL
- [ ] README states staging-only + fail-closed hypotheses
- [ ] See also `docs/gse/TOXIPROXY_FAILURE_INJECTION_MAX.md`

### #221 fetchedAt
- [ ] Thresholds 120 / 240 / 360 minutes
- [ ] monitor never throws to cron
- [ ] refresh-odds returns fetchedAt block + start/success/fail pings
- [ ] See `docs/gse/FETCHEDAT_VALIDATION_LOGIC.md`

### #222 Neon pool
- [ ] probeNeonPool + classifyLatency tests
- [ ] **index.ts**: export monitor without losing main stub/client helpers

## 3) After each merge to main

- [ ] CI green on main
- [ ] Crons still `*/30` refresh-odds
- [ ] No LIVE_BOARD=1 in deployable config

## 4) Post-stack ops (ready, not merge blockers)

- [ ] HC_REFRESH_PING_URL / HC_ODDS_FETCHEDAT_PING_URL (founder)
- [ ] SQL: MAX(odds.fetchedAt) age
- [ ] npm run gate:phase-c when quotes live

## 5) Non-goals (do not block merge)

- LIVE_BOARD enable
- 6h widen
- Paid Odds API
- Stripe/DNS/prices

## Report line

```
MAIN sha:
FLAG LIVE_BOARD: off
PHASE C: 888|359|283|0|(5b)=0 → ?
SHIPPED:
BLOCKERS:
NEXT ONE ACTION:
```
