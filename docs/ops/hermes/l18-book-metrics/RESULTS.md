# L-18 BPQI and BURS

Reused the L-15 `hermes_ro` extract. Pre-close snapshots only. 241 MLB clean-close games. 11 executable books (`espn_public` excluded).

**BPQI** = mean(p_book − p_median_close), Shin no-vig reference side, clustered-by-game SE.

**BURS** = fraction of consecutive polls where that book's Shin p changed.

These are measured deviations. They are not fade targets, not exploitable, and not an edge claim.

## Totals (public-page table)

| Book | BPQI | SE | clustered t | snapshots | games | BURS |
|---|---|---|---|---|---|---|
| fanatics | −0.00210 | 0.00102 | −2.05 | 11108 | 227 | 0.116 |
| betus | +0.00210 | 0.00108 | +1.95 | 9124 | 241 | 0.083 |
| betmgm | −0.00185 | 0.00095 | −1.94 | 10608 | 241 | 0.119 |
| lowvig | +0.00228 | 0.00118 | +1.93 | 11590 | 240 | 0.093 |
| betrivers | −0.00203 | 0.00105 | −1.93 | 9482 | 241 | 0.213 |
| williamhill_us | +0.00195 | 0.00105 | +1.87 | 11229 | 227 | 0.061 |
| betonlineag | +0.00203 | 0.00116 | +1.75 | 11593 | 240 | 0.092 |
| fanduel | −0.00159 | 0.00115 | −1.39 | 12059 | 241 | 0.070 |
| draftkings | −0.00112 | 0.00097 | −1.15 | 11447 | 241 | 0.169 |
| mybookieag | −0.00079 | 0.00100 | −0.79 | 10920 | 241 | 0.510 |
| bovada | −0.00073 | 0.00107 | −0.68 | 10255 | 241 | 0.109 |

On totals, every BPQI is inside about 0.2 cents of probability. Fanatics is the only book whose clustered t exceeds 2 in absolute value (−2.05), and the size is 0.21pp — a quality score, not a trade.

BURS (how often the quote actually moves): mybookieag 0.51, Betrivers 0.21, DraftKings 0.17; William Hill 0.061 and FanDuel 0.070 are the stickiest.

Spread-market BPQI is large because books post different spread *numbers*, not because of vig shade. Do not publish spread BPQI as price quality without a same-line filter. Moneyline BPQI is all |t| < 1.44.
