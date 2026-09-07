# Launch status — 2026-09-07

Supersedes the status half of `LAUNCH_FINISH_LINE_2026-09-05.md`. That document's
section 5 (work packages WP-1..30 with entry files and acceptance commands) is still
the dispatch list; this one says where we actually are.

**Provenance discipline.** Every line below is tagged. `[M]` = I measured it this
session and name the command or query. `[A]` = an audit agent reported it and I have
NOT independently verified it — treat as a lead, not a fact. Nothing here is
tagged unless it traces to output somebody actually saw.

---

## 1. The headline

**One thing stands between the current tree and launch: the branch is not on `main`.**

`[M]` `git rev-list --left-right --count origin/main...HEAD` → `0  40`. The branch
`claude/sports-launch-round2-fixes-hk7kv9` is 40 commits ahead and 0 behind.
`git merge-base --is-ancestor origin/main HEAD` exits 0, so the merge is a
**fast-forward with zero conflicts**.

`[M]` Production is serving `f533ff4bd` (2026-09-06), read from
`/api/ops/public-surface-truth` `deployment.sha` at 15:45 UTC.

`[M]` `git merge-base --is-ancestor cc161128a origin/main` exits non-zero: the
**C-113 CRITICAL fix is not deployed**. That is the defect where the free score
persister wrote an earlier meeting's FINAL onto a later, unplayed game and graded
its published picks WIN/LOSS before first pitch. It is fixed on the branch and
running nowhere.

Merging PR #717 to `main` auto-deploys (CLAUDE.md: merge-to-main auto-deploys).
**That merge is the launch action.** It is founder-authorised only — AGENTS.md law 1
forbids an agent pushing to `main` without explicit say-so — so it is the one thing
waiting on a human, and everything needed to make it safe is already done.

---

## 2. Is the product actually launchable? Yes, at FOUNDING.

The recurring confusion is that PROVEN gates launch. It does not. FOUNDING is the
launch phase **by design**: founding rates live, public performance claims dark
until earned. `[M]` `/api/ops/public-surface-truth` `revenueLadder.milestones[0]`:
*"Founding rates live; public performance gated until proof."*

Measured launch-critical state, all from the production truth surface at 15:45 UTC:

| Thing | Reading | Verdict |
|---|---|---|
| `billingMoney.moneyPathReady` | `true` | `[M]` Customers can pay |
| `billingMoney.envPriceSlotsConfigured` | `6 of 6` | `[M]` Full price matrix live |
| Stripe secret + webhook secret | both `true` | `[M]` Configured |
| `gates.canExposePublicPicks` | `true` | `[M]` Picks are public |
| `settlement.health` | `HEALTHY`, 0 of 2661 overdue | `[M]` Clean |
| `stalePendingPicks.count` | `0` | `[M]` No pick sitting |
| `schedulerLiveness.status` | `healthy`, last success 0m ago | `[M]` Crons alive |
| `pricingPhaseReadiness.currentPhaseId` | `FOUNDING` | `[M]` Correct launch phase |

`[M]` The board has content. Read-only SQL over the next 7 days: 274 upcoming games,
123 with at least one published pick, **221 published picks** across NCAAF (104
games / 114 picks), MLB (91 / 59), NFL (45 / 23), MLS (34 / 25). An earlier read of
the 72-hour `marketCoverage` window looked alarming (NFL 3 games, 1 pick); that was a
thin mid-week slice, not the real board, and the 7-day query corrects it.

**Conclusion: the money path, the pick surface, settlement and scheduling are all
green. What is missing is the deploy.**

---

## 3. What is NOT blocking launch (stop re-litigating these)

- **PROVEN / the calibration claim.** `[M]` `calibrationEligibility` reads RED, sole
  reason `ECE 0.0505 > 0.05` (n 467, Brier 0.1896, Murphy reliability 0.0050,
  `consecutiveGreen` 0 of 3). ECE has moved 0.0524 → 0.0505 since yesterday, so it is
  0.0005 from the floor, but it gates PROVEN pricing and the published calibration
  curve — not the product. Correctly dark.
- **`PERFORMANCE_STATS_ENABLED` / `STATS_PUBLIC` off.** `[M]` `gates` confirms both
  false. That is the honest posture, not a gap.
- **Confidence-tail overconfidence.** Resolved as a watch item after three rounds of
  checking; see section 6.

---

## 4. Real defects still live in production data (founder/owner-run — law 7)

These are rows already in the database. An agent cannot fix them: AGENTS.md law 7
forbids agents writing to a database. Each needs an owner-run tool or a founder call.

| Row | What is live | Source |
|---|---|---|
| C-114 | 87 picks graded before kickoff against scores nobody observed; 63 sit inside the ECE sample | `[A]` |
| C-125 | 355 of 725 published MLB SPREAD picks carry a run line no book offers — a subscriber cannot place the bet | `[A]`, and `[M]` the *new* ones are now refused by `isPublishableSpreadLine` |
| C-118 | 148 published soccer moneyline picks, wrong by construction on a three-way market; code bug already fixed | `[A]` |
| C-115 | 80 of 585 published settled TOTAL picks contradict the final score on their own game row; **root cause still unknown** | `[A]` |

