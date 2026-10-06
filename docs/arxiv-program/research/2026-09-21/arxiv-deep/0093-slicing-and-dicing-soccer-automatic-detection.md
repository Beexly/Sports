# [0093] Slicing and dicing soccer: automatic detection of complex events from spatio-temporal data (arXiv:2004.04147)

**Citation:** Lia Morra, Francesco Manigrasso, Giuseppe Canto, Claudio Gianfrate, Enrico Guarino, and Fabrizio Lamberti (2020). *Slicing and dicing soccer: automatic detection of complex events from spatio-temporal data*. arXiv:2004.04147v2. URL: https://arxiv.org/abs/2004.04147
**Ledger completed:** 2026-09-21. **Read:** full text (PDF extract, 676 lines; ar5iv HTML did not render). Logic-formula glyphs partly garbled in PDF extraction — affected rules flagged.
**Verdict:** REJECT — positional event-detection from soccer tracking data has no path into GSE's game-outcome/prop prediction engine.

## 1. Research question
Can a two-tier system — atomic events from sliding-window rules over spatiotemporal positional data, then complex events from declarative **Interval Temporal Logic (ITL)** — detect a wide range of soccer events (tackles, filtering passes, pass-chains leading to goals) without large labeled real-world datasets, using a synthetic dataset from an open-source soccer simulator? (Abstract; Sec. 1)

## 2. Dataset / schema
- **SoccER (Soccer Event Recognition) dataset — synthetic.** Built on the open-source **Gameplay Football** engine [16] (Google Research Football gym [9]); opponent controlled by the engine's rule-based bot.
- 8 matches (player-vs-player, player-vs-AI, AI-vs-AI), 500 minutes of play, **1,678,304 atomic events, 9,130 complex events**, train/test split per Table 1. 1920×1080 @ 30 fps screenshots; per frame: x/y positions + bounding boxes of all 22 players and the ball; field coordinate system per Alfheim dataset [12].
- Atomic train/test: KickingTheBall 3,786/3,295; BallPossession 812,086/797,224; Tackle 34,929/26,286; BallDeflection 172/78; BallOut 182/168; Goal 45/36; Foul 3/10; Penalty 3/1.
- Complex train/test: Pass 2,670/2,389; PassThenGoal 33/31; FilteringPass 37/27; FilterPassThenGoal 4/4; Cross 197/165; CrossThenGoal 9/9; Tackle 1,413/1,130; Shot 282/224; ShotThenGoal 41/36; SavedShot 104/64.
- **Access:** public — dataset + engine at https://gitlab.com/grains2/slicing-and-dicing-soccer. (My note: repository link as stated in paper; not verified live in this task.)

## 3. Method / model
- **Atomic event detector (Sec. 3.1):** features per frame from x/y positions (Richly et al. [14] definitions): velocity, acceleration, direction w.r.t. field, distance from ball, which players move, distance from target lines, expected cross position on target line, angle covered by change of direction. Sliding-window rule check: event E_i at t_i recognized if rule satisfied over (t_i, t_i+k), k = window size. Rules: KickingTheBall (ball close, moves away over window, sudden acceleration, increased final speed); BallPossession (closest player, ball speed < Ts2 — z-coordinate absent so speed used to avoid triggering on crosses); Tackle (possession + opponent nearby); BallDeflection (sudden deceleration, ∃k | acceleration(b,t+k) < −Ta4); BallOut; Goal.
- **Complex event detector (Sec. 3.2):** **TILCO** (Temporal Interval Logic with Compositional Operators [8]) — intervals not instants, qualitative + quantitative ordering, metric over time for duration constraints; implemented in the open-source Prolog library **ETALIS** [4]. Rules: Pass/Cross = KickingTheBall THEN BallPossession (same team, k < Th3); FilteringPass = Pass where receiver nearer goal than all opponents at pass start (UEFA definition); PassThenGoal/CrossThenGoal/FilteringPassThenGoal = event-chain + Goal by the same receiving player; complex Tackle = atomic tackles THEN BallPossession (WonTackle if opponent gains, LostTackle complementary); SavedShot = KickingTheBall THEN BallDeflection/BallPossession by goalkeeper. Fouls, penalties, goals not covered (need referee position, ball z-coordinate).
- **Parameter optimization (Sec. 4.2):** 16 rule parameters (Inner/Outer Distance TidN/TodN, speed TsN, acceleration TaN, N=1..4) + per-rule window + rule evaluation order (Lehmer notation) encoded in genome; **SPEA2 multi-objective GA** [19]: 50 generations, population 200, BLX-0.5 crossover p=0.90, mutation p=0.20, archive 100; search space: windows 3–30 frames, speed 1–15 (step 1.0), distance 0.1–2.0 m (step 0.1). Fitness = weighted average of recall and precision over event types. Optimized on train, evaluated on test; repeated twice (authors note GA is initialization-sensitive, "more runs would be needed").

