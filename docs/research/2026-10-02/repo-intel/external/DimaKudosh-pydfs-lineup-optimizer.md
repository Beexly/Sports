# DimaKudosh/pydfs-lineup-optimizer

**Stars:** 449 | **License:** MIT | **Pushed:** 2024-03-01 | **Language:** Python | **Forks:** 167

## 1. Vision
Be the universal, pip-installable lineup optimizer library for daily fantasy sports: one API (`get_optimizer(Site, Sport)`) that builds salary-cap-optimal lineups for every major DFS site and sport, from NFL to CS:GO. It exists to make lineup optimization a solved commodity — you bring the player pool, it returns optimal lineups, no contest theory required.

## 2. The Ask
- A CSV of the player pool (names, positions, teams, salaries, projections) — typically the site's own salaries export.
- Python + PuLP (bundled LP solver); no API keys, no accounts, no live data.
- User supplies projections themselves; the library optimizes against whatever numbers it is given.
- Assumes the user already knows the contest's roster rules (encoded as `Site`/`Sport` rule sets).

## 3. Constraints
- **MIT license** — adoption is legally clean with attribution.
- **Maintenance:** last pushed 2024-03-01 — quiet for ~2.5 years. Not dead, but not keeping pace with site rule changes.
- No live slate feed, no ownership data, no contest-structure awareness, no GPP simulation — it maximizes projected points under a salary cap, which is cash-game math, not tournament math.
- Scale ceiling: single-process PuLP solves; generating 150 unique GPP lineups means 150 sequential solves (fine, but not a mass-entry engine).

## 4. GSE lens
Brutal and direct: this is a better-engineered optimizer than GSE's current one, and it is *still* insufficient for what GSE needs. Two gaps it exposes:
- **GSE's optimizer has no live slate feed and falls back to a sample slate.** pydfs assumes the user hands it a real player pool CSV. If GSE adopted this library tomorrow, the optimizer would still be fed garbage — the bottleneck is the feed, not the solver. Adopting the solver without the feed is polishing the wrong end.
- **Point-maximization is not GPP construction.** pydfs returns "the optimal lineup" — but Garrett's own 2026-09-25 research doctrine says winning large-field GPP lineups are built from ownership leverage, stacking, and correlation, not raw projection maximization. GSE needs a *tournament* optimizer (see chanzer0/NFL-DFS-Tools, RobustDFS); pydfs is the cash-game baseline to beat, not the target.

## 5. Verdict
**ADOPT** (MIT, attribution) — as the solver core *after* the live slate feed exists. Rebuild around it: GSE projections in, slate-aware player pool in, stacking/ownership constraints on top. Do not adopt it as a standalone answer to DFS.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/DimaKudosh/pydfs-lineup-optimizer
- gitdiagram: https://gitdiagram.com/DimaKudosh/pydfs-lineup-optimizer
- star-history: https://star-history.com/#DimaKudosh/pydfs-lineup-optimizer (449 stars)
- github.dev: https://github.dev/DimaKudosh/pydfs-lineup-optimizer
