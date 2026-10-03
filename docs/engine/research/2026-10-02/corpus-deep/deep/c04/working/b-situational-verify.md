# B — Situational / coaching module: verification of brief claims

Reader: Analyst B (Phase 2 deep research, coaching module). Verdicts quote the briefs' own words. Inferences are marked [INFERENCE].

---

## B1 — Does the 0207 brief support porting its MDP recipe to an NFL 4th-down/2-pt/timeout engine?

**VERIFIED.** The brief's ledger verdict is "ADAPT — reject the cricket application, port the framework to an NFL in-game decision engine and 'coach decision audit' content." Its Engine-actionable section says verbatim: "Yes — port to NFL: shrunk situation-profile WP engine over state (score, time, down, distance, field position, timeouts) for 4th-down/2-pt/timeout decisions + weekly coach-decision audit content."

Portable mechanics named in the brief:
- Blended profile p̃ = λ·p̂ + (1−λ)·p̄, data-adaptive λ (λ = 0 at n = 0 → pure population prior; λ → 1 as n → ∞; n_min = 50 deliveries). Caveat stated in the brief: "Exact λ formula unreadable in PDF extraction (reconstruction flagged, not a paper quote)."
- "James–Stein shrinkage toward population priors" (What-it-is section) / "James–Stein phase-shrinkage recipe for sparse situation cells" (Intelligence connections).
- Monte Carlo trajectory search: "N = 50,000 trajectories/config (SE ≤ 0.22%)"; fast pass N_fast = 5,000 (≈15 ms); refine N_refine = 30,000.
- Metropolis acceptance A(Δ,T) = 1 if Δ > 0 else exp(Δ/T); simulated annealing 8,000 steps, linear cooling T0 = 0.05 → 1e-6.
- Laplace smoothing α = 1 on per-player, per-phase outcome distributions.

[INFERENCE]: the port itself is the brief/ledger author's proposal, not something the paper claims — the paper is cricket-only (author-admitted limits include opponent-agnostic, precommitted plans, no momentum).

## B2 — Acceptance gate ("≥5% Brier improvement over raw MLE on held-out 2026 drives and ≥80% agreement with 4th-down-bot on 200-play audit"): paper quote or brief author's proposal?

**VERIFIED: the brief author's proposal.** The gate appears only in the "Engine-actionable?" section of the brief, which is the ledger author's build spec, not in the paper's Findings ("1,161 IPL matches", "56.5% win vs 52.4%", etc.). No paper attribution is given or implied anywhere in the brief.

## B3 — What the 0247 footballonomics brief claims about 4th-down decisions (quantitative only)

**VERIFIED.** The brief's Findings state, verbatim:
- "conversion 77.9% overall (89% on 4th-and-1, 55% of attempts; yardage-adjusted 73%)"
- "constant beyond own 35"
- "FG success 85.5% overall, sharp decline beyond 50 yards"
- "Failed conversion in opponent territory raises ensuing-drive score probability by only ~7% vs touchback"
- "E[P] positive for >80% of field; mean +1.4 points/drive (p ≪ 0.01)"
- Fourth-down formulas: "E[P+] = 6·s_4conv^{γ(l)} (4)"; "E[P−] = 3·s_fg + (3·Δπ_fg + 6·Δπ_td) (5)"; "γ(l) = (100−l)/29 (avg drive 29 yards)"; "E[P] = E[P+] − E[P−]"
- Data scale: "1,870 fourth-down attempts" (2009–2015 seasons, nflgame API)

Also PAT-adjacent, since the brief treats it as the same rational-coaching test: "2-pt success 51% (235/460) → expected 1.02 pts vs XP 98.4% (8,425/8,561) → 0.984 pts"; "2015 XP move (15-yard line): XP success fell ~5% (p < 10⁻⁶); 2-pt success unchanged (p = 0.4)"; "Steelers attempted 11/45 TDs in 2015 (~25%)."

## B4 — "coach tendency shift after injuries" in the micro-edge ledger: specified or built?

**VERIFIED: specified, not built.** The ledger is explicitly "a 23-row candidate ledger of micro-edge hypotheses for the engine"; its Key metrics/methods section says "not specified (no formulas)". The row reads verbatim: '"coach tendency shift after injuries" → scheme tendency (test; falsify if post-injury tendency not stable)'. "test" is the decision, not a completion state — the brief counts it among "13 marked 'test'" and the ledger's own structure gives each candidate "a decision ... and an explicit falsification rule." Nothing in the brief states the row was executed or built. [INFERENCE]: the falsification rule ("falsify if post-injury tendency not stable") is the test criterion, not evidence of an existing build.

## B5 — How 0207's situational WP engine and the per-coach τ estimand compose

0207's recipe supplies the prescriptive engine — a shrunk situation-profile WP surface over (score, time, down, distance, field position, timeouts) that yields the risk-neutral optimal action (GO/FGA/PUNT or 2-pt/timeout) per state — while 1575's inverse-optimization estimand supplies the descriptive layer: per coach-team × field region × WP-bin τ̂ (median of optimal-τ sets from the Hamming-loss inverse problem min_{τ∈[0,1]} (1/N)Σ_j 1(a_j ≠ a*_j(σ_j, q^π̄_τ)), with 200 game-level bootstraps and 95% CIs), which predicts what the coach will actually do. Together the τ̂ layer lets the engine compute the coach-vs-WP-optimal gap in WP points for the "coach decision audit" lane and condition live drive-outcome probabilities on predicted coach behavior rather than assuming WP-maximization; [INFERENCE] composition is a brief-level design proposal — 1575's brief notes 2014–2022 data with τ explaining only ~5% of 4th-down points variance, so the layer needs a 2020–2025 refit before it carries weight.
