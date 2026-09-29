# Vercel cron cost-reduction plan

**Date:** 2026-09-29 · **Status:** READ-ONLY audit. Nothing changed in `vercel.json`,
`.github/workflows/external-cron.yml`, any env var, or any DB row.
**Scope:** the 23 crons in `vercel.json` and the 6-entry schedule in
`.github/workflows/external-cron.yml`.

Every number below is computed from the two files as they exist on disk, and every
claim about runtime behaviour is quoted from route/pipeline source. The one thing I
could **not** measure is live Vercel billable invocation counts (no Vercel CLI auth and
no production DB credentials on this machine), so dollar figures are expressed as
invocations and worst-case function-hours, with the conversion stated as an assumption.

---

## 1. Headline

| | now | proposed | delta |
|---|---|---|---|
| scheduled routes | 23 | 22 (1 deleted) | −1 |
| invocations/day | **709** | **289** | **−420 (−59.2%)** |
| invocations/month (30.44d) | 21,582 | 8,797 | **−12,785** |
| worst-case billed function-hours/day (invocation × `maxDuration`) | 2,945 h | 1,187 h | **−60%** |
| max DB-idle gap | 8 min | **17 min** | crosses Neon's 5-min suspend |

Two independent effects, not one: fewer invocations, **and** a schedule whose spacing
actually lets the database reach scale-to-zero (see §5 — this is the part that money).

---

## 2. Redundancy found, ranked by evidence strength

### 2.1 `generate-signal-slate` is fully subsumed — DELETE (96/day)

Strongest finding. The route body is 44 lines and calls exactly one pipeline
function (`apps/web/app/api/cron/generate-signal-slate/route.ts:22`):

```ts
const result = await generateSignalSlate({ logPrefix: "...", trace: await slateAssociationTrace() });
```

The **same function, with the same trace, already runs inside two other crons**:

- `board-fill` → `runBoardFillPipeline` calls `generateSignalSlate({ skipSeed: true, trace })`
  (`packages/ingestion-pipeline/src/board-fill.ts:45-50`)
- `refresh-odds` → calls `generateSignalSlate({ logPrefix: "[cron:refresh-odds:signal]", trace })`
  (`apps/web/app/api/cron/refresh-odds/route.ts:126`)

So the standalone route is 96 invocations/day producing slate rows the other two
already produce, at `maxDuration = 300`. Its own header records that it exists to avoid
the 120 s timeout, but that timeout was fixed on 2026-09-05 by raising the ceiling
(comment at `generate-signal-slate/route.ts:12-15`) — the justification is stale.

The only thing the standalone route adds is a *seeding* step, because
`generateSignalSlate` seeds from ESPN unless `skipSeed` is set
(`packages/ingestion-pipeline/src/generate-signal-slate.ts:207-214`). `board-fill` and
`refresh-odds` both perform that seed themselves. **Nothing is lost.**

⚠️ One code consequence: the comment in `apps/web/lib/autonomy/safe-cron-targets.ts:18-23`
records that `generate-signal-slate` was removed from the autonomy allow-list and says
*"Restore both entries together if wired."* Deleting the schedule does not require
restoring the allow-list entry (the planner has no matching action), but leave that
comment in place or amend it so a future reader does not "fix" the divergence.

### 2.2 `board-fill` and `refresh-odds` overlap ~85% — merge to one (96/day)

`board-fill` = ESPN seed + `refreshOdds()` + `generateSignalSlate(skipSeed)`.
`refresh-odds` = `refreshOdds()` + `generateSignalSlate()` + a per-sport shadow pass.

Both run the odds refresh and the signal slate. `refresh-odds` additionally runs
`runShadowEvaluationPass()` for every supported sport
(`apps/web/app/api/cron/refresh-odds/route.ts:145-153`), which `board-fill` does not.
`board-fill` has one thing `refresh-odds` lacks: it *always* seeds ESPN first, even when
quote keys are absent (`board-fill.ts:36-38`).

They run at 15-minute offsets today (`:02,:17,:32,:47` vs `*/15`), so the pipeline is
executed 192×/day to do what one pass does.

