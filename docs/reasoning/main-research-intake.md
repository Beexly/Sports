# What landed on main, and what actually entered the engine

Five research commits hit `origin/main` after a local sweep. Docs on main are not a wired path. This is what was usable.

| Landed | Verdict | Engine |
|---|---|---|
| `dfs-week3/DKSalaries-Week3-SunMon.csv` | Official DraftKings salaries | **Used.** Replaced the scraped HTML salaries. |
| `dfs-week3/construction-rules.ts` | GPP wants QB + two teammates, avoid TE at flex | **Used as a construction bonus**, not as added fantasy points in the projection. |
| `dfs-week3/lineups.json` and the GPP writeup | Lineups priced with a different projection (Coker 25.7, Young 29.8) | **Not used.** Those numbers are not this engine. |
| `symbolic-regression/` Target A (play EPA from pre-snap) | Holdout R² **-0.022** vs a mean of 0 | **Null.** No formula was wired. |
| `whalelay-lab/` | Parlay-angle scripts | Research only. No parlay is published. |
| `creator-intel/` Artem transcripts | Content pipeline | Not a game signal. |
| `improve-ledger-work/` batch digests | Coordinator notes | Notes. Not coefficients. |

The lineup on this branch spends **49,900** on the official file. Projection **126.77**. Stack is Stafford with Kyren Williams and Davante Adams. That is construction sitting on top of the same half-PPR number the rest of the engine uses.
