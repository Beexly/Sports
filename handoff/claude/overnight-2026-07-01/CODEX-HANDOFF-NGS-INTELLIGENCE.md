# CODEX HANDOFF — NGS Intelligence Program (2026-07-03)

Repo: `C:\Users\Garrett\Sports`, branch `claude/night-shift`, HEAD `fd81bc28`
(all below is committed + pushed). Author: Claude. Owner: Garrett.

---

## WHAT GARRETT IS TRYING TO DO (the goal)

Legally acquire the NFL's advanced tracking data (Next Gen Stats: separation,
RYOE, CPOE, etc.) and USE it to make GSE's predictions more accurate — then
**PROVE** the accuracy. The strategic thesis, in his words: be so meticulous that
we find every *legal* pathway, take zero ToS/scraping risk (that's "company-ending
for a trust brand"), and ultimately **out-compute the incumbents and own the IP**.

The winning move is NOT "re-serve the NFL's RYOE/CPOE." It is:
**compute GSE's OWN expected-value metrics from open play-by-play, validate them
against NGS as ground truth, and own the resulting proprietary numbers.**

---

## LEGAL FOUNDATION (already established — do not re-litigate; obey)

- **Data source = nflverse ONLY** (`nflverse-data` GitHub releases), CC-BY-4.0.
  Verified by execution that nflverse NGS is **value-identical** to the NFL site
  (JSN separation 3.018 vs 3.0; Cook RYOE 358.16 vs 358; Stafford CPOE 1.476 vs
  +1.5). Full map: `docs/data/ngs-legal-leverage.md` (Feist / NBA v Motorola /
  hiQ / no-US-database-right; the compute-your-own-IP play; bright lines).
- **NEVER scrape** nextgenstats.nfl.com, nfl.com/*, pro-football-reference.com,
  aws.amazon.com/*, or any ToS-protected site for ingestion. We already have the
  same data legally. Scraped files Garrett pasted are for private spot-check only.
- **Attribute vendor model-outputs** if ever published ("NFL Next Gen Stats via
  nflverse"); better, publish only GSE's OWN re-derived numbers.
- All new work is **dark/additive**. No live flag flips. No merge to `main`.
  Anything that changes a PUBLISHED number or scoring is a founder-gated
  MODEL_VERSION step — build it inert, let Garrett flip it.

---

## WHAT'S ALREADY SHIPPED (the foundation you build on)

`packages/data-ingestion/src/nflverse-ngs.ts` — typed access to all three NGS
variants, parsed from the existing `ngs` dataset in `nflverse-source.ts`:
- `parseNgsReceiving` → SEP (`avgSeparation`), cushion, xYAC, air-yards share.
- `parseNgsRushing` → RYOE (`ryoe`), efficiency, 8+box%, expected_rush_yards.
- `parseNgsPassing` → CPOE (`cpoe`), xCOMP% (`expectedCompletionPct`),
  time-to-throw, air-yards family.
- `filterNgs(rows, season, week=0)` — week 0 is the full-season aggregate.
- Ground-truth bridges: `ngsReceivingToSeparationTruth` (SEP, min 20 targets),
  `ngsPassingToCpoeTruth` (CPOE, min 135 attempts).
- Fetch machinery already exists: `fetchNflverse("ngs", season, "receiving"|
  "rushing"|"passing")` from `nflverse-source.ts` returns a parsed `CsvTable`.
- 6 tests green (fixtures are the verified real values); data-ingestion suite 131 green.

Join key across every nflverse dataset: `player_gsis_id` (exposed as `gsisId`).

---

## THE THREE APPROVED BUILDS (Garrett said "yes approved" to all 3)

### BUILD 1 — Wire SEP as reconstruction ground truth (calibration; safest, do first)
The reconstruction engine (`apps/web/lib/reconstruction/`) ESTIMATES receiver
separation from cleared aggregates; NGS now gives the ACTUAL separation. Wire them
so we can MEASURE whether the estimate tracks reality.
- Interface (already read): `apps/web/lib/reconstruction/calibration-eval.ts`
  exposes `TruthPair { predicted: ReconstructedFeature; actual: number }`,
  `calibrationReport(pairs)`, `skillScore(pairs, baseline)`, and
  `graduationVerdict(report, skill)`.
- `separation-reconstruct.ts` produces the `ReconstructedFeature` (value +
  interval + alpha) per receiver.
- Build: a dark loader/eval that, per player-week, pairs the reconstruction
  estimate (`predicted`) with `ngsReceivingToSeparationTruth[...].actualSeparation`
  (`actual`) by `gsisId`, runs `calibrationReport` + `graduationVerdict`.
  Baseline for `skillScore` = the naive per-receiver flat tendency.
- Output is MEASUREMENT ONLY (RMSE / coverage / skill). Does not change scoring.
  Prove it by execution: fetch a real season of `ngs` receiving + run the eval,
  report the RMSE and whether it graduates. Pin real numbers in a test.
- NOTE: NGS SEP is a season/week AGGREGATE; the reconstruction may estimate at a
  finer grain. Aggregate the estimates to the same grain before pairing, or scope
  the calibration to the aggregate the engine actually emits — do not pair
  mismatched grains (that would fake the RMSE). State the grain explicitly.

### BUILD 2 — GSE's own expected-value models from open PBP (the IP play; highest value)
Compute our OWN expected-completion / expected-rush-yards / expected-YAC on
nflfastR play-by-play (`fetchNflverse("pbp", season)` — has `air_yards`,
`complete_pass`, `pass_location`, `yardline_100`, `ydstogo`, `down`, box counts via
`pbp_participation`). Deliver, per metric:
- A pure engine module (in `packages/prediction-engine/src/`) that fits an
  expected model from plays and scores each player's actual-minus-expected
  (our CPOE / our RYOE). Start simple + honest (e.g. a smoothed empirical
  expected-completion by air-yards bucket, or a logistic on a few features) —
  a real, explainable model, not a black box.
- Determinism + tests per the house contract (seeded, null-on-degenerate,
  measured numbers).
- **The proof that makes it IP**: correlate GSE's own CPOE with NGS `cpoe`
  (and own-RYOE with NGS `ryoe`) across QBs/RBs for a season. High correlation =
  our re-derived metric tracks the vendor's, so we can publish OURS and own it.
  Report the correlation from a real run. This is the "demolish them, own the IP"
  deliverable — our headline number is ours, validated against theirs as truth.
- Attribution rule stays: NGS is the validation truth, never the published source.

### BUILD 3 — NGS-derived independent estimators into the edge engine (founder-gated scoring)
Feed NGS-derived talent signals as INDEPENDENT estimators in `edge-engine.ts`
(`assessEdge` takes `IndependentEstimate[]`): e.g. a QB's CPOE / an RB's RYOE / a
WR's separation as priors that diverge from market fair value. This CHANGES
scoring → build it inert behind the existing gate, MODEL_VERSION bump is Garrett's.
Do BUILD 2 first (own metrics) so the estimator uses OUR numbers, not re-served NGS.

---

## GUARDRAILS (the house contract — every commit)
- TypeScript strict; engine package is ZERO runtime deps (Node built-ins only) —
  `@sports/crypto` is the only package allowed the `@noble` dep. Ingestion/data
  work goes in `packages/data-ingestion` (already has the fetch/parse layer).
- Deterministic (seeded; no `Math.random`/`Date.now` in logic). Return null on
  refused/degenerate input; never throw on data. Complete function bodies.
- Every number in a doc/test/comment comes from a run you executed, the repo, or
  is explicitly attributed as unverified literature. (Numbers Law — enforced hard.)
- Run the affected suite(s) + `tsc --noEmit` before every commit. Push to
  `claude/night-shift` only. Co-author trailer on commits.

## KEY FILES
- `packages/data-ingestion/src/nflverse-ngs.ts` + `nflverse-source.ts` — NGS data in.
- `apps/web/lib/reconstruction/{calibration-eval,separation-reconstruct,provenance}.ts` — BUILD 1 target.
- `packages/prediction-engine/src/edge-engine.ts` — BUILD 3 target (`assessEdge`, `IndependentEstimate`).
- `docs/data/ngs-legal-leverage.md` — the legal map + strategy.
- `handoff/claude/overnight-2026-07-01/OPUS-HANDOFF-2026-07-03.md` — prior handoff (self-audit, wave protocol).

## COMMANDS
```
# fetch + inspect a live NGS variant (proves columns before you build)
node -e '...' using fetchNflverse or the nflverse URL + node:zlib gunzip
cd packages/data-ingestion && npx vitest run && npx tsc --noEmit
cd packages/prediction-engine && npx vitest run && npx tsc --noEmit
cd apps/web && npx tsc --noEmit   # slow (~4min) — run before committing web changes
```

Bottom line for Codex: the data is in and legal; build GSE's OWN metrics on it,
prove they track the vendor, wire them inert. Own the IP. No scraping, ever.
