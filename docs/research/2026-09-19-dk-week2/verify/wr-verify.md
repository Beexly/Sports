# WR Lane — Verification Ledger (2026-09-19)

Every material claim in wr-phase1/2/3 with source, date, and verification status.
Statuses: CONFIRMED (2+ independent sources or 1 official) / SINGLE (one source) / UNVERIFIED /
OVERTURNED (later reporting reversed it) / STALE (source predates final reports).

## Salaries & projections
| Claim | Source(s) + date | Status |
|---|---|---|
| DK salaries from DK Network Week 2 WR table | dknetwork.draftkings.com, published 9/15/26 | CONFIRMED (cross-checked vs Huddle 9/19 — all checked values agreed) |
| DK API direct scrape attempted | api.draftkings.com 9/19 ~15:08 — SPO117 Bad Request; retry w/ browser headers → Akamai Access Denied | CONFIRMED (failure preserved; salaries NOT scraped) |
| Cross-check vs The Huddle DFS table | thehuddle.com, published 9/19/26 | CONFIRMED |
| FantasyPros consensus projections | fantasypros.com/nfl/projections/wr.php, consensus updated 9/18/26 | SINGLE (as cited in P1) |
| DK Network projected DK points | dknetwork.draftkings.com 9/15/26 | SINGLE (as cited in P1) |
| IND@KC salaries are SNF Showdown pool, NOT Sunday Main | DK Network footnote 9/15/26: "Salary from a non-Sunday DraftKings slate..." | CONFIRMED (explicit footnote text) |

