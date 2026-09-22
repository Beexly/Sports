# 1820 Flexible marked spatio-temporal point processes with applications to event sequences from association football (arXiv:2103.04647v3)

**Citation:** Santhosh Narayanan, Ioannis Kosmidis, and Petros Dellaportas (2022). *Flexible marked spatio-temporal point processes with applications to event sequences from association football*. arXiv:2103.04647v3 [stat.AP], 17 Oct 2022 (v1: 8 Mar 2021; v2: 4 Jan 2022). URL: https://arxiv.org/abs/2103.04647
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 31 pages, all sections including model evaluation, explanatory modelling, model-based predictions, discussion, supporting materials, and references).
**Verdict:** ADAPT — the decoupled marks/times Hawkes framework gives GSE a rigorous, fully Bayesian blueprint for live in-play event-sequence modeling, but it must be re-fit to an NFL event schema before it produces anything product-usable.
**arXiv ID (normalized):** 2103.04647

## 1. Citation + explicit full-text-read statement

Santhosh Narayanan, Ioannis Kosmidis, and Petros Dellaportas (2022). *Flexible marked spatio-temporal point processes with applications to event sequences from association football*. arXiv:2103.04647v3 [stat.AP], 17 Oct 2022. I read the complete PDF (31 pages): introduction, data description and preparation, marked Hawkes limitations analysis (Ripley K-function and inter-arrival CDF diagnostics), the flexible specification (Sections 4–5), Bayesian modelling with all four excitation models plus two baselines, training/evaluation results (Section 6), model-based prediction (Section 7), discussion, supporting-materials notes, and references. Base arXiv ID normalized by stripping the trailing version: **2103.04647**. Dedup confirmed free across ledger-tracker-750.jsonl, wave4-dedup-baseids.txt, wave4b-dedup-baseids.txt, all arxiv-deep ledger headers, state/done-ids.txt, and the existing-research map.

## 2. Research question

The paper asks: how can we model an entire in-game event sequence (times, types, locations) as a mechanistic point process that retains the Hawkes property of event-type excitation (one event changes the probability of *what* comes next) while dropping the Hawkes property of temporal clustering (one event changes *when* the next event comes) — since the authors show empirically that football event times do not cluster, and in fact are slightly under-dispersed relative to a Poisson process? A secondary question: can the resulting Bayesian framework recover interpretable team-ability parameters, home-advantage quantities, and real-time event probabilities (e.g., a shot in the next 30 seconds) from event data alone?

## 3. Method / model

The core trick is a Cox (1975)-style factorization of the marked point process likelihood: L = Π g(ti | Fti−1; ζ) f(mi | ti, Fti−1; θ) {1 − G(T|Ftn; ζ)}, with an optional spatial term h(zi | ti, Fti−1; η). The mark PMF f(·) is *derived* from the conditional intensity of a marked Hawkes process with exponential decay, f(mi | ti, Fti−1; θ) = λ∗(ti, mi) / Σm λ∗(ti, m), giving expression (5): [δmi + Σ_{tj<ti} α∗ e^{−β(ti−tj)} γ_{mj→mi}] / [1 + Σ_{tj<ti} α∗ e^{−β(ti−tj)}], where α∗ = εβ/µ (μ and ε are not separately identifiable from marks alone). This keeps excitation in the mark dimension and frees the time model to be anything. Four mark models are fit: **Sβ** (scalar decay β), **Vβ** (mark-specific decay βm), **Mβ** (mark-pair × zone-specific decay β_{m→m′|z}, zone-specific δ and γ), and **MβA** (Mβ plus team-ability parameters ωcm in baseline-category logits for conversion rates). Times are modeled as mark-conditional Gamma inter-arrivals: tsi − ts,i−1 | msi−1 ∼ Gamma(amsi−1, bmsi−1). Locations are a discrete first-order Markov chain η over Z = 3 pitch zones. Baselines: **FOMC** (first-order Markov chain on marks) and **MSTHP** (marked spatio-temporal homogeneous Poisson). An association-rule screening (window W ∈ {5,10}, top-N ∈ {50,100} pairs per zone) prunes the Mβ/MβA parameter space before Stan HMC sampling. Inference uses Stan's NUTS (4 chains, 500 post-warmup iterations each, R̂ < 1.1); location parameters are conjugate Dirichlet posteriors obtained analytically.

