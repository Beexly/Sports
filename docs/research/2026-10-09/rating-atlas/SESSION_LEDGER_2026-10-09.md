# Session ledger — 2026-10-09 rating atlas

Research note. Not a pick. Not a production change. `main` was `e1260ae` when this was written. This file lives on `research/rating-atlas-2026-10-09-packet` only.

## What this session was

A verification pass on the pasted prediction-engine packet (engine_math, ratings2, calibration2, kelly2, props, CLV, backtest, data fits, slates 2 and 3, prediction-only router). The job was to keep what printed, kill what did not, and stop the same claims from being re-cited as facts.

## Doctrine the engine must keep

1. The closing line is the bar. A rating, a Brier, or a Shin z does not emit a pick.
2. A pick has to carry the market, the residual against that market, and the situational read (replacement, not the name; rest; travel; wind; scheme). If only the number is present, it does not publish.
3. Context the literature quotes (rest, travel, timezone) did not survive against the closing spread in the pasted slate-3 OLS. Context is for early lines and props, not for beating the close. That OLS was not re-run in this workspace.
4. Nutrition and cognitive state have no public per-player series. They stay mechanisms. They do not become coefficients.
5. There is no 100% engine. The leakage-free SRS backtest on 2025 weeks 1–6 was 55.8% and needed T = 7.5 because it was overconfident.

## Verified here or in the earlier re-run

| Claim | Status |
|---|---|
| Shin −110/−110 | z = 0.0476, fair 0.50/0.50. Closed root, bisection. |
| Shin 0.6667/0.3704 | z = 0.0372, favorite above multiplicative |
| Shin 0.90/0.20 | z = 0.1087 |
| Shin sum < 1 | z = 0, multiplicative fallback |
| CRPS N(0,1) at 0 | 0.233695 = (√2 − 1)/√π, not 1/√π |
| Listed −3.5, sd 13.45 | cover 50%, home win 60.3%. mu_margin = −listed_spread |
| Team totals, −3 on 48.5 | 25.75 / 22.75 |
| Glicko-2 parallel | 1464.05 / 151.52 / 0.059996 vs paper 1464.06. Match to rounding. |
| Glicko-2 sequential, same slate | 1463.79 / 151.87 / 0.06000. Order changes the path. Sigma does not go to 2. |
| 12 wins vs 1900 RD 30 | parallel 2581.0, sequential 2143.1 |
| 1600 vs 1464 | 136 Elo points, P = 0.686. Not a step on the published path. |
| Teaser, seed 7, n = 20000 | rho 0 → 0.468, fair +114. rho 0.35 → 0.506, fair −102. Gap +0.038, not a tax. Dossier −155 → −127 is the other side. |
| Conformal N(0,1) | coverage about 0.908–0.913 on a 0.90 target |
| Kelly rho 0.55 | middle leg fraction 0. Third digit is Monte Carlo, not the result. |
| ESPN backtest 2025 wks 1–6 | 93 games, 77 preds, Brier 0.2868 → 0.2464 at T = 7.512, PIT max dev 0.082 |
| Production HFA | `NFL_EPA_HFA` is 0.025 EPA/play in `packages/prediction-engine/src/nfl-epa-fair-value.ts`, not a 2.0-point constant |

## Corrected, do not cite again

- Pasted HFA interval [1.54, 1.59] is a confidence interval on the posterior mean. `analyze_nfl.ci()` divides by sqrt(n). A mean of ~2,025 games with sd 13.36 has a 95% half-width of about 0.58. Refit on games.jsonl 2019+ (n = 1,950, OAK merged into LV): hfa 1.58 [0.98, 2.16], sigma 13.41, tau 3.47. Point estimate ~1.6 stands. The band does not.
- +1.74 is the weather regression intercept at 0 mph, not the average miss. At 8 mph, −0.197 × 8 cancels it. On this file the 2006–2018 mean of actual minus close is +0.67 (n = 3,471), not +1.74. Do not wire +1.74 into a game adjustment.
- Wind −0.197 was not re-fit. games.jsonl has no wind column. R² = 0.007. Production wind stays the curve in wind-elasticity.ts: nothing at or below 10 mph. A 2026-09-26 gap-board row on 349 outdoor games was −0.14 per mph, se 0.16.
- Ladder sd stays 13.45. Sigma 13.36 / refit 13.41 confirms it. A 0.09 gap is not a retune.
- 21.58 nats was scoreline log-loss, −log P(exact score), set beside Pinnacle 1X2 log-loss ~0.97. Not a 20× model gap. The scorer must marginalize the grid to home/draw/away first.
- Ipswich KeyError: promoted sides need `att.get(team, 0.0)` and the same for defense.
- Dossier §2.1 still says Shin does not recover z. Later sections say WORKING. The closed root is the one that printed. Do not ship the stale paragraph.
- Dossier lesson "sequential Glicko compounds volatility to 2" is false on the published example and the 12-game streak. Sigma stayed ~0.06.
- `props_optimizer.team_total_dist` still does `(total + spread) / 2`. With spread as the home book number that makes the favorite score less. `props_deep.team_total_split` is the correct one: mu_margin = −spread.

## Pasted, not re-run in this workspace

Do not promote these to canonical until the command prints again on a machine that has the files.

- EPL showdown 1.0470 vs Pinnacle 0.9664, 30/70 pool 0.9795. `research.db` was not here.
- KN λ3 → 0.001 at league level.
- Slate 3: context OLS on 3,368 games, favorites cover 48.46% (n = 3,271), FLB slope 0.935, referee EB signal sd 1.09, EPL 2H/1H = 1.224 (p = 6.9e-14, n = 1,900).
- DK holds 4.2–4.8%, CLV demo +1.19u on −2.70% CLV, bivariate 0.1231, Kelly growth 0.0167 vs 0.0115.
- nfl_context 7,341 rows and officials 51,359 rows. Claimed built, not in this workspace.

## Not done, and must not be implied done

- Packet Python is not on `main`. It is a research delivery.
- No recon handlers (/hydra /sqlmap /crack /shodan /exposure) in the sports tree. `/xray` stays a market tool.
- Production scoring, MODEL_VERSION, trust gates, and Stripe were not edited.
- `research/rating-atlas-2026-10-09` deleted unrelated files. Do not force-push it.
- EPA from nflverse pbp is still a PC job. RDS is not stdlib-parseable.
- The Odds API key slot is empty. Cross-book divergence is not live.

## Reasoning, not just the metric

The number is an input to the reason, not the reason. A play has to say which market it is fading, what the close already contains, and which situational fact is not in that close. If the situational fact is rest, travel, or timezone against a closing spread, slate 3 says the close already has it. If it is wind, the production curve is the prior until a wind column is re-fit. If it is nutrition or a coach quote, it stays a note until there is a series.
