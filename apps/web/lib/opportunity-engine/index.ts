/**
 * NOVA opportunity engine — S1 deterministic domain contracts only.
 *
 * This barrel intentionally exports ONLY the S1 split-unit modules of the
 * frozen #146 split (`docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md`
 * §5.3). Source registry/runtime/evidence (S3), capability governance (S2),
 * and Founder OS/agent surfaces (S4) land in their own split units and are
 * re-added here as they merge.
 */
export * from "./types";
export * from "./lifecycle";
export * from "./scoring";
export * from "./policy";
export * from "./pipeline";
export * from "./experiment";
export * from "./learning";
export * from "./monetization";
