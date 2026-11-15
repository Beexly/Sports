/**
 * WP-2 bridge: dump the nfl-farm cycles 1..36 situational registry as JSON.
 * The Python Week 10 quant-kernel runner consumes this instead of re-deriving
 * coefficients (the registry carries the verdict and weight for every term,
 * including the killed ones).
 *
 * Usage:
 *   TSX_TSCONFIG_PATH=packages/prediction-engine/tsconfig.json \
 *   node node_modules/tsx/dist/cli.mjs scripts/quant_kernel_dump_situational_constants.ts
 */
import {
  SITUATIONAL_CONSTANTS,
  MATERIAL_WEIGHT,
  verdictCensus,
} from "../packages/prediction-engine/src/nfl/situational-constants.js";

console.log(
  JSON.stringify({
    materialWeight: MATERIAL_WEIGHT,
    census: verdictCensus(),
    constants: SITUATIONAL_CONSTANTS,
  }),
);