## 4. Mathematics / equations / assumptions

Key equations, quoted with the paper's numbering:
- (1) λ∗(t, m) = λ∗g(t) f∗(m | t): marked point process conditional intensity factorization.
- (2) λ∗(t, m) = µδm + Σ_{tj<t} εβ e^{−β(t−tj)} γ_{mj→m}: marked Hawkes intensity with background δm, excitation factor ε, decay β, conversion γ_{mj→m} ∈ (0,1), Σm γ_{mj→m} = 1.
- (3) K̂(t) = (T/2n²) Σ_i Σ_{j≠i} wij 1(|ti−tj| ≤ t): Ripley K-function estimator for the clustering diagnostic.
- (4) L(Ftn | ζ,θ) = Π_{i=1..n} g(ti | Fti−1; ζ) f(mi | ti, Fti−1; θ) {1 − G(T | Ftn; ζ)}: the decoupled likelihood.
- (5) f(mi | ti, Fti−1; θ) = [δmi + Σ_{tj<ti} α∗ e^{−β(ti−tj)} γ_{mj→mi}] / [1 + Σ_{tj<ti} α∗ e^{−β(ti−tj)}], α∗ = εβ/µ.
- (6) log(γ_{mj→m} / γ_{mj→M}) = φ_{mj→m} + ωm′ x: baseline-category logit for covariate-driven conversion.
- (8) tsi − ts,i−1 | msi−1, a, b ∼ Gamma(amsi−1, bmsi−1): mark-conditional Gamma inter-arrival.
- (10)–(12) Sβ, Vβ, Mβ mark PMFs with scalar / vector / mark-pair×zone decays.
- (13) log(γ_{msj→m|z}(c) / γ_{msj→M|z}(c)) = φ_{msj→m|z} + ωcm: team-ability logit, ωcm = ability of team c to convert to mark m (West Ham set to 0 for identifiability).
- (14) lpdᶜ = Σ_{(t,z,m)∈X(test)} log( (1/R) Σ_r L(t,z,m | Ft−, ζ^(r), η^(r), θ^(r)) ): log pointwise predictive density on held-out test data.
- (17) P(usi = 0 | Ftsi), P(usi = j | Ftsi): posterior branching-structure probabilities (immigrant vs. offspring of prior event j) — the hidden genealogy of each event.
- Priors: Exp(0.01) on Gamma shape/rate; Dirichlet(1) on δ and location vectors (concentration ν value not stated numerically in text); Exp(0.1) on decay rates; Normal(0,10) on α, φ, ω; Dirichlet on γ conversion rows.

Assumptions stated in the paper: S independent game-period processes; filtration conditionality holds; time/location/mark parameter blocks share no parameters so posteriors factor and are sampled separately; first event of each game period treated as deterministic (not modeled); game periods are exchangeable (likelihood invariant to ordering — acknowledged as a limitation); zone Markov chain is first-order; association-rule screening captures the true support of significant interactions.

## 5. Dataset / schema

- **Source:** Stratagem Technologies Ltd; all touch-ball events from the 2013/14 English Premier League season (20 teams, 380 games).
- **Raw scale:** 500,000+ touch-ball events across 22 raw event types (Pass 376,924 … CrossNotClaimed 81). Raw data proprietary; data-cleaning workflow documented in the public PhD thesis (Narayanan 2021, §5.3), which fixed impossible event sequences.
- **Prepared schema:** M = 30 composite marks (15 home-prefixed + 15 away-prefixed: Win, Dribble, Pass S, Pass U, Shot, Keeper, Save, Clear, Lose, Goal, Foul, Out Throw, Out GK, Out Corner, Pass O), Z = 3 pitch zones (1 = home-defensive, 2 = midfield, 3 = home-attacking), per-event (i, game period id, team id, time ti, zone zi, mark mi). Example: 27,660 events used in training.
- **Split:** training = first 20 games of the season (17/08/2013–26/08/2013), S = 40 game periods, 27,660 events (each of the 20 teams plays exactly one home and one away — the minimum for ability identifiability); test = the 5 games immediately after (31/08/2013–01/09/2013), S = 10 periods.
- **Zone-wise training counts (Table 5):** e.g., Home Pass S = 1,699 / 4,633 / 1,658 across zones 1/2/3; Home Shot = 0 / 0 / 292 (all in attacking third); Home Goal = 0 / 0 / 22.

