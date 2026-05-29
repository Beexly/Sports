/**
 * AI Risk Controls — what Galaxy refuses to do with model output and
 * what it guards on the boundary.
 *
 * Conceptually aligned with NIST AI RMF (Govern/Map/Measure/Manage),
 * OWASP LLM Top 10, and ISO/IEC 42001 management discipline.
 * No certification is claimed; the alignment is methodological.
 */

export const NIST_AI_RMF_FUNCTIONS = ["govern", "map", "measure", "manage"] as const;
export type NistFunction = (typeof NIST_AI_RMF_FUNCTIONS)[number];

export const OWASP_LLM_RISKS = [
  "prompt-injection",
  "insecure-output-handling",
  "training-data-poisoning",
  "model-denial-of-service",
  "supply-chain-vulnerabilities",
  "sensitive-information-disclosure",
  "insecure-plugin-design",
  "excessive-agency",
  "overreliance",
  "model-theft",
] as const;
export type OwaspLlmRisk = (typeof OWASP_LLM_RISKS)[number];

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export interface RiskControl {
  readonly id: string;
  readonly owaspRisk: OwaspLlmRisk;
  readonly nistFunction: NistFunction;
  readonly severity: RiskSeverity;
  readonly mitigation: string;
  readonly enforcement: "design" | "code" | "review" | "test";
}

/** The Galaxy AI risk control catalog. */
export const RISK_CONTROLS: ReadonlyArray<RiskControl> = [
  {
    id: "rc-001",
    owaspRisk: "prompt-injection",
    nistFunction: "manage",
    severity: "high",
    mitigation:
      "System prompts and user prompts are kept structurally separate; all external content rendered inside <untrusted_external_data> envelopes before prompting; refuse to follow embedded instructions.",
    enforcement: "code",
  },
  {
    id: "rc-002",
    owaspRisk: "insecure-output-handling",
    nistFunction: "manage",
    severity: "high",
    mitigation:
      "Generated content is policy-gated by evaluateGeneratedBlogPolicy before publication. No model output is treated as an authority on betting outcomes.",
    enforcement: "code",
  },
  {
    id: "rc-003",
    owaspRisk: "sensitive-information-disclosure",
    nistFunction: "govern",
    severity: "critical",
    mitigation:
      "System prompts, weights, thresholds, and calibration are server-only and never serialized into API responses, logs, or client bundles. Trade-secret inventory TS-014 enforces.",
    enforcement: "design",
  },
  {
    id: "rc-004",
    owaspRisk: "excessive-agency",
    nistFunction: "govern",
    severity: "critical",
    mitigation:
      "The model cannot place bets, send external messages, or trigger payments. AI assistant boundaries are enumerated and tested.",
    enforcement: "design",
  },
  {
    id: "rc-005",
    owaspRisk: "overreliance",
    nistFunction: "measure",
    severity: "high",
    mitigation:
      "Every pick carries a failure case; every analytical surface carries a methodology link; the calibration gate prevents publishing win-rates without statistical backing.",
    enforcement: "design",
  },
  {
    id: "rc-006",
    owaspRisk: "training-data-poisoning",
    nistFunction: "map",
    severity: "medium",
    mitigation:
      "Galaxy does not fine-tune. The model is consumed via the vendor API with versioned prompts; vendor-side training set is out of scope.",
    enforcement: "review",
  },
  {
    id: "rc-007",
    owaspRisk: "model-denial-of-service",
    nistFunction: "manage",
    severity: "medium",
    mitigation:
      "Budget policy via evaluateClaudeBudgetUsage halts costly calls when the monthly cap is reached; override is explicit.",
    enforcement: "code",
  },
  {
    id: "rc-008",
    owaspRisk: "supply-chain-vulnerabilities",
    nistFunction: "govern",
    severity: "medium",
    mitigation:
      "Vendor API only, pinned via @anthropic-ai SDK; no untrusted plugins; no third-party model hubs.",
    enforcement: "review",
  },
  {
    id: "rc-009",
    owaspRisk: "model-theft",
    nistFunction: "govern",
    severity: "medium",
    mitigation:
      "Repo is private; production prompts live server-only in lib/prompts/; no public API exposes raw model behavior beyond the publish-gated surface.",
    enforcement: "design",
  },
  {
    id: "rc-010",
    owaspRisk: "insecure-plugin-design",
    nistFunction: "govern",
    severity: "low",
    mitigation:
      "No plugin/tool-use surface is exposed publicly; internal tool-use is server-side and never reaches the client bundle.",
    enforcement: "design",
  },
];

const BY_ID: ReadonlyMap<string, RiskControl> = new Map(RISK_CONTROLS.map((c) => [c.id, c]));
export function getRiskControl(id: string): RiskControl | undefined {
  return BY_ID.get(id);
}
