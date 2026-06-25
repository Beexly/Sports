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
export * from "./einstein/shock-calculus.js";
export * from "./einstein/conservation-law.js";
export * from "./einstein/book-genome.js";
export * from "./einstein/regime-topology.js";
export * from "./einstein/tradability-filter.js";
export * from "./einstein/negative-discovery-ledger.js";
export * from "./einstein/experiment-allocation.js";
export * from "./einstein/market-autopsy.js";
export * from "./einstein/self-disproof-court.js";

export * from "./einstein/belief-transition.js";

// Discovery Layer — autonomous market-science lab
export * from "./discovery/epistemic-compression.js";
export * from "./discovery/market-law-miner.js";
export * from "./discovery/theory-tournament.js";
export * from "./discovery/belief-state-transition.js";
export * from "./discovery/causal-representation-foundry.js";
export * from "./discovery/inverse-bookmaker-mind.js";
export * from "./discovery/market-dark-matter.js";
export * from "./discovery/belief-geodesic.js";
export * from "./discovery/phase-transition-detector.js";
export * from "./discovery/decision-leverage-index.js";
export * from "./discovery/ghost-economy.js";
export * from "./discovery/expected-discovery-yield.js";
export * from "./discovery/sensor-placement.js";
export * from "./discovery/counterfactual-market-theater.js";
export * from "./discovery/scientific-discovery-council.js";

// Fantasy Discovery Layer — Galaxy Fantasy Reality Twin (additive, shadow-only)
export * from "./fantasy/fantasy-role-state-vector.js";
export * from "./fantasy/fantasy-light-cone.js";
export * from "./fantasy/role-mass-transfer-engine.js";
export * from "./fantasy/fantasy-conservation-engine.js";
export * from "./fantasy/fantasy-absorption-half-life.js";
export * from "./fantasy/fantasy-format-relativity.js";
export * from "./fantasy/fantasy-belief-state-transition.js";
export * from "./fantasy/platform-dna-genome.js";
export * from "./fantasy/manager-dna-genome.js";
export * from "./fantasy/fantasy-decision-leverage-index.js";
export * from "./fantasy/fantasy-ghost-bench.js";
