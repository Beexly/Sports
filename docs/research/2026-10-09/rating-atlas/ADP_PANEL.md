# ADP_PANEL.md — rankings ADP panel diagnostic (TRANSFER only)

Research diagnostic. Not a pick, not a model input, not a rating. Status:
**TRANSFER** — the panel is moved between surfaces as a display diagnostic;
weights may be estimated on our data and may be zero.

## Sources (public, harvest later per-lane)

- MFL export API (MyFantasyLeague — public export endpoints, keyless)
- FantasyFootballCalculator ADP (public pages/API)
- FantasyPros consensus ADP (HTML; browser or scraping lane)
- Sleeper ADP (public API endpoints)
- DK best-ball ADP (via the DK recipe lane, same shape as the DK odds recipe)
- Underdog best-ball ADP (login-walled lane; see UNDERDOG_NOTE in books_api.py)

## Legal unit (the only thing this panel may express)

- Per-player **ADP spread** across sources (max − min, or stdev across sources).
- Per-player **z-deviation** from the cross-source mean: (source ADP − mean) / sd
  of the sources for that player.

Both are statements about WHERE SOURCES DISAGREE on a player. That is all.

## Illegal unit (do not do this)

- ADP as an input to win probability, μ, margin, totals, or any rating head.
- ADP-as-talent: a ranking is a popularity/league-format artifact, not a skill
  measurement. It contains no market close, no residual, and no situational
  fact the close lacks.
- Best-ball ADP is a contest-format artifact (punt strategies, position runs);
  it is not a season-long projection and must never be blended into one.

## Status and honesty rules

- TRANSFER: the panel may move between surfaces as a labeled diagnostic.
- Weights: estimated on our data if ever used beyond transfer; may be zero.
- No code in this packet feeds ADP into any rating, margin, win-probability,
  or pick path. This file is documentation only — there is deliberately no
  harvester here yet; lanes land per-source with the warehouse key rule
  (observed_at <= decision time) like every other lane.
