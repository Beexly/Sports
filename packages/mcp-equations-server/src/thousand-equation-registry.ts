/**
 * thousand-equation-registry.ts — In-memory registry and 288-bit context mask selector
 * for the Thousand-Equation Matrix (9,092+ grounded and sweep-governed equations).
 *
 * Grounded in:
 *   - Category A: Fluid, Environmental & Aerodynamic Dynamics
 *   - Category B: Biomechanical & Kinetic Fatigue Translation
 *   - Category C: Trench Pocket Physics & Blitz Disruption
 *   - Category D: Information Theory, Scheme Fit & Entropy
 *   - Category E: Game Theory & Sequential Decision Processes
 *   - Category F: Conformal Calibration, FWL Residualization & Market Copulas
 *   - Category G: Expected Metrics (Q1-Q51) & Situational Play Execution
 *
 * Zero Neon DB cost at runtime ($0 spend against Neon CU during the 175-snap loop).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Premise, VerificationStatus } from "./mcp-cognitive-router.js";
import { SIGNAL_FAMILIES, MIN_SAMPLE } from "./mcp-cognitive-router.js";

export interface MatrixEquationEntry {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly signalFamilyIdx: number;
  readonly equationLatex: string;
  readonly verificationStatus: "CITABLE_VERIFIED" | "COMPUTED" | "INFERENCE";
  readonly load_bearing: boolean;
  readonly noyes_z_eff: number;
  readonly priorWeight: number;
  readonly rawLogOddsDelta: number;
  readonly jacobianSensitivity: number;
  readonly cluster: string;
  readonly source: string;
  readonly sweepVerdict?: string;
}

export interface ThousandEquationMatrix {
  readonly schema_version: string;
  readonly generated_at_utc: string;
  readonly total_equations: number;
  readonly citable_verified_count: number;
  readonly computed_count: number;
  readonly inference_quarantined_count: number;
  readonly load_bearing_count: number;
  readonly context_mask_bits: number;
  readonly signal_families_count: number;
  readonly matrix_sha256?: string;
  readonly equations: readonly MatrixEquationEntry[];
}

let _cachedMatrix: ThousandEquationMatrix | null = null;

/**
 * Resolve the path to data/engine/thousand_equation_matrix_2026.json.
 */
