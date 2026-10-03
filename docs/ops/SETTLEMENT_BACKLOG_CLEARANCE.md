# Settlement backlog clearance — RCA + STP

**Status:** implemented on free-path settle (`runFreePathSettlement`)  
**Related:** `settlement-health.ts` (leading CLV indicator), `FREE_MODE_INGESTION_HEALTH.md`

## Why this exists

`/api/health` settlement capability goes **CRITICAL** when published picks remain
`PENDING` past grace after kickoff. A bare count is not enough to clear under
real-money risk — operators need **root causes** and a **straight-through**
wave plan so the cron drains the band without inventing scores.

## Root cause analysis (techniques)

Module: `apps/web/lib/settlement/root-cause-analysis.ts`

| Technique | What it does here |
|-----------|-------------------|
| **Classifier codes** | Maps each PENDING/HELD/race outcome to a single root cause |
| **5 Whys** | Five-step causal chain per code (operator-facing) |
| **Fishbone categories** | DATA_SOURCE · MATCHING · POLICY · PATH_CONFIG · TIMING · DURABILITY |
| **Pareto** | Count/share/cumulative share so the top cause is attacked first |
| **Clearance waves** | A STP reprocess · B matching/audit · C expert dispute · D wait |

### Codes (actionable)

| Code | Typical meaning | Wave |
|------|-----------------|------|
| `OVERDUE_NO_SCORE` / `NO_TRUSTED_FINAL` | No usable free final | A |
| `TEAM_ORIENT_FAIL` | Final found, home orient failed | B |
| `SINGLE_SOURCE_POLICY_HOLD` | Settled or held under single-source audit | B |
| `DISPUTED_SCORES` | Multi-source conflict — never auto-force | C |
| `PATH_MISCONFIG` | Odds key present blocks free path | C |
| `WRITE_RACE_LOST` | Idempotent write lost race | A |
| `WITHIN_GRACE` / `NOT_COMMENCED` | Not yet overdue | D |

`settlePendingPicks` now emits `PENDING.reason = NO_FINAL | ORIENT_FAIL` so RCA
does not guess.

## Straight-through processing automation

Module: `apps/web/lib/settlement/stp-clearance.ts`

| STP action | Behavior |
|------------|----------|
| `AUTO_SETTLE` | CONFIRMED final written this cycle |
| `AUTO_SETTLE_AUDIT` | SINGLE_SOURCE write (audit flag) |
| `REPROCESS` | Queue for next score cycle (overdue no final) |
| `EXCEPTION_QUEUE` | Human / evidence (DISPUTED, orient, path) |
| `WAIT` | Inside grace or pre-kickoff |

**Load priority:** free runner sorts PENDING by `stpLoadPriority` — overdue first
so a 300s cron spends budget on the health band, not future games.

**Burn rate:** `computeBurnRate({ cleared, newOverdueInflow, reopened })` —
campaign is draining only when net burn > 0.

## Free-path response shape (additive)

`runFreePathSettlement` return value now includes:

```ts
{
  path: "free",
  oddsApiRequired: false,
  picksSettled, picksHeld, sports, ...
  rca: SettlementRcaReport,   // Pareto + five whys + headline
  stp: ClearanceWavePlan,     // wave A–D decisions
  burnRate: BurnRateReport | null  // when priorOverdueCount passed
}
```

Cron `/api/cron/settle-picks` free branch already returns the full `free` object
— RCA/STP appear under `free.rca` / `free.stp` after deploy.

## Operator runbook (clearance campaign)

1. Confirm path: settle-picks response must show `path:"free"` (key **absent**, not invalid).
2. Trigger free-spine-health + settle-picks.
3. Read `free.rca.operatorHeadline` and `free.rca.pareto[0]`.
4. Wave A: re-run scores/settle until `OVERDUE_NO_SCORE` falls.
5. Wave B: alias/orient fixes for `TEAM_ORIENT_FAIL`.
6. Wave C: owner decision on `DISPUTED_SCORES` only with evidence.
7. Track burn: pass prior overdue into the runner or compare consecutive health probes.
8. Declare clear only when settlement-health is `HEALTHY` **and** net burn stayed positive.

## Integrity companions (same PR family)

- **placebo-leak harness** fixed: bare CLV series rejected (was no-op + inverted);
  pairs-based residual association; production Phase-0 gate remains edge-lab
  `shuffledTimePlacebo`.
- **skipped-pg-integration-honesty** guard inventories AI claim + slate opener PG
  suites so skipped-green cannot silently delete money-path proofs.


## 2026-08-06 — historical free scores + snapshot wire

**RCA:** free settle used undated ESPN board ("now" only) → overdue never matched.

**Fix:** date keys from pending commence times + abbr matching + SNAPSHOT_OUTCOME
inline + drain. Watch `picksSettled`, `clvRepair`, `snapshotRepair`, `scoreDates`.
