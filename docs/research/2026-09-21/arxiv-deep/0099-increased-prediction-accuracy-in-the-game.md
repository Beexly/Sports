# [0099] Increased Prediction Accuracy in the Game of Cricket using Machine Learning (arXiv:1804.04226)

**Citation:** Kalpdrum Passi, Niravkumar Pandey (2018). *Increased Prediction Accuracy in the Game of Cricket using Machine Learning*. IJDKP Vol. 8, No. 2 (March 2018); arXiv:1804.04226v1. URL: https://arxiv.org/abs/1804.04226
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 908 lines).
**Verdict:** ADAPT — the Consistency/Form/Opposition/Venue four-way player-feature decomposition is a portable prop-modeling framework for GSE; the cricket classifiers and their 90%+ accuracies are not trustworthy (see leakage notes in §9).

## 1. Research question
Can supervised multiclass classifiers predict, per ODI match, how many runs a batsman will score and how many wickets a bowler will take — framed as classification into performance bands — from engineered career/form/matchup/venue features? (Abstract; Sec. 1)

## 2. Dataset / schema
- Scraped from **cricinfo.com** (ParseHub, import.io) into MySQL via PHP. Batting: matches **14 Jan 2005 – 10 Jul 2017**, with full innings-by-innings career histories back to Tendulkar's ODI debut (18 Dec 1989). Bowling: matches **2 Jan 2000 – 10 Jul 2017**, histories back to 31 Mar 1984.
- Per-match traditional stats recomputed point-in-time ("till the day of the match") since cricinfo doesn't serve historical stat snapshots.
- Tools: Weka 3.9.1 + Dataiku Data Science Studio.
- **Access:** not shared (scraped data; no download link).

