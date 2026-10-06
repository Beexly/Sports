# GPL/AGPL License Verdicts — NFL Sweep Research Lane 4

**Date:** 2026-09-28 · **Lane:** GPL/AGPL license verdicts
**Scope note:** These verdicts cover the six named items; the "other GPL/AGPL items" check from the keeper lists should be re-run once the full sweep index is accessible on the remote.

**Method:** Each item's license was verified by reading the actual LICENSE file from the repo via the GitHub API. License keys confirmed live:

| Repo | License (verified) | License file |
|---|---|---|
| dynastyprocess/data | GPL-3.0 | `LICENSE` (stock, no data exception) |
| nflverse/nflverse-pfr | GPL-3.0 | `LICENSE.md` (stock, no preamble) |
| sumedhk0/PanopticPigskin | AGPL-3.0 | `LICENSE` (stock) |
| nflverse/nflverse-pbp | CC-BY-4.0 | `LICENSE.md` (stock, repo-wide) |
| nflverse/nflverse-data | CC-BY-4.0 | `LICENSE.md` (stock, repo-wide) |
| mkreiser/ESPN-Fantasy-Football-API | LGPL-3.0-only | `LICENSE` (+ `package.json` declares `LGPL-3.0-only`, npm `espn-fantasy-football-api@2.0.1`) |

**Legal grounding used** (engineering verdicts, not legal advice): facts/data points are not copyrightable expression (Feist v. Rural, 1991) — a GPL on a *dataset* binds the compilation/expression, not the extracted facts. GPL/AGPL on *code* means incorporating, forking, or (for AGPL) network-serving it creates obligations — GPL requires open-sourcing distributed derivatives; AGPL §13 extends that to network use. CC-BY-4.0 is **not copyleft**: it permits adaptation into proprietary works with attribution, no source-sharing. LGPL-3.0 expressly permits unmodified library use via dynamic linkage without copylefting the host.

## 1. dynastyprocess/data — GPL-3.0 — **DATA**

**What it is (verified):** Data repository, updated weekly via GitHub Actions. Contents of `files/`: `db_playerids.csv`, `db_fpecr.csv.gz` / `.parquet` (FantasyPros ECR), `values.csv` / `values-players.csv` / `values-picks.csv` (dynasty trade values), `fp_latest_weekly.csv`, plus an `archives/` dir. No application code — only data files and the GH Actions workflows that regenerate them.

