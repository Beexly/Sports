# Surface exposure sweep — full repo, measured 2026-09-28

**Method: measure, do not trust the hand-written list.** The exposure audit
(`docs/research/2026-09-28/orchestration/public-private-surface-doctrine.md`)
listed 13 items. That list was already wrong when SURF-1 ran: `/api/clv` and
`/stats/*` were gated and 7 others were not. A hand-written inventory is a
snapshot; this sweep re-derives it from the tree so the fence can be checked
against reality rather than against a document.

**Scope:** every `route.ts` and `page.tsx` under `apps/web/app`, minus
`/admin/**`, `/auth/**`, and `/api/internal/**` — **403 public routes/pages**
(188 API routes, 203 pages; the counts overlap because both file types live
under the same tree).

**Patterns searched** (the doctrine's keep-out list, as code):
raw signal/ledger reads · `next_gen_stats`/NGS metrics · WOPR and target share ·
QBR · calibration internals · adjustment-layer weights/magnitudes ·
truth-catalog topology · methodology factor lists · raw player-week rows ·
edge internals (`expectedClv`, `factorBreakdown`, `independentEdge`).

**Result: 127 routes matched at least one keep-out pattern. Zero were
confirmed exposures.** Every candidate resolved to one of:

| Why it is fine | Examples |
|---|---|
| Already behind a readiness gate | `/api/performance`, `/api/ops/public-surface-truth`, `/api/clv` |
| B2B API-key scoped | `/api/v1/probabilities` (`extractB2bApiKey`; bare key is FREE-only) |
| `CRON_SECRET` bearer auth | `/api/ops/signal-ledger-state`, `/api/ops/settlement-rca` |
| Premium rate-limit | `/api/nflverse/qbr` (`requirePremiumApiRateLimited`) |
| Session-gated | `/api/room/[gameId]/model-court` (`auth()`) |
| On the doctrine's KEEP list | `/api/verify`, `/api/proof/receipts` — published picks and their proof are explicitly allowed; `/api/verify` is leak-safe by construction (pre-kickoff receipts verify as SEALED: existence, integrity, freeze time, model version only) |
| Not a data surface at all | `/cockpit/**` (session-gated workspace), `/api/cron/**` (CRON_SECRET), checkout/portal/webhooks (Stripe plumbing) |

**Two near-misses worth writing down**, because both look like exposures on a
first read:

- `/api/nflverse/qbr` returns a named-metric family, which the doctrine lists
  as internal. It is premium-rate-limited, not anonymous. The audit's own
  verdict for it was "review — gated but exposes a metric family". **Left
  as-is on purpose:** fencing it would be a product decision about a paying
  tier's entitlements, not a leak fix, and it is the founder's call.
- `/calibration` (the page) and `/board` render calibration-derived content.
  Both are projections/rankings-family surfaces, which the doctrine allows;
  the *JSON* route `/api/calibration` was the actual violation and SURF-1
  fenced that.

**What this does NOT prove.** The sweep is a static text-pattern match. It
cannot see a leak that emerges from composing two allowed payloads, from a
route that re-exports another route's data under a different shape, or from a
runtime query that returns a keep-out column without naming it. It also does
not cover `apps/web/lib/**` components rendered inside the pages it cleared.
A green sweep means "no keep-out vocabulary appears in an ungated public
route", not "the public surface is proven clean".

**Standing recommendation:** re-run this as a CI guard rather than a one-time
sweep. `SURF-1` added the route-level fence and its regression test; this
sweep is the natural next guard, and it should be added to the fenced
allow-list check that `apps/web/__tests__/internal-surface-fence.test.ts`
already performs — extended from 7 named surfaces to a pattern sweep.

*No code written. No gate moved. Measurement only.*
