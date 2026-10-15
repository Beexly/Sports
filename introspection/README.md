# Introspection layer — SPEC-C stages S0 + S1

Implements **SPEC-C (Introspection Layer, FFW-26 addendum) stages S0 and S1**
as drafted. SPEC-C is **DRAFT** — Freeze-1-C ratification is pending Garrett.
All defaults below are §6's drafted defaults, unchanged:

| § | Decision | Default in force |
|---|---|---|
| 2.2 | T0 | kickoff − 72 h |
| 2.2 | R0 → R1 switch | 200 archived trajectories |
| 1.5.2 | Commitment revision deadline | 6 h |
| 1.6.3 | Track-record display floor | n ≥ 30 |
| 2.3 | Per-family premise cap | 3 |
| 3.2 | D2 density (k, m) | 5 premises, 3 families |
| 3.3 | Base-rate eligibility band | [0.05, 0.95] |
| 4.7 | RETRO rule | Strict |

## Layout (§1.9, canonical)

```
introspection/
  dossiers/{season}/{week}/{game_id}/v{n}.json   immutable, hash-chained versions
  resolutions/{season}/{week}/{game_id}.jsonl    append-only (S2 fills these)
  postmortems/{season}/{week}/{game_id}.json     append-only (S5)
  commitments/fired.jsonl                        append-only (S4)
  versions.jsonl                                 generator versions (§1.8)
  trackrecords/                                  derived output only; every file
                                                 carries its generating script's SHA-256
  registry/                                      resolvable quantities (§1.4) +
                                                 premise types / 7 families (§1.1, §1.6)
  spec_a_ledger_appends.jsonl                    daily manifests in the SPEC-A
                                                 ledger format (FREEZE-1 style)
  src/                                           the plumbing (stdlib-only Python)
  tests/                                         pytest suite, incl. the §4.9
                                                 isolation test
```

## Store rules (enforced by `src/store.py`, not by convention)

- **Append-only, hash-chained.** Every record carries `prev_sha` and
  `record_sha` (SHA-256 over the record's canonical form). Verify any time:
  `python3 -m src.verify_chain introspection` (run from the repo root with
  `introspection/` as the argument — see tests for programmatic use).
- **Server stamping.** Every stamp is UTC from the server clock at write
  time. Author-supplied timestamp fields are rejected at write time
  (`StampAuthorityError`). The author never supplies timestamps (§1.9).
- **Daily manifest.** `src/manifest.py` computes a SHA-256 over each day's
  new records and appends it, formatted as a SPEC-A hypothesis-ledger
  INTEGRITY entry, to `spec_a_ledger_appends.jsonl`. The frozen SPEC-A
  ledger itself lives with FREEZE-1; these appends are queued here in its
  exact format for its next append window.

## Premise schema (§1.1, `src/premise.py` + `registry/`)

A premise is the adjustment grammar (TRIGGER → AFFECTED → DIRECTION →
MAGNITUDE → LOG) plus a **mandatory stated probability** `p ∈ [0.01, 0.99]`
and a **machine-readable resolution** `{quantity, comparator, threshold,
source, resolve_by_utc}`. AFFECTED must exist in the resolvable-quantity
registry (8 initial quantities, §1.4). Family must be one of the 7
adjustment families; `type_id` must be a registered premise type.

- Strict (live-authoring) writes **reject** a premise with no valid `p` or
  no valid resolution at write time (§1.1.2).
- A premise that cannot resolve is stored as **UNRESOLVABLE** and never
  graded (§1.1.1). UNRESOLVABLE is a status, not a deletion.

## Importer (`src/importer.py`)

Imports the two pre-SPEC-C sources into this store without duplicating the
premise-grading schema: the bridge model's premise instance (branch
`motif/bridge-model-2026-10-15`) and the premise-grading ledger's seeded
records (branch `motif/premise-grading-2026-10-15`). Dedupe is by
`premise_id`; where both sources carry a premise, the grading-ledger record
is canonical (it already links the bridge source). The 2026-10-15 seed:
13 source records read → 5 duplicates linked → **8 premises stored, 0 clean,
8 UNRESOLVABLE** — every seeded premise predates SPEC-C (no stated `p`, no
machine-readable resolution, no family/type registration). Full report:
`trackrecords/import_report_2026-10-15.json`.

