# Ingestion homes — X-Intel Tranche (2026-10-15)

Branch `motif/x-intel-ingestion-2026-10-15`. Garrett's direct order
(2026-10-15 ~22:46 CT): the ten X sources he shared during the SEA@DEN game
go into the reasoning engine immediately. Ingestion is universal and ungated:
every source gets a stamped home; gates rule emission and promotion only,
never knowledge. **Every new record is weight 0; every emission stays
ZERO_OBJECT.** A source we cannot compute ourselves keeps that fact as its
status inside the engine (BLOCKED-SOURCE / EXTERNAL-REFERENCE /
DIAGNOSTIC-ONLY / SENTIMENT-ONLY), never as a reason to skip it.

This tranche's homes are APPENDED to the homes set built by wiring surge A
(`motif/wiring-surge-a-2026-10-15`): surge A's home files are carried
forward byte-identical (13 files), and the ledger twin's first 279 lines are
byte-identical to surge A's — 23 rows (C-280 → C-302) are appended, zero
existing rows changed.

## Totals

- Ledger rows: 279 → **302**
- Homed before this tranche: 127 · **after: 150** · NO HOME YET: **152, unchanged** — this tranche appends new census rows (C-280 → C-302) rather than re-homing queued ones; the 152-row wiring queue is untouched
- Rows homed here: 23 (10 source records + 13 metric / method / tool /
  kernel records)

## Homes created

| census | home kind | artifact |
|---|---|---|
| C-280 @FF_Geek source | substrate record | `substrate/C-280-ff-geek-source.json` |
| C-281 TPRR x YPRR (WR usage + efficiency) | shadow ledger | `shadow/tprr_yprr_shadow_ledger.jsonl` |
| C-282 @throwthedamball source | substrate record | `substrate/C-282-throwthedamball-source.json` |
| C-283 Coverage-split QB EPA (Man x Zone, PFF) | shadow ledger | `shadow/coverage_split_qb_epa_shadow_ledger.jsonl` |
| C-284 @ArkansasQuant source | substrate record | `substrate/C-284-arkansasquant-source.json` |
| C-285 Opponent-adjusted QB evaluation (CFB) | substrate record | `substrate/C-285-opponent-adjusted-qb-cfb.json` |
| C-286 @StephenKrupka chart franchises | substrate record | `substrate/C-286-krupka-chart-franchises.json` |
| C-287 WOPR (Weighted Opportunity Rating) | shadow ledger | `shadow/wopr_shadow_ledger.jsonl` |
| C-288 Positional matchup quadrant | shadow ledger | `shadow/matchup_quadrant_shadow_ledger.jsonl` |
| C-289 @GridironGrading source + public sheets | substrate record | `substrate/C-289-gridirongrading-source.json` |
| C-290 Pass rush wins + stops (trench production) | shadow ledger | `shadow/trench_production_shadow_ledger.jsonl` |
| C-291 @NFL_DF source + Film Room endpoint | substrate record | `substrate/C-291-nfl-df-source.json` |
| C-292 Coverage-split WR YPRR (Man x Zone, PFF) | shadow ledger | `shadow/coverage_split_wr_yprr_shadow_ledger.jsonl` |
| C-293 @BoxScoreScout source | substrate record | `substrate/C-293-boxscorescout-source.json` |
| C-294 Box Score Scout tool (nflverse) | substrate record | `substrate/C-294-boxscorescout-tool.json` |
| C-295 @refereeinsider source | substrate record | `substrate/C-295-refereeinsider-source.json` |
| C-296 Referee-bias ATS trend source | shadow ledger | `shadow/referee_trends_shadow_ledger.jsonl` |
| C-297 Crew assignment + penalty-mix kernel | substrate record | `substrate/C-297-crew-assignment-kernel.json` |
| C-298 @RyNoonan source (4for4 IDP) | substrate record | `substrate/C-298-rynoonan-source.json` |
| C-299 Expected sacks | shadow ledger | `shadow/expected_sacks_shadow_ledger.jsonl` |
| C-300 Tackles vs expected | shadow ledger | `shadow/tackles_vs_expected_shadow_ledger.jsonl` |
| C-301 Role shift alerts | shadow ledger | `shadow/role_shift_alerts_shadow_ledger.jsonl` |
| C-302 @cookitup31 sentiment source | substrate record | `substrate/C-302-cookitup31-sentiment-source.json` |

## Statuses (the point of the tranche)

- **INVOCABLE-CANDIDATE** (computable from data already held; a build, not a
  source problem): C-281 TPRR x YPRR, C-287 WOPR (after its coefficients are
  pinned from the primary source), C-297 crew kernel, C-300 tackles vs
  expected.
- **BLOCKED-SOURCE**: C-283 + C-292 (PFF coverage tags not held), C-290
  (PFF wins/stops tags not held). The public charts are held as stamped
  instances; the block is the status, recorded in-engine.
- **EXTERNAL-REFERENCE**: C-280, C-282, C-284, C-285, C-286, C-288
  (allowance side), C-289, C-291, C-293, C-294, C-298, C-299, C-301.
- **DIAGNOSTIC-ONLY**: C-295 + C-296 (referee trend mining; caveats are
  part of the record: small samples, no published multiplicity control,
  self-kept scorekeeping).
- **SENTIMENT-ONLY**: C-302 (@cookitup31 — no analytical content;
  public-betting sentiment reference, cataloged per the
  nothing-gets-killed rule).

## Named follow-ons (recorded in the home files, not silently dropped)

1. **SPEC-C premise-type registration** for the coverage-split family
   (proposed `coverage_split_qb_epa.v1` / `coverage_split_wr_yprr.v1`):
   the landed registry (`introspection/registry/premise_types.json` v1)
   admits new types only by a registry version bump, and its families are
   the 7 adjustment families — no matchup/scheme family exists in it.
   Registration is deferred to a registry v2 bump on the SPEC-C lane
   (post Freeze-1-C ratification). Recorded in C-283 and C-292.
2. **WOPR coefficients** to be pinned from the primary source (Hermsmeyer)
   in tranche 2 — not guessed here.
3. **GridironGrading public sheets**: existence + structure recorded;
   download + in-house re-stamping not done in this tranche.
4. **Tranche 2**: the ten deep-scroll catalogs of these accounts are
   still in flight; their finds append as a follow-on tranche.

## NGS discipline

Where a source credits Next Gen Stats (C-286 O-line series, C-299 expected
sacks), the credit is recorded for internal reasoning use only. Per
Garrett's standing rule, NGS names/data never appear on a public surface.
