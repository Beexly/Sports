# Second-Pass Synthesis — Seven-Paper Batch (2026-09-27)

**Batch:** commit `17ae261` (2026-09-26) — six ADAPT + one REJECT
**First-pass ledgers:** `docs/dfs/research/2026-09-25/arxiv-deep/` (misfiled by the 9/27 reorg; program material belongs under `docs/arxiv-program/`)
**Method:** full re-read of all six ADAPT first-pass ledgers + the 2609.23158 second-pass reassessment, verified against the engine source at `FETCH_HEAD` (remote `motif/repo-bucket-reorg-2026-09-27`, commit `b3c0ea032`). The first-pass agents worked from a stale local checkout; every claim below about "what exists in the engine" was re-verified against the remote tip.
**Replacement:** `2609.23158` (REJECT) is replaced by `2606.09409` (full read in `replacement-full-paper-read-2606.09409.md`). Program count: **586/750** after the replacement (585 verified 2026-09-26 + 1).

**Headline second-pass corrections:**
1. The first pass repeatedly claimed the engine modules `calibration-ladder`, `multi-market-ensemble`, `pick-clv`, `source-reliability`, `oos-split`, `synthetic-fade` "do not exist." **They all exist** at `packages/prediction-engine/src/*.ts` with tests in `__tests__/`. Two ledgers flagged this honestly as uncertainty from a stale checkout; the claim was wrong, and every implementation spec below is rewritten against the verified interfaces.
2. `source-reliability.ts` is a **stub** (always returns `INSUFFICIENT_DATA`, pending the SignalLedgerEvent/feat-ledger merge). First-pass specs that route through "earned-weight machinery" must be re-sequenced — the ledger has to land first.
3. Three papers propose three different aggregation schemes (LEAP's tempered Bayes, the deliberative protocol, the existing precision-weighted `multi-market-ensemble.ts`). The first pass specified them as independent modules. The second pass reconciles them into one upgrade path (see `corrected-cross-paper-architecture.md`).
4. Four of the seven papers are really about one thing — **calibration** — and the first pass never said so.

---

## Paper 1 — 2601.14727 — Recent advances in the Bradley–Terry model

**First-pass verdict:** ADAPT. **Second pass: ADAPT, confirmed.** The survey is what it claims to be; the transferable pieces survive re-examination.

### Method (verified)
A survey of BT-model developments with emphasis on: (a) the asynchronous Newman fixed-point estimator for large-scale pairwise data; (b) EM-MAP estimation with gamma priors as the fix for early-season data sparsity and Ford-condition (disconnected comparison graph) failures; (c) the PlusDC dynamic-covariate extension, with home-field advantage as the worked example; (d) the SST (strong stochastic transitivity) assumption and its violations.

### Math
- Core: `P(i beats j) = σ(u_i − u_j)`, strengths on the logit scale.
- EM-MAP: gamma prior on exponentiated strengths regularizes estimates when the comparison graph is disconnected or thin — exactly the NFL early-season regime (≤4 games/team, no cross-conference play yet).
- PlusDC: `P(i beats j | x) = σ(u_i − u_j + βᵀx)` — covariates (home field, rest differential) enter linearly on the logit scale.

### Datasets
Survey — no single dataset. The cited applications span sports rankings, preference learning, and LLM evaluation leaderboards.

### GSE application (corrected)
The first-pass spec (`bt-team-ratings` module → fair moneyline prices) is directionally right but missed the nearer integration point: **BT strengths live on the logit scale, and the engine already consumes logit-scale inputs** (`packages/prediction-engine/src/probability-calibration.ts` exists in the calibration toolkit the first pass mapped). The build is:
1. `bt-team-ratings.ts`: async Newman FPI estimator over game results, EM-MAP gamma-prior regularization (tunable prior strength by week — strong in weeks 1–4, decaying as the graph connects), PlusDC home-field/rest covariates.
2. Output feeds `multi-market-ensemble.ts` as one more `IndependentEstimate` family ("model:bt-ratings") with `sampleSize` = games behind the rating, so the existing precision-weighting (`σ ∝ 1/√n`) handles the early-season uncertainty automatically — no bespoke shrinkage needed beyond the gamma prior.
3. Cross-paper link (new in second pass): the replacement paper 2606.09409 shows BT beats Elo/WinRate/TrueSkill as the MLE aggregator of pairwise comparisons, and gives the bias-corrected extension `p_ij = 1/(1+e^{θ_j−θ_i−wᵀx})` — the exact PlusDC form. The two papers are one lane: use 09409's covariate-BT as the estimator inside 14727's architecture.

### Reproducible test
Walk-forward from 2018: fit ratings on games through week *t*, predict week *t+1* moneylines vs. de-vigged close; assert Brier/log-loss beats a naive win-pct baseline with paired Wilcoxon p < 0.05, and assert the gamma prior's early-season (weeks 1–4) Brier is strictly better than unregularized MLE (which should show Ford-condition blowups).

### Improvement path
1. Margin-of-victory BT (Stern-style) as a second family — tests whether score information beats win/loss-only.
2. Time-decay kernels on pairwise observations instead of fixed windows.
3. Intransitivity detector: flag team triples violating SST as "matchup-cycle" games and route them around the BT price (ties to the deliberative protocol's dispersion flag).

---

## Paper 2 — 2605.23597 — Structure-Guided Entity Resolution

**First-pass verdict:** ADAPT. **Second pass: ADAPT, confirmed and narrowed.** The first pass was the strongest of the six; the second pass mainly corrects the engine-interface claims and sharpens the "no-LLM" decision.

### Method (verified)
SGER: parse entity names into structured components *before* matching, then apply domain invariances (pair swapping, component permutation, random-space removal) so the matcher learns structure, not surface strings. Paper's implementation uses Llama 3 8B on proprietary Dream11 KYC data — correctly judged by the first pass as excessive machinery for GSE's problem.

### Math
No closed-form core; the transferable formalism is the invariance set: a correct match must be invariant under component permutation and whitespace/punctuation noise. The operational metric is pairwise precision/recall/F1 on book-to-book name pairs.

### Datasets
Proprietary Dream11 KYC records (not public, not needed). GSE's dataset is its own: cross-book prop-market name pairs.

### GSE application (corrected)
Deterministic, roster-anchored, fail-closed player-name resolver for cross-book prop ingestion — **no LLM on the hot path**, exactly as the first pass specified. Second-pass corrections:
1. The resolver is a prerequisite for the *props-first* calibration audit (Paper 3) and the physiological-load prop hypothesis (Paper 7's extraction) — it sits at the ingestion layer, not the modeling layer. The first pass filed it as a modeling component; the architecture doc corrects the layering.
2. "Fail-closed" needs a concrete definition the first pass didn't give: on ambiguous match (two roster players within edit-distance threshold, e.g. "M. Jones" with multiple candidates), emit `UNRESOLVED` and drop the book's quote from the ensemble for that prop rather than guessing. A wrong merge corrupts the ensemble silently; a dropped quote only costs coverage. Precision ≥ 0.995 is the binding constraint, not F1.
3. Roster anchoring: the canonical key is (team, position, jersey number) from the depth-chart feed, not the name string. Names are the noisy observation; the roster triple is the latent entity.

### Reproducible test
First-pass gate stands and is well-designed: F1 ≥ 0.98 and precision ≥ 0.995 on ≥500 real book-to-book pairs, with an adversarial slice (same-last-name teammates, suffixes Jr/III, diacritics, traded players appearing on two teams). Add: latency < 5 ms/pair (deterministic path), and a chaos test where one book's feed is adversarially perturbed (extra spaces, missing suffixes).

### Improvement path
1. Team-anchored disambiguation using game schedule (a name appearing on a book's prop list for Team X when the player was traded to Team Y last week).
2. Historical alias table learned from past resolutions (deterministic cache, human-reviewed promotions only).
3. Cross-league extension (CFB name collisions are worse; same machinery).

---

## Paper 3 — 2607.00164 — Verifiable Rewards for Calibrated Probabilistic Forecasting

**First-pass verdict:** ADAPT. **Second pass: ADAPT, confirmed — but the build is a delta to an existing module, not a new module.**

### Method (verified)
Train/calibrate probabilistic forecasters with rewards computed against a **state-conditioned empirical rate** `p̂(x)` rather than the single noisy realized outcome: `r = 1 − (p − p̂(x))²`. Hierarchical empirical-Bayes shrinkage `(w + M·p̂_parent)/(n + M)` (paper: M = 25) stabilizes thin bins. Strict season-disjoint evaluation; market-as-ceiling comparison. The paper's LLM/GRPO training loop is correctly discarded by the first pass.

### Math
- Denoised reward: `r = 1 − (p − p̂(x))²` where `p̂(x)` is the empirical rate in the forecast's state bin.
- Shrinkage: `(w + M·p̂_parent)/(n + M)` — thin bins inherit the parent rate; M = 25 is the paper's constant, treat as tunable.
- The key statistical claim: rewarding against `p̂(x)` instead of the 0/1 outcome removes outcome noise from the gradient/score, so calibration can be audited on far fewer samples.

### Datasets
Paper's own forecasting tasks (not sports). Transferable as method only.

### GSE application (corrected — this is the biggest second-pass correction in the batch)
`calibration-ladder.ts` **already implements the core recipe**: Platt/sigmoid for small-n, Wilson-bounded binned-empirical maps, and method selection by **held-out, time-ordered ECE** (train on past, score on held-out future — the leakage trap the paper's season-disjoint design also guards against). The first pass specified a new "rate-audit" module from scratch; the second pass specifies the **delta**:
1. Add empirical-Bayes hierarchical shrinkage to the binned-empirical path: `(w + M·p̂_parent)/(n + M)` with parent = coarser bin or market-implied rate, M tunable (paper's 25 as default). The current Wilson-bounded map is conservative; shrinkage is the sharper small-n estimator.
2. Add the **denoised-rate audit metric**: score calibration against state-conditioned empirical rates `p̂(x)` (state = favorite/dog bucket × line band × week band) rather than raw outcomes, as a *diagnostic alongside* standard ECE — it converges faster and is the paper's real contribution.
3. Props-first, as the first pass said — denser outcomes — but now routed through the existing ladder: the ladder's `CalibrationSample` is `(forecastProbability, outcome)` in chronological order; the audit adds a parallel `(forecastProbability, p̂(state))` scoring path.
4. The first pass's "missed baseline" critique (a smoother/tabular model might match the RL gains) resolves in GSE's favor: the engine already *has* the tabular alternative (the ladder itself). The paper's lesson is to **keep the tabular calibrator as the baseline and require any fancier method to beat it out-of-sample** — which is exactly the ladder's method-selection design.

### Reproducible test
On settled NFL picks: compute ECE two ways — standard (vs outcomes) and denoised (vs shrunk state-conditioned rates). Assert the denoised ECE estimate has strictly lower bootstrap variance at fixed sample size (the paper's efficiency claim), and that the shrinkage-augmented binned map beats the current Wilson-bounded map on held-out time-ordered log-loss with paired p < 0.05. If not, keep the current map.

### Improvement path
1. State definition search: which state partition (line bands? team tiers? rest?) maximizes the denoised metric's correlation with true future calibration — a meta-optimization the paper doesn't do.
2. Market-as-parent: use de-vigged market probability as `p̂_parent` in the shrinkage — the paper's "market as ceiling" becomes "market as prior."
3. Extend the denoised reward to the live WP updater (Paper 5): state-conditioned rates for (down, distance, score differential, time) bins.

---

## Paper 4 — 2609.01337 — LEAP: Likelihood Elicitation and Aggregation

**First-pass verdict:** ADAPT. **Second pass: ADAPT, confirmed — reframed as an upgrade to the existing ensemble, with the prior-quality finding as the load-bearing warning.**

### Method (verified)
Bayesian source aggregation: prior + per-source likelihoods, dependency clustering of sources, reliability shrinkage of source weights, tempered Bayesian update, and a leave-one-out contribution audit. Discrete posterior: `log π_post(k) ∝ α·log π_0(k) + η·Σ w_i·log L_i(k)`. Paper's headline empirical finding: **removing the prior made performance worse than the monolithic baseline** — prior quality is load-bearing, not decorative.

### Math
- Tempered posterior with reliability weights `w_i` and temperature `η`.
- LOO contribution audit: each source's marginal contribution measured by posterior shift on removal — the honest version of "source value."
- Dependency clustering: correlated sources share a cluster so their likelihoods don't double-count evidence.

### Datasets
Paper's own multi-source QA/forecasting tasks. Transferable as method only.

### GSE application (corrected)
`multi-market-ensemble.ts` **already does precision-weighted fusion** (`w ∝ 1/σ²`, σ derived from hold/liquidity/age/sampleSize, clamped [0.01, 0.5], emitting `fairProb`, `stdError`, `crossMarketDivergence`). The first pass's `leap-aggregation` greenfield module would duplicate it. The second-pass spec is a **LEAP upgrade to the existing module**:
1. **Prior term**: add `π_0` — the engine's pregame model probability (or the BT rating price from Paper 1) — with weight `α`. The paper's ablation says this is the single most important term; the current module has no prior, only source likelihoods.
2. **Reliability shrinkage**: shrink per-source weights toward equal weighting when the source's track record is thin — the engine's σ-from-reliability mapping already does this implicitly via `sampleSize`; make the shrinkage explicit and tunable.
3. **Tempering `η`**: a single global temperature on the log-likelihood sum, fit out-of-sample. The current module is effectively η=1; tempering is the calibration knob.
4. **LOO contribution audit**: per-source `ΔfairProb` on removal, logged per event — this is genuinely new vs. the current module and directly serves the expert-dominance detector (Paper 6).
5. **Dependency clustering**: sources sharing a book family or data vendor get clustered (their σ's don't add in quadrature). Maps to the deliberative paper's diversity gate (Paper 6): clusters are the operational definition of "family."

### Reproducible test
Backtest on settled picks with ≥3 sources/event: LEAP-upgraded ensemble vs. current precision-weighted ensemble on Brier/log-loss, paired per-event Wilcoxon. Assert ≥1% Brier improvement at p < 0.05 AND the prior-ablation replicates the paper's finding (no-prior version ≤ baseline). The ablation is the honesty check — if the prior doesn't carry weight in GSE's data, the paper's headline doesn't transfer.

### Improvement path
1. Learn `η` per market type (spreads vs totals vs props) rather than globally.
2. Time-varying reliability: source weights as a state-space model instead of static σ mapping.
3. Prior hierarchy: BT price → engine model → market, as nested priors with their own α's.

---

## Paper 5 — 2609.07617 — Forecasting the Winner of a Live Tennis Match

**First-pass verdict:** ADAPT. **Second pass: ADAPT, confirmed — with the acceptance gate rewritten around a diagnostic the program already owns.**

### Method (verified)
Live win-probability from tennis point data: Bayesian pseudo-count shrinkage of live rates toward pregame priors `θ̂ = (n·r + κ·π)/(n + κ)`; stacking of structural and live models in a gradient-boosted meta-learner over probabilities, logits, differences, and state features; chronological train/validation/test with log-loss and calibration as primary metrics.

### Math
- Pseudo-count shrinkage: `θ̂ = (n·r + κ·π)/(n + κ)` — live rate `r` on `n` observations shrunk toward pregame prior `π` with strength `κ`.
- Stacking in logit space: the meta-learner sees probabilities AND logits AND their differences — the first pass correctly flagged logit-space as the load-bearing choice (probabilities saturate; logits don't).

### Datasets
~1.5M point states from 8,222 tennis matches. The first pass's adversarial notes stand: correlated states sharing one outcome; checkpoint progress uses ex-post total points (leakage); separately tuned checkpoint models overfit a small validation year.

### GSE application (corrected)
Live NFL win-probability updater: shrunk live rates + structural/model outputs stacked in logit space. Second-pass corrections:
1. **The checkpoint-progress leakage must be designed out, not just noted**: the live state may only use information available at that game clock (score differential, down/distance/field position, timeouts, pregame line). Total-points or final-score-derived features are banned by construction — enforce with a feature-registry allowlist, not reviewer discipline.
2. **Acceptance gate**: the program already owns the right diagnostic — 2601.18774 (Blown Lead Paradox, phase-1 ADAPT): the pathwise calibration benchmark and PIT diagnostic for win-probability feeds, validated on 2018–2024 NFL data. The live updater's gate is: no departure from the pathwise benchmark on a held-out NFL season + log-loss improvement over the pregame prior alone. The first pass didn't connect these two papers; they are the same lane (live WP build + live WP audit).
3. **Shrinkage strength `κ` as a function of game clock**: early-game live rates are nearly pure noise (small n) — κ should be large early and decay as n grows. The paper's fixed κ is the naive version; clock-dependent κ(t) is the GSE improvement, and it's testable (fit κ(t) on chronological validation).
4. The correlated-states problem (1.5M states, 8,222 outcomes) has an engine-side answer: `oos-split.ts` implements group-out splitting — validate the live model with **leave-one-game-out**, never random row splits. This is also Paper 7's validation-discipline extraction; three papers converge on the same rule.

### Reproducible test
Chronological backtest on NFL play-by-play: train through season Y, test season Y+1. Assert: (a) log-loss < pregame-prior-only baseline, paired per-game p < 0.05; (b) calibration curve within the Blown-Lead pathwise benchmark bands (no systematic excess of extreme losing-team peaks); (c) κ(t) fit shows monotone decay (sanity: the model actually learns to trust live data late).

### Improvement path
1. Market-microstructure features: live line movement as a state feature (separating pregame market info from in-play updates, per 2605.16066 which the program has staged).
2. The denoised-rate audit (Paper 3) applied to live states: score live calibration against state-conditioned empirical rates for (down, distance, score diff, time) bins.
3. Non-convergence/dispersion from the deliberative protocol (Paper 6) as a live-uncertainty input — high source disagreement mid-game damps stake sizing.

---

## Paper 6 — 2609.22497 — The Wisdom of Artificial Deliberative Crowds

**First-pass verdict:** ADAPT. **Second pass: ADAPT, confirmed — re-sequenced behind the ledger, and reconciled with LEAP instead of duplicating it.**

### Method (verified)
Three-stage protocol — independent estimates (i1) → consensus-seeking deliberation rounds (c) → post-deliberation revision (i2) — over *diverse* sources. Within-group paired Cohen's d = 0.25–0.49 across four domains; Study 4 (44 World Cup events) deliberative crowd ≈ real-money Polymarket (BF₀₁ = 3.63 for the null). Clone (homogeneous) groups gain nothing (d ≈ 0.06–0.14, n.s.); the best single model beats the crowd in 3/4 domains but its identity isn't knowable ex ante.

### Math
No closed-form estimator; the statistics are Bayes factors (JZS prior, r = √2/2) and paired Wilcoxon tests. The transferable formalism is the *protocol*, not an equation — plus the diversity gate (reject single-family ensembles) and the expert-dominance detector (per-market-type rolling comparison of best source vs. consensus).

### Datasets
Four studies: jar estimation, NeurIPS peer review, AI-safety monitoring, 44 World Cup events vs Polymarket. The first pass's adversarial notes (convergence-pressure artifacts, i2 anchoring, favorite-heavy event set) all stand.

### GSE application (corrected — two material changes)
1. **Re-sequencing**: the first-pass spec routes the deliberation through "earned-weight machinery" in `source-reliability`/`synthetic-fade`. But `source-reliability.ts` is a **stub** returning `INSUFFICIENT_DATA` until the SignalLedgerEvent (feat/ledger) PR merges. The deliberative protocol's reliability weights and expert-dominance detector cannot be built before the ledger exists. Build order: (a) ledger lands → (b) source-reliability fills in with real hit-rate/CLV rollups → (c) deliberative protocol consumes per-source reliability. What *can* be built now: the diversity gate (family tagging on `IndependentEstimate`) and the deterministic revision loop with static weights.
2. **Reconciliation with LEAP (Paper 4)**: the first pass specified two separate aggregation modules. The second pass merges them: the **deliberative protocol is the outer loop** (independent → revise → converge → revise), and **LEAP's tempered Bayesian update is the revision math inside each round** (sources move toward the cluster-adjusted, prior-anchored posterior, not toward a raw median). The existing `multi-market-ensemble.ts` is round one's aggregation; LEAP's prior + tempering + LOO audit are the upgrades; the deliberative rounds are the new outer iteration. One module, not three.

Concretely: `deliberative-ensemble.ts` as specified in the first pass (stages i1/c/i2, `DeliberativeEnsemble` output shape with convergence/dispersion) is kept, but the Stage-c revision becomes `p_s ← LEAP-update(p_s, cluster_posterior, α, η)` instead of the first pass's median-reversion, and the expert-dominance detector is marked `BLOCKED_ON_LEDGER` with its interface defined now (per-market-type rolling Brier comparison, Wilcoxon p < 0.05 over ≥50 events) so it can be filled in without redesign.

### Reproducible test
First-pass test stands (paired deliberation-vs-mean Brier, clone-control null, <50 ms/event), with one addition: the **LEAP-ablation** — deliberation with LEAP revision vs. deliberation with median revision, isolating whether the Bayesian revision math adds anything over the protocol alone. If it doesn't, ship the simpler version.

### Improvement path
1. Rationale-conditional revision (first pass's idea, kept): sources revise only the components their rationale doesn't cover.
2. Market-as-member with adversarial role (kept): the decisive NFL test — deliberative crowd vs. market-member alone on sharp NFL lines.
3. Dispersion-as-staking-input (kept): non-convergence damps Kelly sizing.
4. i2-anchoring guard: post-deliberation values are quarantined from calibration training data (the paper's 82–93% exact-consensus-reproduction is an anchoring warning the first pass caught and the second pass keeps).

---

## Paper 7 — 2609.23158 — 77 GHz FMCW radar skin-state monitoring — REJECT (stands)

**First-pass verdict:** REJECT. **Second-pass reassessment** (`docs/arxiv-program/research/2026-09-26/arxiv-deep/2609.23158-radar-second-pass.md`): **REJECT stands.** n=15, no ground truth, amplitude confound, environmental drift — unrebutted. It does not count toward the 750 target.

**What the second pass salvaged (none of it needs radar hardware):**
1. **Physiological-load signal class** — athlete physiological state is real, variable, and unpriced; build proxies from workload/rest/travel observables for props. Status: hypothesis, no backtest — next step is a historical load-proxy vs. prop-outcome study, not engine integration.
2. **WST spike test** — Kymatio 1D scattering on line-movement/EPA sequences vs. simple features, group-out validation, pass gate = +0.02 OOS AUC concentrated in non-zeroth-order coefficients. Specified, unexecuted.
3. **Order-contribution interpretability** — decompose every model's power by scale/source; "are your features just amplitude?" as a standing model-review checklist item.
4. **Group-out validation discipline** — the paper's 99.28%→91.55% random-CV→LOSO gap as the cautionary exhibit for `oos-split.ts`'s group-out design. Three papers in this batch (tennis states, radar chirps, live WP) converge on: **never random-split sequential/grouped data.**

---

## Cross-paper corrections ledger

| # | First-pass claim | Second-pass correction | Evidence |
|---|---|---|---|
| 1 | Engine modules "do not exist" at the named paths | All six exist (`*.ts`, with `__tests__/`) at `packages/prediction-engine/src/` | `git ls-tree FETCH_HEAD` |
| 2 | Specs route through working source-reliability | `source-reliability.ts` is a stub (`INSUFFICIENT_DATA`) pending feat/ledger | file contents |
| 3 | LEAP and deliberative ensemble as separate modules | One upgrade path: deliberative outer loop + LEAP revision math, over existing `multi-market-ensemble.ts` | interface overlap |
| 4 | Rate-audit as a new module | Delta to existing `calibration-ladder.ts` (Platt + Wilson-binned + time-ordered selection already there) | file contents |
| 5 | Tennis live-WP spec standalone | Acceptance gate is the Blown-Lead pathwise benchmark (2601.18774, already in program) | program tracker |
| 6 | Seven independent builds | One pipeline: ingest → strength → aggregate → calibrate → live, plus four cross-cutting disciplines | architecture doc |
| 7 | First-pass ledgers filed under `docs/dfs/research/` | Program material belongs under `docs/arxiv-program/research/` (reorg bucket rule) | reorg branch |

---

*Second pass completed 2026-09-27. All engine-interface claims verified against remote tip `b3c0ea032` (`motif/repo-bucket-reorg-2026-09-27`).*
