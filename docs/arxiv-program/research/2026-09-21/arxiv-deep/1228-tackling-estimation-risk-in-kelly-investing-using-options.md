# Deep-Research Ledger 1228 — arXiv:2508.18868v2 (q-fin.MF, 3 Nov 2025)

**Title:** Tackling estimation risk in Kelly investing using options
**Authors:** Fabrizio Lillo, Piero Mazzarisi, Ioanna-Yvonni Tsaknaki
**Version read:** v2 (3 Nov 2025). Full read verified on 2026-09-21: abstract, Sections 1–5 (binomial Kelly model, constrained fraction, KO option strategy, misspecification analysis, KOc convex mixture, simulations, conclusion), Appendix A (proofs A.1–A.4, incl. Theorem 4.1 and Proposition 4.1 proofs), references (Breiman 1961, Kelly 1956, Thorp, MacLean/Ziemba, etc.). Text source: `2508.18868.pdf` → `pdftotext -layout` (7,477 words).

## 1. Question asked

Can options be used to hedge the *estimation risk* (misspecified u, d, p) in Kelly investing — i.e., does adding a European put to the Kelly portfolio protect growth when the parameters used ex-ante differ from the true ones?

## 2. Dataset / schema

No real data. All results are closed-form in a binomial stock/bond market plus Monte Carlo: **N = 500 simulations** over n trading periods (n = 5 and n = 300 in Figure 5; multiple n in Figure 6). Typical parameters: u = 2, d = 1/u, p = 0.5, R = 1.05, S₀ = 100, K₀ = 110, (c₁,c₂) = (0, 0.9), dm = 1/um (misspecified down-move), mixing a = 1/2 (Fig. 5) and a ∈ {0.9, 0.1} (Fig. 6).

## 3. Method

1. **Binomial Kelly (Sec. 2):** one-period stock (uS₀/dS₀ with prob. p/1−p) + bond (gross R); Kelly fraction maximizes G(f;Φ) (Eq. 5); Proposition 2.1 gives the constrained optimum f⋆ ∈ [0,1].
2. **KO strategy (Sec. 3):** add a one-period European put (strike K₀, arbitrage-free price); optimize jointly over stock fraction g and option position c (Eq. 11); optimal state payoffs π_{g⋆,c}(X).
3. **Misspecification (Sec. 4):** portfolio built with believed (um, dm, pm), evaluated under true (u, d, p); compare growth rates of standard Kelly (KS), Kelly-with-options (KO₁, KO₂ at strikes/parameter pairs (c₁,c₂)), and the convex mixture **KOc**: W_n^{KOc} = a·W_n^{(1)} + (1−a)·W_n^{(2)} (Eq. 16), mixing two KO strategies built under different beliefs.
4. **Theorem 4.1:** the mixture's asymptotic growth equals the *max* of its components' growth rates (Eq. 17, proved via squeeze theorem, Eq. 28); asymptotically independent of the choice of a (confirmed numerically in Figure 6 panels (d),(h) vs (a),(e)).

## 4. Equations / assumptions

- Kelly objective G(f;Φ) (Eq. 5); constrained f⋆ ∈ [0,1] (Prop. 2.1).
- KOc wealth: W_n^{KOc} = aW_n^{(1)} + (1−a)W_n^{(2)} (16).
- Theorem 4.1: lim_{n→∞} (1/n)log(W_n^{KOc}/W₀) = max{E[log π_{g₁⋆,c₁}(X)], E[log π_{g₂⋆,c₂}(X)}] a.s. (17).
- Positivity intervals I_c^g = (c_u(g), c_d(g)) with c_u(g) < c_d(g) (Lemma A.4) keep π_{g,c}(X) > 0 a.s.
- **Assumptions:** one-period binomial market, K₀ ∈ (dS₀, uS₀), option priced arbitrage-free, no-arbitrage d < R < u; i.i.d. Bernoulli price moves; estimation risk modeled as fixed (not time-varying) parameter misspecification.

## 5. Features / target

Features = believed market parameters (um, dm, pm) and option contract terms (K₀, c). Target = the Kelly-optimal (g, c) pair maximizing asymptotic log-growth; under misspecification, the target becomes the max-growth convex mixture of candidate KO strategies.

## 6. Validation

