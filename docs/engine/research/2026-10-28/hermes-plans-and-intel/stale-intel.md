# Stale intel audit — Beexly/gse-competitive-intel

Read-only. No repo was modified (all access via `gh` / archive listing). Nothing below is a
recommendation to wire anything; license-restricted material is queued only.

## Scope and method

- Base: `main` of `Beexly/gse-competitive-intel`.
- `gh api repos/Beexly/gse-competitive-intel/compare/main...<branch>` for every branch the prompt
  names as ahead: 15 / 13 / 7 / 3 / 1 / 1.
- "Already in the Drive dump's competitive-intel zip" checked against the actual archive:
  `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26\gse-competitive-intel-main (1).zip`
  (3,222 entries). A local clone at `C:\Users\Garrett\gse-competitive-intel-export` is an older
  sync of the same repo and was used only as a second reference.

## Already covered by `main` / the zip (do not re-queue these)

- `LAUNCH/13-P0-CLOSURE-VERIFICATION-2026-09-28.md` — the one commit on
  `hermes/verify-p0s-2026-09-28` is **already present** in the zip archive.
- `SPORTS_IMPLEMENTATION_MAP.md` — content of both `docs/sports-implementation-map` and
  `docs/implementation-map-pass2` is **already present** in the zip (the zip copy even carries the
  Pass-2 table).
- `LAUNCH/ENGINES-MATH-CALIBRATIONS-RESEARCH.md` (in the zip) already holds the calibration-method
  canon (Platt, isotonic/PAV, beta, Venn-Abers, conformal, drift recalibration), the metric canon
  (Brier/Murphy, log loss, e-process, slope/intercept, CLV), Colley/Elo reference points, and the
  `sdv-dev/Copulas` BUSL-1.1 "DO NOT DEPEND" boundary. Do not re-flag those as missing.

## Branch-only methods / formulas / do-not-copy boundaries (not on `main`, not in the zip)

Zip check: the archive has **no** `waves/`, no `wave2/`, no `data/extracted/`, no `docs/sports/`,
and `LAUNCH/` stops at 13. So all four clusters below are genuinely branch-only.

### 1. `hermes/wave2-ingest-2026-09-05b` (13 ahead) — formulas + a license copy-boundary

- **Formula registry** — `waves/wave4-methods-2026-09-12.md` (with
  `waves/wave4-methods-formulas-2026-09-12.json`). 10 canonical / 15 verbatim formulas: American
  implied probability, no-vig normalization, EV/unit, CLV, fractional Kelly, drawdown-constrained
  log-wealth, Poisson/Dixon-Coles log-λ rate, Monte Carlo joint probability, prop-tail probability,
  EPA, DFS lineup MIP, injury-scenario delta. The zip's `ENGINES-MATH-CALIBRATIONS-RESEARCH.md`
  does **not** contain this registry (it covers calibration metrics, not the betting/EV math).
- **Formula + pricing dossier** — `waves/wave4-features-formulas-2026-09-12.md` (verbatim BRef
  rate-stat/formula set and the log-loss / Brier / GECE / Bregman / Platt / isotonic / temperature
  formulas; `LineStar Value = Projection/Salary`).
- **Do-not-copy boundary (license)** — `waves/wave4-repos-oss-optimizers-2026-09-12.md`, section
  "## 2. Copy boundary (license table)": `uberfastman/yfpy` is **GPL-3.0 — viral; do NOT copy into
  GSE**, and 14/22 profiled repos have no LICENSE file and are "idea-only, never code".
  **Restrictive license — queued, do not copy.**

### 2. `claude/kind-gauss-kb2qsd` (15 ahead) — explicit "Do NOT copy" insights

- `data/extracted/model_insights.md` — includes a **`## Do NOT copy`** section (line 153) plus the
  de-vig method comparison (proportional vs Shin vs goto) and calibration-floor methods.
