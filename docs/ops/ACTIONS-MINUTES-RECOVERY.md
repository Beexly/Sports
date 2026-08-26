# GitHub Actions Minutes — Incident, Resolution, and Never-Again Plan

**Date:** 2026-08-26 · **Status:** billable damage $0 · **Owner runbook — agents may read this but must never apply the workflow changes themselves (`.github/workflows/**` is on the never-modify list).**

---

## 1 · What happened (and what it did NOT cost)

The repo's included GitHub Actions pool for private repos — **3,000 minutes/month — is fully consumed** (billing page 2026-08-26: "3,000 min used / 3,000 min included", resets in 6 days).

**The critical facts, in order of importance:**

1. **You owe $0.** The billing page shows $145.91 consumed usage fully offset by discounts, **billable $0**. With the Actions spending budget at its $0 default, GitHub *stops running* Actions rather than charging you. There is no bill coming.
2. **Nothing is broken.** Pushes, PRs, merges, the deployed site, Vercel crons — all unaffected. Only GitHub-hosted CI/scheduled workflow runs pause until the pool resets (~2026-09-01).
3. **For the next ~6 days**, the repo's own local verify block (`npm run typecheck` / `lint` / `vitest` / `check:ledger` / `agent:eval` / `guardrails`) is the merge gate — which AGENTS.md already mandates before every commit anyway. Merge on local evidence pasted into the PR.

---

## 2 · Where the minutes actually went (measured, not guessed)

Billable minutes are **per job, rounded up to the next minute** (skipped jobs bill 0), and `ci.yml` runs **12 jobs** per trigger (11 in parallel; `build` waits on `test`).

| Workflow | Schedule / trigger | Runs | Estimated burn |
|---|---|---|---|
| `external-cron.yml` | **SIX crons**: settle `15 * * * *` (24/day) · free-spine `5 */2 * * *` (12/day) · player-stats `40 */6 * * *` (4/day) · autonomy-cycle `22 * * * *` (24/day) · board-fill `10 * * * *` (24/day) · signal-slate `25 * * * *` (24/day) | **112 job-fires/day** | ≥1 min each → **~3,400 min/month FLOOR — this alone exceeds the entire pool** |
| `external-watchdog.yml` | `*/30 * * * *` (every 30 min, 24/7) | **48/day** | ≥1 min each → **~1,440 min/month floor** |
| `ci.yml` (12 jobs, 10 of which each run their own `npm ci`) | every push to `main`/`claude/*`/`sports-intelligence-os-*` + **every PR push** (filterless `pull_request:`) | per agent push | measured 9–13 wall-min/run → **~40–80 billable job-min per push** |
| `neon_workflow.yml` | every PR open/reopen/close AND every push to an open PR | 2 jobs per event | ~2+ min per PR push |
| `python-tests.yml` | path-filtered: only when `gse-ml-service/**` changes | rare | minor (already frugal — leave alone) |
| `fable-evidence.yml` | PR path-filtered, but paths include `package.json`/`package-lock.json` (fires on any dep bump) | occasional | full npm ci + vitest job |
| `daily-smoke.yml`, `weekly-comparison.yml` | daily 13:30 UTC / Monday 13:00 UTC | ~35/month | minor |

The **scheduled** workflows alone (~4,800 min/month floor between external-cron and the watchdog) consume more than the entire 3,000-minute pool. Multi-agent overnight sessions pushing many commits (each burning a 40–80 job-minute CI run, doubled on trunk branches by the push+PR pair) finished the job.

---

## 3 · Resolution — do these today (10 minutes, all free, no code changes)

