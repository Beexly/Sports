# Path to Proven Edge — Research Charter

**Status:** Living charter for the `research/proven-edge` workstream.
**Owner:** Prediction-engine research.
**Last updated:** 2026-06-22.

> This charter is the source of truth for the proven-edge research program. It is
> deliberately separate from the launch branch: launch ships product; this branch
> proves the engine has a real, measurable edge. Conclusions here must survive
> out-of-sample testing before they influence any public claim.

---

## 1. The thesis: prove edge, don't chase a win rate

**The target is proven edge — Closing Line Value (CLV) and expected value (EV) — NOT a 70% win rate.**

A high win rate is the metric the entire competitive field markets, and it is the
wrong one:

- **Win rate is mostly variance over any honest sample.** A 55% ATS bettor and a
  break-even one are statistically indistinguishable across a few hundred picks.
  "70% winners" is either cherry-picked, short-run noise, or a claim about the
  easy side of -110 juice that ignores the vig.
- **Beating the closing line is the cleanest public evidence of edge there is.**
  The closing line is the sharpest consensus estimate the market produces. A model
  that consistently lands on the right side of the *close* — before the number
  moves — is finding information the market hadn't priced yet. CLV predicts
  long-run profitability far earlier and far more reliably than a win/loss record.
- **EV is what CLV is a proxy for.** Positive CLV at scale ≈ positive EV. We grade
  ourselves on the leading indicator (CLV) and reconcile it against realized
  results (ROI, Brier calibration) as the settled sample grows.

**The moat:** the field markets accuracy; nobody ships an auditable, calibrated,
per-pick CLV track record. We will. Show the evidence *and* the counter-case →
freeze the claim *before* the result → publish calibration *once the sample is
honest*. Sell decision quality with a receipt, not confidence.

This is a **long research program**: propose → build → measure out-of-sample →
document. Negative results are first-class outputs; a falsified hypothesis that we
record honestly is worth more than an unverified win.

---

## 2. North-star metric

**Primary:** mean CLV and beat-close rate over canonical, settled picks, segmented
by market (spread/total in points, moneyline in probability — never averaged
across units).

