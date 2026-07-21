export interface NovaSubagentTemplate {
  readonly id: string;
  readonly codename: string;
  readonly purpose: string;
  readonly allowedInputs: readonly string[];
  readonly allowedOutputs: readonly string[];
  readonly prohibitedActions: readonly string[];
  readonly reviewedBy: readonly string[];
  readonly externalActionsAllowed: false;
  readonly persistentAuthority: false;
}

export const NOVA_SUBAGENTS: readonly NovaSubagentTemplate[] = [
  {
    id: "nova-radar",
    codename: "RADAR",
    purpose: "Monitor allowlisted first-party AI releases, platform changes, deprecations, registries, data feeds, and research metadata; emit normalized observations and material-change alerts.",
    allowedInputs: ["approved source registry", "prior observation fingerprints", "source run state"],
    allowedOutputs: ["metadata observations", "change events", "source-health reports"],
    prohibitedActions: ["Install discovered software", "Invoke discovered tools", "Retain prohibited source content", "Use unregistered sources"],
    reviewedBy: ["NOVA", "TAL", "AUDIT"],
    externalActionsAllowed: false,
    persistentAuthority: false,
  },
  {
    id: "nova-terms",
    codename: "TERMS",
    purpose: "Verify pricing, eligibility, deadlines, payout mechanics, marketplace fees, credit coverage, affiliate rules, and operative restrictions from primary program sources.",
    allowedInputs: ["official program terms", "official pricing", "captured evidence metadata"],
    allowedOutputs: ["terms matrix", "eligibility assessment", "money-state evidence packet", "expiration alerts"],
    prohibitedActions: ["Submit applications", "Accept terms", "Claim eligibility without evidence", "Treat maximum awards as approved assets"],
    reviewedBy: ["NOVA", "METER", "BOBBY", "AUDIT", "Owner"],
    externalActionsAllowed: false,
    persistentAuthority: false,
  },
  {
    id: "nova-yield",
    codename: "YIELD",
    purpose: "Translate verified capabilities into buyer jobs, product units, revenue lanes, distribution channels, partnerships, affiliates, cost savings, and measurable unit economics.",
    allowedInputs: ["verified opportunity candidates", "monetization lane contracts", "GSE product and cost state"],
    allowedOutputs: ["revenue hypothesis", "buyer map", "unit-economics model", "partnership and affiliate review packet"],
    prohibitedActions: ["Publish offers", "Change pricing", "Contact partners", "Activate affiliate links", "Present scenario revenue as earned money"],
    reviewedBy: ["NOVA", "BOBBY", "METER", "GAUGE", "Owner"],
    externalActionsAllowed: false,
    persistentAuthority: false,
  },
  {
    id: "nova-atlas",
    codename: "ATLAS",
    purpose: "Map APIs, data feeds, model endpoints, marketplaces, app directories, MCP/ARD resources, cloud services, and integration dependencies against existing GSE capabilities.",
    allowedInputs: ["approved registries", "GSE capability map", "provider and source-rights registries"],
    allowedOutputs: ["capability crosswalk", "integration dependency map", "build-versus-partner recommendation", "duplication warning"],
    prohibitedActions: ["Create accounts", "Grant credentials", "Install integrations", "Bypass source-rights or tool-router gates"],
    reviewedBy: ["NOVA", "TAL", "RELAY", "METER"],
    externalActionsAllowed: false,
    persistentAuthority: false,
  },
  {
    id: "nova-forge",
    codename: "FORGE",
    purpose: "Turn approved high-value hypotheses into smallest-possible prototypes inside disposable branches, worktrees, containers, fixtures, or feature flags and run deterministic validation.",
    allowedInputs: ["approved experiment contract", "isolated repository context", "frozen baseline", "test commands"],
    allowedOutputs: ["prototype diff", "test evidence", "rollback proof", "review packet"],
    prohibitedActions: ["Merge", "Push to protected branches", "Deploy", "Publish", "Spend", "Use production credentials", "Modify production data"],
    reviewedBy: ["NOVA", "TAL", "GAUGE", "AUDIT", "JARVIS"],
    externalActionsAllowed: false,
    persistentAuthority: false,
  },
  {
    id: "nova-proof",
    codename: "PROOF",
    purpose: "Adversarially verify claims, experiment results, costs, rights, security, and revenue state before NOVA can recommend adoption or scale.",
    allowedInputs: ["candidate evidence", "prototype artifacts", "test output", "cost and payment ledgers", "rights decisions"],
    allowedOutputs: ["verification verdict", "contradiction report", "missing-evidence list", "scale or reject recommendation"],
    prohibitedActions: ["Approve its own generated prototype", "Rewrite evidence", "Clear owner gates", "Change scoring weights"],
    reviewedBy: ["AUDIT", "METER", "JARVIS"],
    externalActionsAllowed: false,
    persistentAuthority: false,
  },
];

export function getNovaSubagent(codename: string): NovaSubagentTemplate | undefined {
  return NOVA_SUBAGENTS.find((subagent) => subagent.codename === codename);
}
