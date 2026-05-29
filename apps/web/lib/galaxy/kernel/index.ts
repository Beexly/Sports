/**
 * Galaxy Product Kernel — central nervous system.
 *
 * The Kernel is the single typed source of truth for everything Galaxy
 * considers a first-class product concept: surfaces, navigation, launch
 * modes, taxonomies, reports, academy modules, pricing features, and
 * shareable artifacts.
 *
 * Consumed by every public page, every cockpit page, every API route,
 * the sitemap, robots, nav, footer, and the future AI assistant
 * context.
 *
 * Constitutional reminder (see GALAXY_CONSTITUTION.md):
 *  - No confidential methodology in this folder. Names, taxonomies,
 *    and surface metadata only. Weights, thresholds, prompts, and
 *    calibration rules stay server-only in `packages/prediction-engine/`
 *    or `apps/web/lib/prompts/`.
 *  - This folder is `apps/web/lib/galaxy/kernel/` and ships to the
 *    server. Anything here may be referenced by client components,
 *    so it must be safe to bundle.
 *
 * Adding a concept: create a new typed file in this folder, export
 * from this index, document the type, and reference from the
 * consuming surfaces.
 */

export * from "./launch-modes";
export * from "./trust-rules";
export * from "./public-copy-rules";
export * from "./surfaces";
export * from "./pricing";
export * from "./reports";
export * from "./academy";
export * from "./artifacts";
