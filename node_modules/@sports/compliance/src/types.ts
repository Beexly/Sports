/**
 * Compliance Control Monitor (CCM) + ISMS alignment kit — shared types.
 *
 * IMPORTANT FRAMING: this package supports SOC 2 TSC / ISO 27001 Annex A
 * *alignment* and *evidence collection* only. It never issues, implies, or
 * simulates a certification or audit opinion. A real SOC 2 report requires
 * an accredited CPA firm's audit; ISO 27001 certification requires an
 * accredited certification body. See docs/compliance/README.md.
 */

export type FrameworkTag = "SOC2" | "ISO27001" | "NIST_AI_RMF" | "EU_AI_ACT_THEME";

export type ControlDef = {
  id: string;
  title: string;
  description: string;
  ownerRole: string;
  soc2?: string[];
  iso27001?: string[];
  nistAiRmf?: string[];
  evidenceSources: string[];
};

export type EvidenceObject = {
  id: string;
  controlId: string;
  source: string;
  collectedAt: string;
  contentHash: string;
  uri?: string;
  meta?: Record<string, unknown>;
};

export type ControlCheckResult = {
  controlId: string;
  ok: boolean;
  detail: string;
  evidenceIds: string[];
};

export type CcmRunResult = {
  at: string;
  ok: boolean;
  results: ControlCheckResult[];
};
