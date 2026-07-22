/**
 * NOVA opportunity engine — S1 deterministic domain contracts plus the S3
 * source-registry/evidence domain modules.
 *
 * This barrel exports the S1 split-unit modules of the frozen #146 split
 * (`docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md` §5.3) and, from the
 * S3 split unit, the pure source-domain modules (`source-registry`,
 * `change-detection`, `evidence`). The operational failed-closed polling
 * runtime lives in `scripts/nova/` (see `docs/ai/nova/S3_SOURCE_RUNTIME.md`)
 * and is deliberately NOT exported here — runtime receipts are artifacts, not
 * importable domain state. Capability governance (S2) and Founder OS/agent
 * surfaces (S4) land in their own split units and are re-added here as they
 * merge.
 */
export * from "./types";
export * from "./lifecycle";
export * from "./credit";
export * from "./credit-snapshot";
export * from "./scoring";
export * from "./policy";
export * from "./pipeline";
export * from "./experiment";
export * from "./learning";
export * from "./monetization";
export * from "./source-registry";
export * from "./change-detection";
export * from "./evidence";
