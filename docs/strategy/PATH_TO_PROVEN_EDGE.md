# Path to Proven Edge

> Replaces the "path to 70%" framing. The target was wrong, not the ambition.
> This points the engine work at a summit that actually exists — and a more
> defensible one than any win-rate headline. Part I is the strategic charter
> (the *why*); Part II is the operational research charter (the *how*), the source
> of truth for the `research/proven-edge` workstream.

---

# Part I — The strategic charter

## The core correction

A sustained **70% win rate against the spread does not exist** — not for us, not for
anyone, no matter how much we research. The closing line is the most accurate public
prediction on Earth for a game, because it is the *aggregated* output of every sharp
bettor, syndicate, model, and the books' own quants, all pushing money until the price
balances at ~50/50 by design. Out-researching a standard NFL spread means out-researching
the entire planet's betting intelligence *already priced into the number.* The best
professional operations alive live at **53–55% ATS**. 57% sustained is legendary. 70% is
a mirage, and chasing it burns the very months we could spend winning.

**Win rate is a tout's metric** — it sounds impressive and means almost nothing. We do not
chase it.

## The real north star: Closing Line Value (CLV)

The metric the smartest operations chase — and the one the **books themselves** use to
decide who to limit — is CLV: did we get a better number than the line closed at? Beat the
close consistently and we are, provably, ahead of the market; the wins follow whether or
not any single bet hits. CLV is **measurable now**, **leading not lagging**, and
**unfakeable** — a tout can cherry-pick a win streak; nobody can fake a sustained CLV beat.
ROI / EV is the bottom line; CLV is the leading indicator that predicts it.

## Where edge actually lives

Not in the mainstream NFL spread — that market is dead-efficient. Real, capturable edge
concentrates where the world's money *isn't* watching closely: smaller / less-covered
markets, player props before they sharpen, live / in-game spots, slow-moving / stale lines,
and specific narrow model edges proven out-of-sample. The engine's job is to **hunt these
gaps**, measured by CLV and EV — not to "pick more winners" on markets where winning more
is structurally impossible.

## The honest "70%" that IS real — keep it

We can build an engine that says *"on this specific pick, we are truly, calibratedly 70%
confident"* and be right 70% of the time on those picks. The catch: high-confidence spots
are usually priced fairly, so 70% confidence ≠ free money. The edge is the rare spot where
our honest 70% meets a market price implying 65%. **That gap is the whole game.** Calibrated
high-confidence picks are a *feature of edge*, never a win-rate headline.

## The claim we stake the brand on

> Not *"we hit 70%."* Instead: **"We prove, in the open, that we beat the closing line — and
> we find edge in the markets the giants ignore."**

First-of-its-kind, defensible, *true*, and unfakeable. The most intelligent engine of 2026,
pointed at the peak that exists.

---

# Part II — The operational research charter

**Status:** Living charter for the `research/proven-edge` workstream. **Last updated:** 2026-06-22.

> Launch ships product; this charter proves the engine has a real, measurable edge.
> Conclusions here must survive out-of-sample testing before they influence any public claim.

## 1. The thesis: prove edge, don't chase a win rate

**The target is proven edge — CLV and EV — NOT a 70% win rate.**

- **Win rate is mostly variance over any honest sample.** A 55% ATS bettor and a break-even
  one are statistically indistinguishable across a few hundred picks.
- **Beating the closing line is the cleanest public evidence of edge there is.** A model that
  consistently lands on the right side of the *close* — before the number moves — is finding
  information the market hadn't priced yet. CLV predicts long-run profitability far earlier
  than a win/loss record.
- **EV is what CLV is a proxy for.** Positive CLV at scale ≈ positive EV. We grade on the
  leading indicator (CLV) and reconcile against realized results (ROI, Brier) as the sample grows.

**The moat:** the field markets accuracy; nobody ships an auditable, calibrated, per-pick CLV
track record. Show the evidence *and* the counter-case → freeze the claim *before* the result
→ publish calibration *once the sample is honest*. Sell decision quality with a receipt.

## 2. North-star metric

**Primary:** mean CLV and beat-close rate over canonical, settled picks, segmented by market
(spread/total in points, moneyline in probability — never averaged across units).
**Guardrail (Phase 1 focus):** **CLV coverage** — the share of settled, played picks that
actually received a CLV record at close. The beat-close rate is only trustworthy at ~100%
coverage; below that it is a survivorship-biased subsample and must not be published.
**Reconciliation:** ROI and Brier calibration over the same settled sample.

## 3. Current state (honest inventory)

The CLV grading pipeline exists end-to-end and is wired:

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

**The gap Phase 1 closes:** every surface above only looked at picks that *received* a CLV
grade; nothing measured the picks that settled *without* one. An unmeasured coverage hole
biases the north-star upward.

## 4. Phase roadmap

**Phase 1 — CLV as a measured invariant (in progress).** Make "every pick gets a CLV record
at close" auditable. `apps/web/lib/performance/clv-coverage.ts` computes coverage rate, health
band, `invariantHolds`, and remediation; surfaced on the admin CLV dashboard. **Next:** nightly
coverage probe + forward (pre-close) odds capture. **DoD:** the operator sees what fraction of
settled picks were CLV-graded and why the rest weren't; the public beat-close rate is believed
only once coverage is healthy.

**Phase 2 — Map market inefficiency.** Segment CLV by sport, market, line-movement direction,
day-of-week, book, time-to-kickoff. Quantify opening→closing drift vs. our lock, devig'd true
probability vs. our model probability, realized cover rate conditioned on CLV sign. Build on the
existing devig/odds primitives; never redistribute raw live odds (key-gated, legally reviewed).

**Phase 3 — Out-of-sample validation.** Strict temporal train/test splits; report OOS CLV and
ROI separately. Champion/challenger: a candidate model is promoted only if it beats the incumbent
on OOS CLV past a sample floor. Publish calibration (reliability curve + Brier) once the sample clears.

**Phase 4 — Continuous self-learning.** Recalibrate display probabilities from realized outcomes
(isotonic/Platt), gated by calibration health. Drift monitoring on inputs and on CLV itself; alert
and fall back rather than silently degrade.

## 5. Measurement discipline (non-negotiable)

1. **Out-of-sample or it didn't happen.** Every edge claim reports the OOS number.
2. **Coverage gates credibility.** A beat-close rate over <100% coverage is labeled partial, never the north-star.
3. **Freeze before result.** The lock line/price is captured at pick creation, never overwritten.
4. **No fabricated data.** Coverage/CLV/ROI/calibration are counted from persisted picks and real closing lines.
5. **Units stay separate.** Points CLV and probability CLV are never averaged together.
6. **Negative results are published.** If the edge isn't there, the dashboards say so.

## 6. Integrity guardrails inherited from the platform

- Banned-phrase scanning is the single source of truth — import `scanForBannedPhrases` from
  `@/lib/trust-claims`; never re-implement the list. (The Public Claim Compiler composes it.)
- Public performance/CLV claims stay behind the readiness + sample-floor gates.
- No source is ever unlocked; no scraping evasion is introduced.
- Owner-gated actions (publish, price, bet) stay owner-gated.
- "Passes the scanner" ≠ "safe" — a human reviews any public-facing copy.

## 7. Working agreement

Each cycle: analyze state → pick the highest-leverage unblocked item → implement with real,
tested code → typecheck + relevant tests + lint → fix failures → commit → document here. The §3
table and §4 roadmap are kept current so the next session picks up without re-deriving context.