## 6. Features and target

- **"Features":** the filtration F_{ti−} itself — the full history of (time, mark, zone) triples up to the current event — plus process covariates (home/away identity) and the latent team-ability parameters ωcm driving conversion logits.
- **Targets:** (a) the conditional mark distribution f(mi | ti, Fti−1) for the next event type; (b) next-event timing via Gamma(amsi−1, bmsi−1); (c) next-zone via Markov transition η; (d) derived: posterior team-ability rankings ωc,Home Pass S etc., branching probabilities (event genealogy), and simulated P(at least one Home Shot in next 30 s) by forward-simulating the process Q = 100 times per each of R = 500 posterior draws.
- No external engineered feature vector — the model is mechanistic/generative, not a discriminative ML classifier.

## 7. Validation design

- **Held-out test:** the 5 games played 31/08/2013–01/09/2013 immediately after the training window; evaluated with the out-of-sample log pointwise predictive density (lpdᶜ, eq. 14) summed over test events — six models compared head-to-head on the same test set.
- **Baselines:** FOMC (first-order Markov chain marks) and MSTHP (homogeneous Poisson marks) — both conjugate, both including the same Gamma-time and Markov-location components, isolating the value of Hawkes-style excitation.
- **Classification validation:** task = "does at least one Home Shot occur in each 30-second interval," on the first 20 games of the test set (1,959 intervals, 202 positive); ROC AUC of the MβA simulator vs. 10-step, 5-step, 15-step moving-average benchmarks; first 15 intervals of each game excluded so all models have predictions.
- **MCMC diagnostics:** R̂ < 1.1 for all parameters, effective sample sizes reported (some > sample size due to antithetic HMC), trace plots in Supporting Materials; posterior-vs-prior density overlays show minimal prior influence.
- **Ablation of the home-advantage mechanism:** constrained MβA with all mirrored home/away background probabilities set equal (45 fewer parameters) evaluated on the same test lpdᶜ.

## 8. Exact results and baselines with numbers

- **Test lpdᶜ (Table 7), best → worst:** Mβ (W=5, N=100) **−21,342.57** (988 params) → Mβ (W=10, N=100) −21,496.56 (988) → MβA (W=5, N=100) −21,599.81 (1,539) → Vβ −21,829.81 (915) → Sβ −21,838.04 (902) → FOMC −21,898.31 (870) → Mβ (W=5, N=50) −22,152.08 (538) → Mβ (W=10, N=50) −22,288.64 (538) → MSTHP −35,469.50 (90). Every excitation model beats both baselines; the fully zone×pair-specific Mβ wins despite ~1k parameters.
- **Excitation dominance:** 95% HPD interval for exp(α) = **(451.35, 642.54)** — previous occurrences carry ~500× the weight of the background component in the mark PMF.
- **Decay-rate discrimination (95% HPD):** β_{Home Out Corner → Home Pass S|3} = (1.34, 2.36) vs. β_{Home Out Corner → Home Shot|3} = (0.16, 0.44) — corner→pass excitation decays fast, corner→shot excitation persists.
- **Clustering diagnostic:** Ripley K̂(t)−2t for observed football times ranges **−1.4 to −0.9** (slightly under-dispersed vs. Poisson); the MLE-fitted Hawkes has ε̂ = 0.0035 ≈ 0 — the fitted Hawkes collapses to Poisson, motivating the decoupling.
- **Shot prediction AUC:** MβA simulator **0.67** vs. MA-5 0.48, MA-10 0.49, MA-15 0.50; in the Arsenal–Tottenham illustration, the model beats the MA-10 benchmark in 11 of 15 intervals containing an observed Home Shot.
- **Home advantage:** background mark probabilities are home/away symmetric (constrained MβA test lpdᶜ = **−21,589.28** vs. full MβA −21,599.81 — the constrained model wins), so home advantage lives in the *conversion/ability* parameters, not the background; e.g., Man Utd's Win→Pass S and Pass S→Pass S conversions are higher at home (Table 9), and >50% of teams' posterior log-odds ratios for home vs. away possession retention are > 0.
- **Ability rankings (trained on 20/380 games):** cumulative passing ability ranks Man City #1 … West Ham #20 (Table 10a), which tracks the actual 2013/14 final table (Man City champions). Man Utd ranked #1 in home pass-ability but drops sharply in away pass-ability (Figure 8). Cardiff City vs. Norwich City have near-identical raw shot counts (18 vs. 19 in training) but sit at opposite ends of the cumulative shot-ability ranking — capturing attack-style differences invisible in raw counts.
- **Branching structure (Figure 10):** posterior means show a Home Shot is more likely an offspring of the earlier Home Out Corner than of the more recent Home Pass S — long-range dependence the model captures.

