# Sports Intelligence OS — Orientation (R&D corpus map)

> Auto-discoverable entry point for the ENTIRE autonomous R&D corpus. This file is committed
> on branch `hermes/sports-intel-orientation` so Claude Code (or any reviewer) can read the
> full research/backtest context without leaving the repo. It maps work that lives OUTSIDE
> this clone, in `C:/Users/Garrett/sports-intel` (the research-only workspace).

## RELATIONSHIP: this repo vs the research workspace
- **This repo (`Sports-pr`)** = Beexly/Sports prediction-engine monorepo. Production fire gate,
  Shin de-vig, odds ingestion, nflverse source, 19 HB modules, covariate bus (PR #676).
- **`C:/Users/Garrett/sports-intel`** = autonomous R&D workspace. Heavy research, scrapes,
  math proofs, G1–G5 gap resolutions, and the backtest harness. RESEARCH-ONLY; nothing here
  is auto-committed to this repo. All findings below were produced there and verified.

## READ-FIRST ENTRY POINT (the whole corpus, in order)
- sports-intel/REAUDIT-FIXES.md — self re-audit: what the first pass missed + corrections (READ THIS for honesty risks)
- sports-intel/README.md — root index (visible on folder open)
2. `C:/Users/Garrett/sports-intel/MASTER-INDEX.md` — deliverable map + rollup + loop state.
3. `C:/Users/Garrett/sports-intel/rnd/STRATEGY-20K.md` — 20k view: forgotten / under-leveraged / path.
4. `C:/Users/Garrett/sports-intel/deep/FIRE-GATE-CALIBRATION-SPEC.md` — G1–G5 gaps resolved.
5. `C:/Users/Garrett/sports-intel/rnd/RND-MASTER-INDEX.md` — R&D batch outputs.

## WHAT WAS PROVEN (so it is not re-derived)
- **G1–G5 fire-gate production gaps RESOLVED in isolated local harness** (in sports-intel):
  **43/43 tests passing** (23 G1–G5 + 13 backtest + 7 real-data). This clone is UNEDITED by it.
- **Shin de-vig VERIFIED** vs published mberk/shin: z=0.0317273, q=(0.65085,0.34915).
  See `C:/Users/Garrett/sports-intel/deep/fire-gate-math-reference.py`.
- **Backtest runs on REAL 2023–2024 data FREE**: `sports-intel/rnd/harness/replay-real-games.ts`
  replayed 570 actual NFL games (Kaggle `spreadspoke_scores.csv`, no auth) → fired 259,
  won 134/125, **ROI +3.5%**, over-hit 48.8% (honest ~coinflip).
- **50 research papers** + paper→engine cross-ref in `sports-intel/rnd/research-papers.md`.
- **109 competitive sites** cataloged (sportsbooks / sports APIs / prediction engines / DFS).
- **MULTIPLE data-feed solutions** (not one): `sports-intel/rnd/SOLUTION-DOSSIER.md`.

## HARD GATES (non-negotiable)
- Robots.txt binding; passive-public only; no logins/paywalls/CAPTCHAs.
- Fail-closed; never invent market other side; NO fabrication.
- TX resident: build models + consume licensed feeds + reference markets; NEVER place bets,
  resell raw odds, or use offshore books.
- Research-only: this clone stays clean. G1–G5 porting = explicit PR task, not autonomous.
- Proxy/cookie note: the "new proxys (2)" were an LLM API relay + an OnlyFans cookie
  (onlyfans.com scope only). Neither unblocks sportsbook scraping; OF cookie not repurposed.

## LOCAL HARNESS (run from sports-intel, uses THIS repo's esbuild)
```bash
ESBUILD=C:/Users/Garrett/Sports-pr/node_modules/.bin/esbuild
OUT=C:/Users/Garrett/sports-intel/rnd/harness/.build
$ESBUILD harness/harness.test.ts          --bundle --platform=node --format=esm --outfile="$OUT/h.mjs"
$ESBUILD harness/backtest-replay.test.ts  --bundle --platform=node --format=esm --outfile="$OUT/b.mjs"
$ESBUILD harness/replay-real-games.test.ts --bundle --platform=node --format=esm --outfile="$OUT/r.mjs"
node "$OUT/h.mjs" && node "$OUT/b.mjs" && node "$OUT/r.mjs"
```
Expected: `23 passed` + `13 passed` + `7 passed` (43 total).

## KEY CODE ANCHORS IN THIS REPO (for porting G1–G5)
- `packages/prediction-engine/src/edge-lab/props-fire-gate.ts` — `firePostedProp` (e=p−q).
- `packages/prediction-engine/src/edge-lab/props-priced-edge.ts` — `pricePropAgainstMarket`.
- `packages/prediction-engine/src/shin-devig.ts` — `shinDevig` (matches reference).
- `packages/ingestion-pipeline/src/event-odds-ingest.ts` — `NFL_EVENT_ODDS_MARKETS` (only 2 of 19).
- `packages/data-ingestion/src/odds-api-client.ts` — normalizer (h2h/spreads/totals ONLY, no props).
- `packages/ingestion-pipeline/src/pinnacle-line-archive.ts` — CLV leg (Pinnacle API shut 23 Jul 2025;
  use aggregator-fed Pinnacle line via SharpAPI / The Odds API EU).
- Harness gap-closers to port: `sports-intel/rnd/harness/engine-replica.ts`
  (`normalizePropOdds`, `bridgeFireGate`, `settleClv`, `ingestGate`).

## DATA CONTRACT (the one real gap before a *prop* replay)
- p-side: REAL now (nflverse `player_stats` 2023–2024, CC-BY-4.0, $0). 2025 not on nflverse yet.
- q-side (prop opening+closing lines): needs licensed feed — The Odds API historical ($30/mo,
  props from May 2023) or OddsJam. Free GAME-LEVEL lines already work via Kaggle (verified).
  Prop backtest currently uses LABELED fixtures (explicitly not a real-edge claim).

## NEXT HIGH-VALUE ACTIONS
1. Plug q-side feed into `backtest-replay.ts` → full 2023–2024 prop replay → ROI. (BIGGEST WIN.)
2. Encode paper calibration targets (Golec&Tamarkin favorite-longshot; Berkowitz CLV persistence).
3. Wire safe sentiment covariates (Action split delta, Pinnacle line-move) into covariate bus.
4. Port G1–G5 harness closers into this repo via PR.

## HOW TO WIRE A Q-FEED + RUN A PROP REPLAY (literal steps for Claude)
The gap-closers in `engine-replica.ts` are READY but not wired to a live feed. To run a real
prop replay once a key exists:
```bash
# 1) Get a key (FREE no-card: OddsPapi signup; or PAID $30: The Odds API historical)
# 2) Fetch historical prop lines for a slate -> normalize to PropBookQuote:
#    in backtest-replay.ts, replace the q-side fixture with:
#      const quote = normalizePropOdds(rowFromFeed);   // engine-replica.ts:94
#      const res = bridgeFireGate(p, quote, /*priced*/ false);  // engine-replica.ts:106
#      if (res.fire === 'open') { /* grade vs outcome, settle CLV */ settleClv({...}); }
# 3) Run the harness (proves the path end-to-end):
ESBUILD=C:/Users/Garrett/Sports-pr/node_modules/.bin/esbuild
OUT=C:/Users/Garrett/sports-intel/rnd/harness/.build
$ESBUILD harness/replay-real-games.test.ts --bundle --platform=node --format=esm --outfile="$OUT/r.mjs"
node "$OUT/r.mjs"   # expect: 7 passed, REAL-DATA ROI printed
```
Game-level is ALREADY proven on real 2023–2024 data (no key). Props need the q-feed above.
The ONE real missing piece is the q-side data source — math, fire gate, and grading are done.

## FULL CORPUS TREE (all in `C:/Users/Garrett/sports-intel`)
- Root: `README.md` · `MASTER-INDEX.md` · `REAUDIT-GAP-REPORT.md` · `REAUDIT-FIXES.md` ·
  `DEEP-RESEARCH-REPORT.md` · `SPORTS-INTEL-AGENTS.md`
- `deep/`: fire-gate-math-reference.py, FIRE-GATE-CALIBRATION-SPEC.md, odds-api-supply-chain.md,
  prediction-markets-q-source.md, competitor-model-teardown.md, dfs-optimizer-and-sentiment.md,
  regulatory-landscape.md, README.md
- `rnd/`: STRATEGY-20K.md, RND-MASTER-INDEX.md, research-papers.md (50), paper-engine-crossref.md,
  sportsbooks-more.jsonl+.md (30), prediction-engines-more.jsonl+.md (60), GAP-RESOLUTION-REPORT.md,
  SOLUTION-DOSSIER.md, feed-solutions.md, fixtures/ (real nflverse + 570 real games),
  harness/ (engine-replica.ts, harness.test.ts [23], backtest-replay.ts+.test.ts [13],
  replay-real-games.ts+.test.ts [7 real-data], .build/)
- `scrape/`: SCHEMA.md, COMPETITIVE-REPORT.md, findings-*.jsonl (38 rows, 35 sites)
