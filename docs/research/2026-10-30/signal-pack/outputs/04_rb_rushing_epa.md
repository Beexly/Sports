# Signal 4 — RB rushing EPA / attempt leaderboard

Method: @boxscorescout RB rushing EPA/attempt chart from Garrett's
Oct 30 phone-feed video ("all 39 qualified RBs"). Window: Weeks 1-7,
nflverse play-by-play, designed runs only (rush_attempt == 1, 2pt
excluded), roster-listed RBs.

**Check vs the post — qualification count MATCHES.** The chart states
39 qualified RBs; from public data, min 45 attempts yields
exactly 39 qualified RBs this window (a 50-attempt floor yields
the same 39 — no RB sits between 45 and 50 attempts). Per-player
values were chart-image only, so no numeric check beyond the count is
possible; the leaderboard below is computed, not copied.

Top 8:

| rank | rb | team | att | epa_per_att | success_rate |
|---|---|---|---|---|---|
| 1 | C.McCaffrey | SF | 84 | 0.144 | 0.536 |
| 2 | B.Corum | LA | 64 | 0.136 | 0.531 |
| 3 | J.Williams | DAL | 110 | 0.104 | 0.473 |
| 4 | C.Hubbard | CAR | 96 | 0.104 | 0.49 |
| 5 | J.Warren | PIT | 102 | 0.098 | 0.461 |
| 6 | K.Monangai | CHI | 60 | 0.097 | 0.417 |
| 7 | K.Walker | KC | 120 | 0.096 | 0.45 |
| 8 | O.Gordon | MIA | 72 | 0.059 | 0.375 |

Bottom 3:

| rank | rb | team | att | epa_per_att | success_rate |
|---|---|---|---|---|---|
| 37 | A.Jeanty | LV | 106 | -0.305 | 0.311 |
| 38 | D.Montgomery | HOU | 52 | -0.345 | 0.25 |
| 39 | M.Lloyd | GB | 54 | -0.349 | 0.315 |

Full table: `04_rb_rushing_epa.csv` (39 RBs).
