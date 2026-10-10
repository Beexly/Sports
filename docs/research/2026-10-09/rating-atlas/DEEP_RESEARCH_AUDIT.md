# Deep Research brief audit — against the verified packet state

Research note. Not a pick. Not a production change. This audits the Deep
Research Glicko material's claims against what this branch verified.

## What the Deep Research material gets right

- Idle step. A zero-game player keeps rating and sigma; RD grows by process
  noise only: phi* = sqrt(phi^2 + sigma^2), RD' = phi* * 173.7178. No
  volatility solve, no v, no delta. From 1500 / 200 / 0.06: one idle period
  is RD 200.27, four 201.08, seventeen 204.57. Now wired into glicko2.py
  (glicko2_idle + period_with_byes) and asserted in the self-check.
- Tau 0.5 is the volatility prior tightness, not a learning rate and not an
  idle input. It is the Glickman canonical value. On the three-game canonical
  example it yields sigma' 0.059996 with first chord -5.626955.
- Glicko-2 is period-parallel. Canonical 1464.05 / 151.52 / 0.059996 against
  the paper's 1464.06 — match to rounding, not exact. Sequential is not the
  published update.
- Illinois is the volatility solver. Plain false position sticks at the right
  endpoint (x^3 - 2x - 5 stuck at 3.0); Illinois converges to 2.094551.
- Posterior intervals are 2.5/97.5 of the draws. Draws interval about 0.98 to
  2.16, point estimate about 1.58. Ladder sd stays 13.45.
- There is no 100% engine. No-market 2025 weeks 1-6 was 55.8%, Brier 0.2868,
  0.2464 after T = 7.512.

## What the Deep Research material got wrong (killed claims)

- "Glicko EXACT" — wrong. The canonical matches to rounding, not exact.
- Sequential sigma exploding to 2 — wrong as a formula claim. With the update
  written correctly, sequential sigma stays near 0.06 (12 wins vs 1900 RD 30:
  sequential 2143.1, sigma 0.06). The sequential rating is still wrong because
  intermediate RD shrinkage is not part of the Glickman period definition.
- Teaser ticket at -155 or -127 — wrong. 46.8% is +114. Plus money.
- Shin falling back to multiplicative — wrong. Closed-form Shin works:
  -110/-110 recovers z = 0.0476, fair 0.50/0.50.
- Mean-CI as a posterior ([1.54, 1.59] home field, [13.34, 13.37] sigma) —
  retired. Print draw percentiles.
- +1.74 as a total addend — wrong. It is the weather-OLS prediction at 0 mph.
- RDS-only — not the verified engine.
- The live x-ray printing Shin z=0.0% with probabilities that do not sum to 1
  is a broken path or display bug, not the verified engine.

## Ledger IDs — do not wire

0329, 0668, 1168, 1750, 2044 are swapped in the Deep Research brief. Do not
wire those five ports under those IDs. 0329 is rugby EP. 0668 is NFL DPI,
REJECT. 1168 is wisdom-of-crowds. 1750 is Cherny-Obloj. 2044 is QuantFactor
REINFORCE. Reopen only after a human reads the PDF.