## S1: T0 line-move forecast + LMS (`src/dossier.py`, `src/reference.py`, `src/lms.py`)

- **Forecast field**: a three-way probability vector q = (AWAY, FLAT, HOME),
  validated to sum to 1; or the explicit `MISSED_T0` marker. A missing
  forecast scores as the reference — skipping a game can never help (§2.4).
- **Sign convention** (§2.2 = SPEC-A §3): the archive stores the home spread
  as points received; the SPEC-A line is the home-strength number, so
  `line = −(archived home line)`. Categories: AWAY Δ ≤ −0.5, FLAT |Δ| < 0.5,
  HOME Δ ≥ +0.5, Δ = line(T1) − line(T0). line(T0) = last capture ≤ T0;
  line(T1) = last capture before kickoff.
- **R0**: point-in-time category frequencies over completed archived
  trajectories. **R1** switches in at 200 trajectories by the frozen rule.
  State: `trackrecords/r0_reference.json` (today: 0 completed trajectories —
  the archive opened 2026-10-15 and every Week 6 T0 predates or coincides
  with its first capture; R0 is INSUFFICIENT_DATA, stated, not fabricated).
- **LMS**: `LMS = 1 − ΣRPS(q)/ΣRPS(R)`, RPS per §2.2; uncertainty by paired
  week-block bootstrap (SPEC-A machinery discipline, B = 10,000 default;
  not estimable below two distinct weeks — reported as such).
  State: `trackrecords/lms_state.json` — **ACCRUING from the next T0**
  (2026_06_DAL_GB, T0 2026-10-15 19:20 CT per the accrual calendar).

## Tonight's game (2026_06_SEA_DEN) — MISSED-T0

T0 was 2026-10-12 20:15 ET (2026-10-13T00:15:00Z), before this store
existed. No T0 read can be authored now without violating the stamp rule,
and none was: the dossier (`dossiers/2026/6/2026_06_SEA_DEN/v1.json`) carries
the 8 imported premises and a `MISSED_T0` forecast marker. The game scores
MISSING (= the reference). Its LMS outcome is additionally unresolvable
from this archive — no capture at or before T0 exists, so line(T0) was
never archived. Both facts are recorded in the store, not smoothed over.

## Accrual calendar

`trackrecords/t0_accrual_calendar_2026_w06_w07.json`: every remaining
Week 6 + Week 7 game with kickoff_utc, t0_utc, t0_ct, and status vs the
server clock at generation. Regenerate with `src/t0_calendar.py` via
`src/run_s1.py`.

## Isolation (§4.9)

Nothing in this package writes to the scored construction or SPEC-B product
pricing (§0.3). `tests/test_introspection.py::test_isolation_no_import_path_into_pricing`
scans the import specifiers of the SPEC-B pricing surface
(`packages/prediction-engine/src`, `packages/quote-plane`,
`apps/web/lib/pricing`, `apps/web/app/pricing`, `apps/web/components/pricing`)
and asserts no import path from `introspection/`, the situational-graph /
bridge / premise-grading / reasoning-dossier trees, or `intelligence/`.
Run it before every generator version boundary and every product release,
per §4.9.

## Running

```
python3 -m pytest introspection/tests -q
python3 introspection/src/run_s1.py --root introspection \
  --bridge <bridge premises.json> --grading <premise-grades.jsonl> \
  --archive <line-archive.jsonl> --schedule data/gse-dataset/games.jsonl
```

SPEC-C stays DRAFT. No freeze claims are made by this build.
