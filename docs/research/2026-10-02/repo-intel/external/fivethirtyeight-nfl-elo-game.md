# fivethirtyeight/nfl-elo-game

**Stars:** 350 | **License:** MIT | **Pushed:** 2023-05-02 | **Language:** Python | **Forks:** 444

## 1. Vision
Democratize NFL forecasting evaluation: ship FiveThirtyEight's actual Elo model *plus* a century of game data (scores back to 1920 with `elo_prob1` per game) and an `eval.py` harness so anyone can test their own forecast against Elo under the real rules of 538's forecasting game. It exists to answer "can you beat Elo?" with evidence.

## 2. The Ask
- Python; clone and run `python eval.py` — zero API keys, zero feeds.
- Your alternative forecast goes in `forecast.py` (the worked example: tweak the `HFA` home-field-advantage parameter and watch your score change).
- Optional: uncomment three lines in `Util.read_games` to pull the 2021 schedule/results for current-season forecasting.
- Assumes you accept Elo's framing: single-number team strength, margin-of-victory multiplier, regression to the mean.

## 3. Constraints
- **MIT — adoptable.**
- **Data frozen in time:** the repo's live season is 2021; `nfl_games.csv` ends where 538's public game left off. The *method* is timeless, the bundled data is stale.
- **Maintenance:** pushed 2023-05-02 — 538's sports operation itself was wound down; no updates coming.
- Elo is a team-strength rating, not a player-level model: blind to injuries, depth charts, weather, coaching. It is a baseline, not an engine.

## 4. GSE lens
- **GSE has no Elo baseline and no forecast-evaluation harness — this repo is both, MIT-licensed, sitting in public.** The `eval.py` pattern (your probabilities vs Elo's, scored per season back to 1920) is exactly the "benchmark GSE vs the best public models" work Garrett ordered on 2026-09-17. GSE's walk-forward calibration just started; it has no published baseline to beat and no harness to prove it.
- **The worked example is a calibration lesson in miniature:** changing HFA from 65 to 100 *loses* points historically (648.24 → 603.42). That's the discipline GSE's calibration lane needs — every parameter tweak scored against history, not vibes. GSE currently has no enforcement tooling (no claim-matrix, no manifest checks); this is the shape of the missing harness.
- **Elo as internal reasoning fuel fits the NGS doctrine:** like NGS data, Elo ratings are a compact, public, non-proprietary signal that can feed GSE's internal reasoning without ever touching the public site. A maintained Elo stream is a cheap, honest prior for every game-level prediction.
- No manufactured gap: Elo won't beat a wired 47-signal engine; its job is to be the floor GSE must clear.

## 5. Verdict
**ADOPT** (MIT) — adopt the Elo implementation as GSE's permanent public baseline and the `eval.py` harness pattern as the seed of GSE's forecast-evaluation tooling. Refresh the game data from nflverse (the bundled CSVs are 2021-frozen); keep the method.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/fivethirtyeight/nfl-elo-game
- gitdiagram: https://gitdiagram.com/fivethirtyeight/nfl-elo-game
- star-history: https://star-history.com/#fivethirtyeight/nfl-elo-game (350 stars)
- github.dev: https://github.dev/fivethirtyeight/nfl-elo-game
