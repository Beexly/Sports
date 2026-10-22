# DeepQB-style xComp / CPOE — reproduced, with a circularity warning

Replicated the DeepQB decision-efficiency decomposition on the BDB target rows (n=9,575 completed or
incomplete passes with a target). Logistic P(complete | separation at the pass, pass length, down,
distance, field position).

- holdout **AUC 0.7461**, Brier **0.1928** vs 0.2332 base (base completion rate 0.653)
- coefficients: separation **+0.290**, pass_length −0.049, down −0.110, ytg −0.011, yardline +0.005

Separation dominates by an order of magnitude, which is the expected result and also the catch: separation
is recorded *at the pass forward*, so xComp is conditioned on the receiver already being open. This is
outcome decomposition, not a pre-throw forecast. A model built only on pre-snap columns would score far
lower; a model using separation is not competing with pre-snap models, it is explaining the same event.

## CPOE by offence (n>=150 targets, 26 teams)
Top: SEA +0.059, LAR +0.043, SF +0.041, ARI +0.036. Bottom: CIN −0.049, CHI −0.055, NYJ −0.089.

sd of play-level CPOE is **0.433** on a mean of 0.000 — large, as expected for a binary outcome residual
on 9.5k plays. Team means of ±0.05 are well inside one SD of the play distribution and need hundreds of
targets each before they mean much (NYJ's −0.089 on 231 is the only one comfortably clear of noise).

## Caveats that limit how far this can be pushed
- `target` is itself an outcome (the QB chose him), so CPOE here is selection-conditional.
- Sacks are excluded (pass_result S), so pressure effects vanish — the very thing most worth measuring.
- `pass_length` is signed and negative on screens/behind-LOS throws, which the linear term treats as
  "shorter = easier" even when it is a failed screen.
- No air-yards, no coverage, no QB identity: this is the receiver/target decomposition, not the QB one.

## What is genuinely reusable
The xComp function itself, and the separation coefficient sign/magnitude as a sanity anchor (+0.29 log-odds
per yard of separation). Everything downstream needs pre-throw separation (NGS tracking) rather than the
at-the-pass field to become forecast-grade.
