

// Re-export the additive film contracts from their established NFL subpath.
// The public package import remains stable while callers can use the
// handoff-specified `film/*` paths.
export * from "./nfl/film/coverage-analyzer.js";
export * from "./nfl/film/film-splitter.js";
export * from "./nfl/film/highlight-detector.js";
