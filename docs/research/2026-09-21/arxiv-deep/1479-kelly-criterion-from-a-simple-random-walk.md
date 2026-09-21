# [1479] Kelly Criterion: From a Simple Random Walk to Lévy Processes (arXiv:2002.03448v1)

**Citation:** Sergey Lototsky, Austin Pollok (2020). *Kelly Criterion: From a Simple Random Walk to Lévy Processes*. arXiv:2002.03448v1 [math.PR]. URL: https://arxiv.org/abs/2002.03448
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf).
**Verdict:** ADAPT

## 1. Research question
Generalize the Kelly criterion — the fixed fraction maximizing long-term wealth growth, classically solved for simple Bernoulli bets — to (i) general return distributions, (ii) continuous-time compounding, and (iii) high-frequency limits where the return process becomes Lévy.

## 2. Dataset / schema
None — a pure theory paper (theorems + closed-form examples + one small numerical experiment). No data used.

## 3. Method / model
Rigorous stochastic-processes analysis: SLLN/CLT asymptotics for discrete compounding, semimartingale calculus (Doléans-Dade exponential) for continuous compounding, weak-convergence (predictable-characteristics) machinery for high-frequency limits, subordinator time changes for random business-time compounding.

## 4. Equations & assumptions
- Discrete wealth: Wₙ^f = Πₖ₌₁ⁿ (1 + f rₖ), f ∈ [0,1] (NS-NL: no shorting, no leverage). Long-term growth rate gᵣ(f) = E ln(1 + f r) (2.5).
- Admissibility: P(r ≥ −1)=1, P(r>0)>0, P(r<0)>0, E|ln(1+r)|<∞ (2.2)–(2.4).
- **Prop 2.1/Thm 2.1:** Wₙ^f = exp(n gᵣ(f)(1+εₙ)) a.s.; CLT refinement Wₙ^f = exp(n gᵣ(f) + √n σᵣ(f)ζₙ + ǫₙ), σᵣ²(f) = E[ln²(1+fr)] − gᵣ²(f).
- **Prop 2.2:** gᵣ is continuous, C∞ on (0,1), strictly concave: gᵣ′(f) = E[r/(1+fr)], gᵣ″(f) = −E[r²/(1+fr)²] < 0 (2.11).
- **Prop 2.3 (interior optimum):** unique f* ∈ (0,1) iff E[r] > 0 (edge) and lim_{f→1−} E[r/(1+fr)] < 0 (edge not too big).
- General Bernoulli (2.14): f* = p/a − (1−p)/b; example a=0.1, b=0.5, p=0.5 → f* = 4 (leverage optimal).
- Cauchy returns (2.15): gᵣ(f) = 2 ln(√f + √(1−f)) in closed form → f* = 1/2, gᵣ(f*) = ln 2.
- r = e^ξ − 1: edge conditions E e^ξ > 1 and E e^{−ξ} > 1 (2.17)–(2.18); normal ξ ⟺ |μ| < σ²/2 (2.19).
- **Continuous compounding (Thm 3.1):** dW^f = f W^f dR → Doléans-Dade exponential (3.6); a non-random non-trivial growth rate forces R to have independent increments (Lévy). g_R(f) = f μ̄ − f²σ²/2 + ∫ ln(1+fx) F^R(dx) (3.26); unique f* ∈ (0,1) under edge conditions.
- Continuous special case: g_R(f) = fμ − f²σ²/2, f* = μ/σ², max μ²/(2σ²) (3.12).
- **High-frequency limit (Thm 4.1):** r_{n,k} = μ/n + σ/√n ξ_{n,k} → wealth converges in law to geometric BM; optimal f* = μ/σ² (4.10), g(f*) = μ²/(2σ²) (4.11). High-freq Bernoulli: fₙ* = 2μ/(σ²−μ²/n) → μ/σ². Key remark: high-frequency betting can be MORE aggressive than low-frequency: f* ≈ (2p−1)/(4p(1−p)) > 2p−1.
- **Thm 4.2 (log-normal):** f* = b/σ² + 1/2 (4.16); numerics (σ=1, n=10) match (4.16) closely for b ∈ (−1/2, 1/2).
- **Thms 4.3–4.5:** Lévy return limit W^f (4.20), growth rate (4.27), unique optimizer.
- **Sec 5 (business time):** Thm 5.1 — random bet count via subordinator; α-stable time-change example: growth rate becomes random (t^{−1/α} scaling) yet still maximized by the deterministic f* = μ/σ².
- Conclusions: NS-NL can fail (short f*=2p−1 when p<1/2; f*>1 when edge huge); fractional Kelly endorsed ("a certain fraction of f* can be a smarter strategy", cf. Thorp); dynamic f(t) and bet portfolios left for future work.

