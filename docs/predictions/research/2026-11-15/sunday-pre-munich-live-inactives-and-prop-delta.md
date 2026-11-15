# Sunday Pre-Munich Live Inactives and Prop Delta (2026-11-15)

Generated: 2026-11-15T13:20:32.365542+00:00 | Market snapshot: 20261115T131403Z
Author: Hermes overnight watch, Wave 3. Worktree branch feat/hermes-overnight-mind-and-munich-watch-2026-11-15.

## Method and discipline

- Live two-sided game lines: SportsbookReview public pages (spread, totals/full-game,
  money-line/full-game), 8 books incl. draftkings and fanduel. Book preference:
  draftkings > fanduel > betmgm > caesars > bet365 > rivers > fanatics > hardrock.
- DraftKings propBets API: 403 Access Denied from this host (IP reputation). Recorded
  as BLOCKED, not empty. No paid quota used; Odds API untouched.
- Stage-5 recompute holds the Nov-13 post-sim probabilities FIXED and swaps in live
  prices. Exact gate: devig = implied/overround; edge = sim - devig; PLAY requires
  edge >= 0.035 AND 90 pct Wilson LB (n=10000) > devig AND confidence >= 65/100;
  confidence = clamp(50 + 120*edge, 51, 72). Any line moved vs the template is PASS
  with LINE_MOVED_RESIM_REQUIRED: a sim prob is line-specific and is never reused
  across lines. No fake CLV floors, no forced action.
- publishAllowed remains FALSE board-wide. This document is a gate watch. Any
  numerical clear still requires the full 5-stage engine + full-game simulation
  re-run before publication or action.
- Props: no free two-sided prop source reachable (DK blocked; SBR game lines only).
  props_with_two_sided_prices stays 0; the prop circuit breaker continues.

## NE @ DET Munich gate (08:30 CST, FC Bayern Munich Stadium / Allianz Arena)

Books seen: spread 8, total 8, ML 8.

| Ticket | Template line/odds | Live line/odds | Sim prob | Live devig | Edge | Wilson LB | Conf | Decision |
|---|---|---|---|---|---|---|---|---|
| NE +2.5 | 2.5 / -110 | 2.5 / 100 | 0.4742 | 0.4783 | -0.0041 | 0.4660 | 51/100 | PASS |
| DET -2.5 | -2.5 / -110 | -2.5 / -120 | 0.5258 | 0.5217 | 0.0041 | 0.5176 | 51/100 | PASS |
| Over 44.5 | 44.5 / -110 | 50.5 / -115 | 0.5730 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 44.5 / -110 | 50.5 / -105 | 0.4270 | n/a | n/a | n/a | n/a | PASS |
| NE ML | ML / 120 | ML / 120 | 0.3808 | 0.4365 | -0.0557 | 0.3728 | 51/100 | PASS |
| DET ML | ML / -142 | ML / -142 | 0.6192 | 0.5635 | 0.0557 | 0.6112 | 57/100 | PASS |

- NE +2.5: LIVE_GATE: edge -0.0041 vs 0.035, wilson 0.4660 vs devig 0.4783, conf 51/100 vs 65/100
- DET -2.5: LIVE_GATE: edge 0.0041 vs 0.035, wilson 0.5176 vs devig 0.5217, conf 51/100 vs 65/100
- Over 44.5: LINE_MOVED_RESIM_REQUIRED: template 44.5 live 50.5; Nov-13 sim prob is line-specific
- Under 44.5: LINE_MOVED_RESIM_REQUIRED: template 44.5 live 50.5; Nov-13 sim prob is line-specific
- NE ML: LIVE_GATE: edge -0.0557 vs 0.035, wilson 0.3728 vs devig 0.4365, conf 51/100 vs 65/100
- DET ML: LIVE_GATE: edge 0.0557 vs 0.035, wilson 0.6112 vs devig 0.5635, conf 57/100 vs 65/100

Open -> current (book used): {"spread_home": {"open": 1.5, "current": -2.5, "delta": -4.0}, "total": {"open": 49.5, "current": 50.5, "delta": 1.0}, "ml_home": {"open": 110, "current": -142, "delta": -252}}

### Inactives watch (07:00 CST gate)

ESPN summary injuries block captured; official inactives are the team-issued list 90 min pre-kick.

