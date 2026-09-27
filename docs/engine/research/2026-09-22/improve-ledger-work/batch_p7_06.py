import json

idx = {i: r for i, r in enumerate(json.load(open("/home/hatch/workspace/improve-ledger-work/index-fields-p7b.json")), start=79)}

d = {
127: dict(improvement="Clone the McByte++ training-free long-term tracking stack and run it on a sample of NFL broadcast/All-22 plays (football-tuned detector boxes) as the ingestion front end for broadcast-derived tracking, feeding tracklets into GSE's content overlays and the STRAIN pressure / SAIL-for-NFL analytics lanes where NGS tracking is unavailable.",
        gate="ADOPT for the content/analytics pipeline if McByte++ reduces ID switches vs ByteTrack by >=40% at >=8 FPS on the 50-play set; REJECT if IDF1 is within 5 points of ByteTrack (no meaningful long-term gain) or FPS < 5 on available hardware.",
        owner="Hermes", effort="medium"),
128: dict(improvement="Adopt the paper's probability-display discipline as engine-honesty infrastructure on every GSE posted pick and website surface: always label 'model probability' vs 'market-implied probability' vs 'price' as three distinct numbers, show line source/timestamp/liquidity caveat, state settlement rules, and pair every probability chart with a one-line plain-language context.",
        gate="ADOPT the display rules if the labeled format reduces clarification-question replies by >=25% vs control with no drop in engagement rate; reject if the extra labels reduce engagement (clutter cost exceeds comprehension gain).",
        owner="Hermes", effort="small"),
129: dict(improvement="Add 10 dummy count indicators (1-5 excluded low-minute players per lineup side) to GSE's RAPM-style player-rating layer with the paper's 2.2 dummy/player ridge-penalty ratio as the starting point, pooling replacement-level production for rotation/injury adjustment instead of dropping low-minute players.",
        gate="Gate (ADAPT): replicate the paper's pipeline on one NBA season of GSE data with the chronological split; accept if Dummy RAPM RMSE < Filtered RAPM RMSE on the outer test with the improvement direction matching in >= 70% of seasons tested; improvement path = learned per-player replacement-level propensity, success = outer-test RMSE reduction >= 0.06 with the same chronological protocol.",
        owner="Mimo", effort="medium"),
130: dict(improvement="Port the EDGE directed calibration test (Algorithm 1) into the GSE engine and run it as a weekly QC job over season-to-date published moneyline probabilities and outcomes, so smooth monotone miscalibration triggers a recalibration map and rough misfit triggers a feature revisit.",
        gate="ADOPT into the weekly QC pipeline if the distorted-copy test rejects at p<0.05 AND the directed test fires on the real engine at least once on a known-bad historical window; REJECT the port if it cannot distinguish the distorted copy from the original at 5% on >=500 games.",
        owner="Mimo", effort="medium"),
131: dict(improvement="Switch the engine's conformal/CPIT calibration splits to a diversity selector that, given a budget of N games, selects the N whose pooled nonconformity scores maximize p95-p5, applied first to early-season weeks 1-6 where data scarcity is worst.",
        gate="ADOPT the diversity selector for early-season calibration if on 2022-2024 it raises 90%-interval coverage >=5 points vs the trailing-window baseline with mean width increase <=30%; otherwise keep trailing windows and log the paper's rule as a diagnostic.",
        owner="Mimo", effort="small"),
132: dict(improvement="Build a point-in-time feature-consistency harness for GSE's NFL feature store: a feature DSL compiled to both batch-SQL and live-serving backends, with perturb-the-future property tests and the paper's three known defect classes as regression cases, so no serving-format conversion ever ships on a parity failure.",
        gate="ADOPT the invariant-testing mechanism iff: (i) the harness catches all three injected defect classes (3/3 recall), AND (ii) batch-vs-online agreement is 100% on the 2024 season replay, AND (iii) any serving-format conversion shows >=99.9% decision agreement at the deployed threshold; REJECT the conversion on any parity failure.",
        owner="Hermes", effort="medium"),
133: dict(improvement="Build GSE KellyBoost for Sunday simultaneous pick portfolios: training rows = historical slates with engine features per pick and realized net-profit-per-unit vectors, a multi-output XGBoost with softmax outputs over K picks plus a cash leg trained on the negative log-growth loss, the CRRA risk-aversion dial tuned on walk-forward selection, and a K_ens=4 leave-one-out ensemble at deploy time.",
        gate="Gate: ADOPT the CRRA-dialed KellyBoost portfolio layer if, on the 2023-2025 NFL walk-forward, it beats independent 1/4-Kelly staking by >= +0.05 mean log-growth per week with max drawdown no worse than 1.2x the baseline's, and the paired weekly difference has bootstrap Pr(Delta>0) >= 0.80; REJECT (keep flat/independent Kelly) otherwise.",
        owner="Mimo", effort="medium"),
134: dict(improvement="Build a SAIL-for-NFL prototype that learns disentangled player-skill embeddings from NGS tracking snippets (participant = player-season, context = coverage shell/down-distance/field zone) with expert/novice bases and an adversarial team-vs-scheme decomposition, conditioning GSE's prop models on matchup-adjusted skill rather than raw stats.",
        gate="ADOPT the SAIL-NFL architecture for prop-model conditioning if on the 2023-2024 WR test: test-retest >= 0.90, in-context RMSE beats the AE baseline by >=15% relative, and AR >= 2.0; REJECT if embeddings are no more stable than per-game AE embeddings (test-retest gap < 0.05) or AR < 1.2.",
        owner="Hermes", effort="medium"),
135: dict(improvement="Build gse.validation.minerva as a statistical robustness grade for every mined GSE signal: DSR deflated by the actual candidate count, PBO over season partitions, SPA vs the benchmark signal set, MinTRL, and a regime composite, with seal thresholds recalibrated once N > 1,000 scored signals, so only signals that survive the full robustness battery reach production.",
        gate="ADOPT if on permuted-label nulls the sports MinervaScore achieves AUROC >= 0.95 separating null from historically-profitable signals AND the Seal's pass rate on null signals is <= 5% (false-seal control); REJECT (fall back to plain deflated-Sharpe + PBO) if the aggregation adds no discrimination over DSR-alone.",
        owner="Mimo", effort="medium"),
136: dict(improvement="Add an AC ordinal rating head to GSE's spread/total engine for cover/push/no-cover outcomes with constant-sum slopes, MAP plus Gaussian prior, and a home boost, running the schedule-equivalence audit (standings order vs model-rating reorder rate) as publishable GSE content alongside it.",
        gate="ADOPT the AC ordinal head for GSE's spread/total engine if on 2020-2024 NFL seasons the AC model's out-of-sample log loss on (cover/push/no-cover) is <= the best single binary baseline and the fitted slopes are within 2 SE of uniform (then use uniform with zero estimation cost); REJECT if AC underperforms binary logistics by >0.005 nats.",
        owner="Mimo", effort="medium"),
137: dict(improvement="Build a four-sub-model availability-discount module (wellness, injury risk, physical capability, style/exposure sub-models on public proxies, integrated via MLR against a next-4-week games-missed proxy label) with a calibrated style-exposure penalty multiplier, feeding GSE's fantasy/prop projections and live availability discounting.",
        gate="ADAPT the four-sub-model + learned-integration architecture now. ADOPT for live availability discounting only if the out-of-sample ARS-missed-games correlation >= 0.25 and the style-exposure penalty improves it over the unpenalized score; otherwise REJECT the live use and keep it as a research prototype.",
        owner="Mimo", effort="medium"),
138: dict(improvement="Implement the HypoForge split inside GSE's Motif-lab discovery loop: arm A with per-hypothesis feedback vs arm B with batch/distribution-level feedback, plus a testing playbook that accumulates failure-preventing skills, so the discovery agent learns from outcome distributions rather than single instances.",
        gate="ADOPT if: arm B's batch hit-rate >= 2x arm A's per-hypothesis rate, the testing playbook accumulates >=5 distinct non-duplicate skills in 4 weeks that each prevent a repeated failure mode at least once, and transfer holds (fresh-hypothesis first-batch quality improves >=20%); REJECT if batch feedback ~= per-hypothesis feedback or the playbook fills with tautologies.",
        owner="Motif-lab", effort="medium"),
139: dict(improvement="Run a GSE metric-redundancy audit over the 32-team x 15-26 metric-family matrix from gse-lab CSVs (2015-2025), collapsing substitute pairs with Spearman rho > 0.8 and forward-selecting a minimal edge-sheet metric core of <=6 metrics, so the published edge sheet carries no duplicated information.",
        gate="ADOPT the pruned metric core if: (a) the core (<=6 metrics) achieves >=95% of the full suite's out-of-sample predictive correlation on the 2023-2025 window, and (b) >=2 substitute pairs with rho>0.8 are identified and collapsing them moves >=3 teams by >=3 places in the power rating; REJECT if the minimal core needs >10 metrics to reach 95%.",
        owner="Mimo", effort="medium"),
140: dict(improvement="Build a dynamic NFL team-strength module: a weekly BT state-space model with random-walk dynamics, multi-component strength vectors (offense/defense, pass/run) with estimated exchangeable correlation, home-field and format-discrimination parameters, filtered via Glickman-style mean-field plus iterated Laplace updates, with dynasty summaries restricted to fixed-window functionals.",
        gate="Accept the module if on 2000-2025 NFL: (i) out-of-sample (even seasons) Brier <= static BT/Elo baseline after Platt calibration; (ii) calibration slope within [0.9, 1.1] post-fit; (iii) component correlation rho-hat significantly > 0 by prequential likelihood; reject the dynamical component if tau-hat is unidentified or the iterated filter underperforms single-step on simulated recovery.",
        owner="Mimo", effort="medium"),
141: dict(improvement="Implement an online Gibbs weighter over GSE's engine-component game probabilities: log-loss/Brier-normalized losses with exponentiated-gradient simplex updates each week plus Local-UCB over (eta, lambda, variant), running alongside the batch Gibbs stacker as prior for a hybrid weighting layer.",
        gate="ADOPT the online Gibbs weighter if it beats plain exponential weighting by >=0.003 log-loss on 2025 walk-forward (DM p<0.05) and beats or ties the batch Gibbs stacker; REJECT entirely if it cannot beat plain exponential weighting; stability veto: UCB-selected (eta,lambda) changing >50% of weeks requires a smoothing fix before shipping.",
        owner="Mimo", effort="medium"),
142: dict(improvement="Add BIN diagnostics to GSE's model-selection process: fit the Satopaa et al. BIN decomposition on the Brier-score difference between champion and challenger variants, selecting the variant whose gains come from information (portable) rather than noise (fragile) or bias reduction.",
        gate="ADOPT beta-weighted objectives and BIN diagnostics if any non-log variant beats the log-loss champion by >=0.003 Brier on 2025 weeks 1-8 AND the BIN decomposition attributes the gain primarily to the information component (>=50% of the implied Brier improvement); otherwise REJECT - keep log loss as the sole binary objective.",
        owner="Mimo", effort="small"),
143: dict(improvement="Build weather/counterfactual.py: train the game-outcome model with weather features included, then at inference run each game twice - factual weather vs counterfactual neutral references (70F, 5 mph wind, no precip) - so the counterfactual output serves as a weather-neutral team strength for ratings and the factual-minus-counterfactual difference becomes a weather-edge diagnostic for weather-line shopping.",
        gate="ADOPT weather-neutral ratings if counterfactual ratings predict next-game margin with >= 0.3 points lower MAE than factual ratings on 2024 holdout (stability win) AND the weather-edge term has the correct sign on >= 60% of extreme-weather games; REJECT if the counterfactual pass just reproduces the no-weather model.",
        owner="Mimo", effort="medium"),
144: dict(improvement="Build a Pref-MH exact-MCMC slate sampler for GSE's DFS lineup generation: pairwise slate preferences elicited through a BT-consistent judge, with exact sampling from the induced preference distribution replacing temperature-scaled i.i.d. draws.",
        gate="ADAPT (adopt as GSE's slate sampler) if: Pref-MH slates achieve >= 15% higher realized mean score at equal-or-better diversity than i.i.d. p0 draws on walk-forward 2025 weeks, AND the judge passes BT-consistency diagnostics (transitivity >= 95%, vote independence); reject otherwise.",
        owner="Hermes", effort="medium"),
145: dict(improvement="Build a news-fusion layer on the engine's pick pipeline: the quantitative engine probability as prior P0, a fixed timestamped evidence set per game (injury reports, beat-writer blurbs, weather, line moves), LLM-elicited per-item support/opposition likelihoods, and a closed-form tempered Bayesian update yielding a posterior pick probability with per-item LOO deltas as an audit trail.",
        gate="ADOPT if on the 2024-2025 window the posterior achieves Brier improvement >=0.010 over the engine-only forecast AND ECE improves by >=25% relative with no accuracy degradation; REJECT if Brier worsens on the test window or removing the engine prior performs comparably (the LLM evidence adds nothing beyond the prior).",
        owner="Hermes", effort="medium"),
146: dict(improvement="Port MuyBridge's analytic fusion to NFL offline: center-of-mass estimation from broadcast video with sparse anchor fusion, as a template for fusing depth and anchor signals for player kinematics where NGS tracking is unavailable.",
        gate="ADAPT (adopt the NFL port) if: analytic fusion achieves >= 30% relative reduction in range AbsRel vs monocular-depth-only AND vertical CoM error < 60 mm on held-out games; reject otherwise (the anchors don't buy enough over raw depth at NFL broadcast ranges).",
        owner="Hermes", effort="medium"),
147: dict(improvement="Adopt the landmark/unit-alignment evaluation framework and its robustness battery as mandatory discipline for all GSE injury/availability modeling: player-game as the analysis unit, features frozen at weekly checkpoints, player-disjoint folds, cluster bootstrap CIs, leave-one-positive-player-out sensitivity, and checkpoint-by-checkpoint discrimination reports.",
        gate="ADAPT the landmark/unit-alignment framework and the robustness battery as mandatory evaluation discipline; ADOPT TabPFN as a benchmark candidate only; REJECT any GSE model that replicates session-level injury labels across sub-session time units - rebuild it under this framework.",
        owner="Mimo", effort="small"),
148: dict(improvement="Build GSE-Cal, a post-hoc calibration layer for the engine's spread/total/WP outputs: per-bucket empirical residual maps of engine predictions vs outcomes over score/time/weather/referee-crew buckets from nflverse 2015-2025, corrected by a small residual model with a zero-initialized final layer trained with Huber loss on temporal splits.",
        gate="ADOPT the calibration-layer approach if, on the 2024-2025 test window: (a) the layer reduces mean |bias| per state-bucket by >=15% on totals without increasing overall RMSE vs the uncorrected engine, and (b) WFR_5 improves by >=2 percentage points; REJECT if RMSE increases on the test window or the bucketed bias reduction is <10%.",
        owner="Mimo", effort="medium"),
149: dict(improvement="Build a Rollcast analog over team offensive/defensive efficiency time series: anchors from rolling mean/median/extremes/regression endpoints over windows of 6/10/16 games, standardized anchor-displacement states, and a residual archive from similar past states, with a persistence rule that reacts to regime shocks faster than fixed persistence.",
        gate="ADAPT the anchor/persistence components if the prototype's CRPS is within 10% of the engine's current distributions on stable-team stretches AND the persistence rule demonstrably reacts faster to regime shocks (post-injury weeks) than a fixed-persistence baseline; full rollout only after a real-data comparison the paper lacks.",
        owner="Mimo", effort="medium"),
150: dict(improvement="Build a dislocation-plus-impact pipeline over Polymarket/Kalshi NFL signed trades and GSE's own odds-history DB as a sharp-flow sensor: detect price dislocations, estimate impact coefficients, and route next-day consensus-line-direction signals into the engine's market-awareness layer.",
        gate="Adopt the dislocation + impact pipeline as GSE's sharp-flow sensor if, on 2025 NFL Polymarket data, dislocations flagged by the detector predict next-day line direction (sportsbook consensus move) with hit rate >=55% over >=200 events (binomial p < 0.05 vs 50%); reject if the hit rate is indistinguishable from coin-flip or fewer than 25% of NFL tokens yield detectable impact coefficients.",
        owner="Hermes", effort="medium"),
}

recs = []
for n in range(127, 151):
    r = idx[n]
    e = d[n]
    recs.append({
        "arxiv_id": r["arxiv_id"], "title": r["title"], "normalized_lane": r["normalized_lane"],
        "verdict": r["verdict"], "doctrine_tag": r["doctrine_tag"],
        "improvement": e["improvement"], "gate": e["gate"], "owner": e["owner"],
        "bucket": r["buckets"][0], "effort": e["effort"], "depends_on": []
    })

with open("/home/hatch/workspace/improve-ledger-work/part-7.jsonl", "a") as f:
    for r in recs:
        f.write(json.dumps(r) + "\n")
print("wrote", len(recs), "records 127-150")
