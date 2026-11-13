/**
 * thousand-equation-registry.ts — In-memory registry and 288-bit context mask selector
 * for the Thousand-Equation Matrix (1,520 verified equations).
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
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Premise, VerificationStatus } from "./mcp-cognitive-router.js";
import { MASK_WORDS, SIGNAL_FAMILIES, MIN_SAMPLE } from "./mcp-cognitive-router.js";

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
 * Load the compiled 1,520-equation matrix into memory.
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

/**
 * Check if a signal family bit is active in the 288-bit context mask.
 */
export function isFamilyActive(mask: Uint32Array, familyIdx: number): boolean {
  if (familyIdx < 0 || familyIdx >= SIGNAL_FAMILIES) return false;
  const word = Math.floor(familyIdx / 32);
  const bit = familyIdx % 32;
  return ((mask[word]! & (1 << bit)) >>> 0) !== 0;
}

/**
 * Select candidate premises by matching active bits in the 288-bit context mask.
 * Maps matrix equations into Premise objects compatible with stageC / stageD.
 */
export function selectCandidatePremisesByContextMask(
  mask: Uint32Array,
  opts: {
    readonly topK?: number;
    readonly includeInference?: boolean;
    readonly signals?: readonly { readonly family: number; readonly displacement: number; readonly n: number }[];
  } = {},
): (Premise & {
  readonly jacobianSensitivity: number;
  readonly rawLogOddsDelta: number;
  readonly category: string;
  readonly signalFamilyIdx: number;
})[] {
  const matrix = loadThousandEquationMatrix();
  const topK = opts.topK ?? 250;
  const includeInference = opts.includeInference ?? false;

  const signalDisplacementByFamily = new Map<number, number>();
  if (opts.signals) {
    for (const s of opts.signals) {
      if (Number.isFinite(s.displacement) && Math.abs(s.displacement) > 0 && s.n >= MIN_SAMPLE) {
        signalDisplacementByFamily.set(s.family, s.displacement);
      }
    }
  }

  const matched: (Premise & {
    readonly jacobianSensitivity: number;
    readonly rawLogOddsDelta: number;
    readonly category: string;
    readonly signalFamilyIdx: number;
  })[] = [];

  for (const eq of matrix.equations) {
    if (!includeInference && !eq.load_bearing) continue;
    // Check if bit is set in context mask
    const bitFired = isFamilyActive(mask, eq.signalFamilyIdx);
    if (!bitFired) continue;

    const vStatus: VerificationStatus =
      eq.verificationStatus === "CITABLE_VERIFIED"
        ? "HIGH_PRIORITY_PRODUCTION_TARGET"
        : eq.verificationStatus === "COMPUTED"
          ? "GATED_EXPERIMENT_CANDIDATE"
          : "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST";

    const liveDisp = signalDisplacementByFamily.get(eq.signalFamilyIdx);
    // In live conditioning mode (signals supplied) a fired family with no
    // measured displacement contributes ZERO — the stored matrix prior is not
    // a substitute for a missing measurement. Without signals the compiled
    // matrix prior is itself the data (pure prior mode).
    const conditionedDelta =
      liveDisp !== undefined
        ? Number(
            (
              Math.abs(eq.rawLogOddsDelta) *
              Math.sign(liveDisp) *
              Math.min(2.0, Math.max(0.25, Math.abs(liveDisp)))
            ).toFixed(6),
          )
        : opts.signals !== undefined
          ? 0
          : eq.rawLogOddsDelta;

    const tier =
      eq.verificationStatus === "CITABLE_VERIFIED"
        ? "CITABLE_VERIFIED"
        : eq.verificationStatus === "COMPUTED"
          ? "COMPUTED"
          : "RESEARCH_HYPOTHESIS";

    matched.push({
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
    });
  }

  // NO BACKFILL. The previous version padded any shortfall with the
  // highest-weighted citable premises regardless of the context mask, so an
  // empty or non-firing mask still moved the router. A premise whose family
  // bit did not fire contributes nothing and is not selected.
  return matched.slice(0, topK);
}
