# DevanshDaxini/Sports-EV-Bot

**Stars:** 11 | **License:** NONE (no license file) | **Pushed:** 2026-05-26 | **Language:** Python | **Forks:** 7

## 1. Vision
A live +EV prop-betting engine: train XGBoost/LightGBM ensembles to project player stats, scrape live lines (PrizePicks) and live odds (FanDuel), and surface only the plays where the model's projection *and* the market-implied probability agree there's an edge. Three layers — AI scanner, odds scanner, super scanner — usable alone or combined.

## 2. The Ask
- Python 3.10+; `ODDS_API_KEY` from the-odds-api.com (**paid credits per call**; cached 10 min).
- First-time build per sport: download game logs (nba_api / Sackmann data), engineer features (451 per NBA player-game), train 21 NBA + 7 tennis ensemble models (~10 min, Optuna-tuned, TimeSeriesSplit).
- PrizePicks partner API (free, no key); ESPN/CBS injury scraping (no key).
- Run `python main.py`, pick a sport and a scanner.

## 3. Constraints
- **No license = study-only.** Cannot copy code.
- **Alive:** pushed 2026-05-26; actively developed.
- **NBA + tennis only — no NFL.** The architecture ports; the models don't.
- Real operating costs: odds-API credits, compute for training, and the nba_api resilience layer exists because `stats.nba.com` flakes constantly — every external feed is a reliability negotiation.
- Backtest honesty is partial: directional accuracy vs the PrizePicks line is reported per target (e.g. PTS 60.2%), but there's no published walk-forward P&L.

## 4. GSE lens
This is the most uncomfortable comparison in the sweep, because **their props lane is live and GSE's is shadow-only:**
- **They ship the full loop GSE hasn't built:** train → project → fetch market lines → vig-strip → compare → rank by edge → grade the backtest. GSE's props lane is "shadow-only with honest model-prob sourcing" still unresolved — meaning GSE can't even *state* its model probability cleanly, while this repo is already ranking plays by it.
- **The feature engineering is the bar:** 451 features per player-game (rolling EWMs, streak/consistency signals, opponent-allowed-by-position, expected possessions from pace×usage, rest/schedule density, 1H splits) with explicit leakage prevention (target game's stats excluded from all windows). GSE's 47-signal registry has zero producers — this is what a *populated* signal registry looks like in one sport.
- **The super-scanner's agreement rule is a calibration discipline:** only surface plays where the AI projection and the market-implied probability agree on the same side, with confidence weighted by stat volatility. That's a publish-gate philosophy GSE's lanes lack (no enforcement tooling exists yet).
- **Line-difference handling is a real engineering detail:** log-scaled probability adjustment per stat with per-stat caps when PrizePicks and FanDuel lines disagree. GSE will hit this exact problem the day its props lane goes live.
- No manufactured gap: it's NBA/tennis, and GSE's lane is NFL. The gap is architectural and operational, not sport-specific.

## 5. Verdict
**REBUILD** — no license blocks adoption, and it's the wrong sport to copy anyway. Rebuild the architecture as GSE's NFL props engine: the three-scanner layering, the agreement-gate, the vig-stripping, the per-stat line-difference math, and the leakage-proof feature windows. Highest-priority REBUILD in the betting category.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/DevanshDaxini/Sports-EV-Bot
- gitdiagram: https://gitdiagram.com/DevanshDaxini/Sports-EV-Bot
- star-history: https://star-history.com/#DevanshDaxini/Sports-EV-Bot (11 stars)
- github.dev: https://github.dev/DevanshDaxini/Sports-EV-Bot