| Player | Team | Status |
|---|---|---|
| Eli Raridon | NE | NOT_LISTED (no injury designation in ESPN block) |
| Mack Hollins | NE | NOT_LISTED (no injury designation in ESPN block) |
| Amon-Ra St. Brown | DET | NOT_LISTED (no injury designation in ESPN block) |
| Jahmyr Gibbs | DET | NOT_LISTED (no injury designation in ESPN block) |
| Sam LaPorta | DET | NOT_LISTED (no injury designation in ESPN block) |
| Drake Maye | NE | NOT_LISTED (no injury designation in ESPN block) |
| Jared Goff | DET | NOT_LISTED (no injury designation in ESPN block) |

No watch-list starter flagged OUT/DOUBTFUL in the captured block (or block not yet captured).
Munich DFS upload file (data/dfs/week10_munich_ne_det_dk_upload.csv): NOT YET LANDED (Antigravity push pending).

Full ESPN injuries block at gate time (official game-day inactives are the team-issued Out list):

| Player | Team | Status |
|---|---|---|
| Ahmed Hassanein | DET | Out |
| Amen Ogbongbemiga | DET | Out |
| Cade Mays | DET | Out |
| D.J. Reed | DET | Out |
| Mekhi Wingo | DET | Out |
| Behren Morton | NE | Out |
| Ben Brown | NE | Out |
| Brenden Schooler | NE | Out |
| Dametrious Crownover | NE | Out |
| Walter Rouse | NE | Out |

Watch-list starters (Raridon, Hollins, St. Brown, Gibbs, LaPorta, Maye, Goff): none ruled OUT at gate time; the paid-path trigger (official inactives invalidating a Munich QB1/WR1/RB1 starter) did NOT fire. Model spend stays 0.00 USD.

## Full 13-game live delta

### NE @ DET