1. **Confirm the spending cap stays $0** — github.com → Settings → Billing and plans → Budgets and alerts: the Actions budget must remain **$0** so overage can never charge you. (Your $0 billable line indicates this already held. Leave it.)
2. **Set budget alert emails at 50% / 75% / 90%** in the same "Manage budgets" screen. This is the "never blindsided again" lever — you'll get email at 1,500 min instead of a red bar at 3,000.
3. **Disable the two scheduled burners from the UI until they're patched** (no file edits needed): repo → Actions tab → select "External Watchdog" → "···" menu → **Disable workflow**; repeat for the external-cron workflow. Re-enable after applying §4. Know what you're pausing: disabling external-cron pauses **six** scheduled job families (pick settlement, free-spine heartbeat, player-stats refresh, autonomy cycle, board fill, signal slate), not one — if hourly settlement matters to you this week, re-enable it as soon as the pool resets instead. (Watchdog coverage in the interim: check `https://www.galaxysportsedge.com/api/ops/public-surface-truth` manually, or see §4.1's free external monitor — which is strictly better anyway.)

---

## 4 · Never-again plan — structural patches (apply when convenient; ~30 min total)

Apply these yourself, or hand this file to a Claude session with explicit authorization to modify `.github/workflows/**` (that authorization must come from you — no agent may self-grant it).

### 4.1 Watchdog: move it off Actions entirely (saves ~1,440 min/month → 0)

The watchdog only polls a **public, unauthenticated** endpoint. A free external uptime monitor (UptimeRobot, Healthchecks.io, Better Stack — free tiers all cover this) pointed at `https://www.galaxysportsedge.com/api/ops/public-surface-truth` with keyword alerting does the same job with **zero minutes, faster detection (5 min vs 30), and independence from GitHub** — the watchdog's own design goal (nothing inside the failing platform should be its own alarm) argues for this.
Interim half-measure if you keep it on Actions: change `cron: "*/30 * * * *"` → `cron: "0 */4 * * *"` (48 → 6 runs/day, ~1,440 → ~180 min/month).

### 4.2 external-cron: match cadence to game reality (saves ~60%; ~3,400 → ~1,400 min/month, or ~0 on Vercel Cron)

**Read this first — the trap:** every job in `external-cron.yml` is gated by an exact string match on its cron, e.g. `if: ${{ github.event.schedule == '15 * * * *' }}`. If you change a cron line without updating the matching job's `if:` string to the identical new text, that job **silently never runs again while the workflow shows green success runs.** Every retimed cron below must be mirrored into its job's `if:` gate. (Latent bug worth fixing while in there: the `refresh-odds` job is gated on `github.event.schedule == '*/30 * * * *'`, a cron that isn't in the schedule list at all — it is already schedule-dead, manual-dispatch only.)

There are **six** schedules; decide each one deliberately (crons are UTC):

| Job | Current | Suggested | Runs/day |
|---|---|---|---|
| settle-picks | `15 * * * *` | `15 0-7,17-23 * * *` (US game/settlement windows) | 24 → 15 |
| free-spine-health | `5 */2 * * *` | `5 */4 * * *` | 12 → 6 |
| refresh-player-stats | `40 */6 * * *` | keep | 4 |
| autonomy-cycle | `22 * * * *` | `22 */4 * * *` — or drop if redundant with an existing Vercel cron (verify first) | 24 → 6 |
| board-fill | `10 * * * *` | `10 */3 * * *` | 24 → 8 |
| generate-signal-slate | `25 * * * *` | `25 */3 * * *` | 24 → 8 |

Total: 112 → ~47 fires/day (~1,400 min/month), and each retime is a **functional cadence change** — settlement latency grows to the new interval, so keep settle-picks the most frequent. The stronger move: port these jobs to **Vercel Cron** (the app already deploys on Vercel) hitting the same endpoints — zero Actions minutes and no `if:`-gate trap.

### 4.3 CI: stop paying for docs commits (saves ~40–80 job-min per docs push)

Add to the `push:` trigger of **`ci.yml` only**:

```yaml
push:
  branches: [main, "claude/*", "sports-intelligence-os-*"]
  paths-ignore:
    - "docs/**"
    - "handoff/**"
    - "**/*.md"
```

This preserves the O-5.1 adversarial protection untouched: the `pull_request:` trigger stays filterless, so **every PR still runs full CI** whatever its base. Docs-only pushes to trunks simply stop double-billing.

**Leave `python-tests.yml` alone**: its push and PR triggers already carry a `paths:` allowlist (`gse-ml-service/**` — "PATH-FILTERED ON PURPOSE"), docs pushes already cost it nothing, and GitHub rejects `paths` + `paths-ignore` on the same event.

### 4.4 Agent discipline (already live, zero config)

The Sonnet operating prompt (`docs/agent-prompts/SONNET-MAX-LEVERAGE-PROMPT.md` §6) now binds every agent session to: local verify block before any push · one push per verified task, batched commits · `[skip ci]` on docs/ledger-only commits · never creating/dispatching workflows · never pushing to "kick CI". AGENTS.md already bars agents from `.github/workflows/**`.

### 4.5 Optional endgame: a self-hosted runner ($0 minutes, forever)

A runner on your own Windows machine makes every CI minute free (GitHub does not bill self-hosted minutes): repo → Settings → Actions → Runners → New self-hosted runner, then add `runs-on: [self-hosted]` per job. **Caveats:** only do this while the repo stays private; never expose a self-hosted runner to fork PRs; the machine must be on for CI to run. Best reserved for the heavy `test` job while keeping scheduled jobs on the patched cadence above.

### 4.6 Standing invariant for all future workflow PRs

Any PR adding or changing an `on: schedule` must state its cost in the PR body: `runs/day × billable min/run × 30`. Benchmark for calibration: an innocent-looking `*/30` cron with a 1-minute job is **1,440 min/month — half the entire free pool**.

---

## 5 · Expected steady state after patches

| Item | Before | After |
|---|---|---|
| Watchdog | ~1,440 min/mo | 0 (external monitor) or ~180 (@4h) |
| external-cron (6 schedules) | ~3,400+ min/mo floor | ~1,400 min/mo retimed (or ~0 on Vercel Cron) |
| CI docs-pushes | 40–80 job-min each | 0 |
| Scheduled total | **~4,800+ (pool-breaking on its own)** | **~1,400–1,600 (or ~200 with Vercel Cron)** |
| Headroom for real CI | none | **~1,400–2,800 min/mo ≈ 20–70 full PR runs (40–80 job-min each)** |

With alerts at 50/75/90% and the $0 cap, a repeat becomes both unlikely and harmless: worst case is CI pausing early with an email trail — never a charge.
