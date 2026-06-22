/**
 * GSE — Universal Decision Intelligence layer (barrel export).
 *
 * One coherent decision-intelligence layer underneath the whole product. Each
 * module is a typed CONTRACT that references — never duplicates — the existing
 * systems it builds on (Signal Courtroom, Trust Ledger, trust-claims scanner,
 * Agents OS, Jarvis, memory, scraping clearance, calibration, pricing).
 *
 * Dependency direction is one-way: every domain module depends on
 * `gse-scoring-systems` for the shared {@link GseScore} primitive; that module
 * depends on nothing in GSE, so the barrel is acyclic.
 *
 * Docs: docs/research/GSE_2026_*.md
 */

export * from "./gse-scoring-systems";
export * from "./data-excellence";
export * from "./decision-ontology";
export * from "./evidence-engine";
export * from "./claim-safety";
export * from "./cognitive-operating-model";
export * from "./jarvis-decision-copilot";
export * from "./memory-policy";
export * from "./agent-orchestration";
export * from "./revenue-intelligence-os";
export * from "./product-operating-system";
export * from "./thinking-page-contracts";
