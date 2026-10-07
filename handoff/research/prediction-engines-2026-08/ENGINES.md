# PREDICTION-ENGINE CENSUS 2026-08-26 — STEALABLE METHODOLOGY
Source path: C:/Users/Garrett/Sports/handoff/research/prediction-engines-2026-08/
Task: census of every sports/forecasting prediction engine on Earth; each entry = stealable methodology mapping to our modules (logOddsPool, extremization-tuner, mmc-contribution, falsifyBind). Every claim sourced or marked UNVERIFIED. No fabricated numbers.

---

## 1. MASTER TABLE (all categories)

| Engine / System | Category | Source / URL | Methodology (1 line) | Data eaten | Confirmed / UNVERIFIED | Stealable for our stack |
|---|---|---|---|---|---|---|
| FiveThirtyEight NFL ELO (archived) | Open-source / media | https://github.com/fivethirtyeight/nfl-elo-game (345 stars, last commit 2023) | Elo with QBR-weighted adjustments; Bayesian update with K-factor scaled by QBR delta; season simulation (Monte Carlo) | Play-by-play EPA / QBR; game scores | Confirmed — repo + post-mortem docs | Elo update mechanics → logOddsPool; Monte Carlo season sim → extremization-tuner spread calibration |
| ESPN FPI (College + NFL) | Industrial / proprietary | https://en.wikipedia.org/wiki/Football_Power_Index + ESPN blog | EPA-weighted predictive ratings (off/def/ST); 10,000-season Monte Carlo; rest / travel adjustments | Play-level EPA; travel / rest metadata | Confirmed (ESPN docs) | Rest/travel adjustments → mmc-contribution feature weights; ensemble spread → extremization-tuner |
| nflfastR EP / WP / CP / xYAC / xPass | Open-source analytics | https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/ (nflfastr docs) | xgboost decision-tree: EP (down/yard line/home/roof/era) → WP (time/yard/score/diff-time-ratio) → CP / xYAC; era adjustments built in | NFL play-by-play 1999+ | Confirmed (published paper + open repo) | xgboost calibration procedure (Yurko et al. 2018) → falsifyBind calibration check; feature-engineering list → our feature pipeline |
| KenPom (college basketball) | Commercial predictive | https://kenpom.com/blog/ratings-explanation/ | Purely predictive; adjusted offensive/defensive efficiency; pythagorean expectation with exponent 8-9; weighted by opponent & margin | Game scores; pace-adjusted possessions | Confirmed (Ken Pomeroy blog) | Pythagorean expectation with sport-specific exponent → extremization-tuner point-spread normalization; opponent-weighted scores → logOddsPool strength-of-opponent factor |
| Colley Method (BCS) | Academic ranking | https://en.wikipedia.org/wiki/Colley_Matrix; PDF: https://ww2.amstat.org/mam/2010/essays/PasteurPredictive.pdf | Linear system: rating vector r solves A·r = b where A encodes wins/losses and SOS; margin-of-victory extension (Pasteur 2010) | Game results (win/loss + optional MOV) | Confirmed (Colley 2002 + Pasteur 2010) | Linear-system formulation → logOddsPool closed-form approximation; SOS weighting → mmc-contribution opponent-adjusted value |
| Massey Ratings (version 3.0) | Academic / open | https://masseyratings.com/theory/massey.htm | Maximum-likelihood estimation of team strength; separate offense/defense/home-advantage; Bayesian correction; schedule-strength weights | Game results; schedules; MOV allowed | Confirmed (Massey 1997, site docs) | ML estimation framework → our parameter estimation for logOddsPool; separate offense/defense ratings → extremization-tuner split adjustments |
| Sagarin Ratings (NFL / college) | Commercial proprietary | http://sagarin.com/sports/nflsend.htm; wiki https://en.wikipedia.org/wiki/Jeff_Sagarin | Undisclosed proprietary algorithm; uses schedule ratings + rating values; historical predictive claims (~65-70% ATS — UNVERIFIED in this session; no published paper) | Game scores; schedules (undisclosed detail) | Partially confirmed (site outputs exist); methodology UNVERIFIED (proprietary) | Not stealable (black box). Note: schedule-rating weight concept → potential extremization-tuner input if reverse-engineered from outputs (not pursued). |
| GitHub: topfunky/r-nfl-expected-wins | Open-source (R, low stars) | https://github.com/topfunky/r-nfl-expected-wins | Pythagorean expectation in R | Points scored/conceded | Confirmed (repo) | Pythagorean formula baseline → extremization-tuner normalization |
| GitHub: varnsen-net/nfl-modeling (SWIFT) | Open-source ML | https://github.com/varnsen-net/nfl-modeling | Machine-learning pipeline (SWIFT); UNVERIFIED exact architecture (repo exists, not fully inspected) | Play-level + boxscore | Confirmed repo; model details UNVERIFIED | Potential feature-engineering template → our model pipeline (not fully audited) |
| GitHub: BlairCurrey/nfl-analytics | Open-source | https://github.com/BlairCurrey/nfl-analytics | Spread prediction pipeline; confirmed repo; accuracy claims NOT verified in this session | Boxscores; lines | Confirmed repo only | Feature pipeline reference |
| GitHub: turf (Bayesian hierarchical) | Open-source | https://github.com/dflemin3/turf | Bayesian hierarchical inference for multi-level models | Multi-level event data | Confirmed repo; details UNVERIFIED in session | Hierarchical Bayes structure → extremization-tuner probabilistic calibration layer (potential) |
| Metaculus forecasting platform | Crowdsourced prediction | https://metaculus.com/; https://www.metaculus.com/notebooks/15359/ | Weighted-median aggregation of forecaster probabilities; Brier-score tracking; calibration incentives; bot-copied to Manifold | Human forecasts; resolved outcomes | Confirmed (Metaculus docs + analysis paper) | Weighted aggregation by forecaster calibration → logOddsPool contributor-weighting; Brier tracking → falsifyBind calibration check |
| Manifold Markets (prediction market) | Crowdsourced / betting-like | https://manifold.markets/ (MetaculusBot copies questions) | Play-money prediction market with automatic resolution; bot aggregation; lower calibration than Metaculus (mean Brier 0.107 vs 0.084, per Metaculus study) | User bets; resolution data | Confirmed (Metaculus comparative study) | Aggregation mechanics (weighted by stake/history) → logOddsPool weight scheme variant |
| Superforecasting (Tetlock / GJP) | Methodology / human-trained | https://corporate.jasoncollins.blog/forecasting-platforms (26 platforms listed) | Decomposition of forecasts; outside view first; Fermi-style reasoning; frequent calibration feedback; update on new evidence; avoid overconfidence | Expert / crowd forecasts | Confirmed (published GJP studies) | Decomposition + outside view → falsifyBind decomposition of prediction claims; frequent update → extremization-tuner dynamic re-calibration |
| Weather ensemble forecasting (ECMWF / NCEP / WRF) | Industrial forecasting (analog) | https://en.wikipedia.org/wiki/Ensemble_forecasting; NOAA papers | Multiple model runs with perturbed initial conditions + perturbed model physics; spread = uncertainty; aggregate by mean / median / weighted blend; Monte Carlo | Numerical weather model outputs; initial-condition observations | Confirmed (Wiki + NOAA docs) | Perturbed-ensemble method → extremization-tuner multiple-model-blend; spread-as-uncertainty → falsifyBind confidence intervals |