## 9. Code / data availability

- **Code:** full pipeline plus Stan templates at https://github.com/ForeStats/flexible-msttp-football, including the association-rule screening and guidance for applying the method to the public StatsBomb 2020/21 FA Women's Super League open-data set.
- **Data:** raw EPL 2013/14 touch-ball data are proprietary (Stratagem Technologies Ltd) and cannot be disclosed; cleaned/proprietary schema is fully specified in the paper (Tables 1–5), and the code is designed to run on the free StatsBomb open data.
- **Reproducibility:** model code is public; replicating the exact numbers requires the proprietary Stratagem data, but the framework is re-fittable to any annotated event stream (including NFL play-by-play-derived event sequences).

## 10. Leakage and limitations

- **No explicit look-ahead leakage:** the test window strictly follows the training window in calendar time, and predictions condition only on the filtration up to (not including) the forecast interval — a genuinely prospective evaluation for the within-season setting.
- **Limitations (paper-acknowledged):** (a) game periods are exchangeable — the likelihood is invariant to ordering, so no within-season drift in team abilities is modeled; the authors call time-varying ω the natural extension. (b) Team abilities are estimated from a *single* home and away game per team — minimum identifiability; MβA's underperformance vs. Mβ is attributed to this. (c) Association-rule screening with arbitrary (W, N) silently drops parameters — untested sensitivity to W/N choices. (d) Computational cost forced use of only 20 of 380 games; authors target variational inference as the fix. (e) First event of each period treated as deterministic; Gamma time model is mark-conditional only (no covariate or ability effects on timing). (f) The constrained-background finding (no home advantage in δ) rests on one Bayes-factor-substitute test. (g) Soccer-specific: event rates and game structure differ substantially from NFL, so parameters do not transfer — only the method does.

## 11. GSE overlap

- **New territory:** the corpus gap list flags Hawkes/self-exciting models as essentially absent from GSE's research; this paper is the cleanest full Bayesian implementation of a Hawkes-like event model in sports. It does not duplicate iWinRNFL (in-game win probability) or the marked point-process NFL work already in corpus — its decoupled marks/times factorization is a distinct, more flexible specification.
- **GSE use case:** live in-play modeling for NFL — e.g., predicting next-play-type distributions, drive-continuation probabilities, or touchdown-in-current-drive probabilities from an event stream of (down, distance, play type, field zone, team abilities). The branching-structure recovery (which prior play "caused" the current event) is a narrative + prop-marketing tool ("the offense's last 3 plays made a TD 2.4× more likely than baseline").
- **Not in corpus:** no GSE module currently models whole-game event *sequences* generatively; this gives one with interpretable team-ability outputs and uncertainty quantification via posterior draws.

