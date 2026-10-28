/**
 * DEPRECATED. Simulation now imports from metrics/gse-proprietary-seven.ts.
 * Do not add new logic here.
 *
 * This file is a thin re-export. Every name and signature below is preserved so
 * existing callers keep working; the bodies now live in the verified metrics
 * module, which is the single source of truth for the seven proprietary metrics.
 */

export type { Cell } from "../metrics/gse-proprietary-seven.js";

export {
  cellEpa,
  shannonBits,
  computeGseSiiCell as computeGseSii,
  computeGseQptsrCell as computeGseQptsr,
  computeGseRlsCell as computeGseRls,
  computeGseTorCell as computeGseTor,
  computeGseSpeseCell as computeGseSpese,
  computeGseSva,
  computeGseDwpBleed as computeGseDwp,
} from "../metrics/gse-proprietary-seven.js";

export const ANCHOR_MOTION_PA_SINGLE = { epa: 0.167, n: 5656 } as const;
export const ANCHOR_PRESSURE_HELD_TAX = 0.42;
