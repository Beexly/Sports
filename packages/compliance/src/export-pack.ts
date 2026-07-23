import { CONTROL_LIBRARY } from "./control-library";
import type { CcmRunResult, EvidenceObject } from "./types";

export const NON_CLAIM_DISCLAIMER =
  "Internal alignment pack only. Not a SOC 2 report or ISO 27001 certificate.";

export type CompliancePack = {
  disclaimer: string;
  generatedAt: string;
  frameworks: string[];
  controls: typeof CONTROL_LIBRARY;
  lastCcmRun: CcmRunResult | null;
  evidenceSample: EvidenceObject[];
};

export type ExportCompliancePackArgs = {
  lastCcmRun: CcmRunResult | null;
  evidenceSample: EvidenceObject[];
  generatedAt?: string;
};

/**
 * exportCompliancePack — produces the "evidence pack" export object. This is
 * ALWAYS an internal alignment artifact, never a claim of certification —
 * see the verbatim disclaimer above, which downstream consumers (docs,
 * scripts/compliance/export-evidence-pack.ts) must preserve unmodified.
 */
export function exportCompliancePack(args: ExportCompliancePackArgs): CompliancePack {
  return {
    disclaimer: NON_CLAIM_DISCLAIMER,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    frameworks: ["SOC2_TSC_mapping", "ISO27001_AnnexA_mapping"],
    controls: CONTROL_LIBRARY,
    lastCcmRun: args.lastCcmRun,
    evidenceSample: args.evidenceSample,
  };
}
