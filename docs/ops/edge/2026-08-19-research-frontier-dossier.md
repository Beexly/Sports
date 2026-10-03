# Frontier Research Dossier — 2026-08-19 night

**For:** the founder. Unemployed, bleeding funds, one live candidate number (MLB totals decided-only beat-close, 176/301 = 58.5%) standing between "we have an edge" and "we have a market echo dressed as a product." This dossier exists to decide where engineering hours go next, and to say plainly where they should *not* go.

**Provenance:** six literature-survey threads (anytime-valid inference / e-processes; calibration and resolution; forecast aggregation/pooling theory; sports-market efficiency; independent-model candidates for MLB totals; the staking/decision layer), a citation audit (90 citations checked across the surveys, 0 fabricated or unverifiable, 0 doctrine violations, 3 precision-only flags), and a second doctrine audit specifically on the 17 resulting engineering proposals (38 citations re-checked against the repo and against the primary sources, 0 fabricated, 0 doctrine violations, 4 proposals flagged for overstated framing, a missing gate, redundancy, or a stale citation — not for being wrong). Every number and file anchor below was checked against the repo or recomputed independently by the audits; where the audit corrected a claim, the correction is shown, not the original.

---

## 1. Executive summary

**The three moves that most raise resolution or provable CLV per unit engineering-hour:**

1. **Grade TOTAL/SPREAD CLV in price space, not points-only (the Bickel–Kim fix).** Days of effort. The platform's one cited live signal — MLB totals beat-close 58.5% — is currently computed on point-line movement alone, with the actual over/under juice sitting unused in columns the schema already has. The literature this number is implicitly claiming to beat (Bickel & Kim 2014) explicitly shows MLB totals conclusions flip once real juice replaces an assumed price. Until this is fixed, 58.5% is not evidence of anything, for or against. This has to happen before any of the rest of this dossier is worth funding.
2. **Grouping-loss lower bound as a go/no-go gate (days), before either independent-model build (week+).** The platform's central measured fact is REL ≈ 0 (ECE 0.0044, calibration solved) with RES ≈ 0 (0.0017 suppression-curve spread) — perfectly calibrated climatology wearing a confidence score. The open question the whole roadmap turns on is whether that's because the market is efficient with respect to the features we have (stop, redirect to new data) or because the pipeline is collapsing real signal into one flat number (build). A day of diagnostic work answers this before a week-plus model build does.
3. **Independent MLB totals model on the overdispersed (negative-binomial) run distribution, not soccer-shaped Poisson.** Week-plus. Of everything surveyed across six threads, this is the only proposal that *creates* resolution rather than measuring, preserving, or shrinking it — because it conditions on real game-to-game variation (park, weather, pitcher rest) that a single collapsed confidence score structurally cannot carry. It targets the one market segment where the platform has anything resembling a live signal.

**Why this ordering, not "build the model first":** the founder is not choosing between good ideas — every one of the 17 proposals below survived two independent audits with zero fabricated citations and zero doctrine violations, which is an unusually clean bill of health for a literature-to-engineering pipeline. The constraint is runway, not idea quality. The literature is consistent across every thread that measurement and post-hoc transforms of a market-echo score (Venn-Abers, CORP, isotonic recalibration, Kelly shrinkage, e-process tuning) can only ever *preserve* or *report* resolution — never manufacture it. Only methods that inject new conditioning information (multicalibration, isotonic distributional regression, a genuinely independent totals model, decorrelation-from-market objectives) can move RES off zero. Spending a week building one of those before fixing the two cheap measurement bugs that could invalidate the only number that currently justifies the effort is the way this platform burns its remaining runway on a number that was never real.

**Standing prerequisite this dossier does not itself resolve:** C-15 (59 of 140 ML lock prices are model-derived pseudo-odds below -1000, e.g. -21200 implying p=0.995). Every CLV-adjacent claim in this document — the 58.5% totals figure, any e-process certification run, any "beats the close" claim — is uninterpretable until that provenance audit lands. It is not one of the 17 ranked proposals here because it is already tracked outside this literature pass, but it gates nearly everything below and should be treated as sitting at rank 0.

---

## 2. The resolution problem, restated

**Measured state (verified this session):** baseline Brier 0.2815 → isotonic-calibrated holdout Brier 0.2556; UNC (base-rate variance) pinned at 0.2499 (base rate 50.9%); post-sweep ECE 0.0044. Calibration is solved. But holdout Brier (0.2556) sits *above* UNC (0.2499), which under an exact decomposition (Brier = MCB − DSC + UNC) implies DSC − MCB ≈ −0.0057: negative net skill versus the base rate. The suppression curve — how much the model's output actually varies game to game — has a spread of 0.0017. `Pick.confidence` is substantially a market-structure echo (`scoring.ts:486-494, 844-851`); no independent ATS/totals model exists (`scoring.ts:551-552`); the independent `trueProb` stream was attenuated ×0.484 and re-anchored 45% to market (`live-calibration-p.ts`). This is not a calibration problem. It is an information problem.

**What the literature says actually creates resolution, versus what only measures or preserves it:**

