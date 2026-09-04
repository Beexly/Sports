# NFL replay calibration — corpus 7548 games, 1999→2026
# NFL Replay Calibration — 2026-09-04T04:28:46.113Z

Corpus: 7548 nflverse games (1999→2026), scored 7276 (line present) → 16670 settled picks, 305 pushes, 16365 binary samples.

Split: train n=15088 (seasons 1999–2023) / test n=1277 (seasons 2024, 2025) — test = most recent two completed seasons.

## Out-of-sample (isotonic fit on train, applied unchanged to test)
- **SPREAD**: test n=565; raw Brier 0.2920 → isotonic-calibrated 0.2509; raw ECE 0.2018 → calibrated 0.0327
- **MONEYLINE**: test n=145; raw Brier 0.2298 → isotonic-calibrated 0.1680; raw ECE 0.2648 → calibrated 0.1125
- **TOTAL**: test n=567; raw Brier 0.2690 → isotonic-calibrated 0.2506; raw ECE 0.1409 → calibrated 0.0377

## In-sample slices (descriptive; NOT the honest number)
### ALL SEASONS — n=16365 picks (305 pushes excluded)

#### SPREAD — n=7081, win rate 48.7%
Brier 0.2949 (rel 0.0449 − res 0.0000 + unc 0.2498)
ECE equal-width(10) 0.2094 | adaptive(10) 0.2095 | debiased 0.0448

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.6–0.7 | 3102 | 0.665 | 0.492 |
| 0.7–0.8 | 3979 | 0.721 | 0.483 |

#### MONEYLINE — n=2114, win rate 76.6%
Brier 0.2252 (rel 0.0493 − res 0.0014 + unc 0.1791)
ECE equal-width(10) 0.2217 | adaptive(10) 0.2217 | debiased 0.0491

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.5–0.6 | 1891 | 0.536 | 0.754 |
| 0.6–0.7 | 223 | 0.620 | 0.874 |

#### TOTAL — n=7170, win rate 49.4%
Brier 0.2808 (rel 0.0308 − res 0.0000 + unc 0.2500)
ECE equal-width(10) 0.1756 | adaptive(10) 0.1756 | debiased 0.0308

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.6–0.7 | 7170 | 0.670 | 0.494 |

### TRAIN — n=15088 picks (0 pushes excluded)

#### SPREAD — n=6516, win rate 48.6%
Brier 0.2951 (rel 0.0453 − res 0.0000 + unc 0.2498)
ECE equal-width(10) 0.2101 | adaptive(10) 0.2101 | debiased 0.0452

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.6–0.7 | 2953 | 0.665 | 0.492 |
| 0.7–0.8 | 3563 | 0.721 | 0.480 |

#### MONEYLINE — n=1969, win rate 76.4%
Brier 0.2249 (rel 0.0479 − res 0.0014 + unc 0.1804)
ECE equal-width(10) 0.2185 | adaptive(10) 0.2185 | debiased 0.0477

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.5–0.6 | 1755 | 0.536 | 0.751 |
| 0.6–0.7 | 214 | 0.620 | 0.869 |

#### TOTAL — n=6603, win rate 49.1%
Brier 0.2818 (rel 0.0319 − res 0.0000 + unc 0.2499)
ECE equal-width(10) 0.1786 | adaptive(10) 0.1786 | debiased 0.0318

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.6–0.7 | 6603 | 0.670 | 0.491 |

### TEST (held out) — n=1277 picks (0 pushes excluded)

#### SPREAD — n=565, win rate 50.6%
Brier 0.2920 (rel 0.0410 − res 0.0000 + unc 0.2500)
ECE equal-width(10) 0.2018 | adaptive(10) 0.2018 | debiased 0.0402

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.6–0.7 | 149 | 0.668 | 0.497 |
| 0.7–0.8 | 416 | 0.722 | 0.510 |

