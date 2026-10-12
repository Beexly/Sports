# Props EV board

Market: **5-flex** (breakeven 0.542) · alt: 2-pick (breakeven 0.571)

21 props scored · 19 at positive EV.

## Top 20 by EV

| # | Player | Stat | Side | PP line | p(win) model | p(win) book-normal | EV% | EV% normal basis | ¼-Kelly | Tier | Shade |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Geno Smith | rush_yards | UNDER | 11.5 | 0.772 | 0.525 | +42.4% | -3.2% | 12.54% | C | -0.5 |
| 2 | Daniel Jones | pass_yards | UNDER | 212.5 | 0.592 | 0.526 | +9.3% | -3.0% | 2.75% | C | +0.0 |
| 3 | Aaron Jones | rush_rec_yards | UNDER | 93.5 | 0.586 | 0.504 | +8.2% | -7.0% | 2.41% | C | -0.5 |
| 4 | Bijan Robinson | rush_rec_yards | UNDER | 120.5 | 0.580 | 0.500 | +6.9% | -7.7% | 2.05% | C | -0.5 |
| 5 | Malik Willis | pass_yards | UNDER | 190.5 | 0.575 | 0.504 | +6.0% | -7.1% | 1.78% | C | -0.5 |
| 6 | Jalen Hurts | pass_yards | UNDER | 186.5 | 0.574 | 0.502 | +5.9% | -7.4% | 1.75% | C | -1.0 |
| 7 | Aaron Rodgers | pass_yards | UNDER | 227.5 | 0.574 | 0.511 | +5.9% | -5.7% | 1.74% | C | +0.0 |
| 8 | Jahmyr Gibbs | rush_rec_yards | UNDER | 133.5 | 0.573 | 0.502 | +5.8% | -7.4% | 1.70% | C | +0.0 |
| 9 | Tyler Shough | pass_yards | UNDER | 237.5 | 0.573 | 0.515 | +5.6% | -4.9% | 1.67% | C | -0.5 |
| 10 | Jayden Daniels | pass_yards | UNDER | 198.5 | 0.571 | 0.504 | +5.4% | -7.1% | 1.59% | C | -0.5 |
| 11 | Tyler Huntley | pass_yards | UNDER | 170.5 | 0.571 | 0.500 | +5.3% | -7.7% | 1.56% | C | -0.5 |
| 12 | Kirk Cousins | pass_yards | UNDER | 232.5 | 0.570 | 0.507 | +5.2% | -6.4% | 1.53% | C | -0.5 |
| 13 | Jameis Winston | pass_yards | UNDER | 201.5 | 0.567 | 0.502 | +4.6% | -7.4% | 1.36% | C | -0.5 |
| 14 | Michael Penix | pass_yards | UNDER | 221.5 | 0.565 | 0.502 | +4.3% | -7.4% | 1.26% | C | -0.5 |
| 15 | Dandre Swift | rush_rec_yards | UNDER | 105.5 | 0.563 | 0.521 | +3.8% | -3.9% | 1.13% | C | -0.5 |
| 16 | Jared Goff | pass_yards | UNDER | 280.5 | 0.557 | 0.508 | +2.9% | -6.3% | 0.84% | C | +0.0 |
| 17 | James Cook | rush_rec_yards | UNDER | 89.5 | 0.557 | 0.533 | +2.8% | -1.6% | 0.82% | C | +0.0 |
| 18 | Jacoby Brissett | pass_yards | UNDER | 268.5 | 0.549 | 0.505 | +1.3% | -6.8% | 0.38% | C | +0.0 |
| 19 | Trevor Lawrence | pass_yards | UNDER | 225.5 | 0.542 | 0.515 | +0.1% | -4.9% | 0.02% | C | -1.0 |
| 20 | Jordan Love | pass_yards | UNDER | 233.5 | 0.541 | 0.517 | -0.1% | -4.6% | 0.00% | PASS | -0.5 |

## Reading this board

* **p(win)** is a MODEL probability from the distribution fitted to DraftKings' own mean and sigma for that stat — not a de-vigged market probability. Neither source sheet carries a price, so no market probability can be recovered from them.
* **EV%** is per unit staked, from the breakeven rate, using profit odds (1-b)/b. ¼-Kelly is the stake fraction; it is 0.00% whenever EV is negative.
* **Tier** requires the normal and lognormal to agree on the side. A row whose side depends on the distribution family is capped at C.
* **Shade** is the Pinnacle-minus-DraftKings total, shown as context. It is NOT folded into EV; the sensitivity version is in the JSON.
* No price appears anywhere in the inputs, so this board prices PP against a model, not against a sharp market.
