# Week 9 Bitemporal GPP Portfolio Report & `DKSalaries.csv` Slate Identity Audit (2026-11-03)

**Modules Executed:**
- `scripts/ops/build_week9_tuesday_sealed_baseline.py` (`data/engine/week9_tuesday_0400ct_sealed_baseline_2026.json`, SHA-256 `a98e9178c6202bf6...`)
- `scripts/ops/dfs_stochastic_milp_optimizer.py` (`verify_dk_salaries_slate_identity`, `GSEFullSlateSimulator`, `simulate_dirichlet_multinomial_field`, `optimize_dfs_portfolio`, `select_submodular_marginal_win_portfolio`)

---

## 1. `DKSalaries.csv` Slate Identity Audit (Trap 3 Guard)

Before running the portfolio optimizer on `C:\Users\Garrett\Downloads\DKSalaries.csv` (`674` rows), `verify_dk_salaries_slate_identity()` parsed the `Game Info` column and confirmed:
- **Detected NFL Week:** **Week 8 (`11/01/2026 - 11/02/2026`, 13 games)** (`MIN@DET 11/01/2026`, `CHI@SEA 11/02/2026`, `BAL@BUF 11/01/2026`, `ARI@DAL 11/01/2026`, etc.)
- **Classification:** `is_week8_retrospective_file: True`, `is_week9_live_file: False`
- **Action Taken:** Prevented mislabeling a Week 8 DraftKings salary export as a live Week 9 contest pool. In the Week 8 retrospective audit, enforcing Empirical Bayes target-share shrinkage, `49,200+` salary floors, and dynamic fragile-chalk exposure caps (`10%` max on fragile chalk such as Week 8 Zay Flowers `$7,200` and Broncos DST) eliminates the ~124-pt Week 8 MME chalk collapse and the `$17,000+` unspent Showdown salary bug.

---

## 2. Sealed Week 9 Tuesday 04:00 CT Pre-Market Baseline (`SEA vs. ARI` & Trench Priors)

- **Marvin Harrison Jr. (`ARI WR1`, `88%` Route Share) Lockout Resolved:**
  - Restored from the erroneous `0.0%` target-share override to his Empirical Bayes shrunk prior **`0.215` (`21.5%` target share, `7.31` conserved targets on a 34-target ARI cap)** via `optimize_bayesian_asymmetric_loss_action`.
- **Dirichlet-Conserved ARI Pass-Catcher Volume (`34.0` Team Targets):**
  - `Trey McBride (TE)`: `29.4%` (`9.996` targets)
  - `Marvin Harrison Jr. (WR1)`: `21.5%` (`7.310` targets)
  - `Michael Wilson (WR2)`: `18.1%` (`6.154` targets)
  - `Reggie Virgil (WR3)`: `11.2%` (`3.808` targets — flagged by `recommend_scrimmage_over_receiving_prop` for behind-LOS screen hazard)
  - `Simi Fehoko (WR4)`: `8.0%` (`2.720` targets)
  - `ARI_RBs_Other`: `11.8%` (`4.012` targets)
  - `Kendrick Bourne`: `0.0%` (`HARD_LOCKOUT_OUT`, `0%` route participation)

---

## 3. Week 9 Bitemporal 10,000-World GPP Portfolio (`HiGHS` McCormick MILP + Submodular Tail Selector)

Simulated `10,000` joint slate worlds via `GSEFullSlateSimulator` (Student-$t$ copula $\nu = 5$, Negative Binomial TDs, Gamma yardage, and DraftKings $+3.0$ milestone cliffs at $300\text{ pass} / 100\text{ rush} / 100\text{ rec yds}$) against `500` Dirichlet-Multinomial field lineups (`precision_s = 45.0`):

| Lineup # | Salary Used | Base Proj | McCormick Covariance Objective | Submodular Selection Order | Roster (`QB / RB1 / RB2 / WR1 / WR2 / WR3 / TE / FLEX / DST`) |
|---:|---:|---:|---:|---:|---|
| **1** | **$50,000** | 132.70 | **141.65** | **#1 (`+2.21%` tail win)** | `Sam Darnold`, `Derrick Henry`, `Emanuel Wilson`, `Jaxon Smith-Njigba`, `Cooper Kupp`, `Michael Wilson`, `AJ Barner`, `Trey McBride`, `Ravens DST` |
| **2** | **$49,900** | 132.80 | **139.55** | **#4 (`+0.27%` tail win)** | `Sam Darnold`, `Derrick Henry`, `Emanuel Wilson`, `Jaxon Smith-Njigba`, `Cooper Kupp`, `Courtland Sutton`, `Mark Andrews`, `AJ Barner`, `Seahawks DST` |
| **3** | **$49,900** | 131.60 | **139.45** | **#2 (`+1.61%` tail win)** | `Lamar Jackson`, `Derrick Henry`, `Emanuel Wilson`, `Zay Flowers`, `Rashod Bateman`, `Courtland Sutton`, `Mark Andrews`, `AJ Barner`, `Seahawks DST` |
| **4** | **$50,000** | 130.80 | **138.65** | **#3 (`+0.98%` tail win)** | `Kyler Murray`, `Emanuel Wilson`, `James Conner`, `Jaxon Smith-Njigba`, `Marvin Harrison Jr.`, `Michael Wilson`, `Rashod Bateman`, `Trey McBride`, `Ravens DST` |
| **5** | **$49,900** | 132.50 | **138.10** | — | `Sam Darnold`, `Emanuel Wilson`, `James Conner`, `Jaxon Smith-Njigba`, `Cooper Kupp`, `Rashod Bateman`, `Mark Andrews`, `Trey McBride`, `Ravens DST` |
| **6** | **$49,600** | 130.60 | **137.35** | **#5 (`+0.24%` tail win)** | `Lamar Jackson`, `Emanuel Wilson`, `James Conner`, `Zay Flowers`, `Rashod Bateman`, `Jaxon Smith-Njigba`, `Mark Andrews`, `AJ Barner`, `Ravens DST` |

- **Submodular Portfolio Tail-Win Summary (`winning_threshold = 165.0` pts):**
  - Selected Portfolio Indices: `[0, 2, 3, 1, 5]` (Lineups 1, 3, 4, 2, 6)
  - Cumulative Top-Tail Win Probability: **`5.31%`** (`[+2.21%, +1.61%, +0.98%, +0.27%, +0.24%]` marginal gains; Nemhauser-Wolsey $1 - 1/e \approx 63.21\%$ optimality guarantee).
