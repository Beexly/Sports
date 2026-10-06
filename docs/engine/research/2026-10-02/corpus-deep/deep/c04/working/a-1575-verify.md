# Analyst A verification — 1575 (arXiv:2309.00756) brief vs source

**Source read:** `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/1575-learning-risk-preferences-fourth-down.md` (64 lines, deep-read note; header says "Read: full text (ar5iv HTML)", ledger completed 2026-09-21, verdict ADAPT, replaces 1567 REJECT)
**Brief read:** `~/workspace/corpus-intelligence/briefs/c03/r27/docs__arxiv-program__research__2026-09-21__arxiv-deep__1575-learning-risk-preferences-fourth-down.brief.md`
**Map skimmed:** `~/workspace/corpus-intelligence/maps/c04-map.md` (coaching-relevant sections; finalized 2026-10-02, 300/300 coverage)
**Cross-check:** arXiv abstract page for 2309.00756 (title, authors Sandholtz/Wu/Puterman/Chan, 2014–2022 data, inverse optimization, quantile-parameterized risk, low quantiles = conservative, higher risk tolerance in opponent half, risk tolerances increased over time — all consistent with the source note's headline findings)

**Scope note:** All verdicts below are brief-vs-source-note. I did not read the paper's full text; the exact regression numbers (β₁=0.769, N=622, etc.) are verified as faithfully transcribed from the source note, not independently confirmed against the paper. The arXiv abstract corroborates the qualitative findings only.

**Overall:** The brief tracks the source note with near-verbatim fidelity. No material inflation found. All six listed claims VERIFIED. The three specific checks land as: (a) PARTIAL — granularity nuance, (b) VERIFIED, (c) VERIFIED with an inference flag.

---

## Claim-by-claim verdicts

### 1. Inverse-optimization recovering per-coach τ (quantile of next-state value) from 9 seasons of 4th-down decisions
**VERIFIED.**
- Source §1: "assume their observed decisions are optimal under some unknown risk measure, and estimate that risk measure — parametrized as the quantile τ of the next-state value distribution — via inverse optimization of a quantile MDP."
- Source §2: "nflfastR NFL play-by-play, 9 seasons (2014–2022)."
- Source §3: inverse problem "min_τ (1/N)Σ_j 1(a_j ≠ a*_j(σ_j, q^π̄_τ)), average Hamming loss between observed decisions and τ-optimal decisions (Eq. 4.11)"; "estimate (τ_1, τ_2) jointly (Eq. 5.5)."
- Source §5: "Features: 4th-down state σ = (yardline bin, yards to go), field region (own/opponent half), win-probability bin, quarter, season, coach-team."
- Nuance (see check (a)): the source documents the per-coach estimates as **coach-team pooled** across the 9 seasons for the plots, while the performance regression uses coach-season cells. "Per-coach" is accurate; the pooling dimension matters.

### 2. Performance regression β₁(τ̂) = 0.769*** (SE 0.138), partial R² 0.048, N=622, R²=0.059
**VERIFIED** (verbatim transcription).
- Source §7: "Performance regression (N=622 coach-season-WP-region cells): β_1(τ̂) = 0.769*** (0.138), partial R² 0.048; β_2(Elo) = 0.036***; β_3(own-half indicator) = 0.079***; R² = 0.059, adj. R² = 0.054, F = 12.860***."
- Source §4 gives the specification: "AvgPointsGained_{ijkℓ} = β_0 + β_1 τ̂_{ijkℓ} + β_2 Elo_{ij} + β_3 1(ℓ=Own) + ε (Eq. 6.2)."
- The brief's "SE 0.138" label is a correct reading of the parenthesized 0.138 (inference, but standard and uncontroversial).

### 3. τ̂_1 − τ̂_2 > 0 with 95% CIs excluding 0 until WP ≥ 0.8
**VERIFIED** (verbatim transcription).
- Source §7: "τ̂_1 − τ̂_2 (opponent half minus own half) > 0 with 95% CIs excluding 0 until WP ≥ 0.8: coaches clearly more risk-tolerant in the opponent's half at low-to-mid WP; gap dissipates as WP→1."
- Source §6 confirms the contrast machinery: "200 game-level bootstrap samples ... give 95% CIs on τ̂ and on all contrasts (τ̂_1−τ̂_2, Bot−League)."

### 4. Matt Nagy, Jay Gruden, Mike McCarthy, Doug Pederson medians exceeding the 4th Down Bot in opponent half at low WP
**VERIFIED** (verbatim transcription).
- Source §7: "in the opponent half at low WP, ~half of coaches are risk-seeking vs risk-neutral, with Matt Nagy, Jay Gruden, Mike McCarthy, Doug Pederson medians even exceeding the 4th Down Bot. Own-half behavior uniform across coaches; opponent-half shows wide variation."
- The brief reproduces both the four names and the surrounding context ("~half of coaches are risk-seeking vs risk-neutral", "own-half behavior uniform") faithfully.

### 5. No coach's median τ̂_2 exceeds risk-neutral in any WP range
**VERIFIED** (verbatim transcription).
- Source §7: "no coach's median τ̂_2 (own half) exceeds the risk-neutral reference in any WP range."
- Source §3 notes the reference is the "4th Down Bot (Baldwin 2024, nfl4th) run through the same inverse pipeline as a risk-neutral reference 'translation'" — the brief carries this over correctly.

### 6. Limitations: state space omits score/time/timeouts; league-wide transitions; Daly-Grafstein residual bias; 2014–2022 data staleness
**VERIFIED** — all four present in source §9:
- "State space omits score differential, time remaining, timeouts (mitigated via WP stratification, which itself uses a tree model including the Vegas spread — mild circularity since markets price in coaching tendencies, but WP is only a stratifier here)."
- "League-wide transitions ignore team strength (acknowledged; data sparsity)."
- "Daly-Grafstein 2023 selection bias: teams that go for it are better at it; authors counter with 3rd-down augmentation + monotonic smoothing, and show the Bot's 'translated' τ also differs by region — a fingerprint of residual selection bias, so region gaps are partly inflated."
- "2014–2022 data; the aggression trend means 2023–2026 τ̂ would be higher — refit on current data before using."
- The brief reproduces all four without softening (including the "region gaps are partly inflated" caveat).

---

## Specific checks

### (a) Does the source support fitting τ̂ per team-season (not just coach-team pooled)?
**PARTIAL** — the source contains evidence for both granularities, and the brief's "per-team-season-region" phrasing goes one step past what the source documents as a delivered result.
- **For coach-season:** Source §7 describes the regression as "(N=622 coach-season-WP-region cells)" with τ̂ carrying all four indices in Eq. 6.2 (τ̂_{ijkℓ}, source §4) — so τ̂ varies at coach-season granularity in the regression specification. This is the strongest in-source support for per-coach-season τ̂.
- **For coach-team pooled:** Source §2: "Coach-team plots restrict to coaches with ≥25 observed 4th-down decisions per field region per win-probability range." Source §6 lists "by season" and "by coach-team (≥25 decisions)" as *separate* robustness cuts, and §5 "Features" lists "coach-team" (not coach-team-season). The headline per-coach results are pooled across seasons.
- **What the source does NOT document:** running the Hamming-loss inverse problem (Eq. 5.5) per team-season as a standalone estimation product with bootstrap CIs. The brief's engine-actionable ("fit per-team-season-region τ̂") and the source note's own §11 implementation spec ("per-team-season-region τ̂ via the Hamming-loss inverse problem (Eq. 5.5)") are the *note author's proposal*, not a paper result the source describes. Treating the spec as established paper methodology would be an overread.
- **Unit-of-analysis nit (inference):** the paper's unit is **coach-team** (a coach's tenure with one franchise), and the brief occasionally writes "per-team-season," which drops the coach-team pairing. Across a coaching change, "team-season τ̂" would misattribute. Any implementation should keep the coach-team-season unit the regression implies (τ̂_{ijkℓ} with coach index i), not team-season alone.
- **Arithmetic sanity (inference):** N=622 cells over 2 regions implies ~311 coach-season-region units; with a handful of WP bins each, that's on the order of ~60 coach-seasons with enough 4th-down volume — consistent with a strict data filter, and consistent with the pooled-plots ≥25 rule being the binding constraint for the per-coach figures.

