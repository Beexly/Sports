# pe_modules — vendored prediction-engine gate harnesses

Local harnesses for prediction-engine modules 1–24, vendored **byte-identical**
from the building workers' workspaces on 2026-10-12 so the gauntlet
(`intelligence/gates/gauntlet.py`) can execute them in the run path:

| vendored file | source workspace | modules |
|---|---|---|
| `pe_modules_01_04.py` | `~/workspace/gates/prediction_engine/prediction_engine_modules_1_4.py` | 1 confidence_score_computation, 2 tier_assignment, 3 input_completeness, 4 model_version_tracking |
| `pe_modules_05_08.py` | `~/workspace/gates/prediction_engine/prediction_engine_modules_5_8.py` | 5 derivatives_edge, 6 crew_penalty_epa_edge, 7 timeout_edge, 8 fg_kicker_edge |
| `pe_modules_13_16.py` | `~/workspace/gse_gates_pe_13_16/pe_modules_13_16.py` | 13 fg_kicker_epa, 14 timeout_wp_adjust, 15 derivative_probs, 16 crew_penalty_epa |
| `pe_modules_21_24.py` | `~/workspace/gates/prediction_engine/prediction_engine_gates.py` | 21 spread_margin_calibration, 22 total_ou_calibration, 23 team_total_calibration, 24 win_probability_calibration |

Canonical home of the packet: `Beexly/Sports` branch
`research/rating-atlas-2026-10-09-packet`,
`docs/research/2026-10-09/rating-atlas/minis/gates/prediction_engine/`
(the inventory is `.../minis/GSE_ENGINE_GATE_INVENTORY.md` on that branch).

Recorded stamps kept beside the code:

- `pe_modules_01_04_expected.json` — the harness's own stamp
  (`PE_MODULES_1_4_STAMP.json`): self-test verdicts, `overall_pass: true`.
- `pe_modules_13_16_expected.json` — 10 recorded self-test verdicts;
  the gauntlet re-runs the self-tests live and compares against these
  (reproduced 10/10 on 2026-10-12).

## Spec status: INFERRED — shadow only

These modules were built against specs **inferred by the building
worker**, not canonical specs. Per Garrett's 2026-10-12 order they run
in the gauntlet in **SHADOW mode only**: verdicts are recorded with
`spec_status: INFERRED` and are never allowed to block or clear
anything. Known inference risks, recorded in the harnesses themselves:

- Module 1's default test vectors compute expected values with the same
  formula under test (self-referential).
- Module 1's recorded stamp claims 3/3 passes per case while the case
  functions emit 4 checks — verdicts are the harness's own.
- Modules 5–8 refuse (error, not a fabricated verdict) when no frozen
  games manifest is supplied.
- Modules 21–24 refuse on empty paired sets by design; their criteria
  would permit a constant model that merely ties the close to pass at
  slope exactly 0.0 — the gauntlet's RVC gate, not these modules, is
  the clearance authority.

Modules 9–12, 17–20, 25–64 are **not** vendored: no executable harness
exists for them in the packet or this branch (see
`intelligence/gates/gauntlet_registry.json` for the per-module reasons).
