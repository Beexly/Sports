# Launch verification — 2026-09-08, 11:5x UTC

Every number here was measured today against production or read out of the code on this branch.
Provenance is marked: **[M]** measured by me on production now, **[C]** read from code on this branch.
Nothing in this document is recalled from an earlier session's notes; where it contradicts
`AGENTS.md`, the note there is stale and this is the correction.

---

## 1. The headline: the calibration metrics PASS today, and the gate is not held by them

Measured at 11:38:13 UTC (`generatedAt` from the surface itself), read from
`/api/ops/public-surface-truth` → `calibrationEligibility`: **[M]**

| Floor | Value | Threshold | Verdict |
|---|---|---|---|
| n | 475 | ≥ 100 | **PASS** |
| ECE | **0.0466** | ≤ 0.05 | **PASS** |
| Brier | 0.1898 | ≤ 0.22 | **PASS** |
| Murphy reliability | 0.005 | ≤ 0.05 | **PASS** |

`status` is nonetheless **RED**, and `reasons` contains exactly one entry:

```
"reasons": ["Settlement not healthy"]
```

**This corrects the AGENTS.md note dated 2026-09-06 16:40 UTC**, which recorded ECE 0.0524
failing the 0.05 floor and stated that ECE "does not clear on its own, and nothing that has
happened today moved it." On a sample grown from n 458 to n 475, ECE now measures 0.0466. That
is not a fix anyone shipped; it is the number moving as more rows settled. The 2026-09-06 note
should no longer be read as current.

`consecutiveGreen` is 0 of `streakRequired` 3, `pBasis` is `market_anchored_v2`,
`dateRange` 2026-06-18…2026-09-08.

### The caveat that has NOT gone away

`byModelVersion` still reads, on the same surface: **[M]**

| Model version | n | ECE |
|---|---|---|
| **v5.2.7 (deployed)** | 262 | **0.0947** |
| v5.2.6 | 110 | 0.0587 |
| v5.1.0 | 74 | 0.0729 |
| v5.0.0 | 29 | (n too small) |

The pooled figure (0.0466) sits below every stratum it is built from. `expectedCalibrationError`
stores weighted **absolute** per-bin gaps, so this does not by itself prove that signed errors
cancelled across strata — that is a plausible mechanism, not an observed one, and proving it needs
an aligned per-bin decomposition nobody has run. What is *measured* is that the version actually
serving traffic measures 0.0947 on its own 262 rows, roughly twice the floor, while the pooled
number clears it.

By sport, only MLB has the sample to support a conclusion: MLB n 373 ECE 0.0451 (hit 0.654 against
meanP 0.646, essentially calibrated). NCAAF n 74 ECE 0.1178 and NFL n 28 ECE 0.267 are too thin to
steer by — at n 28 across ten bins that is roughly three picks per bin, so both magnitude and sign
are noise.

**This is a founder judgement, not an engineering one.** Publishing a PROVEN claim off the pooled
number while the deployed version measures twice the floor on its own rows is precisely the kind of
thing this product's premise forbids. Nobody should touch a threshold or the engine to move it:
the engine is frozen under MODEL_VERSION and weakening a floor is forbidden outright.

---

## 2. Why the streak never starts — a structural conflict, found today

This is the real reason `consecutiveGreen` has sat at 0, and it is not about calibration at all.

Three constants, read from the code: **[C]**

| Constant | Value | File |
|---|---|---|
| Settlement grace | **6 hours** | `apps/web/lib/performance/settlement-health.ts:58` |
| `health = "HEALTHY"` requires | **`overduePending === 0`** | `settlement-health.ts:86` |
| Zero-sit void floor | **24 hours** | `apps/web/lib/settlement/zero-sit-lane.ts:104` |

Put together:

1. A published pick becomes **overdue** 6 h after kickoff if it is still PENDING.
2. Settlement is **HEALTHY only when that count is exactly zero** — one pick is enough for DEGRADED.
3. DEGRADED pushes `"Settlement not healthy"` into the eligibility reasons
   (`apps/web/lib/ops/calibration-eligibility.ts:106`), forcing RED and resetting the streak.
