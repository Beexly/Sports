# [1159] Effects of Social Influence on the Wisdom of Crowds (arXiv:1204.3463)

**Citation:** Pavlin Mavrodiev, Claudio J. Tessone, Frank Schweitzer (2012). *Effects of Social Influence on the Wisdom of Crowds*. arXiv:1204.3463v1 [cs.SI], ETH Zurich (Collective Intelligence 2012 proceedings). URL: https://arxiv.org/abs/1204.3463
**Ledger completed:** 2026-09-21. **Read:** full paper (no appendices).
**Verdict:** ADAPT
As a design doctrine for GSE's forecast ensemble, not as a prediction method: keep sub-model opinions *independent* (correlation = social influence, which kills diversity without improving error), aggregate skewed quantities on the log scale, and monitor the diversity of component forecasts. Directly warns against letting all sub-models herd to market consensus.

## 1. Research question
Is social influence (learning others' opinions) unconditionally good or bad for the wisdom of crowds? Using an agent-based model calibrated to Lorenz et al. (2011), the authors show the question is ill-defined — the *initial configuration* of the population (its diversity and accuracy) determines the net effect.

## 2. Dataset / schema
Reproduces the Lorenz et al. (2011) PNAS experiment: 144 ETH Zurich students in 12 sessions × 12 participants; 6 quantitative questions (geographical facts, crime statistics) × 5 rounds; three information regimes (no info / aggregate mean shown / full opinion info); individual rewards for answers within 10/20/40% of truth; correct answers disclosed only at the end. Simulations: N=100 agents, T=3000 steps, log-normal initial opinions (μ₁=−3, μ₂=−2.9, σ²=0.729), Δt=0.01, D=10⁻³.

## 3. Method / model
Agents as Brownian particles with mean-field coupling (eq. 3):
**dx_i(t)/dt = α_i(⟨x(t)⟩ − x_i(t)) + β_i(x_i(0) − x_i(t)) + Dξ_i(t)**
— social influence α (coupling to the group mean), individual conviction β (pull back to initial opinion), internal noise D. No-information regime (α=0) is an Ornstein–Uhlenbeck process; aggregate regime yields an OU process for the population mean (eq. 5). Parameter sweeps over the {α, β} space.

## 4. Equations & assumptions
- Collective error: **E(t) = (ln T − ⟨ln x(t)⟩)²** (eq. 1) — squared deviation of the log-mean from the log truth.
- Group diversity: **D(t) = (1/N)Σ(ln x_i(t) − ⟨ln x(t)⟩)²** (eq. 2) — variance of log opinions.
- Wisdom-of-crowds indicator: W(t) = max{i : x̂_i(t) ≤ T ≤ x̂_{N−i+1}(t)} — how central the truth is in the opinion distribution (max N/2, min 0).
- Key mechanism: coupling to the *arithmetic* mean while the truth-centre is the *geometric* mean — since AM > GM for log-normal opinions, the geometric mean strictly increases under coupling (Figure 5), dragging the crowd rightward regardless of truth.
- **Assumptions:** no feedback between an agent's opinion and its distance from the truth (agents can't learn where truth is); no learning/external information; truth enters only via the distribution of initial guesses.

## 5. Features / target
Not applicable — agent opinions over rounds; "features" are the {α, β} parameters and initial configuration {E(0), D(0)}; target = long-run crowd accuracy.

## 6. Validation design
Model validated by reproducing Lorenz et al.'s three empirical effects (social-influence effect, range-reduction effect, self-confidence effect) in the no- and aggregate-information regimes. Then a parameter sweep asks: under which initial configurations does social influence help vs hurt?

