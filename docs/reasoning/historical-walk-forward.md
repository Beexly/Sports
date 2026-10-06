# Historical walk-forward

Each season below was scored only by a model fit on earlier seasons. 2026 did not choose the home-field constant and did not enter the 2015-2025 fits.

Home field chosen on 2002-2014: 48 Elo points, margin-of-victory multiplier false. Selection Brier 0.2269 on 3466 games. Base K is 20, from the existing rating module. The other nine settings are listed so the choice is visible.

| hfa | margin multiplier | games | brier |
|---|---|---|---|
| 48 | false | 3466 | 0.2269 |
| 65 | false | 3466 | 0.2270 |
| 65 | true | 3466 | 0.2276 |
| 80 | false | 3466 | 0.2278 |
| 48 | true | 3466 | 0.2279 |
| 30 | false | 3466 | 0.2280 |
| 80 | true | 3466 | 0.2281 |
| 30 | true | 3466 | 0.2291 |
| 0 | false | 3466 | 0.2322 |
| 0 | true | 3466 | 0.2334 |

The three columns in the same-game block are the same games, so they can be compared. A lower Brier is a sharper probability. This is the engine's own record. It is not a pick.

Weighted across 2015-2025, on the games where all three exist: Elo 0.2314, pregame logit 0.2262, devigged price 0.2122. Eleven seasons, not the 33 games played so far in 2026.

| season | games with all three | elo | pregame logit | devigged price |
|---|---|---|---|---|
| 2015 | 267 | 0.2310 | 0.2287 | 0.2287 |
| 2016 | 264 | 0.2283 | 0.2269 | 0.2167 |
| 2017 | 265 | 0.2314 | 0.2216 | 0.2032 |
| 2018 | 265 | 0.2348 | 0.2203 | 0.2124 |
| 2019 | 266 | 0.2328 | 0.2264 | 0.2141 |
| 2020 | 267 | 0.2304 | 0.2289 | 0.2019 |
| 2021 | 284 | 0.2305 | 0.2315 | 0.2177 |
| 2022 | 282 | 0.2396 | 0.2227 | 0.2093 |
| 2023 | 285 | 0.2360 | 0.2311 | 0.2186 |
| 2024 | 285 | 0.2140 | 0.2254 | 0.2010 |
| 2025 | 284 | 0.2364 | 0.2240 | 0.2109 |
| 2026 | 33 | 0.2282 | 0.2524 | 0.2289 |

Elo on every settled game that season, even when the price or the logit is missing:

| season | elo games | elo brier | logit games | logit brier |
|---|---|---|---|---|
| 2015 | 267 | 0.2310 | 267 | 0.2287 |
| 2016 | 265 | 0.2281 | 264 | 0.2269 |
| 2017 | 267 | 0.2301 | 266 | 0.2209 |
| 2018 | 265 | 0.2348 | 265 | 0.2203 |
| 2019 | 266 | 0.2328 | 266 | 0.2264 |
| 2020 | 268 | 0.2306 | 267 | 0.2289 |
| 2021 | 284 | 0.2305 | 284 | 0.2315 |
| 2022 | 282 | 0.2396 | 282 | 0.2227 |
| 2023 | 285 | 0.2360 | 285 | 0.2311 |
| 2024 | 285 | 0.2140 | 285 | 0.2254 |
| 2025 | 284 | 0.2364 | 284 | 0.2240 |
| 2026 | 33 | 0.2282 | 33 | 0.2524 |

## Week 3 with both historical models

Logit sample for 2026: 7240 earlier games.

| game | day | elo | logit | market |
|---|---|---|---|---|
| ATL at GB | 2026-09-24 | 0.725 | 0.631 | 0.669 |
| ARI at SF | 2026-09-27 | 0.833 | 0.830 | 0.782 |
| BAL at DAL | 2026-09-27 | 0.453 | 0.380 | 0.400 |
| CAR at CLE | 2026-09-27 | 0.607 | 0.424 | 0.437 |
| CIN at PIT | 2026-09-27 | 0.611 | 0.451 | 0.378 |
| HOU at IND | 2026-09-27 | 0.430 | 0.464 | 0.468 |
| KC at MIA | 2026-09-27 | 0.342 | 0.475 | 0.173 |
| LAC at BUF | 2026-09-27 | 0.778 | 0.803 | 0.741 |
| LA at DEN | 2026-09-27 | 0.548 | 0.586 | 0.457 |
| LV at NO | 2026-09-27 | 0.638 | 0.707 | 0.622 |
| MIN at TB | 2026-09-27 | 0.404 | 0.438 | 0.478 |
| NE at JAX | 2026-09-27 | 0.479 | 0.621 | 0.583 |
| NYJ at DET | 2026-09-27 | 0.848 | 0.819 | 0.722 |
| SEA at WAS | 2026-09-27 | 0.280 | 0.231 | 0.228 |
| TEN at NYG | 2026-09-27 | 0.638 | 0.646 | 0.551 |
| PHI at CHI | 2026-09-28 | 0.331 | 0.699 | 0.363 |
