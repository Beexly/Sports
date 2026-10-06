import json

idx = {i: r for i, r in enumerate(json.load(open("/home/hatch/workspace/improve-ledger-work/index-fields-p7b.json")), start=79)}

d = {
103: dict(improvement="Replace any naive mid-price-sum bound check in GSE's cross-market arb monitoring with the depth-aware, fee-adjusted, direction-aware executable-edge framework (Eqs. 2-4), alerting only on protocol-executable edges where GSE can actually trade both legs.",
        gate="Adapt the executable-edge framework (Eqs. 2-4, depth-aware, fee-adjusted, direction-aware) as GSE's standard for cross-market arb monitoring — it replaces a naive mid-price-sum bound check, which this paper shows overstates opportunity. Reject settlement-based basket strategies as a GSE product: $32k total across the entire sample says the capital lock-up is not worth it.",
        owner="Hermes", effort="medium"),
104: dict(improvement="Size each GSE pick proportional to edge divided by squared conformal interval width (edge/(interval width)^2) with a fractional multiplier and per-pick/gross caps, maintained in a sealed season-long lockbox evaluated against flat-stakes and 0.25-Kelly baselines.",
        gate="ADOPT if lockbox max drawdown is lower than 0.25-Kelly at ROI within 1 pp; REJECT if, as in the paper, the uncertainty-width sizing adds nothing once caps bind (check cap-binding frequency — if >90% of days, the rule is decorative).",
        owner="Mimo", effort="small"),
105: dict(improvement="Replace the logistic link in GSE's BT team-rating layer with a data-learned isotonic link (PAV isotonic regression, CV-selected update count, clamped to [0.001, 0.999]) and rank teams by Borda count of the fitted link.",
        gate="ADOPT if IBT beats logistic-BT on D_tes by >=0.003 Brier (or >=0.5% log-loss) AND Kendall's tau is not worse (Delta-tau >= -0.01), on 2023-2024 NFL. REJECT otherwise — a fixed logistic link stays, and the tie-rate/Borda machinery is dropped.",
        owner="Mimo", effort="small"),
106: dict(improvement="Park the Sen-Cap pipeline for any betting or modeling purpose, but if GSE commits to 3D pose overlays as a video product, adopt its human-centric alignment pattern and bottleneck-attention fusion as the template for fusing NGS tracking with video keypoints in a single representation with Sensor-Dropout training for camera-angle changes.",
        gate="REJECT for any betting/modeling purpose (no path to edge). ADAPT for the video lane only if GSE commits to 3D pose overlays as a product: gate = calibration-free two-camera error within 20% of a calibrated baseline on NFL footage.",
        owner="Motif-lab", effort="large"),
107: dict(improvement="Implement the frozen-snapshot plus common-schema plus additive-scoring plus audit tournament-evaluation protocol as the mandatory seasonal harness for comparing GSE model configurations, adding a proper-score (Brier/log-loss) leaderboard and variance-normalized component ranks as required modifications.",
        gate="ADOPT the protocol (frozen snapshot + common schema + additive scoring + audit) — it is the rare evaluation paper whose method transfers wholesale. Two mandatory modifications: (1) add a proper scoring rule alongside the points leaderboard and report both; (2) normalize component variances before ranking or report component ranks separately. REJECT any GSE leaderboard that displays model self-reported confidence without calibration evidence.",
        owner="Hermes", effort="medium"),
108: dict(improvement="Add the CRAFTER two-generator loop (LLM proposes named sports mechanisms, compositional search enumerates rolling/interaction specs) as a gated residual-mining stage over the frozen NFL engine, with an additive/multiplicative GBDT corrector admitted only for features that explain validation-window residual with AST-verified no post-kickoff leakage.",
        gate="ADOPT if: >=0.003 held-out NFL log-loss improvement on 2025 games versus both the RAW engine and the covariate-only corrector, with the NONE floor holding (no shipped corrector worse than 'do nothing' on validation), no post-kickoff leakage in any accepted feature (AST-verified), and >=60% of accepted features human-auditable with a named sports mechanism.",
        owner="Hermes", effort="large"),
109: dict(improvement="Run a LoRA fine-tune pilot of an open video-LLM on 200-500 annotated NFL plays with the SPRINT hazard schema (earliest cue, injury moment, cause annotations) as an offline research tool feeding the injury-forecasting lane, never as a live betting signal.",
        gate="ADOPT the video lane for continued investment iff the pilot clears D1 >= 0.80 at FPR <= 0.25 on held-out plays with video-stratified splits. If FPR > 0.40 or D3 < 0.30, park the lane: detection without causal understanding and with high false alarms is a research toy, not a product input.",
        owner="Motif-lab", effort="large"),
110: dict(improvement="Fit STAR age curves (GAMLSS C95 performance envelope plus nonlinear mixed-effects tempo model) per NFL position group and use the per-player BLUP level/tempo estimates as features in fantasy/DFS valuation and dynasty trade models.",
        gate="ADOPT STAR age curves if rolling-origin RMSE on age-30+ WR seasons beats the static age-curve baseline by >=5% AND the near-linearity diagnostic is computed and reported (no silent gamma fitting). Reject if rho-hat(alpha,delta) ~= 0 (no level-tempo structure — the hierarchy buys nothing) or if the envelope is unstable across bootstrap refits.",
        owner="Mimo", effort="medium"),
111: dict(improvement="Fit a conditional joint home/away-points model (BCP/CMP family parameterized by GSE's existing team-strength features instead of attendance/fouls) to NFL scores and use the fitted joint distribution to derive correlated spread-plus-total probabilities for parlay and market pricing, keeping the H->A vs A->H directional diagnostic as a standing check.",
        gate="ADOPT the technique (not the soccer model) if the test in section 12 passes on NFL data with GSE features: the conditional specification beats the independent baseline by >=5 ELPD points and reproduces the observed home-away point correlation the independent model misses. Do not adopt the attendance/foul covariate story.",
        owner="Mimo", effort="small"),
112: dict(improvement="Port the strictly-causal SkiC-LSTM architecture to NGS tracking as the event detector feeding GSE's workload features (high-intensity decelerations, cut counts), adopting the paper's leave-one-player-out validation protocol verbatim for all GSE injury and workload models.",
        gate="Accepted: genuine injury-prevention research (ACL), strictly causal real-time architecture with sub-millisecond inference, rigorous LOSO validation explicitly designed against identity bias, open data/code/weights, and two concrete GSE ports (NGS event segmentation for workload features; LOSO validation discipline for injury models).",
        owner="Hermes", effort="medium"),
113: dict(improvement="Replicate the proposal-aided interleaved-grounding architecture on NFL All-22 clips with a curated NFL-VQA set (coverage/route/defender questions from charting labels) and an action-classification head, deployed human-in-the-loop with analyst confirmation before any tag is published.",
        gate="ADAPT further (toward production pilot) if IGF-style fusion beats prompt injection by >=5 pp on coverage-ID and route-ID accuracy AND action accuracy >= 55%; PARK if overall accuracy < 45% or if the fusion model cannot beat prompt injection.",
        owner="Hermes", effort="large"),
114: dict(improvement="Build an NFL counterfactual play simulator on shared per-player kinematic state with a learned interaction residual transformer trained on NGS tracking, serving what-if outcome queries (plus/minus-one-defender re-rolls) as structured tracks instead of neural video rendering.",
        gate="ADOPT the architecture if: (a) +2s mean player position error <= 1.5 yards on held-out 2024 plays, AND (b) counterfactual re-rolls with +-1 defender produce outcome-rate shifts that match held-out real-play base rates within 10% relative when the counterfactual equals the real play, AND (c) adding/removing entities mid-rollout keeps error within 1.2x of the fixed-population error.",
        owner="Motif-lab", effort="large"),
115: dict(improvement="Replace the max-expected-score objective in GSE's DFS GPP lineup construction with an expected-prize objective priced off the payout ladder and the field score distribution, using the enumerate-perturbations-to-score-shift-to-expected-prize pipeline for payout-aware local search.",
        gate="Adopt the expected-prize objective if on 2024 GPP backtests the max-expected-prize lineups beat max-expected-score lineups on realized prize by >=15% across >=15 GPPs AND the simulation shows the gap comes from payout-ladder positioning (not just variance); reject if the field-distribution estimate is too noisy.",
        owner="Hermes", effort="medium"),
116: dict(improvement="Fit a dynamic longitudinal Bayesian network (AR(1) usage across weeks, player random effects, active/snap/attempts/makes nodes with a participation submodel) to NFL player-game data in Stan or NIMBLE to serve weekly fantasy projections with full posterior uncertainty and reverse queries for injury-news conditioning.",
        gate="ADOPT the dynamic-LBN-with-AR-usage pattern and the participation submodel if the AR variant beats static on 2025 held-out log-likelihood AND predictive intervals calibrate; REJECT the hidden-Markov variant unless it beats the AR variant on LOO; REJECT literal replication of the 1M-iteration MCMC — use modern scalable inference.",
        owner="Mimo", effort="medium"),
117: dict(improvement="Build an NFL junk-offense index (drive-value efficiency, junk-open share in tied-or-losing game states, sterile index) as a matchup content and predictive feature, with an NGS-based safety-depth-displacement spatial layer predicting second-half scoring from early-game off-ball space creation.",
        gate="ADOPT the NFL junk-offense index for GSE matchup content if: leave-one-week-out team mean junk-open predicts next-game point differential with |r| >= 0.15 AND the joint regression shows junk-open significant (p < 0.05) controlling for EPA/play; REJECT if the index adds nothing beyond EPA.",
        owner="Hermes", effort="medium"),
118: dict(improvement="Add a Boltzmann-rational EM reliability-fusion layer that jointly estimates team rewards and per-source reliability beta_s from head-to-head games plus heterogeneous analyst/market sources, including regime-dependent (spread-relevant vs total-relevant) reliability variants.",
        gate="ADOPT the reliability-fusion layer if BoRaEM beats plain BT by >=0.002 Brier (or >=0.02 log-loss nat improvement) on the held-out 2025 season AND learned beta_s values are stable across two independent train windows (rank correlation >=0.8), without degrading calibration (ECE change within +-0.005).",
        owner="Mimo", effort="medium"),
119: dict(improvement="Replace the engine's current Gaussian/CQR uncertainty intervals with in-sample historical-simulation (HS_in) predictive distributions built from the engine's own point-forecast residuals, defaulting to in-sample calibration as the engine's standard uncertainty layer.",
        gate="ADOPT HS_in post-processing as the engine's default uncertainty layer if CRPSS >0 vs. current intervals on the 2022-2024 backtest AND 90% coverage lands in [0.87,0.93]; if QR beats HS on any market by >1pp CRPSS, adopt per-market method selection (the paper's heterogeneity finding).",
        owner="Mimo", effort="small"),
120: dict(improvement="Train a per-player spatio-temporal graph transformer with discrete distribution learning on NFL 10Hz tracking as a self-supervised motion-vocabulary pretraining stage, with frozen-rep linear heads for route-family classification and catch/tackle-frame spotting.",
        gate="ADOPT if: (a) GTN+DDL motion-prediction error >= 10% lower than GTN-only at the 1.0 s horizon on held-out weeks, AND (b) pretrained reps beat from-scratch by >= 5pp accuracy on route-family classification. REJECT if neither holds.",
        owner="Hermes", effort="medium"),
121: dict(improvement="Install the log-opinion-pool diagnostic that fits GSE's pooling weight w-hat against Shin-de-vigged closing prices on walk-forward windows (proving whether the engine adds information beyond the close) and adopt Shin de-vigging as the house odds converter if it passes the calibration bar.",
        gate="Adopt the pooling-weight protocol if on 2023-2024 validation the fitted w-hat for GSE engine vs close is stable across two independent 20-week folds and the loss-profile minimum is interior (not a boundary artefact); adopt Shin de-vig as house method if fitted z on NFL books is stable and implied probabilities pass a 10-bin calibration check (ECE <= 0.02) on 2023-2025.",
        owner="Mimo", effort="small"),
122: dict(improvement="Add an optimal act-now-vs-wait stopping policy for GSE's timed decisions (live-bet/hedge timing, pregame pick release, live-content commitment) built from the empirically estimated sigma(pi) quadratic-variation curve of win-probability streams.",
        gate="Adopt the timed-decision module if, on a holdout season of live-bet backtests, the optimal-stopping policy achieves >=10% lower realized Bayes risk than the best fixed-threshold baseline AND the estimated sigma(pi) is stable across seasons (per-decile quadratic-variation estimates within +-25% year over year). Reject if the gain over fixed thresholds is <5% — then the theory adds nothing over a tuned heuristic.",
        owner="Mimo", effort="medium"),
123: dict(improvement="Add a GSE-WIRED post-engine combination layer that forms CRPS-weighted mixtures of the engine, market-implied, Elo, and bootstrap margin experts (Theil-Sen skill extrapolation with shrinkage toward uniform) plus a Gaussian/Student-t copula over slate game margins for joint probabilities.",
        gate="ADOPT the CRPS-weighted mixture layer if, over the two-season test window, it beats equal-weight mixture by >=2% mean CRPS AND holds 80% interval coverage within [0.76, 0.84]; REJECT adaptive weighting (keep equal weights + copula) if it fails to beat equal weights or coverage falls below 0.74.",
        owner="Mimo", effort="medium"),
124: dict(improvement="Replace the engine's final probability layer with per-target Bates-Granger weights (factor-shrinkage covariance plus egalitarian ridge toward equal weights) over engine, de-vigged market, and Elo probabilities, with coherent reconciliation of season win totals from game win probs.",
        gate="ADAPT if the held-out 2026 test shows the shrunk Bates-Granger combination beating both equal weights and the best single source by >=0.002 Brier in at least 2 of 3 markets — then wire it as the engine's final probability layer. Reject if combination <= equal weights (the classic result reasserts itself).",
        owner="Mimo", effort="medium"),
125: dict(improvement="Gate the posted card on the model-minus-market margin (not raw model confidence) so shared game-level uncertainty (weather, backup-QB news) cancels out, and kill or rescope any gating project whose target selective hit rate exceeds the min(1, p/c) feasibility ceiling.",
        gate="ADAPT accepted if margin-gating beats top-score gating by >= 2 points of selective hit-rate at the posted-card coverage on walk-forward seasons (respecting Prop. 1: decided empirically, not assumed); the feasibility check is adopted unconditionally (it is arithmetic). If the margin does not win, keep top-score gating.",
        owner="Mimo", effort="small"),
126: dict(improvement="Deploy a two-surface win-probability architecture: the fitted/calibrated surface for all reported WP numbers and any downstream pick math, and an exact-martingale surface reserved for attribution (clutch players, high-leverage moment content) with published error bounds.",
        gate="ADOPT the two-surface architecture if on nflverse data: (a) exact-martingale WP shows the same over-dispersion signature (fitted surface beats it on ECE by >= 0.02 on held-out), AND (b) the permutation decomposition finds significant within-game sequential dependence (lag-1..3 outside the null band), AND (c) leverage rankings separate known roles from volume anchors. REJECT if the fitted and exact surfaces are comparably calibrated (difference < 0.01 ECE).",
        owner="Hermes", effort="large"),
}

recs = []
for n in range(103, 127):
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
print("wrote", len(recs), "records 103-126")
