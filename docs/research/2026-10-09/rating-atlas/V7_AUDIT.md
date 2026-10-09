# v7 delivery audit — 2026-10-09 13:36 CT

Source: attached FULL_STACK_DELIVERY.md, 277,220 bytes, compiled 12:45. Research note. Not a production change. `main` was not edited.

The completeness note says four gaps closed and the failure modes cannot recur. The file does not say that consistently.

## Fixed in this paste

- LOOP6_DELTA: HFA draws mean 1.56, sd 0.30, 95% interval [1.01, 2.18]. The [1.54, 1.59] print is labeled as the CI of the posterior mean.
- File mean of actual minus close rewritten to +0.553 on the game_id join (n = 3,368). Cold 32–39°F band +1.771 (n = 210) is its own row. Earlier file mean +0.67 was n = 3,471. Different join, both stay labeled.
- `team_total_dist` now returns `(T − S) / 2`, `(T + S) / 2`. Listed −3 on 48.5 is home 25.75, away 22.75.

## Still in the same file

- `engine_math` Kalman docstring still says hfa = 1.56 [1.54, 1.59] and sigma = 13.36 [13.34, 13.37].
- Part 5 and the Gibbs table still print sigma [13.34, 13.37]. That width is the same √n CI of the mean. HFA was corrected. Sigma was not.
- The weather results table still says the +1.74 intercept means actuals beat closes by ~1.7 on average. LOOP6_DELTA calls that sentence the defect. The docstring above it is the corrected one.
- Manifest still says Glicko-2 matches Glickman exactly. The check is 1464.05 against paper 1464.06. Match to rounding.
- The trailing paste after the delivery reintroduces HFA [1.54, 1.59] and +1.74 as the average miss. That block is retired. Do not merge it.

## Their-box prints, not re-run here

Wind −0.197, EPA table r = 0.980, quarter rates 1.519 / 1.446 / 0.982, post-bye away −2.33, SNF +1.69, division −0.96, FLB slope 0.943, team-level λ3 = 0.3035, 10-season panel 1.0801 vs 4-season 1.0470. Accept as prints from the other box. They are not canonical until the command prints again here.

## Rule

A metric does not emit a pick. The pick carries the market, the residual against the close, and a situational fact the close does not already contain.