## 7. Numerical results / baselines
- **Aggregation metric matters:** arithmetic mean beat individuals' first estimates in only 21.3% of cases; the geometric mean (log-transformed opinions) did so in **77.1%** — the opinion distributions were heavily right-skewed/log-normal-like.
- **Lorenz's three effects reproduced:** (1) social influence converges opinions without improving collective error; (2) range reduction: truth drifts to the periphery while the distribution narrows around a wrong value; (3) self-confidence: individuals grow more confident as the group drifts from truth.
- **Main result (Figure 4):** for an initially inaccurate crowd (E(0)=0.8), stronger social influence *reduces* long-run collective error across nearly the whole {α,β} range; for initially accurate crowds (E(0)=0.01–0.02), social influence *increases* error — trace amounts reproduce Lorenz's deterioration. Individual conviction β is harmful in the first case and beneficial in the others.
- **W indicator (Figure 6):** same ambiguity — moderate social influence can push W to its maximum (N/2) from a favourable start, or collapse it from an unfavourable one.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Qualitative reproduction of Lorenz et al., not a statistical fit; full-information regime not modelled.
- No feedback/learning about the truth — real forecasting has score feedback, which changes the dynamics entirely.
- Only 6 questions / 144 subjects in the underlying experiment; log-normality and the geometric-mean mechanism are specific to the estimation-task setting.
- Wisdom-of-crowds (a state) vs collective intelligence (a mechanism) are carefully distinguished — the paper studies the former under influence.

## 10. GSE overlap
New doctrine for the **forecast-aggregation lane** (pairs with 1160/1161, robust forecast aggregation). GSE's engine is itself a crowd of sub-models plus market data. The paper's lesson: an ensemble's accuracy comes from *independent, diverse* errors cancelling out — any shared input (same market consensus, same data vendor, same calibration target) acts as social influence: it collapses diversity (component forecasts agree, confidence looks high) without reducing error. That is exactly the "self-confidence effect" — agreement ≠ accuracy.

## 11. GSE implementation spec
1. **Independence audit of the ensemble:** list every shared input across GSE sub-models (market lines, nflverse features, weather feeds, calibration sets). Anything shared by ≥2 components is a coupling channel; diversify or explicitly down-weight.
2. **Log-scale aggregation for skewed quantities:** where component forecasts are right-skewed (totals, yards, probabilities near 0), aggregate on the log scale (geometric mean) per the 77.1% vs 21.3% finding — test vs arithmetic mean on backtests.
3. **Diversity monitor:** track D(t) (eq. 2) across component forecasts per slate; if component forecasts collapse toward each other while the aggregate's backtested error doesn't fall, flag herding and widen the ensemble's inputs.
4. **Consensus-skepticism rule:** when public/betting consensus is strong (high social influence in the market), require *independent* (non-market) evidence before following it — accurate-start crowds are the ones social influence corrupts.
5. **Effort:** ~2 days (audit + monitor), reusing existing backtest harness.

## 12. Reproducible test
Dataset: historical GSE component forecasts + market consensus per game. Construct two aggregates: (a) current (correlated) ensemble, (b) independence-enforced ensemble (components blinded to shared market inputs). Metric: backtested Brier/log-loss plus component diversity D(t). Success = (b) matches or beats (a) on error while maintaining higher diversity; and geometric-mean aggregation beats arithmetic on skewed-quantity props.

## 13. Acceptance / rejection gate
ADOPT the independence doctrine as a standing ensemble-design rule (cheap, directionally supported). ADAPT the geometric-mean aggregation only if it wins on backtested log-loss for skewed quantities. REJECT applying the dynamical predictions (drift directions) to GSE — they depend on the no-feedback assumption, which live betting markets violate. REJECT any reading that "consensus is always wrong" — the result is explicitly configuration-dependent.

## 14. Improvement experiment
Introduce **feedback** into the model (the paper's stated open direction): agents observe a noisy score of their past accuracy. Simulate whether score-feedback reverses the harmful regime (accurate-start crowds under influence). For GSE: run the independence-enforced vs correlated ensemble *live* on paper-traded slates for a month and compare realized calibration — the paper predicts the correlated ensemble will look more confident (narrower spread) at equal or worse error, i.e., worse calibration. Confirm or kill the doctrine on real numbers.