**Recommendation: keep `refresh-odds`, retire `board-fill`,** but this is the one
recommendation I am *not* calling automatic, because it trades the always-seed
guarantee. If the always-seed behaviour matters when `THE_ODDS_API_KEY` is absent,
keep both at hourly (the 48/day in the table) rather than retiring one. That is a
product call about free-mode resilience, not a cost call.

### 2.3 `health-alert` runs 96×/day to fire at most ~9 — 24/day is safe (72/day)

`apps/web/lib/ops/health-alert-decision.ts:146-148` states the bound explicitly:

> *"a permanently-broken deployment pages at most ~9 times a day (3 age rungs + 6 clock
> blocks) instead of 96"*

The 15-minute tick exists only so a tick can *straddle* a rung boundary
(`rung > prev` where `prev = rung(age - 15)`). I verified by enumeration that a
**60-minute tick skips zero rungs**: the rung boundaries are 90 m / 360 m / 1440 m and
no 60-minute step can jump across more than one. So 90 of 96 daily invocations cannot
produce a page under any outage.

🔴 **Trap — do not simply move this cron to an off-zero minute.** The clock ladder
compares `block(now)` against `block(now - HEALTH_ALERT_TICK_MINUTES)`, and that
constant is **hardcoded to 15** at `health-alert-decision.ts:161` with the comment
*"Cron interval for `/api/cron/health-alert` — `*/15 * * * *` in vercel.json."* I
simulated it: an hourly schedule at `:23` with the constant left at 15 yields
**0 clock pages per day instead of 6**, because a 15-minute look-back never spans a
4-hour block boundary. That ladder is the *only* page path for failures that carry no
duration (a dead database, an unavailable settlement probe) — you would silently lose
the DB-down alarm while cutting cost. The proposed schedule below keeps `health-alert`
on `:00` hourly, which fires the full 6 pages/day under **either** constant. If you ever
move it off `:00`, you must change the constant in the same commit.

### 2.4 `autonomy-cycle` is 96×/day, and can *amplify* cost 4× (72/day)

`maxDuration = 300`, and with `AUTONOMY_EXECUTE=true` each tick may HTTP-invoke up to
`AUTONOMY_MAX_ACTIONS_PER_CYCLE = 4` sibling crons (`safe-cron-targets.ts:29`,
`execute-autonomy-cycle.ts`). So the true ceiling today is not 96 invocations but
up to **96 × (1 + 4) = 480/day** — the single largest multiplier in the file. The
allow-list includes `/api/cron/refresh-odds` and `/api/cron/settle-picks`, both of
which have their own schedules, so an execute-mode tick re-runs work that is *already
scheduled to run on its own*.

Default is dry-run (`autonomy-cycle/route.ts:49`), so the multiplier is latent, not
active — but it is the reason this cron is worth cutting before the others. Hourly
retains the SLA it exists to police: `FREE_SPINE_SLA_MINUTES = 120` means a 60-minute
observing cadence catches a breach with a full interval to spare.

### 2.5 `refresh-player-stats` 48→24, `jarvis-snapshot` 24→12

- **refresh-player-stats**: every 30 min. No route comment or SLA demands 30-minute
  freshness for player stats; hourly leaves ≥59 min of headroom against the 240-min
  `REFRESH_STALE_AFTER_MINUTES` (`lib/data-reliability/refresh-sla.ts:30`).
- **jarvis-snapshot**: an observatory ring buffer + durable write. Its own header says
  *"hourly"* but nothing consumes it faster. 2-hourly is 12/day instead of 24/day.
  **Lowest-confidence item in this plan** — it is a UI trend surface, so if a cockpit
  panel looks visibly staler, revert this one line.

---

## 3. What I recommend leaving completely alone

These are cheap and load-bearing; cutting them saves nothing and risks correctness.

| cron | now/day | why it stays |
|---|---|---|
| `settle-picks` | 24 | hourly settlement; 20 KB route, the real work of the system |
| `free-spine-health` | 12 | already at the `FREE_SPINE_SLA_MINUTES = 120` edge — **zero headroom** |
| `calibration-metrics` | 4 | 24 KB route, every 6 h, feeds cockpit + path-to-verified |
| `signal-ledger-write` | 24 | added 2026-09-28 in #933 specifically to make a 0-row table run |
| `reconcile-entitlements`, `repair-checkout-attempts`, `drain-ai-telemetry-recovery` | 24 each | revenue/entitlement correctness, trivial routes (2–3 KB) |
| the 8 daily crons | 1 each | 8 invocations/day total; nothing to optimise |

