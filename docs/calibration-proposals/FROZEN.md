# MODEL_VERSION baseline — FROZEN

This file is the model-freeze guardrail's escape hatch for the
case where the current `MODEL_VERSION` is the intentional locked-in
baseline and no scoring weights have changed since the last
implemented calibration proposal.

The guardrail (`scripts/guardrails/model-freeze.mjs`) reads the
`frozen: <version>` line below and accepts it as evidence that
the version is locked.

**If you bump `MODEL_VERSION` in
`packages/prediction-engine/src/constants.ts`, you must do ONE of:**

1. Update the `frozen:` line below to the new version (only if
   no scoring weights changed — purely cosmetic version bumps for
   non-scoring code may keep this baseline marker).
2. Add a `CalibrationProposal` row to
   `packages/db/prisma/seed.ts` with the new `modelVersion` and
   `status: "IMPLEMENTED"` along with the observation + change
   that justified the bump.
3. Add `docs/calibration-proposals/<slug>.md` with front-matter:

   ```
   modelVersion: <new version>
   status: IMPLEMENTED
   ```

The model-freeze guard exists to keep historical confidence
numbers honest. A `MODEL_VERSION` bump retroactively re-labels
prior picks; that requires an audit trail.

---

frozen: v5.2.6

Locked: 2026-06-22
Locked by: calibration activation (path-to-70.md §7)
Reason: v5.1.0 activates isotonic calibration. The heuristic scoring
weights in `packages/prediction-engine/src/scoring.ts` are UNCHANGED
from the v5.0.0 baseline — the only change is that a validated isotonic
map turns the raw confidence score into a calibrated P(win) at the
display/conviction boundary, gated by CALIBRATION_ADJUSTMENTS_ENABLED.
Audit trail + held-out validation:
docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md.

Prior baseline — Locked: 2026-05-18 (Phase 9): v5.0.0, no scoring-weight
change; superseded by the v5.1.0 calibration activation above.
