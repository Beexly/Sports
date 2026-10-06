# qb — quarterback / efficiency / luck-layer modeling

Implements the c10 research QB-adjacent stack (buildable-systems.md SYS-09,
SYS-23, SYS-24; syntheses.md Pipeline 6).

| File | Implements |
|---|---|
| `rgax.py` | rGAX residualization (1143): rMetric = metric − E[metric|model], cross-fit, multiplicity-corrected CIs (Holm/BH/BY); contamination audit (0424) — value is uncertainty, not re-ranking (corr ≈ 1 with raw) |
| `props.py` | INT prop pricing (kicker-defense-props): E[INT] = INT_rate × attempts × completion_rate (Allen 3.66%×27.0×52.3%≈0.5); HARD VETO: individual sack props raise (pressure→sack R²<0.005); team sacks from forced-rates only |
| `luck.py` | Edge-sheet luck layer: fair_margin = (home_netEPA − away_netEPA)×63 + 2.0; fumble recovery = pure noise (YoY ~0.00); ~4.5 pts/turnover; neutral-band publish gate (|actual−expected|<1.5) |
| `blend.py` | Efficiency blend weights (week3-engine-readings, BRIEF-SOURCED): 55% pass EPA residual / 15% rush EPA residual / 15% CPOE / 10% explosive-pass / 5% INT luck; dark families contribute zero |
| `common.py` | Shared seeds, paper reference numbers, Holm/BH/BY implementations |

**Gates:** rGAX robustness slope ≥ 0.90 with cross-fit + volume-stratified
shrinkage; INT projection ≈ 0.5 (±0.1); sack veto raises; luck-layer constants;
blend weights sum to 1.0 exactly.

**Honesty notes (in docstrings, not hidden):** DGP residualized slope ≈1.00 vs
paper's 0.936 (linear restriction bias fully absorbed; real-world
nonlinearities explain the gap); Goff 0.3 is one-decimal rounding of 0.2576;
team-sack forced-rate defaults are illustrative placeholders; blend weights are
brief-sourced, not peer-reviewed.
