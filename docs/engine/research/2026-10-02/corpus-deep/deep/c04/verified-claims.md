# c04 Coaching Module — Verified Claims

Phase 2 deep research, coordinator synthesis from Analysts A (1575), B (0207/0247/ledger), C (build inventory).
Working notes: `~/workspace/corpus-intelligence/deep/c04/working/`
Phase-1 sources: map `~/workspace/corpus-intelligence/maps/c04-map.md`, briefs `~/workspace/corpus-intelligence/briefs/c04/`.

Statuses: VERIFIED = confirmed against the source document the brief cites. PARTIAL / INFERENCE flagged where the brief goes past the source.

---

## VC-1 — Per-coach 4th-down risk preference τ (Sandholtz et al., arXiv:2309.00756)

**VERIFIED** (brief → source deep-read note, near-verbatim fidelity; Analyst A).

- Inverse-optimization recovers each coach-team's implicit risk preference as quantile τ of the next-state value distribution from 9 seasons (2014–2022) of nflfastR 4th-down decisions.
- Inverse problem: min_{τ∈[0,1]} (1/N)Σ_j 1(a_j ≠ a*_j(σ_j, q^π̄_τ)) — average Hamming loss between observed decisions and τ-optimal decisions (Eq. 4.11). Joint (τ_1, τ_2) estimation over own/opponent half (Eq. 5.5); L≥3 underidentified with |A|=3.
- Forward model: one-period MDP, actions {GO, FGA, PUNT}; rewards r(TD)=6.95, r(FG)=3, r(SAF)=−2; future play after t+1 follows fixed league-average stationary policy π̄.
- Quantile estimates smoothed with bivariate monotonic SCAM tensor-product splines (k=4 knots, monotonic-decreasing in yardline and yards-to-go); GO-transition augmentation with 3rd-down plays (Romer 2006) counters Daly-Grafstein selection bias; inference restricted to τ∈[0.2,0.8].
- Uncertainty: 200 game-level bootstrap samples preserving within/across-drive dependence, 95% CIs; point estimates = medians of optimal-τ sets.
- Per-coach figures restricted to coach-teams with ≥25 observed 4th-down decisions per field region per WP range (a plotting inclusion rule — PARTIAL: not a general estimation-sufficiency rule).

