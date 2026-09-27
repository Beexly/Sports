import json

idx = {i: r for i, r in enumerate(json.load(open("/home/hatch/workspace/improve-ledger-work/index-fields-p7b.json")), start=79)}

d = {
79: dict(improvement="Add a DR-AS structural volatility forecaster over GSE's odds data (de-vigged consensus p_t, hours-to-kickoff tau_t, cross-book spread s_t as the adverse-selection proxy, book-move-count volume proxy V_t) whose predicted remaining-move scale drives CLV confidence, bet-size scaling, and abstention.",
        gate="ADOPT the structural forecaster if, on the 2025 NFL holdout, DR-AS improves on the GARCH(1,1) baseline by >=15% in volume-weighted interval score with the paired-bootstrap difference significant at 5%. REJECT (keep GARCH or constant vol) if the gain is <10% or insignificant — then cross-book spread is not a sufficient adverse-selection proxy in bookmaker (non-CLOB) markets.",
        owner="Mimo", effort="medium"),
80: dict(improvement="Rank GSE's staking rules (quarter-Kelly, half-Kelly, variance-budgeted Kelly) by the Kelly-gap 1/2||theta - alpha sigma^T pi*||^2 on the Neon picks history, so divergence between realized log-wealth ranking and Kelly-gap ranking isolates estimation error from structural strategy shortfall.",
        gate="Simulated GBM (theta=0.4, sigma=0.2, T=1, 100k paths): for alpha=0.5, the analytic gap 1/2(1-alpha)^2||theta||^2 must match the Monte Carlo mean log-wealth ratio within +-2 standard errors before applying the Kelly-gap ranking to GSE's staking-rule horse race.",
        owner="Mimo", effort="small"),
81: dict(improvement="Add a multi-objective pick-selection layer that fits an MOBT softmax over GSE's posted-vs-skipped and abstained pick pairs to recover Garrett's implicit weights over edge, cover probability, and variance, replacing the scalar pick-score ranking with a Pareto-frontier filter.",
        gate="ADOPT the multi-objective selection layer if on 2025 H1 the MOBT model achieves >=0.05 nats/comparison better test log-likelihood than the scalar BT baseline AND the Pareto-frontier filter on 2025 H2 yields posted-pick CLV >= the scalar-ranking baseline's CLV with no worse cover rate. REJECT if the incomparability labels are uninformative (MOBT ~= BT log-likelihood) or the comparison dataset has <500 usable pairs.",
        owner="Mimo", effort="medium"),
82: dict(improvement="Implement role-anchored centroid-voting imputation (the paper's B4 training-free baseline) as the front end for any GSE broadcast-video tracking lane, benchmarked against the ignore policy on decision-relevant NFL metrics (pre-snap box-count estimate, receiver separation at throw) rather than trajectory fidelity.",
        gate="Adopt B4 (or a better learned variant) into the GSE tracking pipeline if it cuts the decision-relevant NFL metric error to <=50% of the ignore policy on the held-out weeks; reject broadcast-video tracking for that metric (stick to play-by-play sources) if B4 fails to beat the ignore policy.",
        owner="Hermes", effort="medium"),
83: dict(improvement="Make the base-rate honesty harness (excess accuracy vs always-favorite/always-home/always-under plus closing-line baselines, McNemar/DM tests with BH-FDR, frozen versioned artifacts) mandatory for every GSE model evaluation so no model ships on raw hit-rate alone.",
        gate="ADOPT the honesty harness as mandatory for all future GSE model evaluations if it successfully reproduces the paper's base-rate demonstration on the sanity dataset AND flags >=1 currently-believed GSE edge as a base-rate artifact on re-scoring; any model whose only evidence is raw hit-rate without base-rate comparison is automatically REJECTED from live consideration.",
        owner="Mimo", effort="small"),
84: dict(improvement="Apply a time-to-expiry-conditioned (TTE-bucketed power-logit/Platt) calibration map to every GSE market-implied probability before it enters the engine, plus a parlay-specific calibration audit comparing SGP quoted prices against the product of book leg prices.",
        gate="ADAPT the TTE-conditional calibration into GSE's market-implied pipeline if, on one held-out NFL season: (a) the [0,10)-minute bucket gamma-hat differs from the pooled estimate with p<0.05 AND the TTE-conditional map improves log-loss over the pooled map by >=0.005 nats; (b) for parlays, adopt the parlay-specific calibration only if median R deviates from 1.0 by >=2% in the 2-5 leg cells.",
        owner="Mimo", effort="medium"),
85: dict(improvement="Fit the Prelec probability-distortion curve w(p)=exp(-(-ln p)^gamma) from GSE engine probabilities to market-implied probabilities per market segment and switch the EV pipeline's edge selector to the CPT-adjusted edge when the fitted gamma sits significantly below 1.",
        gate="ADAPT into the EV pipeline if: (a) fitted gamma < 1 with 95% CI excluding 1 on the training window AND (b) the CPT-adjusted edge selector beats the naive edge selector by >=2pp ROI on the 2024-2025 holdout. REJECT if gamma ~= 1 or the CPT adjustment adds no ROI — the distortion must be measured, never assumed.",
        owner="Mimo", effort="medium"),
86: dict(improvement="Build a HandoffBench for the GSE agent-bus that plants 2-3 factual anchors in every parent-to-subagent task and measures the Handoff Preservation Rate of returned reports with a calibrated LLM judge, turning anchor loss into a standing reliability metric.",
        gate="ADAPT if: (a) the continuitybench harness reproduces the treatment-vs-baseline CPR gap (treatment >=95%, baseline <=5%); (b) the retry-storm repro shows fixed-interval retries destabilizing and jittered backoff stabilizing; (c) judge calibration on 20 hand-labeled handoff cases reaches >=90% agreement. Adopt HPR as a standing gate only if a pilot shows >=1 anchor-loss event the parent would otherwise not have caught.",
        owner="Hermes", effort="medium"),
87: dict(improvement="Run the paper's 5x2 failure-mode grid as a reliability audit over every hop between GSE code and its model/API providers (OmniRoute routes, odds polling, agent-bus messaging), classifying each hop and fixing the found defects as scheduled ops hardening rather than research.",
        gate="ADAPT if: (a) all three released reproduction scripts reproduce their claimed failure mechanisms on the lab VM (shared-state turn loss; synchronized-retry saturation vs jitter success; index=0 emission), and (b) the grid classifies every surveyed issue example without forcing. This is infrastructure hygiene, not a prediction edge — schedule as ops hardening.",
        owner="Hermes", effort="small"),
88: dict(improvement="Fit the sigma(t,x)=sigma_0+sigma_1(t/T)^eta+sigma_2/(1+x^2) volatility spec to GSE's in-game win-probability paths per sport and add the exposure-skew rule plus the terminal settlement penalty to pick-slate selection so published confidence flattens against directional exposure hardest at coin-flip prices.",
        gate="Adapt the volatility specification and the skew/penalty rules if sigma(t,x) beats constant-volatility on GSE's win-probability paths (AIC) — these are cheap, model-free wins. Do not implement the full HJB quoter unless GSE actually operates a quoting book.",
        owner="Mimo", effort="small"),
89: dict(improvement="Port the CMP spike-and-slab model to NFL team points (starting from the released repo code, adding Dixon-Coles score-dependence and exponential recency weighting) as a challenger to GSE v5.2.7's totals predictions, replacing full MCMC with a Laplace/VI approximation for production.",
        gate="ADOPT into the GSE totals pipeline if CMP-SAS beats the Poisson-Maher baseline on out-of-sample IGN for totals in >=2 of 3 seasons AND identifies >=3 teams/season with P(Z_i=1)>0.5 (dispersion heterogeneity exists in NFL scoring); REJECT if no team crosses the 0.5 threshold in any season or IGN gains vanish.",
        owner="Mimo", effort="medium"),
90: dict(improvement="Adopt the Scoreline partial-credit metric (45 points for the correct outcome class plus margin/total closeness terms) together with availability-aware aggregation and the lock-before-deadline/score-after verification protocol as GSE's internal engine-evaluation and public-pick verification machinery.",
        gate="The gate for GSE: the Scoreline metric must change model-variant rankings vs raw accuracy on GSE's own data (reproducing the paper's RQ1), or it is decorative. Do not adopt the display calibration (eq. 3) for external reporting — report raw scores.",
        owner="Mimo", effort="small"),
91: dict(improvement="Replace GSE's ensemble combiner with an L2 logistic regression over source probabilities that weights by error decorrelation (keeping negatively-weighted sources as contrastive bias corrections) plus pairwise disagreement features, with strict training-cutoff hygiene for all LLM/news-derived features.",
        gate="Learned linear aggregate must beat the arithmetic mean by >=5% Brier on the held-out season, with the error-decorrelation replication r_s >= 0.3, before production. No nonlinear aggregator needed — LR sufficiency is a paper result.",
        owner="Mimo", effort="medium"),
92: dict(improvement="Build a correlation-aware SGP fair-value layer that prices every same-game parlay from GSE's per-leg marginals plus shared pairwise (order<=2) interaction parameters instead of independence multiplication, with hub-concentration exposure throttles against concentrated low-order informed flow.",
        gate="Gate (ADAPT): the correlation-discount mechanism is real and quantified (0.6%-6.2% trader price improvement by order, pooled 0.978; near-zero aggregate maker loss in replay). Improvement: fit the hierarchy on NFL same-game props instead of NBA and extend to order-3 interactions.",
        owner="Hermes", effort="medium"),
93: dict(improvement="Rebuild fandom radii from 2024-2026 X data to geo-target GSE clips and posts, and add pregame/halftime fan-sentiment-arc features (transformer sentiment on sports text, entity-resolved team mentions) to GSE's viewership and betting-handle models.",
        gate="Adopt the features if they add >=2pp of out-of-sample R^2 to the viewership baseline on 2024 data; adopt the geography if replicated radii rank-correlate (Spearman >=0.7) with an independent fanbase measure; reject otherwise.",
        owner="Hermes", effort="medium"),
94: dict(improvement="Add a case-crossover stoppage-effect module to GSE's live model that estimates the causal EPA/drive effect of weather delays and injury timeouts with game-fixed-effect plus quadratic-trend discipline, a clock-aligned vs play-aligned counterfactual battery, and placebo tests against the naive before/after estimator.",
        gate="ADOPT the case-crossover module if: (a) the placebo battery shows the naive before/after estimator has mean-reversion bias >=0.05 EPA/drive while the case-crossover bias is <0.02 EPA/drive; AND (b) at least one stoppage-type ATT has |effect| >=0.05 EPA/drive with cluster-robust 95% CI excluding zero. REJECT if stoppages are too rare (<40 events) for stable inference.",
        owner="Mimo", effort="medium"),
95: dict(improvement="Replace GSE's synchronous Zermelo BT fitter with Newman's alpha=0 scheme with asynchronous per-team updates and unit-product normalization, cutting full-pass count in the team-rating layer while producing identical MLEs.",
        gate="ADOPT if the async alpha=0 fitter reaches tolerance in strictly fewer full passes than Zermelo on the CFB dataset (>=1.5x fewer) AND produces identical MLEs to 1e-9 log-ratio; REJECT if no pass-count reduction on either league. Hard rejection if the async variant ever fails to increase likelihood monotonically across passes.",
        owner="Hermes", effort="small"),
96: dict(improvement="Add the recency-weighted modified-Katz score (beta=0.3, cutoff 4, home-minus-away) as a team-strength feature alongside EPA-based ratings in the engine, skipping the paper's lower-star TDA pipeline entirely.",
        gate="REJECT the lower-star TDA pipeline (cost-benefit fails on the authors' own numbers). ADOPT-or-not the Katz feature pending the section-12 test: >=0.5pp AUC lift or meaningful log-loss improvement on chronological 2023-2025 holdout. No TDA compute spend in GSE without a >=1pp standalone gain.",
        owner="Hermes", effort="small"),
97: dict(improvement="Run a prospective NFL benchmark harness that locks LLM probability forecasts at T-24h and T-2h, scores Brier/log-loss against the GSE engine and closing market, and only wires the LLM into an opinion pool with the engine if it adds incremental value.",
        gate="ADOPT the harness if (a) the open-vs-closed book effect replicates at >=0.02 Brier on NFL games AND (b) an LLM+engine opinion pool improves mean Brier over the engine alone by >=0.005 on the test season. REJECT as an engine input if neither; keep only as a QA/benchmark tool.",
        owner="Motif-lab", effort="small"),
98: dict(improvement="Score every candidate pick with the hybrid uncertainty U (evidence disagreement, source contradiction, run disagreement, data completeness, entropy, calibration gap) fitted on 2023-2024 validation picks, and post only when U <= theta, routing high-U picks to review or abstention.",
        gate="ADOPT if 2025 held-out shows the hybrid U beats temperature-scaling-only and MC-Dropout-only baselines on selective hit rate at 80% coverage by >=1 pp with positive fitted weights on disagreement/contradiction terms (w_D, w_C > 0). REJECT if w_D/w_C fit at ~0.",
        owner="Mimo", effort="medium"),
99: dict(improvement="Port the rolling 4-game behavioral-profile recipe (EPA splits, pressure-to-sack conversion, red-zone TD rate, chaos, volatility/momentum ratios) to NFL spread/total modeling as a challenger feature set stacked with team-strength priors in one GBM.",
        gate="Adopt the recipe if the rolling-profile + volatility feature set beats the Elo-only baseline by >=0.015 log loss on mean LO-season-out log loss over 2022-2025 AND shows positive flat-stake ROI on at least 3 of 4 test seasons; reject otherwise.",
        owner="Hermes", effort="medium"),
100: dict(improvement="Convert GSE's conformal gate to Mondrian (separate nonconformity quantiles per outcome class at alpha=0.10) and route ambiguous prediction sets to Garrett's manual review under explicit C_FP/C_FN/C_rev posting economics with a slate-capacity constraint on the review queue.",
        gate="ADOPT if Mondrian restores minority-class coverage on GSE's rare-outcome picks and cost-controlled deferral beats the current threshold gate by >=20% expected cost. REJECT if marginal and Mondrian coverage differ by <5 pp — then the current gate stands.",
        owner="Mimo", effort="small"),
101: dict(improvement="Add the interval-score ROC curve as the engine's standard interval diagnostic: compute per-sub-model empirical IS-ROC curves, assign per-coverage-level the best sub-model via the global convex hull, and apply tangent calibration to correct systematic over/under-confidence.",
        gate="ADOPT IS-ROC calibration as the engine's standard interval-diagnostic if (a) at least one sub-model pair shows crossing curves (regime-specific dominance the scalars hid), or (b) tangent calibration reduces 90% interval score by >=3% on held-out games; otherwise keep as a diagnostic-only tool.",
        owner="Mimo", effort="small"),
102: dict(improvement="Replace the Gaussian drawdown assumption in GSE's bankroll-reserve and circuit-breaker setting with archetype tables (trend, mean-reversion, short-vol, stationary block bootstrap of GSE's own pick-level P&L) keyed off the worst-archetype 90th-percentile max drawdown.",
        gate="ADOPT if the block-bootstrap 90th-percentile max drawdown exceeds the Brownian prediction by >=15% (confirming the paper's non-Gaussian warning applies to GSE's returns) — then the archetype tables become the sizing guardrail; if the bootstrap matches Brownian within 15%, REJECT as unnecessary for GSE.",
        owner="Mimo", effort="small"),
}

recs = []
for n in range(79, 103):
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
print("wrote", len(recs), "records 79-102")