#### MONEYLINE — n=145, win rate 80.0%
Brier 0.2298 (rel 0.0710 − res 0.0026 + unc 0.1600)
ECE equal-width(10) 0.2648 | adaptive(10) 0.2648 | debiased 0.0698

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.5–0.6 | 136 | 0.529 | 0.787 |
| 0.6–0.7 | 9 | 0.623 | 1.000 |

#### TOTAL — n=567, win rate 52.9%
Brier 0.2690 (rel 0.0199 − res 0.0000 + unc 0.2492)
ECE equal-width(10) 0.1409 | adaptive(10) 0.1409 | debiased 0.0194

| bin | n | mean forecast | observed |
|----:|---:|--------------:|---------:|
| 0.6–0.7 | 567 | 0.670 | 0.529 |

## Per-season split (ALL settled picks, in-sample descriptive)

| season | market | n | win rate | ECE |
|-------:|:-------|---:|---------:|----:|
| 1999 | SPREAD | 249 | 47.0% | 0.202 |
| 1999 | TOTAL | 258 | 48.8% | 0.182 |
| 2000 | SPREAD | 252 | 47.6% | 0.196 |
| 2000 | TOTAL | 253 | 47.8% | 0.192 |
| 2001 | SPREAD | 247 | 46.6% | 0.204 |
| 2001 | TOTAL | 255 | 49.0% | 0.180 |
| 2002 | SPREAD | 262 | 44.3% | 0.230 |
| 2002 | TOTAL | 264 | 51.1% | 0.159 |
| 2003 | SPREAD | 258 | 49.6% | 0.174 |
| 2003 | TOTAL | 263 | 47.5% | 0.195 |
| 2004 | SPREAD | 261 | 50.2% | 0.170 |
| 2004 | TOTAL | 264 | 49.2% | 0.178 |
| 2005 | SPREAD | 257 | 58.8% | 0.082 |
| 2005 | TOTAL | 261 | 45.6% | 0.214 |
| 2006 | SPREAD | 259 | 43.6% | 0.264 |
| 2006 | MONEYLINE | 115 | 68.7% | 0.130 |
| 2006 | TOTAL | 254 | 50.8% | 0.162 |
| 2007 | SPREAD | 262 | 50.8% | 0.200 |
| 2007 | MONEYLINE | 136 | 77.2% | 0.210 |
| 2007 | TOTAL | 260 | 54.2% | 0.128 |
| 2008 | SPREAD | 261 | 49.0% | 0.205 |
| 2008 | MONEYLINE | 96 | 78.1% | 0.227 |
| 2008 | TOTAL | 258 | 50.4% | 0.166 |
| 2009 | SPREAD | 259 | 48.6% | 0.221 |
| 2009 | MONEYLINE | 144 | 78.5% | 0.234 |
| 2009 | TOTAL | 262 | 47.7% | 0.193 |
| 2010 | SPREAD | 262 | 49.2% | 0.213 |
| 2010 | MONEYLINE | 98 | 75.5% | 0.210 |
| 2010 | TOTAL | 262 | 56.1% | 0.109 |
| 2011 | SPREAD | 256 | 48.8% | 0.218 |
| 2011 | MONEYLINE | 124 | 77.4% | 0.224 |
| 2011 | TOTAL | 264 | 50.4% | 0.166 |
| 2012 | SPREAD | 262 | 48.1% | 0.225 |
| 2012 | MONEYLINE | 107 | 78.5% | 0.243 |
| 2012 | TOTAL | 265 | 50.2% | 0.168 |
| 2013 | SPREAD | 260 | 53.5% | 0.174 |
| 2013 | MONEYLINE | 120 | 75.8% | 0.214 |
| 2013 | TOTAL | 263 | 52.1% | 0.149 |
| 2014 | SPREAD | 261 | 47.9% | 0.226 |
| 2014 | MONEYLINE | 118 | 77.1% | 0.229 |
| 2014 | TOTAL | 264 | 47.0% | 0.200 |
| 2015 | SPREAD | 257 | 45.9% | 0.243 |
| 2015 | MONEYLINE | 99 | 69.7% | 0.159 |
| 2015 | TOTAL | 262 | 47.3% | 0.197 |
| 2016 | SPREAD | 262 | 52.3% | 0.184 |
| 2016 | MONEYLINE | 91 | 76.9% | 0.228 |
| 2016 | TOTAL | 266 | 53.4% | 0.136 |
| 2017 | SPREAD | 259 | 51.7% | 0.190 |
| 2017 | MONEYLINE | 117 | 80.3% | 0.258 |
| 2017 | TOTAL | 267 | 46.8% | 0.202 |
| 2018 | SPREAD | 258 | 45.7% | 0.248 |
| 2018 | MONEYLINE | 117 | 76.9% | 0.228 |
| 2018 | TOTAL | 264 | 47.0% | 0.200 |
| 2019 | SPREAD | 257 | 46.7% | 0.237 |
| 2019 | MONEYLINE | 105 | 73.3% | 0.194 |
| 2019 | TOTAL | 266 | 49.6% | 0.174 |
| 2020 | SPREAD | 269 | 44.2% | 0.263 |
| 2020 | MONEYLINE | 112 | 81.3% | 0.277 |
| 2020 | TOTAL | 264 | 50.8% | 0.162 |
| 2021 | SPREAD | 281 | 46.6% | 0.243 |
| 2021 | MONEYLINE | 121 | 75.2% | 0.211 |
| 2021 | TOTAL | 282 | 45.7% | 0.213 |
| 2022 | SPREAD | 274 | 45.3% | 0.255 |
| 2022 | MONEYLINE | 97 | 76.3% | 0.223 |
| 2022 | TOTAL | 281 | 44.5% | 0.225 |
| 2023 | SPREAD | 271 | 52.0% | 0.181 |
| 2023 | MONEYLINE | 52 | 76.9% | 0.235 |
| 2023 | TOTAL | 281 | 46.3% | 0.207 |
| 2024 | SPREAD | 281 | 52.7% | 0.180 |
| 2024 | MONEYLINE | 56 | 83.9% | 0.304 |
| 2024 | TOTAL | 282 | 53.9% | 0.131 |
| 2025 | SPREAD | 284 | 48.6% | 0.223 |
| 2025 | MONEYLINE | 89 | 77.5% | 0.240 |
| 2025 | TOTAL | 285 | 51.9% | 0.151 |

