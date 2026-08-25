# Launch Gap Register

**Opened:** 2026-08-25 · **Author:** Claude (Opus 5) · **Branch:** `claude/kernel-wave-k-slots`

How far GSE is from 100%, with evidence. One row per gap. **No row without a file:line
you can open.** Severity is what it costs at launch, not how hard it is to fix.

Findings came from a 12-area adversarial audit fleet; every one marked FIXED below was
**independently re-verified by me** against the source before I touched it, and every fix
ships with a regression test **proven to fail against the previous code**. Findings still
OPEN are the fleet's, reproduced here with their evidence — treat them as high-quality
leads, not yet as confirmed truth.

---

## FIXED this session (7 commits, all on `claude/kernel-wave-k-slots`)

| # | Sev | Area | Gap | Evidence | Fix |
|---|-----|------|-----|----------|-----|
| F1 | **BLOCKER** | edge-lab | Leak wall was **fail-open**: every comparison against NaN is false, so the ordering guard `r.week >= kickoffWeek` could not reject a non-finite week — it **admitted** it. Week-17 data passed as "strictly prior" evidence for a pre-kickoff covariate. | `covariate-bus.ts:136` (proven by execution, not code-reading) | `e5b6b4d` — reject non-finite kickoff outright, skip non-finite row weeks before any ordering comparison. 6 regressions. |
| F2 | **BLOCKER** | paywall | Player Lab bypassed the DFS salary gate. `/api/dfs/salaries` gates the full board behind `requireFantasyApi()`; `/fantasy/dfs` shows a deliberate 24-row teaser; **`/players?view=dfs` rendered `rows: dfs.rows` in full, no gate**, to anonymous visitors — and triggered the licensed-provider fetch unauthenticated (denial-of-wallet). | `lib/players/views.tsx:579` vs `api/dfs/salaries/route.ts:14` | `5ba7c1a` — resolve entitlements first (fails closed to FREE), full board only for `canUseFantasyFull`, same teaser otherwise, honest footnote. 6 regressions. |
| F3 | **HIGH** | billing | `invoice.payment_failed` promoted **any** non-CANCELED row to PAST_DUE. PAST_DUE grants premium for `PAST_DUE_GRACE_DAYS` (7). Stripe holds a subscription at `incomplete` until its first charge clears, and a declined first charge fires that event — so **start a checkout, let the card decline, get 7 days of Pro free**. Repeatable with a fresh account. | `webhooks/stripe/route.ts:255` + `entitlements.ts:80` | `361dbac` — `NEVER_GRANT_GRACE = [CANCELED, INCOMPLETE]`. Also strengthened the test harness, whose mock treated an unmodelled Prisma operator as a match. |
| F4 | **HIGH** | billing | Reconcile wrote **terminal** CANCELED for `paused`/`incomplete`, both **resumable**. The webhook's resurrection guard then refuses to re-grant a CANCELED row by design — so the member resumes, Stripe sends `active`, the guard swallows it, and **they pay while stuck on FREE** with no path back short of a manual DB edit. `handleChargeRefunded` already reasons exactly this way and treats those statuses as LIVE; the two paths contradicted each other. | `reconcile-entitlements.ts:462` vs `webhooks/stripe/route.ts:361-367` | `9bb47e4` — persist the accurate non-terminal status (PAUSED/INCOMPLETE); access still revoked, door stays open. `canceledAt` only on a truly terminal revoke. 4 regressions. |
| F5 | **HIGH** | kernel | `blockBootstrap` handed the **caller's array** to a caller-supplied statistic. Median/trimmed-mean/quantile all sort in place, so bootstrapping a median silently reordered the caller's data — and on a time-ordered series a reorder destroys the autocorrelation the block form exists to preserve. | `kernel/slots/block-bootstrap.ts:174` | `cf09e91` — defensive copy. |
| F6 | — | kernel | A sweep test asserted a percentile interval brackets the point estimate. **It carries no such guarantee** (moving-block bootstrap is biased for the mean of an autocorrelated series). Forcing it would mean clamping the interval — fabricating coverage. | `kernel/__tests__/block-bootstrap.test.ts` | `cf09e91` — sweep now pins ordering/finiteness/level; bracketing stays on the well-resampled case; new test pins genuine monotone widening. Reasoning written into the test so it is not "restored". |
| F7 | — | edge-lab | EV12: `expectedSnapsNext` threw `RangeError` on a week-1/rookie null share, so **one rookie killed an entire slate loop**. | `props-hb-snap-exposure.ts` | `a475a9c` + fleet — typed `SnapsNext` refusal, fail-closed. 30 tests. |