- **Creates resolution** (conditions on new information the score didn't have): Isotonic Distributional Regression (Henzi, Ziegel & Gneiting 2019, arXiv:1909.03725) — a calibrated conditional CDF under a partial order on covariates, exactly as informative as the covariates it's given. Multicalibration-as-boosting (Hébert-Johnson et al. 2018, arXiv:1711.08513; Globus-Harris et al. 2023, arXiv:2301.13767) — each patched subgroup violation strictly reduces squared error, and it comes with a checkable certificate of exhaustion. A genuinely overdispersed run-scoring model for baseball (Rosner, Mosteller & Youtz 1996) plus real game-to-game covariates — park factor, temperature, starter rest — because those covariates vary by tens of percent game to game where a market-echo score varies by 0.17%. Decorrelation-from-market as an explicit training objective (Hubáček, Šourek & Železný 2019, IJF 35(2):783-796; Hubáček & Šír 2020, arXiv:2010.12508) — profit and resolution both come from the component of a forecast orthogonal to the market price, not from raw accuracy.
- **Measures resolution honestly, creates none:** CORP/PAV-based Brier decomposition (Dimitriadis, Gneiting & Jordan 2021, arXiv:2008.03033; Gneiting & Resin 2023, arXiv:2108.03210) — exact, CI-bearing, but a thermometer, not a lever. Grouping-loss estimation (Perez-Lebel, Le Morvan & Varoquaux 2023, arXiv:2210.16315) — tells you *how much* recoverable resolution exists and roughly where, before you build anything; a lower bound, not a fix.
- **Preserves validity, cannot create resolution — provably, by construction:** Venn-Abers / IVAP (Vovk & Petej 2012, arXiv:1211.0025; Vovk, Petej & Fedorova 2015, arXiv:1511.00213) is a score-only isotonic transform: ranking is invariant, so CORP-DSC is invariant. Any member of the calibration-only family (temperature scaling, Platt, beta calibration, plain isotonic) is in the same boat. The governing theorem here is Gneiting, Balabdaoui & Raftery (2007): forecast quality is sharpness *subject to* calibration, and sharpness is a property of the forecast's information content — it cannot be manufactured by transforming an already-calibrated forecast. This is also the formal argument for deleting (not tuning) the ad hoc ×1.12 stretch in `blendIndependentHomeFair`: stretching a calibrated blend without new conditioning information is negative-EV under every proper scoring rule, for every value of the constant.
- **A distinct, adjacent question — anytime-valid *certification*, not resolution creation:** the e-process infrastructure (`forecast-skill-eprocess.ts`) tests whether a *given* edge, once it exists, clears 52.4% CLV break-even without p-hacking the stopping time. Safe Testing (Grünwald, de Heide & Koolen, arXiv:1906.07801) and the GROW framework (Ramdas, Grünwald, Vovk & Shafer, arXiv:2210.01948) are the right tools for that job, but no cleverness in that layer creates an edge that isn't there — it only avoids silently failing to certify an edge that *is* there.

**The honest synthesis:** the platform doesn't have a calibration problem, a staking problem, or (primarily) a statistical-testing problem. It has an information problem. Everything in the decision layer and the anytime-valid-testing layer is worth doing, but it is worth doing *to consume* resolution once it exists, or *to avoid destroying* a fragile edge before it's proven — not to create the edge itself.

---

## 3. Proposal table, ranked

17 proposals survived both audits with no fabricated citations and no doctrine violations. Ranking below reflects combined judgment on (a) whether it protects the platform from acting on a false signal, (b) cost of information relative to effort, (c) whether it actually creates resolution versus measures/consumes it, (d) dependency order. Four carry audit flags (⚠) — kept, not dropped, per audit findings — with the flag detailed in the write-up.

| Rank | ID | Proposal | Effort | Creates RES? | Notes |
|---|---|---|---|---|---|
| 1 | P-A | Grade TOTAL/SPREAD CLV in price space (Bickel–Kim fix) | days | no — measurement | Could invalidate the flagship 58.5% number either direction |
| 2 | P-B | CORP isotonic Brier decomposition with bootstrap CIs | hours | no — measurement | Foundation every other diagnostic depends on |
| 3 | P-C | Delete the unfit ×1.12 sharpness stretch | hours | no — harm-stop | Theory-mandated deletion, not a tuning exercise |
| 4 | P-D | Grouping-loss lower bound (go/no-go gate) | days | no — diagnostic | Decides whether P-H/P-K are worth building at all |
| 5 | P-E | Independent MLB totals model (negative binomial) | week+ | **yes** | The literature's actual resolution-creation candidate |
| 6 | P-F ⚠ | CLV certification e-process: 4-point grid mixture | days | no — robustness | Audit corrected the urgency/cost claims (below) |
| 7 | P-G | Fitted logit-space pooling (Satopää E-mean) | days | partial | Principled successor to P-C; supersedes P-Q |
| 8 | P-H | Isotonic Distributional Regression totals model | week+ | **yes** | Gate on P-D; may overlap/compete with P-E |
| 9 | P-I ⚠ | Recenter selective-publish abstention band (Chow's rule) | days | no — decision quality | Cited paper has a relevant corrigendum (below) |
| 10 | P-J | Wire Shin-devig into Kelly staking, center on devigged close | days | no — decision quality | Correct consumer of RES once it exists |
| 11 | P-K | Multicalibration audit (boosting loop) | week+ | **yes, conditionally** | Hard-gated on P-D returning positive |
| 12 | P-L | Weather / park-factor covariates for totals model | week+ | yes, second-order | Depends on P-E; rights-gated for live umpire/lineup data |
| 13 | P-M ⚠ | Venn-Abers (IVAP) interval wrapper for Kelly gating | days | no — risk control | Skips its source module's own founder-gate (below) |
| 14 | P-N | Upgrade anytime-ledger to WSR predictable plug-in | hours | no — power only | Second-order; validity never depended on this |
| 15 | P-O | Anytime-valid Brier-differential CS for public Edge Index | days | no — reporting | Low urgency until P-E/P-H produce something to report |
| 16 | P-P | Flag / jointly size same-game correlated picks | days | no — risk/honesty | Independent of the RES question; ship the flag cheaply |
| 17 | P-Q ⚠ | Variance-based shrinkage on blendIndependentHomeFair | days | no | Audit flags as redundant with P-G — deprioritize |

---

## 4. Full proposal writeups

### P-A. Grade TOTAL/SPREAD CLV in price space, not points-only — the Bickel–Kim fix
**Effort:** days · **Rank:** 1

**Anchors:** `packages/prediction-engine/src/clv-capture.ts:38`, `:90`, `:201`; `packages/prediction-engine/src/clv.ts:98`; `packages/db/prisma/schema.prisma:409`, `:544`; `packages/ingestion-pipeline/src/process-sport.ts:792`

**Method:** grade TOTAL/SPREAD CLV as a probability/EV delta using the actual over/under and spread juice already present in the ingested `Odds` rows (`overPrice`/`underPrice`/`homeSpreadPrice`/`awaySpreadPrice`, `schema.prisma:422-423`), the same way `computeMoneylineClv` already does — instead of a pure point-line differential that silently assumes constant vig.

**Papers:** Bickel & Kim (2014), *Re-examining the efficiency of the Major League Baseball over-under betting market*, Applied Financial Economics 24(18):1229-1234, 10.1080/09603107.2014.925052 · Brown & Abraham (2002), *Testing Market Efficiency in the MLB Over-Under Betting Market*, Journal of Sports Economics 3(4), 10.1177/152700250200300401.

**Change:** add lock-side price columns for non-ML picks (`clvLockOverPrice`/`clvLockUnderPrice`, `clvLockHomeSpreadPrice`/`clvLockAwaySpreadPrice` — a new capability, not a bugfix; the schema comment at `Pick.clvLockPrice:545` is deliberately moneyline-only today). Populate at publish time in `process-sport.ts` alongside the existing `clvLockLine` capture — the picked-side price is already in the odds rows, no new ingestion. Extend `ClosingOddsRow` (`clv-capture.ts:38-45`) and `deriveClosingSnapshotFromOdds` (`:90-144`) to carry and average these prices the way `mlHome`/`mlAway` already are. Extend `computeTotalClv`/`computeSpreadClv` (`clv.ts:80-105`) to return a probability-space CLV value, falling back to the existing points-only value when a price is missing so history degrades gracefully rather than breaking.

**Expected effect:** this is a measurement-validity fix, not a resolution generator. Bickel & Kim's headline finding is that MLB totals conclusions *flip* once real juice replaces an assumed price — so the direction this moves the 176/301 = 58.5% figure is genuinely unknown, and could land on either side of the 52.4% break-even the certification track uses. That is the point of running it, not a reason to skip it.

**Experiment / kill:** PILOT only, per the roadmap's own rule that already-settled rows never feed the e-process. Recompute CLV for all 301 decided totals picks under both metrics side by side and report both. Prospectively: preregister the price-space metric before the next totals/spread pick settles; from that timestamp on, only price-space CLV feeds `settle-sport.ts`'s `clvVerdict` and `forecast-skill-eprocess.ts`'s `m_t`. No new kill criterion — it's a correctness fix — but any claim already made from the points-only number is provisional until recomputed.

**Risks:** pre-migration rows never get a lock-side price and must stay points-only forever (not fabricated) — needs an explicit `methodTag` so mixed-metric history is never silently averaged. Real risk that the corrected number kills the platform's one live candidate edge; under the platform's own "no gate flips, honest reporting" doctrine, that is a required outcome to accept, not a result to route around.

---

### P-B. CORP isotonic Brier decomposition with bootstrap CIs (DSC/MCB/UNC, R*)
**Effort:** hours · **Rank:** 2

**Anchors:** `apps/web/lib/calibration/isotonic-pava.ts:39`; `apps/web/lib/calibration/murphy-res-definition.ts:1`; `apps/web/lib/calibration/resolution-by-group.ts:1`; `apps/web/lib/calibration/stationary-bootstrap.ts:61`

**Method:** isotonic (PAV) recalibration-based Brier decomposition — exact, optimally binned, with resampling CIs on each component; `R* = (DSC − MCB) / UNC` as a single skill KPI.

**Papers:** Dimitriadis, Gneiting & Jordan (2021), arXiv:2008.03033 (PNAS 118) · Gneiting & Resin (2023), arXiv:2108.03210 (EJS).

**Change:** new module `apps/web/lib/calibration/corp-decomposition.ts` built directly on the already-fixed `pava()` (`isotonic-pava.ts:39-85`). For a holdout sample: PAVA-recalibrate, compute `DSC` (mass-weighted squared deviation of the recalibrated curve from ȳ), `MCB = holdoutBrier − UNC − DSC` (non-negative by construction), `R* = (DSC−MCB)/UNC`. Wrap with `stationaryBootstrapIndices`/`bootstrapBrierCi` (`stationary-bootstrap.ts:8-79`, reused directly) for 95% CIs. Run on (a) `Pick.confidence`, (b) market fair probability, (c) each available independent source.

**Expected effect:** the load-bearing measurement every resolution-creation proposal in this dossier depends on. The current binned-Murphy numbers (holdout Brier 0.2556 > UNC 0.2499) are internally consistent with negative skill but binned Murphy can't say whether that's real or a binning artifact — CORP's components are exact and CI-bearing. A CI on `Pick.confidence`'s DSC−MCB sitting entirely ≤0 while market DSC is significantly positive is measurement-grade confirmation of the market-echo diagnosis.

**Experiment / kill:** runs on the existing holdout split already used for the 0.2556/0.2499 figures — no new data. Preregistered rule: if the 95% CI on Pick.confidence's DSC−MCB is entirely ≤0, publish as the honest Rung-0 artifact and do not proceed to P-H/P-K without a new independent source; if the CI straddles or clears 0, that's the signal to invest immediately. Re-run monthly as holdout grows.

**Risks:** small holdout gives wide CIs — always report the CI, never a bare point estimate; never treat "CI includes 0" as proof RES is exactly zero. Compare (a)/(b)/(c) on the identical holdout or the gap is confounded by sample composition.

---

### P-C. Delete the unfit ×1.12 sharpness stretch in `blendIndependentHomeFair` now
**Effort:** hours · **Rank:** 3

**Anchors:** `packages/ingestion-pipeline/src/generate-signal-slate.ts:61`, `:71`

**Method:** calibration-sharpness paradigm — post-hoc widening of an already-calibrated forecast without new conditioning information cannot improve, and typically worsens, proper scores.

**Papers:** Gneiting, Balabdaoui & Raftery (2007), JRSS-B 69(2):243-268.

**Change:** remove the unconditional `if (Math.abs(homeP-0.5)>=0.03){ homeP = 0.5+(homeP-0.5)*1.12; }` block (`generate-signal-slate.ts:71-73`) and ship the plain sharpness-weighted average as the interim signal, until P-G's fitted replacement clears its own out-of-sample bar. This is a **deletion**, not a tuning exercise — grid-searching the constant would just overfit the holdout, and under Gneiting 2007 no value of an unfit linear stretch is honestly EV-positive without added information.

**Expected effect:** small, currently unmeasured — stops a mechanism theory says cannot help, does not itself create resolution. Value: removes a possible source of Brier degradation at near-zero cost while P-G is built, and removes an unjustified magic number from the published-pick path (CLAUDE.md: no fabricated stats).

**Experiment / kill:** preregister a paired before/after comparison on the *next* N signal-slate picks after deploy (not retrospective): compute CORP DSC/Brier (P-B) with vs. without the stretch, matched by game. No kill needed to ship — but if the first 200 post-deploy picks show the old stretched version beating the new one outside noise, write that up rather than silently reverting.

**Risks:** confidence values shift downward for picks previously above the 0.03 dead zone, moving `PREMIUM_CONFIDENCE_THRESHOLD` and `MIN_PUBLISH_CONFIDENCE` tier boundaries — check both constants in the same file before deploy so published-pick volume doesn't silently change.

---

### P-D. Grouping-loss lower bound as the go/no-go gate for P-H/P-K
**Effort:** days · **Rank:** 4

**Anchors:** `apps/web/lib/calibration/segmented-murphy.ts:1`; `apps/web/lib/calibration/resolution-by-group.ts:1`; `packages/prediction-engine/src/scoring.ts:486`

**Method:** grouping-loss estimation — a lower bound on the discrimination hidden inside identical confidence scores, via feature-space partitioning within score levels.

**Papers:** Perez-Lebel, Le Morvan & Varoquaux (2023), *Beyond calibration: estimating the grouping loss of modern neural networks*, arXiv:2210.16315 (ICLR).

**Change:** reuse `segmented-murphy.ts`'s per-slice Brier/REL/RES machinery. Within each populated confidence bucket, partition further on 2-3 prespecified pregame features not already in the score formula (`scoring.ts:486-494`) — candidates: cross-source disagreement magnitude, line-move direction since open, closing-vs-open delta sign. Estimate the partition-based grouping-loss lower bound per bucket.

**Expected effect:** answers the single question that decides whether P-H (IDR) and P-K (multicalibration) — both week-plus builds — are worth funding. A positive bound names the features that separate winners from losers at fixed confidence (mandate to build, with exactly those features). A near-zero bound is evidence the market is already efficient with respect to these features on this slice (mandate to redirect toward new data sources instead of more transforms of the existing score). Diagnostic only — creates no resolution itself.

**Experiment / kill:** run once on current holdout as a PILOT (feeds a build decision, not a performance claim), with the estimator's own bootstrap SE reported alongside every number. Fixed rule: any feature clearing 2× the estimator's bootstrap SE becomes a mandatory covariate in P-K's subgroup list and/or P-H's IDR partial order; features that don't clear it are dropped from both without further tuning.

**Risks:** sample-hungry and partition-dependent per the source paper's own caveat (medium-confidence finding) — treat every number as a build-prioritization lower bound, never publish as a standalone performance or RES claim.

---

### P-E. Independent MLB totals model: negative-binomial run distribution, wired end-to-end
**Effort:** week+ · **Rank:** 5

**Anchors:** `packages/prediction-engine/src/poisson.ts:170`; `packages/prediction-engine/src/team-rates.ts:49`, `:97`; `packages/prediction-engine/src/dixon-coles.ts:12`; `packages/prediction-engine/src/scoring.ts:551`, `:732`; `packages/types/src/index.ts:378`

**Method:** replace the soccer-shaped independent Poisson likelihood currently (implicitly) applied to baseball with an overdispersed (negative-binomial, or per-inning-Poisson-convolved) run-scoring model, used strictly as a market-divergence flag, not a standalone accuracy claim.

**Papers:** Rosner, Mosteller & Youtz (1996), *Modeling Pitcher Performance and the Distribution of Runs per Inning in MLB*, The American Statistician 50(4):352-360, 10.1080/00031305.1996.10473565 · Bickel & Kim (2014) [see P-A] · Hubáček & Šír (2020), arXiv:2010.12508.

**Change:** `team-rates.ts` already whitelists baseball for independent Poisson with no overdispersion correction (`isPoissonValidSport`, `:49`), and `dixon-coles.ts`'s own header (`:12-13`) confirms baseball gets "independent Poisson without tau" — exactly the mis-specified likelihood family the literature flags. `poisson.ts`'s `overUnderProbabilities` (`:170-189`) is fully built and tested but **never called** from `build-independent-fair-values.ts` (confirmed by grep). Build a negative-binomial analog of `overUnderProbabilities`, fit `(r,p)` per team-offense/opponent-defense context from the real `TeamGameLog` runs data `team-rates.ts` already reads. Add `totalFairProb`/`overFairProb` to `IndependentMarketFairValue` (`types/index.ts:378-381`, currently home/away-shaped only) and wire it into `scoring.ts`'s TOTAL branch (`:732-733`, currently hardcoded "no independent total model yet") as a genuine independent input.

**Expected effect:** fills the gap the roadmap names as the reason two-thirds of the pick surface (SPREAD/TOTAL) can't contribute resolution — but corrected to the likelihood family the literature says actually fits baseball. Estimated 1-3 points of mispricing in P(over/under) at fixed expected runs versus a Poisson model in the typical 7.5-9.5 line band, on a market where the current suppression spread is 0.0017. Of everything surveyed, this is the clearest candidate that genuinely *creates* resolution rather than measuring or preserving it — magnitude to be confirmed empirically, not asserted.

**Experiment / kill:** fit `(r,p)` on pre-2025 `TeamGameLog` data, frozen and held out from any live use, before declaration. Preregister a divergence-flag rule (`|NB total prob − market fair prob| ≥ τ`, τ set via P-I's walk-forward procedure, never in-sample). N_max = 300 flagged picks; run both the certification track (`m_t=0.524`) and detection track (`m_t=0.50`). Additional model-class kill: if out-of-sample rank-probability-score of the NB model is not strictly better than the existing (already-built, unwired) plain Poisson `overUnderProbabilities` on the same held-out games, ship that instead — a much smaller change.

**Risks:** the per-inning-convolution route is more faithful to Rosner-Mosteller-Youtz but materially more work than single-shot NB(r,p) per game — scope the first cut to the simpler model, treat convolution as a gated stretch goal. `TeamGameLog` depth at current volume may be thin for context-specific fits — needs the same empirical-Bayes shrinkage as P-L, not raw per-context MLE.

---

### P-F ⚠. CLV certification e-process: 4-point grid mixture, wired to `settle-sport` clvVerdict
**Effort:** days · **Rank:** 6

**Anchors:** `packages/prediction-engine/src/bernoulli-eprocess.ts:93`, `:49`; `packages/prediction-engine/src/conviction-tier.ts:43`; `packages/prediction-engine/src/clv.ts:26`; `packages/ingestion-pipeline/src/settle-sport.ts:471`; `docs/ops/edge/2026-08-19-edge-roadmap.md:23`

**Method:** GROW-optimal fixed-bet e-variables mixed over a preregistered θ grid; a convex combination of e-processes is itself an e-process (Ville-valid). Accumulate in log-space, not raw-M average.

**Papers:** Grünwald, de Heide & Koolen, *Safe Testing*, arXiv:1906.07801 (JRSS-B 2024) · Shafer, arXiv:1903.06991 (JRSS-A 2021) · Ramdas, Grünwald, Vovk & Shafer, arXiv:2210.01948 (Statistical Science 2023) · Waudby-Smith & Ramdas, arXiv:2010.09686 (JRSS-B 2024).

**Change:** two fixes to the drafted-but-dark machinery in `bernoulli-eprocess.ts`. (1) `mixtureEProcess()` currently averages raw wealth `M_k,t` each step — rewrite to `logsumexp` over per-grid-point `logM` paths minus `ln(K)`. (2) Build `clv-certification-eprocess.ts` instantiating the existing `eProcess(pHats, pMkts, ys)` four times at grid points `{0.55, 0.575, 0.60, 0.65}` against `BREAK_EVEN_PROBABILITY=0.524` (`conviction-tier.ts:43`), fed `y=1{clvVerdict==="BEAT_CLOSE"}` with `MATCHED_CLOSE` excluded per the roadmap's own unit definition, combined via the fixed `logsumexp` mixture. Replace the roadmap's informally-described 3-point equal-weight mixture (`edge-roadmap.md:23-26`) with this verified 4-point grid.

**⚠ Audit correction — read this before treating the original urgency framing as fact:** the doctrine audit independently checked the two headline numbers this proposal used to argue urgency, and both were overstated.
- *Overflow risk:* the proposal describes the current raw-wealth averaging as numerically unsafe because "M can hit 1e6+." IEEE-754 double overflow requires `|logM|` on the order of 700+ nats (`ln(1.8e308) ≈ 709.8`), which — at this platform's own documented growth rates (≈0.0117 nats/pick at θ=0.60) — needs *thousands* of picks, not the ~257-600-pick certification window this proposal operates in. `forecast-skill-eprocess.ts`'s own header says the same thing ("over thousands of picks"). The `logsumexp` rewrite is good defensive engineering regardless, but it is not an active numerical-safety fire.
- *Mixture cost:* the proposal states the 4-grid needs n=376 for E≥20 at θ=0.60, versus an oracle n=257. That 376 figure looks like a deterministic approximation rather than a validated stopping-time result. An independent Monte Carlo check (20,000 trials at θ=0.6) put the median first-crossing at n=232 and the mean at n=287 — both *below* 376. The real power cost of the grid relative to the oracle is likely smaller than claimed, not larger, though this needs a proper simulation study before it goes in front of a subscriber or investor.

Net: the dead-zone finding itself checks out exactly (KL zero-crossing at θ=0.5629, oracle n=257 both independently reconfirmed) — the mixture's *purpose* (killing the negative-drift dead zone for any true θ < 0.562, where a fixed bet at θ=0.60 has negative expected log-growth) is sound and worth building. Ship it as engineering hygiene and robustness, not as an urgent bug fix, and re-run the power table via simulation before publishing exact pick-count claims.

**Expected effect:** sizes and de-risks the ESTABLISHED gate (≥500 settled + verified CLV≥52.4%, `pricing-phases.ts`). Given the measured TOTALS beat-close (176/301, ~2.8% SE, pending P-A's regrade), true θ plausibly sits inside the 52.4-56.2% dead zone a fixed 0.60-bet cannot escape. Pure robustness/power engineering — no RES or new-data claim.

**Experiment / kill:** preregister *before* the next settled pick after this ships, not against the existing 176/301 history (PILOT-only per roadmap §1.4). Unit = one flagged, hash-committed pick, one per game. H0: `P(BEAT_CLOSE) ≤ 0.524`; certify at running-max `logM_mix ≥ ln(20)`; kill counter H0′: `P(BEAT_CLOSE) ≥ 0.524` vs θ=0.48, kill at E ≤ 1/10; budget kill at N_max=600 flagged picks per family. Report `logM_mix` plus the four individual grid-point paths, TOTALS first.

**Risks:** `bernoulli-eprocess.ts`'s own header says "R&D, dark, unwired... Do not import from a live path" — this deliberately lifts that gate and should ship as a visible, founder-acknowledged change. Must enforce one-pick-per-game (documented 2-5× alpha inflation under same-game correlation elsewhere in the codebase — see P-P). Must use non-contaminated close prices (C-15), or the null itself is corrupted.

---

### P-G. Fitted logit-space pooling (Satopää E-mean) replacing `blendIndependentHomeFair`'s weight-then-stretch
**Effort:** days · **Rank:** 7

**Anchors:** `packages/ingestion-pipeline/src/generate-signal-slate.ts:47`; `apps/web/lib/calibration/platt-irls-investigate.ts:30`

**Method:** log-odds pooling plus a single fitted affine extremization map, MLE-fit on settled outcomes — nests market-anchor share and extremization strength as data-estimated parameters instead of hardcoded constants.

**Papers:** Satopää, Baron, Foster, Mellers, Tetlock & Ungar (2014), *Combining multiple probability predictions using a simple logit model*, IJF 30(2):344-356 · Powell, Satopää, MacKay & Tetlock (2024), *Skew-Adjusted Extremized-Mean*, Decision, 10.1037/dec0000191 · Ranjan & Gneiting (2010), JRSS-B 72(1):71-91 (impossibility theorem for linear pools) · Satopää, Pemantle & Ungar (2016), arXiv:1406.2148 (JASA) — overlap-based extremization.

**Change:** replace `blendIndependentHomeFair`'s weighted average (`generate-signal-slate.ts:47-76`, stretch already removed per P-C) with `logit(p*) = b0 + b1·logit(p_market) + b2·logit(p_independent)`, fit by regularized IRLS/MLE on settled outcomes — reusing the IRLS pattern already built for Platt scaling (`platt-irls-investigate.ts:30`, MAP with a Gaussian prior). `b1/(b1+b2)` recovers the market-anchor share the current heuristic hardcodes implicitly; `b1+b2` replaces the ×1.12 stretch with a data-estimated extremization strength that can legitimately come in *below* 1 (anti-extremize) if that's what the fit says. Refit walk-forward, per pick-type, freezing coefficients before each declared period.

**⚠ Citation precision flag (from the citation audit):** the empirical case for this method leans on Powell et al.'s fitted extremization slopes (3.44 on GJP data, 4.43 on general-knowledge data). The paper's existence, authors, and venue are confirmed; the specific decimal values were not independently re-derived from the primary tables this session. Treat the *direction* (fitted logit-space extremization beats probability-space averaging) as solid and multiply-sourced, but the exact slope numbers as unconfirmed precision pending a direct read of the source tables.

**Expected effect:** closest structural match to every empirical gain cited across the pooling thread (Powell et al.'s GJP tournament Brier 0.098→0.061 moving from probability-space averaging to fitted logit-space extremization). **Honest caveat from the theory itself:** our two sources are engineered to overlap heavily today (independent `trueProb` already attenuated ×0.484 and 45%-reanchored to market), so per Satopää-Pemantle-Ungar's overlap framework, the fit may converge to `b1+b2` near 1 — i.e., little or no extremization justified — until an independent signal is de-anchored or a genuinely diverse source (P-E's totals model, Kalshi) is added. A fit converging near 1 is itself the honest, publishable answer, not a failure.

**Experiment / kill:** preregister the fit protocol before touching new picks: train on settled picks up to the declaration date with a Gaussian(0,1) ridge prior (mirroring `platt-irls-investigate.ts`'s prior, to guard the quasi-separation risk Powell et al. document at n~300); freeze; evaluate only on the next N out-of-sample picks via CORP DSC (P-B) and `forecast-skill-eprocess.ts` against the frozen old heuristic on the same picks. Kill: if the frozen fit's CORP DSC does not exceed the heuristic's DSC at 1-sided 80% CI over the first 200 out-of-sample picks, revert and publish the negative result.

**Risks:** quasi-separation with n~300 and 2 correlated predictors is Powell et al.'s own documented failure mode for unregularized fits — the ridge prior is not optional. Must fit strictly walk-forward or the evaluation leaks.

---

### P-H. Isotonic Distributional Regression (IDR) independent totals/spread model
**Effort:** week+ · **Rank:** 8

**Anchors:** `packages/prediction-engine/src/scoring.ts:551`; `packages/prediction-engine/src/dixon-coles.ts:72`; `packages/data-ingestion/src/team-rates-source.ts:1`

**Method:** nonparametric calibrated conditional CDF under a partial order on covariates — simultaneously calibrated and CRPS/threshold-Brier-optimal by construction, exactly computable via PAV-type algorithms.

**Papers:** Henzi, Ziegel & Gneiting (2019), arXiv:1909.03725 (JRSS-B 83(5):963-993).

**Change:** two-thirds of the pick surface carries `rankingSource: "confidence"` with "no independent ATS model yet" (`scoring.ts:551-552`) — the largest single structural hole. Fit an IDR model for total game score with a partial order over (Dixon-Coles expected total — `dixon-coles.ts:72-111`'s joint matrix needs a totals-marginal wrapper; market total plus observed line movement; team-rates.ts's founder-gated Poisson lambda inputs). Read `P(over)` directly off the fitted conditional CDF.

**Expected effect:** of every method surveyed, IDR is the only one that creates resolution *by construction* rather than measuring or preserving it, because it conditions on features rather than collapsing to a single score. Targets exactly the market segment (TOTALS) currently showing the platform's only positive PILOT signal — pending P-A's regrade and C-15.

**Experiment / kill:** PILOT phase (not certifying): fit on already-settled totals games, holding out the most recent season; report CORP DSC with bootstrap CI (P-B) vs. the market's own devigged total probability. Gate: proceed to prospective publication only if IDR CORP-DSC 95% CI clears 0 by a non-trivial margin *and* does not merely replicate the market's own DSC. Prospective phase: preregister before first published IDR-sourced totals pick; grade via `forecast-skill-eprocess.ts` and P-A's price-space CLV track on TOTALS specifically; N_max=400 flagged picks; kill per the standard KILL-A/B rule.

**Risks:** IDR is data-hungry at the boundary of the covariate partial order, needing a few hundred-plus settled totals games per sport. `team-rates-source.ts` is founder-gated (`TEAM_RATES_AVAILABLE=false` today, requires a `MODEL_VERSION` bump) — a real dependency, not a code-only unlock. Must not accuracy-tune IDR standalone against the market (Hubáček et al.'s decorrelation lesson) — use only as a divergence-vs-market flag source. Consider running P-E and P-H as competing rather than parallel builds; both target the same gap and should be compared, not both shipped blind.

---

### P-I ⚠. Recenter the selective-publish abstention band out-of-sample (Chow's rule)
**Effort:** days · **Rank:** 9

**Anchors:** `apps/web/lib/calibration/selective-publish.ts:69`, `:162`; `docs/ops/edge/2026-08-19-edge-roadmap.md:141`

**Method:** Chow's reject-option theory plus risk-controlled selective prediction, applied as the concrete out-of-sample mechanism the roadmap's own STOP list names but doesn't specify.

**Papers:** Chow (1970), *On optimum recognition error and reject tradeoff*, IEEE Trans. Inf. Theory 16(1):41-46 · Geifman & El-Yaniv (2017), arXiv:1705.08500 · Kaunitz, Zhong & Kreiner (2017), arXiv:1710.02824 · Walsh & Joshi (2024), *Machine learning for sports betting: should model selection be based on accuracy or calibration?*, Machine Learning with Applications 16, 10.1016/j.mlwa.2024.100539.

**Change:** two fixes to `selectivePublishSweep`. (1) `passesSelectiveThresholds`' delta filter is `|row.p - 0.5| < t.delta` (`:69`) — correct only for a perfectly balanced -110 two-way market and wrong for every other price; recenter at the row's own devigged `marketP` so the band is `|p - marketP_devigged| < delta`, matching Chow's cost-ratio derivation. (2) `selectivePublishSweep` (`:162-323`) argmaxes Murphy resolution on the same settled rows it's evaluated on — the exact STOP-list gap the roadmap names without a replacement mechanism (`edge-roadmap.md:141`); replace with a walk-forward split (fit on an earlier settlement-date fold, evaluate on a strictly later held-out fold), reframed as a Geifman-El-Yaniv risk-controlled coverage search.

**⚠ Audit flag:** the Walsh & Joshi (2024) citation predates its own author-issued corrigendum. The corrigendum revised the headline empirical claims (wealth uplift moved from "a third" to "almost a quarter") and — more relevant here — corrected the specific Kelly-related claim this proposal leans on from "Kelly betting only works with a well-calibrated model" to **"Kelly betting can fail even with a well-calibrated model."** The proposal's broader thesis (calibration matters more than accuracy for model selection) survives the correction, but do not cite the original, pre-corrigendum framing of the Kelly claim; cite the corrected one.

**Expected effect:** decision-quality fix, not a resolution generator — raises realized CLV per published pick (Kaunitz's selection-by-deviation result) and removes a documented in-sample optimism bias from the sweep's own reported numbers.

**Experiment / kill:** re-run `selectivePublishSweep` in walk-forward mode (k-fold by settlement date) on already-settled history as a PILOT; report walk-forward-selected coverage/RES alongside the existing in-sample numbers to quantify the current overstatement. Preregister the walk-forward selection rule and the devigged-center delta before first live application. Expected/acceptable result: if walk-forward coverage collapses toward ~0% given the platform's measured RES≈0, that is the correct outcome per the roadmap's honest-state doctrine — do not backfill a nonzero publish floor to avoid an empty board.

**Risks:** walk-forward evaluation needs enough settlement-date history per fold to be stable at current volume (~1,161 lifetime settled picks) — folds may need to be coarse (e.g. monthly), weakening the out-of-sample guarantee; document fold width as part of the preregistration, not after seeing results.

---

### P-J. Wire Shin-devigged market price into Kelly staking, center the no-bet region at the devigged close
**Effort:** days · **Rank:** 10

**Anchors:** `packages/prediction-engine/src/kelly.ts:172`, `:180`, `:54`; `packages/prediction-engine/src/market-read.ts:36`

**Method:** distributionally-robust / shrinkage Kelly with a Chow-rule abstention band centered at the market's own de-vigged probability, not at 0.5 or an ad hoc edge-score proxy.

**Papers:** Baker & McHale (2013), *Optimal Betting Under Parameter Uncertainty*, Decision Analysis 10(3):189-199, 10.1287/deca.2013.0271 · Busseti, Ryu & Boyd (2016), arXiv:1603.06183 · Sun & Boyd (2018), arXiv:1812.10371 · Chow (1970) [see P-I].

**Change:** `recommendStake`'s `estimatedFairProbability` (`kelly.ts:180-182`) is currently `offeredProb + (edgeScore/100)*0.05` — never touching a real de-vigged number, even though `market-read.ts` already implements the right primitive (`noVigFromAmericanPrices`, Shin devig, `:36-63`) and is unused by `kelly.ts`. Thread the actual Shin-devigged fair probability into `recommendStake`. Replace the fixed `MIN_CONFIDENCE_FOR_STAKE=65`/`MIN_EDGE_FOR_STAKE=50` gates (`:54, 58`) with a Chow-rule band: no stake unless the shrunk edge (devigged model p minus devigged market p, shrunk by measured Var(p_hat) per Baker-McHale) clears the vig-implied break-even plus an estimation-error term, per market.

**Expected effect:** does not create resolution — Chow/Geifman-El-Yaniv and distributionally-robust Kelly are explicit that selective prediction converts existing resolution into a defensible decision, manufacturing none from a flat score distribution. Given RES≈0 today, the theoretically correct near-term effect is to shrink the published stake set toward empty — the honest state the roadmap itself names ("publish the board as information, not as a bet"), not a regression. Its payoff activates once P-E/P-G/P-H create genuine market-orthogonal signal.

**Experiment / kill:** PILOT against already-settled picks (not fed to any e-process) to confirm it recommends near-zero stakes today, as expected. Once any signal family clears certification (E≥20), turn the rule on for that family only; track realized bankroll growth of DRO-Kelly stake vs. current flat quarter-Kelly on paper for N=300 settled picks at matched drawdown. No-promote if DRO-Kelly doesn't beat flat quarter-Kelly at equal drawdown after N=300 — but retain the devigged-center replacement regardless (independently justified; the current 0.5/edgeScore center is provably wrong for every non-pick'em ML price).

**Risks:** `kelly.ts` explicitly disclaims itself as a sizing helper, not a bet recommendation — preserve that disclaimer. Devigged price isn't always available at the caller's call site today — needs threading from `scoring.ts`'s already-computed `fairProb`.

---

### P-K. Multicalibration audit as a boosting loop (gated on P-D)
**Effort:** week+ · **Rank:** 11

**Anchors:** `apps/web/lib/calibration/resolution-by-group.ts:1`; `apps/web/lib/calibration/segmented-murphy.ts:1`; `packages/prediction-engine/src/scoring.ts:486`

**Method:** iterated subgroup calibration patches, each provably reducing squared error, with a checkable certificate of exhaustion when no violated subgroup remains.

**Papers:** Hébert-Johnson, Kim, Reingold & Rothblum (2018), arXiv:1711.08513 (ICML) · Globus-Harris, Harrison, Kearns, Roth & Sorrell (2023), arXiv:2301.13767 (ICML).

**Change:** **build only if P-D's grouping-loss lower bound is positive for at least one feature.** Extend `resolution-by-group.ts`'s group-key machinery to a small, prespecified subgroup class C (5-8 groups max given ~300 settled picks) chosen directly from P-D's positive features. Implement the fix-a-violated-subgroup loop as a boosting step using a per-subgroup e-value (not a raw p-value, to avoid multiple-testing risk at this sample size); patch only subgroups clearing a preregistered threshold; iterate until no subgroup patches — itself a publishable exhaustion certificate.

**Expected effect:** each successful patch strictly raises DSC while leaving REL near 0 (unlike the deleted ×1.12 stretch, this is information-injecting, not blind spread). A null result (no subgroup patches) is equally valuable: a checkable, preregistered certificate that the prespecified feature class carries no extractable resolution.

**Experiment / kill:** preregister subgroup class C and per-subgroup e-value threshold *before* running the audit. Use `bernoulli-eprocess.ts`/`forecast-skill-eprocess.ts`'s pattern with `p_t`=subgroup-patched forecast, `m_t`=unpatched forecast; certify a patch at E≥20. Kill: any subgroup whose e-value hasn't moved after N=150 subgroup-eligible picks is dropped from the active patch set.

**Risks:** with ~300 settled picks total, more than ~8 subgroups guarantees overfitting regardless of the e-value machinery — the fixed, small C from P-D must not be expanded ad hoc mid-audit. Do not run before P-D returns positive.

---

### P-L. Weather and park-factor covariates for the totals model, empirical-Bayes shrunk
**Effort:** week+ · **Rank:** 12 (depends on P-E)

**Anchors:** `packages/prediction-engine/src/team-rates.ts:46`; `packages/ingestion-pipeline/src/build-independent-fair-values.ts:1`

**Method:** quantified run-environment covariates folded into the NB total's lambda as multiplicative adjustments, empirical-Bayes shrunk toward league mean.

**Papers:** Callahan, Dominy, DeSilva & Mankin (2023), BAMS 104(5), 10.1175/BAMS-D-22-0235.1 · Acharya et al. (2008), JQAS 4(2), 10.2202/1559-0410.1108 · Baio & Blangiardo (2010), Journal of Applied Statistics 37(2):253-264 · Bradbury & Forman (2012), J Strength Cond Res 26(5).

**Change:** extends P-E with two covariates, both rights-clean per the scraping-clearance doctrine: (1) game-day temperature/wind from NWS `api.weather.gov` (US government public-domain, no key) as a multiplicative lambda adjustment per Callahan et al.'s measured +1.96% HR per +1°C; (2) historical park factors via Acharya et al.'s ANOVA-style fixed-effects estimator (not the inflation-biased naive scoreboard ratio) from Retrosheet's commercial-use-permitted data. Both shrunk toward league-mean effect (Baio-Blangiardo's mixture-prior fix for overshrinkage) given current sample sizes. Starter-rest included as a minor covariate; live umpire assignment and bullpen fatigue explicitly excluded as headline features (see §5).

**Expected effect:** second-order relative to P-E — the NB-vs-Poisson distributional fix is the primary source of new resolution; these covariates add further game-to-game variance on top (Coors vs. Oakland park spread ~±15-20% runs).

**Experiment / kill:** preregistered ablation — NB-with-covariates vs. NB-without, both walk-forward on P-E's held-out split, before either variant goes live. **A new data source (NWS) requires a Scraping Clearance Engine check and a source-rights-registry entry per CLAUDE.md before any ingestion job runs — hard prerequisite, file as its own small task first.** Kill: if the covariate-augmented model's held-out RPS isn't measurably better than the covariate-free NB model, ship without covariates.

**Risks:** NWS forecast data is a forecast, not actual game-time weather — using it prospectively (the only honest use) caps achievable signal below Callahan et al.'s retrospective measurement; the ablation must run on forecast-time data or it silently reintroduces look-ahead bias. Depends on P-E shipping first.

---

### P-M ⚠. Venn-Abers (IVAP) interval wrapper on the isotonic calibrator, feeding conservative p0 into Kelly gating
**Effort:** days · **Rank:** 13

**Anchors:** `apps/web/lib/calibration/isotonic-pava.ts:91`, `:137`; `packages/prediction-engine/src/kelly.ts:54`, `:153`

**Method:** inductive Venn-Abers predictors — distribution-free multiprobability calibration `[p0,p1]` under exchangeability alone, no model assumptions.

**Papers:** Vovk & Petej (2012), arXiv:1211.0025 (UAI) · Vovk, Petej & Fedorova (2015), arXiv:1511.00213 (NIPS).

**Change:** wrap `fitIsotonicPava`/`applyIsotonic` (`isotonic-pava.ts:91-153`) as an IVAP: run PAVA twice on the calibration set augmented with the test point once as y=0, once as y=1, producing `[p0,p1]`. Thread `p0` (conservative end) into `recommendStake` (`kelly.ts:153`) and `MIN_CONFIDENCE_FOR_STAKE` (`kelly.ts:54`).

**⚠ Audit flag:** `isotonic-pava.ts` carries its own header — "offline R&D only... Apply OFF until holdout wins floors + founder enables `CALIBRATION_ADJUSTMENTS`" — and `kelly.ts`'s `recommendStake` is confirmed live/API-facing ("Lets the API route call this"). The proposal as written does not carry forward an equivalent off-by-default gate for the new IVAP path, unlike P-F in this same set, which explicitly frames its own gate-lift as "a visible, founder-acknowledged change." **Fix before shipping:** the IVAP wrapper needs its own explicit flag, off by default, with the same founder sign-off P-F requires — do not silently import a flagged-off R&D primitive into a function that already ships live.

**Expected effect:** zero effect on RES/DSC — Venn-Abers is score-only and provably ranking-preserving, so CORP-DSC is invariant; not a discrimination lever. Value is finite-sample-valid *risk control*: given the flat suppression curve (0.0017 spread), most `[p0,p1]` widths will honestly be wide, visibly showing when a "premium" confidence score is statistically indistinguishable from the 50.9% base rate.

**Experiment / kill:** preregister on the next holdout refresh after deploy: report interval-width distribution by pick type and confidence bucket as a diagnostic artifact. Fixed decision rule: picks whose p0 doesn't clear `BREAK_EVEN_PROBABILITY` (0.524) get no Kelly stake regardless of point confidence. No kill criterion (risk-control wrapper); monitor that `recommendStake`'s null-rate doesn't spike enough to suppress the whole board.

**Risks:** IVAP re-runs PAVA per test point against the calibration set (O(n) per call) — needs a cost check before wiring into the live per-pick path vs. a nightly batch job. Widths will be large at today's small settled-n; read as an honest reflection of sample size, not "the model is bad."

---

### P-N. Upgrade `anytime-ledger.ts`'s empirical-Kelly plug-in to the verified Waudby-Smith & Ramdas predictable plug-in (eq. 32)
**Effort:** hours · **Rank:** 14

**Anchors:** `packages/prediction-engine/src/anytime-ledger.ts:158`, `:29`

**Method:** predictable plug-in (PrPl±) betting schedule for bounded-mean confidence sequences, with the exact truncation constant verified against the primary source this session.

**Papers:** Waudby-Smith & Ramdas, arXiv:2010.09686 (v6 full text; Theorem 3, eq. 32), JRSS-B 2024.

**Change:** `anytime-ledger.ts`'s header explicitly gates this upgrade on "verifying its exact constants against the primary source rather than reconstructing them from memory" (`:29-32`) — done this session and independently re-confirmed by the doctrine audit against the actual arXiv v6 PDF text: `lambda_t^{PrPl±} = sqrt(2·log(2/alpha) / (sigma_hat²_{t-1}·t·log(t+1)))`, truncated at `c/m` with `c=1/2`. Replace `stepWealth`'s `rawLambda = (muHat-y0)/(varHat+1e-9)` (`:161-162`) with this formula, keeping the existing `CAP=0.5` positivity truncation (`:137-138`) as the outer safety bound. Ship as an A/B alternative wealth path, not a silent replacement.

**Expected effect:** improves power only (validity never depended on the schedule) on the anytime-ledger profitability track, separate from `forecast-skill-eprocess.ts` and P-F's CLV track. A real but second-order speedup — schedule after P-F.

**Experiment / kill:** parallel-run comparison, not a switch: both `stepWealth` variants side by side from a declared start point. Metric: picks-to-reach-a-given-confidence-width, rejects-at for matched alpha. After N=300 new settled bets, adopt whichever reached a tighter bound; report both regardless of outcome.

**Risks:** GRAPA/aGRAPA (Appendix B.2/B.3) are **not** verification-complete — the full formulas could not be retrieved from the primary text this session. Scope strictly to eq. (32); do not implement GRAPA/aGRAPA from memory.

---

### P-O. Anytime-valid Brier-differential confidence sequence for the public Edge Index
**Effort:** days · **Rank:** 15

**Anchors:** `packages/prediction-engine/src/forecast-skill-eprocess.ts:142`, `:325`; `docs/ops/edge/2026-08-19-edge-roadmap.md:152`

**Method:** confidence sequences / e-values on average proper-score differentials between two forecasters, finite-sample valid under continuous monitoring, no distributional assumptions, optional stopping allowed.

**Papers:** Henzi & Ziegel (2021), arXiv:2103.08402 (Biometrika 2022, correction 2022) · Choe & Ramdas (2021), arXiv:2110.00115.

**Change:** companion confidence-sequence module beside `forecast-skill-eprocess.ts` (already reports `growthRatePerPick`, `:325-328`, documented as `KL(truth||market) − KL(truth||ours)`) inverting the same betting martingale into a running, anytime-valid CI on the Brier-score differential between published p and market m. Publish alongside the Rung-0 reliability page the roadmap already specifies (`edge-roadmap.md:151-152`).

**Expected effect:** makes the platform's #1 measured gap visible as a tight, honest, continuously-valid interval hugging zero (given RES≈0, the differential's growth rate is ≈0 by the same math already in `forecast-skill-eprocess.ts`), rather than a static number without a monitoring correction. Discrimination-side complement to P-F/P-A's CLV instrument — this answers "do we beat the market's own probabilities," continuously and honestly, and is the first instrument that will visibly move once P-E/P-G/P-H land real discrimination.

**Experiment / kill:** no new preregistration beyond what `forecast-skill-eprocess.ts` already requires — a reporting-layer addition over an already-preregistered instrument. Publish nightly as `{n, ci_lower, ci_upper, growthRatePerPick}`. No kill criterion (monitoring instrument); its own CI width becomes the auditable signal for when P-E/P-G/P-H are worth publicizing.

**Risks:** must inherit `forecast-skill-eprocess.ts`'s existing input-quality requirements verbatim (de-vigged `m_t`, one pick per game) or the CI inherits the same vig-inclusive-bias risk the module's header warns about. Never present as a CLV/profitability claim — it is evidence versus supplied market probabilities only.

---

### P-P. Flag, and eventually jointly size, same-game correlated picks
**Effort:** days (flag) / week+ (full solver) · **Rank:** 16

**Anchors:** `packages/ingestion-pipeline/src/settle-sport.ts:381`; `packages/prediction-engine/src/kelly.ts:153`; `packages/prediction-engine/src/dixon-coles.ts:72`

**Method:** portfolio-Kelly over a slate's joint outcome distribution, using the correlation structure the platform's own Dixon-Coles/Poisson joint score matrix already encodes, in place of per-pick-independent staking.

**Papers:** Whitrow (2007), JRSS-C 56(5):607-623 · Grant, Johnstone & Kwon (2008), Decision Analysis 5(1):10-18 · Busseti, Ryu & Boyd (2016), arXiv:1603.06183.

**Change:** `settle-sport.ts`'s settlement loop confirms multiple pick types (MONEYLINE/SPREAD/TOTAL) settle per game today, each independently graded and independently staked via `recommendStake`, with no cross-pick awareness. Given the platform's own measured 61.6% zero-movement MLB runlines (near-duplicates of the ML on the same game), this is a real, present correlation on the published board. **Minimum viable fix:** group published picks by `gameId`, attach a correlation flag/subscriber-facing note whenever ≥2 picks share a game. **Stretch goal:** feed `jointScoreMatrixDixonColes`/`jointScoreMatrix` (`dixon-coles.ts:72-110`) into a Busseti-Ryu-Boyd convex program for a joint-optimal stake pair, provably ≤ the naive sum of per-pick Kelly stakes.

**Expected effect:** risk-management/subscriber-honesty correctness fix, not a resolution generator — protects against subscribers double-counting one game's variance as two independent edges.

**Experiment / kill:** no e-process needed — a staking-math/disclosure correctness fix. Validate by simulation: draw N synthetic slates from the historical joint-outcome distribution, compare bankroll drawdown of naive-independent-Kelly vs. joint-optimal-Kelly at matched expected growth. Ship the flag (cheap half) immediately; gate the full solver behind a design review since it changes subscriber-facing stake numbers directly.

**Risks:** the flag-only version is cheap and low-risk; the full solver version changes numbers subscribers may already be acting on, so it needs a visible changelog, not a silent stake-size shift. `jointScoreMatrixDixonColes` is soccer-only (rho=0 disables it elsewhere) — baseball/hockey correlation for the solver would need the plain independent-Poisson joint or, once P-E ships, the NB joint.

---

### P-Q ⚠. Replace the ad hoc ×1.12 stretch with variance-based shrinkage
**Effort:** days · **Rank:** 17

**Anchors:** `packages/ingestion-pipeline/src/generate-signal-slate.ts:47`, `:61`, `:71`

**Method:** Baker-McHale-style estimator shrinkage applied at the point where independent fair-value sources are combined.

**Papers:** Baker & McHale (2013) [see P-J] · Rising & Wyner (2012), IEEE ISIT · Hubáček, Šourek & Železný (2019) [see P-E].

**Change:** remove the ×1.12 stretch; replace the fixed `|hn-0.5|+0.05` sharpness weight with inverse-variance weighting from each source's historical calibration error, shrunk toward 0.5 by a factor derived from the blend's own estimated Var(p_hat).

**⚠ Audit flag — this is the weakest of the three proposals aimed at the same 30-line function.** The doctrine audit notes this is the third uncoordinated proposal targeting `blendIndependentHomeFair` (alongside P-C, a bare deletion, and P-G, a fully MLE-fitted logit-space replacement that explicitly builds on P-C and reuses in-repo ridge/IRLS machinery already built for Platt scaling). P-Q's variance-weighting mechanism is largely subsumed by P-G's more principled approach — P-G's fitted `b1+b2` coefficient recovers an equivalent shrinkage effect endogenously, with a theory (Ranjan-Gneiting's impossibility theorem) that P-Q doesn't engage. **Recommendation: treat P-G as the intended successor to P-C and do not build P-Q separately** — if P-G's shadow evaluation underperforms for some reason, revisit P-Q then, not in parallel.

**Expected effect / experiment / kill / risks:** as originally proposed — ship behind a flag as a shadow computation, compare Brier/ECE/Murphy-RES vs. baseline out-of-sample over N weeks, promote only if RES ≥ baseline with no Brier degradation beyond +0.01. Given the redundancy flag above, this is now a fallback plan, not a parallel workstream.

---

## 5. Researched and rejected

Kept here so nobody re-treads them. Organized by thread; "existence confirmed, do not build/use as claimed" unless otherwise noted.

**Statistical design (e-process/anytime-valid):**
- **"CEPT/CPET"** as a named method does not exist in the literature. It is a compression of Vovk's *conformal e-prediction* (arXiv:2001.05989) and *conformal e-testing* (arXiv:2006.02329, with Nouretdinov & Gammerman). Both are real and verified, but they test **exchangeability of the observation stream**, not skill versus a market number — they cannot substitute for, or accelerate, the 52.4% CLV test. Their one legitimate role: an online exchangeability-drift tripwire (model-version change, season turnover, book-behavior shift), optional and secondary to the CLV instrument.
- **Hoping a mixture over θ beats the ~257-pick oracle bound** — provably impossible. 257 picks at θ=0.60 *is* the KL oracle bound; every θ-agnostic e-process is strictly slower. The correct frame for mixtures is robustness against the dead zone, never speed.
- **Universal inference / split-LRT** (Wasserman, Ramdas & Balakrishnan, arXiv:1912.11436, PNAS 2020) — built for composite nulls with nuisance parameters via sample splitting. Our null (`p0=0.524`) is simple and fully specified; this machinery donates nothing we need. Do not implement.
- **Continuous KT/Beta mixture** (Orabona & Jun, arXiv:2110.14099) — the `(1/2)ln n` regret roughly doubles required picks (~522 vs. 257 at θ=0.60) and is dominated everywhere in our plausible θ range by the flat-cost 4-point grid (P-F). State of the art for general mean estimation, overkill for a 1-D Bernoulli point null.
- **GRAPA/aGRAPA exact λ formulas** — not verification-complete; the arXiv 2010.09686 Appendix B lambda recursions could not be fully retrieved this session. Only eq. (32)'s predictable plug-in (P-N) is verification-complete. Do not implement GRAPA/aGRAPA from memory.
- **Shafer, arXiv:1903.06991** — framing/communication language only (Ville's inequality, the running-max statistic, betting interpretation are already correctly implemented in `forecast-skill-eprocess.ts`). Useful for investor/marketing copy, not for design decisions.

**Calibration-adjacent:**
- **Focal loss / focal recalibration** (Mukhoti et al., arXiv:2002.09437; Tao et al., ICML 2023; survey arXiv:2507.07780) — solves overconfidence in deep nets trained with cross-entropy, fixed at training time. Wrong problem: our calibration is already solved (ECE 0.0044) and our failure mode is *flatness*; entropy-raising regularization would push further toward climatology. Do not build.
- **Venn-Abers, or any score-only calibration map (Platt, beta calibration, plain isotonic), as an accuracy/edge play** — checked directly against the original abstracts: the validity guarantee is calibration-only, ranking-preserving, and the price of validity is stated by the authors to be imprecision, not accuracy gain. Use only for the p0/p1 risk-control interval (P-M), never as a discrimination lever.
- **Tuning the ×1.12 stretch instead of deleting it** — under Gneiting 2007, stretching a calibrated forecast without new conditioning information strictly worsens proper scores for every value of the constant. Grid-searching it would only overfit the holdout. See P-C.
- **No published sports-betting application of Venn-Abers or IDR with demonstrated ROI** was found this session. The theory is solid; the application-specific validation does not exist in the literature and must be established in-house, under this platform's own e-process, before any claim is made externally.

**Forecast aggregation/pooling:**
- **Withdrawn paper arXiv:1501.06943** (Satopää-Pemantle-Ungar) — withdrawn May 2015, a revision artifact. The surviving version is arXiv:1406.2148 (JASA 2016). Do not cite the withdrawn ID.
- **Lichtendahl, Grushka-Cockayne & Winkler (2013), "Is It Better to Average Probabilities or Quantiles?"** — about continuous predictive distributions; its lesson collapses to "pool in logit/quantile space, not probability space," already covered by P-G. Not a separate implementation path.
- **A precise GJP extremization exponent "~2.5" and a range "[1.161, 3.921]"** circulating in secondary sources — could not be verified in any primary text. Use the directly-extracted Powell et al. slopes instead (P-G), and note even those carry a citation-audit precision flag (P-G above).
- **AI Impacts' GJP summary** — no extremization coefficients or Brier tables, only the secondhand "25-30% better than the internal prediction market" claim with a caution that the effect may have been partly a tournament-specific fluke. Treat as secondary, not primary evidence.

**Sports-market efficiency:**
- **Reverse favorite-longshot bias in MLB moneylines** — Woodland & Woodland (1994) report it, but Gandar et al. (2002) show the sign flips after correcting commission/probability estimates, and Ryan (2025, Applied Economics, 10.1080/00036846.2024.2364115) finds MLB moneylines extremely efficient under family-wise error control (only 2.46% of 1,547 tested strategies profitable at 5% significance — consistent with chance). Do not build an FLB feature expecting profit; the literature door is closed.
- **MLB runline-specific bias literature essentially does not exist** as a standalone subject — whether the platform's own 61.6% zero-movement runlines are exploitable stale pricing is an open empirical question with no published answer either way. Would have to be established entirely in-house under the e-process, not sourced from the literature.
- **"Beating the average" (Stömmer 2023, arXiv:2303.16648)** — despite the promising title, this is about a German lottery pool product (TOTO 13er Wette), not bookmaker-vs-sharp odds anchoring. Not useful here.
- **Beating the MLB totals close outright** — Bickel & Kim (2014) find little evidence the MLB O/U market is inefficient *at the close* when graded with real juice. This is the skeptical prior that motivates P-A: any "beat the close" totals claim needs the price-space regrade and the C-15 provenance audit before it survives this null.

**Independent-model candidates:**
- **MLB Stats API / Baseball Savant / Statcast** — MLBAM's copyright notice permits only individual, non-commercial, non-bulk use; commercial/bulk use requires prior written authorization. Classified `permission_required` in the source-rights registry. Historical modeling is fine via Retrosheet (commercial-OK with attribution), but same-day operational features (probable starters, lineups, umpire assignments, live bullpen usage) need either a licensed vendor or written MLBAM permission — the single biggest constraint on P-E/P-L's "days/week of effort" framing for *live*, as opposed to historical, features.
- **Bullpen-fatigue as a standalone signal** — thin, non-peer-reviewed evidence; usage is confounded with quality (managers endogenously rest bad options). Treat as a minor covariate only inside P-L, never a headline edge.
- **Diagonal-inflated bivariate Poisson** (Karlis & Ntzoufras 2003) — draw-probability calibration, meaningless for baseball (no ties). Skip entirely; only the correlation machinery is even potentially relevant and MLB home/away run correlation is weak (overdispersion, not correlation, is where the error lives).
- **Weibull-count models** (Boshnakov, Kharrat & McHale 2017) — built for continuous-clock sports (soccer's 90-minute goal inter-arrival process); baseball's inning/out structure breaks the renewal-process motivation. Not worth porting.
- **ML papers claiming 93-94% MLB game-winner accuracy** — far above the ~57-58% ceiling implied by closing moneylines; a strong leakage indicator (in-game or post-hoc features), not a design guide.
- **Kovalchik's MOV-Elo runline retrofit** — deprioritized, not disproven: MLB runlines are 61.6% zero-movement, so CLV-based validation barely functions there regardless of model quality.

**Decision layer:**
- **No academic paper directly tests "does an abstention band raise realized CLV per published pick"** — this is practitioner literature (Kaunitz's live-money result is the closest anchor), not journal literature. The claim must be tested in-house under this platform's own e-process; do not expect a citable external result.
- **An abstention band centered at 0.5** — wrong for every non-pick'em market. Chow/Kelly theory centers it at the de-vigged market probability per market. Already correctly designed into P-J/P-I; flagged here so it doesn't get reintroduced elsewhere by accident.
- **Grant-Johnstone-Kwon and Whitrow** both assume statistically independent simultaneous events, not correlated ones. No literature shortcut exists for same-slate correlation (P-P) — the convex-program route is an implementation task, not a citable result.
- **Selective prediction cannot manufacture resolution.** Chow and Geifman-El-Yaniv both presuppose score distributions with spread; with RES≈0 (0.0017 suppression spread) today, any risk-controlled coverage target near break-even forces coverage toward 0%. This formalizes "publish almost nothing" — it does not create publishable picks. P-D/P-E/P-H are strictly upstream of P-I/P-J/P-M, not substitutes for them.

**Tooling notes for future research sessions (saves re-discovery time, not a content finding):** the alphaXiv MCP server exposed only researcher-profile tools this session (no keyword paper-search tool) — all verification went through WebSearch plus direct arXiv/Crossref/EconPapers lookups instead; budget accordingly. `pypdf`/`pdfminer` are broken in this container (a `cryptography`/`_cffi_backend` panic); `pip install pymupdf` works for PDF text extraction. `pdftoppm`/poppler is absent, so PDF pages cannot be rendered as images. Semantic Scholar's API rate-limits (429); Crossref (`api.crossref.org/works/DOI`) is a reliable fallback. Several publisher domains (INFORMS pubsonline, Taylor & Francis) 403 direct WebFetch; verify via Crossref/RePEc/EconPapers/ResearchGate metadata instead.

---

## 6. What we still don't know

- **Whether the flagship number is even real.** TOTALS beat-close is 176/301 = 58.5% with roughly 2.8% standard error, computed on point movement alone (P-A not yet run) and pending the C-15 provenance audit on lock-price contamination. Bickel & Kim's own finding is that MLB totals conclusions flip once real juice is used. This is not resolved by anything in this dossier — it's the first thing that has to happen.
- **Whether true θ, if the signal survives P-A, sits inside or outside the 52.4-56.2% dead zone** where a naive fixed-bet e-process at θ=0.60 would silently never certify a real edge. The 4-grid mixture (P-F) removes the risk but doesn't tell you where θ actually is — only more settled, correctly-graded picks do that.
- **Whether grouping loss within existing confidence buckets is actually positive** (P-D not yet run). This single number determines whether P-H and P-K — two week-plus builds — are worth funding at all.
- **Whether an independent NB totals model (P-E) actually beats the existing, already-built-but-unwired plain-Poisson helper out-of-sample.** The proposal's own kill criterion requires checking this before shipping the costlier model; it hasn't been checked yet.
- **Whether the fitted logit-space pooling coefficients (P-G) converge near 1** (little extremization justified, because the two current sources are engineered to overlap heavily) **or move meaningfully** once an independent source is de-anchored or added. Unknown until the fit is run — and the empirical anchor for "how much lift is plausible" (Powell et al.'s 3.44/4.43 slopes) carries an unresolved precision flag from the citation audit.
- **Whether a licensed vendor or written MLBAM permission is obtainable, and at what price**, for same-day umpire assignments, lineups, and live bullpen usage — an operator/business question that gates P-L's *live* (not historical) covariates and was not attempted this session.
- **The Neyman & Roughgarden "1.73" worst-case extremization constant** — the paper (arXiv:2111.03153, EC 2022) is confirmed real and on-topic for the decision-layer thread, but this specific numeric constant was not independently re-derived from the primary text. It is not currently load-bearing for any proposal in this dossier; if it becomes relevant to a future default-staking decision, read the primary source directly first.
- **Two very recent single-author arXiv papers** ("Optimal Parlay Wagering and Whitrow Asymptotics," arXiv:2603.26620; "Exact Finite-Horizon Quantile Kelly for Repeated Multi-Outcome Events," arXiv:2604.17577) surfaced during the survey and were confirmed to genuinely exist via the arXiv export API, but carry no citation history or peer review and are not cited in support of any finding here. Flagging their existence only so a future session doesn't have to re-search for them; do not treat "exists" as "vetted."
- **No published, peer-reviewed sports-betting application of Venn-Abers, IDR, or multicalibration with demonstrated ROI** exists in the literature surveyed across six threads. Every resolution-creation claim in this dossier is a theoretical transplant into a new domain and must clear this platform's own e-process before it is called proven — the literature can tell you a method is theoretically sound, not that it will work here.

---

*Audit summary for the record: 90 survey citations checked (0 fabricated, 0 doctrine violations, 3 precision-only flags), 38 proposal citations independently re-checked against the repo and primary sources (0 fabricated, 0 doctrine violations, 4 proposals flagged and addressed above). This is an unusually clean literature-to-engineering pipeline; the constraint on what to build next is runway, not idea quality.*
