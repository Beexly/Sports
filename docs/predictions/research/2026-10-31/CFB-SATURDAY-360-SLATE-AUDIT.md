# Saturday CFB Week 9 audit — 2026-10-31

Nothing on this page is a bet. 47 FBS games. 47 have a DraftKings line from the ESPN odds page. 0 are for sale.

## What ran

- schedule and pregame Elo from the 2026 games file
- drive yards, points, plays, and scoring rate from completed FBS games before 2026-10-31
- DraftKings spread, total, and moneyline parsed from the ESPN odds page
- multiplicative de-vig on the two-way moneyline only

Drive sample: 566 completed FBS games, 13242 drives, all before 2026-10-31. Saturday rows in the games file are not final. Late Saturday kickoffs are dated 2026-11-01 in UTC and were included.

## What did not run

- 10,000-world pathwise simulation
- snap-by-snap JEV
- cognitive router
- 80-rule situational overlay
- closing-line projection

Every game fails the publish gate because those layers are missing. No $19 card. No $39 day pass.

Elo home win probability is the file pregame Elo with no home-field add. Market home is the two-way moneyline after multiplicative de-vig. A gap is not a published edge.

away @ home | kickoff UTC | elo home | market home | home spread | total | away yds/drive | home yds/drive | decision

UAB @ South Florida | 2026-10-31T16:00Z | 0.7772 | 0.7221 | -7.5 | 41.5 | 31.053 | 30.575 | PASS
Illinois @ Maryland | 2026-10-31T16:00Z | 0.1616 | 0.4486 | 2.5 | 54.5 | 40.739 | 30.3 | PASS
Arizona @ Texas Tech | 2026-10-31T16:00Z | 0.5201 | 0.6164 | -3.5 | 54.5 | 39.457 | 34.632 | PASS
California @ NC State | 2026-10-31T16:00Z | 0.7889 | 0.7258 | -9.5 | 56.5 | 31.612 | 36.737 | PASS
Notre Dame @ Navy | 2026-10-31T16:00Z | 0.0315 | 0.0461 | 30.5 | 56.5 | 41.613 | 38.833 | PASS
SMU @ Syracuse | 2026-10-31T16:00Z | 0.0772 | 0.24 | 10.5 | 58.5 | 40.902 | 37.419 | PASS
Boston College @ Duke | 2026-10-31T16:00Z | 0.7211 | 0.705 | -7.0 | 48.5 | 33.138 | 37.722 | PASS
Wisconsin @ Iowa | 2026-10-31T16:00Z | 0.6888 | 0.5514 | -2.5 | 36.5 | 32.7 | 32.634 | PASS
Bowling Green @ Western Michigan | 2026-10-31T16:00Z | 0.8074 | 0.8223 | -14.0 | 44.5 | 28.976 | 32.699 | PASS
Michigan @ Rutgers | 2026-10-31T16:30Z | 0.1009 | 0.16 | 16.5 | 45.5 | 27.091 | 35.304 | PASS
Auburn @ Ole Miss | 2026-10-31T16:45Z | 0.8119 | 0.7914 | -11.5 | 57.5 | 32.259 | 35.541 | PASS
Marshall @ Old Dominion | 2026-10-31T17:00Z | 0.2575 | 0.4365 | 3.0 | 45.5 | 32.174 | 20.657 | PASS
Coastal Carolina @ Georgia State | 2026-10-31T18:00Z | 0.6254 | 0.6225 | -4.5 | 55.5 | 30.928 | 35.528 | PASS
Kansas State @ Colorado | 2026-10-31T18:00Z | 0.1263 | 0.5514 | -2.5 | 46.5 | 39.889 | 30.444 | PASS
Temple @ East Carolina | 2026-10-31T19:00Z | 0.6851 | 0.6369 | -4.5 | 50.5 | 38.4 | 26.872 | PASS
Louisiana Tech @ South Alabama | 2026-10-31T19:00Z | 0.3653 | 0.3364 | 6.0 | 58.5 | 33.274 | 35.805 | PASS
UConn @ Air Force | 2026-10-31T19:00Z | 0.4257 | 0.5 | -1.5 | 51.5 | 36.588 | 41.909 | PASS
Stanford @ Louisville | 2026-10-31T19:15Z | 0.9609 | 0.9197 | -22.5 | 60.5 | 29.772 | 37.011 | PASS
Northwestern @ Oregon | 2026-10-31T19:30Z | 0.5445 | 0.6092 | -3.5 | 47.5 | 39.269 | 31.527 | PASS
Florida @ Georgia | 2026-10-31T19:30Z | 0.8991 | 0.7819 | -12.5 | 56.5 | 39.123 | 39.361 | PASS
Southern Miss @ UL Monroe | 2026-10-31T19:30Z | 0.2836 | 0.4004 | 3.5 | 55.5 | 32.852 | 26.565 | PASS
Kansas @ TCU | 2026-10-31T19:30Z | 0.5086 | 0.675 | -6.5 | 45.5 | 35.686 | 35.228 | PASS
Arizona State @ BYU | 2026-10-31T19:30Z | 0.7965 | 0.8465 | -16.5 | 48.5 | 31.89 | 36.792 | PASS
UTEP @ North Dakota State | 2026-10-31T19:30Z | 0.9754 | 0.9311 | -24.5 | 42.5 | 23.049 | 31.169 | PASS
Colorado State @ Utah State | 2026-10-31T19:30Z | 0.7523 | 0.705 | -7.5 | 61.5 | 36.86 | 25.867 | PASS
Minnesota @ Indiana | 2026-10-31T19:30Z | 0.9758 | 0.8989 | -20.5 | 40.5 | 27.12 | 38.114 | PASS
Florida International @ Liberty | 2026-10-31T19:30Z | 0.8932 | 0.8173 | -14.0 | 45.5 | 31.462 | 34.427 | PASS
Virginia @ Wake Forest | 2026-10-31T19:45Z | 0.7436 | 0.8043 | -12.5 | 48.5 | 31.904 | 41.04 | PASS
Utah @ Cincinnati | 2026-10-31T19:45Z | 0.1095 | 0.2998 | 7.0 | 56.5 | 41.756 | 38.012 | PASS
New Mexico @ San José State | 2026-10-31T20:00Z | 0.1315 | 0.1684 | 14.5 | 42.5 | 29.373 | 28.443 | PASS
Nevada @ UCLA | 2026-10-31T20:15Z | 0.8179 | 0.9124 | -22.5 | 43.5 | 29.435 | 35.433 | PASS
South Carolina @ Oklahoma | 2026-10-31T20:15Z | 0.5244 | 0.6038 | -3.5 | 44.5 | 37.675 | 28.06 | PASS
Purdue @ Penn State | 2026-10-31T20:15Z | 0.8975 | 0.7572 | -10.0 | 54.5 | 36.815 | 34.293 | PASS
App State @ Georgia Southern | 2026-10-31T22:30Z | 0.5911 | 0.6575 | -5.5 | 57.5 | 31.733 | 35.949 | PASS
Washington State @ San Diego State | 2026-10-31T23:00Z | 0.2686 | 0.5635 | -2.5 | 48.5 | 26.011 | 26.039 | PASS
Clemson @ Florida State | 2026-10-31T23:00Z | 0.609 | 0.6575 | -6.0 | 49.5 | 27.616 | 35.915 | PASS
Oklahoma State @ Iowa State | 2026-10-31T23:00Z | 0.624 | 0.2492 | 9.5 | 57.5 | 45.53 | 30.451 | PASS
Georgia Tech @ Pittsburgh | 2026-10-31T23:30Z | 0.7336 | 0.7221 | -8.5 | 54.5 | 34.808 | 37.0 | PASS
Ohio State @ USC | 2026-10-31T23:30Z | 0.1389 | 0.3194 | 6.5 | 51.5 | 41.225 | 44.321 | PASS
Mississippi State @ Texas | 2026-10-31T23:30Z | 0.8805 | 0.904 | -20.5 | 50.5 | 37.025 | 30.244 | PASS
Miami @ North Carolina | 2026-10-31T23:30Z | 0.0389 | 0.1729 | 14.0 | 53.5 | 45.259 | 31.213 | PASS
Missouri @ Arkansas | 2026-10-31T23:45Z | 0.2083 | 0.24 | 10.0 | 48.5 | 33.236 | 30.744 | PASS
Washington @ Nebraska | 2026-11-01T00:00Z | 0.5897 | 0.718 | -7.5 | 49.5 | 31.953 | 36.963 | PASS
Army @ Memphis | 2026-11-01T00:00Z | 0.5729 | 0.6575 | -6.0 | 59.5 | 41.643 | 42.162 | PASS
Texas State @ Boise State | 2026-11-01T02:00Z | 0.707 | 0.7819 | -10.5 | 63.5 | 43.06 | 41.653 | PASS
Northern Illinois @ UNLV | 2026-11-01T02:30Z | 0.9199 | 0.9124 | -21.5 | 54.5 | 27.867 | 31.702 | PASS
Oregon State @ Fresno State | 2026-11-01T03:00Z | 0.5244 | 0.331 | 6.0 | 58.5 | 44.976 | 30.671 | PASS

## Sources

- Hugging Face 24601p/cfb-data games-2026.parquet and drives-2026.parquet, last_modified 2026-10-26
- Firecrawl scrape of https://www.espn.com/college-football/odds DraftKings widget, fetched 2026-10-30 evening
