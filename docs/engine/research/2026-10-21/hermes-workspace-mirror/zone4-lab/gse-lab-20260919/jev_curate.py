#!/usr/bin/env python3
"""JEV mill - JEV curation (my judgments, labeled JUDGMENT) over real arXiv pool.
Bucket: KEEP (wire-ready method) / MEASURE (needs empirical test w/ kill line) /
IRRELEVANT / KILL-COUSIN (touches a family GSE already killed).
Fields: bucket, gse_bucket, why, kill_line, in_gse (yes/no/unknown)."""

C = {
# ---------- UQ: conformal core ----------
"1905.02928": ("KEEP","UQ-conformal","Held-out-fold ensemble validity; drops the single-split variance problem for n~150 walk-forward windows.","Kill if coverage on NFL W1-18 walk-forward misses 90-95% band at n>=150.","no"),
"2503.01495": ("KEEP","UQ-conformal","Improves cross-conformal statistical efficiency - the reason GSE passed on cross-conformal in 2024 may no longer hold.","Kill if efficiency gain vanishes at n=150-300 window sizes.","no"),
"1208.0806": ("KEEP","UQ-conformal","Original cross-conformal predictors (Vovk); baseline the 2503.01495 efficiency claim must beat.","Same as above.","no"),
"1902.06579": ("KEEP","UQ-conformal","Conformal calibrators: post-hoc score calibration layer - slots above Mondrian binning, not instead of it.","Kill if it degrades bin-level (Mondrian) coverage in backtest.","no"),
"2309.08313": ("KEEP","UQ-conformal","Heteroskedastic conditional validity - spread bins are heteroskedastic by construction.","Kill if width blowup on underdog bins exceeds coverage gain.","no"),
"2105.08747": ("MEASURE","UQ-conformal","Conditional histograms as nonconformity - matches per-bin margin distributions.","Kill if histogram binning underperforms Mondrian q-hats on 2025 settled rows.","no"),
"2207.02808": ("MEASURE","UQ-conformal","Improved CQR: variance-explaining features in the score - candidates: books count, rest, weather.","Kill if no width reduction at equal coverage on settled picks.","no"),
"2202.08756": ("MEASURE","UQ-conformal","Ensemble CQR for probabilistic time series - weekly EPA/odds panels fit this shape.","Kill if ensemble split hurts small-n NFL windows.","no"),
"2103.00627": ("MEASURE","UQ-conformal","Multi split conformal - variance reduction via multiple splits, directly relevant at n~150.","Kill if compute/latency not worth coverage delta.","no"),
"2306.02732": ("KEEP","UQ-conformal","Conformal prediction with missing values - weather/books/QB-status gaps are routine in GSE features.","Kill if imputation-free validity costs too much width vs fail-closed dropping.","no"),
"2208.02814": ("KEEP","UQ-conformal","Conformal risk control - controls a monotone loss, e.g. expected CLV shortfall, not just coverage.","Kill if risk notion cannot be stated as monotone in the set size.","no"),
"2401.11974": ("MEASURE","UQ-conformal","CV version of conformal risk control - more data-efficient risk control.","Same kill as 2208.02814.","no"),
"2407.07700": ("MEASURE","UQ-conformal","Split conformal under data contamination - grading errors / mispriced stale lines are contamination.","Kill if robustness costs >2pp width on clean subsets.","no"),
"2606.31600": ("MEASURE","UQ-conformal","Optimal train/calibration split ratio for split conformal - GSE uses arbitrary splits today.","Kill if optimum at n=150 is far from current split and gains are <1pp coverage.","no"),
"2502.20579": ("MEASURE","UQ-conformal","Training-conditional coverage of full conformal in high dimensions - bounding the per-window claim.","Kill if bounds too loose to be useful at GSE dims.","no"),
"2508.05272": ("MEASURE","UQ-conformal","Fast approximation + conditional validity of full conformal - makes full conformal tractable.","Kill if approximation error breaks distribution-free claim.","no"),
"1905.03222": ("MEASURE","UQ-conformal","CQR (Romano Patterson Candès) - the quantile-based conformal; pairs with qgam tails.","Kill if CQR < Gaussian-close CRPS improvement 0.01 bar.","no"),
# ---------- calibration / proper scores ----------
"1211.0025": ("KEEP","calibration","Venn-Abers predictors - distribution-free calibrated probabilities. NOTE: does NOT touch the banned inverted-confidence fix; it is honest calibration, not confidence reinterpretation.","Kill if Venn-Abers interval width unusable for pick display.","no"),
"2605.06646": ("MEASURE","calibration","Inductive Venn-Abers regressors - regression-shaped VA; matches trueProb calibration head.","Kill if regression-VA worse than isotonic on settled rows.","no"),
"1303.6182": ("MEASURE","calibration","Variance estimation for Brier decomposition - GSE reports Brier floors; error bars are missing.","Kill if delta-method variance misfits correlated picks (games per slate).","no"),
"2408.01626": ("MEASURE","calibration","Weighted Brier score - category-weighted overall summary; matches per-bin reporting.","Kill if weighting choice is arbitrary for GSE bins.","no"),
"2109.12464": ("MEASURE","calibration","Wilson interval finite-population correction - GSE bins are small samples from a finite slate.","Kill if FPC immaterial at bin n.","unknown"),
"2303.03167": ("MEASURE","calibration","Reliability statistics for success-failure experiments - exact small-n bin reliability.","Kill if no improvement over Wilson at bin n.","unknown"),
"2609.10865": ("MEASURE","calibration","Bivariate extension of Wilson score method - two-sided (cover+total) joint intervals.","Kill if joint CI overkill for current bins.","no"),
# ---------- UQ: online / adaptive / shift ----------
"2106.00170": ("KEEP","UQ-online","Gibbs & Candes ACI - online alpha-update under shift; the season IS the shift.","Kill if alpha oscillates on weekly season cadence (only 18 steps).","no"),
"1904.06019": ("KEEP","UQ-online","Conformal prediction under covariate shift (Tibshirani et al) - likelihood ratios weight the QB-change / rest strata.","Kill if density-ratio estimation unstable at weekly n.","no"),
"2202.13415": ("KEEP","UQ-online","Beyond exchangeability (Barber et al) - weighted quantiles for non-exchangeable weeks; NFL weeks are ordered, not iid.","Kill if weighting scheme cannot encode weekly decay sensibly.","no"),
"2203.15885": ("KEEP","UQ-online","Split conformal + non-exchangeable data - practical companion to 2202.13415.","Kill if coverage drop vs exchangeable baseline > width gain.","no"),
"2212.03463": ("KEEP","UQ-online","SPCI: sequential predictive conformal for time series - uses residual autocorrelation; scores are autocorrelated across weeks.","Kill if SPCI coverage worse than Mondrian static bins on 2025 replay.","no"),
"2207.07282": ("MEASURE","UQ-online","Adaptive conformal for time series - early candidate for weekly refresh.","Kill if redundant with ACI 2106.00170 on season cadence.","no"),
"2208.08401": ("MEASURE","UQ-online","Conformal online with arbitrary distribution shifts - strongest shift assumptions.","Kill if too conservative (width) on real slates.","no"),
"2307.16895": ("MEASURE","UQ-online","Conformal PID control - control-theoretic alpha updates; alternative to ACI.","Kill if PID gains need tuning GSE cannot validate at n=18 weeks.","no"),
"2412.19318": ("MEASURE","UQ-online","Adaptive conformal inference by betting - e-process alpha updates; matches anytime-valid taste.","Kill if betting interpretation adds nothing operationally.","no"),
"2604.13253": ("MEASURE","UQ-online","Bias-corrected ACI multi-horizon - multi-horizon = multi-market (spread/total/ML) bands.","Kill if correction immaterial at GSE horizon counts.","no"),
"2609.07251": ("MEASURE","UQ-online","ACI under delayed feedback - settlement lag IS delayed feedback (picks settle hours-days later).","Kill if delay model mismatches GSE settlement latencies.","no"),
"2502.17744": ("MEASURE","UQ-online","Generalized covariate shift with posterior drift - roster/QB changes shift p(y|x) itself.","Kill if posterior-drift estimator needs labels GSE does not have weekly.","no"),
"2507.10425": ("MEASURE","UQ-online","Non-exchangeable conformal via optimal transport - OT-weights for drifted weeks.","Kill if OT cost dominates gains; also WATCH: Wasserstein here is a tool inside conformal, not a killed signal family (labeled JUDGMENT).","no"),
"2510.15824": ("MEASURE","UQ-online","ACI via Blackwell approachability - theory-grounded online guarantee.","Kill if no practical difference vs ACI.","no"),
"2409.14792": ("MEASURE","UQ-online","Multi-step ahead online ACI - multi-step = multi-week futures.","Kill if futures horizon too long for coverage check.","no"),
# ---------- aggregation / mu ----------
"0708.1503": ("KEEP","aggregation","Defensive forecasting with expert advice (Vovk) - produce calibrated probabilities from ANY expert by defending against it; maps to pool-of-books / pool-of-models mu.","Kill if defensive forecast equals market close (no residual signal).","no"),
"2605.06541": ("MEASURE","aggregation","Hedging memory horizons for non-stationary prediction - handles regime change in expert quality.","Kill if horizon mix needs more history than 18 weeks.","no"),
"2209.06826": ("MEASURE","aggregation","Squint in changing environments - tracking experts through shift.","Kill if tracking lags on weekly data.","no"),
"2208.03708": ("MEASURE","aggregation","Optimal tracking in prediction with expert advice.","Kill if gains only at many-step horizons.","no"),
"2602.09982": ("MEASURE","staking-ops","Kelly betting as Bayesian model evaluation - time-updating probabilistic forecasts; staking as scoring.","Kill if framework duplicates Brier-based calibration gates.","no"),
"2003.02743": ("MEASURE","staking-ops","Kelly generalization under temporal correlation - correlated parlays/slates break iid Kelly.","Kill if correlation estimates unstable per slate.","no"),
"1710.01786": ("MEASURE","staking-ops","Kelly can be too conservative - shrinkage direction of staking.","Kill if wrong for GSE fee structure.","no"),
# ---------- betting economics / market ----------
"1710.02824": ("KEEP","market-microstructure","Beating the bookies with their own numbers - odds-only arbitrage-style signal; direct mu-competition evidence that odds alone carry exploitable structure.","Kill if their returns die out-of-sample post-publication.","no"),
"1211.4000": ("MEASURE","market-microstructure","NFL betting lines 2002-2011 performance - the closing-line baseline GSE mu must tie to.","Kill if line-performance era effects invalidate 2026 extrapolation.","no"),
"2306.01740": ("MEASURE","market-microstructure","Correction study: mispricing/inefficiency in online sportsbooks - directly about fake profits from selection effects.","Kill if their correction does not transfer to GSE CLV denominators.","no"),
"2109.07581": ("MEASURE","market-microstructure","COVID-19 impact on sports betting markets - neutral-site, no-crowd regime.","Kill line: NOT a 2026 NFL license; measure only as regime-shift case study.","no"),
"2607.14430": ("KEEP","market-microstructure","Systematic bias in sports prediction markets (Kalshi parlays overpriced vs product of legs) - prop/parlay pricing hole GSE props lane can price against.","Kill if bias < vig after fees.","no"),
"2608.11505": ("MEASURE","market-microstructure","Does a structural model add anything to the closing price? - THE GSE mu question, asked in a journal.","Kill if answer is 'no' on their data; would confirm mu=market-close doctrine.","no"),
"1604.03614": ("MEASURE","market-microstructure","EPL odds market structure - bookmaker margin mechanics.","Kill if soccer-only margin structure not portable to NFL books.","no"),
"2003.09384": ("MEASURE","market-microstructure","Asian handicap efficiency with ratings and Bayesian ML - handicap efficiency vs model ratings.","Kill if AH-specific findings do not map to NFL spread.","no"),
"2303.16648": ("MEASURE","market-microstructure","Exploiting soccer betting inefficiencies (beating the average).","Kill if edge is selection-effect artifact (cf 2306.01740).","no"),
"2307.13807": ("MEASURE","market-microstructure","Neural nets + modern portfolio theory for EPL betting.","Kill if portfolio layer is generic Markowitz without edge.","no"),
"2505.21275": ("MEASURE","market-microstructure","Do betting markets sense a goal coming? - in-play microstructure; out-of-play for pre-kick GSE.","Kill if in-play only.","no"),
"2607.00164": ("MEASURE","calibration","Verifiable rewards for calibrated probabilistic forecasting - verification rewards for forecasters.","Kill if reward design duplicates Brier floors.","no"),
"2107.08827": ("MEASURE","staking-ops","Optimal sports betting strategies: an experimental review - benchmark review; use as map, not method.","Kill if nothing beyond known Kelly/flat discussion.","no"),
# ---------- sport model / props ----------
"1002.0797": ("MEASURE","sport-model","Is scoring goals a Poissonian process? - direct evidence on the Poisson assumption GSE killed for TD props.","Kill if tests lack power at match-level n.","no"),
"0803.0614": ("MEASURE","sport-model","Fitness, chance, and myths in soccer results - goal-process assumptions audited.","Kill if double-counts ranking quality.","no"),
"1807.07536": ("MEASURE","sport-model","Skellam regression for positional value (soccer) - Skellam margin framework (NFL margin use stays banned-port until re-derived on NFL data).","Kill line: NOT a license to port soccer tau; NFL re-derivation only.","no"),
"1710.05284": ("MEASURE","sport-model","Multivariate GLMM joint estimation of outcomes - joint spread/total/ML structure.","Kill if joint fit unstable on 32-team weekly panels.","no"),
"2109.08051": ("MEASURE","sport-model","Frame-by-frame NFL pass completion probability - props/WR-market groundwork from tracking.","Kill if tracking data license unclear for production.","no"),
"2604.01491": ("MEASURE","sport-model","Opponent-adjusted NFL pass blocking / pass rush evaluation - the pressure-matchup lane, independently derived.","Kill if opponent adjustment is schedule-strength only (no lineup context).","no"),
"1601.04302": ("MEASURE","sport-model","Footballonomics: anatomy of American football from 7 years of NFL data - descriptive baselines.","Kill if purely descriptive.","no"),
"2212.08116": ("MEASURE","sport-model","Converting CFB point-spread differentials to probabilities - NCAAF conformal/convert mapping hole.","Kill if mapping assumes normality without check.","no"),
"1403.7642": ("MEASURE","sport-model","Sensitivity of college football rankings to modeling choices - NCAAF model-choice fragility evidence.","Kill if ranking-specific, not predictive.","no"),
"2403.03862": ("MEASURE","sport-model","NCAA playoff selection via Elo - NCAAF Elo calibration reference.","Kill if selection-focused not calibration.","no"),
"physics/0607064": ("MEASURE","sport-model","Bayesian mean-value ranking for college football - empirical-Bayes prior shape for NCAAF.","Kill if prior not transferable to current era.","no"),
"2410.09180": ("MEASURE","sport-model","Convergence and stationary distribution of Elo ratings - GSE engine core is Elo; convergence properties matter weekly.","Kill if theory needs game counts GSE lacks.","no"),
"1810.03383": ("MEASURE","sport-model","Illusion of persistence in NBA 1995-2018 - streak/persistence is largely luck; supports GSE luck-regression doctrine.","Kill if NBA-specific persistence does not transfer to NFL.","no"),
# ---------- reference / ops ----------
"0706.3188": ("KEEP","reference","Conformal prediction tutorial (Vovk et al) - the onboarding doc for any conformal work at GSE.","n/a","no"),
"2107.07511": ("KEEP","reference","Gentle introduction to conformal prediction and distribution-free UQ - staff onboarding.","n/a","no"),
"2411.11824": ("KEEP","reference","Theoretical foundations of conformal prediction - the theory compendium.","n/a","no"),
"2306.17169": ("IRRELEVANT","reference","Mondrian conformal applied to disk scrubbing - application only.","n/a","no"),
"2602.19363": ("IRRELEVANT","reference","Mondrian conformal for neutron star EOS - application only.","n/a","no"),
# ---------- KILL-COUSIN (families already killed; confirm dead, do not rescue) ----------
"2002.04148": ("KILL-COUSIN","sport-model","Intrinsic dimension of player tracking (basketball) - W7 intrinsic-dim family killed on own kill line; this is the strongest version of that idea and still does not price spreads.","Family kill stands unless this paper shows a spread-relevant use: kill remains.","no"),
"2603.02460": ("KILL-COUSIN","UQ-conformal","Conformal graph prediction with Z-Gromov-Wasserstein distances - Wasserstein tooling inside conformal; W-family kill was about Wasserstein SIGNALS, not tools (JUDGMENT).","Kill remains for signal use; tool use needs its own pre-registered test.","no"),
"2608.29789": ("KILL-COUSIN","UQ-conformal","Unified conformal prediction and Wasserstein DRO - same distinction as above.","Same as 2603.02460.","no"),
"2004.14528": ("KILL-COUSIN","reference","Bias-corrected intrinsic dimension estimator - W7 toolchain.","Family kill stands.","no"),
"2109.02596": ("KILL-COUSIN","reference","scikit-dimension package - W7 toolchain.","Family kill stands.","no"),
"2003.16649": ("KILL-COUSIN","reference","placeholder - DO NOT INDEX (guards against invented IDs)","n/a","no"),
}
# remove guard placeholder
C.pop("2003.16649", None)