---

## SHIPPED capability — the validation spine that was missing

The reason Hermes's edge scoreboard reads `survived=0 · none claimable yet` is not that
the edges are bad. It is that **the machine that promotes a candidate to verified did not
exist**. The `CARDS_EDGE_VALIDATE` deck defines a mechanical precondition gate for its CLI
(EV7); before today **all six kernel slots it names were missing** — the Wave-K1 slots
first flagged empty days ago.

All six now exist, with tests:

| Slot | What it unlocks | Tests |
|---|---|---|
| `crps` | Proper scoring on whole distributions, not hit-rate on point picks | 35 |
| `pit` | **Randomized** PIT — plain PIT is non-uniform on discrete outcomes and using it is the field's most common calibration bug | 42 |
| `brier-murphy` | Reliability / resolution / uncertainty decomposition | 30 |
| `calibration-fit` | Cox logistic recalibration (slope/intercept) via IRLS | 34 |
| `bh-fdr` | Benjamini–Hochberg FDR **+ cluster-adjusted ESS** — what stops the mining engine being a p-hacking machine | 40 |
| `block-bootstrap` | Honest CIs on autocorrelated series | 39 |
| EV2 `candidate.ts` | The `CandidateSpec` contract every candidate implements — total validator, typed refusals, never throws | 43 |

Quality bar met, not just green: the PIT suite proves uniformity under a matched
simulate/score pair, rejects a mismatched pair **and** a same-mean/wrong-dispersion pair,
and demonstrates that **plain non-randomized PIT fails on the very same matched pair** —
which is the whole reason the slot exists. Chi-square p-values are checked against
closed-form analytic values, not against the implementation's own output.

**What this unblocks:** EV3–EV7 (fold-runner, scorers facade, CLV referee, promotion
report, `npm run edge:validate`) now have their dependency satisfied. That chain is what
turns "8 binds built, 4 killed" into *verified edges* with e-values attached — the
PROVEN/ESTABLISHED milestones on the pricing ladder.

---

## OPEN — fleet findings, evidence attached, not yet independently confirmed

Ordered by severity. I verified F1–F7 myself; the rest below I did **not** have time to
re-verify, so they are leads with evidence, not established defects.

### Money path
- **HIGH** `unpaid` maps to the access-granting PAST_DUE bucket, contradicting the reconcile classifier — `webhooks/stripe/route.ts:754`
- **MED** Dunning banner never renders for FANTASY subscribers — `lib/billing/notice.ts:38`
- **LOW** Webhook idempotency does not match the accepted Option C in `STRIPE_WEBHOOK_IDEMPOTENCY_DECISION.md`: the invariant comment and enforcing test do not exist and `handleStripeEvent` is not exported, so the specified test cannot be written — `webhooks/stripe/route.ts:127`

### Data honesty (touches CLAUDE.md law: *no stale data*)
- **HIGH — architectural, needs your call.** TheRundown and ESPN free-path adapters stamp the **local clock** as bookmaker `last_update`. The freshness gate exists specifically to check *upstream* age ("a fetchedAt check alone cannot catch this" — `process-sport.ts:462`), so on those paths it compares now-to-now and **is tautological**: stale/cached odds pass as fresh. `rundown-client.ts:257`, `espn-odds-client.ts:263`. **I did not fix this unattended** — TheRundown's v2 path already captures real `updated_at` (`rundown-client.ts:332`) while ESPN exposes no upstream timestamp at all, so the honest fix differs per path and the strict version could dark the free odds paths entirely. That is a launch-posture decision, not a code cleanup.
- **HIGH** Historical-games backfill deletes the whole multi-season archive then chunk-inserts **outside a transaction** — a mid-loop failure leaves a silently truncated archive that calibration reads as complete — `lib/ingestion/historical-games.ts:98`
- **MED** Missing `x-requests-remaining` header parses to 0 credits, so `refreshOdds` skips every remaining sport as "low quota" — `odds-api-client.ts:255`
- **MED** Event-odds credit cap counts only *successful* calls, so a failing slate makes one upstream call per event instead of the documented hard cap — `event-odds-ingest.ts:163`

