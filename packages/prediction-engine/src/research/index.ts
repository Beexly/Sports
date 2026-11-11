/**
 * Research layer — paper-derived evidence, weighting, and calibration.
 *
 * Wiring order enforced by doctrine: research -> wire -> weight -> calibrate -> test.
 * This module is the wired surface; nothing here performs I/O.
 */
export * from "./types.js";
export * from "./weighting.js";
export * from "./calibration.js";
export * from "./registry.js";
