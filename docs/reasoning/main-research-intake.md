# What landed on main, and what actually entered the engine

Five research commits hit `origin/main` after a local sweep. Docs on main are not a wired path. This is what was usable.

| Landed | Verdict | Engine |
|---|---|---|
| `dfs-week3/DKSalaries-Week3-SunMon.csv` | Official DraftKings salaries | **Used.** Replaced the scraped HTML salaries. |
| `dfs-week3/run.ts` + `package.json` + the double-stack patch | Separate research harness. Projection is `0.6×DK APPG + 0.4×prop-implied`. Weather multipliers of 0.90–0.95. Role multipliers of 0.90–1.15. | **Not used.** That is a second model. The engine already has its own projection, its own tackle fit, and a wind coefficient that did not clear noise. Porting `run.ts` would replace the composite with two-game DK averages. |
| `dfs-week3/lineups.json` and the GPP writeup | Lineups priced with a different projection (Coker 25.7, Young 29.8) | **Not used.** Those numbers are not this engine. |
| `symbolic-regression/` Target A (play EPA from pre-snap) | Holdout R² **-0.022** vs a mean of 0 | **Null.** No formula was wired. |
| `whalelay-lab/` | Parlay-angle scripts | Research only. No parlay is published. |
| `creator-intel/` Artem transcripts | Content pipeline | Not a game signal. |
| `improve-ledger-work/` batch digests | Coordinator notes | Notes. Not coefficients. |

The lineup on this branch spends **49,900** on the official file. Projection **126.77**. Stack is Stafford with Kyren Williams and Davante Adams. That is construction sitting on top of the same half-PPR number the rest of the engine uses.
