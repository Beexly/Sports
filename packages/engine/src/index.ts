// GSE GALILEO / Market Reality Twin — additive, shadow-only market instrumentation.
// Build the telescope first; then observe the world through it. No live gates, no priced flags.
//
// Layering: market-physics/* are the tested PRIMITIVES; galileo/* are the higher-altitude
// INSTRUMENTS that build on them. The galileo wrappers re-export their primitive base, so each
// public name is exported exactly once from here.

// primitives (no galileo wrapper)
export * from "./market-physics/market-surface.js";
export * from "./market-physics/coherence.js";

// galileo instrument layer (each re-exports its market-physics base where applicable)
export * from "./galileo/alt-line-geometry.js"; // re-exports alt-line-curvature
export * from "./galileo/bookmaker-dna.js"; // re-exports book-dna
export * from "./galileo/role-shock-topology.js"; // re-exports role-state
export * from "./galileo/absorption-half-life.js"; // re-exports shock-absorption
export * from "./galileo/edge-ledger.js"; // re-exports market-physics/edge-ledger
export * from "./galileo/expression-router.js"; // superset router (new verbs)
export * from "./galileo/market-twin.js";
export * from "./galileo/incoherence-residual.js";
export * from "./galileo/counterfactual-line-oracle.js";
export * from "./galileo/edge-immune-system.js";
export * from "./galileo/narrative-gravity.js";

// Einstein Layer — Market Relativity & Belief Physics
export * from "./einstein/observer-frame.js";
export * from "./einstein/information-light-cone.js";
export * from "./einstein/flesh-state-vector.js";
