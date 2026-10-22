## PART 5 — PFR FULL MAP (seven surfaces, one ID system)

PFR is the only free source with coherent, linked person-level history: player ↔ team ↔ coach ↔ official ↔ game, all one ID system. Combined with FTN charting, nflfastR pbp, DK ladders, and MFL/FFC ADP, this is the complete public substrate.

| Surface | What it gives | Engine it feeds |
|---------|---------------|-----------------|
| Player pages | Advanced rushing/receiving: YBC, YAC, broken tackles, ADOT, drops, INT-when-targeted, pass-rating-allowed + defense + snap counts | OL-vs-RB attribution, coverage adjacency, usage engine |
| Team season pages | Game-by-game PFR's own expected points (exp_pts_off/def/st) + full box stats | Independent EP archive — validates our EPA spine |
| Boxscores | Named official crews, stadium, weather, Vegas line (older seasons in HTML comments) | Referee-environment engine + closing-line archive + venue context |
| Coach pages | Per-year W/L, SRS offense/defense splits, playoffs, challenge counts per coach-year | Tenure/hot-seat table, DC aggression, coaching-behavior features |
| Draft pages | Pick/age/college/career-AV | Capital engine (draft capital gradients) |
| CFB sibling | sports-reference.com/cfb, same structure | Separate college model substrate (no NFL constant port) |
| Officials / crews | From boxscores | Referee-environment engine |

Status: full browser-lane recipe and crawler skeleton in `PFR_PULL_RECIPE.md`. Next concrete step is the polite crawler (60 key players first, then teams/coaches/boxes).

All rows land as diagnostics. None write a coefficient onto the NFL margin head. μ stays the close.

## QUEUE (updated)

1. Run `python3 novig_ingest.py` and land first sample rows. Confirm leakage rule holds.
2. Execute PFR pull on 10–20 key players (player surface) using the recipe. Produce diagnostic JSONL.
3. Expand crawler to team / box / coach / draft surfaces (polite, 1.5–2.5 s delay).
4. FTN 2025 fingerprint pass (play-action / RPO / motion / blitz EPA lifts).
5. ADP panel diagnostic table (z-deviations only).
6. Document Caesars / BetMGM / Fanatics as browser-lane recipes. No live shell fetch that 403s.

College slate is not scored from this packet. No NFL constants are ported. No MODEL_VERSION bump. No prediction is written.

The warehouse is ready. The next rows that land are the intelligence.