## Injuries — final statuses
| Player | Status | Source + date | Status |
|---|---|---|---|
| Nico Collins (HOU) | OUT, hamstring | Texans final report 9/18 (nbcsports, cincinnati.com) | CONFIRMED |
| Zay Flowers (BAL) | DOUBTFUL, hamstring | Ravens final report 9/18 (ravenswire); SaintsWire final 9/18 | CONFIRMED |
| Ladd McConkey (LAC) | QUESTIONABLE, ribs | Chargers final report 9/18 (chargerswire) | CONFIRMED |
| Michael Pittman Jr. (PIT) | QUESTIONABLE, foot | Steelers final report 9/18 (steelersdepot) | CONFIRMED |
| Chris Olave (NO) | QUESTIONABLE, hamstring | Saints final report 9/18 (saintswire; louisianasports.net) | CONFIRMED |
| Rome Odunze (CHI) | HEALTHY — no designation | Heavy.com 9/16; VikingsWire 9/18 ("Bears didn't list anyone") | CONFIRMED — P1's SBR 9/17 Q tag was STALE, OVERTURNED |
| Jalen Coker (CAR) | NO designation (full Fri) | TheFalconsWire final report 9/18 | CONFIRMED — P1 Q tag OVERTURNED |
| Brian Thomas Jr. (JAX) | Cleared, will play | NBC Sports 9/18; Jaguarswire 9/18 | CONFIRMED — P1 UNVERIFIED tag resolved bullish |
| Jakobi Meyers (JAX) | Cleared, will play | NBC Sports 9/18 | CONFIRMED |
| Jalen McMillan (TB) | QUESTIONABLE, knee ("truly questionable") | NBC Sports 9/18 | CONFIRMED |
| Jauan Jennings (MIN) | OUT (personal/family matter, non-injury) | VikingsWire 9/18 (O'Connell); Heavy.com 9/18 | CONFIRMED — P1 VERIFY flag resolved |
| Kyler Murray (MIN) | OUT, concussion → Wentz starts | VikingsWire 9/18 (O'Connell); fantasynerds 9/18 | CONFIRMED |
| Tua Tagovailoa (ATL) | DOUBTFUL, oblique → Rush starts | NBC Sports 9/18 (official game designations) | CONFIRMED |
| Michael Penix Jr. (ATL) | OUT, knee | NBC Sports 9/18 (official); AtlantaFalcons.com via USA Today 9/18 | CONFIRMED — P1's "returned to practice, monitor" overtaken |
| Cooper Rush (ATL) | OFFICIALLY named Wk2 starter | NBC Sports 9/18; PanthersWire 9/18 (Stefanski) | CONFIRMED |
| Rush Wk1: 12/22-143-1-2, 3.5 air yds/att, 51.9 rating (lowest among starters) | Fox5 Atlanta 9/18 | SINGLE |
| Omar Cooper Jr. (NYJ) | OUT, multi-week (high ankle) | USA Today 9/17; NBC Sports 9/15 | CONFIRMED |
| Minkah Fitzpatrick (NYJ) | OUT, groin | fantasynerds 9/18 | SINGLE |
| Billy Bowman Jr. (ATL CB) | OUT, Achilles | NBC Sports 9/18 | CONFIRMED |
| A.J. Terrell (ATL CB) | QUESTIONABLE, expects to play | TheFalconsWire 9/18 | SINGLE |
| Jalen Carter (PHI) / Cooper DeJean (PHI) | Cleared, will play | NBC Sports 9/18 | SINGLE |
| Jordan Mason (MIN RB) | IR | cedisports 9/18 | SINGLE (RB-lane note) |
| A.J. Brown (NE) | IR, high ankle | AP via Netscape 9/11 | SINGLE (as cited in P1) |
| Ja'Kobi Lane (BAL) | IR, fractured wrist | heavy.com 9/18 | SINGLE (as cited in P1) |
| Brock Bowers (LV) | OUT, knee (TE) | sicscore.com 9/18 | SINGLE (as cited in P1) |
| Sam Darnold (SEA) | OUT, hip → Drew Lock starts | sportsbookreview.com 9/17 | SINGLE (as cited in P1) |
| Alec Pierce (IND) | Q tag per DK Network 9/15 (SNF) | DK Network 9/15 | UNVERIFIED vs official |
| Tory Horton (SEA) | Q tag per DK Network 9/15 | DK Network 9/15 | UNVERIFIED vs official |

## Matchup / usage claims (internal corpus, 9/17–9/18)
| Claim | Source | Status |
|---|---|---|
| Parker Washington Wk1: 0.40 TPRR, 5.53 YPRR, 26.1% share, 62.5% routes | sumerpass-wr-leaderboard-week1.csv 9/17 | SINGLE (internal table) |
| Only P. Washington earned 3+ targets on JAX in Wk1 | fantasydata.com 9/18 | CONFIRMED (2nd source) |
| Watson Wk1: 8 tgts/6/147; Golden 12 tgts/30% share; Reed 7 tgts | gridironinfo-gb-wr-usage-week1.csv 9/18; SI 9/18 | CONFIRMED |
| Love 78.6% first-read (highest); Lock 64.0%; Stroud 62.2% + 21% aggr | qb-read-progression / qb-aggressiveness csvs 9/17 | SINGLE (internal tables) |
| Coker Wk1 8-138-2; last 9 gms 43/600/6 > McMillan | FantasyPros/Fitzmaurice 9/18; sportradar box 9/13 | CONFIRMED |
| CB Wk1 passer-rating-allowed figures | passer-rating-allowed-week1.csv 9/17 | SINGLE — DOWNGRADED to tiebreak (1-game sample) |
| YPRR: JSN 3.79, Watson 2.85, Burden 2.79, London 2.52, Diggs 2.51 | scottbarrett-yprr-elite-2025-26.csv 9/18 | SINGLE (internal table) |
| Separation: Ayomanor 0.111, Burden 0.083, Egbuka 0.069, McMillan -0.108 | devyeusuf-separation-score-2ndyear-wr-2026.csv 9/18 | SINGLE (internal table) |
| Caleb Douglas (MIA): 90% snaps, 5-7-94 in debut | RotoWire 9/17 | SINGLE |
| Devaughn Vele: "love... solid floors in easier matchups" | The Huddle 9/19 | CONFIRMED (2nd source for Vele thesis) |
| Boutte+Hutchinson outside / Noel slot; "wouldn't trust any in fantasy lineups" | DraftSharks 9/18 | SINGLE |
| Schultz benefits most from Collins absence | NBC Sports 9/18 | SINGLE |
| Weather: CHI gusts 20–30mph; Foxborough washout; Tampa sloppy | SBR weather 9/18; patriotswire 9/18; totalprosports 9/18 | CONFIRMED (multi-source) |

## X-side sweep (public search, 9/17–9/19)
No useful indexed 2026 Week 2 WR content found for: @sfdata9ers, @SumerSports, @ScottBarrettDFB,
@LateRoundQB, @AdamLevitan, @EstablishTheRun, @jmthrivept, @MagicSportsGuy, @ThunderDanDFS.
X itself was not visited (no browser control in this lane). Logged as attempted, not as visited.

## Ownership
UNVERIFIED — RotoGrinders ownership data is premium-gated; public search snippets were stale.
All chalk/leverage language in this lane is inference-labeled, never percentages.
