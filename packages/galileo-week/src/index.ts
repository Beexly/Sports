// GALILEO WEEK — @sports/galileo-week
//
// Phase 3 scaffold (zero-spend, owner-gated). Builds the eight-atlas Week Intelligence structure over
// fixtures, prices the acquisition budget with a `--plan` dry-run that spends nothing, and fails closed
// on any LIVE run (this package holds no keys and makes no network calls). Live execution is a separate
// owner-gated integration that must supply approved keys after the dry-run.

export * from "./galileo-week-types.js";
export * from "./week-plan.js";
export * from "./atlas-builder.js";
export * from "./week-runner.js";
export * from "./galileo-week-fixtures.js";