`free-spine-health` deserves a flag rather than a schedule change: it runs every 2 h
against a 120-minute SLA, so a single skipped tick is an SLA breach with **no
headroom**. `CRON_MATRIX.md:31` claims Vercel runs it every 30 min (`10,40 * * * *`) —
that is **stale**; `vercel.json` says `0 */2 * * *`. If that 30-minute cadence was
deliberate, restoring it costs 12 invocations/day and buys real redundancy.

---

## 4. `external-cron.yml` — 100% redundant, and currently dead

**Every one of its 9 jobs duplicates a Vercel cron.** Verified by parsing the file:

| external job | fires on | target | Vercel schedule |
|---|---|---|---|
| settle-picks | `15 * * * *` | `/api/cron/settle-picks` | `20 * * * *` ✅ dup |
| free-spine-health | `5 */2 * * *` | `/api/cron/free-spine-health` | `0 */2 * * *` ✅ dup |
| refresh-player-stats | `40 */6 * * *` | `/api/cron/refresh-player-stats` | `0,30 * * * *` ✅ dup |
| autonomy-cycle | `22 * * * *` | `/api/cron/autonomy-cycle` | `7,22,37,52` ✅ dup |
| board-fill | `10 * * * *` | `/api/cron/board-fill` | `2,17,32,47` ✅ dup |
| generate-signal-slate | `25 * * * *` | `/api/cron/generate-signal-slate` | `5,20,35,50` ✅ dup |
| jarvis-snapshot | *dispatch only* | `/api/cron/jarvis-snapshot` | `15 * * * *` ✅ dup |
| backfill-independent-trueprob | *dispatch only* | same | `10 */4 * * *` ✅ dup |
| refresh-odds | `*/30 * * * *` | `/api/cron/refresh-odds` | `*/15 * * * *` ✅ dup |

Two findings beyond the duplication:

1. **`refresh-odds` in that file can never run.** Its guard is
   `if: github.event.schedule == '*/30 * * * *'`, but `*/30 * * * *` is not in the
   `on.schedule` list. It is dead code that reads as a live backstop — worse than
   absent, because a reader counts it as coverage.
2. **The file's stated premise is obsolete.** Its header says *"Vercel Hobby caps cron
   frequency at once per day"* — which is why a second scheduler was built. The current
   config runs 15-minute crons, i.e. the project is past that limit, and the header's
   own 2026-08-10 note already says *"Vercel-only … may sit idle (no runners) — that is
   accepted, not a bug."*

**Recommendation:** if GitHub Actions minutes are still not restored, delete the file
or neutralise its `on.schedule` (keep `workflow_dispatch` for manual fire). It buys
nothing today and would add **112 duplicate invocations/day** of work Vercel already
does if anyone ever re-enables billing. If minutes *are* restored, keep it as a
genuine backstop but fix the `refresh-odds` guard to `*/15 * * * *` — after §5's
cadence change it should be `3 * * * *`, and a backstop firing every 15 min would undo
the savings it exists to protect.

---

## 5. The load-bearing effect: Neon scale-to-zero

`docs/ops/2026-09-28-infrastructure-audit.md:38-40` records that
`suspend_timeout_seconds` was set 0 → 300, i.e. the project now scales to zero after
**5 idle minutes**, and that the cap went 8 CU → 1 CU.

That change only pays off if the database is *ever* idle for 5 consecutive minutes.
I computed the max idle gap across all invocations in a representative day:

| | invocations/day | max DB-idle gap | reaches scale-to-zero? |
|---|---|---|---|
| now | 709 | **8 min** | no — 8 min of slack, but 709 crons keep the gap at 8 min |
| proposed | 289 | **17 min** | **yes** |

