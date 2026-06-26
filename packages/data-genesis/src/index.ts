/**
 * @sports/data-genesis — the Data Genesis Engine.
 *
 * The law layer for synthetic intelligence in GSE. Every generated, inferred, modeled, or AI-assisted
 * signal (anything not directly observed) becomes a SyntheticSignal carrying a GenesisReceipt, must be
 * doubted (StructuredDoubt) and meta-doubted (did we doubt well enough?), and may only become
 * operational through one narrow promotion gate — after calibration evidence where it applies. Pure,
 * deterministic, dependency-light, and shadow-only: nothing here publishes, prices, or moves a pick.
 */

export * from "./brands.js";
export * from "./ids.js";
export * from "./canonical.js";
export * from "./receipt.js";
export * from "./signal.js";
export * from "./doubt.js";
export * from "./meta-doubt.js";
export * from "./calibration.js";
export * from "./promotion.js";
export * from "./validation.js";
export * from "./adapters.js";
