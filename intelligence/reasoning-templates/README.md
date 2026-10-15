# Stamped reasoning templates

The file home for the ingestion ledger's **stamped reasoning template**
taxonomy: Layer-2 qualitative reads and process records with a defined
stamp discipline. Invoked in authored reads and weekly process, never
auto-emitted; emission is ZERO_OBJECT for every template in this bucket.

## What lives here

- `template.schema.json` — the required header fields every template
  carries (rule, inputs, stamp discipline, reasoning availability,
  emission, dependencies).
- `index.json` — the bucket index. The nine pre-existing templates
  (weather ×2, atmosphere, layered revenge, logistical disruption,
  circadian / coast mismatch, altitude + short week composite, coaching
  honesty, injury context) are homed as census records in the ingestion
  ledger and are indexed here by census ID; the ten DFS process gates
  (C-063…C-072) are homed as files in this bucket
  (`dfs-gate-00-data-lock.md` … `dfs-gate-09-simulations.md`), one file
  per gate, rule text verbatim from the DFS Process System artifact of
  record (2026-09-27).
- `tests` — validation lives in `intelligence/tests/test_dfs_gate_templates.py`:
  every gate file must carry every schema field, the census IDs must be
  C-063…C-072 exactly once each, and emission must read ZERO_OBJECT.

## Stamp discipline (bucket-wide)

A template invocation is only valid with its stamps: the inputs it read,
each input's source and as-of/pull timestamp, and the lock time of the
record it produced. An unstamped invocation is not a weaker invocation —
it did not happen, the same rule the ledger applies to process records
("weekly slate lock timestamps").

## Doctrine fences

- Templates reason; they never emit. No template in this bucket produces
  a pick, a price, a probability, or a lineup by itself.
- Gate numbers are scoped: DFS GATE 02 (game-pick firewall) and GATE 04
  (injury gate) are NOT the engine's G-02 injury-pull gate, and the files
  say so, because the census already had to disambiguate them once.