**VERIFIED headline results:**
- League aggregate: coaches optimize low quantiles (conservative) in both field regions and nearly every WP range, vs. the 4th Down Bot (Baldwin 2024, nfl4th) run through the identical inverse pipeline as the risk-neutral reference.
- τ̂_1 − τ̂_2 (opponent half minus own half) > 0 with 95% CIs excluding 0 until WP ≥ 0.8; gap dissipates as WP→1.
- Bot−League gaps largest in own half at low WP; exception: opponent half at WP<0.05 where league τ̂ matches the Bot.
- Time trend: league risk tolerance increased 2014–2022 in every WP×region cell, more pronounced in opponent half. INFERENCE (note author's): 2023–2026 τ̂ would be higher — projection, not measurement.
- Coaches: no coach's median τ̂_2 (own half) exceeds risk-neutral in any WP range; in opponent half at low WP ~half of coaches risk-seeking, with Matt Nagy, Jay Gruden, Mike McCarthy, Doug Pederson medians exceeding the 4th Down Bot. Own-half behavior uniform; opponent-half wide variation.
- Performance regression (N=622 coach-season-WP-region cells): AvgPointsGained_{ijkℓ} = β_0 + β_1 τ̂_{ijkℓ} + β_2 Elo_{ij} + β_3 1(ℓ=Own) + ε → **β_1(τ̂) = 0.769*** (0.138), partial R² 0.048; β_2(Elo)=0.036***; β_3(own)=0.079***; R²=0.059, adj R²=0.054, F=12.860***. Consistent with Yam & Lopez 2019 (~0.4 wins/year cost of conservatism).

**PARTIAL — granularity:** the regression's τ̂_{ijkℓ} varies at coach-season-WP-region granularity (N=622 supports this), but the headline per-coach τ̂ plots are coach-team *pooled* across 9 seasons. The brief's "per-team-season-region" build spec is the note author's proposal, not a paper-delivered result. The paper's unit is **coach-team** (coach's tenure with one franchise) — an implementation must keep coach-team-season, never bare team-season, across coaching changes.

**VERIFIED limitations (source §9):** state space omits score/time/timeouts (WP stratification as proxy; mild circularity since markets price coaching tendencies); league-wide transitions ignore team strength; region gaps partly inflated by residual Daly-Grafstein selection bias (Bot's translated τ also differs by region); τ explains only ~5% of 4th-down points variance; data ends 2022 — refit on current data before serving.

## VC-2 — Footballonomics 4th-down / 2-pt rational-coaching baselines (0247)

**VERIFIED** (brief → source; Analyst B). 2009–2015 seasons, nflgame API, 1,870 fourth-down attempts:
- Conversion 77.9% overall; 89% on 4th-and-1 (55% of attempts); yardage-adjusted 73%; constant beyond own 35.
- FG success 85.5% overall; sharp decline beyond 50 yards.
- Failed conversion in opponent territory raises ensuing-drive score probability by only ~7% vs touchback.
- E[P] positive for >80% of field; mean +1.4 points/drive (p ≪ 0.01).
- E[P+] = 6·s_4conv^γ(l); E[P−] = 3·s_fg + (3·Δπ_fg + 6·Δπ_td); γ(l) = (100−l)/29; E[P] = E[P+] − E[P−].
- PAT: 2-pt success 51% (235/460) → 1.02 expected pts vs XP 98.4% (8,425/8,561) → 0.984 pts; 2015 XP move to 15-yard line: XP success fell ~5% (p<10⁻⁶), 2-pt unchanged (p=0.4); Steelers attempted 11/45 TDs in 2015 (~25%).

## VC-3 — Situational WP engine port recipe (0207, cricket MDP)

**VERIFIED as a brief-author ADAPT proposal** (paper itself is cricket-only; Analyst B).
Portable mechanics named in the brief:
- Blended outcome profile p̃ = λ·p̂ + (1−λ)·p̄, data-adaptive λ (λ=0 at n=0 → pure population prior; λ→1 as n→∞; n_min=50). Caveat in brief: exact λ formula unreadable in PDF extraction — reconstruction flagged, not a paper quote.
- James–Stein shrinkage toward population priors for sparse situation cells.
- Monte Carlo trajectory search: N=50,000 trajectories/config (SE ≤0.22%); fast pass 5,000 (≈15 ms); refine 30,000.
- Metropolis acceptance A(Δ,T) = 1 if Δ>0 else exp(Δ/T); simulated annealing 8,000 steps, linear cooling T0=0.05→1e-6.
- Laplace smoothing α=1 on per-player, per-phase outcome distributions.
- Proposed NFL state: (score, time, down, distance, field position, timeouts) → 4th-down/2-pt/timeout decisions + weekly coach-decision audit content.
- Acceptance gate is the **brief author's proposal, not a paper quote**: ≥5% Brier improvement over raw MLE on held-out 2026 drives AND ≥80% agreement with 4th-down-bot on a 200-play audit.

## VC-4 — What already exists (build-status, Analyst C)

- **BUILT+NOT-INVOKED:** `~/workspace/coaching-tendencies/` — team-season tendency tables (`off_tendencies.csv`, `def_tendencies.csv`, `coach_offense.csv`, `coach_defense.csv`), verified coach→team→season tenures, per-coach profiles. `go4th_rate` (4th-down pass/run attempts / all 4th-down offensive plays) and `two_pt_rate` (2-pt attempts / TDs) are **descriptive rates, not decision classifiers**; no engine invocation evidenced.
- **BUILT+NOT-INVOKED (weak):** "4th-down grader" named once in IG-sweep brief as an existing engine module — single compositional claim, no file path.
- **SPECIFIED-ONLY:** situational WP engine (0207 contract), 2-pt decision model, NFL timeout analog (1684 spec: propensity GAM/GBM + genetic matching, integrated centered WP over rest-of-half, 2–3 weeks), coach-decision audit dataset, FPM bootstrap WP-uncertainty replication (0247), pathwise WP calibration gate (0448, ~2–3 days), complementary-football drive-EP family (0678), micro-edge "coach tendency shift after injuries" (ledger decision "test", not run), signal declarations `nfl_coaching_tendencies` / `nfl_fourth_down_aggressiveness` (CONTINUOUS_VALUE, context-only, zero wiring).
- **NOT-MENTIONED in c04:** τ risk-preference fits (zero hits — the only τ in the slice is Kendall's partial-Tau in the F1 recipe, a different concept).
- **TESTED-REJECTED in coaching lane:** none.
- **Honesty constraints** (`coaching-tendencies/DATA_GAPS.md`): blitz rate, man/zone, shells, personnel, motion all UNAVAILABLE in nflverse — bound what tendency profiles may claim.

## VC-5 — Cross-slice corroboration (from corpus checkpoint context)

- Keenum-style per-individual modeling requirement and the pooled-parameter gate apply to coaches too: own-half τ̂ is uniform (not a per-coach feature), opponent-half τ̂ is heterogeneous (real per-coach feature) — matches the "unit of analysis is the individual" rule.
- 1575 partially closes c04-map gap #5's "no coach-decision audit dataset" half — it IS a coach-decision audit dataset (9 seasons, per-coach τ̂, bootstrapped CIs, public code: github.com/nsandholtz/fourth_down_risk). The situational WP engine half remains unbuilt.
