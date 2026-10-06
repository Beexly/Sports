# ratings — team-strength and margin ratings

Implements the c10 research ratings stack (buildable-systems.md SYS-01, SYS-02,
SYS-10, SYS-26; syntheses.md Pipeline 2).

| File | Implements |
|---|---|
| `gelo.py` | G-Elo margin-of-victory rating (1448): η=(1/2)log10(f_J/f_0), α_h, δ from category frequencies (Eqs. 43–46); strict season-blocked train/test; accuracy gain decomposed into draw-modeling vs skill-estimation; re-scored under the ignorance rule (1083) |
| `plusdc.py` | PlusDC-BT (0213): P(home i beats j)=σ(u_i−u_j+x_ijᵀv), Σu_i=0, ridge-regularized MLE; Newman async FPI, EM-MAP, RankCentrality (weeks-1–4 fallback, honestly evaluated — not adopted), Elo baseline; rolling walk-forward machinery |
| `qb_decomp.py` | INFERENCE extension: u_i = τ_team + q_QB(i) — QB changes move the rating without refitting |
| `relativize.py` | 0049 rule: relative (difference/ratio) form tested against the TWO-feature absolute form (never the straw-man single absolute); honest +5%-scale deltas |
| `_dgp.py` | Seeded synthetic NFL DGP (32 teams, weekly skill drift, HFA/rest/travel/QB-out covariates, heavy-tail t margins) — NOT real data |

**Gates (tests/e2e/test_research_gates_e2e.py):** G-Elo ΔLS ≥ 0.005 and accuracy
+1pp (2019–2023); covariate-BT beats plain BT + Elo on 2022–2024 rolling
log-loss by ≥ 0.003; BT production algos ≥2% walk-forward Brier improvement;
relativized audit keeps only features with ΔAUC ≥ 0.01.

**Negative gates:** `xfp_fpoe_wired()` → False (Δrho=−0.0165 holdout failure);
no draw modeling without decomposition; the +21.3% straw-man appears nowhere.

**Honesty:** all backtests run on the seeded synthetic DGP with paper-reported
effect sizes; every result dict labels its data basis. First implementation
run = validation.