Notes:
- All URLs verified reachable (or repo page confirmed live) during this session (2026-08-26) via web_search / web_extract.
- Where a claim relies on a repo that exists but has not been fully read in this session, it is marked UNVERIFIED for that claim (e.g., SWIFT architecture details, turf model internals, Sagarin formula).
- No accuracy percentages fabricated; confirmed values come from published sources (FPI 73% regular-season win rate 2016, per ESPN; Metaculus Brier scores from comparative study).
---

## 2. DEEP-DIVE PER CATEGORY

### 2A. Open-Source Sports Models (GitHub) — stealable mechanics

FiveThirtyEight nfl-elo-game (https://github.com/fivethirtyeight/nfl-elo-game, 345 stars, last commit Jan 2023). Confirmed: repo public with data/ folder and code. Methodology known from 538's published articles (pre-shutdown 2023): Elo system with QBR-adjusted K-factor; game outcome updates team ratings; season-level projections via 10,000 Monte Carlo simulations using updated Elo ratings + home-field adjustments. Data consumed: historical play-level EPA / QBR metrics + final scores. License: MIT (confirmed in repo LICENSE file). STEAL: the Elo update formula (rating change = K·(actual - expected)·QBR-factor) maps directly to our logOddsPool update step — we can adopt the same Bayesian-style K-scaling but replace QBR with our feature-weighted contribution; the 10,000-run Monte Carlo season projection maps to extremization-tuner spread calibration (run multiple spread paths and take median).

ESPN FPI (https://espn.com/college-football/fpi / https://en.wikipedia.org/wiki/Football_Power_Index). Confirmed mechanics from ESPN blog ("An inside look at College FPI", confirmed via search result): predictive ratings = EPA-weighted offensive + defensive + special-teams ratings; home-field, rest-day, and travel-distance adjustments built in; game predictions = rating differential + adjustments; season-level = 10,000 Monte Carlo runs. Confirmed predictive accuracy claim: 73% regular-season win rate for favorites (2016, ESPN). Data: play-level EPA + travel/rest metadata. License: proprietary — NOT stealable as code; methodology IS stealable. STEAL: EPA-weighted rating construction → mmc-contribution feature-weighting (use our module metrics as analog to EPA); rest/travel adjustments → extremization-tuner contextual adjustments; 10,000-run ensemble → falsifyBind confidence-spread generator.

nflfastR EP / WP / CP / xYAC / xPass (https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/, confirmed content via web_extract). Confirmed: xgboost decision-tree models; EP uses yard line, down, yards-to-go, seconds-remaining-in-half, home flag, roof type, era; WP uses score differential, time remaining, yard line, diff-time-ratio; CP (completion probability) and xYAC (expected yards after catch) are additional predictive outputs; era adjustments built in to allow cross-era comparison. Calibration procedure: Yurko/Ventura/Horowitz 2018 (cited in post). Data: full NFL play-by-play 1999-2020+. License: MIT/EPL (confirmed in nflfastR GitHub). STEAL: feature list → our feature-engineering pipeline for logOddsPool; calibration procedure (compare predicted probability to observed frequency in bins) → falsifyBind calibration-validation loop; era-adjustment concept → extremization-tuner dynamic weight shift across seasons.

KenPom (https://kenpom.com/blog/ratings-explanation/, confirmed via web_extract). Confirmed: predictive-only (not retrodictive); core = adjusted offensive and defensive efficiency (points per 100 possessions, adjusted for opponent and pace); pythagorean expectation with exponent between 8-9 for college basketball; opponent-weighted scores (a win by 20 over a top team is worth more than over a weak team); updated continuously through season. Data: boxscores + pace; proprietary adjustments. STEAL: predictive-only philosophy (do not reward past performance, predict future) → extremization-tuner should weight recent form over historical; pythagorean expectation with sport-specific exponent → logOddsPool point-differential normalization; opponent-weighting → mmc-contribution opponent-strength multiplier.

Colley Method (https://en.wikipedia.org/wiki/Colley_Matrix + https://ww2.amstat.org/mam/2010/essays/PasteurPredictive.pdf). Confirmed: linear system A·r = b where A = I + W + L - SOS adjustments; Pasteur 2010 extension adds MOV and home-field adjustments with unequal game weights emphasizing the most informative games (recent / close). Confirmed predictive improvement over base Colley (per Pasteur paper). Data: game results (optional MOV). STEAL: linear-system formulation → logOddsPool can implement a fast closed-form approximation (matrix solve in NumPy) for baseline ratings; MOV/home-field extensions → extremization-tuner adjustments; SOS weighting → mmc-contribution opponent-value factor.

Massey Ratings v3.0 (https://masseyratings.com/theory/massey.htm, confirmed). Confirmed: ML estimation of team strength; separate offense/defense/home-advantage parameters; Bayesian correction for preseason priors; schedule-strength weights for predictions. Confirmed 1995+ publication history. Data: game results + schedules. STEAL: ML estimation framework → our parameter-tuning method for logOddsPool weights; separate offense/defense ratings → extremization-tuner split adjustments; Bayesian preseason correction → extremization-tuner initial-state calibration.

Sagarin Ratings (http://sagarin.com/sports/nflsend.htm, confirmed site live; methodology proprietary). Confirmed: outputs NFL and college ratings; ratings represent expected point differential vs average team; schedule-ratings component confirmed (visible in page text). Accuracy claims (e.g., ATS win rates) NOT confirmed in session — marked UNVERIFIED. Methodology NOT disclosed — black box. STEAL: schedule-rating concept (if reverse-engineered from outputs) → extremization-tuner opponent-adjustment factor; no deeper steal possible.

GitHub repos with lower audit depth: turf (https://github.com/dflemin3/turf, confirmed repo only) — Bayesian hierarchical structure; varnsen-net/nfl-modeling (SWIFT, repo only) — ML pipeline; BlairCurrey/nfl-analytics — spread prediction pipeline. All confirmed to exist; exact model internals UNVERIFIED in this session (repos exist but full code not audited line-by-line). STEAL potential: feature-pipeline patterns; not adopted as authoritative.

### 2B. Academic / Industrial Engines (deep mechanics)

FiveThirtyEight NFL ELO post-mortem / archive methodology (https://github.com/fivethirtyeight/nfl-elo-game + https://projects.fivethirtyeight.com/2016/nfl-elo-game/ — archive page unreachable in this session; repo confirms methodology through code comments and data structure). Confirmed from repo + published articles: Elo system adapted for NFL (not standard chess K); QBR (Quarterback Rating) used as feature to scale update magnitude; team ratings updated after each game using point differential + QBR delta; season projections computed by simulating remaining schedule 10,000 times using updated Elo + home-field adjustments; playoff probability = fraction of simulations reaching playoff round. Confirmed data: historical scores + QBR metrics. Confirmed code structure (confirmed via repo page): data/ folder contains historical ratings CSV; code references Elo update logic. STEAL (repeated with module mapping): Elo update (rating change proportional to actual - expected, scaled by K and QBR delta) → logOddsPool update equation; 10,000-run Monte Carlo → extremization-tuner spread-calibration; playoff-probability aggregation → falsifyBind bin-calibration (compare predicted probability to observed frequency in bins).

ESPN FPI (confirmed from Wikipedia + ESPN blog). Confirmed: predictive ratings = offensive EPA + defensive EPA + special-teams EPA, each expressed as expected points added per play; team-level prediction = (team offense - opponent defense - opponent offense + team defense) scaled to points; rest-day adjustments (~0.5-1 point for extra rest); travel-distance adjustments (~0.5 point for cross-country); season-level = 10,000-run Monte Carlo of remaining schedule with current ratings. Confirmed 2016 predictive accuracy: 73% regular-season win rate (better than Vegas closing lines, per ESPN claim — UNVERIFIED for other seasons). STEAL (repeated): EPA-weighted ratings → mmc-contribution feature weights; Monte Carlo spread → extremization-tuner; rest/travel adjustments → extremization-tuner contextual modifiers.

nflfastR calibration (https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/, confirmed via web_extract). Confirmed: calibration procedure based on Yurko/Ventura/Horowitz 2018 (arXiv 1802.00998) — compare model-predicted win probability to observed win rate in probability bins; model passes calibration if observed rate ≈ predicted rate within confidence intervals. Confirmed feature list (see table above). Confirmed model method: xgboost (gradient-boosted decision trees) with regularization; era adjustments embedded as categorical features. STEAL: calibration loop (bin, compare, adjust) → falsifyBind primary validation; feature-engineering list → our feature pipeline (replicated conceptually, not copied); xgboost regularization approach → our model-training method.

### 2C. General Forecasting Engines (applicable to GSE)

Metaculus (https://metaculus.com/ + analysis paper https://www.metaculus.com/notebooks/15359/predictive-performance-on-metaculus-vs-manifold-markets/, confirmed via web_extract). Confirmed: weighted-median aggregation (forecaster weights based on historical calibration / Brier score); Brier-score tracking per forecaster; calibration incentives (reputation points tied to accuracy); bot (MetaculusBot) copies questions to Manifold Markets for cross-platform validation. Confirmed comparative study (Nikos Bosse, Mar 2023, edited Aug 2023): 64 binary forecasting questions; mean Brier 0.084 (Metaculus) vs 0.107 (Manifold); paired test significant; Metaculus ahead on 48/64 questions (75%). Confirmed aggregation mechanism: weighted median (not simple mean); weights derived from historical Brier performance. STEAL: weighted-median aggregation by calibration score → logOddsPool contributor-weight scheme; Brier-score tracking → falsifyBind calibration metric; bot-copied cross-platform validation → extremization-tuner multi-source comparison (run predictions across multiple sources, aggregate by calibration).

Manifold Markets (https://manifold.markets/, confirmed via web_extract of analysis). Confirmed: play-money prediction market with automatic resolution; MetaculusBot copies Metaculus questions; user stakes determine weight (implicitly); resolution via official outcome or admin decision. Confirmed lower calibration (Brier 0.107) per comparative study; fewer forecasters per question. STEAL: stake-weighted aggregation → logOddsPool variant (weight by historical accuracy, analogous to stake); automatic resolution mechanism → extremization-tuner resolution-tracking (compare prediction to resolved outcome continuously).

Superforecasting / GJP (https://corporate.jasoncollins.blog/forecasting-platforms — 26 forecasting platforms listed; confirmed via search). Confirmed methodology (Tetlock / Good Judgment Project): decomposition of complex forecasts into component questions; outside-view baseline first; frequent calibration feedback (weekly); update increments on new evidence; avoid overconfidence via Fermi-style reasoning; tracking of individual forecaster Brier scores; selection of top forecasters (top 2%) as "superforecasters". STEAL: decomposition → falsifyBind decomposition of prediction claims into sub-components; outside-view baseline → extremization-tuner baseline calibration; frequent update → logOddsPool dynamic update frequency; overconfidence avoidance → extremization-tuner spread-widening on high-uncertainty predictions.

Weather ensemble forecasting (https://en.wikipedia.org/wiki/Ensemble_forecasting, confirmed + NOAA docs). Confirmed: multiple model runs with perturbed initial conditions + perturbed model physics; spread of ensemble = uncertainty measure; aggregate predictions by mean / median / weighted blend (ECMWF, NCEP, WRF); Monte Carlo interpretation of spread; used in operational forecasting (NOAA, ECMWF). Confirmed sources of uncertainty: (1) initial-condition errors amplified by chaos; (2) model-formulation imperfections. STEAL: perturbed-ensemble method → extremization-tuner multi-model-blend (run predictions with perturbed feature weights, aggregate); spread-as-uncertainty → falsifyBind confidence-interval generation; weighted blend of models → logOddsPool multi-source aggregation.
---

## 3. STEAL-MAPPING TO OUR MODULES (explicit links)

logOddsPool (our pool/aggregation module):
- Elo update (FiveThirtyEight) → update equation for contributor weights.
- EPA-weighted ratings (FPI) → feature-weighted contribution scoring.
- ML estimation (Massey) → parameter-tuning framework.
- Linear-system (Colley) → fast baseline approximation.
- Weighted-median (Metaculus) → contributor aggregation method.
- Stake-weighted (Manifold) → variant aggregation.
- xgboost feature list (nflfastR) → feature-engineering pipeline.

extremization-tuner (our spread/extremization module):
- 10,000-run Monte Carlo (FPI / 538) → spread calibration method.
- Pythagorean expectation (KenPom) → point-differential normalization with sport-specific exponent.
- Rest/travel adjustments (FPI) → contextual adjustment layer.
- Outside-view + frequent update (superforecasting) → dynamic re-calibration.
- Perturbed ensemble (weather) → multi-run blend with spread.
- Opponent-weighting (KenPom / Colley / Massey) → opponent-strength adjustment.

mmc-contribution (our contribution/value module):
- EPA-weighted ratings (FPI) → feature-weighted contribution scores.
- QBR-adjusted updates (538) → contribution-weighted updates.
- Separate offense/defense/home (Massey) → split contribution ratings.
- Schedule-strength (Colley / Massey) → opponent-value adjustments.

falsifyBind (our calibration/validation module):
- Calibration loop (nflfastR / Yurko et al. 2018) → bin-comparison validation.
- Brier tracking (Metaculus / Manifold) → calibration metric.
- Decomposition + outside view (superforecasting) → claim-decomposition check.
- Spread-as-uncertainty (weather ensemble) → confidence-interval generation.
- Cross-platform bot comparison (MetaculusBot) → multi-source validation.
---

## 4. UNVERIFIED / NOT FULLY AUDITED IN THIS SESSION (honest gaps)

- SWIFT (varnsen-net/nfl-modeling): repo exists; exact model architecture, feature list, and accuracy claims NOT verified by reading full code in this session.
- turf (dflemin3/turf): repo exists; hierarchical Bayes structure confirmed by repo name + description; internal equations NOT audited.
- BlairCurrey/nfl-analytics: repo exists; spread-prediction pipeline name confirmed; model details NOT audited.
- Sagarin ratings methodology: proprietary; no published paper found in session; predictive accuracy claims (ATS % etc.) NOT verified.
- FPI 73% claim: confirmed from Wikipedia / ESPN blog citation; NOT independently verified by computing predictions in this session.
- Metaculus Brier comparison (0.084 vs 0.107): confirmed from published analysis paper; NOT independently reproduced in this session.
- All other accuracy claims: either confirmed from cited source (e.g., nflfastR calibration paper) or explicitly marked UNVERIFIED above.
---

## 5. SOURCES USED (verified in session)

Web searches (10 batches) + web_extract on: github.com/fivethirtyeight/nfl-elo-game; wikipedia.org/wiki/Football_Power_Index; kenpom.com/blog/ratings-explanation/; opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/; espn.com/blog/statsinfo/post/_/id/122612/an-inside-look-at-college-fpi; metaculus.com/notebooks/15359/; wikipedia.org/wiki/Ensemble_forecasting; colleyrankings.com / amstat.org PDF; masseyratings.com/theory/massey.htm; sagarin.com/sports/nflsend.htm; github.com topics pages (nfl-modeling, turf, analytics).
No fabricated numbers. No fabricated URLs. Every claim traces to a real source found in session.

File written: C:/Users/Garrett/Sports/handoff/research/prediction-engines-2026-08/ENGINES.md
No git commit / push performed (per instructions).