- **Correct specification:** Prop. 3.1/3.2 — the optimal KS *replicates* the optimal KO for any c; the two growth-rate surfaces "coincide at their maximum"; the optimal KO growth rate does not depend on the strike (Fig. 3). Options add nothing when parameters are right — by no-arbitrage.
- **Misspecification (Figs. 4–6):** neither KO nor KS dominates globally across the um range; KOc at n = 300 converges to the better of its two components across the illustrated misspecification range; at n = 5 KOc does *not* outperform KO₁/KO₂ anywhere — the guarantee is purely asymptotic.
- **Headline claim (p. 14):** "the asymptotic growth rate of the KOc portfolio is always larger than (or equal to, when u = um) the one achieved by the KS strategy, showing that the estimation risk has been fully eliminated."

## 7. Exact results

- Theorem 4.1 (Eq. 17) as above; KOc asymptotically a-independent.
- Finite-horizon: n=5 → KOc never best; n=300 → KOc tracks the best component (Fig. 5 left vs right).
- Fig. 6: results hold for a = 0.9 and a = 0.1 (top/bottom panels), multiple n.
- All simulation claims at u=2, d=1/u, p=0.5, R=1.05, S₀=100, K₀=110, (c₁,c₂)=(0,0.9), N=500.

## 8. Code / data availability

None. No code URL, no dataset. The model is simple enough to re-implement from the equations; simulation parameters are fully specified.

## 9. Leakage / limitations

- **Sportsbooks don't sell options on picks.** The entire hedging mechanism has no direct sports analogue — the paper's instrument doesn't exist in GSE's market. This is the binding limitation.
- Highly stylized: one-period binomial, fixed misspecification, no transaction costs, no bid-ask on the option.
- KOc's dominance is asymptotic (n → ∞); at n = 5 it fails everywhere. Sports seasons are finite (17 NFL games).
- Under correct parameters the options machinery is provably useless (Props. 3.1–3.2) — the paper's own no-arbitrage argument.
- Misspecification is modeled as a *fixed* wrong parameter, not the drifting/noisy estimation error of a real forecasting pipeline.

## 10. GSE overlap

Estimation-risk theme shared with the sizing lane:

- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — estimation error across staking strategies; KOc is a model-averaging answer to the same problem.
- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — Kelly failure taxonomy; misspecification is a first-class failure mode there.
- Wave-3: 1224/2201.03387v2 (Laplace learning penalty — same estimation-risk enemy, different weapon), 1223/2112.14451 (risk-controlled growth), 1226/2504.20877 (risk-sensitive mixtures).
- The *transferable* idea is not options but the **convex mixture of candidate strategies**: under model uncertainty, a fixed mixture of Kelly strategies built under different beliefs asymptotically matches the best belief — a no-regret-style guarantee.

## 11. Implementation spec (GSE)

**Belief-mixture Kelly (options-free port of KOc).** Since options don't exist on sports picks, port the KOc *structure*:
1. Maintain 2–3 GSE model-belief variants (e.g., base v5.2.7, a conservative shrunk-edge variant, an aggressive variant) — the analogues of (c₁,c₂).
2. Size each slate's stakes as a fixed convex mixture: stake = a·f^(1) + (1−a)·f^(2) with a = 1/2 (paper: asymptotic performance is a-independent, so don't over-tune a).
3. Log each belief's standalone bankroll alongside the mixture to verify the Theorem-4.1-style property empirically: the mixture should track the better belief over a season.
4. Hard constraint from §9: evaluate at season length (finite n), not asymptotically — require the mixture to beat each standalone belief on walk-forward seasons before deploying.

## 12. Reproducible test

Implement the binomial model (u=2, d=1/2, p=0.5, R=1.05, S₀=100, K₀=110), KO₁/KO₂ with (c₁,c₂)=(0,0.9), KOc with a=1/2, misspecified um grid as in Fig. 4; simulate N=500 runs at n=300; verify KOc's mean growth rate ≥ max(KO₁, KO₂, KS) growth at every um (the paper's "estimation risk fully eliminated" claim).

## 13. Numeric gate

At n=300, across the paper's um misspecification grid, KOc's average per-period log-growth must be ≥ the best of {KS, KO₁, KO₂} at every grid point, within Monte Carlo error (N=500, ±2 standard errors).

## 14. Improvement experiment

Walk-forward on GSE picks (Neon `picks`, v5.2.7): compare (a) single-belief quarter-Kelly vs (b) the §11 belief-mixture stake. Score realized log-wealth and max drawdown per season. Expectation from Theorem 4.1: (b) should match-or-beat the better belief component — if it instead underperforms at finite season length (as Fig. 5's n=5 panel warns), the mixture idea is rejected for GSE's horizon.

**Verdict:** ADAPT
