# Route YOE is mostly route×coverage interaction — with a shrinkage caveat

I said a per-route coverage assignment would test the previous finding harder. Did it: route×coverage
interactions (80 dummies) in the expectation model, then route residuals before/after.

## In-sample (tautological, stated for completeness)
Dummies containing the route itself absorb every route mean by construction — residuals go to ~0 (−99 to
−100% for most routes). Useful only as a ceiling.

## Holdout (route residuals evaluated on unseen 30%)
| route | n | base YOE | +interactions |
|---|---|---|---|
| SCREEN | 217 | 2.710 | 0.341 |
| CROSS | 300 | 1.713 | 0.044 |
| GO | 112 | 1.380 | 0.329 |
| SLANT | 141 | 1.236 | **0.965** |
| POST | 84 | 1.166 | −0.165 |
| FLAT | 153 | 1.085 | 0.689 |
| CORNER | 56 | 0.330 | **0.979** |
| IN | 124 | −1.162 | −0.193 |
| HITCH | 350 | −2.112 | −0.327 |
| OUT | 258 | −2.229 | −0.157 |

Shrinkage runs 82–100%. Ordering survives only partially (corr 0.507).

## Read
The honest version of the earlier claim: **most route YOE is the interaction between the route and the
specific coverage it met**, not route design in the abstract. A screen against off-coverage and a screen
against press are different throws; averaging over coverage produced the 2.4-yard figure, and once the
matchup is conditioned on, 0.34 yards remains.

The routes that keep the most independent signal are SLANT (+0.97), CORNER (+0.98) and FLAT (+0.69) —
and those are exactly the routes whose payoff depends on the defender's leverage rather than on the route
shape, so the finding is coherent: leverage-specific routes retain value once coverage is fixed.

## The caveat that must travel with it
Holdout residuals collapse toward zero partly from **shrinkage, not just absorption** — Ridge on 80 sparse
dummies over-regularises, and thin cells (CORNER 56, POST 84) are hit hardest. So 82–100% is an upper
bound on how much coverage explains, and the residual sizes are a lower bound on what remains. A proper
test needs more data per cell or a hierarchical/partial-pooling model.
