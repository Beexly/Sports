// NFL STAT UNIVERSE — @sports/nfl-stat-universe
//
// Phase 1B: the organism's hunger system. A complete, typed map of NFL reality so every number is
// ingested, derived, disputed, priced, or marked missing — nothing floats. Each stat declares how it
// can be known legally, whether GSE derives it, the strongest public action it can support, and which
// surfaces go dark without it. Reuses the mesh's FactType/LegalVerdict/knowableAt and the runtime's
// DecisionState/MaxPermittedStrength; aligns with the canonical scraping clearance registry.
// Manifest + policy + planner only — no network, no keys, no ingestion (that's Phase 3).

export * from "./stat-category.js";
export * from "./stat-definition.js";
export * from "./nfl-stat-manifest.js";
export * from "./stat-compiler.js";
export * from "./audit.js";
export * from "./provider-portfolio.js";
export * from "./ingestion-cadence-planner.js";
export * from "./decision-state-matrix.js";