BATCHES = {
 "A-conformal-core": ["1905.02928","2503.01495","1208.0806","1902.06579","2309.08313","2105.08747","2207.02808","2202.08756","2103.00627","2306.02732","2208.02814","2401.11974","2407.07700","2606.31600","2508.05272","1905.03222","1211.0025","2605.06646"],
 "B-online-aggregation": ["2106.00170","1904.06019","2202.13415","2203.15885","2212.03463","2202.07282","2208.08401","2307.16895","2412.19318","2604.13253","2609.07251","2502.17744","2507.10425","2510.15824","0708.1503","2605.06541","2209.06826","2208.03708"],
 "C-betting-market": ["1710.02824","1211.4000","2306.01740","2109.07581","2607.14430","2608.11505","1604.03614","2003.09384","2303.16648","2307.13807","2505.21275","2607.00164","2107.08827","2602.09982","2003.02743","1710.01786"],
 "D-sport-props-kills": ["1002.0797","0803.0614","1807.07536","1710.05284","2109.08051","2604.01491","1601.04302","2212.08116","1403.7642","2403.03862","physics/0607064","2410.09180","1810.03383","2109.12464","2303.03167","2609.10865","1303.6182","2408.01626","2002.04148","2603.02460","2608.29789"],
}

if __name__ == "__main__":
    import json
    print(json.dumps({k: v for k, v in list(C.items())[:3]}, indent=1))
    print("curated:", len(C), "| batches:", {k: len(v) for k, v in BATCHES.items()})
