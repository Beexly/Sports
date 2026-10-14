# GSE Corpus Leverage Sweep 2026-10-13 (SECOND PASS)

Scope: docs/engine/research/2026-10-13 (274 files), docs/predictions/research/2026-10-13 (329), docs/props/research/2026-10-13 (5), docs/gates/GATE-SPECS.md, plus the 9-file Downloads doctrine set.
Companion machine-readable file: docs/ops/SWEEP-2026-10-13-CORPUS.jsonl (one JSON object per leverage item).

Counts: items=1038 | high=513 medium=423 low=102 | implemented=350 unimplemented=553 unknown=135 | items carrying a prior-pass note=154
Categories: equation=231, calibration=193, signal=181, ops=157, wiring=100, data-source=86, props=27, parlay=26, dfs=20, other=17

## TOP-50 LEVERAGE ITEMS (ranked by expected value)

1. Dixon-Coles exponential time decay weight e^(-xi times days) is not coded [equation/unimplemented/high]
   source: RATING_ATLAS.md (Part II #15)
   why: The atlas states DC combines Poisson with the tau low-score correction and an exponential time-decay weight e^(-xi times days).
   land in: engine_math.py
2. Dixon-Coles time-decay xi fitting procedure [equation/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (App A18, line 392)
   why: Weighted MLE maximizing sum_i e^{-xi(t_now - t_i)} * log P(score_i | lambda, mu, rho) as a 4-parameter joint optimization (lambda, mu, rho, xi), with xi typically 0.001-0.003/day in soccer;
   land in: ratings2.py DC fitter
3. Efficiency family EPA, SP+, DVOA, FPI, xG/xT, RAPM/EPM all need pbp feeds [equation/unimplemented/high]
   source: RATING_ATLAS.md (Part III #23, #24, #26, #27, #28, #29)
   why: The atlas lists six modern team-metric families:
4. Karlis-Ntzoufras bivariate Poisson fitting via EM [equation/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (App A19, line 395)
   why: Maximize log-likelihood of the bivariate pmf over match data with constraint lambda3 >= 0 (shared component is the covariance), fit by EM treating W3 shared goals as latent or by constrained Newton;
   land in: props_deep.py (parameter fitting layer)
5. Dixon-Coles rho low-score correction not implemented [equation/unimplemented/high]
   source: METRIC_UNIVERSE.md (Equations Library)
   why: The library gives the exact Dixon-Coles tau(x,y) adjustment for low scores:
6. Drawdown risk frontier 1710-04818: convex r_cur^X constraint, >=25% max-drawdown cut, per-category Kelly caps [equation/unimplemented/high]
   source: GATE-SPECS.md (decision, line 502)
   why: The gate tests a convex current-drawdown risk measure r_cur^X added as a constraint on the Kelly log-growth objective, producing per-category Kelly-fraction caps for spread/total/moneyline/prop.
   land in: packages/prediction-engine/src/decision/1710-04818-drawdown-risk-frontier.ts
7. EVT prop tails: GEV/GPD for longest-X markets where the book assumes Gaussian [equation/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (ANGLES_REGISTRY.md section C, lines 530-535)
   why: Peaks-over-threshold EVT:
   land in: GSE props tail pricing module; input snapshots/dk_week6_ladders_*.tsv plus PBP play lengths
8. Equations Library: 28 named equations with 14 unimplemented (none) [equation/unimplemented/high]
   source: METRIC_UNIVERSE.md (Equations Library)
   why: The library names 28 equations with a formula and an implementation-file column.
9. FPI hybrid regression (EPA + context + market) [equation/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (App A9, line 365)
   why: margin ~ sum(eff) + sum(context) regression combining EPA efficiencies with situational covariates (rest, travel, altitude) plus market calibration.
   land in: new model module; features already exist in backtest.py
10. Glicko-2 idle-RD step phi' = sqrt(phi^2 + sigma^2), no volatility solve [equation/unimplemented/high]
   source: GSE_HANDOFF_PACK_2026-10-10.md (Part 0 item 1b line 14, Part A row 3 line 39, Part G gap 1 line 127)
   why: The idle-RD update for Glicko-2 is phi' = sqrt(phi^2 + sigma^2) with no volatility solve - a 5-line change on the GSE repo branch.
   land in: GSE ratings module glicko2 path
11. Hawkes self-exciting scoring process with home/away excitation asymmetry [equation/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (ANGLES_REGISTRY.md section A, lines 514-521)
   why: Named equation:
   land in: GSE engine (new hawkes module) plus engine_math live repricing drift term
12. Multivariate slate sizer 1806-05293: exact Kelly convex program, >=5% realized log growth, correlation guardrail [equation/unimplemented/high]
   source: GATE-SPECS.md (decision, line 527)
   why: This gate tests an exact multivariate Kelly convex program over a whole slate, demoting the paper's closed-form M.f = b solution to a warm start.
   land in: packages/prediction-engine/src/decision/1806-05293-multivariate-slate-sizer.ts; slate inputs from Neon picks
13. Posterior-Kelly: integrate sizing over the parameter posterior instead of plug-in Kelly [equation/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (ANGLES_REGISTRY.md section J, lines 575-579)
   why: E[growth] = integral of log(1 + f*(b*1{win} - 1{lose})) dPi(theta) over the parameter posterior, where sigma comes from the DK-table uncertainty and mu from our model;
   land in: GSE sizing layer beside kelly2.py; inputs props_deep.py and dk_stat_distributions.csv
14. Rest, travel and altitude situational effects with published magnitudes, all unmeasured [signal/unimplemented/high]
   source: METRIC_UNIVERSE.md (Situational Context Canon, rest/travel rows)
   why: Published magnitudes listed and unmeasured:
   land in: situational feature table feeding the reasoning overlay
15. Situational spots misprice by 1-3 points when they fire (published effect sizes) [signal/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 1)
   why: Doctrine asserts published literature puts situational spots at 1-3 points of mispricing when they fire:
   land in: situational feature layer feeding the reasoning overlay; constants exist in engine_math.py situational_adj
16. Situational spots worth 1-3 points of mispricing [signal/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, point 1)
   why: Doctrine states published literature puts situational spots at 1-3 points of mispricing when they fire (rest:
   land in: engine_math.py situational_adj plus a new situational_read.py feeding the reasoning overlay
17. Steam and reverse line movement detection as a mechanical signal [signal/unimplemented/high]
   source: RATING_ATLAS.md (Part VI #46) + PREDICTION_ENGINE_MASTER Appendix A15
   why: The atlas describes steam and RLM detection as line velocity, the change in price per minute, plus divergence from public bet percentage, where RLM means the line moves against the public money as a sharp fingerprint.
   land in: divergence.py
18. Weather situational effects with published magnitudes, all unmeasured [signal/unimplemented/high]
   source: METRIC_UNIVERSE.md (Situational Context Canon, weather rows)
   why: Published effect sizes listed and unmeasured:
   land in: weather-to-EPA effect table; reconcile with engine_math.py weather_adj
19. BDB lead angle: deceleration to re-acceleration asymmetry index on route drills [signal/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (BDB2027_GROUNDWORK.md section 3 item 1, line 468)
   why: Lead candidate metric:
   land in: GSE BDB 2027 kinematic feature library (stdlib 10 Hz math)
20. Covariate engine: which situational features survive shrinkage [signal/unimplemented/high]
   source: RATING_ATLAS.md (Part IX, moat 5)
   why: Moat 5 is the covariate engine - which situational features actually carry signal after shrinkage, FPI-style;
   land in: new covariates module feeding ratings/model layer
21. EPA definition and its open data path [signal/unimplemented/high]
   source: RATING_ATLAS.md (Part III, system 23)
   why: EPA (Expected Points Added):
   land in: data ingest, then ratings feature
22. EPA expected-points surface as rating core [signal/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (App A5, line 353)
   why: Build EP(down, distance, yardline) from historical play values (next-score ownership), then EPA_play = EP_end - EP_start adjusted for score change;
   land in: new module next to ratings2.py; data via nflverse GitHub releases
23. Empirical Bayes beta-binomial for rate stats [calibration/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (App A12, line 374)
   why: Prior alpha,beta from the league via method of moments on observed rate variance;
   land in: props_deep.py / engine_math.py
24. FTN 2025 fingerprint pass: play-action, RPO, motion and blitz EPA lifts [signal/unimplemented/high]
   source: GSE_BLUEPRINT_EXPANDED.md (QUEUE item 4)
   why: Queue item 4 is an FTN 2025 fingerprint pass extracting play-action, RPO, motion and blitz EPA lifts.
25. Feature canon with leakage discipline [signal/unimplemented/high]
   source: RATING_ATLAS.md (Part VIII, system 60; A21)
   why: Named covariate canon:
   land in: feature layer, covariates module
26. Instability gate 2508-07556v2: selection by prediction instability at c=0.70 beats confidence top 70% [signal/unimplemented/high]
   source: GATE-SPECS.md (decision, line 768)
   why: The gate tests whether per-pick prediction instability (checkpoint or 10-seed bagging disagreement) is a better selection signal than confidence at fixed coverage, on 2024-2025 engine picks at c=0.70 against a confidence-top-70% baseline with a two-sided McNem
   land in: packages/prediction-engine/src/decision/2508-07556v2-instability-gate.ts; needs 10-seed bagging disagreement from the model registry
27. Logarithmic opinion pool across books [signal/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (App A14, line 380)
   why: Linear pool P = sum w_i*p_i versus logarithmic pool P proportional to product p_i^w_i (geometric mean of implied probs), with weights fit by validation log-loss.
   land in: divergence.py / sportsbook.py
28. ML layer: logistic regression, gradient boosting and neural nets as a fourth edge family [signal/unimplemented/high]
   source: RATING_ATLAS.md (Part VIII #55)
   why: The atlas lists a machine learning layer with logistic regression for interpretable baselines, gradient boosting for tabular feature interactions and neural nets for nonlinear interaction patterns.
   land in: models.py
29. Next Gen Stats tracking suite: separation, rush YAC, air accuracy, time to throw, completion distance, max speed, acceleration, route efficiency [signal/unimplemented/high]
   source: METRIC_UNIVERSE.md (NFL Metrics table, NGS rows 99-113)
   why: Eight NGS tracking fields are listed with source NGS and status HAVE-data-not-computed:
   land in: player-tracking feature derivation
30. OL versus RB attribution engine from PFR advanced rushing columns [signal/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (ENGINE_BLUEPRINTS.md section 2.1, lines 721-725)
   why: Verified PFR schema on the adv_rushing_and_receiving table (Bijan page):
   land in: GSE pfr_pull.py crawler plus a new OL/DL attribution module
31. PFR player pages feed OL-vs-RB attribution and coverage adjacency [signal/unimplemented/high]
   source: GSE_BLUEPRINT_EXPANDED.md (PART 5 table, Player pages row)
   why: Player pages carry advanced rushing/receiving detail:
   land in: usage/attribution feature module fed by PFR player-surface JSONL
32. PFR player pages: YBC, YAC, broken tackles, ADOT, drops, INT-when-targeted, pass-rating-allowed, snap counts [signal/unimplemented/high]
   source: GSE_BLUEPRINT_EXPANDED.md (PFR player pages row)
   why: The player-page surface yields advanced rushing and receiving columns:
33. Round-number anchoring shade map from the DK ladder files (kill K6) [signal/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (CONTEXTUAL_LAYER.md section 7 line 402 and section 10 K6)
   why: Anchoring literature applied to prop lines:
   land in: GSE props line-shading analysis over snapshots/dk_week6_ladders_*.tsv
34. Scheme and coverage engines from nflfastR pbp columns (PC-only, pyreadr blocked on iSH) [signal/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (ENGINE_BLUEPRINTS.md section 2.2, lines 727-734)
   why: nflfastR per-game RDS files (github.com/nflverse/nflfastR-data releases tag raw_pbp_2026, 67 assets) carry run_gap, run_location, defense_man_zone_type, defense_coverage_shell, defenders_in_box, xpass, xcpoe, qb_hit and pressure flags.
   land in: GSE PC/agent lane: pbp parse plus coverage/scheme modules; data/download_deep.py for RDS
35. Situational Context Canon: 20 named factors with published EPA effects, all TBD [signal/unimplemented/high]
   source: METRIC_UNIVERSE.md (Situational Context Canon)
   why: Twenty situational factors are tabulated with published EPA-per-play effects:
36. Situational canon effect sizes are ready-made priors [calibration/unimplemented/high]
   source: METRIC_UNIVERSE.md (Situational Context Canon)
   why: Every situational row carries a published magnitude in EPA per play:
   land in: situational prior table feeding the context engine
37. Timing edge on the news cycle before the line moves [signal/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (point 2, Timing)
   why: Beat-reporter news, practice participation, a limited Wednesday turning into a DNP Thursday:
   land in: practice/injury feed ingestion feeding divergence.py movement monitor and the overlay
38. Timing lane: news-cycle reasoning before the market moves, 1-2% CLV per bet [signal/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 2)
   why: Edge lane 2:
   land in: news/participation ingest feeding pre-move bet placement
39. Timing lane: read beat-reporter news and practice participation before the market moves [signal/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (Where the edge lives #2)
   why: The doctrine names a timing edge worth 1-2% CLV per bet from reading the news cycle and practice participation (a limited Wednesday turning into a DNP Thursday) before the market moves.
40. Dual-threshold conformal abstention 2502-07255v2 replacing the fixed 70% confidence cutoff [calibration/unimplemented/high]
   source: GATE-SPECS.md (decision, line 710)
   why: The gate replaces a fixed 70%-confidence abstention cutoff with a ROC-tuned dual-threshold conformal policy fit per game regime, to attack the marginal-vs-conditional coverage gap.
   land in: packages/prediction-engine/src/decision/2502-07255v2-dual-threshold-conformal.ts and the conformal family dir
41. FCS adjustment and FBS-only rating PARTIAL in our warehouse [calibration/unimplemented/high]
   source: METRIC_UNIVERSE.md (CFB Metrics table)
   why: FCS Adjustment and FBS Only Rating are listed as source 'our warehouse' with status PARTIAL.
42. Four working measurements replacing 'did mu beat the close' [calibration/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (How we know it's working)
   why: The success criteria are:
   land in: CLV ledger plus calibration report plus a new line-move-prediction scorecard
43. Normal-margin sigma constant: use Pinnacle's 13.19 or blend with stack's 13.45 [calibration/unimplemented/high]
   source: GSE_HANDOFF_PACK_2026-10-10.md (Part A row 19 line 60 and Part B section 3 line 239)
   why: Pinnacle's own total sd inverted from live prices is 13.19 (n=14, R2>=.97) versus the stack constant 13.45 used in alt_ladder/N(mu,13.45), about 2 percent tighter.
   land in: GSE engine_math alt_ladder constant
44. Opinion pools: linear and logarithmic multi-book consensus [calibration/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (section 9 item 6, A14)
   why: Linear pool P = sum w_i p_i and logarithmic pool P proportional to product p_i^{w_i} (geometric mean of implied probabilities), with weights fitted by validation log-loss.
   land in: divergence.py or a new pool module
45. Pass discipline as a measured metric: no-bet rate must be higher where the interval is wide [calibration/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (How we know it's working)
   why: Doctrine names pass discipline as one of four win-condition measurements:
   land in: clv.py / calibration2.py report layer
46. Pass discipline as positive edge: declining a -5% EV bet is worth +5% [calibration/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 5)
   why: Doctrine lane 5 is knowing when to pass:
   land in: pass gate keyed to interval width in the sizing layer
47. Pass discipline: no-bet rate should rise where the interval is wide [calibration/unimplemented/high]
   source: REASONING_DOCTRINE_2026-10-05.md (point 5, Knowing when to pass)
   why: An honest uncertainty estimate that says 'I do not know, sit this out' is itself edge:
   land in: conformal interval output from calibration2.py driving a pass/no-bet gate
48. Per-class gates 2609-22632: separate error caps for spread/total/moneyline, >=15% lower abstention [calibration/unimplemented/high]
   source: GATE-SPECS.md (decision, line 842)
   why: The gate tests per-market-type gates (classes = spread, total, moneyline) with separate error caps derived from bankroll tolerance, minimizing abstention subject to those caps.
   land in: packages/prediction-engine/src/decision/2609-22632-perclass-gates.ts
49. Public betting percentage source is the blocker for steam and RLM detection; covers.com named as scrape candidate [data-source/unimplemented/high]
   source: PREDICTION_ENGINE_MASTER.md (sec 9 item 8, line 299)
   why: The steam and RLM detector needs line velocity from movement data plus divergence from a public betting percentage series;
   land in: new ingest module for a public betting percentage feed; wire into divergence.py
50. Temperature scaling 3-line fix for ECE 0.0538 into v5.2.8 behind founder gate [calibration/unimplemented/high]
   source: GSE_MASTER_PACK_2026-10-10.md (ENGINE_GAP_AUDIT.md section C row 39, line 72)
   why: calibration2.py already implements temperature_fit/apply (line 44) but it is not wired into production;
   land in: GSE production prediction path v5.2.8 (calibration2.py temperature_apply)

## HIGH-PRIORITY UNIMPLEMENTED (full set; 280 items)

- Dixon-Coles exponential time decay weight e^(-xi times days) is not coded -- RATING_ATLAS.md (Part II #15) [equation]
- Dixon-Coles time-decay xi fitting procedure -- PREDICTION_ENGINE_MASTER.md (App A18, line 392) [equation]
- Efficiency family EPA, SP+, DVOA, FPI, xG/xT, RAPM/EPM all need pbp feeds -- RATING_ATLAS.md (Part III #23, #24, #26, #27, #28, #29) [equation]
- Karlis-Ntzoufras bivariate Poisson fitting via EM -- PREDICTION_ENGINE_MASTER.md (App A19, line 395) [equation]
- Dixon-Coles rho low-score correction not implemented -- METRIC_UNIVERSE.md (Equations Library) [equation]
- Drawdown risk frontier 1710-04818: convex r_cur^X constraint, >=25% max-drawdown cut, per-category Kelly caps -- GATE-SPECS.md (decision, line 502) [equation]
- EVT prop tails: GEV/GPD for longest-X markets where the book assumes Gaussian -- GSE_MASTER_PACK_2026-10-10.md (ANGLES_REGISTRY.md section C, lines 530-535) [equation]
- Equations Library: 28 named equations with 14 unimplemented (none) -- METRIC_UNIVERSE.md (Equations Library) [equation]
- FPI hybrid regression (EPA + context + market) -- PREDICTION_ENGINE_MASTER.md (App A9, line 365) [equation]
- Glicko-2 idle-RD step phi' = sqrt(phi^2 + sigma^2), no volatility solve -- GSE_HANDOFF_PACK_2026-10-10.md (Part 0 item 1b line 14, Part A row 3 line 39, Part G gap 1 line 127) [equation]
- Hawkes self-exciting scoring process with home/away excitation asymmetry -- GSE_MASTER_PACK_2026-10-10.md (ANGLES_REGISTRY.md section A, lines 514-521) [equation]
- Multivariate slate sizer 1806-05293: exact Kelly convex program, >=5% realized log growth, correlation guardrail -- GATE-SPECS.md (decision, line 527) [equation]
- Posterior-Kelly: integrate sizing over the parameter posterior instead of plug-in Kelly -- GSE_MASTER_PACK_2026-10-10.md (ANGLES_REGISTRY.md section J, lines 575-579) [equation]
- Rest, travel and altitude situational effects with published magnitudes, all unmeasured -- METRIC_UNIVERSE.md (Situational Context Canon, rest/travel rows) [signal]
- Situational spots misprice by 1-3 points when they fire (published effect sizes) -- REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 1) [signal]
- Situational spots worth 1-3 points of mispricing -- REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, point 1) [signal]
- Steam and reverse line movement detection as a mechanical signal -- RATING_ATLAS.md (Part VI #46) + PREDICTION_ENGINE_MASTER Appendix A15 [signal]
- Weather situational effects with published magnitudes, all unmeasured -- METRIC_UNIVERSE.md (Situational Context Canon, weather rows) [signal]
- BDB lead angle: deceleration to re-acceleration asymmetry index on route drills -- GSE_MASTER_PACK_2026-10-10.md (BDB2027_GROUNDWORK.md section 3 item 1, line 468) [signal]
- Covariate engine: which situational features survive shrinkage -- RATING_ATLAS.md (Part IX, moat 5) [signal]
- EPA definition and its open data path -- RATING_ATLAS.md (Part III, system 23) [signal]
- EPA expected-points surface as rating core -- PREDICTION_ENGINE_MASTER.md (App A5, line 353) [signal]
- Empirical Bayes beta-binomial for rate stats -- PREDICTION_ENGINE_MASTER.md (App A12, line 374) [calibration]
- FTN 2025 fingerprint pass: play-action, RPO, motion and blitz EPA lifts -- GSE_BLUEPRINT_EXPANDED.md (QUEUE item 4) [signal]
- Feature canon with leakage discipline -- RATING_ATLAS.md (Part VIII, system 60; A21) [signal]
- Instability gate 2508-07556v2: selection by prediction instability at c=0.70 beats confidence top 70% -- GATE-SPECS.md (decision, line 768) [signal]
- Logarithmic opinion pool across books -- PREDICTION_ENGINE_MASTER.md (App A14, line 380) [signal]
- ML layer: logistic regression, gradient boosting and neural nets as a fourth edge family -- RATING_ATLAS.md (Part VIII #55) [signal]
- Next Gen Stats tracking suite: separation, rush YAC, air accuracy, time to throw, completion distance, max speed, acceleration, route efficiency -- METRIC_UNIVERSE.md (NFL Metrics table, NGS rows 99-113) [signal]
- OL versus RB attribution engine from PFR advanced rushing columns -- GSE_MASTER_PACK_2026-10-10.md (ENGINE_BLUEPRINTS.md section 2.1, lines 721-725) [signal]
- PFR player pages feed OL-vs-RB attribution and coverage adjacency -- GSE_BLUEPRINT_EXPANDED.md (PART 5 table, Player pages row) [signal]
- PFR player pages feed OL-vs-RB attribution, coverage adjacency, usage engine -- GSE_BLUEPRINT_EXPANDED.md (PART 5 table, Player pages row) [signal]
- PFR player pages: YBC, YAC, broken tackles, ADOT, drops, INT-when-targeted, pass-rating-allowed, snap counts -- GSE_BLUEPRINT_EXPANDED.md (PFR player pages row) [signal]
- Round-number anchoring shade map from the DK ladder files (kill K6) -- GSE_MASTER_PACK_2026-10-10.md (CONTEXTUAL_LAYER.md section 7 line 402 and section 10 K6) [signal]
- Scheme and coverage engines from nflfastR pbp columns (PC-only, pyreadr blocked on iSH) -- GSE_MASTER_PACK_2026-10-10.md (ENGINE_BLUEPRINTS.md section 2.2, lines 727-734) [signal]
- Situational Context Canon: 20 named factors with published EPA effects, all TBD -- METRIC_UNIVERSE.md (Situational Context Canon) [signal]
- Situational canon effect sizes are ready-made priors -- METRIC_UNIVERSE.md (Situational Context Canon) [calibration]
- Situational spots worth 1-3 points of mispricing when they fire -- REASONING_DOCTRINE_2026-10-05.md (Where the edge lives #1) [signal]
- Steam move and reverse line movement detection -- PREDICTION_ENGINE_MASTER.md (App A15, line 383) [signal]
- Timing edge on the news cycle before the line moves -- REASONING_DOCTRINE_2026-10-05.md (point 2, Timing) [signal]
- Timing lane: news-cycle reasoning before the market moves, 1-2% CLV per bet -- REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 2) [signal]
- Timing lane: read beat-reporter news and practice participation before the market moves -- REASONING_DOCTRINE_2026-10-05.md (Where the edge lives #2) [signal]
- Dual-threshold conformal abstention 2502-07255v2 replacing the fixed 70% confidence cutoff -- GATE-SPECS.md (decision, line 710) [calibration]
- FCS adjustment and FBS-only rating PARTIAL in our warehouse -- METRIC_UNIVERSE.md (CFB Metrics table) [calibration]
- Four working measurements replacing 'did mu beat the close' -- REASONING_DOCTRINE_2026-10-05.md (How we know it's working) [calibration]
- Normal-margin sigma constant: use Pinnacle's 13.19 or blend with stack's 13.45 -- GSE_HANDOFF_PACK_2026-10-10.md (Part A row 19 line 60 and Part B section 3 line 239) [calibration]
- Opinion pools: linear and logarithmic multi-book consensus -- PREDICTION_ENGINE_MASTER.md (section 9 item 6, A14) [calibration]
- Pass discipline as a measured metric: no-bet rate must be higher where the interval is wide -- REASONING_DOCTRINE_2026-10-05.md (How we know it's working) [calibration]
- Pass discipline as positive edge: declining a -5% EV bet is worth +5% -- REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 5) [calibration]
- Pass discipline: no-bet rate should rise where the interval is wide -- REASONING_DOCTRINE_2026-10-05.md (point 5, Knowing when to pass) [calibration]
- Per-class gates 2609-22632: separate error caps for spread/total/moneyline, >=15% lower abstention -- GATE-SPECS.md (decision, line 842) [calibration]
- Public betting percentage source is the blocker for steam and RLM detection; covers.com named as scrape candidate -- PREDICTION_ENGINE_MASTER.md (sec 9 item 8, line 299) [data-source]
- Temperature scaling 3-line fix for ECE 0.0538 into v5.2.8 behind founder gate -- GSE_MASTER_PACK_2026-10-10.md (ENGINE_GAP_AUDIT.md section C row 39, line 72) [calibration]
- The Odds API key slot unlocks multi-book comparison at 500 free calls per month -- PREDICTION_ENGINE_MASTER.md (sec 4 and sec 9 item 4) [data-source]
- Wire temperature scaling to fix ECE 0.0538 (founder gate) -- GSE_HANDOFF_PACK_2026-10-10.md (Part 0 item 1a line 13 and Part A row 39 line 85) [calibration]
- CFBD drive-level metrics block (points/yards/success/explosive per drive) -- METRIC_UNIVERSE.md (THE GAP LIST) [data-source]
- DK contest gamecenter and leaderboardfull/v3 are login-gated but carry entry lineups -- ENTRY_ENUMERATION_PLAN.md (MEASURED FACTS table) [data-source]
- EPA from nflverse play-by-play (biggest model upgrade available) -- PREDICTION_ENGINE_MASTER.md (section 9 item 1, A5) [data-source]
- GAP LIST of 138 missing metric items with source and priority -- METRIC_UNIVERSE.md (THE GAP LIST) [data-source]
- PFR boxscores carry named official crews, stadium, weather and Vegas lines -- GSE_BLUEPRINT_EXPANDED.md (PART 5 table, Boxscores row) [data-source]
- PFR boxscores carry named official crews, stadium, weather and the Vegas line -- GSE_BLUEPRINT_EXPANDED.md (PFR boxscores row) [data-source]
- PFR boxscores give named official crews, stadium, weather and Vegas lines -- GSE_BLUEPRINT_EXPANDED.md (PART 5 table, Boxscores row) [data-source]
- PFR full map: seven surfaces on one linked ID system -- GSE_BLUEPRINT_EXPANDED.md (PART 5 heading) [data-source]
- PFR seven surfaces on one linked ID system -- GSE_BLUEPRINT_EXPANDED.md (PART 5 - PFR FULL MAP) [data-source]
- PFR seven-surface map as the complete free public substrate -- GSE_BLUEPRINT_EXPANDED.md (PART 5 PFR FULL MAP) [data-source]
- PFR team-season expected points (exp_pts_off/def/st) as an independent EP archive -- GSE_BLUEPRINT_EXPANDED.md (PFR team season pages row) [data-source]
- Scout/tracking feed latency is the moat (Sportradar, Genius, IMG Arena) -- RATING_ATLAS.md (Part IX, moat 1) [data-source]
- The Odds API key slot for multi-book holds and log-opinion pool -- PREDICTION_ENGINE_MASTER.md (section 9 item 4, section 4) [data-source]
- DFS optimizer is greedy-by-value plus swap refinement, explicitly not an exact ILP solver -- PREDICTION_ENGINE_MASTER.md (sec 2.8, line 168) [dfs]
- Quantile regression for props: pinball loss, not MAE -- RATING_ATLAS.md (Part VIII #56) + PREDICTION_ENGINE_MASTER Appendix A13 [props]
- CFB play metrics stuck at PARTIAL: WPA, success rate, air yards, YAC and 10 more -- METRIC_UNIVERSE.md (CFB Metrics table, rows 300-329) [wiring]
- CFB team game-stat block ingested but never computed: drive metrics, conversion rates, penalties -- METRIC_UNIVERSE.md (CFB Metrics table, HAVE-data-not-computed rows) [wiring]
- Top 10 highest-value missing-free ranking is 6 nflverse pbp metrics then 4 NGS tracking metrics -- METRIC_UNIVERSE.md (Top 10 Highest-Value Missing-Free Items) [wiring]
- BALToR selection 2505-23437v2: bounded abstention with Mondrian conformal on edge sign at c=0.70 -- GATE-SPECS.md (decision, line 752) [parlay]
- CFB player usage and share metrics ingested but never computed: target share, air yard share, WYSR, dominator, market share, catch rate, YPRR -- METRIC_UNIVERSE.md (CFB Metrics table, usage rows) [dfs]
- Correlation is the biggest structural hole: SGP books hold 15-30% -- REASONING_DOCTRINE_2026-10-05.md (Where the edge actually lives, item 3) [parlay]
- DFS contest portfolio theory: cash versus GPP construction -- RATING_ATLAS.md (Part VII, system 54) [dfs]
- DFS product is the distribution, not the projection -- RATING_ATLAS.md (Part IX, moat 4) [dfs]
- Leverage deltas versus our projection feed using DK's own mu from the sportsbook ladder RE -- ENTRY_ENUMERATION_PLAN.md (CONSENSUS OUTPUT, final bullet) [dfs]
- NGS tracking metrics as prop-facing signals, not just aggregate columns -- METRIC_UNIVERSE.md (NFL Metrics, NGS block) [props]
- Prop edge detector: project mu from nflverse EPA, price with DK sigma table, edge > 0.4 sigma -- GSE_HANDOFF_PACK_2026-10-10.md (Part 0 item 1e line 17 and Part B section 3 lines 235-239) [props]
- Quantile regression for props (pinball loss, kills the Gaussian assumption) -- PREDICTION_ENGINE_MASTER.md (section 9 item 7, A20) [props]
- Quantile regression for props without Gaussian assumption -- PREDICTION_ENGINE_MASTER.md (App A20, line 398) [props]
- Structured leg abstention 1803-08355v2: parlay leg-level pre-image over >=300 settled slips -- GATE-SPECS.md (decision, line 517) [parlay]
- Totals abstention via sigma 2104-08236v1: softplus sigma, publish iff sigma <= tau, kappa = 90th percentile -- GATE-SPECS.md (decision, line 648) [props]
- consensus.py owned percent tiers: anchors over 30%, mid 10-30%, leverage under 10% -- ENTRY_ENUMERATION_PLAN.md (CONSENSUS OUTPUT) [dfs]
- CFB EPA sits behind EP and PPA in our own pipeline -- METRIC_UNIVERSE.md (CFB Metrics) [wiring]
- CFBD EPA/WPA/Success Rate only PARTIAL while EP/WP/PPA are computed -- METRIC_UNIVERSE.md (CFB Metrics table) [wiring]
- CLV auto-harvest wiring: clv.py plus Pinnacle close capture in books_api.snapshot() -- GSE_HANDOFF_PACK_2026-10-10.md (Part 0 item 1d line 16 and Part B section 5 lines 246-249) [wiring]
- Cross-book line compare gap: compare_mains.py does not exist -- GSE_HANDOFF_PACK_2026-10-10.md (Part B section 4 lines 243-244) [wiring]
- FPI: EPA efficiencies plus situational covariates plus market calibration -- RATING_ATLAS.md (Part III, system 27; A9) [wiring]
- Glicko-2 idle-RD step not wired (the one open engine) -- GSE_MASTER_PACK_2026-10-10.md (ENGINE_GAP_AUDIT.md section A row 3, line 26) [wiring]
- Injury metric block computed but not tied to availability or line movement -- METRIC_UNIVERSE.md (NFL Metrics) [wiring]
- NGS tracking metrics have data but no computed columns -- METRIC_UNIVERSE.md (NFL Metrics table) [wiring]
- Point-in-time warehouse ingest: rows keyed (game_id, book, market, observed_at) -- GSE_HANDOFF_PACK_2026-10-10.md (Part 0 item 1c line 15 and Part G gap 2 line 128) [wiring]
- decision family: 44 of 44 modules ENABLED = false and conditioned on a human call -- GATE-SPECS.md (Per-gate specifications: decision intro, line 468) [wiring]
- nflverse EPA/WPA/XYAC/CPOE ingested but never computed -- METRIC_UNIVERSE.md (NFL Metrics table) [wiring]
- novig_ingest.py first sample rows and leakage rule confirmation -- GSE_BLUEPRINT_EXPANDED.md (QUEUE item 1) [wiring]
- novig_ingest.py run and first sample rows with leakage rule confirmation -- GSE_BLUEPRINT_EXPANDED.md (QUEUE item 1) [wiring]
- Doc census is stale: 358 NNNN-NNNNN-named modules and 66 subdirs in src vs 179/23 in the doc -- GATE-SPECS.md (Scope and method, line 12) [ops]
- Merge the in-house pickem recon into one canonical endpoint registry -- GSE_MASTER_PACK_2026-10-10.md (PICKEM_RECON_MERGE_NOTES.md lines 854-861 and FANTASY_TOOLING_RECON section 5.2 line 678) [ops]
- Store-calibrate-refit discipline loop needs a persistence cron -- PREDICTION_ENGINE_MASTER.md (sec 9 item 3) [ops]
- Continuous store -> calibrate -> refit loop needs a persistence cron -- PREDICTION_ENGINE_MASTER.md (section 9 item 3) [ops]
- Four-part success measurement replacing 'did mu beat the close' -- REASONING_DOCTRINE_2026-10-05.md (How we know it is working) [ops]
- ICM drift monitor 2406-15760: alarm within 3 weeks of the 2024 kickoff rule on the TOTALS stream -- GATE-SPECS.md (ensemble, line 959) [ops]
- No gate in the corpus has been evaluated in this environment; every quoted threshold is a target -- GATE-SPECS.md (Findings, lines 1870-1872) [ops]
- PFR pull recipe and polite crawler sequencing (60 key players first) -- GSE_BLUEPRINT_EXPANDED.md (Status line, line 15; QUEUE items 2-3) [ops]
- PFR pull recipe: polite crawler, 60 key players first then teams/coaches/boxes -- GSE_BLUEPRINT_EXPANDED.md (Status line; QUEUE items 2-3) [ops]
- Run python3 novig_ingest.py and land first sample rows -- GSE_BLUEPRINT_EXPANDED.md (QUEUE item 1) [ops]
- Three named gaps to the sharps: data velocity, multi-book prices, discipline loop -- PREDICTION_ENGINE_MASTER.md (sec 11, line 331) [ops]
- Two-phase DK consensus process: pre-lock aggregates then at-lock full lineup enumeration -- ENTRY_ENUMERATION_PLAN.md (WHEN ARE LINEUPS VISIBLE) [ops]
- 24-state base-out Markov chain with pitcher-fatigue and umpire-bias conditioning -- Deep Research Equation Extraction (3).docx (section MODULE 4, 24-State Base-Out Markov Chains) [equation]
- Backward verifier error correction inverts the noise transition matrix -- Deep Research Equation Extraction (3).docx (section MODULE 1, backward correction; and Python RLVR_GRPO_Engine) [equation]
- Bellman Q-decay as a multiplicative trajectory product of step validities -- Deep Research Equation Extraction (3).docx (section MODULE 1, Bellman constraints; GroundedPRM / PathFinder prior art) [equation]
- CTMDP state evolution SDE and Hamilton-Jacobi-Bellman optimal control for win probability added -- Deep Research Equation Extraction (3).docx (section MODULE 4, CTMDPs and HJB Formulations) [equation]
- Conformal prediction set at target error level -- Deep Research Equation Extraction (2).docx (lines 7, 148-159, 325-328, 425-428) [equation]
- Constrained multi-asset Kelly with covariance and conformal-derived uncertainty discounts -- Deep Research Equation Extraction (3).docx (section MODULE 5, Multi-Asset Correlated Kelly Criterion) [equation]
- GRPO group-relative advantage normalized by median and MAD -- Deep Research Equation Extraction (3).docx (section MODULE 1, Group Relative Policy Optimization) [equation]
- GRPO surrogate objective with policy-ratio clipping against the reference policy -- Deep Research Equation Extraction (3).docx (section MODULE 1, GRPO credit assignment) [equation]
- R-vine and C-vine hierarchical copula decomposition for multi-leg parlays -- Deep Research Equation Extraction (3).docx (section MODULE 2, vine copula formulation) [equation]
- Random-memory Hawkes process with a multivariate excite-inhibit transition matrix -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [equation]
- Shin de-biasing: extracting true probabilities from decimal odds via the insider proportion -- Deep Research Equation Extraction (3).docx (section MODULE 5, Shin's De-Biasing and Asymmetric Insider Trading) [equation]
- Split conformal non-conformity quantile with finite-sample correction -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 225-280) [equation]
- Verifier noise channel: false-positive rate rho_0 and false-negative rate rho_1 -- Deep Research Equation Extraction (3).docx (section MODULE 1, Verifier Error Correction Dynamics) [equation]
- 1807.07536: Skellam regression for positional value -- World-Class Sports Probability Engine Corpus Audit.docx [equation]
- 2002.01193: copula-based multivariate hidden Markov model for momentum shifts -- World-Class Sports Probability Engine Corpus Audit.docx [equation]
- 2212.08116: point spread differentials to implied win probabilities -- World-Class Sports Probability Engine Corpus Audit.docx [equation]
- Archimedean family selection rule: Clayton for lower tail, Gumbel for upper tail, Frank for symmetric -- Deep Research Equation Extraction (3).docx (section MODULE 2, family comparison) [signal]
- BT MLE existence as a strong-connectivity condition on partitions -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (bradley_terry_mle_existence) [equation]
- Backlog 02: Sarmanov COM-Poisson copula vs independent Skellam/Poisson -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [equation]
- Binary Kelly stake fraction f* = (p*b - q)/b -- Autonomous High-Leverage Algorithmic Trading Architecture_ Feasibility and Implementation for Small-Capital Accounts.docx [equation]
- Broder containment c_w(A,B) and its asymmetry trap -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (broder_containment) [equation]
- Broder min-s sketch resemblance estimator -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (broder_min_s_sketch) [equation]
- Broder resemblance r_w(A,B) over w-shingles -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (broder_resemblance) [equation]
- Clayton copula for lower-tail clustering with closed-form tail dependence 2^(-1/theta) -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 389-418) [equation]
- Closed-form jump-diffusion safe-lead probability via the error function -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [equation]
- Cumulative logistic regression on 28 EPL seasons (win/draw/loss ordered outcomes) -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Section B4, arXiv:2406.09597, Section 3.2, Figure 2) [equation]
- DeepHit competing-risks survival architecture for injury and substitution hazards -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [equation]
- Disagreement 1: independent per-sport models beat a shared global calibrator -- Galaxy Sports Edge Research Audit.docx [equation]
- Disagreement 3: rules-aware generative likelihoods beat generic ML classification heads -- Galaxy Sports Edge Research Audit.docx [equation]
- False-split failure mode: erratum exponent correction near resemblance 1 -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (False-split failure mode) [equation]
- Fourth down go/no-go expected win probability equations -- Deep Research Equation Extraction (2).docx (lines 2104-2167) [equation]
- Generative likelihoods must respect domain constraints: truncation and win-by-two -- World-Class Sports Probability Engine Corpus Audit.docx [equation]
- Glicko-2 volatility root equation and Illinois iteration -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (glicko2_volatility_root, Step 5) [equation]
- Gumbel copula for upper-tail clustering with lambda_U = 2 - 2^(1/theta) -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 418-449) [equation]
- Jackknife+ 1-2alpha guarantee without sample splitting -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Barber et al., arXiv:1905.02928, Theorem 1) [equation]
- Jackknife+ interval for scarce calibration -- Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE.docx (Section A, Jackknife+) [equation]
- James-Stein shrinkage for paired-comparison log-utilities -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Shrinkage Estimation) [equation]
- LSH banding false-merge probability 1 - (1 - s^r)^b -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (LSH banding) [equation]
- Line movement dynamics differential equation -- Deep Research Equation Extraction (2).docx (lines 2285-2298) [equation]
- Market microstructure: NetLiq velocity and order-flow imbalance on Kalshi -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [signal]
- MinHash false-merge: shared preamble P dominates resemblance -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (MinHash false-merges) [equation]
- PlusDC covariate Bradley-Terry: sigma(u_i - u_j + (x_i - x_j)^T v) -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Section B2, Eq PlusDC, arXiv:2601.14727v2) [equation]
- Prospect theory fourfold risk paradigm table -- Deep Research Equation Extraction (2).docx (TABLE 1) [signal]
- Sarmanov Conway-Maxwell-Poisson marginals with dispersion parameter nu -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [equation]
- Sarmanov mixing kernel captures negative dependence missed by bivariate Poisson -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [equation]
- nflWAR expected points multinomial logit over seven scoring events -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Yurko/Ventura/Horowitz arXiv:1802.00998, Section 3.1) [equation]
- 2010.12508: profitability proven by decorrelating predictions from consensus lines -- World-Class Sports Probability Engine Corpus Audit.docx [signal]
- 2401.06086: XGBoost dynamic wager placement on in-play exchanges -- World-Class Sports Probability Engine Corpus Audit.docx [signal]
- Adopt Mondrian Conformal Prediction for conditional coverage -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Binary moneyline outcomes cannot use continuous residual conformal math -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- Cluster 7: diagnostic baselines and sequence null-hypotheses -- Galaxy Sports Edge Research Audit.docx [signal]
- Conformalized Quantile Regression with pinball loss for numeric lines -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- DAVE k=8 CRPS 7.500 underperforms market 7.109; keep as auxiliary Rung-2 input -- Galaxy Sports Edge Research Audit (3).docx (lines 242-259, Anti-Plan) [calibration]
- Deep Hawkes Process for limit-order-book market making to capture the spread -- Autonomous High-Leverage Algorithmic Trading Architecture_ Feasibility and Implementation for Small-Capital Accounts.docx [signal]
- Generalized Venn-Abers multiprobability bounds with a refusal width gate -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- Inverted confidence metric (z=-10.7) must not be relabeled as an Edge Index -- Galaxy Sports Edge Research Audit (3).docx (lines 242-259, Anti-Plan) [signal]
- Jackknife+ for scarce-data regimes such as early-season props -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- L1 estimand mis-specified: P(complete_pass) without throw-difficulty covariates -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [signal]
- Longitudinal Targeted Maximum Likelihood Estimation for player-value causal effects -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [signal]
- Murphy Brier decomposition with a Reliability greater than Resolution kill switch -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 451-520) [calibration]
- Murphy decomposition of the Brier score: reliability, resolution, uncertainty -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- NFL/NBA/MLB continuous-time game state vector definitions -- Deep Research Equation Extraction (2).docx (lines 1986-2046) [signal]
- PRM error taxonomy: arithmetic, logical, factual, omission, consistency -- Deep Research Equation Extraction (3).docx (section MODULE 1, Step-Wise Process Reward Modeling table) [calibration]
- Quantile clamping must be banned; fail-closed refusal instead -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- Reverse line movement indicator -- Deep Research Equation Extraction (2).docx (lines 2317-2324) [signal]
- Scoreline partial-credit evaluation with CRPS and Energy Scores -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Steam move detection indicator -- Deep Research Equation Extraction (2).docx (lines 2299-2316) [signal]
- Verification rubric thresholds and scoring weights -- Deep Research Equation Extraction (2).docx (section 8, verification_rubric JSON) [calibration]
- iWinRNFL generalized linear in-game win probability model -- Deep Research Equation Extraction (2).docx (line 2102) [signal]
- 2406.04062: online learning in betting markets, profit versus accuracy -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- 3.8x parameter error flagged where default constants 0.12 conflict with 45.42 -- Galaxy Sports Edge Research Audit (3).docx (lines 98-147, disposition table) [calibration]
- Adaptive Conformal Inference under non-exchangeability: alpha_(t+1) = alpha_t + gamma*(alpha - err_t) -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 280-303) [calibration]
- Adopt Conformal Risk Control bounding expected loss, not just miscoverage -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Backlog 01: Mondrian CRC vs global isotonic, kill line conditional ECE +0.02 -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Backlog 03: bipolar inf-KL e-process Kelly vs fixed fractional kappa=0.25 -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Backlog 04: Clark-McCracken bootstrap vs standard asymptotic t-test -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Backlog 05: Murphy decomposition vs unshrunk raw probabilities -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Backlog 08: anytime-valid e-process vs fixed-N asymptotic p-value -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Backward error correction for noisy verifiers: R_backward = (R_tilde - rho_0) / (1 - rho_0 - rho_1) -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 172-224) [calibration]
- CLV 23.2% is a MATCHED_CLOSE denominator artifact; decided-only CLV is 40.8% -- Galaxy Sports Edge Research Audit (3).docx (lines 34 and 62, section A) [calibration]
- CLV as predictor of long-run profitability (2% beat threshold) -- Deep Research Equation Extraction (2).docx (lines 2373-2375) [calibration]
- Claiming calibration from 70 settled live games is barred; n>=1,000 required -- Galaxy Sports Edge Research Audit (3).docx (lines 242-259, Anti-Plan) [calibration]
- Clark-McCracken bootstrap test for nested model comparison -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Cluster 3: calibration wrappers and conformal prediction stack -- Galaxy Sports Edge Research Audit.docx [calibration]
- Confidence metric is strongly anti-predictive: Brier 0.3617, z=-10.7 over n=2385 -- Galaxy Sports Edge Research Audit (3).docx (line 32, section A) [calibration]
- Conformal wrappers cannot repair point-estimate bias; order of operations fixed -- Galaxy Sports Edge Research Audit.docx [calibration]
- Contradiction 1: raw quantile regression under-covers; must be conformalized -- Galaxy Sports Edge Research Audit.docx [calibration]
- Contradiction 2: fail-closed refusal vs quantile clamping (fake tightness) -- Galaxy Sports Edge Research Audit.docx [calibration]
- Contradiction 3: binary point probabilities need Venn-Abers multiprobability bounds -- Galaxy Sports Edge Research Audit.docx [calibration]
- Copula Energy Scores as the proper scoring rule for parlay pricing A/B tests -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Customer calibration fix: weighted Bayesian calibration with 0.20 threshold -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [calibration]
- Do not deploy Venn-Abers over inverted metrics; it cannot fix fundamentally anti-predictive signals -- Galaxy Sports Edge Research Audit (3).docx (lines 242-259, Anti-Plan) [calibration]
- E-process wealth accumulation with Ville's inequality for anytime-valid edge proof -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [calibration]
- Failure thresholds: Brier >0.204 revokes badge, ECE >0.025 disables picks, coverage 88.5-91.5% at alpha=0.10 -- Galaxy Sports Edge Research Audit (3).docx (lines 292-297, Failure Thresholds) [calibration]
- HCI normalisation needed because GSE pools v5.2.6, v5.2.7, v5.3.0 and founder-v1 -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [calibration]
- Jackknife+ coverage target >=0.90 with 0.85 kill and +15% width kill -- Galaxy Sports Edge Research Audit (3).docx (lines 98-120, section A phases) [calibration]
- Market close CRPS 7.109 beats all internal structural models; DAVE k=8 yields 7.500 -- Galaxy Sports Edge Research Audit (3).docx (line 36, section A) [calibration]
- Minimum standards: NFL PASS suppression n>=100, red-zone NB VMR>=1.82, consensusPct=1.0 purge, NCAAF offline -- Galaxy Sports Edge Research Audit (3).docx (lines 52-97, section A thresholds) [calibration]
- Never linearly average historical scale 36.61 with modern 45.42 (produces invalid 41.01) -- Galaxy Sports Edge Research Audit (3).docx (lines 242-259, Anti-Plan) [calibration]
- Ordering duel: marketFairProb Brier 0.2189 beats rankingP 0.2462 and confidence 0.2741 -- Galaxy Sports Edge Research Audit (3).docx (line 33, section A) [calibration]
- Over-betting past Kelly turns geometric growth negative and raises ruin risk -- Autonomous High-Leverage Algorithmic Trading Architecture_ Feasibility and Implementation for Small-Capital Accounts.docx [calibration]
- Per-sport sigma_game required; global calibrators mathematically flawed -- Galaxy Sports Edge Research Audit.docx [calibration]
- Per-sport state-space models are mandatory; NBA calibration fails on MLB -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- Phase 1 devigging: Shin and Power methods from Kaunitz 1710.02824, Brier <=0.204 target -- Galaxy Sports Edge Research Audit (3).docx (lines 98-120, section A phases) [calibration]
- Phase 2 EPA constants SCALE=45.42 and HFA=2.10; kill if scale falls below 30 -- Galaxy Sports Edge Research Audit (3).docx (lines 98-120, section A phases) [calibration]
- Roadmap Phase 2: calibration and point-estimate optimization -- Galaxy Sports Edge Research Audit.docx [calibration]
- Roadmap Phase 3: conformal wrapping and uncertainty quantification -- Galaxy Sports Edge Research Audit.docx [calibration]
- Shift the training loss from BCE to Brier loss -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- Sign-stability-across-folds gate should be added to the spec battery -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [calibration]
- Sorting by raw model probability loses to devigged consensus (Brier 0.2462 vs 0.2189, n=689) -- Galaxy Sports Edge Research Audit (3).docx (lines 242-259, Anti-Plan) [calibration]
- Sport-specific sigma_game captures variance heterogeneity -- World-Class Sports Probability Engine Corpus Audit.docx [calibration]
- Spreadsheet thinness: no Brier scores or ECE against liquid betting markets -- Galaxy Sports Edge Research Audit.docx [calibration]
- Training under Brier loss beats BCE for calibration (NCAA basketball evidence) -- Galaxy Sports Edge Research Audit.docx [calibration]
- Variance drag and first-passage objective distortion of Kelly utility -- Autonomous High-Leverage Algorithmic Trading Architecture_ Feasibility and Implementation for Small-Capital Accounts.docx [calibration]
- Venn-Abers (1211.0025, 2605.06646) must beat 0.2189 Brier by >=0.005 or revert -- Galaxy Sports Edge Research Audit (3).docx (lines 98-120, section A phases) [calibration]
- 2403.16282 and 2604.17194: match forecasting against bookmaker odds and EMH -- World-Class Sports Probability Engine Corpus Audit.docx [data-source]
- API wiring priority order: wearables first, then PFF, Understat, Savant, FantasyPros, odds -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [data-source]
- L3 blocked on two inputs: no real snap counts and no book prop lines on the host -- Galaxy Sports Edge Research Audit (3).docx (agent status block and props lab, unique to variant 3) [data-source]
- L3 shelved wrongly: snap_counts_2015..2024.csv downloaded and never opened -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [data-source]
- NCAAF ingestion via cfbfastR and CollegeFootballData 2014-2025; kill if beat-rate <48% -- Galaxy Sports Edge Research Audit (3).docx (lines 98-120, section A phases) [data-source]
- Odds archive gap 2026-08-23 to 2026-09-12 plus fixture triplication and PENDING records -- Galaxy Sports Edge Research Audit (3).docx (lines 35 and 46, section A) [data-source]
- Priority wiring tiers 1-5 named with credential type per API -- Galaxy Sports Edge Research Audit (3).docx (Session Review, unique to variant 3) [data-source]
- VERSA state-transition verification for event-data quality control -- Galaxy Sports Edge Research Audit.docx [data-source]
- Calibration cron offline six days halts truth surface generation -- Galaxy Sports Edge Research Audit (3).docx (line 30, section A) [wiring]
- Coverage edge curve gate options not reaching tuning path -- Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE.docx (Table 1) [wiring]
- Documented defect: copula verifier uses scalar Brent on Frank only, omitting Clayton and Gumbel families -- Deep Research Equation Extraction (3).docx (section 1, Critical Flaws, copula critique) [wiring]
- Gap to solution blueprint table -- Deep Research Equation Extraction (2).docx (TABLE 2) [wiring]
- cqr.ts small-sample clamp defect unresolved -- Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE.docx (Table 1 excerpt) [wiring]
- 2603.22596: automated market making for parlay-style joint contracts -- World-Class Sports Probability Engine Corpus Audit.docx [parlay]
- Cluster 5: rare event and zero-inflated outcome heads for props -- Galaxy Sports Edge Research Audit.docx [props]
- /fantasy/dfs 500: static triage of FantasyShell, DfsOptimizer, TournamentLab skipped -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [wiring]
- 47 registered signals have no bridge model to directional probabilities -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (line 7) [wiring]
- 62 unverified columns: WHOOP/Oura 6, PFF 4, Understat 3, Savant 3, FantasyPros 3, odds 11, sports 59 -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [wiring]
- Avoid market orders entirely; quote into the LOB with low-latency limit orders -- Autonomous High-Leverage Algorithmic Trading Architecture_ Feasibility and Implementation for Small-Capital Accounts.docx [wiring]
- Baseball Savant columns returned a single constant value each -- Galaxy Sports Edge Research Audit (3).docx (Session Review, unique to variant 3) [wiring]
- Bridge model outputs P(outcome) plus sample size and homeSign directional indicator -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (line 99) [wiring]
- CRC as a sliding rheostat with deterministic HARD_PASS on empty prediction sets -- Algorithmic Audit_ Advancing Galaxy Sports Edge.pdf [wiring]
- Dedup arbitration: withhold merge when MinHash and SimHash disagree -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (SimHash vs MinHash arbitration) [wiring]
- Disagreement 2: decouple pure performance forecasting from market pricing -- Galaxy Sports Edge Research Audit.docx [wiring]
- EPA defaults 0.12 and 0.025 still live in nfl-epa-fair-value.ts per repo verification -- Galaxy Sports Edge Research Audit (3).docx (lines 298-317, launch architecture summary) [wiring]
- ETL pipeline only checks URL reachability; no real data extraction implemented -- Galaxy Sports Edge Research Audit (3).docx (Session Review, unique to variant 3) [wiring]
- L2 data-blocked: player_stats_*.csv absent from the host -- Galaxy Sports Edge Research Audit (3).docx (agent status block and props lab, unique to variant 3) [wiring]
- Lineage boundary leak into 03_quarantine_DO_NOT_INGEST -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Table 4, row 7) [wiring]
- Missing tombstone registry for HTTP 410 Gone endpoints -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Table 4, row 6) [wiring]
- Only 1 of 29 FTN columns used; 28 fully populated columns idle across 48,031 plays -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [wiring]
- Remaining Priority-1 engine defects: target_hhi default, swallowed DataGapError, tau_hat omission, pipeline divergence -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 660-720) [wiring]
- Stale cross-thread cache against equation-pool.jsonl -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Table 4, row 2) [wiring]
- Target leakage from closing lines destroys Closing Line Value measurement -- World-Class Sports Probability Engine Corpus Audit.docx [wiring]
- Target leakage from closing lines into team strength features -- Galaxy Sports Edge Research Audit.docx [wiring]
- Temporal Fusion Transformer for multi-horizon sports forecasting -- Deep Research Equation Extraction (2).docx (lines 1645-1680) [wiring]
- Trust layer bug: CLEAR verdict emitted when evidence is missing -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 660-720) [wiring]
- Uncoordinated second writer hazard on mind.jsonl -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Table 4, row 1) [wiring]
- Wiring gap: scalar Brent solves on Frank copulas ignore tail dynamics and misprice correlated segments -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 389-449) [wiring]
- agree-drain.jsonl double-count guard locked, append NOT_DONE -- Formal Verification, Deduplication Bounds, and Execution Routing Architecture for Algorithmic Rating and Inference Systems.docx (drain_manifest) [wiring]
- Documented defect: naive GRPO implementation computes per-trajectory loss instead of normalizing gradients across the group batch -- Deep Research Equation Extraction (3).docx (section 1, Critical Flaws and Hallucinations, GRPO critique) [ops]
- Golden evaluation suite unified test schema components -- Deep Research Equation Extraction (3).docx (section MODULE 6, Unified Test Schema Definition) [ops]
- RLVR_GRPO_Engine class constants and fail-closed branches -- Deep Research Equation Extraction (3).docx (section MODULE 1, Python listing) [ops]
- Shin probability extraction routine with fail-closed non-convergence branch -- Deep Research Equation Extraction (3).docx (section MODULE 5, Python listing) [ops]
- Assertion suppression: exit-code-only test harness passes placeholders -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Table 4, row 5) [ops]
- Credential brokering with ephemeral sub-15-minute tokens via Infisical Agent Proxy -- Comprehensive Architecture Audit_ Multi-Agent Fleet Orchestration.docx (lines 560-620) [ops]
- Cryptographic ledger: SHA-256 hash-chained receipts with RFC-3161 timestamps -- Galaxy Sports Edge Research Audit (3).docx (lines 260-297, Recomputable Standard) [ops]
- Do-not-open verdict for the customer board plus the minimum true checklist -- Galaxy Sports Edge Research Audit (3).docx (lines 48-51, section A) [ops]
- Golden Evaluation Suite structure: 1000+ cases, six tiers -- Deep Research Equation Extraction (2).docx (lines 2377-2399) [ops]
- Handoff branch handoff/gse-complete-2026-09-20 at commit ecc61d4b -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [ops]
- Roadmap Phase 1: foundation and diagnostic baselines -- Galaxy Sports Edge Research Audit.docx [ops]
- Three unmerged PRs (#868, #867, #866) block launch readiness -- Galaxy Sports Edge Research Audit (3).docx (line 31, section A) [ops]
- Unverified synthesis backlog: Frank Copula, Shin de-vig, HJB, 24-state Markov -- Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines.docx (Table 6, rows 4-7) [ops]
- Week 3 launch gate: DO NOT OPEN CUSTOMER BOARD, blocked by NLAO crash and OOM -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [ops]
- Withdrawn BLAS thread-sprawl causal claim; verified 2.32s to 0.35s speedup -- Galaxy Sports Edge Research Audit (3).docx (Handoff work package, unique to variant 3) [ops]

## COVERAGE ACCOUNTING

### Files read (verifiable)
- Sources read in full or via offset/limit windows: 9/9 Downloads doctrine files (REASONING_DOCTRINE_2026-10-05.md, GSE_BLUEPRINT_EXPANDED.md, PREDICTION_ENGINE_MASTER.md, RATING_ATLAS.md, SKILLS_COMPENDIUM.md, METRIC_UNIVERSE.md, ENTRY_ENUMERATION_PLAN.md, GSE_MASTER_PACK_2026-10-10.md, GSE_HANDOFF_PACK_2026-10-10.md), docs/gates/GATE-SPECS.md, and every doc/text-kind file in the three research dirs whose stem appears in at least one JSONL source_file label. The JSONL is the evidence of read: every row carries source_file plus a line/section pointer, so read coverage is auditable from the artifact itself rather than asserted here.
### Skipped, with reason
- Images/binaries/archives (.pdf/.zip/.png/.jpg/.xlsx/.doc): 171 files, 182.8 MB total across the three dirs (engine 93 bin, pred 77 bin, props 1 bin). Reason: not text-extractable here; any PDF-derived doctrine already exists as .docx/.md twins in the same dirs.
- data/snapshot dumps (.json/.jsonl/.csv/.tsv): 85 files, 6.6 MB. Reason: machine data, not leverage prose; not read per the task's do-not-read list.
- Out-of-scope personal/legal/administrative documents (Baxley/Turner/Pruzansky correspondence, EEOC charges, leases, settlement letters, W-9-style files) landed in the research dirs by directory drift. Reason: zero GSE leverage; excluded deliberately.
- Exact duplicate copies (same content, second+ filename): counted once; the JSONL entry for the content lists all copies in source_file so nothing is lost.
### Unread / not verifiably referenced (third-pass candidates)
- engine dir: 20 GSE-keyword text files have no matching source_file label in the JSONL. Named list: GEMINI-REVENUE-ENGINE-PATHS-2026-09-25.md; GSE_HF_Crawl_Plan_v4.docx; GSE_K11_Phase0_Full_Package.md; GSE_MIND_INGEST_6H_2026-10-03.md; GSE_MIND_LEAP_2026-10-03 (1).md; GSE_MIND_LEAP_2026-10-03.md; LUMERA_BRAND_OPERATING_SYSTEM (1).md; LUMERA_BRAND_OPERATING_SYSTEM.md; MISSION-ENGINE-WIRE-2026-10-03.md; acknowledgement_letter.pdf; edge_sheet_pp_vs_dk_v2 (1).csv; edge_sheet_pp_vs_dk_v2.csv; engine-tonight-verdict-2026-10-08.md; gse-reasoning-engine-brief-2026-10-02.md; gse_gsn_signal_aperture_brand_board_v2.pdf; kill_ledger_demo.json; signal-ledger.md; sportsbookodds.csv; weak-signal-engine.md; woodway-collection-proposal-clean-2026-10-06.docx
- pred dir: 46 GSE-keyword text files have no matching source_file label in the JSONL. Named list: CFB_MODEL_DECISION.md; Charcuterie-Chick-Proposal (1).pdf; Charcuterie-Chick-Proposal (2).pdf; Charcuterie-Chick-Proposal (3).pdf; Charcuterie-Chick-Proposal (4).pdf; Charcuterie-Chick-Proposal (5).pdf; Charcuterie-Chick-Proposal.pdf; DFS_Customer_Report_2026-10-11.md; Doug Houston Lead Engine v3 - Clean.pdf; EXAM-2026-09-30-ig-finds-gse-revenue.md; GSE FINAL LAUNCH 9.20.docx; GSE-MASTER-INVENTORY-2026-10-02.md; GSE-RL-mission-2026-10-02.md; GSE_58_independent_research.md; GSE_58_paper_dossiers.md; GSE_Master_Operating_System_Blueprint_v2.docx; GSE_PostGauntlet_Build_Plan_Execution.md; GSE_SUPER_GROK_HEAVY_FINDINGS_2026-10-03.md; GSE_SUPER_GROK_HEAVY_ROUND2_2026-10-03.md; GSE_Session_Handoff_2026-10-09.md; KILL_LEDGER.md; RATING_ATLAS (1).md; RATING_ATLAS-2026-10-08.md; Week-2-DFS-Complete-Dossier.md; Week-2-DFS-Complete-Dossier.pdf; Woodway_Collection_Exterior_Refresh_Proposal_AS_Builders (1).pdf; Woodway_Collection_Exterior_Refresh_Proposal_AS_Builders.pdf; X_DFS_DRAFTS_2026-10-11.md; antigravity-jev-process-2026-10-10.md; coding-agent-weather-and-skill-prompt.md; edge5_board_2026-10-11.json; gemini-gse-build-prompt-2026-10-06.md; gse-1344-disposition-ledger.csv; gse-deep-nfl-metrics-catalog-2026.md; gse-social-media-playbook.pdf; gse-v5.3.0-build-spec.md; gse_brain_ingestion_v1 (1).md; gse_brain_ingestion_v1.md; gse_brain_ingestion_v1_1.md; gse_transfer_operators_v1.md; kambi_props_bills_rams_2026-10-12.json; shadow-arch-engine-mapping.md; the-odds-api.com_.json; the-odds-api.com_features_spreadsheets.html.json; the-odds-api.com_sports-odds-data_betting-markets.html.json; theoddsapi.csv
- props dir: 2 GSE-keyword text files have no matching source_file label in the JSONL. Named list: deep-dive-props.md; espn_prop_bets_bills_rams_2026-10-12.json
- Caveat: source_file labels in the JSONL are often shortened/truncated (e.g. 'GATE-SPECS.md (decision, line 502)'), so this list is a conservative upper bound on genuinely unread files, not proof each was skipped.

### Contradictions between sources
- 9 landing areas are asserted both implemented and unimplemented across different rows (pull_entries.py; ratings2.py; engine_math.py; props_deep.py; divergence.py; calibration2.py; engine_math.py/ratings2.py; props_deep.py/engine_math.py; calibration module + eval suite). These are either (a) partially-built features whose status differs per sub-feature or (b) genuine source contradictions. Each row's status_basis carries the file that claimed it; resolution requires a code read, not a doc read.
- Within-doc contradictions noted in the doctrine set (recorded on the affected rows, prior_pass_note): GATE-SPECS.md both mandates and later defers several gates; PREDICTION_ENGINE_MASTER App A entries mark some equations 'implemented' in a table whose referenced implementation file does not contain them.
### Appendix: raw per-file inventory (auto-dumped; bucket labels approximate)
## Coverage accounting (auto-computed inventory of all three research dirs)
### included_candidate: 190 files, 18.92 MB
### dup_copy: 147 files, 46.15 MB
  SKIP engine  ---.docx.text.json
  SKIP engine  060726(3)(1).pdf
  SKIP engine  07.10.2026 Settlement Letter to Pruzansky  (1).docx
  SKIP engine  07.10.2026 Settlement Letter to Pruzansky  (2).docx
  SKIP engine  07.10.2026 Settlement Letter to Pruzansky  (3).docx
  SKIP engine  15e9862d-2e90-4a71-8503-11a95019ea0e (1).md
  SKIP engine  7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner (1).pdf
  SKIP engine  7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner (2).pdf
  SKIP engine  7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner (3).pdf
  SKIP engine  AccessKey (1).csv
  SKIP engine  Baxley_EEOC_Charge (1).pdf
  SKIP engine  Baxley_EEOC_Charge (2).pdf
  SKIP engine  Baxley_Turner_Exhibit_Index (1).docx
  SKIP engine  Baxley_Turner_Exhibit_Index (2).docx
  SKIP engine  Baxley_Turner_One_Page_Factual_Summary (1).docx
  SKIP engine  Baxley_Turner_One_Page_Factual_Summary (2).docx
  SKIP engine  CP_575_G (1).pdf
  SKIP engine  CTS_Lonestar_Historical_Narrative_Reconstruction 5 (1).docx
  SKIP engine  Cast of Characters (1).docx
  SKIP engine  Demand Letter Baxley 6.15.2026 (1).pdf
  SKIP engine  Demand Letter Baxley 6.15.2026 (2).pdf
  SKIP engine  Demand Letter Baxley 6.15.2026 (3).pdf
  SKIP engine  GB - Owners Manual  (1).docx
  SKIP engine  GSE_MIND_LEAP_2026-10-03 (1).md
  SKIP engine  Garrett_Baxley_HR_Director_Designed (1).pdf
  SKIP engine  Keys 4 GrokBot (1).docx
  SKIP engine  LUMERA_BRAND_OPERATING_SYSTEM (1).md
  SKIP engine  New Client Initial Instructions (1).pdf
  SKIP engine  New Client Initial Instructions (2).pdf
  SKIP engine  Pasted Text (4).txt
  SKIP engine  PolyForm NonCommercial 1.0.0 (1).txt
  SKIP engine  SIENNA_MATTER (1).md
  SKIP engine  Severance (1).pdf
  SKIP engine  TurnerMutualAgreementForAlternativeDisputeResolution_GarrettBaxley[1] (1).pdf
  SKIP engine  TurnerMutualAgreementForAlternativeDisputeResolution_GarrettBaxley[1] (2).pdf
  SKIP engine  Turner_Cleaned_Packet (1).pdf
  SKIP engine  Untitled document (2).docx
  SKIP engine  Untitled document (3).docx
  SKIP engine  Untitled document (8).docx
  SKIP engine  Webdesign (1).docx
  SKIP engine  agent-result (3).json
  SKIP engine  deepseek_markdown_20260821_5a9b1c (1).md
  SKIP engine  dk_vs_pinnacle_shade_2026-10-10 (1).csv
  SKIP engine  edge_sheet_pp_vs_dk_v2 (1).csv
  SKIP engine  extract-data-2026-08-29 (1).json
  SKIP engine  extract-data-2026-08-30 (1).json
  SKIP engine  extract-data-2026-09-17 (1).json
  SKIP engine  galaxy-sports-edge-brand-bible (1).pdf
  SKIP engine  google-deep-research-fleet-prompt-2026-10-07 (1).md
  SKIP engine  grok-bot-galaxy-review (1).md
  SKIP engine  logo chick (1).pdf
  SKIP engine  logs_202606010237_202606010252 (1).json
  SKIP engine  run_proactive_notification_phase-497540_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497545_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497583_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497589_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497635_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497638_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497657_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497663_high_item_1.md
  SKIP engine  run_proactive_notification_phase-497663_high_item_2.md
  SKIP engine  run_proactive_notification_phase-497703_high_item_1.md
  SKIP pred    AGENT-IMPLEMENTATION-HANDOFF (1).md
  SKIP pred    ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT (1).pdf
  SKIP pred    ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT (2).pdf
  SKIP pred    ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT (3).pdf
  SKIP pred    Antigravity_Corpus_2026-10-11 (1).md
  SKIP pred    Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE (1).docx
  SKIP pred    Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE (2).docx
  SKIP pred    Baxley POS with Exhibits (1).pdf
  SKIP pred    Baxley_Exhibit_Packet_Index (1).docx
  SKIP pred    Baxley_Exhibit_Packet_Index_1.docx
  SKIP pred    Baxley_Exhibit_Packet_Index_FINAL_2026-08-11 (1).pdf
  SKIP pred    Baxley_Exhibit_Packet_Index_FINAL_2026-08-11 (2).pdf
  SKIP pred    Baxley_Project_File_Audit_2026-08-13_1.md
  SKIP pred    Baxley_Project_File_Audit_2026-08-13_2.md
  SKIP pred    CODING_AGENT_PROMPT_EXACT (1).md
  SKIP pred    Charcuterie-Chick-Proposal (1).pdf
  SKIP pred    Charcuterie-Chick-Proposal (2).pdf
  SKIP pred    Charcuterie-Chick-Proposal (3).pdf
  SKIP pred    Charcuterie-Chick-Proposal (4).pdf
  SKIP pred    Charcuterie-Chick-Proposal (5).pdf
  SKIP pred    Chronology Worksheet (1).docx
  SKIP pred    Chronology_Worksheet_FILLED (1).docx
  SKIP pred    Deep Research Equation Extraction (2).docx
  SKIP pred    Deep Research Equation Extraction (3).docx
  SKIP pred    Document (1).pdf
  SKIP pred    Document (2).pdf
  SKIP pred    Doug_Craftco_Sales_Kit (1).pdf
  SKIP pred    Doug_Craftco_Sales_Kit (2).pdf
  SKIP pred    GB.5.4 (1).docx
  SKIP pred    GB.5.4 (2).docx
  SKIP pred    Galaxy Sports Edge Research Audit (1).docx
  SKIP pred    Galaxy Sports Edge Research Audit (2).docx
  SKIP pred    Galaxy Sports Edge Research Audit (3).docx
  SKIP pred    Mathematical Verification and Architecture Audit_ Sports Rating Systems, Conformal Coverage, Football Analytics Schemas, Orchestration Durability, and Extraction Pipelines (1).docx
  SKIP pred    PHASES_1-9_Comprehensive_Working_Document_1.docx
  SKIP pred    PREDICTION_ENGINE_MASTER (1).md
  SKIP pred    PREDICTION_ENGINE_MASTER (2).md
  SKIP pred    PREDICTION_ENGINE_MASTER (3).md
  SKIP pred    Pasted text (1).txt
  SKIP pred    Pasted text (2)(1).txt
  SKIP pred    RATING_ATLAS (1).md
  SKIP pred    REASONING_DOCTRINE_2026-10-05 (1).md
  SKIP pred    RESEARCH_SLATE_2 (1).md
  SKIP pred    RESEARCH_SLATE_2.md
  SKIP pred    SKILLS_COMPENDIUM (1).md
  SKIP pred    Sales_Territory_Self_Assessment_Doug_Baxley (1).docx
  SKIP pred    TASK-016-v3-consolidated-mission-2026-10-02 (1).md
  SKIP pred    Termination_Evidence_Reconstruction_Prompts_CTS_Haskell_Google_THM - Copy.docx
  SKIP pred    Untitled document (7).docx
  SKIP pred    Webdesign (2).docx
  SKIP pred    Webdesign (3).docx
  SKIP pred    Webdesign (4).docx
  SKIP pred    Webdesign (5).docx
  SKIP pred    Webdesign__2.docx
  SKIP pred    Webdesign__3.docx
  SKIP pred    Woodway_Collection_Exterior_Refresh_Proposal_AS_Builders (1).pdf
  SKIP pred    World-Class Sports Probability Engine Corpus Audit (1).docx
  SKIP pred    agent-result (5).json
  SKIP pred    agent-result (6).json
  SKIP pred    deepseek_text_20261002_0df8ba (1).txt
  SKIP pred    expanded_evidence_reconstruction_connector_review (1).docx
  SKIP pred    expanded_evidence_reconstruction_connector_review (2).docx
  SKIP pred    expanded_evidence_reconstruction_connector_review (3).docx
  SKIP pred    extract-data-2026-08-27 (3).json
  SKIP pred    extract-data-2026-08-30 (2).json
  SKIP pred    extract-data-2026-09-08 (1).json
  SKIP pred    extract-data-2026-09-08 (2).json
  SKIP pred    extract-data-2026-09-11 (1).json
  SKIP pred    extract-data-2026-09-11 (6).json
  SKIP pred    extract-data-2026-09-11 (7).json
  SKIP pred    extract-data-2026-09-11 (8).json
  SKIP pred    extract-data-2026-09-20 (1).json
  SKIP pred    extract-data-2026-09-20 (2).json
  SKIP pred    grok-bot-galaxy-review (2).md
  SKIP pred    gse_brain_ingestion_v1 (1).md
  SKIP pred    gse_brain_ingestion_v1_1.md
  SKIP pred    predictions.draftkings.com_en_.2026-08-26T17_43_20.713Z (1).json
  SKIP pred    turner8.4 (1).docx
  SKIP pred    turner8.4 - Copy (1).docx
  SKIP pred    turner8.4 - Copy (2).docx
  SKIP pred    turner8.4 - Copy (3).docx
  SKIP pred    turner8.4 - Copy (4).docx
  SKIP pred    turner8.4 - Copy (5).docx
  SKIP pred    turner8.4 - Copy.docx
  SKIP pred    vrsm-c-800-100121-twc (1).docx
### arxiv_raw_pdf: 32 files, 55.27 MB
  SKIP engine  1505.01462v1.pdf
  SKIP engine  2102.07545v2.pdf
  SKIP engine  2204.00003v3.pdf
  SKIP engine  2303.00285v1.pdf
  SKIP engine  2308.01492v1.pdf
  SKIP engine  2603.17324v1.pdf
  SKIP engine  2605.22073v2.pdf
  SKIP engine  2609.13822v1.pdf
  SKIP engine  2609.15254v1.pdf
  SKIP engine  2609.16468v1.pdf
  SKIP engine  2609.17091v1.pdf
  SKIP engine  2609.17271v1.pdf
  SKIP engine  2609.19388v1.pdf
  SKIP engine  2609.23158v1.pdf
  SKIP pred    1704.00197v3 (1).pdf
  SKIP pred    1704.00197v3.pdf
  SKIP pred    2006.08189v1.pdf
  SKIP pred    2212.03041v1.pdf
  SKIP pred    2212.05223v1.pdf
  SKIP pred    2311.04726v1.pdf
  SKIP pred    2511.00261v2.pdf
  SKIP pred    2602.00676v1.pdf
  SKIP pred    2602.23123v1.pdf
  SKIP pred    2604.02447v1.pdf
  SKIP pred    2604.13861v2.pdf
  SKIP pred    2604.26501v1.pdf
  SKIP pred    2604.27865v1.pdf
  SKIP pred    2605.13142v2.pdf
  SKIP pred    2607.00164v1.pdf
  SKIP pred    2609.01337v1.pdf
  SKIP pred    2609.10737v1.pdf
  SKIP pred    2609.19035v1.pdf
### binary_or_archive: 0 files, 0.00 MB
### legal_or_personal: 136 files, 95.52 MB
  SKIP engine  060726.pdf
  SKIP engine  07.10.2026 Settlement Letter to Pruzansky .docx
  SKIP engine  2026-09-08 Woodway Collection.pdf
  SKIP engine  460-2026-09584_E-File-Acknowledgments-Verified.pdf
  SKIP engine  460-2026-09584_Efile-Information-Summary.pdf
  SKIP engine  7 actions.docx
  SKIP engine  7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner.pdf
  SKIP engine  AccessKey.csv
  SKIP engine  Baxley_EEOC_Charge.pdf
  SKIP engine  Baxley_EEOC_Charge_Complete.pdf
  SKIP engine  Baxley_EEOC_Charge_FIXED.pdf
  SKIP engine  Baxley_Family_Heritage_Dossier.pdf
  SKIP engine  Baxley_Response_to_Turner_Position_Statement_DRAFT_2026-09-30.docx
  SKIP engine  Baxley_Turner_Exhibit_Index.docx
  SKIP engine  Baxley_Turner_One_Page_Factual_Summary.docx
  SKIP engine  Baxley_Turner_SEND_NOW_MASTER_FOR_COUNSEL.docx
  SKIP engine  Baxley_Turner_SEND_NOW_MASTER_FOR_COUNSEL.pdf
  SKIP engine  CASE_FILE_AND_EXHIBITS.pdf
  SKIP engine  CP_575_G.pdf
  SKIP engine  CTS_HR_Full_Investigation_Reconstruction 4.docx
  SKIP engine  CTS_Lonestar_Historical_Narrative_Reconstruction 3.docx
  SKIP engine  CTS_Lonestar_Historical_Narrative_Reconstruction 4.docx
  SKIP engine  CTS_Lonestar_Historical_Narrative_Reconstruction 5.docx
  SKIP engine  CTS_Lonestar_Historical_Narrative_Reconstruction 5.docx.pdf
  SKIP engine  CTS_Lonestar_Historical_Narrative_Reconstruction 7.docx
  SKIP engine  CTS_Lonestar_SPO_Recruiting_Flyers_FINAL_LARGE_QR_COMBINED.pdf
  SKIP engine  CTS_Lonestar_SPO_Recruiting_Flyers_MISSION_QR_ONLY_FIXED.pdf
  SKIP engine  CTS_THM_Onboarding_Process_Internal_HR_Checklist_CLEANED_FINAL_REMOVALS.pdf
  SKIP engine  Cast of Characters.docx
  SKIP engine  Cast_of_Characters_FILLED.docx
  SKIP engine  Charcuterie-Chick-Final-Preview-2.pdf
  SKIP engine  Charcuterie-Chick-Final-Preview.pdf
  SKIP engine  Charcuterie-Chick-Final.pdf
  SKIP engine  Charcuterie-Chick-Preview-Deposit.pdf
  SKIP engine  Chronological_Narrative_Garrett_Baxley_Turner.docx
  SKIP engine  Craftco_Truck_Sheet.pdf
  SKIP engine  Critical Event Resources.docx
  SKIP engine  Critical Event Resources.pdf
  SKIP engine  Demand Letter Baxley 6.15.2026.pdf
  SKIP engine  GB.EEOC.Turner.pdf
  SKIP engine  GB.EEOC.pdf
  SKIP engine  Garrett Baxley Representation Agreement 6.8.2026 - signed.pdf
  SKIP engine  Garrett Baxley Representation Agreement 6.8.2026.pdf
  SKIP engine  Garrett_Baxley_HR_Director_Designed.pdf
  SKIP engine  H1858.pdf
  SKIP engine  Intake Form 2024.pdf
  SKIP engine  Intern_Onboarding_TY_CTS_Evidence_Review.docx
  SKIP engine  MEMO_TO_COUNSEL.pdf
  SKIP engine  New Client Initial Instructions.pdf
  SKIP engine  PolyForm NonCommercial 1.0.0.txt
  SKIP engine  PolyForm Perimeter 1.0.1.txt
  SKIP engine  REDACTED-Settlement-Letter-2026-07-24.pdf
  SKIP engine  SIENNA_MATTER.md
  SKIP engine  Scan1.pdf
  SKIP engine  Scan1_under6MB.pdf
  SKIP engine  Severance.pdf
  SKIP engine  TWCCorrespondence.pdf
  SKIP engine  Tenant Move Out.pdf
  SKIP engine  TurnerMutualAgreementForAlternativeDisputeResolution_GarrettBaxley[1].pdf
  SKIP engine  Turner_Cleaned_Packet.pdf
  SKIP engine  acknowledgement_letter.pdf
  SKIP engine  case-notes-2026-09-16.md
  SKIP engine  certificate.pdf
  SKIP engine  filed_articles.pdf
  SKIP engine  fsa-money-resolution.md
  SKIP engine  logo chick.pdf
  SKIP engine  lyra_19d98f3ecd090071.pdf
  SKIP engine  lyra_19d9cafbfd707998.pdf
  SKIP engine  lyra_19da152c0e823929.pdf
  SKIP engine  lyra_19da15536d9a5476.pdf
  SKIP engine  sara_intro.pdf
  SKIP engine  woodway-collection-proposal-clean-2026-10-06.docx
  SKIP pred    10_13 update.docx
  SKIP pred    11207 Mattina lease.pdf.pdf
  SKIP pred    13235 Dairy Asford striping.pdf
  SKIP pred    2025 Turner Benefits Guide.pdf
  SKIP pred    460-2026-09584_Position Statement Cover Letter and Response Request.pdf
  SKIP pred    ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT.pdf
  SKIP pred    AcctAppMarginAndCustAgmt.pdf
  SKIP pred    Baxley POS with Exhibits.pdf
  SKIP pred    Baxley_Exhibit_Packet_Index.docx
  SKIP pred    Baxley_Exhibit_Packet_Index_2026-08-06.docx
  SKIP pred    Baxley_Exhibit_Packet_Index_20260806_FINAL.docx
  SKIP pred    Baxley_Exhibit_Packet_Index_20260806_FINAL.pdf
  SKIP pred    Baxley_Exhibit_Packet_Index_20260806_v6.docx
  SKIP pred    Baxley_Exhibit_Packet_Index_FINAL_2026-08-11.pdf
  SKIP pred    Baxley_Privileged_Memo_to_Counsel_2026-09-30.docx
  SKIP pred    Baxley_Project_File_Audit_2026-08-13.md
  SKIP pred    Baxley_Turner_CTS_LoneStar_Evidence_Packet_2026-06-03.pdf
  SKIP pred    Baxley_Turner_Full_Narrative_Chronology_for_Counsel_2026-06-07.pdf
  SKIP pred    CASE_FILE.md
  SKIP pred    CTS_LoneStar_ER_Context_Personal_Record 2.docx
  SKIP pred    CTS_Lonestar_Historical_Narrative_Reconstruction 2.docx
  SKIP pred    CTS_Lonestar_Work_Summary_Documentation.docx
  SKIP pred    Charcuterie-Chick-Final-Preview-Packet-v2.pdf
  SKIP pred    Charcuterie-Chick-Final-Preview-Packet-v3.pdf
  SKIP pred    Charcuterie-Chick-Final-Preview-Packet.pdf
  SKIP pred    Charcuterie-Chick-Proposal.pdf
  SKIP pred    Chronology Worksheet.docx
  SKIP pred    Chronology_Worksheet_FILLED.docx
  SKIP pred    Document.pdf
  SKIP pred    Doug_Craftco_Sales_Kit.pdf
  SKIP pred    Enterprise_Evidence_Reconstruction_Sandy_Jordyn_Context.docx
  SKIP pred    Garrett_Baxley_ATS_Executive_HR_Resume.pdf
  SKIP pred    Garrett_Baxley_Attorney_Preconsultation_Packet_2026-05-22.pdf
  SKIP pred    Garrett_Baxley_HR_ATS_Resume_High_Impact.pdf
  SKIP pred    Garrett_Baxley_HR_ATS_Resume_Revised.pdf
  SKIP pred    Garrett_Baxley_Resume_Designed.pdf
  SKIP pred    Garrett_Baxley_Turner_Counsel_Urgent_Report_2026-06-05.docx
  SKIP pred    Garrett_Baxley_Turner_Counsel_Urgent_Report_2026-06-05.pdf
  SKIP pred    Garrett_Baxley_Turner_Counsel_Urgent_Report_2026-06-05_FINAL_POST_DISCOVERY_UPDATED.pdf
  SKIP pred    INV147853250.pdf
  SKIP pred    Sales_Territory_Self_Assessment_Doug_Baxley.docx
  SKIP pred    Turner_Evidence_Audit_Index_2026-06-05.csv
  SKIP pred    Untitled document (10).docx
  SKIP pred    Untitled document.docx
  SKIP pred    Woodway_Collection_Exterior_Refresh_Proposal_AS_Builders.pdf
  SKIP pred    customer_agreement.pdf
  SKIP pred    evidence_reconstruction_stage1_report.docx
  SKIP pred    expanded_evidence_reconstruction_connector_review.docx
  SKIP pred    financial-deep-dive-2026-09-19.md
  SKIP pred    generate.pdf
  SKIP pred    heb_pharmacy_2026-08-21_56.78.pdf
  SKIP pred    hsa-reimbursement-candidates.md
  SKIP pred    may_4_memorandum_full_text.txt
  SKIP pred    payday-loan-borrower-protections-texas-2026-09-19.md
  SKIP pred    paystub2.pdf
  SKIP pred    paystub3.pdf
  SKIP pred    paystubd.pdf
  SKIP pred    paystubs.pdf
  SKIP pred    snap-reapply-worksheet-2026-09-19.md
  SKIP pred    stocks-trading-bots-handoff-grok.md
  SKIP pred    turner8.4.docx
  SKIP pred    vrsm-c-800-100121-twc.docx
  SKIP pred    vytalus_receipt.pdf
  SKIP pred    vytalus_receipt_2025-09-22_75.pdf
### no_gse_keyword: 124 files, 7.32 MB
  SKIP engine  15e9862d-2e90-4a71-8503-11a95019ea0e.md
  SKIP engine  1791493990381.txt
  SKIP engine  1791777240247.txt
  SKIP engine  26df9e33-9009-47fd-aae4-396fd746a305.pdf
  SKIP engine  45-day-research-compendium-2026-10-09.md
  SKIP engine  Clio_Message_to_Madeline_Garza_2026-09-30.txt
  SKIP engine  Copy_Paste_Email_for_Doug.txt
  SKIP engine  Data_Center_Post_Work_Product_Documentation.docx
  SKIP engine  FAMILY_RUNWAY_COMMAND_CENTER.md
  SKIP engine  HASHES.txt
  SKIP engine  HR_Onboarding_Packet_Investigative_Review.pdf
  SKIP engine  INTAKE_1.PDF
  SKIP engine  Keys 4 GrokBot.docx
  SKIP engine  LUMERA_BRAND_OPERATING_SYSTEM.md
  SKIP engine  OUTREACH_PACKET_20260826.md
  SKIP engine  Owners Manual - mv.pdf
  SKIP engine  PLAYBOOK.md
  SKIP engine  README.md
  SKIP engine  README.txt
  SKIP engine  STRONGEST_HACKING_STACK_2026.md
  SKIP engine  The document is a catalog draft, not a closed verification.docx
  SKIP engine  Webdesign.docx
  SKIP engine  _summary.txt
  SKIP engine  a467c6e9-ca97-4e2a-a802-62a1681bfb73.pdf
  SKIP engine  aed12055-41ce-4ac9-97e6-f5c7c43a290e.pdf
  SKIP engine  baxley_cept_document_humanized.pdf
  SKIP engine  consolidated_clipboard_ready_text.txt
  SKIP engine  devtools_welcome_to_linkvertise_get_content_access_a_short_ad.md
  SKIP engine  enterprise_discovery_prompt_connector_search.docx
  SKIP engine  env.txt
  SKIP engine  extract-data-2026-08-29.json
  SKIP engine  extract-data-2026-08-30.json
  SKIP engine  extracted_text.txt
  SKIP engine  full_text_scan_counts.json
  SKIP engine  garrett-resource-dump-2026-06-15.md
  SKIP engine  general-purpose.md
  SKIP engine  google-deep-research-fleet-prompt-2026-10-07.md
  SKIP engine  hermes_restart_single_item.md
  SKIP engine  hf_env.txt
  SKIP engine  latest.json
  SKIP engine  manifest-b9be04f3-b7d3-4423-9986-a254f2b183ae-1790111027-b1000c23-2026-09-22-21-04-49.json
  SKIP engine  media-generation-packet-show-art-1789917559.json
  SKIP engine  media-generation-steelers-browns-tnf-card-1790897760.json
  SKIP engine  models.json
  SKIP engine  ocr_progress.txt
  SKIP engine  owners_manual_full_text.txt
  SKIP engine  pdf_extracted_text_raw.txt
  SKIP engine  project.json
  SKIP engine  repo-dig-2026-09-12.md
  SKIP engine  research_results.csv
  SKIP engine  research_results.json
  SKIP engine  robots.txt
  SKIP engine  run_log.txt
  SKIP engine  url_baseline.json
  SKIP pred    2025_team_standings_offense.csv
  SKIP pred    2026-10-08-eod.md
  SKIP pred    Alpaca_Master+Securities+Lending+Agreement+for+Fully+Paid+Securities+Lending_v01.2025.03.pdf
  SKIP pred    Antigravity_Corpus_2026-10-11.md
  SKIP pred    Autonomous High-Leverage Algorithmic Trading Architecture_ Feasibility and Implementation for Small-Capital Accounts.docx
  SKIP pred    BAL@ATL-card.md
  SKIP pred    BDB2027_GROUNDWORK.md
  SKIP pred    BUF@LAR-card.md
  SKIP pred    Billing___Payments_-_Vytalus_Medical_Group.pdf
  SKIP pred    CIN@MIA-card.md
  SKIP pred    CLE@NYJ-card.md
  SKIP pred    CODING_AGENT_PROMPT_EXACT.md
  SKIP pred    DAL@PHI-card.md
  SKIP pred    DAL@PHI-matchups.md
  SKIP pred    DEN@LAC-card.md
  SKIP pred    DESIGN.md
  SKIP pred    DET@ARI-card.md
  SKIP pred    DIAGNOSTIC_CANDIDATE_SURFACE_2026-10-11.md
  SKIP pred    EMAIL-TO-CLIENT.md
  SKIP pred    Email_to_Ashley_Blair.txt
  SKIP pred    GROKPROMPT.md
  SKIP pred    HOU@TEN-card.md
  SKIP pred    HR_Engagement_Historical_Narrative_and_Risk_Review.docx
  SKIP pred    IND@PIT-card.md
  SKIP pred    Imersive company site- 3D long-table scene hand….md
  SKIP pred    LV@NE-card.md
  SKIP pred    METRIC_UNIVERSE.md
  SKIP pred    MIN@NO-card.md
  SKIP pred    NYG@WSH-card.md
  SKIP pred    PFR_PULL_RECIPE.md
  SKIP pred    PHI@JAX-card.md
  SKIP pred    PLAN-CONTENT-STRATEGY.md
  SKIP pred    PLATFORM_AUTH_REALITY.md
  SKIP pred    PREDICTION_ENGINE_MASTER.md
  SKIP pred    PROMPT-GLM-CREATIVE.md
  SKIP pred    README.md
  SKIP pred    REASONING_DOCTRINE_2026-10-05.md
  SKIP pred    SF@SEA-card.md
  SKIP pred    STOCK-DESK-GOOGLE-RESEARCH-BRIEF-2026-09-24.md
  SKIP pred    TASK-016-v3-consolidated-mission-2026-10-02.md
  SKIP pred    TB@DAL-card.md
  SKIP pred    What I Was Still Missing.docx
  SKIP pred    ai-search-geo-strategy.md
  SKIP pred    antigravity-jev-process-2026-10-10.md
  SKIP pred    c11totallaunch.txt
  SKIP pred    c12-close-the-pass.txt
  SKIP pred    claude-code-guide.md
  SKIP pred    claudedesignprompt.md
  SKIP pred    cockpit-history-2026-08-06.csv
  SKIP pred    coding-agent-weather-and-skill-prompt.md
  SKIP pred    coding-agent-wire-package-2026-10-02.md
  SKIP pred    coding-agent-wire-prompt.md
  SKIP pred    css2_raw.json
  SKIP pred    curried-moseying-sifakis.md
  SKIP pred    design-experience-system.md
  SKIP pred    extract-data-2026-09-04.json
  SKIP pred    extract-data-2026-09-11.json
  SKIP pred    extract-data-2026-09-12.json
  SKIP pred    extract-data-2026-09-15.json
  SKIP pred    extract-data-2026-09-17.json
  SKIP pred    extract-data-2026-09-20.json
  SKIP pred    https___github.docx
  SKIP pred    media-generation-cover-hero-1791497705.json
  SKIP pred    overnight-agent-prompt-2026-09-26.md
  SKIP pred    overnight-builder-prompt.md
  SKIP pred    peri-peri-night-recipe.md
  SKIP pred    source-hierarchy.md
  SKIP pred    week-5-research-packet-2026.md
  SKIP props   jensen-shannon.pdf
  SKIP props   sgp_correlations.json

### Included candidates that produced NO extracted item (candidate for a third pass): 587
- engine/---.docx.text.json
- engine/060726(3)(1).pdf
- engine/060726.pdf
- engine/07.10.2026 Settlement Letter to Pruzansky  (1).docx
- engine/07.10.2026 Settlement Letter to Pruzansky  (2).docx
- engine/07.10.2026 Settlement Letter to Pruzansky  (3).docx
- engine/07.10.2026 Settlement Letter to Pruzansky .docx
- engine/1505.01462v1.pdf
- engine/15e9862d-2e90-4a71-8503-11a95019ea0e (1).md
- engine/15e9862d-2e90-4a71-8503-11a95019ea0e.md
- engine/1791493990381.txt
- engine/1791777240247.txt
- engine/2026-09-08 Woodway Collection.pdf
- engine/2102.07545v2.pdf
- engine/2204.00003v3.pdf
- engine/2303.00285v1.pdf
- engine/2308.01492v1.pdf
- engine/2603.17324v1.pdf
- engine/2605.22073v2.pdf
- engine/2609.13822v1.pdf
- engine/2609.15254v1.pdf
- engine/2609.16468v1.pdf
- engine/2609.17091v1.pdf
- engine/2609.17271v1.pdf
- engine/2609.19388v1.pdf
- engine/2609.23158v1.pdf
- engine/26df9e33-9009-47fd-aae4-396fd746a305.pdf
- engine/45-day-research-compendium-2026-10-09.md
- engine/460-2026-09584_E-File-Acknowledgments-Verified.pdf
- engine/460-2026-09584_Efile-Information-Summary.pdf
- engine/7 actions.docx
- engine/7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner (1).pdf
- engine/7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner (2).pdf
- engine/7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner (3).pdf
- engine/7-24-26 - Pruzansky Ltr to Gilbert re Baxley v Turner.pdf
- engine/AccessKey (1).csv
- engine/AccessKey.csv
- engine/Baxley_EEOC_Charge (1).pdf
- engine/Baxley_EEOC_Charge (2).pdf
- engine/Baxley_EEOC_Charge.pdf
- engine/Baxley_EEOC_Charge_Complete.pdf
- engine/Baxley_EEOC_Charge_FIXED.pdf
- engine/Baxley_Family_Heritage_Dossier.pdf
- engine/Baxley_Response_to_Turner_Position_Statement_DRAFT_2026-09-30.docx
- engine/Baxley_Turner_Exhibit_Index (1).docx
- engine/Baxley_Turner_Exhibit_Index (2).docx
- engine/Baxley_Turner_Exhibit_Index.docx
- engine/Baxley_Turner_One_Page_Factual_Summary (1).docx
- engine/Baxley_Turner_One_Page_Factual_Summary (2).docx
- engine/Baxley_Turner_One_Page_Factual_Summary.docx
- engine/Baxley_Turner_SEND_NOW_MASTER_FOR_COUNSEL.docx
- engine/Baxley_Turner_SEND_NOW_MASTER_FOR_COUNSEL.pdf
- engine/CASE_FILE_AND_EXHIBITS.pdf
- engine/CLAUDE_PROJECT_AUDIT_PROMPT.md
- engine/CLIENT_READY_FINAL_AUDIT.txt
- engine/CLOUD-DIRECTIVE-2026-10-03.md
- engine/CODEX_LUMERA_BRAND_OS_IMPLEMENTATION_PROMPT.md
- engine/CP_575_G (1).pdf
- engine/CP_575_G.pdf
- engine/CTS_HR_Full_Investigation_Reconstruction 4.docx
- engine/CTS_Lonestar_Historical_Narrative_Reconstruction 3.docx
- engine/CTS_Lonestar_Historical_Narrative_Reconstruction 4.docx
- engine/CTS_Lonestar_Historical_Narrative_Reconstruction 5 (1).docx
- engine/CTS_Lonestar_Historical_Narrative_Reconstruction 5.docx
- engine/CTS_Lonestar_Historical_Narrative_Reconstruction 5.docx.pdf
- engine/CTS_Lonestar_Historical_Narrative_Reconstruction 7.docx
- engine/CTS_Lonestar_SPO_Recruiting_Flyers_FINAL_LARGE_QR_COMBINED.pdf
- engine/CTS_Lonestar_SPO_Recruiting_Flyers_MISSION_QR_ONLY_FIXED.pdf
- engine/CTS_THM_Onboarding_Process_Internal_HR_Checklist_CLEANED_FINAL_REMOVALS.pdf
- engine/Cast of Characters (1).docx
- engine/Cast of Characters.docx
- engine/Cast_of_Characters_FILLED.docx
- engine/Charcuterie-Chick-Final-Preview-2.pdf
- engine/Charcuterie-Chick-Final-Preview.pdf
- engine/Charcuterie-Chick-Final.pdf
- engine/Charcuterie-Chick-Preview-Deposit.pdf
- engine/Chronological_Narrative_Garrett_Baxley_Turner.docx
- engine/Clio_Message_to_Madeline_Garza_2026-09-30.txt
- engine/Copy_Paste_Email_for_Doug.txt
- engine/Craftco_Truck_Sheet.pdf
- engine/Critical Event Resources.docx
- engine/Critical Event Resources.pdf
- engine/Data_Center_Post_Work_Product_Documentation.docx
- engine/Demand Letter Baxley 6.15.2026 (1).pdf
- engine/Demand Letter Baxley 6.15.2026 (2).pdf
- engine/Demand Letter Baxley 6.15.2026 (3).pdf
- engine/Demand Letter Baxley 6.15.2026.pdf
- engine/FAMILY_RUNWAY_COMMAND_CENTER.md
- engine/FINAL_AUDIT.txt
- engine/GB - Owners Manual  (1).docx
- engine/GB.EEOC.Turner.pdf
- engine/GB.EEOC.pdf
- engine/GEMINI-PATHS-2026-09-25.md
- engine/GEMINI-REVENUE-ENGINE-PATHS-2026-09-25.md
- engine/GROK-BUILD-HANDOFF.md
- engine/GSE_HF_Crawl_Plan_v4.docx
- engine/GSE_K11_Phase0_Full_Package.md
- engine/GSE_MIND_INGEST_6H_2026-10-03.md
- engine/GSE_MIND_LEAP_2026-10-03 (1).md
- engine/GSE_MIND_LEAP_2026-10-03.md
- engine/Garrett Baxley Representation Agreement 6.8.2026 - signed.pdf
- engine/Garrett Baxley Representation Agreement 6.8.2026.pdf
- engine/Garrett_Baxley_HR_Director_Designed (1).pdf
- engine/Garrett_Baxley_HR_Director_Designed.pdf
- engine/H1858.pdf
- engine/HANDOFF_PROMPT.md
- engine/HASHES.txt
- engine/HR_Onboarding_Packet_Investigative_Review.pdf
- engine/INTAKE_1.PDF
- engine/Intake Form 2024.pdf
- engine/Intern_Onboarding_TY_CTS_Evidence_Review.docx
- engine/JORDYN_FINAL_AUDIT.txt
- engine/Keys 4 GrokBot (1).docx
- engine/Keys 4 GrokBot.docx
- engine/LUMERA_BRAND_OPERATING_SYSTEM (1).md
- engine/LUMERA_BRAND_OPERATING_SYSTEM.md
- engine/MEMO_TO_COUNSEL.pdf
- engine/MISSION-ENGINE-WIRE-2026-10-03.md
- engine/NOVA_CURRENT_AI_ECOSYSTEM_SNAPSHOT.md
- engine/NOVA_LIVE_SOURCE_VALIDATION_REPORT.md
- engine/New Client Initial Instructions (1).pdf
- engine/New Client Initial Instructions (2).pdf
- engine/New Client Initial Instructions.pdf
- engine/OUTREACH_PACKET_20260826.md
- engine/OVERNIGHT-2026-08-20-MLB-NFL-LAGUNA.md
- engine/Owners Manual - mv.pdf
- engine/PLAYBOOK.md
- engine/Pasted Text (4).txt
- engine/PolyForm NonCommercial 1.0.0 (1).txt
- engine/PolyForm NonCommercial 1.0.0.txt
- engine/PolyForm Perimeter 1.0.1.txt
- engine/REDACTED-Settlement-Letter-2026-07-24.pdf
- engine/REPO_STATE_REVIEW_20260826.md
- engine/REVENUE_OPERATOR_PROMPT.md
- engine/SIENNA_MATTER (1).md
- engine/SIENNA_MATTER.md
- engine/SONNET_LAUNCH_ACTION_PLAN_20260903.md
- engine/SOURCE-2026-09-12-deepseek-ground-truth-batch-3.md
- engine/STRONGEST_HACKING_STACK_2026.md
- engine/Scan1.pdf
- engine/Scan1_under6MB.pdf
- engine/Severance (1).pdf
- engine/Severance.pdf
- engine/TWCCorrespondence.pdf
- engine/Tenant Move Out.pdf
- engine/The document is a catalog draft, not a closed verification.docx
- engine/TurnerMutualAgreementForAlternativeDisputeResolution_GarrettBaxley[1] (1).pdf
- engine/TurnerMutualAgreementForAlternativeDisputeResolution_GarrettBaxley[1] (2).pdf
- engine/TurnerMutualAgreementForAlternativeDisputeResolution_GarrettBaxley[1].pdf
- engine/Turner_Cleaned_Packet (1).pdf
- engine/Turner_Cleaned_Packet.pdf
- engine/Untitled document (2).docx
- engine/Untitled document (3).docx
- engine/Untitled document (8).docx
- engine/WEEK5-OPERATOR-2026-10-08.md
- engine/Webdesign (1).docx
- engine/Webdesign.docx
- engine/a467c6e9-ca97-4e2a-a802-62a1681bfb73.pdf
- engine/acknowledgement_letter.pdf
- engine/aed12055-41ce-4ac9-97e6-f5c7c43a290e.pdf
- engine/agent-result (3).json
- engine/arxiv_links.csv
- engine/baxley_cept_document_humanized.pdf
- engine/bkm_convergence_results.json
- engine/case-notes-2026-09-16.md
- engine/cfb_games_2026-10-10.json
- engine/consolidated_clipboard_ready_text.txt
- engine/deepseek-mega-research-prompt.md
- engine/deepseek-phase3-build-the-machine.md
- engine/deepseek_markdown_20260820_31595d.md
- engine/deepseek_markdown_20260821_5a9b1c (1).md
- engine/deepseek_markdown_20260821_5a9b1c.md
- engine/deepseek_text_20260819_00b087.txt
- engine/deepseek_text_20260819_5d597a.txt
- engine/deepseek_text_20260819_96087c.txt
- engine/deepseek_text_20260820_4aebfc.txt
- engine/deepseek_text_20260820_67d7bd.txt
- engine/deepseek_text_20260820_7ad9eb.txt
- engine/deepseek_text_20260820_94dc3a.txt
- engine/deepseek_text_20260821_314b87.txt
- engine/deepseek_text_20260924_70adaa.txt
- engine/deepseek_text_20261006_d85026.txt
- engine/deepseek_text_20261007_f59484.txt
- engine/devtools_welcome_to_linkvertise_get_content_access_a_short_ad.md
- engine/dk_vs_pinnacle_shade_2026-10-10 (1).csv
- engine/dk_vs_pinnacle_shade_2026-10-10.csv
- engine/edge_sheet_pp_vs_dk_v2 (1).csv
- engine/edge_sheet_pp_vs_dk_v2.csv
- engine/engine-tonight-verdict-2026-10-08.md
- engine/enterprise_discovery_prompt_connector_search.docx
- engine/env.txt
- engine/extract-data-2026-08-29 (1).json
- engine/extract-data-2026-08-29.json
- engine/extract-data-2026-08-30 (1).json
- engine/extract-data-2026-08-30.json
- engine/extract-data-2026-09-17 (1).json
- engine/extracted_text.txt
- engine/filed_articles.pdf
- engine/fsa-money-resolution.md
- engine/full_text_scan_counts.json
- engine/galaxy-sports-edge-brand-bible (1).pdf
- engine/galaxy-sports-edge-brand-bible.pdf
- engine/garrett-resource-dump-2026-06-15.md
- engine/gemini-deep-research-brief-2026-10-08.md
- engine/gemini-gated-universe-prompt.md
- engine/general-purpose.md
- engine/google-deep-research-fleet-prompt-2026-10-07 (1).md
- engine/google-deep-research-fleet-prompt-2026-10-07.md
- engine/grok-bot-galaxy-review (1).md
- engine/grok-bot-galaxy-review.md
- engine/grok-bot-grind-prompt-2026-10-02.md
- engine/gse-reasoning-engine-brief-2026-10-02.md
- engine/gse_gsn_signal_aperture_brand_board_v2.pdf
- engine/hermes-handoff-2026-09-12.md
- engine/hermes_restart_single_item.md
- engine/hf_env.txt
- engine/kill_ledger_demo.json
- engine/latest.json
- engine/logo chick (1).pdf
- engine/logo chick.pdf
- engine/logs_202606010237_202606010252 (1).json
- engine/lyra_19d98f3ecd090071.pdf
- engine/lyra_19d9cafbfd707998.pdf
- engine/lyra_19da152c0e823929.pdf
- engine/lyra_19da15536d9a5476.pdf
- engine/manifest-b9be04f3-b7d3-4423-9986-a254f2b183ae-1790111027-b1000c23-2026-09-22-21-04-49.json
- engine/master_transcriptions.md
- engine/media-generation-packet-show-art-1789917559.json
- engine/media-generation-steelers-browns-tnf-card-1790897760.json
- engine/monetization-lanes.md
- engine/ocr_progress.txt
- engine/pdf_extracted_text_raw.txt
- engine/pinnacle_mkt_1637432960.json
- engine/pinnacle_mkt_1637435175.json
- engine/pinnacle_mkt_1637435176.json
- engine/project.json
- engine/repo-dig-2026-09-12.md
- engine/research_results.csv
- engine/research_results.json
- engine/robots.txt
- engine/run_log.txt
- engine/run_proactive_notification_phase-497540_high_item_1.md
- engine/run_proactive_notification_phase-497545_high_item_1.md
- engine/run_proactive_notification_phase-497583_high_item_1.md
- engine/run_proactive_notification_phase-497589_high_item_1.md
- engine/run_proactive_notification_phase-497635_high_item_1.md
- engine/run_proactive_notification_phase-497638_high_item_1.md
- engine/run_proactive_notification_phase-497657_high_item_1.md
- engine/run_proactive_notification_phase-497663_high_item_1.md
- engine/run_proactive_notification_phase-497663_high_item_2.md
- engine/run_proactive_notification_phase-497703_high_item_1.md
- engine/sara_intro.pdf
- engine/signal-ledger.md
- engine/sportsbookodds.csv
- engine/super heavy grok ---- review this session.docx
- engine/teammate.md
- engine/training-mission-2026-10-02.md
- engine/url_baseline.json
- engine/voice-draft.md
- engine/weak-signal-engine.md
- engine/woodway-collection-proposal-clean-2026-10-06.docx
- pred/10_13 update.docx
- pred/11207 Mattina lease.pdf.pdf
- pred/13235 Dairy Asford striping.pdf
- pred/1704.00197v3 (1).pdf
- pred/1704.00197v3.pdf
- pred/2006.08189v1.pdf
- pred/2025 Turner Benefits Guide.pdf
- pred/2025_team_standings_offense.csv
- pred/2026-10-08-eod.md
- pred/2212.03041v1.pdf
- pred/2212.05223v1.pdf
- pred/2311.04726v1.pdf
- pred/2511.00261v2.pdf
- pred/2602.00676v1.pdf
- pred/2602.23123v1.pdf
- pred/2604.02447v1.pdf
- pred/2604.13861v2.pdf
- pred/2604.26501v1.pdf
- pred/2604.27865v1.pdf
- pred/2605.13142v2.pdf
- pred/2607.00164v1.pdf
- pred/2609.01337v1.pdf
- pred/2609.10737v1.pdf
- pred/2609.19035v1.pdf
- pred/460-2026-09584_Position Statement Cover Letter and Response Request.pdf
- pred/AGENT-IMPLEMENTATION-HANDOFF (1).md
- pred/AGENT-IMPLEMENTATION-HANDOFF.md
- pred/ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT (1).pdf
- pred/ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT (2).pdf
- pred/ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT (3).pdf
- pred/ALPACA+SECURITIES+LLC++OPTIONS+AGREEMENT.pdf
- pred/ATLAS_STATUS.md
- pred/AcctAppMarginAndCustAgmt.pdf
- pred/Alpaca_Master+Securities+Lending+Agreement+for+Fully+Paid+Securities+Lending_v01.2025.03.pdf
- pred/Antigravity_Corpus_2026-10-11 (1).md
- pred/Antigravity_Corpus_2026-10-11.md
- pred/BAL@ATL-card.md
- pred/BUF@LAR-card.md
- pred/Baxley POS with Exhibits (1).pdf
- pred/Baxley POS with Exhibits.pdf
- pred/Baxley_Exhibit_Packet_Index (1).docx
- pred/Baxley_Exhibit_Packet_Index.docx
- pred/Baxley_Exhibit_Packet_Index_1.docx
- pred/Baxley_Exhibit_Packet_Index_2026-08-06.docx
- pred/Baxley_Exhibit_Packet_Index_20260806_FINAL.docx
- pred/Baxley_Exhibit_Packet_Index_20260806_FINAL.pdf
- pred/Baxley_Exhibit_Packet_Index_20260806_v6.docx
- pred/Baxley_Exhibit_Packet_Index_FINAL_2026-08-11 (1).pdf
- pred/Baxley_Exhibit_Packet_Index_FINAL_2026-08-11 (2).pdf
- pred/Baxley_Exhibit_Packet_Index_FINAL_2026-08-11.pdf
- pred/Baxley_Privileged_Memo_to_Counsel_2026-09-30.docx
- pred/Baxley_Project_File_Audit_2026-08-13.md
- pred/Baxley_Project_File_Audit_2026-08-13_1.md
- pred/Baxley_Project_File_Audit_2026-08-13_2.md
- pred/Baxley_Turner_CTS_LoneStar_Evidence_Packet_2026-06-03.pdf
- pred/Baxley_Turner_Full_Narrative_Chronology_for_Counsel_2026-06-07.pdf
- pred/Billing___Payments_-_Vytalus_Medical_Group.pdf
- pred/CASE_FILE.md
- pred/CFB_MODEL_DECISION.md
- pred/CHI@GB-card.md
- pred/CIN@MIA-card.md
- pred/CLE@NYJ-card.md
- pred/CODEX_COPY_INSTRUCTIONS.md
- pred/CODING_AGENT_PROMPT_EXACT (1).md
- pred/CODING_AGENT_PROMPT_EXACT.md
- pred/CTS_LoneStar_ER_Context_Personal_Record 2.docx
- pred/CTS_Lonestar_Historical_Narrative_Reconstruction 2.docx
- pred/CTS_Lonestar_Work_Summary_Documentation.docx
- pred/Charcuterie-Chick-Final-Preview-Packet-v2.pdf
- pred/Charcuterie-Chick-Final-Preview-Packet-v3.pdf
- pred/Charcuterie-Chick-Final-Preview-Packet.pdf
- pred/Charcuterie-Chick-Proposal (1).pdf
- pred/Charcuterie-Chick-Proposal (2).pdf
- pred/Charcuterie-Chick-Proposal (3).pdf
- pred/Charcuterie-Chick-Proposal (4).pdf
- pred/Charcuterie-Chick-Proposal (5).pdf
- pred/Charcuterie-Chick-Proposal.pdf
- pred/Chronology Worksheet (1).docx
- pred/Chronology Worksheet.docx
- pred/Chronology_Worksheet_FILLED (1).docx
- pred/Chronology_Worksheet_FILLED.docx
- pred/DAL@PHI-card.md
- pred/DAL@PHI-matchups.md
- pred/DEN@LAC-card.md
- pred/DESIGN.md
- pred/DET@ARI-card.md
- pred/DFS_Customer_Report_2026-10-11.md
- pred/DIAGNOSTIC_CANDIDATE_SURFACE_2026-10-11.md
- pred/Document (1).pdf
- pred/Document (2).pdf
- pred/Doug Houston Lead Engine v3 - Clean.pdf
- pred/Doug_Craftco_Sales_Kit (1).pdf
- pred/Doug_Craftco_Sales_Kit (2).pdf
- pred/Doug_Craftco_Sales_Kit.pdf
- pred/EMAIL-TO-CLIENT.md
- pred/EXAM-2026-09-30-ig-finds-gse-revenue.md
- pred/EXAM-2026-09-30-morning-deep-dive.md
- pred/Email_to_Ashley_Blair.txt
- pred/Enterprise_Evidence_Reconstruction_Sandy_Jordyn_Context.docx
- pred/FRONTIER_SWEEP_2026-10-10.md
- pred/GB.5.4 (1).docx
- pred/GB.5.4 (2).docx
- pred/GEMINI-DEEP-RESEARCH-PROMPT-2026-10-08.md
- pred/GEMINI_DEEP_RESEARCH_CLOSED_2026-10-03.md
- pred/GROKPROMPT.md
- pred/GSE FINAL LAUNCH 9.20.docx
- pred/GSE-MASTER-INVENTORY-2026-10-02.md
- pred/GSE-RL-mission-2026-10-02.md
- pred/GSE_58_independent_research.md
- pred/GSE_58_paper_dossiers.md
- pred/GSE_Master_Operating_System_Blueprint_v2.docx
- pred/GSE_PostGauntlet_Build_Plan_Execution.md
- pred/GSE_SUPER_GROK_HEAVY_FINDINGS_2026-10-03.md
- pred/GSE_SUPER_GROK_HEAVY_ROUND2_2026-10-03.md
- pred/GSE_Session_Handoff_2026-10-09.md
- pred/Garrett_Baxley_ATS_Executive_HR_Resume.pdf
- pred/Garrett_Baxley_Attorney_Preconsultation_Packet_2026-05-22.pdf
- pred/Garrett_Baxley_HR_ATS_Resume_High_Impact.pdf
- pred/Garrett_Baxley_HR_ATS_Resume_Revised.pdf
- pred/Garrett_Baxley_Resume_Designed.pdf
- pred/Garrett_Baxley_Turner_Counsel_Urgent_Report_2026-06-05.docx
- pred/Garrett_Baxley_Turner_Counsel_Urgent_Report_2026-06-05.pdf
- pred/Garrett_Baxley_Turner_Counsel_Urgent_Report_2026-06-05_FINAL_POST_DISCOVERY_UPDATED.pdf
- pred/HANDOFF-GEMINI-2026-09-25.md
- pred/HANDOFF_20260908.md
- pred/HERMES_HANDOFF_V3_20260818.md
- pred/HERMES_HANDOFF_V4_20260818.md
- pred/HERMES_HANDOFF_V5_20260818.md
- pred/HERMES_HANDOFF_V6_20260818.md
- pred/HOU@TEN-card.md
- pred/HR_Engagement_Historical_Narrative_and_Risk_Review.docx
- pred/IND@PIT-card.md
- pred/INV147853250.pdf
- pred/Imersive company site- 3D long-table scene hand….md
- pred/Institutional Integration of 10Hz NFL Spatial Tracking .docx
- pred/Institutional Integration of 10Hz NFL Spatial Tracking .pdf
- pred/KILL_LEDGER.md
- pred/LAUNCH_READINESS_20260902.md
- pred/LV@NE-card.md
- pred/MIN@NO-card.md
- pred/NYG@WSH-card.md
- pred/Neutral-site handling is not a research item.docx
- pred/OUTLINE.md
- pred/OVERNIGHT20260820LAGUNA.md
- pred/PFR_PULL_RECIPE.md
- pred/PHASES_1-9_Comprehensive_Working_Document.docx
- pred/PHASES_1-9_Comprehensive_Working_Document_1.docx
- pred/PHI@JAX-card.md
- pred/PICKS_STATE_20260902.md
- pred/PLAN-CONTENT-STRATEGY.md
- pred/PLATFORM_AUTH_REALITY.md
- pred/PREDICTION_ENGINE_MASTER (1).md
- pred/PREDICTION_ENGINE_MASTER (2).md
- pred/PREDICTION_ENGINE_MASTER (3).md
- pred/PROMPT-GLM-CREATIVE.md
- pred/Pasted text (1).txt
- pred/Pasted text (2)(1).txt
- pred/RATING_ATLAS (1).md
- pred/RATING_ATLAS-2026-10-08.md
- pred/REASONING_DOCTRINE_2026-10-05 (1).md
- pred/REMEDIATION_REPORT_20260902.md
- pred/RESEARCH_SLATE_2 (1).md
- pred/RESEARCH_SLATE_2.md
- pred/REVIEW-INDEX-2026-10-11.md
- pred/SESSION_REPORT_2026-10-10.md
- pred/SF@SEA-card.md
- pred/SKILLS_COMPENDIUM (1).md
- pred/STOCK-DESK-GOOGLE-RESEARCH-BRIEF-2026-09-24.md
- pred/Sales_Territory_Self_Assessment_Doug_Baxley (1).docx
- pred/Sales_Territory_Self_Assessment_Doug_Baxley.docx
- pred/TASK-016-v3-consolidated-mission-2026-10-02 (1).md
- pred/TASK-016-v3-consolidated-mission-2026-10-02.md
- pred/TB@DAL-card.md
- pred/Termination_Evidence_Reconstruction_Prompts_CTS_Haskell_Google_THM - Copy.docx
- pred/Turner_Evidence_Audit_Index_2026-06-05.csv
- pred/Untitled document (10).docx
- pred/Untitled document (7).docx
- pred/Untitled document.docx
- pred/WHY.md
- pred/Webdesign (2).docx
- pred/Webdesign (3).docx
- pred/Webdesign (4).docx
- pred/Webdesign (5).docx
- pred/Webdesign__2.docx
- pred/Webdesign__3.docx
- pred/Week-2-DFS-Complete-Dossier.md
- pred/Week-2-DFS-Complete-Dossier.pdf
- pred/What I Was Still Missing.docx
- pred/Woodway_Collection_Exterior_Refresh_Proposal_AS_Builders (1).pdf
- pred/Woodway_Collection_Exterior_Refresh_Proposal_AS_Builders.pdf
- pred/X_DFS_DRAFTS_2026-10-11.md
- pred/agent-result (5).json
- pred/agent-result (6).json
- pred/ai-search-geo-strategy.md
- pred/antigravity-jev-process-2026-10-10.md
- pred/ask-the-brain.md
- pred/c11totallaunch.txt
- pred/c12-close-the-pass.txt
- pred/cfb_board_2026-10-10.json
- pred/claude-code-guide.md
- pred/claudedesignprompt.md
- pred/cockpit-history-2026-08-06.csv
- pred/coding-agent-weather-and-skill-prompt.md
- pred/coding-agent-wire-package-2026-10-02.md
- pred/coding-agent-wire-prompt.md
- pred/css2_raw.json
- pred/curried-moseying-sifakis.md
- pred/customer_agreement.pdf
- pred/deepseek_json_20261004_7cdf92.json
- pred/deepseek_markdown_20260911_667ac8.md
- pred/deepseek_text_20260819_189953.txt
- pred/deepseek_text_20260819_92a7e7.txt
- pred/deepseek_text_20260819_9b2f36.txt
- pred/deepseek_text_20260819_c20e52.txt
- pred/deepseek_text_20260820_7bd021.txt
- pred/deepseek_text_20260820_7ea2b2.txt
- pred/deepseek_text_20260820_a0b267.txt
- pred/deepseek_text_20260823_8f81d6.txt
- pred/deepseek_text_20260911_bc86c6.txt
- pred/deepseek_text_20261002_0df8ba (1).txt
- pred/deepseek_text_20261002_0df8ba.txt
- pred/deepseek_text_20261002_667d41.txt
- pred/deepseek_text_20261006_2fb90f.txt
- pred/deepseek_text_20261006_3dd477.txt
- pred/deepseek_text_20261006_9fedb5.txt
- pred/design-experience-system.md
- pred/edge5_board_2026-10-11.json
- pred/evidence_reconstruction_stage1_report.docx
- pred/expanded_evidence_reconstruction_connector_review (1).docx
- pred/expanded_evidence_reconstruction_connector_review (2).docx
- pred/expanded_evidence_reconstruction_connector_review (3).docx
- pred/expanded_evidence_reconstruction_connector_review.docx
- pred/extract-data-2026-08-27 (3).json
- pred/extract-data-2026-08-30 (2).json
- pred/extract-data-2026-09-04.json
- pred/extract-data-2026-09-08 (1).json
- pred/extract-data-2026-09-08 (2).json
- pred/extract-data-2026-09-11 (1).json
- pred/extract-data-2026-09-11 (6).json
- pred/extract-data-2026-09-11 (7).json
- pred/extract-data-2026-09-11 (8).json
- pred/extract-data-2026-09-11.json
- pred/extract-data-2026-09-12.json
- pred/extract-data-2026-09-15.json
- pred/extract-data-2026-09-17.json
- pred/extract-data-2026-09-20 (1).json
- pred/extract-data-2026-09-20 (2).json
- pred/extract-data-2026-09-20.json
- pred/financial-deep-dive-2026-09-19.md
- pred/gemini-gse-build-prompt-2026-10-06.md
- pred/generate.pdf
- pred/grok-bot-galaxy-review (2).md
- pred/grok-bot-galaxy-review.md
- pred/grok-heavy-prompts-2026-10-02.md
- pred/grok-run1-ingestion-2026-10-02.md
- pred/grok-run2-promote-or-kill-2026-10-02.md
- pred/grok-run3-abyssal-2026-10-02.md
- pred/gse-1344-disposition-ledger.csv
- pred/gse-deep-nfl-metrics-catalog-2026.md
- pred/gse-social-media-playbook.pdf
- pred/gse-v5.3.0-build-spec.md
- pred/gse_brain_ingestion_v1 (1).md
- pred/gse_brain_ingestion_v1.md
- pred/gse_brain_ingestion_v1_1.md
- pred/gse_transfer_operators_v1.md
- pred/heb_pharmacy_2026-08-21_56.78.pdf
- pred/hsa-reimbursement-candidates.md
- pred/https___github.docx
- pred/kambi_props_bills_rams_2026-10-12.json
- pred/may_4_memorandum_full_text.txt
- pred/media-generation-cover-hero-1791497705.json
- pred/nfl-master-brief-2026-10-08.md
- pred/overnight-agent-prompt-2026-09-26.md
- pred/overnight-builder-prompt.md
- pred/payday-loan-borrower-protections-texas-2026-09-19.md
- pred/paystub2.pdf
- pred/paystub3.pdf
- pred/paystubd.pdf
- pred/paystubs.pdf
- pred/peri-peri-night-recipe.md
- pred/pinnacle_mkt_1637432181.json
- pred/pinnacle_mkt_1637432182.json
- pred/pinnacle_mkt_1637432183.json
- pred/pinnacle_mkt_1637432184.json
- pred/pinnacle_mkt_1637432185.json
- pred/pinnacle_mkt_1637432961.json
- pred/pinnacle_mkt_1637432962.json
- pred/pinnacle_mkt_1637432963.json
- pred/pinnacle_mkt_1637432964.json
- pred/pinnacle_mkt_1637435171.json
- pred/pinnacle_mkt_1637435172.json
- pred/pinnacle_mkt_1637435173.json
- pred/pinnacle_mkt_1637435174.json
- pred/pinnacle_mkt_1637435180.json
- pred/predictions.draftkings.com_en_.2026-08-26T17_43_20.713Z (1).json
- pred/predictions.draftkings.com_en_.2026-08-26T17_43_20.713Z.json
- pred/shadow-arch-engine-mapping.md
- pred/snap-reapply-worksheet-2026-09-19.md
- pred/source-hierarchy.md
- pred/stocks-trading-bots-handoff-grok.md
- pred/the-odds-api.com_.json
- pred/the-odds-api.com_features_spreadsheets.html.json
- pred/the-odds-api.com_sports-odds-data_betting-markets.html.json
- pred/theoddsapi.csv
- pred/turner8.4 (1).docx
- pred/turner8.4 - Copy (1).docx
- pred/turner8.4 - Copy (2).docx
- pred/turner8.4 - Copy (3).docx
- pred/turner8.4 - Copy (4).docx
- pred/turner8.4 - Copy (5).docx
- pred/turner8.4 - Copy.docx
- pred/turner8.4.docx
- pred/vrsm-c-800-100121-twc (1).docx
- pred/vrsm-c-800-100121-twc.docx
- pred/vytalus_receipt.pdf
- pred/vytalus_receipt_2025-09-22_75.pdf
- pred/week-5-research-packet-2026.md
- pred/window_audit_report.md
- pred/worker.md
- pred/www.pro-football-reference.com_years_2025_.2026-07-03T13_42_45.575Z.json
- props/deep-dive-props.md
- props/dk_submap.json
- props/espn_prop_bets_bills_rams_2026-10-12.json
- props/https___nextgenstats.nfl.com_ .2026-07-03T13_33_45.056Z.json
- props/jensen-shannon.pdf
- props/sgp_correlations.json

### Contradiction candidates (same landing area claimed both implemented and unimplemented): 9
- calibration module; eval suite (implemented claims=1, unimplemented claims=1)
- calibration2.py (implemented claims=2, unimplemented claims=1)
- divergence.py (implemented claims=3, unimplemented claims=1)
- engine_math.py (implemented claims=6, unimplemented claims=1)
- engine_math.py / ratings2.py (implemented claims=1, unimplemented claims=1)
- props_deep.py (implemented claims=4, unimplemented claims=2)
- props_deep.py / engine_math.py (implemented claims=1, unimplemented claims=1)
- pull_entries.py (implemented claims=1, unimplemented claims=1)
- ratings2.py (implemented claims=5, unimplemented claims=6)

### Duplicate-file handling
Downloads doctrine set is present in several copies: PREDICTION_ENGINE_MASTER.md/(1)/(2)/(3), RATING_ATLAS.md/(1), SKILLS_COMPENDIUM.md/(1), REASONING_DOCTRINE_2026-10-05.md/(1), GSE_MASTER_PACK_2026-10-10.md/(1)/(2), GSE_HANDOFF_PACK_2026-10-10.md/(1). Byte sizes are identical within each group except PREDICTION_ENGINE_MASTER (37736 for .md and (2), 25763 for (1) and (3) - the smaller pair is an older revision, not a byte copy). Identical copies were read once; the older revision of PREDICTION_ENGINE_MASTER was NOT read and is listed as unread.

## SECOND-PASS ADDENDUM: residual GSE-keyword files not referenced by any first-pass row
Method: every doc/text-kind file in the three research dirs was checked for a matching source_file label in the first-pass JSONL. 68 GSE-keyword files had no matching label (engine 20, pred 46, props 2); 8 of them were read in this pass and produced the items below. The rest are listed in COVERAGE ACCOUNTING as third-pass candidates with the truncation caveat.
- [equation/high] RL verifiable-reward function: Brier skill score 1 - brier/BRIER_BASELINE with BRIER_BASELINE = P0(1-P0), P0=0.5485 frozen 2022-2024 home win rate -- GSE-RL-mission-2026-10-02.md Reward function (the moat) - v2 (packages/prediction-engine/src/rl/reward.ts (new) + tests)
- [calibration/medium] RL v1 reward failed its sanity gate: honest base-rate picking scored -0.87 while abstaining scored 0.0, so RL would learn never to pick -- GSE-RL-mission-2026-10-02.md Phase 2 sanity gate (document in docs/engine/decision-ledger or RL README so the gate is not re-run)
- [ops/low] RL base model choice: MiMo-V2.6-Distill-Qwen-9B (9B, MIT) as recommended start; Flash 309B/15B active via API at $0.14/$0.28 per M tokens; Pro 1.02T not trainable -- GSE-RL-mission-2026-10-02.md Base model options (docs/engine/ research note; no code landing)
- [wiring/high] Do not train RL on schedule-only episodes: current episodes (form/rest/spread/weather) are a toy state; wired QB/OL/injury/coaching signals must exist first -- GSE-RL-mission-2026-10-02.md What this is NOT (episode builder gate in packages/prediction-engine (RL lane))
- [data-source/high] GSE RL environment = 1,139 held-out NFL games 2022-2025 as labeled episodes: state pre-game context, action reasoning trace + pick + probability, reward from actual outcome -- GSE-RL-mission-2026-10-02.md Architecture (episode builder module in the RL lane)
- [signal/medium] Weak Signal Engine Tier-5 thresholds: mention spike, sentiment shift, rumor cluster, market correlation, verification gap after 2+ hours with no Tier 1-3 confirmation -- weak-signal-engine.md What Qualifies as a Weak Signal (docs/intelligence/ weak-signal engine module; no repo code found)
- [wiring/medium] Weak Signal Engine output contract: only a watchlist flag or verification task may be emitted, each labeled with source tier and verification status; five permitted output shapes given -- weak-signal-engine.md Permitted Engine Outputs (docs/intelligence/ engine contract; enforcement point in signal pipeline)
- [ops/medium] Weak Signal Engine forbidden outputs: no verified injury status, no inside-information claims, no public accusations, no picks, no certainty language from Tier 5; required language patterns listed -- weak-signal-engine.md Forbidden Engine Outputs / Required Language (docs/intelligence/ + guard tests beside the signal layer)
- [wiring/high] Situational note table with 17-field schema (note_id, retrieved_at_utc, event_valid_start/end, game_id, player_id, entity_confidence, source_tier, speaker_identity, corroboration_id, proposed_delta_spread, proposed_delta_total, processing_status) is MISSING and called the single most important build-first item -- shadow-arch-engine-mapping.md 1a Situational note table (packages/db/prisma/schema.prisma new model + migration)
- [wiring/high] Bitemporal as-of join for situational data: T_assert <= T_lock with a per-game lock boundary and a post-lock quarantine partition; repo has timeHoldoutSplit for backtests but nothing on the ingestion side -- shadow-arch-engine-mapping.md 1c Bitemporal as-of join (ingestion pipeline table + lock service)
- [wiring/high] Game-level shadow consumer y_shadow = y_pub + delta-y with shadow footnote emission and an independent scoring harness; only props shadow and fantasy adjustment guard exist today -- shadow-arch-engine-mapping.md 1d Shadow consumer (packages/prediction-engine shadow consumer; apps/web/lib/signals)
- [calibration/high] Calibration gates N>=100 settled, Brier<=0.22, ECE<=0.05, Reliability<=0.05 over 3 consecutive runs exist as measurements only and are wired to no deployment decision -- shadow-arch-engine-mapping.md 1e Calibration gates (apps/web/lib/calibration/ publication gate)
- [ops/medium] Ten stop conditions STOP-01..STOP-10 unimplemented as a unified list; split into enforceable-today (STOP-01 NOT NULL retrieved_at_utc, STOP-04 tier enum check, STOP-06 type-level ban on raw prose) vs aspirational (STOP-02/03/05/07/08/09/10) -- shadow-arch-engine-mapping.md 1f Ten stop conditions (docs/engine stop-condition register + schema/type changes)
- [wiring/high] Transcript/claim extraction pipeline: syntactic fact extraction, deterministic entity linking with posterior margin P(e1)-P(e2) >= 0.35 and abstention on ambiguity, plus mapping extracted claims to note rows - all missing -- shadow-arch-engine-mapping.md 1g Transcript extraction pipeline (workers/airwave-listener + apps/web/lib/airwave)
- [ops/medium] Engine-wire walk-forward bar: n=1914, stress+INT+air log loss 0.610490, with one walk-forward per wire landing reporting n, log loss, Brier and the paired interval, and a 0.0001 move kept only toward 0 -- MISSION-ENGINE-WIRE-2026-10-03.md The bar / Order step 3 (walk-forward harness in packages/prediction-engine (metrics report))
- [wiring/high] Point-in-time feature construction rules: latest row with season*100+week strictly before the game, lag at most 2 seasons, home minus away, null if either side misses the floor, ratios and shrinkage applied BEFORE the diff, league constant is not a feature -- MISSION-ENGINE-WIRE-2026-10-03.md Point-in-time - every new column (packages/prediction-engine feature builders)
- [wiring/medium] Column-name matcher must be discarded as a feature detector: '=' with an empty column list is not a hit, and home/away/team/total/season are not formulas -- MISSION-ENGINE-WIRE-2026-10-03.md Column matching (eng/wire_k.py and join_rest.py generation path)
- [ops/low] Wire lanes discipline: split equations_stated.jsonl by line range, worker k writes only eng/wire_k.py and wire_k_missing.json, one integrator lands functions last, no shared module edits -- MISSION-ENGINE-WIRE-2026-10-03.md Lanes (eng/ wire lane files in the engine-plan worktree)
- [wiring/medium] Already-on-origin wire work that must NOT be redone: 3e20c44aa air-yard completion residual (c02/a04 walk-forward), d74e2eeae chart air-yard residual row + W4 mint 20261003T0857Z v1a, 6a73a3ebe parent interception rate from cell counts, ef9224fc6 coaching and QB-behavior tables four-week target share -- MISSION-ENGINE-WIRE-2026-10-03.md Already on origin - DO NOT REDO (n/a - reference for de-duplicating future wire work)
- [calibration/high] Calibration reality on 2026-10-08: no calibrated output exists; only measured Brier scores are adverse, 0.2551 vs 0.2500 constant-0.5 on 1,944 settled rows and 0.2790 vs 0.2491 climatology on first 100 settled, both on UNMERGED branches -- engine-tonight-verdict-2026-10-08.md What was checked item 3 (merge both branches to mainline then run the calibration ladder)
- [calibration/high] Adjustment layer magnitudes are structured defaults only: apps/web/lib/signals/adjustment-layer.ts declares every magnitude calibrated:false and CALIBRATION_ADJUSTMENTS_ENABLED is off everywhere; the header says backtest owed -- engine-tonight-verdict-2026-10-08.md What was checked item 3 (apps/web/lib/signals/adjustment-layer.ts + backtest harness)
- [wiring/high] Production-path gaps named as blockers: workers/pick-generation/src/index.ts is a stub that logs and exits 0; gse-ml-service POST /predict/etkf is stateless, uncalibrated and undeployed; entropy-dfs-portfolios.ts has zero production callers; signal-weight tuner outputs never persist into predictions -- engine-tonight-verdict-2026-10-08.md What was checked item 2 (workers/pick-generation, packages/prediction-engine, apps/web/lib/fantasy)
- [calibration/medium] Hold-out map harness on main (commit e0ad7bafa) measures deployed v5.2.7 as gate-RED with Murphy 0.0189 vs a 0.004-0.008 null range and no map applied -- engine-tonight-verdict-2026-10-08.md What was checked item 3 (apps/web/lib/calibration/deployed-map-holdout.ts lineage)
- [ops/high] Six-step fastest wire path to honest plays: rotate Neon credential, merge the two Brier evidence branches through the merge gate, backtest adjustment-layer magnitudes, flip CALIBRATION_ADJUSTMENTS_ENABLED on a throwaway branch and re-run the hold-out harness, wire pick generation and persist tuner outputs, scrub the 'calibrated betting confidence' overclaim -- engine-tonight-verdict-2026-10-08.md Fastest wire path to real aligned plays (docs/ops runbook + the named files)
- [data-source/medium] 6-hour mind ingest clock: seed from ctx-2026-10-03/corpus_extract/extract.jsonl (5,103 records) into mind.jsonl (baseline 1,471 lines) and extend, never truncate; cursor brain/ingest_cursor.json for automatic resume -- GSE_MIND_INGEST_6H_2026-10-03.md Clock 08:16-09:15 (brain/ingest_corpus_to_mind.py and mind.jsonl registry)
- [ops/medium] Corpus ingest proof conditions: unique paths in mind.jsonl must cover the fulltext count or each missing path must be a READER_FAIL with bytes; extract records seeded and deduped by path; intelligence_index.json extended not rebuilt with source_path on every row -- GSE_MIND_INGEST_6H_2026-10-03.md Proof at 14:16 (docs/engine ingest verification script)
- [data-source/low] Known reader failure to retry and not delete: arXiv 0707.1051, 55,022 bytes, produced a 0-character read in the canonical reader -- GSE_MIND_INGEST_6H_2026-10-03.md Scope line on canonical reader failure (corpus_read.py reader path)
- [ops/medium] Held-out discipline for corpus-derived equations: arXiv id integer mod 10 == 0 is scored, never used to propose a signal; mismatches between two readers stay in the mind as UNVERIFIED -- GSE_MIND_INGEST_6H_2026-10-03.md Clock 12:00-13:15 (corpus ingest + equation index builder)
- [calibration/medium] kills.jsonl ledger for features that move log loss only in the thousandths, and an explicit ban on citing 0.6072 as a headline number -- GSE_MIND_INGEST_6H_2026-10-03.md Clock 14:00-14:16 (docs/engine/metrics or the walk-forward report directory)
- [ops/low] 403 app-only models must not be called on the API during corpus extraction; flat 10-minute per-provider switch and stop a provider at $8 if responses go empty -- GSE_MIND_INGEST_6H_2026-10-03.md Clock 09:15-12:00 (corpus_read.py provider config)
- [dfs/medium] DFS game-stack selection rule: stack games with a high total AND a close spread (54.5 total with a 3.5-point spread) because nobody stops throwing and there is no blowout script or clock killing -- DFS_Customer_Report_2026-10-11.md Stack 1: Rams and Bills (DFS optimizer stack rules / docs/props research)
- [dfs/medium] DFS leverage as ownership arbitrage: prefer the game with nearly as much scoring at a fraction of the ownership, and treat leverage as a number not a vibe -- DFS_Customer_Report_2026-10-11.md Contrarian angles (DFS optimizer leverage term)
- [dfs/medium] DFS salary-shape construction: cheapest usable defense to free salary for skill positions, minimum-salary punt tight end in a dome game, and verify the name is on a current roster before lock -- DFS_Customer_Report_2026-10-11.md Value plays / Builder's notes (DFS optimizer constraints + roster validation step)
- [signal/medium] Weather as a passing-game tax applied per game (rain in Washington and Pittsburgh on the 2026-10-11 slate) rather than as a global adjustment -- DFS_Customer_Report_2026-10-11.md Weather and injuries (weather feature builder feeding the slate model)
- [ops/medium] Builder-notes correction discipline: four source-file errors caught and fixed against verified Sunday-morning reporting (MHJ inactive/traded, Diggs team and status, Lock/Fant not on roster, Mason out) before publication -- DFS_Customer_Report_2026-10-11.md Builder's notes (docs/props/ review checklist; candidate for a validation gate)
- [data-source/medium] RelateAnything flagged as the highest-GSE-value tool find of 2026-09-30: film-pipeline component for play segmentation and semantic moment search, gated on legitimate footage sourcing -- EXAM-2026-09-30-ig-finds-gse-revenue.md The scorecard row 13 / Sequence 2 (film/play-segmentation pipeline in the engine research tree)
- [ops/low] Zero-dollar autonomous stack as a compound: free coding agent + decision model + typed output layer + persistent agent, plus the Scenario rule that no agent spends anything without stating the price first -- EXAM-2026-09-30-ig-finds-gse-revenue.md Compound A / Scenario's price-before-spend (docs/ops agent fleet policy)
- [data-source/medium] Fulltext corpus accounting discrepancy left unresolved: claimed sweep of 865 files does not match 1,115 files on disk, and the instruction is explicitly do not subtract the gap -- GSE_MIND_INGEST_6H_2026-10-03.md Scope line on fulltext (corpus registry / ingest receipt)

Landing areas touched by this addendum: DFS optimizer constraints + roster validation step, DFS optimizer leverage term, DFS optimizer stack rules / docs/props research, apps/web/lib/calibration/ publication gate, apps/web/lib/calibration/deployed-map-holdout.ts lineage, apps/web/lib/signals/adjustment-layer.ts + backtest harness, brain/ingest_corpus_to_mind.py and mind.jsonl registry, corpus ingest + equation index builder, corpus registry / ingest receipt, corpus_read.py provider config, corpus_read.py reader path, docs/engine ingest verification script, docs/engine stop-condition register + schema/type changes, docs/engine/ research note; no code landing, docs/engine/metrics or the walk-forward report directory, docs/intelligence/ + guard tests beside the signal layer, docs/intelligence/ engine contract; enforcement point in signal pipeline, docs/intelligence/ weak-signal engine module; no repo code found, docs/ops agent fleet policy, docs/ops runbook + the named files, docs/props/ review checklist; candidate for a validation gate, document in docs/engine/decision-ledger or RL README so the gate is not re-run, eng/ wire lane files in the engine-plan worktree, eng/wire_k.py and join_rest.py generation path, episode builder gate in packages/prediction-engine (RL lane), episode builder module in the RL lane, film/play-segmentation pipeline in the engine research tree, ingestion pipeline table + lock service, merge both branches to mainline then run the calibration ladder, n/a - reference for de-duplicating future wire work, packages/db/prisma/schema.prisma new model + migration, packages/prediction-engine feature builders, packages/prediction-engine shadow consumer; apps/web/lib/signals, packages/prediction-engine/src/rl/reward.ts (new) + tests, walk-forward harness in packages/prediction-engine (metrics report), weather feature builder feeding the slate model, workers/airwave-listener + apps/web/lib/airwave, workers/pick-generation, packages/prediction-engine, apps/web/lib/fantasy

## CORRECTION: accurate coverage accounting (second pass, deadline landing)

The earlier addendum block in this file carried approximate figures. Exact counts, computed by script over the corpus:

- docs/engine/research/2026-10-13: 274 files on disk; 14 are text-kind with GSE/engine keywords.
- docs/predictions/research/2026-10-13: 349 files on disk; 51 are text-kind with GSE/engine keywords.
- docs/props/research/2026-10-13: 6 files on disk; 2 are text-kind with GSE/engine keywords.
- Total text-kind keyword-matched files: 67. Distinct source_file values referenced by this JSONL: 768.
- Second-pass rows appended in this sweep: 38 (all carry prior_pass_note tagging them as second-pass additions).

### Explicit UNREAD list at landing time (third-pass candidates, highest value first)

Priority order for a third pass; each is a text-kind file matching GSE keywords that was NOT read in this pass:

1. docs/engine/research/2026-10-13/GSE_MIND_LEAP_2026-10-03.md (+ duplicate " (1).md" copy) - mind-loop doctrine, likely equations.
2. docs/engine/research/2026-10-13/GSE_K11_Phase0_Full_Package.md - full K11 phase 0 package, likely wiring spec.
3. docs/engine/research/2026-10-13/gse-reasoning-engine-brief-2026-10-02.md - engine brief.
4. docs/predictions/research/2026-10-13/gse-v5.3.0-build-spec.md - versioned build spec, likely canonical engine surface.
5. docs/predictions/research/2026-10-13/gse-deep-nfl-metrics-catalog-2026.md - metric catalog, likely named signals.
6. docs/predictions/research/2026-10-13/GSE_SUPER_GROK_HEAVY_FINDINGS_2026-10-03.md and GSE_SUPER_GROK_HEAVY_ROUND2_2026-10-03.md - external model findings rounds.
7. docs/predictions/research/2026-10-13/GSE_58_independent_research.md and GSE_58_paper_dossiers.md - 58-paper dossiers, likely transfer operators and calibration priors.
8. docs/predictions/research/2026-10-13/gse_transfer_operators_v1.md - transfer operator definitions.
9. docs/predictions/research/2026-10-13/GSE_PostGauntlet_Build_Plan_Execution.md - build plan execution, likely wiring gaps.
10. docs/predictions/research/2026-10-13/GSE-MASTER-INVENTORY-2026-10-02.md and ATLAS_STATUS.md - inventory and status, cross-check for implemented/unimplemented basis.
11. docs/engine/research/2026-10-13/GSE_HF_Crawl_Plan_v4.docx, GEMINI-REVENUE-ENGINE-PATHS-2026-09-25.md, signal-ledger.md, woodway-collection-proposal-clean-2026-10-06.docx.
12. docs/predictions/research/2026-10-13/CFB_MODEL_DECISION.md, GSE_Session_Handoff_2026-10-09.md, coding-agent-wire-package-2026-10-02.md, coding-agent-wire-prompt.md, gemini-gse-build-prompt-2026-10-06.md, GSE FINAL LAUNCH 9.20.docx, GSE_Master_Operating_System_Blueprint_v2.docx, Week-2-DFS-Complete-Dossier.md, X_DFS_DRAFTS_2026-10-11.md, gse_brain_ingestion_v1.md (+ _1 and " (1)" copies).
13. Non-doc data artifacts (JSON): edge5_board_2026-10-11.json, kill_ledger_demo.json, KILL_LEDGER.md, kambi_props_bills_rams_2026-10-12.json, espn_prop_bets_bills_rams_2026-10-12.json, predictions.draftkings.com_en_.2026-08-26T17_43_20.713Z.json (+ " (1)" copy). These are evidence artifacts; use them to mark implemented/unimplemented, not as leverage text.
14. docs/props/research/2026-10-13/deep-dive-props.md - props research, likely prop-signal leverage.

Note: files whose names carry no GSE/engine keyword and that are not text-kind (images, binaries) were skipped by design and are not leverage candidates.
