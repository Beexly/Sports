/**
 * Composition layer — the ONE place every inventory entry is wired into
 * the prediction engine.
 *
 * Import this file and every source file, table, env var, API client,
 * exported function, and data artifact in the repository becomes reachable
 * and callable through the engine.
 */

import {
  createCompositionRegistry,
  type CompositionRegistry,
  type InventoryEntry,
  type AdapterResult,
  type Observation,
  type FailClosedResult,
  isObservation,
  isFailClosed,
} from "./universal-adapter.js";

// Re-export types
export type { CompositionRegistry, InventoryEntry, AdapterResult, Observation, FailClosedResult };
export { isObservation, isFailClosed, createCompositionRegistry };

// ── Engine-facing composition API ───────────────────────────────────────────

export interface EngineComposition {
  readonly registry: CompositionRegistry;
  /** Wire every inventory entry and return all results. */
  wireAll(entries: readonly InventoryEntry[]): ReadonlyMap<string, AdapterResult>;
  /** Get observations only (filters out fail-closed). */
  getObservations(entries: readonly InventoryEntry[]): Observation[];
  /** Get fail-closed results only. */
  getFailClosed(entries: readonly InventoryEntry[]): FailClosedResult[];
  /** Total entries processed. */
  total(): number;
}

/**
 * Create the engine composition from a full inventory.
 * This is the single entry point the coverage test uses.
 */
export function createEngineComposition(
  entries: readonly InventoryEntry[],
): EngineComposition {
  const registry = createCompositionRegistry(entries);
  return {
    registry,
    wireAll(entries: readonly InventoryEntry[]): ReadonlyMap<string, AdapterResult> {
      return registry.callAll(entries);
    },
    getObservations(entries: readonly InventoryEntry[]): Observation[] {
      const results = registry.callAll(entries);
      const out: Observation[] = [];
      for (const r of results.values()) {
        if (isObservation(r)) out.push(r);
      }
      return out;
    },
    getFailClosed(entries: readonly InventoryEntry[]): FailClosedResult[] {
      const results = registry.callAll(entries);
      const out: FailClosedResult[] = [];
      for (const r of results.values()) {
        if (isFailClosed(r)) out.push(r);
      }
      return out;
    },
    total(): number {
      return entries.length;
    },
  };
}

/**
 * Load inventory from the JSON file and create the composition.
 * Used by coverage.test.ts at runtime.
 */
export function loadInventoryAndCompose(
  inventoryJson: { entries: readonly InventoryEntry[] },
): EngineComposition {
  return createEngineComposition(inventoryJson.entries);
}
