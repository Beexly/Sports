import type { ControlDef } from "./types";

/**
 * CONTROL_LIBRARY — the seed set of controls the CCM continuously monitors
 * and maps to SOC 2 Trust Services Criteria / ISO 27001 Annex A / NIST AI
 * RMF. This is an internal alignment library, not a certified control set.
 *
 * Mirrored (by hand) in docs/compliance/CONTROL_LIBRARY.md — keep the two in
 * sync when editing.
 */
export const CONTROL_LIBRARY: ControlDef[] = [
  {
    id: "CTL-ACC-001",
    title: "Privileged access requires MFA",
    description:
      "All privileged (admin/operator) accounts must have multi-factor authentication enabled. Coverage is sampled from the identity provider / access snapshot.",
    ownerRole: "Security Lead",
    soc2: ["CC6.1", "CC6.2", "CC6.3"],
    iso27001: ["A.5.15", "A.5.17", "A.8.5"],
    evidenceSources: ["IdP MFA snapshot", "Access review export"],
  },
  {
    id: "CTL-CHG-001",
    title: "Production deploys go through change management",
    description:
      "Every production deployment must be tied to a reviewed pull request and pass required CI checks before release. Deploys missing a PR reference or with failed required checks are exceptions.",
    ownerRole: "Engineering Lead",
    soc2: ["CC8.1"],
    iso27001: ["A.8.25", "A.8.32"],
    evidenceSources: ["CI/CD deploy log", "Pull request metadata"],
  },
  {
    id: "CTL-LOG-001",
    title: "Governed-agent actions are receipt-logged",
    description:
      "Every governed-agent decision (admit/refuse) is captured as a signed receipt so agent actions are reconstructable and auditable after the fact.",
    ownerRole: "AI Platform Lead",
    soc2: ["CC7.2"],
    iso27001: ["A.8.15"],
    evidenceSources: ["Governed receipt log"],
  },
  {
    id: "CTL-LOG-002",
    title: "Receipt signatures verify and policy version is recorded",
    description:
      "Receipts must carry a verifiable signature and a policy version reference, so evidence of a decision cannot be silently forged or left un-attributable to a policy generation.",
    ownerRole: "AI Platform Lead",
    soc2: ["CC7.2", "CC7.3"],
    iso27001: ["A.8.15", "A.8.24"],
    evidenceSources: ["Governed receipt log", "Policy version register"],
  },
  {
    id: "CTL-KEY-001",
    title: "Signing keys are managed and rotatable",
    description:
      "Cryptographic keys used to sign governed receipts and other control-relevant artifacts are tracked by key id (kid), so a compromised or rotated key can be identified and revoked without invalidating unrelated evidence.",
    ownerRole: "Security Lead",
    soc2: ["CC6.1"],
    iso27001: ["A.8.24"],
    evidenceSources: ["Key registry", "Governed receipt log"],
  },
  {
    id: "CTL-MON-001",
    title: "Continuous control monitoring runs on a schedule",
    description:
      "The Compliance Control Monitor executes the full control check suite on a recurring basis and records the outcome, so control drift is detected between manual reviews instead of only at audit time.",
    ownerRole: "Compliance Owner",
    soc2: ["CC4.1", "CC7.1"],
    iso27001: ["A.8.16"],
    evidenceSources: ["CCM run history"],
  },
  {
    id: "CTL-AI-001",
    title: "AI agent decisions are traceable to a policy and an outcome",
    description:
      "AI-agent admit/refuse decisions are logged with the policy version and reasons that produced them, supporting downstream review of agent behavior against stated AI risk-management practices.",
    ownerRole: "AI Platform Lead",
    soc2: ["CC7.2"],
    iso27001: ["A.8.15", "A.8.16"],
    nistAiRmf: ["GOVERN-1.1", "MEASURE-2.7"],
    evidenceSources: ["Governed receipt log", "CCM run history"],
  },
  {
    id: "CTL-SUP-001",
    title: "Supplier / third-party risk is tracked",
    description:
      "Third-party and supplier relationships that touch in-scope systems or data are inventoried and reviewed for information-security risk as part of the ISMS scope.",
    ownerRole: "Compliance Owner",
    soc2: ["CC9.2"],
    iso27001: ["A.5.19", "A.5.21"],
    evidenceSources: ["Supplier register", "Vendor risk review notes"],
  },
];