- `data/extracted/ncaa_insights.md` — includes a **`## Do NOT copy`** section (line 183): e.g. do
  not use vendor "closing line" labels as CLV inputs (`sportsdataverse` release carries no license),
  do not hand-weight 100-point scores, do not treat Unabated's "proprietary recipe" book weights as
  reproducible. (NBA/NCAAF slices; no number is asserted here.)
- (`data/extracted/nfl_insights.md`, `data/extracted/repo-leverage-2026-09-09.md`,
  `LAUNCH/14…20`, `LAUNCH/agents/*` are also zip-absent; the two `*_insights.md` are the
  do-not-copy-bearing files.)

### 3. `claude/ecc-gse-gsn-commands-weaxnk` (7 ahead) — integration methods + attribution boundary

- `docs/sports/integrations/KALSHI-PREDICTION-MARKETS.md`,
  `docs/sports/integrations/NFLVERSE-FREE-DATA-PIPELINE.md`,
  `docs/sports/integrations/{AWS-BEDROCK-CLAUDE,CEREBRAS-FAST-INFERENCE,GOOGLE-VERTEX-AI}.md`,
  `docs/GSE-ECOSYSTEM-LEVERAGE.md`, `docs/REPO-INTEGRATION-PLAN.md`,
  `docs/sports/MASTER-PLAN-SONNET-2026-07-21.md`.
- `NFLVERSE-FREE-DATA-PIPELINE.md:18` carries a **do-not-copy boundary**: NGS expected metrics
  (RYOE, xYAC, CPOE) are NFL-proprietary, recirculated under a data-sharing agreement; attribution
  required. Zip has no `docs/` tree at all, so this is branch-only.

### 4. `claude/sports-launch-round2-fixes-hk7kv9` (3 ahead) — calibration/de-vig methods

- `wave2/forecast-scoring-literature.md` (de-vig comparison: multiplicative/additive/power/Shin/
  differential-margin/odds-ratio/logarithmic; calibration and scoring-rule literature) and
  `wave2/simulation-literature.md` (contest-simulation method and field-model discussion).
- `wave2/forecast-scoring-literature.md:168` states an explicit boundary for the
  `uncertainty-calibration` PyPI package: **"port, do not depend — law 7"** (queued, do not depend).
- `_propfinder-teardown-final.md` + `propfinder-raw/*` (teardown is zip-absent; zip holds only raw
  `propfinder` crawl files under `raw/` and the `dossiers/propfinder.app.json` record).

## Direct answer

The branch-only method/formula set is the **wave-4 formula registry** on
`hermes/wave2-ingest-2026-09-05b` —
`waves/wave4-methods-2026-09-12.md` (+ `waves/wave4-methods-formulas-2026-09-12.json`,
`waves/wave4-features-formulas-2026-09-12.md`). The branch-only **do-not-copy boundaries** are the
license copy-boundary table in `waves/wave4-repos-oss-optimizers-2026-09-12.md` (GPL-3.0 `yfpy`;
unlicensed repos) and the `## Do NOT copy` sections in
`data/extracted/model_insights.md` / `data/extracted/ncaa_insights.md` on
`claude/kind-gauss-kb2qsd`. None of these paths exists on `main` or in the
`gse-competitive-intel-main (1).zip` archive.

## Queued — restrictive licenses / attribution (do not copy, no action)

- `waves/wave4-repos-oss-optimizers-2026-09-12.md` — `yfpy` GPL-3.0 (viral); all no-LICENSE repos
  treated as all-rights-reserved.
- `wave2/forecast-scoring-literature.md:168` — `uncertainty-calibration` "port, do not depend".
- `docs/sports/integrations/NFLVERSE-FREE-DATA-PIPELINE.md:18` — NFL NGS proprietary metrics,
  attribution required.

## Limits

- Branch ahead/behind counts are from the prompt and corroborated by `gh compare` (`status:
  diverged` for every branch, since `main` has also moved on).
- No production wiring is proposed; every item is queued for a human decision.
- No numbers were invented: counts quoted (3,222 zip entries; 10 canonical / 15 verbatim formulas;
  8/22 vs 14/22 license split) are read from the archive listing and the branch files cited.
