# 1688 Heating Up in NBA Free Throw Shooting (arXiv:1801.07104)

**Citation:** Paul R. Pudaite (2018). *Heating Up in NBA Free Throw Shooting*. arXiv:1801.07104. URL: https://arxiv.org/abs/1801.07104
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections + appendices).
**Verdict:** ADAPT — the repetition/interruption/fatigue/stress decomposition of performance variation gives GSE a causal vocabulary for "hot hand" effects in player props, but the free-throw-specific estimates don't transfer directly.

## 1. Research question

Is the "hot hand" a real, causal, dynamic process rather than a misperception of random sequences? The author reframes hot-hand research: instead of detecting who is "hot," identify the causal drivers of performance variation — repetition (heats up), interruption (cools down), fatigue (damps), stress (damps) — and measure each in the clean laboratory of NBA free-throw shooting, which is free of shot-selection and defensive confounds.

## 2. Method / model

- **Data:** NBA play-by-play 2000-01 through 2013-14 (14 seasons), 1,233 players; plus re-analysis of Gilovich–Vallone–Tversky (1985) Celtics Table 3 (1980-81/1981-82).
- **Classical analysis:** 1st-vs-2nd-shot percentages by trip structure (Tables 1–3), z-scores for differences; cross-trip comparison (1st shot of 2nd trip vs last shot of 1st trip) to isolate interruption.
- **Model 1 (Bayesian hierarchical):** per-player binomial outcomes Y_ijk ~ B(1, P_ijk); P_ijk = logistic(X_ijk); X_ij ~ N(μi, Σi) (intra-individual variability); (μi, Σi) drawn from population distribution Ψ1 (inter-individual); EM-estimated. Separates true repetition effects from ability heterogeneity (Simpson's-paradox control).
- **Model 2 (intra-game trips):** adds trip-index displacement Δ_h: Z_ij = X_ij + Δ_{h(i,j)}, h = trip-to-line index within game; Δ_h ~ N(0, ΣΔ), ΣΔ estimated by EM; captures heating across trips within a game.
- **Model 3 (fatigue/stress):** minute-binned (48 regulation bins + overtime bin) Kalman-filtered estimates of Δ_h(t) for first vs subsequent trips; Mahalanobis trend statistics for decline/increase sub-trends.

## 3. Mathematics / equations / assumptions

- Y_ijk = B(1, P_ijk); P_ijk = e^{X_ijk}/(1+e^{X_ijk}); X_ij ~ N(μi, Σi); (μi,Σi) ~ Ψ1.
- Model 2: Z_ij = X_ij + Δ_h; Δ_h ~ N(0, ΣΔ); ΣΔ estimated = [[0.0402, 0.0080],[0.0080, 0.0346]] (SD 0.20/0.19 logit units, ρ=0.21).
- Simplifying assumptions: P_ijk independent of previous outcomes within a trip (acknowledged tension with Arkes 2014/Chang 2017 error-correction findings; Appendix 3 argues the model still accounts for conditional effects); mean/variance of X independent of trip length n.
- Key identification move: conditioning on the *act* of shooting (not the outcome) — the repetition effect doesn't depend on make/miss, sidestepping the weak-identification problem Gelman (2015) diagnosed for outcome-conditioned hot-hand tests.

## 4. Dataset / schema

- **Source:** NBA play-by-play, seasons 2000-01 through 2013-14; 1,233 players.
- **Key tabulations:** Table 3 — single trips: Exactly 1 (N=80,940, 72.9%), Exactly 2 (N=382,031; 73.2%→77.8%), 3+ (N=4,638; 78.1%→83.2%→85.0%). Table 2 — cross-trip: S1 first of 2+ trips (N=79,771; 73.0%→78.3%, +5.3pp, z=24.6); S2 second of 2+ trips (74.2%→78.2%, +4.1pp, z=19.0).
- **Access:** play-by-play (public via NBA/Basketball-Reference); paper's derived tables reproducible from same.

## 5. Features / target

- **Features:** shot index within trip (1st/2nd/3rd), trip index within game h, game minute t, player identity (random effects).
- **Target:** make/miss of each free throw; derived estimands: δ12 = Pct2−Pct1 (repetition effect), cross-trip drops (interruption effect), Δ_h(t) trajectories (fatigue/stress).

## 6. Validation design

- **Design:** descriptive + Bayesian hierarchical estimation; no train/test split. Classical z-tests for raw differences; Bayesian models for deconfounded effects; EM for hyperparameters; Kalman filter for time trends; Mahalanobis distances for trend significance.
- **Robustness:** GVT 1980s Celtics data re-analysis agrees with modern 14-season data; Model 1's ability-heterogeneity control addresses the aggregation critique (the "Total" row 2nd→3rd +7.1pp is shown to overstate individual improvement because poor shooters rarely get 3-shot trips).

## 7. Exact results and baselines (numbers)

- **Repetition (within trip):** 2nd shot +5.3pp over 1st on first trips (73.0%→78.3%, z=24.6, N=79,771); +4.6pp on exactly-2 trips (73.2%→77.8%, z=46.56, N=382,031); 3+ trips: 78.1%→83.2%→85.0%. "When NBA players went to the line for three or more free throws, they missed 46% more of their 1st than 3rd attempts (1,016 vs 695)."
- **Interruption (between trips):** 1st shot of 2nd trip (74.2%) is well below last shot of 1st trip (78.3%) — cooling between trips; but still above 1st-trip 1st shot (73.0%) — partial retention (+1.2pp, z=5.395).
- **Prior literature:** Arkes (2010) fixed-effect logit: 2nd FT conditional on 1st make = +2.9pp (SE 0.8pp) — the author's unconditional repetition effect (~5–6pp) is about twice as large.
- **Model 2:** trip-to-trip displacement SD ≈ 3.5pp for a typical 75.4% FT shooter; 2nd trip improvement χ² = 12.378 (significant); improvement continues through ~6th–7th trip, possible decline at 8+ (low precision, small samples).
- **Fatigue/stress (Model 3):** both first-trip and subsequent-trip displacements decline over the game (Mahalanobis trend distances 3.5/2.9 for full-game decline); steeper late-game drop from minute 45 through overtime, attributed to stress; author calls fatigue/stress evidence "suggestive," requiring further work.

## 8. Code / data availability

**None stated** — no repo, no data link in the paper as read. (Derived tables are reproducible from public play-by-play.)

## 9. Leakage and limitations

- **Within-trip independence assumption** (P_ijk ⊥ previous outcomes) contradicts Arkes/Chang error-correction evidence; the author argues via Appendix 3 the model still fits, but this is the load-bearing simplification.
- **Interruption is informal:** "whatever transpires between trips" — no operationalization of what about the interruption cools players (time elapsed? game action? bench sitting?).
- **Model 2 ignores inter-player variation** in Δ_h (footnote 7) — trip effects estimated on shrinking, less-representative player subsets at high h.
- **Fatigue/stress are suggestive only** — minute trends confounded with substitution patterns (starters vs bench composition changes over the game); no minutes-played covariate.
- **Free throws are the cleanest case by design** — field-goal "comparable impact" claim is extrapolation, explicitly flagged as "as seems likely."

## 10. GSE overlap

GSE's player-prop models treat recent performance with generic recency weighting; no causal decomposition of *why* a player is hot (repetition vs rest vs fatigue). This paper's vocabulary — repetition heats, interruption cools, fatigue/stress damp — is the missing structural prior for GSE's in-game prop adjustments (e.g., a WR's 3rd target vs 1st target in a drive; a QB after a long bench stint). No existing GSE doc operationalizes hot-hand as a dynamic causal process.