## 4. Equations & assumptions
- Atomic event tuple: `SE = ⟨ID, seType, t, ⟨role_1, p_1⟩, …, ⟨role_i, p_i⟩⟩` — ID, type, time, objects with roles (⚠️ spacing artifacts in PDF; semantics as described).
- Complex events: `LCE = ⟨ID, ceType, (t_s, t_e), L = ⟨e_1 op e_2 op … op e_n⟩⟩` (logical) and `TCE = ⟨ID, ceType, (t_s, t_e), L = ⟨e_1 THEN e_2 THEN … THEN e_n⟩⟩` (temporal).
- KickingTheBall rule (Sec. 3.1): `⟨ID, KickingTheBall, t, L = ⟨⟨KickingPlayer, p_i⟩, ⟨KickedObject, b⟩⟩⟩`, conditions: player(p_i), ball(b), Distance(p_i, b, t) < Tid1; ∀k=1..n: D(p_i, b, t+k) < D(p_i, b, t+k+1); speed(b, t+n) < Ts1; ∃k | acceleration(b, t+k) < Ta1. (⚠️ inequality directions partially garbled in extraction; rule text above is authoritative.)
- Pass rule (Sec. 3.2): `⟨ID, Pass, (t, t+k), L = ⟨ID, KickingTheBall, ⟨KickingPlayer, p_i⟩, t_i, ⟨KickedObject, b⟩⟩ THEN ⟨ID, BallPossession, ⟨PossessingPlayer, p_j⟩, t+k, ⟨PossessedObject, b⟩⟩⟩`, with team(p_i) = team(p_j), k < Th3.
- Assumptions: positional data available (real deployment needs multicamera detection/tracking pipeline — explicitly out of scope, Sec. 3.3); synthetic positions ≈ positions from a fixed multicamera setup; rules not mutually exclusive (evaluation order optimized).

## 5. Features / target
- **Inputs:** per-frame x/y positions of 22 players + ball; engineered features (velocity, acceleration, direction, distances, expected cross position, direction-change angle).
- **Targets:** 5 atomic events (KickingTheBall, BallPossession, Tackle, BallDeflection, BallOut) + 10 complex events (Pass, FilteringPass, Cross, Tackle, Shot, SavedShot, + ThenGoal chains).

## 6. Validation design
- Atomic: ground-truth event counted detected if same-type event found within a **3-frame temporal window**.
- Complex: **OV20** criterion — temporal window matches ground truth if Intersection-over-Union ≥ 20% [5].
- Metrics: precision, recall, F-score per event. GA parameters optimized on train, evaluated on test.
- **Baselines (Table 2):** Richly 2017 (positional + NN), Khan 2018 [7] (broadcast video + temporal logic), Richly 2016 (positional + SVM), Lee 2017 [10] (fixed camera + FSM). Authors note comparison is rough (different datasets, their corpus far larger: 1,203 passes, 1,728 kicking events vs 14–134 events in competing datasets).