export function resolveMatrixPath(): string {
  // Module-relative repo path first: deterministic regardless of cwd. The old
  // hardcoded C:/c/wt-week8-forensic worktree candidate is purged — it silently
  // shadowed the repo's own matrix with a stale foreign copy whenever the cwd
  // was not the repo root (e.g. under vitest).
  const candidates: string[] = [];
  try {
    const curDir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
    candidates.push(resolve(curDir, "../../../data/engine/thousand_equation_matrix_2026.json"));
  } catch {
    // Ignore ESM/CJS path resolution errors
  }
  candidates.push(resolve(process.cwd(), "data/engine/thousand_equation_matrix_2026.json"));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

/**
 * Clear the cached matrix in test runs if the underlying artifact is refreshed.
 */
export function clearThousandEquationMatrixCache(): void {
  _cachedMatrix = null;
}

/**
 * Load the compiled 9,092+ equation matrix into memory.
 */
export function loadThousandEquationMatrix(): ThousandEquationMatrix {
  if (_cachedMatrix) return _cachedMatrix;
  const p = resolveMatrixPath();
  if (!existsSync(p)) {
    throw new Error(`thousand_equation_matrix_2026.json not found at ${p}. Run build_thousand_equation_matrix.py first.`);
  }
  const raw = readFileSync(p, "utf-8");
  _cachedMatrix = JSON.parse(raw) as ThousandEquationMatrix;
  return _cachedMatrix;
}

interface MatrixBitIndex {
  readonly loadBearingByBit: readonly MatrixEquationEntry[][];
  readonly allByBit: readonly MatrixEquationEntry[][];
}

const _bitIndexByMatrix = new WeakMap<ThousandEquationMatrix, MatrixBitIndex>();

function classifyMatrixStratum(id: string): 0 | 1 | 2 | 3 {
  if (id.startsWith("EQ-SOV-")) return 1;
  if (id.startsWith("EQ-SHARDB-")) return 2;
  if (id.startsWith("EQ-SWEEP-")) return 3;
  return 0;
}

function verificationPriorityRank(status: MatrixEquationEntry["verificationStatus"]): number {
  if (status === "CITABLE_VERIFIED") return 0;
  if (status === "COMPUTED") return 1;
  return 2;
}

function compareMatrixEntries(a: MatrixEquationEntry, b: MatrixEquationEntry): number {
  const rankDiff =
    verificationPriorityRank(a.verificationStatus) -
    verificationPriorityRank(b.verificationStatus);
  if (rankDiff !== 0) return rankDiff;
  const deltaDiff = Math.abs(b.rawLogOddsDelta) - Math.abs(a.rawLogOddsDelta);
  if (deltaDiff !== 0) return deltaDiff;
  return b.priorWeight - a.priorWeight;
}

function interleaveByStrata(
  entries: readonly MatrixEquationEntry[],
  bitOffset: number,
): MatrixEquationEntry[] {
  if (entries.length <= 1) return [...entries];
  const strata: [
    MatrixEquationEntry[],
    MatrixEquationEntry[],
    MatrixEquationEntry[],
    MatrixEquationEntry[],
  ] = [[], [], [], []];
  for (const eq of entries) {
    strata[classifyMatrixStratum(eq.id)].push(eq);
  }
  for (const bucket of strata) {
    bucket.sort(compareMatrixEntries);
  }
  const interleaved: MatrixEquationEntry[] = [];
  const cursors = [0, 0, 0, 0];
  const startStratum = ((bitOffset % 4) + 4) % 4;
  while (interleaved.length < entries.length) {
    let progressed = false;
    for (let step = 0; step < 4; step += 1) {
      const s = (startStratum + step) % 4;
      const bucket = strata[s]!;
      const idx = cursors[s]!;
      if (idx < bucket.length) {
        interleaved.push(bucket[idx]!);
        cursors[s] = idx + 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return interleaved;
}

function getOrBuildMatrixBitIndex(matrix: ThousandEquationMatrix): MatrixBitIndex {
  const cached = _bitIndexByMatrix.get(matrix);
  if (cached) return cached;

  const rawLoadBearing: MatrixEquationEntry[][] = Array.from(
    { length: SIGNAL_FAMILIES },
    () => [],
  );
  const rawAll: MatrixEquationEntry[][] = Array.from(
    { length: SIGNAL_FAMILIES },
    () => [],
  );

  for (const eq of matrix.equations) {
    const bit = eq.signalFamilyIdx;
    if (bit < 0 || bit >= SIGNAL_FAMILIES) continue;
    rawAll[bit]!.push(eq);
    if (eq.load_bearing) {
      rawLoadBearing[bit]!.push(eq);
    }
  }

  const built: MatrixBitIndex = {
    loadBearingByBit: rawLoadBearing.map((entries, bit) => interleaveByStrata(entries, bit)),
    allByBit: rawAll.map((entries, bit) => interleaveByStrata(entries, bit)),
  };
  _bitIndexByMatrix.set(matrix, built);
  return built;
}

/**
 * Check if a signal family bit is active in the 288-bit context mask.
 */
export function isFamilyActive(mask: Uint32Array, familyIdx: number): boolean {
  if (familyIdx < 0 || familyIdx >= SIGNAL_FAMILIES) return false;
  const word = Math.floor(familyIdx / 32);
  const bit = familyIdx % 32;
  return ((mask[word]! & (1 << bit)) >>> 0) !== 0;
}

type CandidatePremise = Premise & {
  readonly jacobianSensitivity: number;
  readonly rawLogOddsDelta: number;
  readonly category: string;
  readonly signalFamilyIdx: number;
};

function mapMatrixEntryToPremise(
  eq: MatrixEquationEntry,
  signalDisplacementByFamily: ReadonlyMap<number, number>,
  hasSignalsFilter: boolean,
): CandidatePremise {
  const vStatus: VerificationStatus =
    eq.verificationStatus === "CITABLE_VERIFIED"
      ? "HIGH_PRIORITY_PRODUCTION_TARGET"
      : eq.verificationStatus === "COMPUTED"
        ? "GATED_EXPERIMENT_CANDIDATE"
        : "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST";

  const liveDisp = signalDisplacementByFamily.get(eq.signalFamilyIdx);
  // In live conditioning mode (signals supplied) a fired family with no
  // measured displacement contributes ZERO; the stored matrix prior is not
  // a substitute for a missing measurement.
  const conditionedDelta =
    liveDisp !== undefined
      ? Number(
          (
            Math.abs(eq.rawLogOddsDelta) *
            Math.sign(liveDisp) *
            Math.min(2.0, Math.max(0.25, Math.abs(liveDisp)))
          ).toFixed(6),
        )
      : hasSignalsFilter
        ? 0
        : eq.rawLogOddsDelta;

  const tier =
    eq.verificationStatus === "CITABLE_VERIFIED"
      ? "CITABLE_VERIFIED"
      : eq.verificationStatus === "COMPUTED"
        ? "COMPUTED"
        : "RESEARCH_HYPOTHESIS";

  return {
    id: eq.id,
    premise: `${eq.title}: ${eq.equationLatex}`,
    cluster: eq.cluster,
    similarity: eq.priorWeight,
    verificationStatus: vStatus,
    verificationTier: tier,
    backtestPassed: eq.load_bearing,
    jacobianSensitivity: eq.jacobianSensitivity,
    rawLogOddsDelta: conditionedDelta,
    category: eq.category,
    signalFamilyIdx: eq.signalFamilyIdx,
  };
}

/**
 * Select candidate premises in O(topK) using active bits in the 288-bit context mask.
 * Interleaves active bit buckets and corpus strata (core, EQ-SOV, EQ-SHARDB, EQ-SWEEP)
 * so late-section grounded equations reach Stage C/D without array-order starvation.
 */
export function selectCandidatePremisesByContextMask(
  mask: Uint32Array,
  opts: {
    readonly topK?: number;
    readonly includeInference?: boolean;
    readonly signals?: readonly { readonly family: number; readonly displacement: number; readonly n: number }[];
  } = {},
): CandidatePremise[] {
  const topK = opts.topK ?? 250;
  if (topK <= 0) return [];

  const matrix = loadThousandEquationMatrix();
  const bitIndex = getOrBuildMatrixBitIndex(matrix);
  const buckets = (opts.includeInference ?? false) ? bitIndex.allByBit : bitIndex.loadBearingByBit;

  const activeBuckets: MatrixEquationEntry[][] = [];
  for (let bit = 0; bit < SIGNAL_FAMILIES; bit += 1) {
    if (!isFamilyActive(mask, bit)) continue;
    const bucket = buckets[bit];
    if (bucket && bucket.length > 0) {
      activeBuckets.push(bucket);
    }
  }
  if (activeBuckets.length === 0) {
    return [];
  }

  const signalDisplacementByFamily = new Map<number, number>();
  if (opts.signals) {
    for (const s of opts.signals) {
      if (Number.isFinite(s.displacement) && Math.abs(s.displacement) > 0 && s.n >= MIN_SAMPLE) {
        signalDisplacementByFamily.set(s.family, s.displacement);
      }
    }
  }
  const hasSignalsFilter = opts.signals !== undefined;

  // NO BACKFILL. Only equations whose family bit fired are visited round-robin.
  const matched: CandidatePremise[] = [];
  const cursors = new Int32Array(activeBuckets.length);
  while (matched.length < topK) {
    let progressed = false;
    for (let i = 0; i < activeBuckets.length && matched.length < topK; i += 1) {
      const bucket = activeBuckets[i]!;
      const cursor = cursors[i]!;
      if (cursor < bucket.length) {
        matched.push(
          mapMatrixEntryToPremise(bucket[cursor]!, signalDisplacementByFamily, hasSignalsFilter),
        );
        cursors[i] = cursor + 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  return matched;
}