**Guardrail (this charter's Phase 1 focus):** **CLV coverage** — the share of
settled, played picks that actually received a CLV record at close. The beat-close
rate is only trustworthy at ~100% coverage. Below that, the headline is computed
over a survivorship-biased subsample and must not be trusted or published.

**Reconciliation:** ROI and Brier calibration over the same settled sample, to
confirm CLV is translating into realized EV and that confidence scores are honest.

---

## 3. Current state (honest inventory)

The CLV grading pipeline already exists end-to-end and is wired:

| Stage | Where | Status |
|---|---|---|
| Lock line/price at pick creation (immutable) | `packages/ingestion-pipeline/src/process-sport.ts` | ✅ wired |
| Persist timestamped odds history | `Odds` model, `schema.prisma` | ✅ wired |
| Derive closing snapshot at/before kickoff | `packages/prediction-engine/src/clv-capture.ts` | ✅ wired |
| Pure CLV math (spread/total/ML, verdicts) | `packages/prediction-engine/src/clv.ts` | ✅ wired |
| Grade CLV at settlement, persist to `Pick` | `packages/ingestion-pipeline/src/settle-sport.ts` | ✅ wired |
| Public gate (beat-close rate, sample floor) | `apps/web/lib/performance/public-clv-policy.ts` | ✅ wired |
| Admin CLV dashboard | `apps/web/app/admin/clv/page.tsx` | ✅ wired |
| Personal bet tracker (CLV, ROI, Brier) | `apps/web/lib/tracker/clv.ts` | ✅ wired |
| Backtest self-grade vs nflverse closing lines | `apps/web/lib/intelligence/clv-calibration.ts` | ✅ wired (backtest only) |

**The gap Phase 1 closes:** every surface above only ever looked at picks that
*received* a CLV grade. Nothing measured the picks that settled *without* one.
"Every pick gets a CLV record at close" was an aspiration, not a measured
invariant — and an unmeasured coverage hole biases the north-star upward.

---

## 4. Phase roadmap

### Phase 1 — CLV as a measured invariant (this branch, in progress)

Make "every pick gets a CLV record at close" auditable instead of aspirational.

- ✅ `apps/web/lib/performance/clv-coverage.ts` — pure `evaluateClvCoverage()` +
  `loadClvCoverage()`. Computes coverage rate, health band (HEALTHY/DEGRADED/
  CRITICAL/NO_DATA), the `invariantHolds` flag, and remediation.
- ✅ Coverage receipt surfaced on the admin CLV dashboard (risk-flipped palette:
  low coverage renders hot), above the beat-close cards.
- ✅ Unit tests for the coverage math and the DB loader's eligible-set filter.
- **Next within Phase 1:** a nightly coverage probe that alerts when coverage drops
  below the healthy band (a leading indicator of an odds-capture gap at kickoff);
  forward (pre-close) odds capture so late-added games still get a closing snapshot.

**Definition of done for Phase 1:** the operator can see, from real persisted
picks, what fraction of settled picks were CLV-graded and why the rest weren't —
and the public beat-close rate is only believed once coverage is healthy.

### Phase 2 — Map market inefficiency

Where does our number diverge from the close, and is that divergence *predictive*?

- Segment CLV by sport, market, line-movement direction, day-of-week, book, and
  time-to-kickoff. Find the pockets where the engine reliably beats the close.
- Quantify the inefficiency: opening→closing line drift vs. our lock, devig'd true
  probability vs. our model probability, and realized cover rate conditioned on CLV
  sign. This tells us *where* the edge lives, not just *that* it exists.
- Build on the existing devig/odds primitives; do not redistribute raw live odds
  (key-gated, legally reviewed).

### Phase 3 — Out-of-sample validation

No inefficiency is "real" until it survives data it wasn't fit on.

- Strict train/test temporal splits; report out-of-sample CLV and ROI separately.
- Champion/challenger: a candidate model only gets promoted if it beats the
  incumbent on out-of-sample CLV past a sample floor.
- Publish calibration (reliability curve + Brier decomposition) once the settled
  sample clears the floor — the calibration receipt is the headline.

### Phase 4 — Continuous self-learning

- Recalibrate display probabilities from realized outcomes (isotonic/Platt), gated
  by calibration health below the settled-sample floor.
- Drift monitoring (population stability) on inputs and on CLV itself; alert and
  fall back rather than silently degrade.

---

## 5. Measurement discipline (non-negotiable)

1. **Out-of-sample or it didn't happen.** In-sample fit is a hypothesis, not a
   result. Every edge claim reports the out-of-sample number.
2. **Coverage gates credibility.** A beat-close rate computed over <100% coverage
   is labeled partial and never published as the north-star.
3. **Freeze before result.** The lock line/price is captured at pick creation and
   never overwritten. CLV is graded against it after the close.
4. **No fabricated data.** Coverage, CLV, ROI, and calibration are counted from
   persisted picks and real closing lines — never invented, never illustratively
   filled. Modeled/illustrative figures are labeled as such.
5. **Units stay separate.** Spread/total CLV (points) and moneyline CLV
   (probability) are never averaged together.
6. **Negative results are published.** If the edge isn't there, the charter and the
   dashboards say so.

---

## 6. Integrity guardrails inherited from the platform

- Banned-phrase scanning is the single source of truth — import
  `scanForBannedPhrases` from `@/lib/trust-claims`; never re-implement the list.
- Public performance/CLV claims stay behind the readiness + sample-floor gates.
- No source is ever unlocked and no scraping evasion is introduced by this work.
- Owner-gated actions (publish, price, bet) stay owner-gated.
- "Passes the scanner" ≠ "safe" — a human reviews any public-facing copy.

---

## 7. Working agreement

- Each cycle: analyze state → pick the highest-leverage unblocked item → implement
  with real, tested code → typecheck + relevant tests + lint → fix failures →
  commit → document here.
- This document is updated as phases progress; the table in §3 and the roadmap in
  §4 are kept current so the next session can pick up without re-deriving context.
