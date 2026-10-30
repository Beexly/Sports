# Signal 2 — Missed tackles by defense

Method: @sfdata9ers team missed-tackle rankings (post
2115844929247166692, attributed to Pro Football Reference) and
@PattonAnalytics' combined missed & broken tackles chart from
Garrett's Oct 30 phone-feed video. Window: PFR's current advanced-
defense cut (player-level MTkl summed by team, 32 teams).

**Check vs the post — MATCH (endpoints).** Fewest: DET 12
(#1; next team MIN 18 — "fewest by a mile" is literal).
Most: DEN 56, CLE 51,
PHI 49 — the post's worst-three cluster exactly,
with DEN/CLE in adjacent swapped order vs the post (documented in the
Oct 29 repro pass as a one-update-cut difference; today's PFR pull is
byte-identical to the Oct 29 cut that repro verified).

**Gap — broken tackles:** the 'broken tackles allowed' half of
Patton's combined chart has no public team-level source. PFR charts
broken tackles for ball-carriers (season totals, offensive side only);
attributing them to the defense faced requires play-level charting
(FTN/PFF, proprietary). Not faked: this signal ships missed tackles
only, and the combined chart stays documented-not-reproduced.

Fewest missed tackles:

| rank_fewest | team | mtkl |
|---|---|---|
| 1 | DET | 12.0 |
| 2 | MIN | 18.0 |
| 3 | TEN | 23.0 |

Most missed tackles:

| rank_fewest | team | mtkl |
|---|---|---|
| 32 | DEN | 56.0 |
| 31 | CLE | 51.0 |
| 30 | PHI | 49.0 |

Full table: `02_missed_tackles_by_defense.csv`.