## 11. GSE implementation spec

- **Target:** repetition/interruption features for NFL player props — e.g., receiver target k within a drive (repetition heating), plays since last touch (interruption cooling), snaps played (fatigue), leverage of situation (stress).
- **Data:** nflverse pbp 2015–2024; per-player per-play success (reception/catch, yards over expected via NGS).
- **Model:** Bayesian hierarchical logistic (player random intercepts/slopes, mirroring Model 1) with covariates: touch index within drive, plays since previous touch, cumulative snaps, score leverage; estimate δ_12-style contrasts (2nd touch vs 1st touch in a drive).
- **Serving:** pre-game prop model features (rest/fatigue adjustments) + live in-game prop adjustment ("heating up" flags).
- **Effort:** 2 weeks.

## 12. Reproducible test

- **Dataset:** nflverse pbp 2018–2024; WR/TE targets grouped into drives; first vs second target within the same drive by the same receiver.
- **Metric:** catch-rate and yards-per-target contrast (2nd target − 1st target) with player-random-effect adjustment; report pp difference + z.
- **Baseline to beat:** raw league-average contrast (expected positive from the paper's logic); the hierarchical model passes if (a) the player-adjusted repetition effect has |z| > 3 and (b) the interruption contrast (first target of a drive vs last target of previous drive) is negative with |z| > 2 — mirroring the paper's heat/cool pattern. A pure noise result (|z| < 2 on both) rejects the transfer.
- **Window:** 2018–2024 regular seasons.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the repetition/interruption feature family if the NFL replication finds a player-adjusted within-drive repetition effect ≥ +2pp catch rate with |z| > 3 AND a between-drive interruption effect ≤ −1pp with |z| > 2. REJECT if both |z| < 2 (no signal in football touches).
- **Improvement experiment:** the paper's interruption concept is informal — operationalize it with NGS tracking: measure *actual* time and distance between a player's consecutive touches (instead of "trips") and fit the cooling curve as a parametric decay (exponential in minutes + yards run), which would let GSE predict exactly when a player has "cooled down." Second: test the fatigue interaction the paper couldn't — touches × cumulative snaps — to separate heating from wearing down, directly informing workload/injury-lane snap-count decisions.

**Verdict:** ADAPT — the repetition/interruption/fatigue/stress causal vocabulary ports to NFL player-prop modeling as structural features, pending the replication gate.
