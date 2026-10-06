# rozzac90/pinnacle — 55 stars

## 1. Vision
A Python wrapper for the Pinnacle Sports API — reference data (sports, leagues) and market data (fixtures, odds). Pinnacle is the sharpest book in the market, so a Pinnacle client is the natural odds feed for any serious sports-betting model.

## 2. The Ask
Needs a funded Pinnacle account (username/password for API auth) — the wrapper is useless without one. `pip install pinnacle`.

## 3. Constraints
- License: MIT.
- Scale: 55 stars, but last push 2022-10-27 — four years stale. Pinnacle's API has evolved; an unmaintained wrapper is a breakage risk.
- Maintenance: ABANDONED in practice — no commits in ~4 years.

## 4. GSE lens
GSE already has an active Odds API account (20K credits/mo) — the odds lane is covered, and the props lane is deliberately shadow-only. A stale Pinnacle wrapper adds nothing: it needs a funded Pinnacle account GSE doesn't have, and the code hasn't been touched since 2022. The one honest takeaway is aspirational — Pinnacle is the sharpest line source, so *if* GSE ever wants a sharp-money signal, the path is a fresh Pinnacle integration, not this repo.

## 5. Verdict
IGNORE — stale since 2022, needs a funded Pinnacle account, and GSE's odds lane already runs on The Odds API.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/rozzac90/pinnacle
- GitDiagram: https://gitdiagram.com/rozzac90/pinnacle
- Star history: https://star-history.com/#rozzac90/pinnacle (55 stars)
- github.dev: https://github.dev/rozzac90/pinnacle