**Verdict: DATA — extract facts freely, do not vendor the compilation.**
- **Safely usable TODAY:** Read the numbers out of the CSVs/parquet (player ECR ranks, ADP, projections, player-ID mappings, dynasty values) and store the *extracted facts* in our own tables/schema. Reading individual data points is not creating a derivative work of the GPL'd compilation.
- **What stays out:** Do NOT commit the CSV/parquet/RDS files themselves into the Sports repo or any closed product, and do NOT redistribute the files verbatim. Do NOT copy the `.github/workflows` generation code (that's GPL code).
- **Caveat (flag for Garrett):** The ECR data is scraped from FantasyPros. The repo's GPL license governs the *compilation*; it does not override FantasyPros' own terms of service for commercial use of their rankings. If ECR becomes load-bearing for a revenue surface, verify FantasyPros' ToS separately.
- **Method-only:** The pipeline design (which sources are merged, weekly refresh cadence, the ID-mapping approach in `db_playerids.csv`) can inform our own scraper design at the method level.

## 2. nflverse/nflverse-pfr — GPL-3.0 — **CODE (+ archived data)**

**What it is (verified):** An R package (`pfr_scrapR`): `R/` holds scrapers (`pfr_advanced_stats.R`, `game_snaps.R`, `game_advstats.R`, `game_urls.R`, `utils.R`), plus `auto/`, `build/`, `exec/` workflows. README states the data itself moved to `nflverse/nflverse-data` releases and this repo is now code + workflows.

**Verdict: CODE — study-only for the R code; get the DATA from nflverse-data instead.**
- **Safely usable TODAY:** The snap-count and PFR advanced-stat *datasets* via `nflverse-data` releases (CC-BY-4.0, see §5) — the sanctioned, clean lane. Access via `nflreadr`, `nfl-data-py`, or direct release URLs.
- **What stays method-only / study-only:** All R scraper code. Do NOT fork this repo, do NOT copy `.R` files into the monorepo, do NOT translate R→TypeScript line-by-line (a mechanical translation is still a derivative work).
- **Clean-room for the coding agent:** Learn *what* it scrapes and *what shape* the output takes by reading the **data files** (the output schema is facts), then write an independent scraper from the source sites. Document: "PFR snap-count ingestion, independently implemented; output schema informed by nflverse-data releases."

## 3. sumedhk0/PanopticPigskin — AGPL-3.0 — **CODE**

**What it is (verified):** Python computer-vision pipeline: solves both broadcast cameras on every frame *from the field's own paint* (yard lines, hash marks, numerals — with known player height fixing lens scale), YOLOv8 detection + tracking joined across two views, jersey-number identity, SMPL-X body fitting, Gaussian-splat rendering, an interactive browser "Film Room" viewer, and per-player reports. Folders: `nfl_gsplat/` (library), `scripts/` (numbered pipeline stages), `tools/`, `eval/`, `viewer/`, `tests/`.

**Verdict: CODE — the strongest copyleft in this set. Method-only, full stop.**
- **Safely usable TODAY:** Nothing from the code. Not the library, not the scripts, not the viewer — and do NOT run it server-side to generate outputs for users: AGPL-3.0 §13 treats network interaction as conveyance and would require offering the corresponding source to users.
- **What stays method-only:** The *techniques* are learnable: (a) calibrate panning/tilting/zooming broadcast cameras from field paint; (b) use known player height to resolve the paint-alone lens ambiguity; (c) per-frame solve + refinement pass; (d) cross-check the solve against the play's line of scrimmage; (e) endzone camera on its own paint. The demo play's per-player *report structure* can inform our own report schema — output shape, not code.
- **Clean-room for the coding agent:** (1) Write an independent design doc first — inputs, outputs, algorithm stages in our own words. (2) Implement from the doc with our own stack, never with the repo open side-by-side. (3) Do not mirror the numbered `scripts/` stage structure or copy function/variable names. (4) Commit message / docs note: "Broadcast camera-calibration method informed by PanopticPigskin (AGPL-3.0, not used); independently implemented."

## 4. nflverse/nflverse-pbp — CC-BY-4.0 — **DATA (+ repo code under the same license)**

**What it is (verified):** `LICENSE.md` is stock CC-BY-4.0 with **no code carve-out** — it covers the whole repo: the R package code (`R/`, `exec/`, `models/`), archived data, logos. README: live play-by-play / player-stat / kicking data now ships via `nflverse-data` releases.

**Verdict: CC-BY-4.0 is not copyleft — usable with attribution, including adaptation.**
- **Safely usable TODAY:** (a) All the data — pull from `nflverse-data` release URLs (preferred), `nflreadr`, or `nfl-data-py`; (b) adaptation of the R scraper logic is *legally permitted* under CC-BY-4.0 even into a proprietary codebase — attribution is the only requirement (no source-sharing, no share-alike). Practical note: the coding agent should still prefer independent implementation for the TS stack and treat any adapted R logic as attributed.
- **"Code per-repo" check (done):** Verified there is no per-file alternate license in this repo — the whole tree is CC-BY-4.0. If a future nflverse repo shows a different header, honor the file header over the repo LICENSE.
- **What to avoid:** Stripping the attribution. That's the entire price of this license.

## 5. nflverse/nflverse-data — CC-BY-4.0 — **DATA**

**What it is (verified):** The nflverse data hub: all datasets (play-by-play, player stats, rosters, schedules, snap counts, PFR advanced stats, etc.) published as versioned GitHub Releases (parquet/CSV/RDS); the repo itself holds R code, workflows, and docs under the same stock CC-BY-4.0.

**Verdict: DATA — the preferred clean lane for everything nflverse. Use freely with attribution.**
- **Safely usable TODAY:** Download and ingest any release artifact into our pipelines. This replaces the data side of both `nflverse-pbp` and `nflverse-pfr`.
- **Attribution (required):** exact format and placement in §7 below.

## 6. mkreiser/ESPN-Fantasy-Football-API — LGPL-3.0-only — **CODE (library)**

**What it is (verified):** A **JavaScript** npm package (`espn-fantasy-football-api@2.0.1`, `LGPL-3.0-only` in `package.json`) — an API client for ESPN's fantasy football API v3 (supports private leagues in Node). Correction to the sweep note: it is JS, not Python.

**Verdict: LIBRARY-SAFE — use as a dependency, never fork it in.**
- **Safely usable TODAY:** `npm install espn-fantasy-football-api` and import it as an unmodified dependency wherever ESPN fantasy data is pulled. LGPL-3.0 was designed for exactly this: dynamic linkage does not make the host application a derivative work. Keep the package unmodified; its license notice ships inside `node_modules` automatically.
- **What stays out:** Do NOT copy `src/` files into the monorepo. Do NOT fork-and-vendor a modified copy — a vendored modified copy *is* a derivative work and must be shared under LGPL-3.0. If a patch is needed: contribute upstream or carry the patch as a separate LGPL-licensed fork, never silently merged into closed code.
- **Note:** Evaluate whether it's needed at all — if only ESPN scoreboard/player data is needed, existing intakes may already cover it. The verdict is "safe to depend on," not "must use."

## Clean-room rules for the coding agent (all items)

1. **Never copy files in.** No vendored CSVs from `dynastyprocess/data`, no `.R` files from nflverse repos, no `.py` from PanopticPigskin, no `src/` from the ESPN package.
2. **No line-by-line translation.** Mechanical R→TS or Py→TS translation of GPL/AGPL code is a derivative work. Read for *method*, close the repo, write an independent design doc, implement from the doc.
3. **Facts are free; expression isn't.** Numbers, ranks, IDs, schemas-as-facts: safe. Code structure, comments, pipeline staging, creative text: not safe.
4. **Document provenance.** Every ingestion module gets a header comment or docs entry: source, license, what was taken (facts vs. method), and "independently implemented" where applicable. This is the paper trail that makes the verdicts defensible.
5. **Data attribution is non-optional** for CC-BY-4.0 sources — see §7.

## Attribution format (CC-BY-4.0: nflverse-pbp, nflverse-data)

- **In-repo:** create/extend `docs/ATTRIBUTIONS.md` (or the existing attributions file) with:
  `NFL play-by-play, player stats, rosters, schedules, snap counts, and advanced stats via nflverse (https://github.com/nflverse/nflverse-data), © nflverse contributors, licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/).`
- **Per-dataset docs:** each ingestion doc under the data bucket notes "Source: nflverse-data release <tag>, CC-BY-4.0."
- **Public surfaces:** any public page/visualization built on nflverse data carries a "Data: nflverse (CC-BY-4.0)" credit line.
- **dynastyprocess/data (GPL):** no attribution is *legally* required for extracted facts, but provenance is good practice: `ECR/ADP figures cross-referenced against DynastyProcess data (https://github.com/dynastyprocess/data), GPL-3.0; values independently stored.` Do not imply endorsement.

## Open questions / follow-ups

1. **Re-run the "other GPL/AGPL items" check** once the full sweep keeper index is accessible on the remote.
2. **FantasyPros ToS review** if DynastyProcess ECR becomes load-bearing on any revenue surface (repo license ≠ upstream source terms).
3. **Do we need `espn-fantasy-football-api` at all?** Verdict says safe-to-depend; product call whether it fills a gap existing intakes don't.
4. These are license-text-grounded engineering verdicts, **not legal advice** — if any item becomes structurally load-bearing for a commercial product, a one-hour IP-attorney review of the specific integration is cheap insurance.

*Research only. No credentials in this document. No live-browser actions taken. Vendor git state untouched — all reads were remote API calls.*
