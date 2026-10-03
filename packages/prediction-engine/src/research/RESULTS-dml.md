# R-10 RESULTS — DML QB-out/limited prototype (shadow)

Status: **shadow / priced:false**. Not a pick input. Not a public claim.

## What ran

- Treatment: starting-QB out OR limited (binary).
- Outcome: win indicator.
- Controls: team-strength mean/variance, rest, travel, opponent strength
  (the filter's posterior slots; here filled by the synthetic panel).
- Nuisances: L2-logistic Newton (XGBoost-equivalent without a new package;
  AGENTS.md forbids installing).
- Cross-fitting: 5 time-ordered folds; fold k trains only on folds 0..k-1
  (no future rows in nuisance training).
- Diagnostics: overlap trim at [0.05, 0.95], placebo (treatment shuffled
  within week), sensitivity envelope Γ=2.

## Data

No nflverse injury dump is in this workspace. The prototype runs on a
**seeded synthetic panel** (`dml-panel.ts`) with the same field contract
a future nflverse loader would fill. It is not the odds archive and not
a real NFL season. Swapping the generator for a loader is a follow-up.

## Observed (seed 11, `diagnoseQbOut(generateDmlPanel(11))`)

| quantity | value |
|---|---|
| n scored | 230 |
| n treated | 34 |
| n trimmed | 26 |
| ATT (win-prob) | **-0.0111** |
| SE | 0.1242 |
| 95% CI | [-0.2545, 0.2324] |
| implied logit shift | -0.0443 |
| filter `interventionGain` | 1 (default in team-strength-filter.ts) |
| placebo ATT | -0.1548 |
| placebo 95% CI | [-0.3667, 0.0570] (contains 0) |
| sensitivity Γ=2 interval | [-0.4980, 0.4759] |

The filter does **not** ship a canonical QB-out `TeamIntervention.delta`.
Callers pass a delta; gain defaults to 1. The comparable number is the
implied logit shift above, not a published injury magnitude.

Planted ATT on this panel was -0.08 win-prob. The recovered ATT is the
right sign and much smaller, with a CI that includes zero — underpowered
logistic nuisances on a small panel, reported as observed, not tuned.

## SUTVA

SUTVA is violated in sports: one team's QB-out changes the opponent's
game script, so units interfere. The ATT is a statistical association
under this design, not a ceteris-paribus causal effect.

## What this does not claim

Nothing here is a public estimate of NFL QB-out impact. Nothing is wired
to publish, price, or a pick path.
