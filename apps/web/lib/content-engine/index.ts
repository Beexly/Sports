/**
 * Content Engine — public entry.
 *
 * Phase 8. Draft-only sports content engine. No auto-publish, no
 * fabrication, no LLM. Public-facing strings pass the Trust Claim
 * Registry scanner. Promotion content requires terms + disclosure +
 * responsible-gaming language. Performance content requires the
 * platform-wide performance gate.
 *
 * This module re-exports the small surface a route, API, or test
 * needs. The internal modules are pure functions so they can be
 * tested without a database.
 */

export * from "./types";
export * from "./source-coverage";
export * from "./compliance";
export * from "./readiness";
export * from "./templates";
export * from "./build-draft";
