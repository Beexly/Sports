/**
 * @file model-registry.ts
 * Typed query API over the generated model registry.
 *
 * Why this exists
 * ---------------
 * 196 production modules in this package declare `ENABLED = false`, and 184 of them
 * have no production consumer. Nothing could answer "what models exist, what do
 * they need, and why are they off?" without grepping the tree. That made the
 * disabled population unauditable: a reviewer had no way to tell a module that
 * was waiting on data from one that was simply forgotten.
 *
 * The registry is generated from the filesystem by
 * `scripts/generate-model-registry.py` and committed as
 * `model-registry.generated.ts`. This module wraps it in a typed API so the
 * reasoning engine, the acceptance-gate ratchet test, and reviewers all query
 * the same source of truth.
 *
 * The tier classification matters more than the count. 152 of the 196 modules
 * are PURE_MATH: their exported functions take numbers, matrices and strings and
 * return numbers. They need no external dataset at all -- they need a caller.
 * Only 13 need tracking or model-artifact data that the repo does not have. That
 * distinction is the difference between "196 models are blocked" and "13 are
 * blocked and 152 could be called today."
 *
 * Regenerate the underlying data with:
 *   python scripts/generate-model-registry.py
 */

import {
  MODEL_REGISTRY,
  MODEL_REGISTRY_COUNTS,
  MODEL_REGISTRY_DIGEST,
} from "./model-registry.generated.js";

/** One disabled model module. */
export interface ModelRegistryEntry {
  /** Path relative to packages/prediction-engine/src. */
  readonly id: string;
  /** Filename stem. */
  readonly name: string;
  /** Source line count. */
  readonly lines: number;
  /** Input-data tier, e.g. PURE_MATH or DATA_TRACKING. */
  readonly tier: string;
  /** Why the classifier assigned this tier. */
  readonly reason: string;
  /** Names of exported functions. */
  readonly exports: readonly string[];
  /** Whether a sibling .test.ts exists. */
  readonly hasTest: boolean;
  /** Whether the module documents an ACCEPTANCE_GATE. */
  readonly hasGate: boolean;
}

/**
 * Input-data tiers.
 *
 * PURE_MATH and SELF_CONTAINED need no dataset the repo lacks. The DATA_* tiers
 * name the dataset a module would need before it could be exercised.
 */
export const MODEL_TIERS = [
  "PURE_MATH",
  "SELF_CONTAINED",
  "DATA_GAME",
  "DATA_SLATE",
  "DATA_TRACKING",
  "DATA_MODEL_ARTIFACT",
] as const;

export type ModelTier = (typeof MODEL_TIERS)[number];

/** Tiers whose modules can be called without acquiring new data. */
export const WIREABLE_TIERS: readonly string[] = ["PURE_MATH", "SELF_CONTAINED"];

/** Every disabled module, in path order. */
export function listModels(): readonly ModelRegistryEntry[] {
  return MODEL_REGISTRY;
}

/** Modules in one tier. */
export function modelsByTier(tier: string): readonly ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => m.tier === tier);
}

/**
 * Modules that need no external data and could be called today.
 *
 * These are the honest "wiring" candidates: a caller has to exist, but no new
 * dataset does. Wiring a DATA_TRACKING module instead would require inventing
 * tracking data, which this codebase forbids.
 */
export function wireableNow(): readonly ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => WIREABLE_TIERS.includes(m.tier));
}

/** Modules blocked on data the repository does not contain. */
export function needsExternalData(): readonly ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => m.tier.startsWith("DATA_"));
}

/** Modules with no documented promotion condition. */
export function withoutGate(): readonly ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => !m.hasGate);
}

/** Modules with no sibling test suite. */
export function withoutTest(): readonly ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => !m.hasTest);
}

/** Look one module up by stem or relative path. */
export function findModel(idOrName: string): ModelRegistryEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.id === idOrName || m.name === idOrName);
}

/** Aggregate counts, for reporting and ratchet assertions. */
export interface ModelRegistrySummary {
  readonly total: number;
  readonly digest: string;
  readonly byTier: Readonly<Record<string, number>>;
  readonly wireable: number;
  readonly needsExternalData: number;
  readonly withoutGate: number;
  readonly withoutTest: number;
}

export function registrySummary(): ModelRegistrySummary {
  const byTier: Record<string, number> = {};
  for (const m of MODEL_REGISTRY) {
    byTier[m.tier] = (byTier[m.tier] ?? 0) + 1;
  }
  return Object.freeze({
    total: MODEL_REGISTRY.length,
    digest: MODEL_REGISTRY_DIGEST,
    byTier: Object.freeze(byTier),
    wireable: wireableNow().length,
    needsExternalData: needsExternalData().length,
    withoutGate: withoutGate().length,
    withoutTest: withoutTest().length,
  });
}

export { MODEL_REGISTRY, MODEL_REGISTRY_COUNTS, MODEL_REGISTRY_DIGEST };