### (b) Does the source support the "≥25 decisions per region per WP range" data-sufficiency rule?
**VERIFIED.**
- Source §2: "Coach-team plots restrict to coaches with ≥25 observed 4th-down decisions per field region per win-probability range." Source §6 repeats "by coach-team (≥25 decisions)."
- The brief states it exactly as the source does — as a **plotting inclusion rule for the coach-team figures**, not as a general estimation sufficiency rule. Neither the source nor the brief overclaims it. (Inference: it should not be read as the paper's rule for the league-aggregate or regression estimates, which pool far more data.)

### (c) What does the source say about 2023+ applicability given the aggression trend?
**VERIFIED**, with one inference flag.
- Source §7 documents the trend inside the sample: "Time trend: league risk tolerance increased over 2014–2022 in every WP×region cell, more pronounced in the opponent's half."
- Source §9 draws the forward conclusion: "2014–2022 data; the aggression trend means 2023–2026 τ̂ would be higher — refit on current data before using."
- The brief's "refit each offseason (stale τ̂ systematically underrates aggression)" matches the source's prescription.
- **Inference flag:** "2023–2026 τ̂ would be higher" is the *note author's extrapolation* of the observed 2014–2022 trend — the paper's data ends in 2022 and contains no 2023+ measurement. Directionally well-grounded, but it is a projection, not a finding. Also note the arXiv record shows v3 revised Aug 2024, so the paper itself postdates the 2022 season but the data window is unchanged.

---

## Inflation flags

**None material.** The brief is a near-verbatim compression of the source note; every number I checked (Eq. 4.6/4.11/5.5/6.2, rewards 6.95/3/−2, k=4 SCAM knots, τ∈[0.2,0.8], 200 game-level bootstraps, N=622, β's, R²=0.059/adj. 0.054/F=12.860, the four coach names, WP≥0.8 and WP<0.05 thresholds, Yam & Lopez 2019 ~0.4 wins/year) matches the source exactly. Two minor observations, neither rising to inflation:

1. Brief's intelligence-connection "team-specific τ̂ is a real feature, own-half τ̂ is not" is the brief author's **inference** from source §7's "Own-half behavior uniform across coaches; opponent-half shows wide variation." Reasonable, correctly tagged as a connection, but it is an interpretive step — the source states uniformity of behavior, not feature-validity.
2. Brief's "SE 0.138" parenthetical label and "desperation aligns behavior with WP" gloss are faithful readings, not additions.

## Map-context note (for parent)

The c04 map (finalized 2026-10-02) does not yet reference 1575 / brief r27. Its gap #5 states: "there is no coach-decision audit dataset; the 4th-down/2-pt situational WP engine (0207, r70) is proposed, not built." **1575 partially closes the first half of that gap** — it is exactly a coach-decision audit dataset (9 seasons, per-coach τ̂ with bootstrapped CIs, public reproduction code). The situational WP engine half remains unbuilt. Recommend the map's next pass cite 1575 against gap #5 rather than leaving it as "no dataset."

## Bottom line for the coaching module

The brief is trustworthy as a faithful rendering of the deep-read note. Usable as specified: τ̂ per coach-team × region × WP bin with the ≥25-decision inclusion rule for per-coach figures; league trend is upward so any τ̂ fitted on 2014–2022 must be refit on current data before serving. Open methodological question for the module (not resolved by the source): whether per-coach-team-*season* τ̂ (the regression's granularity) is estimable with usable CIs under the ≥25 rule, or whether the regression's N=622 cells rely on coarser WP bins — the source note does not say, and the brief's implementation spec assumes it is feasible.
