# premise-grading — the reasoning layer grades its own reads

Grok WO-8 Build 2 (frontier brief, 2026-10-15 §4). Pairs with Claude's
introspection-layer design (alignment pending at build time — this package
implements WO-8 §4's mechanics directly; see the alignment note in the
build deliverable).

The equation track has a scorer (CRPS against the close). The reasoning
layer did not: Layer 2 reads stated premises and nothing ever checked,
premise by premise, whether the world agreed. This ledger is that check.
For every Layer 2 read, the directional premise (or NO_BET) is recorded
with its stamped inputs and the engine's own stated uncertainty **before**
the game; after the game it is graded against an outcome artifact. The
loop is scored on the correctness of the stated premises and the honesty
of the stated uncertainty — it cannot be gamed by fitting the residual,
because it never looks at the residual.

This is knowledge infrastructure: weight 0, no emission, no picks, no
probabilities. Emission of any product still requires its own gate.

## The record (schema/premise-grade.schema.json)

One JSON object per line in `ledger/premise-grades.jsonl`, append-only.

| field | meaning |
|---|---|
| `record_version` | `"1.0"` |
| `ledger_seq` | position in the ledger, 1..N in file order; the chain breaks loudly if this is disturbed |
| `premise_id` | stable id from the source (bridge premise id, or minted for a read extraction) |
| `game_key` | internal game key, e.g. `2026_06_SEA_DEN` |
| `premise_type` | the bridge rule id (`altitude_short_week_composite`) or a read-extraction type (`injury_asymmetry`, `pass_discipline`) |
| `subject` | what the premise is about (`team:SEA`, `game:2026_06_SEA_DEN`, …) or null |
| `statement` | the premise, as stated by its source. **Immutable** across the premise's records |
| `direction` | `FAVORS_HOME` / `FAVORS_AWAY` / `AGAINST_HOME` / `AGAINST_AWAY` / `FRICTION` / `NEUTRAL` / `NO_BET` |
| `magnitude_band` | `STRONG` / `MODERATE` / `WEAK` / `NEUTRAL`, or null when the source bands nothing (authored reads) |
| `confidence_class` | `CORROBORATED` / `STAMPED` / `STRUCTURAL` (the bridge's mechanical classes) or `QUALITATIVE` (an authored read, in its own words) |
| `stated_uncertainty` | the source's own words/level about its certainty — verbatim for reads; the bridge's mechanical basis for bridge premises |
| `evidence` | links: `{kind, ref, as_of, detail}` — graph edges, read sections, stamped packets. At least one, always |
| `sources` | provenance links: which artifacts stated this premise. A premise stated by two sources carries both — linked, never double-counted |
| `as_of` | the premise's stamp (latest evidence stamp), or null when every evidence item is timeless |
| `status` | `PENDING` or `GRADED` |
| `outcome` | `{verdict, realized_fact, outcome_artifact}` — verdict is `PENDING` until graded, then `SUPPORTED` / `REFUTED` / `UNRESOLVED`; the realized fact and the artifact it came from are recorded with it |
| `miss_magnitude_class` | null while pending; `NONE` when supported; `SMALL` / `MODERATE` / `LARGE` when refuted; null when unresolved (no miss is established) |
| `graded_at` | when the grade was recorded (from the outcome artifact), null while pending |
| `grader_id` | who/what graded it, null while pending |
| `notes` | provenance, dedupe records, open items, grading notes |

## Grading rules

1. **A premise is graded only on what it actually claimed.** A friction
   premise ("variance and execution friction on the visitor") grades on
   friction evidence in the outcome artifact. It is never retrofitted
   into a point or margin claim after the game. The final score alone is
   **not** an outcome artifact for a friction premise.
2. **Outcome artifacts only.** Every grading field is transcribed from a
   structured outcome artifact whose `game_key` matches the premise's
   game. No grading from memory, prose, or vibes. Absent artifact →
   refusal.
3. **UNRESOLVED is first-class.** It means the artifact does not carry
   the evidence either way. It is not a failure, it does not enter the
   calibration denominator, and it is never smoothed away.
4. **Grading never rewrites a premise.** Grading appends a new record;
   the premise fields are copied verbatim, and chain validation fails if
   any of them changed. A wrong premise stays wrong in the record,
   graded REFUTED — that is what the track record is for.
5. **No re-grading in v1.** One PENDING record + at most one GRADED
   record per premise. A correction is a new premise, stated fresh.
6. **Dedupe by (game, premise type).** Two sources stating the same
   premise for a game produce one record with both sources linked. If
   they disagree on direction, ingest refuses and a human resolves it.

Per-type grading guidance (what the outcome artifact must carry):

- **Friction premises** (`altitude_exposure`, `altitude_short_week_composite`):
  friction evidence — e.g. tracking-derived second-half decay summaries,
  execution/play-by-play friction markers, or an authored post-game
  evidence review. SUPPORTED = the artifact documents friction consistent
  with the claim; REFUTED = it documents its absence at comparable
  measurement quality; UNRESOLVED = neither.
- **Neutral factual premises** (`rest_differential`, `short_week_game_context`,
  `weather_non_factor`): the realized fact itself (official schedule /
  realized game-time weather in the artifact). SUPPORTED = the stated
  condition held as stated.
- **Continuity context** (`coaching_continuity`): UNRESOLVED by default
  unless the artifact carries continuity/friction evidence. Never graded
  on the score.
- **Injury asymmetry** (`injury_asymmetry`): the artifact must carry
  realized availability (the inactives record resolves the open items the
  read named) plus secondary-performance context. SUPPORTED = the
  asymmetry materialized as claimed, per the artifact's evidence.
- **Pass discipline** (`pass_discipline`, direction NO_BET): graded only
  against a gate-evaluation artifact for the game. SUPPORTED = no
  gate-cleared edge existed, so the pass was correct discipline;
  REFUTED = one existed and was passed; UNRESOLVED without the artifact.

## Aggregates (the scorer's report)

- Counts by outcome, overall and per premise type.
- **Calibration table**: stated confidence class vs realized support rate,
  `SUPPORTED / (SUPPORTED + REFUTED)`. UNRESOLVED and PENDING are counted
  but excluded from the rate. A class with no decisive grades shows an
  empty cell (`—` / null) — empty cells stay empty: no smoothing, no
  imputation, no borrowing across classes. The table is expected to be
  empty until games are graded; that emptiness is the honest state, and
  weekly grading is what fills it.

## Usage

```bash
python3 premise_grading.py ingest --bridge inputs/<game>.bridge-premises.json \
    --reads inputs/<game>.wo0-premises.json --out ledger/premise-grades.jsonl
python3 premise_grading.py validate ledger/premise-grades.jsonl
python3 premise_grading.py grade ledger/premise-grades.jsonl \
    --premise-id <id> --outcome-artifact <artifact.json> --grader-id <id>
python3 premise_grading.py report ledger/premise-grades.jsonl [--json]
```

An outcome artifact is a JSON file authored by the grader:

```json
{"game_key": "2026_06_SEA_DEN", "verdict": "SUPPORTED",
 "realized_fact": "what the artifact documents, in one statement",
 "graded_at": "2026-10-16",
 "miss_magnitude_class": "SMALL (required only when REFUTED)",
 "notes": "optional"}
```

## Seeded state (2026-10-15)

`ledger/premise-grades.jsonl` holds the 8 premises for tonight's
SEA@DEN (2026_06_SEA_DEN): the bridge model's 5, plus Grok's WO-0
Layer 2 read's injury-asymmetry, weather, and NO_BET premises — with the
read's altitude/short-week composite and rest statements deduplicated
onto the bridge records as linked second sources. All 8 are PENDING.
The game kicks off 7:15 PM CT tonight; grading happens against outcome
artifacts produced after it, and the scorer refuses to grade before one
exists.

Inputs are vendored under `inputs/` for self-containment: the bridge
instance is a byte-identical copy (sha256
`d43b29c328e3061745471766e82b5f1d6cf9301598b3118579b7c776540d14e0`) of
`intelligence/situational-graph/bridge/instances/2026-week06-sea-at-den.premises.json`
on branch `motif/bridge-model-2026-10-15` @ `330b758`; the WO-0 extraction
is an authored artifact of this build, quoting the read verbatim where it
records stated uncertainty.
