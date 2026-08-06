# Autonomous Operating Kernel

**Shipped:** 2026-08-06 via #289 (+ follow-on Jarvis/revenue wiring)  
**Code:** `apps/web/lib/autonomy/`

## What it is

A pure, deterministic control plane that answers:

> Given live probes + gates + settlement truth, **what should GSE do next** — without lying, betting, or flipping founder gates?

| Module | Role |
|--------|------|
| `operating-kernel.ts` | P0–P3 action plan, honesty score, refuse-default, revenue blockers |
| `settlement-learning.ts` | Grades → calibration samples (no MODEL_VERSION apply) |
| `revenue-ladder.ts` | FOUNDING→PROVEN→ESTABLISHED→AUTHORITY readiness (proof-gated) |

## Wired surfaces

1. **`/api/cron/health-alert`** — response includes `autonomy` (severity, queues, honesty, revenueReadiness)
2. **`/api/cron/settle-picks` free path** — `free.rca`, `free.stp`, `free.burnRate`, `free.learning`, `free.autonomy`
3. **Jarvis cockpit** — autonomy lines prepended to `recommendedNextActions`; P0/P1 as safety warnings

## Hard laws (enforced in design)

- Never set LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS / PUBLISH_LEDGER
- Never force-settle DISPUTED
- Never auto-publish content
- Never auto-bet
- Prefer over-reporting risk

## Operator loop

1. Read `/api/health` + health-alert `autonomy.severity`
2. If P0 settlement → trigger settle-picks + free-spine-health
3. Read `free.rca.pareto[0]` — attack Wave A first
4. Track burn rate until settlement capability healthy
5. Accumulate ≥100 eligible settled before any PROVEN packaging conversation
6. Founder YES only for gate flips

## Self-growth edges (next)

- Disposable Postgres CI job (`GSE_REQUIRE_PG_INTEGRATION=1`) for claim + slate opener proofs
- Persist autonomy plan transitions as Jarvis memory candidates (owner-confirm only)
- Alias table expansion when Wave B TEAM_ORIENT_FAIL dominates Pareto