## 12. Implementation specification

1. **Build an NFL event schema** analogous to the paper's 30 marks: map (down-group, play type, success/failure, turnover, penalty, score-event) × offense/defense to ~24–30 composite marks; discretize the field into 3–5 zones (red zone / midfield / own territory, or by expected-points band).
2. **Assemble event sequences** from nflfastR/nflverse play-by-play (times = game clock converted to continuous seconds, marks, zones, teams); treat each game-half as an independent "game period."
3. **Implement the decoupled likelihood** in Stan (the paper's templates are public): Gamma inter-arrival times conditional on previous mark (8), first-order Markov zones (9), and mark PMFs with mark-pair×zone-specific decays (Mβ, eq. 12). Start with Sβ/Vβ for speed, graduate to screened Mβ.
4. **Team abilities:** replicate the baseline-category logit (13) with ωcm per team per key mark (pass-success, explosive-play, turnover conversion), reference-team-identified; this yields per-event-type team strength rankings parallel to the paper's Table 10.
5. **Association-rule screening** (W = 5, N = 100 as the paper's best setting) to prune the decay/conversion tensor before HMC.
6. **Real-time simulator:** forward-simulate Q = 100 event streams per posterior draw over a rolling horizon (e.g., next 2 minutes of game clock) to produce P(turnover | history), P(TD on this drive | history), P(next play is a pass | history) — feed these into the existing in-play pricing / CLV engine.
7. **Diagnostics gate:** require R̂ < 1.1 on all ω and decay parameters and a lpdᶜ win over an FOMC baseline on a held-out week block before any production use.

## 13. Reproducible test

- **Test A (fit):** take one full NFL week of nflverse PBP (≈14–16 games), map to the composite-mark schema, fit the Sβ model in Stan with the paper's priors; assert all R̂ < 1.1 and effective sample sizes > 400 for ability parameters, replicating the paper's Section 6.1 convergence bar.
- **Test B (predictive gain):** hold out the following week's games; compute lpdᶜ (eq. 14) for the fitted Sβ model vs. an FOMC baseline with identical time/location components; PASS if Sβ wins by ≥ 1.0 per 1,000 events (≈ the paper's Sβ–FOMC gap of 60.27 over 27,660 events ≈ 2.2/1k).
- **Test C (interval classification):** task = "does a turnover/score event occur in the next 2-minute game-clock window" on held-out games; compare the simulator's ROC AUC vs. a 10-window moving-average benchmark; PASS if AUC exceeds the benchmark by ≥ 0.10 (paper achieved 0.67 vs. ~0.49).

## 14. Numeric acceptance / rejection gate + improvement experiment

- **Gate (ADAPT stays ADAPT):** Tests A–C pass at the thresholds above on real NFL data *and* the per-event-type team-ability rankings correlate (Spearman ρ ≥ 0.5) with independent season performance measures (e.g., offensive EPA rankings). If the lpdᶜ gap vs. FOMC is < 0.5 per 1,000 events, the NFL event stream carries no Hawkes-like excitation worth the complexity → **REJECT** the NFL adaptation (the paper keeps its soccer value, but it contributes nothing to GSE).
- **Improvement experiment:** extend MβA to *time-varying* team abilities ωcm(t) via a random-walk prior (the paper's stated future work) so abilities drift across the NFL season instead of being exchangeable; re-run Test B with and without the random-walk component. Hypothesis: time-varying abilities add ≥ 1.0 lpdᶜ per 1,000 events over static abilities on weeks 5–18, capturing in-season form changes (injuries, QB changes) the static model cannot. A second experiment: replace the mark-conditional Gamma with a Gamma whose rate is modulated by the current ability differential, testing whether "stronger team in possession" also predicts tempo, not just event type.

**Verdict:** ADAPT — the decoupled marks/times Hawkes framework is a fully specified, honestly validated, and code-public Bayesian engine for in-play event sequences, but every number in it is soccer; GSE must re-derive it on an NFL event schema and pass the three reproducible tests before any part of it touches production.