Template circuit breaker: STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES | template publishAllowed: False | props two-sided: 0 | books sp/tot/ml: 8/8/8
Open -> current: {"spread_home": {"open": 1.5, "current": -2.5, "delta": -4.0}, "total": {"open": 49.5, "current": 50.5, "delta": 1.0}, "ml_home": {"open": 110, "current": -142, "delta": -252}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| NE +2.5 | 2.5 / 100 | 0.4742 | 0.4783 | -0.0041 | 0.4660 | 51/100 | PASS |
| DET -2.5 | -2.5 / -120 | 0.5258 | 0.5217 | 0.0041 | 0.5176 | 51/100 | PASS |
| Over 44.5 | 50.5 / -115 | 0.5730 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 50.5 / -105 | 0.4270 | n/a | n/a | n/a | n/a | PASS |
| NE ML | ML / 120 | 0.3808 | 0.4365 | -0.0557 | 0.3728 | 51/100 | PASS |
| DET ML | ML / -142 | 0.6192 | 0.5635 | 0.0557 | 0.6112 | 57/100 | PASS |

Line moved vs template (resim required): Over 44.5, Under 44.5.

### BUF @ NYJ

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| BUF +2.5 | -110 | 0.1498 | 68/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
| BUF ML | 120 | 0.1957 | 72/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": 7.5, "current": 9.5, "delta": 2.0}, "total": {"open": 50.5, "current": 50.5, "delta": 0.0}, "ml_home": {"open": 320, "current": 360, "delta": 40}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| BUF +2.5 | -9.5 / -108 | 0.6498 | n/a | n/a | n/a | n/a | PASS |
| NYJ -2.5 | 9.5 / -123 | 0.3502 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 50.5 / -115 | 0.5526 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 50.5 / -105 | 0.4474 | n/a | n/a | n/a | n/a | PASS |
| BUF ML | ML / -470 | 0.6322 | 0.7914 | -0.1592 | 0.6242 | 51/100 | PASS |
| NYJ ML | ML / 360 | 0.3678 | 0.2086 | 0.1592 | 0.3599 | 69/100 | PASS |

Line moved vs template (resim required): BUF +2.5, NYJ -2.5, Over 44.5, Under 44.5, NYJ ML.

### CAR @ NO

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| Under 44.5 | -110 | 0.1818 | 72/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
Open -> current: {"spread_home": {"open": 1.5, "current": -1.5, "delta": -3.0}, "total": {"open": 47.5, "current": 49.5, "delta": 2.0}, "ml_home": {"open": 105, "current": -118, "delta": -223}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| CAR +2.5 | 1.5 / -115 | 0.6005 | n/a | n/a | n/a | n/a | PASS |
| NO -2.5 | -1.5 / -105 | 0.3995 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 49.5 / -108 | 0.3182 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 49.5 / -123 | 0.6818 | n/a | n/a | n/a | n/a | PASS |
| CAR ML | ML / -102 | 0.4962 | 0.4826 | 0.0136 | 0.4880 | 52/100 | PASS |
| NO ML | ML / -118 | 0.5038 | 0.5174 | -0.0136 | 0.4956 | 51/100 | PASS |

Line moved vs template (resim required): CAR +2.5, NO -2.5, Over 44.5, Under 44.5.

### HOU @ CLE

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| HOU +2.5 | -110 | 0.1467 | 68/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
| HOU ML | 120 | 0.1896 | 72/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": 4.5, "current": 4.5, "delta": 0.0}, "total": {"open": 39.5, "current": 40.5, "delta": 1.0}, "ml_home": {"open": 185, "current": 185, "delta": 0}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| HOU +2.5 | -4.5 / -112 | 0.6467 | n/a | n/a | n/a | n/a | PASS |
| CLE -2.5 | 4.5 / -108 | 0.3533 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 40.5 / -112 | 0.4477 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 40.5 / -108 | 0.5523 | n/a | n/a | n/a | n/a | PASS |
| HOU ML | ML / -225 | 0.6261 | 0.6636 | -0.0375 | 0.6181 | 51/100 | PASS |
| CLE ML | ML / 185 | 0.3739 | 0.3364 | 0.0375 | 0.3660 | 55/100 | PASS |

Line moved vs template (resim required): HOU +2.5, CLE -2.5, Over 44.5, Under 44.5.

### JAX @ TEN

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| JAX +2.5 | -110 | 0.1782 | 71/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
| JAX ML | 120 | 0.1502 | 68/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": 8.5, "current": 10.5, "delta": 2.0}, "total": {"open": 44.5, "current": 46.5, "delta": 2.0}, "ml_home": {"open": 340, "current": 525, "delta": 185}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| JAX +2.5 | -10.5 / -115 | 0.6782 | n/a | n/a | n/a | n/a | PASS |
| TEN -2.5 | 10.5 / -105 | 0.3218 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 46.5 / -110 | 0.4363 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 46.5 / -110 | 0.5637 | n/a | n/a | n/a | n/a | PASS |
| JAX ML | ML / -750 | 0.5867 | 0.8465 | -0.2598 | 0.5786 | 51/100 | PASS |
| TEN ML | ML / 525 | 0.4133 | 0.1535 | 0.2598 | 0.4052 | 72/100 | PASS |

Line moved vs template (resim required): JAX +2.5, TEN -2.5, Over 44.5, Under 44.5, TEN ML.

### KC @ ATL

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| KC +2.5 | -110 | 0.1563 | 69/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
| KC ML | 120 | 0.2043 | 72/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": 3, "current": 3.5, "delta": 0.5}, "total": {"open": 46.5, "current": 47.5, "delta": 1.0}, "ml_home": {"open": 145, "current": 150, "delta": 5}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| KC +2.5 | -3.5 / -101 | 0.6563 | n/a | n/a | n/a | n/a | PASS |
| ATL -2.5 | 3.5 / -131 | 0.3437 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 47.5 / -105 | 0.5445 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 47.5 / -115 | 0.4555 | n/a | n/a | n/a | n/a | PASS |
| KC ML | ML / -180 | 0.6408 | 0.6164 | 0.0244 | 0.6329 | 53/100 | PASS |
| ATL ML | ML / 150 | 0.3592 | 0.3836 | -0.0244 | 0.3513 | 51/100 | PASS |

Line moved vs template (resim required): KC +2.5, ATL -2.5, Over 44.5, Under 44.5.

### LAR @ ARI

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| LAR ML | 120 | 0.1431 | 67/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": 8.5, "current": 9.5, "delta": 1.0}, "total": {"open": 47.5, "current": 38.5, "delta": -9.0}, "ml_home": {"open": 295, "current": 370, "delta": 75}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| LAR +2.5 | -9.5 / -112 | 0.5959 | n/a | n/a | n/a | n/a | PASS |
| ARI -2.5 | 9.5 / -108 | 0.4041 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 38.5 / -108 | 0.4427 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 38.5 / -112 | 0.5573 | n/a | n/a | n/a | n/a | PASS |
| LAR ML | ML / -485 | 0.5796 | 0.7958 | -0.2162 | 0.5715 | 51/100 | PASS |
| ARI ML | ML / 370 | 0.4204 | 0.2042 | 0.2162 | 0.4123 | 72/100 | PASS |

Line moved vs template (resim required): LAR +2.5, ARI -2.5, Over 44.5, Under 44.5, ARI ML.

### MIA @ IND

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| Under 44.5 | -110 | 0.1398 | 67/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
Open -> current: {"spread_home": {"open": -2.5, "current": -4.5, "delta": -2.0}, "total": {"open": 43.5, "current": 37.5, "delta": -6.0}, "ml_home": {"open": -135, "current": -225, "delta": -90}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| MIA +2.5 | 4.5 / -110 | 0.4625 | n/a | n/a | n/a | n/a | PASS |
| IND -2.5 | -4.5 / -110 | 0.5375 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 37.5 / -110 | 0.3602 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 37.5 / -110 | 0.6398 | n/a | n/a | n/a | n/a | PASS |
| MIA ML | ML / 185 | 0.3652 | 0.3364 | 0.0288 | 0.3573 | 53/100 | PASS |
| IND ML | ML / -225 | 0.6348 | 0.6636 | -0.0288 | 0.6268 | 51/100 | PASS |

Line moved vs template (resim required): MIA +2.5, IND -2.5, Over 44.5, Under 44.5.

### MIN @ GB

Template circuit breaker: STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES | template publishAllowed: False | props two-sided: 0 | books sp/tot/ml: 8/8/8
Open -> current: {"spread_home": {"open": -2.5, "current": -2.5, "delta": 0.0}, "total": {"open": 41.5, "current": 41.5, "delta": 0.0}, "ml_home": {"open": -148, "current": -148, "delta": 0}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| MIN +2.5 | 2.5 / 100 | 0.5362 | 0.4783 | 0.0579 | 0.5280 | 57/100 | PASS |
| GB -2.5 | -2.5 / -120 | 0.4638 | 0.5217 | -0.0579 | 0.4556 | 51/100 | PASS |
| Over 44.5 | 41.5 / -120 | 0.5939 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 41.5 / -110 | 0.4061 | n/a | n/a | n/a | n/a | PASS |
| MIN ML | ML / 124 | 0.4785 | 0.4279 | 0.0506 | 0.4703 | 56/100 | PASS |
| GB ML | ML / -148 | 0.5215 | 0.5721 | -0.0506 | 0.5133 | 51/100 | PASS |

Line moved vs template (resim required): Over 44.5, Under 44.5.

### PIT @ CIN

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| CIN -2.5 | -110 | 0.1598 | 69/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
| CIN ML | -142 | 0.1476 | 68/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": -4.5, "current": -3.5, "delta": 1.0}, "total": {"open": 47.5, "current": 49.5, "delta": 2.0}, "ml_home": {"open": -198, "current": -185, "delta": 13}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| PIT +2.5 | 3.5 / -112 | 0.3402 | n/a | n/a | n/a | n/a | PASS |
| CIN -2.5 | -3.5 / -108 | 0.6598 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 49.5 / -105 | 0.5992 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 49.5 / -115 | 0.4008 | n/a | n/a | n/a | n/a | PASS |
| PIT ML | ML / 154 | 0.2889 | 0.3775 | -0.0886 | 0.2815 | 51/100 | PASS |
| CIN ML | ML / -185 | 0.7111 | 0.6225 | 0.0886 | 0.7036 | 61/100 | PASS |

Line moved vs template (resim required): PIT +2.5, CIN -2.5, Over 44.5, Under 44.5.

### SEA @ LV

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| Under 44.5 | -110 | 0.1434 | 67/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
Open -> current: {"spread_home": {"open": 6, "current": 6.5, "delta": 0.5}, "total": {"open": 44.5, "current": 40.5, "delta": -4.0}, "ml_home": {"open": 215, "current": 235, "delta": 20}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| SEA +2.5 | -6.5 / -110 | 0.5898 | n/a | n/a | n/a | n/a | PASS |
| LV -2.5 | 6.5 / -110 | 0.4102 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 40.5 / -108 | 0.3566 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 40.5 / -112 | 0.6434 | n/a | n/a | n/a | n/a | PASS |
| SEA ML | ML / -290 | 0.5167 | 0.7136 | -0.1969 | 0.5085 | 51/100 | PASS |
| LV ML | ML / 235 | 0.4833 | 0.2864 | 0.1969 | 0.4751 | 72/100 | PASS |

Line moved vs template (resim required): SEA +2.5, LV -2.5, Over 44.5, Under 44.5, LV ML.

### SF @ DAL

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 8/8/8

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| SF +2.5 | -110 | 0.1831 | 72/100 | INVALIDATED_LINE_MOVED (template benchmark, not a live quote) |
| SF ML | 120 | 0.1529 | 68/100 | INVALIDATED_LIVE_GATE (edge/wilson/conf fails on live price) |
Open -> current: {"spread_home": {"open": 3.5, "current": 4.5, "delta": 1.0}, "total": {"open": 53.5, "current": 56.5, "delta": 3.0}, "ml_home": {"open": 170, "current": 180, "delta": 10}}

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| SF +2.5 | -4.5 / -108 | 0.6831 | n/a | n/a | n/a | n/a | PASS |
| DAL -2.5 | 4.5 / -112 | 0.3169 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | 56.5 / -108 | 0.6018 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | 56.5 / -123 | 0.3982 | n/a | n/a | n/a | n/a | PASS |
| SF ML | ML / -218 | 0.5894 | 0.6575 | -0.0681 | 0.5813 | 51/100 | PASS |
| DAL ML | ML / 180 | 0.4106 | 0.3425 | 0.0681 | 0.4025 | 58/100 | PASS |

Line moved vs template (resim required): SF +2.5, DAL -2.5, Over 44.5, Under 44.5.

### LAC @ BAL

Template circuit breaker: STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING | template publishAllowed: True | props two-sided: 0 | books sp/tot/ml: 0/0/0

Overnight template-approved plays and their live-market fate:

| selection | template odds | template edge | template conf | live fate |
|---|---|---|---|---|
| BAL -2.5 | -110 | 0.1889 | 72/100 | INVALIDATED_NO_LIVE_PRICE |
| BAL ML | -142 | 0.1513 | 68/100 | INVALIDATED_NO_LIVE_PRICE |

| Ticket | Live line/odds | Sim | Devig | Edge | Wilson | Conf | Decision |
|---|---|---|---|---|---|---|---|
| LAC +2.5 | n/a | 0.3111 | n/a | n/a | n/a | n/a | PASS |
| BAL -2.5 | n/a | 0.6889 | n/a | n/a | n/a | n/a | PASS |
| Over 44.5 | n/a | 0.5828 | n/a | n/a | n/a | n/a | PASS |
| Under 44.5 | n/a | 0.4172 | n/a | n/a | n/a | n/a | PASS |
| LAC ML | n/a | 0.2852 | n/a | n/a | n/a | n/a | PASS |
| BAL ML | n/a | 0.7148 | n/a | n/a | n/a | n/a | PASS |

No live two-sided price: LAC +2.5, BAL -2.5, Over 44.5, Under 44.5, LAC ML, BAL ML.

## Board verdict

- Overnight template board: 18 approved plays across 11 games, ALL priced against generic template benchmarks (+2.5/-2.5, 44.5, +120/-142), with 0 two-sided prop prices board-wide; 2 games circuit-breaker halted (publishAllowed False).
- Live re-verification invalidates 18/18 of those template approvals (lines moved or prices absent). They were never live-market plays; none may be published.
- Numerical gate clears on live prices (full-engine re-run still required): 0. Moneyline clears on line-moved games are downgraded to PASS (STALE_SIM_LINE_MOVED): a moved line invalidates the sim win probability the ML edge would be measured against.
- publishAllowed: FALSE for this watch output. Prop circuit breaker: CONTINUES (0 two-sided prop prices).
- Game-line template fallback is replaced by live SBR two-sided prices for evaluation,
  but no pick is published or suggested from this watch. PASS is the default; zero fake CLV floors.

Snapshot errors: none