4. The zero-sit lane, which is what finally clears an ungradeable pick, **deliberately will not act
   until 24 h past kickoff**.

**So a single ungradeable pick forces calibration eligibility RED for up to 18 continuous hours,
by design.** The eligibility cron runs `40 */6 * * *` (00:40 / 06:40 / 12:40 / 18:40 UTC,
`apps/web/vercel.json:82`), and the streak needs **3 consecutive GREEN runs** — a minimum of 12
hours with zero overdue picks at three specific instants.

With MLB alone showing 35 games in the current 72 h window, the binding constraint on PROVEN is
not the calibration math. It is that the health condition is a moving target with an 18-hour
failure shadow, sampled every 6 hours, requiring three clean samples in a row.

I have deliberately **not** changed any of these three constants. Loosening the health threshold
or shortening the void floor would make the gate pass without making anything more true, and the
guard rules forbid it. The tension is real and worth a founder decision; it is not mine to resolve.

### Current state of the blocker **[M]**

- `settlement.overduePending` = **2** of 2694 commenced; `operatorMessage` "2 of 2694 commenced
  picks overdue past grace (DEGRADED)".
- `stalePendingPicks.count` = **0** — the zero-sit stale half is working.
- `schedulerLiveness` = **healthy**, last cron success 8 minutes before the read.

On 2026-09-06 at 19:08 UTC the same field read 0 of 2627. It is now 2 of 2694 — 67 more picks
commenced and 2 are inside the 6-to-24-hour window. That pattern is ordinary churn, not a stuck
cohort: these two should void on their own once 24 h past kickoff. It also demonstrates the
problem above — the count returns to nonzero routinely.

---

## 3. NFL Week 1 will be thin, and the system says why

Kickoff is **2026-09-10T00:20Z**, about 37 hours from this measurement.

`marketCoverage` over the next 72 h: **[M]**

| Sport | Games | MONEYLINE | SPREAD | TOTAL |
|---|---|---|---|---|
| **NFL** | **6** | **0 — none** | **2 — covered** | **0 — none** |
| NCAAF | 1 | 0 — none | 1 | 1 |
| MLB | 35 | 26 | 15 | 15 |
| MLS | 16 | 4 | 12 | 13 |

The surface names its own cause for the NFL TOTAL gap, verbatim:

> "the zero-key signal slate is moneyline-only and ESPN's single-bookmaker odds fail
> MIN_BOOKMAKERS=2, so totals need a live odds feed (THE_ODDS_API_KEY or TheRundown). Check
> refresh-odds provider status; the board is degraded, not broken."

The Odds API key **is** present and working — `oddsInserting` shows 450 rows inserted 34 minutes
before the read, `THE_ODDS_API_KEY` matched, 13,481 credits remaining. So the NFL gap is not a
dead key. `freeSpine.oddsPath` reports "Odds free dual-path ABSENT: 7 sport cell(s) single-cleared
via the-odds-api (mustSpend)", i.e. single-source coverage that `MIN_BOOKMAKERS = 2`
(`packages/data-ingestion/src/odds-event-merge.ts:16`) will not price. **[M][C]**

**State it plainly: on NFL opening week, a visitor lands on 2 spread picks across 6 games, no
moneylines and no totals.** That is a product decision, not a defect — the board refuses to price
what it cannot source two books for, which is the correct behaviour. But it should be a conscious
choice to launch a sports-picks product into Week 1 in that state.

Credit pace note: `dailyBudget` 600, `paceOk` **false**, projected exhaustion 2026-10-01. Not a
launch blocker — three weeks of headroom — but the governor is running over budget. **[M]**

---

## 4. C-224 cannot reach a customer today — verified, not assumed

Four surfaces still compute a Brier score against confidence rather than a probability:
`components/observatory/scoring-reliability-panel.tsx:60`, `app/board/page.tsx:278`,
`app/fable/proof-dashboard.tsx:65`, `app/glass-ledger/page.tsx:513` and `:607`. **[C]**

All four read through `loadPublicCalibrationReport` (`apps/web/lib/calibration/report.ts:16`),
which returns early when the gate is closed: **[C]**

