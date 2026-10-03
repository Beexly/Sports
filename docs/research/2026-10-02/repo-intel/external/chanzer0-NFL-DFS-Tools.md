# chanzer0/NFL-DFS-Tools

**Stars:** 51 | **License:** NONE (no license file) | **Pushed:** 2025-09-04 | **Language:** Python | **Forks:** 23

## 1. Vision
Win GPPs, not just build valid lineups: a full NFL tournament toolkit — PuLP optimizer *plus* a Monte Carlo GPP simulator that plays your lineups against a simulated field thousands of times and scores them by ROI against the actual contest payout structure. Built with a DFS game-theory collaborator (@bjungwirth); "this simulation toolkit will remain free."

## 2. The Ask
- Python 3.12+, `uv sync` from `pyproject.toml`.
- **User-supplied data, all of it:** `player_ids.csv` (DK/FD salaries export), `projections.csv` (required columns: Name, Position, Team, Salary, Fpts, Own%, StdDev), and `contest_structure.csv` (payouts, copy-pasted from the contest page).
- `config.json`: stack rules, team limits, randomness (0–100), min salary, correlation overrides.
- CLI: `nfl-dfs dk opto 1000 3` (crunch), `nfl-dfs dk sim 58823 10000` (simulate), plus showdown modes for both sites.

## 3. Constraints
- **No license = study-only.** Cannot copy; must re-implement.
- **Alive and modern:** pushed 2025-09-04, uv-based, actively developed pre-2025 season.
- Heavy input burden: projections, ownership, AND standard deviations are all BYO — the tool is only as good as your projection source. No live feed; CSVs in, CSVs out.
- Simulation is computationally heavy (10k iterations × field size); needs a real machine, not a free-tier function.

## 4. GSE lens
This is the repo that makes GSE's DFS lane look thinnest, and it's the one Garrett's 2026-09-25 GPP research directive points at most directly:
- **GSE has no GPP simulator at all.** chanzer0's sim doesn't just optimize — it *scores lineups by ROI against the real payout structure*, with empirically fitted score distributions per position/projection window (gamma, lognormal, Weibull, skew-normal, ex-Gaussian), Gaussian-copula correlations with Iman–Conover reordering, and heavy-tail guardrails. GSE's optimizer doesn't simulate; it can't tell a +ROI tournament lineup from a cash lineup.
- **Ownership and StdDev are first-class inputs here; GSE has neither wired.** The projections CSV requires `Own%` and `StdDev` columns. GSE's 47-signal registry has zero producers — ownership and projection-uncertainty signals don't exist yet, and this repo shows they're not optional for GPP work, they're the input schema.
- **Contest-structure-aware scoring is the missing layer.** `sim cid` reads the actual contest's payouts and entry fee to compute ROI. GSE's DFS process system talks about contest work but the optimizer has no notion of payout structure.
- The methodology (distribution fitting + copula correlation + field simulation) is the re-implementation target for GSE's GPP engine.

## 5. Verdict
**REBUILD** — no license blocks adoption. Rebuild the method as GSE's own: the opto/sim split, the fitted-distribution + copula simulation core, and the contest-structure ROI scoring. This is the single highest-value DFS methodology find in the sweep.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/chanzer0/NFL-DFS-Tools
- gitdiagram: https://gitdiagram.com/chanzer0/NFL-DFS-Tools
- star-history: https://star-history.com/#chanzer0/NFL-DFS-Tools (51 stars)
- github.dev: https://github.dev/chanzer0/NFL-DFS-Tools
