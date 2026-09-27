# Case Keenum Target-Distribution Study

**Prepared:** 2026-09-24 | **Data:** nflverse play-by-play 2013–2023 (cached parquets, `~/workspace/gse-discovery/data_snapshot_20260913/`), receiver positions joined from nflverse season rosters. Every number below comes from that data unless flagged as general football knowledge.

---

## Part 0 — Week 3 news (verified 2026-09-24)

- **Game:** Chicago Bears vs Philadelphia Eagles — **Monday Night Football, Monday, September 28, 2026** (Week 3). This is the final game of the Sunday–Monday slate.
- **Status:** Case Keenum (38) is expected to start, per multiple outlets (USA Today/For The Win, SI, Bears Wire, 2026-09-22/23).
- **Why:** Caleb Williams suffered a **Grade 1 hamstring strain** (non-contact) in the Week 2 loss to the Vikings and is not expected to practice this week; backup Tyson Bagent entered the **concussion protocol** after a hard sack by Dallas Turner on the final play of that game. Keenum is the Bears' third QB.
- **Background:** Keenum joined the Bears in April 2025 and re-signed on a two-year deal in March 2026. He last played in the NFL in **2023 with the Houston Texans** (2 games). Career: 11 seasons, 80 games, 79 TD, 62.3% completions (per FTW).
- **Sources:** [ftw.usatoday.com](https://ftw.usatoday.com/story/sports/nfl/2026/09/22/who-is-bears-tyson-bagent-backup-qb-injury/91892030007/), [si.com (rust)](https://www.si.com/nfl/bears/onsi/rust-is-the-problem-for-bears-with-case-keenum-and-not-the-mileage), [si.com (odds)](https://www.si.com/betting/caleb-williams-injury-update-oddsmakers-bracing-for-star-quarterback-to-sit-vs-eagles-case-keenum-to-start), [bearswire.usatoday.com](https://bearswire.usatoday.com/story/sports/nfl/bears/2026/09/23/bear-kyle-monangai-misses-wednesday-practice-week-3/91910221007/)

---

## Method

- **Sample:** all plays 2013–2023 where `passer_player_name == "C.Keenum"` and `receiver_player_name` is non-null (a *targeted attempt*). Throwaways/spikes (no receiver) and sacks are excluded — this is a target-distribution study, not an attempt-total study.
- **Position map:** each receiver's GSIS id → position from that season's nflverse roster; zero targets had unknown position.
- **Career sample:** n = **2,270 targets** (2013–2023; teams: HOU, LA, MIN, DEN, WAS, CLE, BUF).
- **League baseline:** same filter for all QBs 2013–2023, n = 203,055 targets.
- **Layoff-return games:** games with ≥10 targeted attempts after a gap of ≥8 weeks since Keenum's previous game with any target. (Three canonical "rusty first-starts" are also broken out individually below; one of them — 2021 Week 7 — misses the strict 8-week rule by a hair because of a 3-attempt mop-up appearance the week before, and is flagged.)

---

## Part A — Career target split

| Position group | Keenum share (n=2,270) | League avg 2013–23 (n=203,055) | Delta |
|---|---|---|---|
| WR | **59.6%** | 59.3% | +0.3 |
| TE | **20.4%** | 20.9% | −0.5 |
| RB/FB | **20.0%** | 19.7% | +0.3 |

**Reading:** Keenum is almost exactly league-average in positional targeting across his career. There is **no career-long positional favoritism** — he is not a "TE guy" or a "checkdown guy" relative to the league. His distribution follows his team's personnel and scheme.

### Career top 12 targets

| Player | Pos | Team (main) | Targets | Rec | Yds |
|---|---|---|---|---|---|
| Adam Thielen | WR | MIN 2017 | 145 | 88 | 1,201 |
| Stefon Diggs | WR | MIN 2017 | 106 | 71 | 963 |
| Tavon Austin | WR | LA 2015–16 | 104 | 55 | 447 |
| Andre Johnson | WR | HOU 2013–14 | 102 | 59 | 845 |
| Emmanuel Sanders | WR | DEN 2018 | 98 | 71 | 866 |
| Kyle Rudolph | TE | MIN 2017 | 89 | 60 | 559 |
| Kenny Britt | WR | LA 2016 | 85 | 56 | 953 |
| Courtland Sutton | WR | DEN 2018 | 84 | 41 | 687 |
| Jerick McKinnon | RB | MIN 2017 | 78 | 60 | 465 |
| Lance Kendricks | TE | LA 2015–16 | 69 | 43 | 438 |
| Demaryius Thomas | WR | DEN 2018 | 57 | 36 | 402 |
| DeAndre Hopkins | WR | HOU 2013–14 | 55 | 26 | 395 |

### Per-season team splits (targets: RB/FB | TE | WR)

| Season | Team | RB/FB | TE | WR |
|---|---|---|---|---|
| 2013 | HOU | 40 | 64 | 141 |
| 2014 | HOU | 15 | 6 | 55 |
| 2015 | LA | 18 | 35 | 72 |
| 2016 | LA | 55 | 68 | 196 |
| 2017 | MIN | 118 | 105 | 339 |
| 2018 | DEN | 127 | 108 | 329 |
| 2019 | WAS | 57 | 46 | 139 |
| 2020 | CLE | 1 | 4 | 4 |
| 2021 | CLE | 13 | 15 | 42 |
| 2022 | BUF | 0 | 0 | 7 |
| 2023 | HOU | 11 | 12 | 28 |

---

## Part B — Layoff-return split

### Strict data-driven set: 10 games, n = 323 targets

| Date | Game | Team | Att | Gap since prior action |
|---|---|---|---|---|
| 2013-10-20 | HOU @ KC | HOU | 25 | — (NFL debut as starter) |
| 2014-12-21 | BAL @ HOU | HOU | 41 | 53.0 wks |
| 2015-11-22 | LA @ BAL | LA | 26 | 47.0 wks |
| 2016-09-12 | LA @ SF | LA | 35 | 36.1 wks |
| 2017-09-17 | MIN @ PIT | MIN | 35 | 39.4 wks |
| 2018-09-09 | SEA @ DEN | DEN | 39 | 33.0 wks |
| 2019-09-08 | WAS @ PHI | WAS | 43 | 36.0 wks |
| 2019-12-22 | NYG @ WAS | WAS | 21 | 8.4 wks |
| 2022-01-09 | CIN @ CLE | CLE | 24 | 8.0 wks |
| 2023-12-17 | HOU @ TEN | HOU | 34 | 62.0 wks |

**Return-set position share vs career:**

| Position group | Return games (n=323) | Career | Delta |
|---|---|---|---|
| WR | **62.2%** | 59.6% | +2.6 |
| TE | **20.1%** | 20.4% | −0.3 |
| RB/FB | **17.6%** | 20.0% | −2.4 |

**Reading:** when rusty, Keenum does **not** lean harder on TEs or RB checkdowns at the position level — if anything he is slightly *more* WR-heavy and *less* RB-heavy than his career baseline. The "safety blanket" shows up at the **individual-player** level, not the position level (see below).

### The three canonical rusty first-starts

**1. 2019-09-08 — WAS @ PHI (Wk 1), n=43, first action since 2018-12-30 (36.0-wk gap)**
| Group | Targets | Share |
|---|---|---|
| RB/FB | 13 | 30.2% |
| WR | 22 | 51.2% |
| TE | 8 | 18.6% |
Top targets: **Chris Thompson (RB) 10**, Vernon Davis (TE) 7, Terry McLaurin (WR) 7, Paul Richardson (WR) 7.
→ The one clear outlier in the whole study: RB checkdown share spiked to 30% (vs 20% career). Thompson took 23% of all targets.

**2. 2021-10-21 — DEN @ CLE (Wk 7), n=32, first start since 2019-12-29**
(Caveat: 3 mop-up attempts on 2021-10-17 vs ARI keep this out of the strict ≥8-wk set; it is the canonical "first start since 2019" game.)
| Group | Targets | Share |
|---|---|---|
| WR | 19 | 59.4% |
| TE | 7 | 21.9% |
| RB/FB | 6 | 18.8% |
Top targets: **Jarvis Landry (WR) 8** (5 rec), Odell Beckham Jr. (WR) 6, Anthony Schwartz (WR) 3, Austin Hooper (TE) 3, Demetric Felton (RB) 3, Duke Johnson (RB) 2, David Njoku (TE) 2.
→ Landry — the slot receiver — took 25% of targets and was the clear blanket. (Note for the tracker: David Njoku is now on the Chargers, not the Browns.)

**3. 2023-12-17 — HOU @ TEN (Wk 15), n=34, first meaningful action since 2021**
(62.0 wks since his last target — 5 mop-up attempts for BUF on 2022-10-09; ~102 wks since his last 10+-attempt game, 2022-01-09.)
| Group | Targets | Share |
|---|---|---|
| WR | 21 | 61.8% |
| RB/FB | 7 | 20.6% |
| TE | 6 | 17.6% |
Top targets: **Noah Brown (WR) 11** (32% share), Dalton Schultz (TE) 5, Robert Woods (WR) 5, Devin Singletary (RB) 5.
→ Noah Brown was the overwhelming blanket — nearly a third of all targets.

### Other notable return games
- **2022-01-09 — CIN @ CLE (Wk 18, season finale start, 8.0-wk gap), n=24:** Jarvis Landry 8 (33%), Donovan Peoples-Jones 4, Anthony Schwartz 3, Harrison Bryant (TE) 3.
- **2019-12-22 — NYG @ WAS (Wk 16, re-start after Haskins benching, 8.4-wk gap), n=21:** Steven Sims (WR) 7, Kelvin Harmon (WR) 3, Chris Thompson (RB) 3, Terry McLaurin (WR) 3.

### Return-set top targets (10 games)

| Player | Pos | Targets |
|---|---|---|
| Andre Johnson | WR | 19 |
| Tavon Austin | WR | 17 |
| DeAndre Hopkins | WR | 16 |
| Chris Thompson | RB | 13 |
| Kenny Britt | WR | 11 |
| Noah Brown | WR | 11 |
| Emmanuel Sanders | WR | 11 |
| Demaryius Thomas | WR | 10 |
| Terry McLaurin | WR | 10 |
| Garrett Graham | TE | 8 |
| Jarvis Landry | WR | 8 |
| Steven Sims | WR | 8 |

---

## Alignment notes (general football knowledge, flagged — NOT in nflverse pbp)

- Jarvis Landry (2021 blanket) is a career **slot** receiver; Odell Beckham Jr. played **X** for that Browns team.
- Chris Thompson (2019 blanket) was Washington's dedicated **receiving/third-down RB**.
- Noah Brown (2023 blanket) played primarily **X/Z outside** for Houston; Dalton Schultz was the inline **Y tight end**; Robert Woods worked **slot/Z**.
- Career-wise Keenum's top target Adam Thielen was a **slot** WR and Stefon Diggs the **X** in the 2017 Vikings offense; Kyle Rudolph the inline TE; Jerick McKinnon the receiving RB.
- Pattern: the blanket is whoever owns the most separation-friendly role in that specific offense (slot, receiving RB, or the WR1) — it is **not a fixed position for Keenum**.

---

## Caveats

1. Targeted attempts only — throwaways, spikes, and sacks excluded.
2. No alignment (slot/X/Y) data exists in nflverse pbp; alignment notes above are from general knowledge.
3. Small samples: the return set is 323 targets across 10 games; each individual rusty start is one game (32–43 targets). Single-game variance dominates — treat the pattern as suggestive, not predictive.
4. Team/scheme confounds are large: the blanket follows the roster (Gruden's WAS, Stefanski's CLE, Ryans/Slowik's HOU), not Keenum himself.
5. Keenum has not played since 2023-12-24 and is now 38; the 2026 Bears offense (Ben Johnson scheme) has no Keenum history to draw on.
6. "First start since" labels verified from the game log in the data (previous game with any Keenum target / with 10+ attempts).
