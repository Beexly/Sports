# Settlement Host + Cron Cadence — proposal (R-06 / B-06)

**The problem (two halves, one root):**
1. **Cadence:** `vercel.json` crons pull odds **once per day per sport** (05:00–11:00), but the readiness gate requires ingestion fresher than **60 minutes**. On Vercel-only prod, `/api/ready` would be red ~23h/day by design.
2. **Settlement:** the real settle loop lives in `workers/data-refresh` (a long-running process) which has **no host**. The `settle-picks` Vercel cron is a placeholder — picks would never settle in prod, so no record, no calibration sample, no launch gate progress. (The audit also flagged the placeholder masks this by reporting ok.)

**Option A — Vercel-only (RECOMMENDED, default in effect):**
- Port the settlement pass into the `settle-picks` cron route (fits the 300s `maxDuration` envelope; the loop is per-game work, chunkable), with the same job-truth contract as refresh-odds (non-2xx + classified reason on failure; degraded report when nothing settles).
- Set refresh-odds crons to `*/30` (matches the worker's native cadence + the 60-min gate with margin) and `settle-picks` to hourly.
- **Why A:** zero new vendors, zero new billing relationships, one deploy surface, the truth-contract monitoring already built points at Vercel crons.
- **Your 15-minute piece (GA-09):** confirm the Vercel plan supports sub-daily crons (Pro does; Hobby does not). If the account is Hobby, either upgrade or pick Option B.

**Option B — tiny worker host (fallback):** run `workers/data-refresh` continuously on Railway/Fly (~$5/mo). Architecturally cleanest (it already does 30-min loops + settlement + CLV + calibration regen natively); costs one new account + billing relationship (your hands only).

**Decision rule (D-011, default in effect):** implement Option A's code next cycle — route-based settlement with the truth contract + `*/30` cadence in `vercel.json`. If GA-09 comes back "Hobby, won't upgrade," flip to Option B with zero code waste (the route reuses the worker's settle functions).

**What does NOT change in either option:** the 60-minute freshness gate (never loosened to fake green), the draft-only publish gate, the calibration report regenerating after settlement.
