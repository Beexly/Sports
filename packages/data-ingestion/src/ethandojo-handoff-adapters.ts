/**
 * Ethandojo handoff adapters — additive composition layer.
 *
 * Exposes the OverTheCap salary adapter through the typed
 * `SalaryDataProvider` contract the prediction-engine ethandojo handoff
 * suite injects (`handoff-suite.ts` `EthandojoSuiteOptions.salaryProvider`).
 *
 * This file is deliberately additive:
 *  - It does NOT modify `source-registry.ts` or any live ingestion path.
 *  - It does NOT import `@sports/prediction-engine` (no reverse dependency).
 *  - The `SalaryDataProvider` shape is declared here to match the engine
 *    suite structurally; the OverTheCap client implements it.
 *
 * Composition entrypoint for wiring salary data into contract-value
 * analysis without touching any existing registry or source.
 */

import {
  createOverTheCapSalariesClient,
  isOverTheCapSalariesIngestEnabled,
  type OverTheCapSalariesOptions,
  type SalaryDataProvider,
} from "./overthecap-salaries.js";

export type { SalaryDataProvider } from "./overthecap-salaries.js";

// ─── Contract (mirrors prediction-engine handoff-suite) ──────────────────────

/**
 * Structural mirror of the engine suite's salary contract. Kept identical
 * on purpose so an adapter created here is assignable to
 * `EthandojoSuiteOptions.salaryProvider` without a shared package.
 */
export interface HandoffSalaryProvider {
  getCapHitMillions(playerName: string, season: number): Promise<number | null>;
  getAllCapHits(season: number): Promise<ReadonlyMap<string, number>>;
  isAvailable(): boolean;
}

/** Runtime assert that a provider satisfies the handoff contract. */
export function assertSalaryProvider(provider: HandoffSalaryProvider): void {
  if (typeof provider.getCapHitMillions !== "function") {
    throw new Error("assertSalaryProvider: missing getCapHitMillions");
  }
  if (typeof provider.getAllCapHits !== "function") {
    throw new Error("assertSalaryProvider: missing getAllCapHits");
  }
  if (typeof provider.isAvailable !== "function") {
    throw new Error("assertSalaryProvider: missing isAvailable");
  }
}

// ─── Composition ─────────────────────────────────────────────────────────────

export interface HandoffAdapterOptions extends OverTheCapSalariesOptions {
  /**
   * Optional replacement provider. When set, composition returns it after
   * contract validation instead of building the OverTheCap client — the
   * injection seam tests and callers use to swap fixtures in.
   */
  readonly salaryProvider?: HandoffSalaryProvider;
}

export interface EthandojoHandoffAdapters {
  /** Typed salary provider ready for `EthandojoSuiteOptions.salaryProvider`. */
  readonly salaryProvider: HandoffSalaryProvider;
  /** Env-gate state for the underlying OverTheCap adapter. */
  readonly overTheCapEnabled: boolean;
}

/**
 * Compose the handoff adapters. Builds the OverTheCap salary provider
 * (env-gated, no-store, fixture-testable) or accepts an injected provider,
 * validates the contract, and returns it ready for engine-suite wiring.
 */
export function createEthandojoHandoffAdapters(
  options: HandoffAdapterOptions = {},
): EthandojoHandoffAdapters {
  const injected = options.salaryProvider;
  const salaryProvider: SalaryDataProvider =
    injected !== undefined ? (injected as SalaryDataProvider) : createOverTheCapSalariesClient(options);

  assertSalaryProvider(salaryProvider);

  return {
    salaryProvider,
    overTheCapEnabled: isOverTheCapSalariesIngestEnabled(options.env ?? process.env),
  };
}

/**
 * Convenience: build just the salary provider (the seam the engine suite
 * consumes). Same contract as `createEthandojoHandoffAdapters().salaryProvider`.
 */
export function createHandoffSalaryProvider(
  options: HandoffAdapterOptions = {},
): HandoffSalaryProvider {
  return createEthandojoHandoffAdapters(options).salaryProvider;
}
