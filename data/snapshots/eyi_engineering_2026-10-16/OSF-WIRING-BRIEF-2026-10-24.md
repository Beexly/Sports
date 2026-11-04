# Open Source Football — Wiring Brief for the 15 NEW Methods
Prepared 2026-10-24 (Sat evening CT) from the verified full dissection:
`~/workspace/your_files/OPEN-SOURCE-FOOTBALL-DISSECTION-2026-10-24.md` (42 articles, 0 unread, 0 stubs, 0 unevaluated)
Also in the combined agent file: `~/workspace/your_files/GSE-INTEL-MASTER-2026-10-24.md` (Part 3)

Status on the record: all 15 NEW methods are documented, none are in engine code.
Dispositions across the 42: 15 NEW, 8 duplicate-of-existing-GSE, 15 reference-only,
4 articles carrying the 5 methods already extracted Oct 17.

## Build order if Garrett says go — Top 5 first (dissection Section 3 ranking)

1. **Bayesian multilevel team ability from EPA, Student-t** (article 4) — Team ratings layer.
   Partial pooling + opponent adjustment + posterior uncertainty. It upgrades the input
   every other layer reads from; Student-t stops one fluke play (e.g. a 99-yard fumble
   return) from swinging a defense ~8 ranking spots.
2. **Coverage classification from tracking frames, CNN in torch** (article 5) — Matchup layer.
   ~78% single-frame coverage-family accuracy from Big Data Bowl tracking data GSE can
   obtain. The only one of the 42 that manufactures scheme labels from data, instead of
   borrowing someone else's labels.
3. **Team-specific home-field advantage, random-slope model** (article 11) — Venue layer.
   Replaces any flat home constant with a measured, team-specific number; the article's
   estimate had league HFA near zero in 2019–2020, so a flat constant is a known-wrong input.
4. **Penalty-EPA decomposition, stability-based selective rule** (article 10) — Refs layer.
   Re-prices nullified plays to split flag value from play value; says which foul classes
   carry signal (false start, offside) and which are noise to strip from ratings.
   Almost nothing else in the 42 feeds the refs layer at all.
5. **QB volatility: modified Gini + VOLoe GAM residual** (article 2) — Matchup / Reasoning.
   Adds the variance axis next to mean-EPA QB ratings. High-VOLoe passers were about
   -0.08 EPA/play the next season in the article's look-ahead — a regression-risk flag
   that widens/narrows the outcome distribution instead of moving the mean.

## The other 10 NEW, grouped by weekly-cycle layer

- **Usage:** run/pass tendencies — within-QB expectation + Stan team random effect (16);
  TRAP / high-value-touch share (25, also Fantasy-DFS)
- **Matchup:** GAMM three-part QB decomposition — play quality / air / YAC with receiver
  and defense random effects (13); WR1-split defensive EPA (3)
- **Fantasy-DFS:** expected fantasy points from the full xYAC distribution, by simulation (19)
- **Ratings / feature engineering:** rolling EPA — dynamic window + per-category
  averaging-type recipe (12)
- **Special teams (nearest thing in the 42):** RERUN era-adjusted punter hangtime/distance
  residuals (17)
- **Offseason / roster:** non-QB draft surplus-value chart (0); linguistic analysis of
  prospect reports — VADER + Scattertext (1)
- **Filed negative result (do NOT build an effect from it):** QB hit accumulation vs passing
  efficiency (39) — hold-total-hits-constant binning found no in-game hit-accumulation
  effect. Its value is stopping the engine from inventing one.

## What this site does NOT feed — do not expect it from this build

- **Health: zero direct articles.** Health stays an external-data layer.
- **Weather: zero articles in the 42 model weather.**
- **Situation: thin** — feature windows (12), a rest null result (18), an excitement
  index (31, content-only). Situational reasoning still rests on GSE's own harvest corpus.
- **Market:** nothing here prices against a book, consistent with MATCHUP FIRST / BOOKS LAST.

## Rules that govern the build (standing doctrine, not new decisions)

- Ingest first, diagnostics second, promotion last. A method that fails a diagnostic
  keeps its refusal as a status inside the engine; it is not exiled.
- No human gates inside the engine — engine-internal wiring choices are decided by
  measured evidence, not parked.
- "Wired" is only claimed after the output is read in the actual published artifact
  and the remote file content is verified after a push. A commit title or a file
  existing is not proof.
- Build sessions: the actual diff is the artifact. PRs #1200 and #1201 both slipped
  dependency-audit / security-waiver changes in under clean summaries — every diff
  gets read file by file before merge.
- The Oct 17 five methods (xFG, density/completion surface, CPOE via GAMM, expected
  turnovers, 4th-down engine) were extracted to docs; their wiring state in the engine
  was NOT re-verified in the dissection pass. That artifact-level check is a separate,
  named job — include it in the same build pass so the count is honest.

## The one decision for Garrett

Go / no-go on the Top 5 build pass, in the order above. Everything else in this brief
is already decided by standing doctrine or already documented in the dissection.