## 7. Numerical results / baselines
- **Atomic (test, Fig. 3b / Sec. 4.2):** KickingTheBall — precision 0.96, recall 0.92, F-score 0.94 ("average Fscore of 0.94"); BallPossession — precision 0.99, recall 0.88, F-score 0.93; Tackle — precision 0.94, recall 0.61, F-score 0.74 ("average precision is high (0.94), but the recall is much lower (0.61)"); BallDeflection — F-score "consistently lower than 0.4" (worst); BallOut — "perfect scores for all parameter choices."
- **Complex (Fig. 5 / Sec. 4.4):** "In eight out of 11 cases, the system was able to reach an Fscore between 0.8 and 1." Tackle and SavedShot suffer (depend on the weak atomic Tackle/BallDeflection). "Sequences of events, such as passes that result in a goal, can be detected effectively."
- **Head-to-head (Table 2):** kicking the ball — ours P 96% / R 93% / F 94% vs Richly 2017 95/92/93, Khan 2018 –/92/89; pass — ours 96/93/94 vs Khan 94/84/89, Richly 2016 42.6/64.7/51, Lee 2017 –/60/–.
- Parameter sensitivity (Sec. 4.3): system "very sensitive to the distance thresholds" (converge to narrow ranges); window size robust; speed threshold "less critical" for KickingTheBall; rule order "does not seem to play a fundamental role."
- Authors' own headline: "achieving precision and recall higher than 80% on most events" (Sec. 1).

## 8. Code / data availability
Dataset + modified engine: https://gitlab.com/grains2/slicing-and-dicing-soccer (stated public). Atomic detector in Python; complex detector in ETALIS (Prolog).

## 9. Leakage & limitations
- **All results are on synthetic data.** Authors concede: "Spatiotemporal positional data in the SoccER dataset may be more accurate than those extracted from real video streams"; real multicamera setups report ~90% player / 70% ball tracking accuracy [10] — "investigating the performance on real video streams, in the presence of noise, will require further investigation."
- BallDeflection essentially undetectable from x/y positional data alone (F < 0.4) — positional data insufficient without pose/joint info.
- Foul (13 events) and Penalty (4 events) far too few to evaluate; fouls/penalties/goals excluded from detection (need referee position, z-coordinate).
- GA optimization run only twice; authors admit sensitivity to random initialization, "more runs would be needed to estimate the variability."
- **External validity to NFL:** none — soccer-specific rules, synthetic data, event-detection (not outcome prediction). The technique (declarative temporal logic over tracking data) is sport-agnostic in principle, but GSE has no tracking-event-detection lane.

## 10. GSE overlap
None. GSE's corpus has tracking-data methodology (STRAIN 2305.10262, NGS taxonomy) but nothing on event detection from positional data — this is a new *capability area*, not a duplicate. However, it addresses no gap on the existing-research-map's priority gap list (no "event detection" gap; GSE's engine consumes play-by-play, not tracking data). New but not product-relevant.

## 11. GSE implementation spec
Not applicable — paper rejected for scope. (If GSE ever consumed NFL tracking data, the transferable template would be: atomic play-segment detection from tracking features via sliding-window rules with SPEA2-tuned thresholds, then TILCO/ETALIS-style interval logic for complex events like "screen pass that beat the blitz" — but that lane does not exist and the paper's evidence is soccer-only.)

## 12. Reproducible test
Not applicable — rejected for scope; would require NFL tracking data GSE does not hold.

## 13. Acceptance / rejection gate
Rejected at intake: no gate run.

## 14. Improvement experiment
The paper's most transferable contribution is methodological, not the soccer rules: **using a synthetic game engine to generate 1.6M labeled events for detector development** when real labeled data are scarce. An NFL analogue would be generating synthetic tracking data from a play simulator to pre-train detectors — but without a validated NFL play simulator (nothing like Gameplay Football exists for the NFL at this fidelity), this stays theoretical. The adversarial test the authors skip: inject realistic tracking noise (10% player-drop, 30% ball-drop per [10]) into SoccER and re-report — that number, not the clean synthetic score, is the honest one.