At 8 minutes of gap the current schedule sits just past the 5-minute threshold, so the
2026-09-28 saving is real but fragile — a single extra job added to an off-peak minute
destroys it. The proposed schedule opens a 17-minute hole and makes the suspend
**structurally** achievable rather than incidental. At the documented $0.106/CU-hour
and a 0.25 CU floor, roughly 12 min/day ≈ 5 h/month of avoided floor billing ≈ **$0.53/month**
directly — small in dollars, but the durable point is that it makes the already-applied
suspend actually reachable, and it is the reason the minute offsets below are spread
rather than clustered.

**The corollary matters as much as the saving:** do not re-cluster these schedules into a
single batch minute to "tidy" them. Four crons at the same `:00` looks tidier and
returns the max gap to ~0, silently re-disabling scale-to-zero.

---

## 6. The proposed `crons` block

```jsonc
"crons": [
  { "path": "/api/cron/refresh-odds",       "schedule": "3 * * * *"  }, // was */15
  { "path": "/api/cron/board-fill",         "schedule": "33 * * * *" }, // was 2,17,32,47  (see §2.2)
  // /api/cron/generate-signal-slate  — REMOVED, subsumed (§2.1)
  { "path": "/api/cron/health-alert",       "schedule": "0 * * * *"  }, // was */15 — MUST stay on :00 (§2.3)
  { "path": "/api/cron/autonomy-cycle",     "schedule": "27 * * * *" }, // was 7,22,37,52
  { "path": "/api/cron/refresh-player-stats","schedule": "57 * * * *" }, // was 0,30
  { "path": "/api/cron/jarvis-snapshot",    "schedule": "13 */2 * * *"}, // was 15 * * * *
  // … remaining 15 entries unchanged …
]
```

Offsets are deliberately spread (`:03 :13 :27 :33 :57`) to create the idle gap in §5.
`health-alert` is pinned to `:00` for the reason in §2.3.

**There are two `vercel.json` files** — `vercel.json` (root) and `apps/web/vercel.json`.
I diffed them: both currently carry all 23 identical crons, so they agree today. The
generated matrix names `apps/web/vercel.json` as the file Vercel actually reads. **Both
must be edited together or they will silently diverge.**

---

## 7. Two documentation defects found (not cost, but they cause bad cost decisions)

1. **`docs/ops/CRON_MATRIX.md` is stale and contradicts `vercel.json`.** It claims
   `free-spine-health` = `10,40 * * * *` (30 min) and `refresh-odds` = `*/30 * * * *`.
   Actual: `0 */2 * * *` and `*/15 * * * *`. Anyone sizing cost or restoring a backstop
   from that file sizes the wrong system.
2. **`CRON_MATRIX.generated.md` is stale too** — generated 2026-09-05, says
   *"Count: 22 scheduled routes"*, and omits `signal-ledger-write` (added 2026-09-28 in
   #933). Regenerate with `node scripts/ops/cron-matrix-from-vercel.mjs`.

Both regenerate/refresh cheaply, but per the read-only scope of this task I changed
neither.

---

## 8. What this does **not** do, stated plainly

- **No dollar figure is asserted.** Vercel bills Pro function-hours, not invocations.
  The 2,945 h → 1,187 h figure is a *worst case* (every invocation consuming its full
  `maxDuration`), which is almost certainly far above reality — most of these routes
  finish in seconds. It is a like-for-like upper bound on the same basis for both
  columns, not a bill. Real savings require the Vercel dashboard, which I cannot read
  from here.
- **No live production data was consulted.** There is no `IngestionRun`/cron-run table
  in `schema.prisma` (I checked 102 models) and no DB credentials on this machine, so
  "which of these actually do useful work" is inferred from source, not measured. The
  §2 conclusions rest on in-process call graph, which is decisive for §2.1–2.3 and
  weaker for §2.5.
- **Nothing was changed.** No schedule, env var, cron, deploy, or DB row.
- **The one reversible, owner-gated follow-up** (not a cost item, but the persistent
  4 h alert gap) is named at `health-alert-decision.ts:149-157`: a durable
  `source: "health_alert"` row in `ControlEventLedger` would let the clock ladder
  detect onsets immediately. That is a production-data write, so it is the owner's call.