C-115 is the one I would not launch quietly past. A grading defect with no root cause
is the only item here that could still be *creating* bad rows. Everything else is a
known, bounded, historical population.

---

## 5. Founder-only console actions (no machine can do these)

`[A]` from the ledger; each is a Stripe/Vercel/registrar action, not code:

- **R-1** — ~25 Hermes credentials exposed in an August session transcript, still not
  rotated. This is the highest-severity item on the whole list and it is pure console
  work.
- **F-20** — confirm the Stripe webhook endpoint subscribes to all ten handled events.
- **F-19** — confirm no Founding Payment Link is still active or shared.
- **F-22** — one live production checkout end to end, then refund.
- **F-18** — set the Terms URL in Stripe, then `STRIPE_TERMS_CONSENT_ENABLED`, then
  redeploy (ordering matters; see OPERATOR.md §5).
- **F-23** — the `@GalaxySportsAI` handle contradicts the brand's central claim
  ("We're not AI") on every page that renders it.

---

## 6. Findings this session that changed after checking

Recorded because the corrections matter more than the findings.

**Confidence tail — three rounds, two reversals, ends as a watch item.**
1. `[M]` Truth surface: picks at ≥80 confidence win 52.1% while claiming 86.7%
   (n 211). Looked catastrophic.
2. `[M]` Crossed version × market in SQL: the pooled figure is retired-version
   contamination. v5.2.7 (deployed) ≥80 MONEYLINE is n 63, claimed 87.1%, actual
   **87.3%** — essentially perfect.
3. `[M]` But v5.2.7 SPREAD reads 46.9% actual against 61.8% claimed (n 256) — until
   `apps/web/lib/calibration/compute.ts:74-88` refutes the framing outright:
   `confidence/100` is deliberately **not** a win probability for spread/total, which
   are priced to ~50% by construction. The comparison was a category error.
4. `[M]` The claim that survives is discrimination: v5.2.7 SPREAD bands run 48.9 /
   40.0 / 52.2 / 38.1 percent — the top band is the worst. But at n 21 the gap to the
   rest is −0.84 SE, **not statistically significant**. Observed, not established.
5. `[M]` And the UI is already honest: `pick-card.tsx:547-556` renders uncalibrated
   confidence as `"72/100"` with aria-label "out of 100", never `"72%"`. An earlier
   audit closed exactly this.

**Verdict:** not a launch blocker. Route to the next calibration proposal
(founder-gated; the engine is frozen under MODEL_VERSION). Re-measure when v5.2.7
SPREAD passes n 100 in the ≥80 band.

**`PUBLIC_PICKS_ENABLED` "launch blocking"** — an audit lens reported that unset it
503s every paid surface. `[M]` True of the code, but production reads
`canExposePublicPicks: true`. Severity refuted by measurement.

**`/api/v1/probabilities` publishes `pModel = confidence/100`** `[M]` — confirmed in
code at `route.ts:88-91`, and wrong for SPREAD/TOTAL by the repo's own semantics
above. But the route 401s without a B2B key, is rate-limited, and ships
`claimPosture: "experimental_research_grade_not_verified_roi"`. Real, small,
agent-fixable; not launch-blocking. Queued.

---

## 7. Shipped this session

All on `claude/sports-launch-round2-fixes-hk7kv9`, all with typecheck 0, lint 0,
guardrails 26/26, and a negative control proving each test discriminates.

| SHA | What |
|---|---|
| `236f14e40` | C-117 — board collapse keyed on `pickType`, not the redacted `market` label. The previous key merged a game's SPREAD and TOTAL for FREE viewers while PRO kept both, breaking the tier-invariant count contract. Plus the alias filter on all three fallback queries and `take` 100 → 500. |
| `e8b394a68` | C-131 — settle-backfill writes that neither succeeded nor refused are now counted (`writeNotApplied` / `WRITE_NOT_APPLIED`) instead of vanishing from every count; `KICKOFF_MOVED` no longer reports an age measured against a kickoff it just proved is gone. |
| `be5c30506` | Ledger: C-117 closed, C-131 added, and C-130's superseded dedupe-key claim corrected in place rather than left standing. |
| `26ae9d905` | C-132 — the scorer no longer fabricates a `-110` price when no book quoted the chosen side. `[M]` Measured 0 affected rows across 2,268,217 spread and 2,316,785 total rows in production, so it is a no-op on today's feed and cannot regress the board. |

`[M]` All 52 review threads on PR #717 are replied to and resolved.

---

## 8. The order I would go in

1. **Merge #717 to `main`.** Founder-authorised. This deploys C-113 and 39 other
   commits. Nothing else on this list matters as much.
2. **Rotate the R-1 credentials.** Console only, highest severity, unrelated to code.
3. **Root-cause C-115.** The only defect that may still be producing bad rows.
4. **Then** the owner-run data cleanups (C-114, C-125, C-118) — bounded historical
   populations, safe to do after the deploy.
5. **Then** WP-27 / C-104, the free two-book odds board. `[M]` `freeSpine.oddsPath`
   reports all 7 sport cells single-cleared via the metered paid key, and
   `oddsInserting.dualPath.credits` shows `paceOk: false` with projected exhaustion
   2026-09-16. Not blocking today; it is the thing that makes the board cheap and
   durable.
6. PROVEN, when ECE earns it. Not before.
