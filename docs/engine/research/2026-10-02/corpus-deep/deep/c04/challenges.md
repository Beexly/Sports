# c04 Coaching Module — Challenges

Weak, contradictory, or inflated claims found in Phase 2. Each names the claim, the problem, and the required handling.

---

## CH-1 — "Per-team-season τ̂" overclaims the paper's granularity (Analyst A, check (a))

**Claim:** brief's engine-actionable spec says "fit per-team-season-region τ̂ from nflverse 2014–2025."
**Problem:** the paper delivers coach-team *pooled* τ̂ plots (≥25-decision rule) and a coach-season-WP-region *regression*; it does not document running the Hamming-loss inverse problem per team-season with bootstrap CIs as a standalone estimation product. "Team-season" also drops the paper's coach-team unit — misattribution across coaching changes.
**Handling:** module fits and serves τ̂ at **coach-team-season** granularity (the regression's implied unit, τ̂_{ijkℓ} with coach index i), with the ≥25-decision rule applied as an inclusion gate per coach-team-season-region-WP cell; cells failing the gate fall back to coach-team pooled, then league. Never serve bare team-season τ̂.

## CH-2 — "2023–2026 τ̂ would be higher" is extrapolation, not measurement (Analyst A, check (c))

**Claim:** brief's "refit each offseason (stale τ̂ systematically underrates aggression)."
**Problem:** directionally grounded in the 2014–2022 trend, but no 2023+ τ̂ has been measured in the source. Treating the extrapolation as fact would bake an assumed aggression level into the behavior model.
**Handling:** fit τ̂ on 2020–2025 nflverse data directly (data we hold); report the measured trend rather than assuming it. The refit-each-offseason prescription stands, but as a procedure, not as a directional claim.

## CH-3 — τ explains ~5% of 4th-down points variance (Analyst A, source §9)

**Claim (implicit):** τ̂ as a "calibrated input to drive-outcome prediction" (brief's intelligence connection).
**Problem:** partial R² 0.048 — τ̂ is a real but small lever. A module that oversells τ̂ as a primary drive-outcome feature will disappoint.
**Handling:** position τ̂ as the *behavior-prediction* layer (what will the coach do — high leverage for live-WP and audit) not as a primary *outcome-prediction* feature. Gate 2 (≥3 pp Hamming accuracy over WP-max rule) tests exactly the right thing.

## CH-4 — Region gaps partly inflated by residual selection bias (Analyst A, source §9)

**Claim:** "coaches clearly more risk-tolerant in the opponent's half" (τ̂_1 − τ̂_2 > 0, CIs exclude 0 until WP≥0.8).
**Problem:** the Bot's "translated" τ also differs by region — a fingerprint of residual Daly-Grafstein selection bias despite 3rd-down augmentation + SCAM smoothing. The region gap is real but its magnitude is overstated.
**Handling:** when serving τ̂_1 − τ̂_2 contrasts, shrink toward the Bot-translated gap (subtract the Bot's region difference as a bias estimate). Document the adjustment; don't present raw contrasts as pure preference differences.

## CH-5 — The 0207 acceptance gate's Brier target needs a baseline reality check

**Claim:** "≥5% Brier improvement over raw MLE on held-out 2026 drives."
**Problem:** raw MLE on sparse situation cells is a weak baseline (high variance); beating it by 5% via shrinkage is nearly definitional, not a strong gate. The corpus's own benchmark lesson (projection model 4.87 MAE losing to naive 4.76–4.9999 persistence) says: weak baselines flatter weak models.
**Handling:** keep the gate but add the second half's strength — the ≥80% agreement with 4th-down-bot on the 200-play audit is the binding constraint. Report both; promote only on both.

## CH-6 — "Own-half τ̂ is not a real feature" is brief-author inference (Analyst A, inflation flag 1)

**Claim:** brief's intelligence connection "team-specific τ̂ is a real feature, own-half τ̂ is not."
**Problem:** the source states behavioral uniformity ("Own-half behavior uniform across coaches"), not feature-validity. The inference is reasonable but one step past the text.
**Handling:** adopted as a modeling decision (S-3), explicitly labeled as our decision, not the paper's finding. Revisit if the 2020–2025 refit shows own-half heterogeneity emerging.

## CH-7 — The exact λ formula for the blended profile is unrecoverable from the brief

**Claim:** p̃ = λ·p̂ + (1−λ)·p̄ with "data-adaptive λ."
**Problem:** the brief itself flags the exact λ formula as "unreadable in PDF extraction (reconstruction flagged, not a paper quote)." Any implementation must choose its own λ(n).
**Handling:** implement λ(n) = n/(n+n_0) with n_0=50 (the brief's stated n_min=50 as the half-weight point) — our reconstruction, documented as such, with n_0 as a tunable. Do not present it as the paper's formula.

## CH-8 — Timeout module has the thinnest foundation — sequence it last

**Claim:** 0207's proposed engine covers timeout decisions.
**Problem:** the only concrete timeout spec is 1684's 2–3-week propensity-matching design; the NBA estimand is explicitly "not a GSE product input." No timeout outcome data exists in nflverse beyond `timeout_team` (which we have) — but no validated timeout-WP methodology is in the slice.
**Handling:** build the timeout action set as a stub behind the shared engine interface in Phase 3; full timeout modeling is a Phase-5+ improvement item, gated on replicating 1684's design.

## CH-9 — Contradiction: "no coach-decision audit dataset" vs 1575's existence

**Claim (c04-map gap #5):** "there is no coach-decision audit dataset."
**Problem:** 1575 IS a coach-decision audit dataset (9 seasons, per-coach τ̂, bootstrapped CIs, public code) — it just lives in c03's briefs, not c04's. The gap statement is slice-myopic.
**Handling:** corrected in the module build (we fit the dataset); recommend the map's next pass cite 1575 against gap #5's first half.

## CH-10 — The "4th-down grader" as existing engine module rests on one weak claim

**Claim (IG-sweep brief):** "4th-down grader" among existing engine modules.
**Problem:** single compositional mention, no file path, no wiring evidence anywhere in c04 (Analyst C).
**Handling:** treat as NOT-MENTIONED for build purposes. If it exists in the Sports repo, the module's audit function supersedes it with provenance; do not wire to an unverified path.