```ts
const effective = await resolveEffectivePerformanceGate();
if (!effective.canExposePerformanceStats) {
  const report = computeCalibration([]);   // empty sample → no Brier to print
  return { data: { ...report, ... }, meta: { gated: true, isSampleData: false } };
}
```

The comment above it states the rule: *"Public numbers only when published ∩ GREEN (effective
gate). Env PERFORMANCE_STATS alone is not enough."* Production confirms both conditions are
closed: `gates.canExposePerformanceStats` **false**, `gates.statsPublic` **false**,
`gates.calibrationPublished` **false**, and `calibrationPublish.publishedEffective` **false**. **[M]**

**Conclusion: C-224 is latent, exactly as C-176 was.** It does not block shipping the code. It
**does** block opening the performance gate — the moment that gate opens, four surfaces publish a
Brier computed against a number this repo asserts everywhere else is not a probability.

---

## 5. What the confidence score actually measures

From `provenPath.scoreBakeoff` on production, worth recording because it bears on any claim made
about confidence: **[M]**

| Score | n | Brier | ECE | Separation |
|---|---|---|---|---|
| confidence | 1823 | 0.2620 | 0.1029 | **0.0147** |
| independent_trueProb | 1132 | 0.2475 | 0.0838 | 0.0505 |
| blend_indep_conf | 1132 | 0.2474 | 0.0902 | 0.0330 |
| **marketFairProb** | 1039 | 0.2337 | **0.0280** | **0.0673** |

And by market, MONEYLINE confidence separation reads **−0.0018** — very slightly negative.

The calibration gate reads `market_anchored_v2`, not confidence, so none of this affects the gate.
It does mean any customer-facing statement that the confidence number discriminates outcomes is
unsupported by the measurement. The engine's own bake-off says the market-fair probability is the
score with signal.

---

## 6. Go / no-go

Three separate decisions. They do not have the same answer.

### (a) Ship the code on `claude/sports-launch-round2-fixes-hk7kv9` — **GO**

CI green on `d7f17af84`: every GitHub Actions check success, combined status success across
CodeRabbit, Vercel and Devin Review. Locally on this branch: typecheck 0, lint 0, `npm test` real
exit 0, guardrails 26/26, ledger guard green at 325 rows. Nothing in the diff flips a gate, touches
a frozen path, or changes pricing, schema or auth policy.

### (b) Open the public performance / PROVEN gates — **NO-GO today**

Three independent reasons, any one sufficient:
1. `consecutiveGreen` is 0 of 3. Even with everything else perfect the earliest possible publish
   receipt is three eligibility runs away — 12:40, 18:40, then 00:40 UTC on 2026-09-09 — and only
   if settlement reads healthy at all three.
2. Settlement is DEGRADED right now, and section 2 shows the health condition has an 18-hour
   failure shadow that recurs with ordinary MLB churn.
3. C-224 is still open. Opening the gate publishes four Brier scores computed against confidence.
4. Separately: the deployed v5.2.7 measures ECE 0.0947 on its own 262 rows against a 0.05 floor.

### (c) Serve NFL Week 1 picks — **GO, degraded, and say so**

The board will carry 2 spread picks across 6 NFL games, no moneylines, no totals, because
`MIN_BOOKMAKERS = 2` refuses single-source pricing. That is the honest behaviour and it should not
be changed to fill the board. If Week 1 breadth matters commercially, the lever is a cleared second
book (the Galaxy/Kalshi path already designed as WP-27 / ledger C-104), not a loosened floor.

---

## 7. What I did not touch, and why

- **No gate, flag or threshold was changed.** Not the 6-hour grace, not `overduePending === 0`, not
  the 24-hour void floor, not `MIN_BOOKMAKERS`, not a calibration floor. Several of these would
  have turned a red light green today without making anything more true.
- **No database write, no cron run with a secret.** The `settlement-rca` surface returned 401 and I
  stopped there rather than looking for a credential.
- **The 2 overdue picks were not force-cleared.** They are inside the 6-to-24-hour window and the
  zero-sit lane owns them.
