# Deep Research brief audit — 2026-10-09

Research note. Not a pick. Not a production change.

## Reproduced here

Canonical intermediates, double precision, scale 173.7178:

- mu = 0, phi = 1.151292
- E = 0.639468, 0.431842, 0.302841
- v = 1.778977, delta = -0.483933, a = ln(0.06^2) = -5.626821
- Endpoint on the branch file remains 1464.05 / 151.52 / 0.059996. Paper 1464.06 is display rounding. Verdict correct-with-rounding stands.

Idle step, sigma fixed at 0.06, phi* = sqrt(phi^2+sigma^2) each idle period, start RD 200:

- 1 period: RD 200.27
- 4: 201.08
- 17: 204.57

Week-as-period with one game per team is sequential. That is the operational reading of the parallel-versus-sequential gap. Month-as-period is the open human choice. Season-as-period throws away order.

## Do not cite from the brief

- Solver table: all four methods "converge in 2 iterations" on the canonical vector. The root is already at a. That row cannot show the Newton failure the prose describes.
- Illinois infinite loop. Branch loop caps at 100. Exact-zero return is a hardening, not a hang we hit.
- `python3 -c "from data.analyze_glicko_period import run_period_study"`. That module is not in the branch.
- Ledger count 2044, REJECT/ADAPT split, and port refs 0329 / 0668 / 1168 / 1750 / 2044. Not counted here. Earlier file-hit count was not a paper count.
- WIRE / REJECT paper table. Real citations, assigned verdicts. Not run here. Do not treat a WIRE as wired.
- "Production must check abs(f_c)<1e-12". This file is research. Production scoring was not edited.

## Keep as open

- No idle helper in glicko2.py.
- No draw score.
- tau = 0.5 is the example constant, not a fit. 17 binary games will not identify it.
- ci() in the v7 delivery still divides by sqrt(n). ci_fix.py is the replacement.
- Part 5 sigma [13.34, 13.37] and the +1.74 average-miss sentence stay retired.
- EPL showdown and wind OLS not re-run here.
- No-market backtest 55.8%. Close is the bar. Not a 100% engine.