## Isotonic maps (fit on train)

### SPREAD
| forecast ≥ | calibrated |
|-----------:|-----------:|
| 0.61 | 0.483 |
| 0.75 | 0.520 |  ← cap above this

### MONEYLINE
| forecast ≥ | calibrated |
|-----------:|-----------:|
| 0.50 | 0.682 |
| 0.51 | 0.711 |
| 0.52 | 0.724 |
| 0.54 | 0.748 |
| 0.56 | 0.775 |
| 0.57 | 0.859 |
| 0.62 | 0.865 |
| 0.63 | 0.882 |
| 0.66 | 1.000 |
| 0.67 | 1.000 |
| 0.68 | 1.000 |
| 0.69 | 1.000 |  ← cap above this

### TOTAL
| forecast ≥ | calibrated |
|-----------:|-----------:|
| 0.67 | 0.491 |  ← cap above this

## Caveats
- Confidence is a 0–100 pick score, not a probability; the isotonic map is the candidate MODEL_VERSION transform (human-gated before any live use).
- Holdout is the most recent two COMPLETED seasons (2024–2025); the corpus' 2026 rows are future games with no score, so they never settle and appear in no slice.
- MONEYLINE confidence sits in the low 50s regardless of market fair prob (0.66–0.85 here); the fitted map corrects this systematic under-confidence — that correction IS the calibration deliverable.
- Market lines are the nflverse/nfldata kickoff-time consensus; entryOdds are standardized -110 (ML rounded) — see gradeHistoricalClv.
- TRAIN/TEST push counts are folded into the ALL slice count above.
