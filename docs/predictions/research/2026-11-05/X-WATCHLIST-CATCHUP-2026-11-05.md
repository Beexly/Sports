# X Watchlist Catch-Up — 2026-11-05

Captured from the logged-in automation Chrome session (CDP 9222) at 2026-11-05.
Raw JSON: `data/research/x_watchlist_pass_2026_11_05.json` (per-account posts with timestamps).

## @PattonAnalytics (@StatRankings)

- 2026-11-05: "Imagine drafting Leonard Williams AND Quinnen Williams, only to trade them both away."
- 2026-11-05: "The only QBs responsible for the majority of their own sacks? Won the last two Super Bowls."
- 2026-11-05: "Brock Bowers is whatever the offense needs him to be."
- 2026-11-04: "Gregory Rousseau already has as many sacks this season (7) as he had all of last year."

## @StatsHubCom

Soccer-focused account this cycle (Europa League and Champions League prop trends). No NFL TNF content in the captured window.

## @Timo_NFL

- 2026-11-04: Week 9 playoff leverage for each team; clear top 7 in the AFC, more diverse NFC field.
- 2026-11-04: "70-75% chance that one of those 7 teams misses the playoffs" - same shape as the NFC three years ago when Seattle and Minnesota fell off and Green Bay and Los Angeles surged.
- 2026-11-04: Bears vs Saints route-target map; the two offenses attack opposite areas.
- 2026-11-04: Chris Olave route depth tilts with alignment (deeper from left, shallower from right).
- 2026-11-04: QB sneak remains efficient against a front that knows it is coming.

## @nfl_simulator

- 2026-11-03: Net lucky wins through Week 8 (actual wins minus modeled win likelihood). Luckiest: DEN +2.5, MIN +2.3, CHI +1.8. Unluckiest: NYJ -3.0, HOU -1.9, LAC -1.5. Data: nflverse.
- 2026-11-03: CHI 34, SEA 17, Week 8; Deserve-to-Win CHI 91% / SEA 9%.
- 2026-11-02: WAS 27, PHI 10; Deserve-to-Win PHI 12% / WAS 88%.
- 2026-11-02: NE 24, MIA 19; Deserve-to-Win NE 80% / MIA 20%.

## @run_the_sims

- 2026-11-05: Jaxon Smith-Njigba on pace for the receiving-yards record in 16 games; 985 yards through 8 (123 per game), needs 109 per game to break it in 17.
- 2026-11-05: Fast starters' receiving yards per game decline after Week 8 - the other seven on the list fell from 121 to 79 yards per game (34% drop); Calvin Johnson rose to 96 in the second half.
- 2026-11-04: "Luckiest team in the NFL since 2018 is the Steelers: +984 win probability points from luck and penalties in the regular season, 1.7x the next team." Chiefs go from one of the unluckiest regular-season teams to the luckiest in the postseason; Steelers the opposite; Patriots last and still won a Super Bowl.
- 2026-11-04: Explicitly not a conspiracy claim - strategy plus luck.

## @HaydenWinks

- 2026-11-05: Initial QB, TE, K, DEF charts and rankings.
- 2026-11-05: Four games above 50.0 projected points.
- 2026-11-05: "No Mike Evans (achilles) coming off the bye."
- 2026-11-03: Live Stats vs. Film.

## @SumerSports

- 2026-11-05: "The Jaguars are good at everything."
- 2026-11-04: Eagles QB arm strength - median release 47.2 MPH (2nd), top-10% release 53.9 MPH (2nd), throws at 55+ MPH 4.8% (3rd).
- 2026-11-04: "This is a good match for Zay Flowers. Jacoby Brissett throws over the middle 34.8% of the time (roughly the same as the Ravens this season) and he's completed 76.8% of those passes. Zay Flowers over the middle: 29 targets (3rd among WRs), 22 catches (T-2nd), 339 yards (4th)."

## What changed in the TNF read

- The 34.8% / 76.8% MOF figures are **Jacoby Brissett's QB-level over-the-middle rates**, not a team-level pass-location share. The reproduction's 25.81% team MOF share and 64.06% completion rate use `pass_location == "middle"`, a narrower definition, so the two are not directly comparable.
- Flowers' published MOF line (29 targets, 22 catches, 339 yards) also differs from the pass-location count (22 targets, 14 catches, 258 yards) for the same definitional reason.
- The Steelers +984 luck points since 2018 gives the F8 claim a source-level anchor, but it is the author's model, not reproducible from local data.