### Settlement / track record
- **HIGH** Published pick text/line keeps drifting after publish while grading is frozen to `clvLockLine` — displayed pick, proof receipt and graded line disagree — `process-sport.ts:788`
- **HIGH** Secondary free score sources are merged into the PRIMARY list before `buildTrustedFinals`, killing dual-source confirmation for MLB/NBA/NHL and emitting duplicate finals — `multi-source-scores.ts:257`
- **MED** Stale-settlement backfill blind-overwrites an existing FINAL score and grades against a score it never reconciled — `settle-backfill.ts:295`
- **MED** Calibration bucket win rate counts PUSH as half a win in the denominator, contradicting its own published disclaimer and the Clopper-Pearson band drawn beside it — `lib/calibration/compute.ts:305`

### Entitlements
- **HIGH** B2B v1 routes leak PRO-gated confidence and premium-only `rankingP` to FREE-scope API keys — `api/v1/signals/route.ts:112`
- **MED** `/api/sleeper/market-signal` has neither an entitlement gate nor a rate limit — `api/sleeper/market-signal/route.ts:7`

### Auth
- **HIGH** Jarvis memory reader Server Actions are unauthenticated POST endpoints that dump internal operator memory — `lib/jarvis/memory/actions.ts:315`
- **HIGH** `/admin` "Trigger Data Refresh" calls its own API cookieless — always 403, the button can never work — `app/admin/page.tsx:117`

### Cron plane
- **HIGH** Billed odds refresh scheduled twice per 15-minute window (`refresh-odds` + `board-fill`) with overlapping execution — `vercel.json:17`
- **HIGH** Calibration eligibility streak advances once per HTTP invocation, so duplicate cron fires can satisfy the auto-publish gate in minutes — `cron/calibration-metrics/route.ts:212`
- **MED** `/api/cron/gamma` declares a schedule in code but has no `vercel.json` entry — it never runs — `cron/gamma/route.ts:9`
- **MED** `refresh-odds` returns 200 when every sport failed, so a totally failed run records as success — `cron/refresh-odds/route.ts:155`
- **MED** `autonomy-cycle` can execute up to 360s of sub-cron calls under a 120s `maxDuration`, and reports live siblings as failures — `cron/autonomy-cycle/route.ts:35`
- **LOW** `backtest-calibration` answers unauthenticated callers 200 before the auth check — `cron/backtest-calibration/route.ts:61`

### LLM output safety
- **HIGH** Model Court grounding is seeded from a prompt embedding the user's own question, so **any number the user types is whitelisted** for the answer — `model-court/answer.ts:157`. *(This is the exact residual I documented in the LQ15 commit; the fleet found it independently. Fixing it means splitting context-only grounding out of the prelude builders.)*
- **MED** Numeric guard matches by bare value across claim kinds, so a transposed W-L record or a line reused as a percentage passes as "grounded" — `numeric-guard.ts:60`
- **MED** Loss-autopsy drafts run no numeric grounding at all, though the grounded context is already in hand — `lib/loss-autopsy/draft.ts:129`
- **MED** Studio generation enforces no-fabricated-numbers as a prompt instruction only; the output gate never checks numbers — `lib/studio/claude.ts:78`

---

## Baseline health (measured today, not asserted)

- Monorepo typecheck: **clean**
- `apps/web`: **11,770 passing** / 879 files
- `packages/prediction-engine`: **3,482 passing** / 290 files
- `npm run guardrails`: **all green** (trust gate, model freeze, secret scan, brand safety, commercial copy, performance claims, AI council, and ~15 more)
- Two honest `SKIPPED-GREEN` warnings remain: `ai-control-plane-claim-pg` and `slate-opening-reader` money-path proofs do not run without `AI_CLAIM_PG_URL` / `SLATE_OPENING_PG_URL`.

## Still owner-only (unchanged, not fleet-actionable)

Scheduler choice (Vercel Pro vs Actions vs third-party pinger), `CRON_SECRET`, the six
Stripe price IDs, canonical host + OAuth redirect + apex→www, Elite alert channel keys,
and the gate ladder flips. See the OWNER-ACTION checklist in `CARDS_LAUNCH_QA.md`.

## Suggested order when you return

1. Review and merge this branch (7 commits; every fix has a proven-failing regression).
2. Decide the freshness-stamp posture — it is the one open item that touches a stated
   product law and the one I deliberately did not fix unattended.
3. Work the OPEN list top-down; the auth and B2B entitlement leaks are the cheapest
   remaining BLOCKER-class wins.
4. With the kernel landed, EV3–EV7 are unblocked — that is the path to a *verified* edge
   rather than a built one.