## 5. Features / target
Not applicable (theory). Analog for GSE: features = engine win probability p̂ and market decimal odds; target = long-term log-wealth growth of the staking policy.

## 6. Validation design
Theorems with proofs; closed-form examples; one numerical check (log-normal, σ=1, n=10, b ∈ (−1/2,1/2)) confirming f*₁₀ ≈ b/σ² + 1/2.

## 7. Numerical results / baselines
- General Bernoulli a=0.1, b=0.5, p=0.5: f* = 4 exactly.
- Cauchy r=η²−1: f* = 1/2, gᵣ(f*) = ln 2 exactly.
- Log-normal numerics: f*₁₀ ≈ (4.16) across b ∈ (−1/2,1/2) (chart-level agreement, exact values not tabulated).
- High-freq Bernoulli: fₙ* → μ/σ² at rate O(1/n).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No data → no leakage. Limitations: iid/known-distribution returns assumed (GSE's p̂ is estimated, never known); NS-NL excludes leverage/shorts that the paper itself shows can be optimal; no portfolio-of-bets extension (flagged as future work); the "convergence of fₙ* to f*" for T=+∞ is explicitly not proven; transaction costs/vig not modeled.

## 10. GSE overlap
Sizing lane. Existing-research-map check: no prior ledger derives Kelly from Lévy/high-frequency limits; standard full/half-Kelly heuristics exist in GSE lore but this paper supplies the rigorous clamp conditions and closed forms. Distinct contribution: the interior-optimum edge conditions and the high-frequency convergence justify using the continuous formula on discrete daily bets.

## 11. GSE implementation spec
Kelly staking module `gse_kelly.py`:
1. Inputs per pick: engine win prob p̂, decimal odds d → b = d−1 (win payoff fraction), a = 1 (loss fraction); r = b w.p. p̂, −a w.p. 1−p̂.
2. Edge gate: E[r] = p̂b − (1−p̂)a > 0, else stake 0.
3. Full Kelly: f* = p̂/a − (1−p̂)/b (general-Bernoulli result (2.14)). Clamp to [0,1] (NS-NL); if f* > 1, log "leverage-optimal" flag and clamp.
4. Deploy fractional Kelly: f_deploy = κ·f*, κ = 0.25 default (0.5 aggressive), per the paper's fractional-Kelly endorsement.
5. Sanity gates from (2.19): for log-normal-style edge estimates, require |μ̂| < σ̂²/2 else force κ down.
6. Bankroll: stake = f_deploy × current bankroll, recomputed per slate.

## 12. Reproducible test
Unit test on the paper's closed forms: (i) a=0.1,b=0.5,p=0.5 → f*=4.0 (pre-clamp), (ii) Cauchy case → f*=0.5, g=ln2≈0.6931 via numerical integration of gᵣ(f)=2ln(√f+√(1−f)), (iii) log-normal b=0.1,σ=1 → f*=0.6. Then backtest on GSE's logged picks vs flat staking: compare terminal log-wealth and max drawdown over a season.

## 13. Acceptance / rejection gate
ADAPT bar: closed-form stakes must reproduce (i)–(iii) to 1e-6; backtest must show fractional-Kelly (κ=0.25) beats flat 1-unit staking on log-wealth with lower max drawdown on ≥1 full season of engine picks, else staking stays flat.

## 14. Improvement experiment
Extend to the paper's flagged future work: (a) vector Kelly for simultaneous correlated bets on a slate (f = (f₁,…,f_N)), solving max E ln(1 + fᵀr) with the engine's covariance estimate; (b) dynamic κ(t) that shrinks after drawdowns (drawdown-aware fractional Kelly); (c) fat-tail adjustment: replace Bernoulli with the Cauchy-style heavy-tail gᵣ for longshot markets where the paper shows the optimum shifts materially.
