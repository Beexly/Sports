# Dataset layout divergence — reconciliation brief (red team, 2026-09-27 ~05:45Z)

Two lanes independently extended the nflverse grains tonight and produced
**incompatible on-disk realities**. This brief is the merge-conflict inventory
and the recommendation. Nothing here was merged or resolved unilaterally.

## The two layouts

| | grok branch (`grok/reasoning-layer-2026-09-26` @ `693ba1786`) | main (@ `08db1bf82`, session A's work) |
|---|---|---|
| rosters | ONE `rosters.jsonl` (415,682 rows incl. 2026) | `rosters-2018.jsonl` … `rosters-2025.jsonl` × 8 |
| snap-counts | ONE `snap-counts.jsonl` (208,441 incl. 2026) | `snap-counts-YYYY.jsonl` × 8 |
| participation | `participation-YYYY.jsonl` × 8 (2018–2025; 2026 recorded unavailable) | same per-season files + `players_on_field_gsis` enrichment + crosswalk |
| contracts | `contracts.jsonl` (39,013 incl. 2026-signed) | `contracts.jsonl` (35,944, 2018–2025 window) |
| fourth-down | one file, 2026 RDS 404 recorded | one file |
| manifest | `nflverse-ingest-manifest.json` — grok's shape (2026 seasons) | same path — A's shape (26 datasets, crosswalk seals) |
| join report | `data/gse-dataset/join-report.json` — grok's schema | same path — A's schema |
| seasons | 2018–2026 (2026 = application season) | 2018–2025 |

## Hard conflicts on merge

1. `data/gse-dataset/nflverse-ingest-manifest.json` — both sides rewrote it
   completely. Last-writer-wins is data corruption here: whichever manifest
   survives must describe THE files that exist.
2. `data/gse-dataset/join-report.json` — two different schemas for the same
   path (grok: `joins.participation_personnel.perSeason`; A: top-level
   `participation.identifier_compatibility`).
3. `packages/data-ingestion/src/nflverse/ingest.ts` — grok moved `SEASONS` to
   include 2026 as an application season and split training vs application;
   A made 2026-season refusals recorded per grain. Same region, both rewritten.
4. `packages/data-ingestion/src/nflverse/rows.ts` — both widened
   `INGEST_SEASONS`; grok added the 2026 application-season distinction.
5. The combined `rosters.jsonl` / `snap-counts.jsonl` on grok's side do not
   exist on main; main's per-season files do not exist on grok's side. No path
   collision, but two coexisting layouts = every consumer guessing.

## Semantic differences that are NOT conflicts

- Grok's `players_on_field_gsis` equivalent: grok does NOT have the crosswalk
  enrichment at all — its 2018–2022 participation slots remain unjoined.
  Main's crosswalk (`player-id-crosswalk.jsonl`, verified by red team at 100%
  on both hops) is strictly more capable.
- Grok has 2026 grains (verified real against nflverse: snap_counts_2026 200,
  roster_2026 200, participation 404 recorded, nfl4th 200). Main has none.
  The narrative_contract LIVE path NEEDS grok's 2026 ingest.
- Grok's contracts include 2026-signed deals (39,013 vs 35,944).

## Recommendation (owner decides; do not merge silently)

Merge DIRECTION: **grok's branch into main's per-season layout**, i.e. main
wins on structure, grok wins on content:

1. Keep main's per-season file scheme (work-order compliant: split only above
   90 MB — grok's own combined rosters.jsonl is 84 MB, snaps 47 MB; only
   participation legitimately split).
2. Re-run grok's ingest on top of main's layout with the season list
   2018–2026 (training 2018–2024, holdout 2025, application 2026), emitting
   per-season files including 2026.
3. Keep main's crosswalk enrichment pass as a post-ingest step, then re-seal
   the manifest once.
4. Reconcile `join-report.json` to ONE schema (A's, which names the identifier
   break explicitly) and delete grok's combined rosters/snap files.
5. Re-run `verify-files.mjs` (manifest-driven) as the gate.

Estimated real work: one ingest re-run (~10 min machine time) + manifest
reseal. Do NOT hand-merge manifests — re-derive.

## Scanner schema drift (same artifact, three shapes)

- lane2 `scripts/overnight/scan-modules.mjs` → `module-ledger.jsonl` (63 rows)
- session A `scripts/overnight/scan-modules.mjs` → `module-ledger.jsonl` +
  `ingestion-gates.jsonl` (different row fields)
- grok lane has its own `scan-modules.mjs`

All three produce "the" module ledger with different fields. Pick ONE (A's,
it has the gates file), land it on main, delete the others. Until then,
`module-ledger.jsonl` is not a comparable number across lanes.