## 3. Method / model
- **Targets as classification:** runs in 5 classes (1–24 / 25–49 / 50–74 / 75–99 / ≥100); wickets in 3 classes (0–1 / 2–3 / ≥4).
- **Feature engineering (the paper's real contribution):** traditional attributes → four AHP-weighted derived attributes:
  - **Consistency** (whole career): batting = `0.4262·average + 0.2566·innings + 0.1510·SR + 0.0787·centuries + 0.0556·fifties − 0.0328·zeros`; bowling = `0.4174·overs + 0.2634·innings + 0.1602·SR + 0.0975·average + 0.0615·FF`
  - **Form** (last 12 months): batting same weights as Consistency; bowling = `0.3269·overs + 0.2846·innings + 0.1877·SR + 0.1210·average + 0.0798·FF`
  - **Opposition** (career vs that team): batting same as Consistency; bowling = `0.3177·overs + 0.3177·innings + 0.1933·SR + 0.1465·average + 0.0943·FF`
  - **Venue** (career at that ground): batting = Consistency weights but `+ 0.0328·HS` (highest score) instead of zeros; bowling = `0.3018·overs + 0.2783·innings + 0.1836·SR + 0.1391·average + 0.0972·FF`
  - Weights from the **Analytic Hierarchy Process** (Saaty); raw measures binned to 1–5 ratings before weighting.
- **Contextual attributes:** batting/bowling hand, batting position, match type (normal/QF/SF/final), day/day-night, opposition strength (avg consistency of opponents), home/away/neutral, opposition team, role, captain, wicketkeeper, innings (1st/2nd), tournament type, toss, pressure (1–5), host country, ground.
- **Class imbalance:** majority class 1 → SMOTE oversampling of minorities.
- **Classifiers:** Naïve Bayes, Decision Trees (C4.5/CART), Random Forest, multiclass SVM (LIBSVM).

## 4. Equations & assumptions
- Batting average = Runs / dismissals; SR = (Runs/Balls)·100; Bowling avg = runs conceded/wickets; Bowling SR = balls/wickets.
- Derived-attribute formulas as above (Sec. 4.3.1–4.3.4) — AHP weights quoted exactly.
- NB decision rule: choose C_i maximizing P(C_i|X); DT split by information gain / gain ratio; SVM hyperplane W·X + b = 0 (LIBSVM).
- Assumptions: AHP pairwise weights capture true relative importance; 1–5 binning loses little signal; SMOTE synthetic players are realistic; point-in-time stat reconstruction is correct.

## 5. Features / target
- **Inputs:** the four derived attributes (Consistency/Form/Opposition/Venue) + ~15 contextual attributes.
- **Target:** runs class (5) per batsman-match; wickets class (3) per bowler-match.

## 6. Validation design
- **Random train/test splits** (60/70/80/90% train) — NOT time-ordered; no season-based holdout, no cross-validation described. SMOTE applied to address imbalance (applied before splitting per the text's ordering — a leakage vector).
- Metrics: accuracy, precision, recall, F1, AUROC, RMSE. Baseline comparison: Muthuswamy & Lam (2008) BPN 87.10% / RBFN 91.43% on 8 Indian bowlers (2-class problem).

## 7. Numerical results / baselines
- **Runs (Table 1, 90% train):** Random Forest **90.74%** (prec/recall/F1 0.908, AUROC 0.987, RMSE 0.1604); Decision Trees 80.46%; SVM 51.45%; Naïve Bayes 42.50%.
- **Wickets (Table 2, 90% train):** Random Forest **92.25%** (0.923/0.923/0.923, AUROC 0.975, RMSE 0.2036); Decision Trees 86.50%; SVM 68.78%; Naïve Bayes 58.12%.
- Accuracy rises with train size for all models except NB on batting. Authors note SVM's poor showing as "surprising."

## 8. Code / data availability
Not stated (Weka/Dataiku workflows; scraped data not shared).

## 9. Leakage & limitations
- **Random splits on time-series data:** future matches can train models predicting past matches; form/venue/opposition features of "nearby" matches leak across the split. A time-ordered split is the honest design — absent here.
- **SMOTE before splitting** (text order suggests it) leaks synthetic minority samples across train/test.
- **90.74% on 5-class runs prediction is not credible** as a generalization claim — cricket scores are notoriously noisy; the number reflects in-sample-ish memorization via the split design, not a real edge. Treat all accuracies as optimistic upper bounds.
- AHP weights are subjective pairwise judgments dressed as measurement; the 1–5 binning thresholds are author-chosen ("we applied our knowledge").
- Zero Opposition/Venue values (no history) replaced with class averages — shrinks exactly the cold-start cases a selector cares about toward the mean.
- Cricket-specific; no calibration, no betting-market comparison, no profit metric.

## 10. GSE overlap
Repo has prop-modeling lanes but no inventoried **player-level Consistency/Form/Opposition/Venue decomposition** — the four-way split is new to the corpus. No duplicate. (Cricket itself is irrelevant to GSE; the feature framework is the portable part.)

## 11. GSE implementation spec
1. **Port the four-way decomposition to NFL player props:** for each player-game, compute Consistency (career baseline), Form (last 4–8 games), Opposition (career vs that defense / defensive scheme), Venue (home/away/dome/outdoors splits) — same AHP-style weighted composites, but with weights **learned** (regularized regression) instead of Saaty pairwise judgments.
2. Targets: receiving yards / rushing yards / receptions bands (mirroring the paper's classification framing) or direct regression on the prop line — test both.
3. Data: nflverse 2006–2025 player game logs. Effort: ~1–2 weeks; feeds the props lane directly.

## 12. Reproducible test
Dataset: nflverse WR/TE game logs 2015–2025. Build the four features per player-game (strictly point-in-time, no SMOTE); predict receiving-yards bands with random forest vs a baseline of (career average only). **Time-ordered** train/test: train ≤2022, test 2023–2025. Success = four-feature model beats career-average baseline on test accuracy by ≥3pp AND on log-loss; fail = no gain, the decomposition adds nothing over a good baseline.

## 13. Acceptance / rejection gate
**Adopt** the Consistency/Form/Opposition/Venue feature set for GSE props if the time-ordered test shows ≥3pp accuracy gain or ≥0.01 log-loss improvement over the career-average baseline; **reject** if the gain vanishes under honest time-ordered evaluation (the paper's random-split numbers do not count as evidence).

## 14. Improvement experiment
Fix the paper's two design flaws at once: (a) replace subjective AHP weights with **learned** weights via grouped-regularized multinomial regression (group = the four derived attributes, so the decomposition stays interpretable); (b) replace SMOTE+random-split with time-ordered splits and class-weighted loss. Then test whether the *Opposition* component (player vs specific defense) carries independent signal beyond team-level matchup adjustments GSE already uses — that interaction is the one thing a player-prop model can know that a team model cannot.
