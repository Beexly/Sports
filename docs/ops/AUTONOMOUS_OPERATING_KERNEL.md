# Autonomous Operating Kernel

**Shipped:** 2026-08-06 via #289 (+ follow-on Jarvis/revenue wiring)  
**Executor (I9):** 2026-08-07 via #356  
**Code:** `apps/web/lib/autonomy/`

## What it is

A pure, deterministic control plane that answers:

> Given live probes + gates + settlement truth, **what should GSE do next** — without lying, betting, or flipping founder gates?

| Module | Role |
|--------|------|
| `operating-kernel.ts` | P0–P3 action plan, honesty score, refuse-default, revenue blockers |
| `execute-autonomy-cycle.ts` | **I9** actuator — only `RUN_FREE_SPINE_HEALTH` + `RUN_FREE_SETTLE` / Wave-A→settle |
| `settlement-learning.ts` | Grades → calibration samples (no MODEL_VERSION apply) |
| `revenue-ladder.ts` | FOUNDING→PROVEN→ESTABLISHED→AUTHORITY readiness (proof-gated) |

## Continuous-repair invariants (agent loop)

| ID | Meaning | How satisfied |
|----|---------|----------------|
| **I3/I8** | Durable free-spine SUCCESS | `recordFreeIngestionRun` from free-spine-health / player-stats / free settle; External Cron every 2h |
| **I9** | plan→act executor | `/api/cron/autonomy-cycle` + `executeAutonomyCycle` (default dry-run; `AUTONOMY_EXECUTE=true` or `?execute=1`) |
| **I2** | Freshness self-heal | Kernel queues free-spine when `ageMinutes > 90`; executor + External Cron `:22` fire the heal |
| **LAWS** | Never flip public gates | LIVE_BOARD / PUBLIC_PICKS / STATS_PUBLIC / PERFORMANCE_STATS / CALIBRATION_ADJUSTMENTS — HOLD only |

## Wired surfaces

1. **`/api/cron/health-alert`** — response includes `autonomy` (severity, queues, honesty, revenueReadiness) — **plan only**
2. **`/api/cron/autonomy-cycle`** — plan + optional execute (I9)
3. **`/api/cron/settle-picks` free path** — `free.rca`, `free.stp`, `free.burnRate`, `free.learning`, `free.autonomy`
4. **Jarvis cockpit** — autonomy lines prepended to `recommendedNextActions`; P0/P1 as safety warnings
5. **External Cron** — free-spine `:05`/2h; settle hourly; **autonomy-cycle hourly `:22`**

## Hard laws (enforced in design)

- Never set LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS / PUBLISH_LEDGER / STATS_PUBLIC / CALIBRATION_ADJUSTMENTS
- Never force-settle DISPUTED
- Never auto-publish content
- Never auto-bet
- Prefer over-reporting risk

## Operator loop

1. Read `/api/health` + health-alert `autonomy.severity`
2. If P0 settlement → trigger settle-picks + free-spine-health
3. If ingestion age > 90m → free-spine-health (or autonomy-cycle `?execute=1`)
4. Read `free.rca.pareto[0]` — attack Wave A first
5. Track burn rate until settlement capability healthy
6. Accumulate ≥100 eligible settled before any PROVEN packaging conversation
7. Founder YES only for gate flips

## Founder curls (secret-bound)

```bash
# Dry-run plan (safe)
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$CRON_TARGET_URL/api/cron/autonomy-cycle" | jq '{severity:.plan.severity,queue:.plan.autonomousQueue,cycle}'

# Force one heal cycle (I2) — free-spine / settle only, never LAWS
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$CRON_TARGET_URL/api/cron/autonomy-cycle?execute=1" | jq '{dryRun,cycle}'

# Or via Actions (repo secrets already wired)
gh workflow run external-cron.yml --repo Beexly/Sports -f target=autonomy-cycle
gh workflow run external-cron.yml --repo Beexly/Sports -f target=autonomy-cycle-execute
gh workflow run external-cron.yml --repo Beexly/Sports -f target=free-spine-health
```

Optional production env: `AUTONOMY_EXECUTE=true` turns scheduled autonomy-cycle into live execute (still refuses owner queue + LAWS).

## Self-growth edges (next)

- Disposable Postgres CI job (`GSE_REQUIRE_PG_INTEGRATION=1`) for claim + slate opener proofs
- Persist autonomy plan transitions as Jarvis memory candidates (owner-confirm only)
- Neon-backed free-spine cache (today process-local; durable truth is IngestionRun)
- Alias table expansion when Wave B TEAM_ORIENT_FAIL dominates Pareto
