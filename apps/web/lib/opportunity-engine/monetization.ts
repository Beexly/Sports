import type { RevenueLane } from "./types";

export interface MonetizationLaneDefinition {
  readonly lane: RevenueLane;
  readonly economicType: "DIRECT_REVENUE" | "INDIRECT_REVENUE" | "NON_DILUTIVE" | "COST_LEVER" | "NONE";
  readonly buyerOrPayer: string;
  readonly productUnit: string;
  readonly requiredProof: readonly string[];
  readonly requiredMetrics: readonly string[];
  readonly recurringCapable: boolean;
  readonly ownerApprovalRequired: boolean;
}

function lane(
  laneId: RevenueLane,
  economicType: MonetizationLaneDefinition["economicType"],
  buyerOrPayer: string,
  productUnit: string,
  requiredProof: readonly string[],
  requiredMetrics: readonly string[],
  recurringCapable: boolean,
  ownerApprovalRequired: boolean,
): MonetizationLaneDefinition {
  return { lane: laneId, economicType, buyerOrPayer, productUnit, requiredProof, requiredMetrics, recurringCapable, ownerApprovalRequired };
}

export const MONETIZATION_LANES: Readonly<Record<RevenueLane, MonetizationLaneDefinition>> = {
  subscription: lane("subscription", "DIRECT_REVENUE", "consumer or business subscriber", "recurring access tier", ["live offer", "checkout path", "entitlement fulfillment", "real payment receipt"], ["MRR", "activation", "paid conversion", "retention", "refunds", "churn"], true, true),
  usage_based_api: lane("usage_based_api", "DIRECT_REVENUE", "developer, application, agent, or enterprise", "metered API call, record, or compute unit", ["documented endpoint", "authentication", "metering", "rate limits", "billing event", "support boundary"], ["active keys", "requests", "successful calls", "revenue per million calls", "gross margin", "support burden"], true, true),
  data_license: lane("data_license", "DIRECT_REVENUE", "data consumer or enterprise", "rights-cleared dataset, feed, table, or derived signal", ["source-rights ledger", "data dictionary", "provenance", "refresh SLA", "license terms", "sample buyer job"], ["qualified buyers", "licensed tables", "renewal", "data freshness", "rights incidents", "gross margin"], true, true),
  model_license: lane("model_license", "DIRECT_REVENUE", "software vendor or enterprise", "model endpoint, weights license, or embedded inference", ["training rights", "evaluation record", "model card", "versioning", "safety limits", "commercial license"], ["paid inference", "license revenue", "quality versus baseline", "latency", "cost per task", "renewal"], true, true),
  training_data_license: lane("training_data_license", "DIRECT_REVENUE", "model developer or research organization", "owned or explicitly licensed training/evaluation records", ["record-level provenance", "consent and privacy basis", "commercial training permission", "deletion process", "license agreement"], ["accepted records", "rejection rate", "license revenue", "privacy requests", "rights exceptions"], true, true),
  evaluation_benchmark: lane("evaluation_benchmark", "DIRECT_REVENUE", "AI lab, vendor, or enterprise", "versioned benchmark, test harness, or evaluation report", ["rights-cleared test set", "frozen scoring protocol", "leakage controls", "reproducibility", "buyer-relevant task"], ["benchmark runs", "repeat buyers", "model coverage", "inter-rater reliability", "revenue per evaluation"], true, true),
  app_marketplace: lane("app_marketplace", "DIRECT_REVENUE", "marketplace customer", "app, agent, SaaS offer, extension, or add-on", ["marketplace eligibility", "review compliance", "listing economics", "fulfillment", "billing support", "privacy policy"], ["listing views", "installs", "activation", "paid conversion", "marketplace fee", "refunds", "retention"], true, true),
  workflow_product: lane("workflow_product", "DIRECT_REVENUE", "operator or business team", "repeatable workflow, automation, template, or managed outcome", ["measured manual baseline", "automation boundary", "failure handling", "time saved", "buyer acceptance"], ["completed workflows", "hours saved", "error rate", "rework", "revenue per workflow", "renewal"], true, true),
  affiliate: lane("affiliate", "INDIRECT_REVENUE", "approved merchant or platform", "qualified referral or revenue share", ["program acceptance", "operative commission terms", "jurisdiction eligibility", "disclosure", "attribution", "reversal rules"], ["qualified clicks", "approved conversions", "EPC", "commission", "reversal rate", "incremental user value"], true, true),
  referral: lane("referral", "INDIRECT_REVENUE", "approved vendor", "qualified lead, signup, or customer", ["written referral terms", "qualified-event definition", "disclosure", "tracking", "payout evidence"], ["qualified referrals", "acceptance", "payout", "time to payout", "rejections"], true, true),
  partnership: lane("partnership", "INDIRECT_REVENUE", "strategic partner", "joint product, bundled distribution, integration, or commercial agreement", ["named partner", "mutual value", "written scope", "economics", "data and IP terms", "termination path"], ["partner-sourced pipeline", "activated accounts", "joint revenue", "integration cost", "renewal"], true, true),
  co_sell: lane("co_sell", "INDIRECT_REVENUE", "cloud or channel partner", "partner-assisted enterprise opportunity", ["program eligibility", "listed offer", "co-sell readiness", "qualified opportunity", "revenue attribution"], ["registered deals", "partner acceptance", "pipeline", "win rate", "revenue", "sales cycle"], true, true),
  revenue_share: lane("revenue_share", "INDIRECT_REVENUE", "platform or commercial partner", "contracted share of attributable revenue", ["signed terms", "revenue definition", "deductions", "reporting", "audit rights", "payout evidence"], ["gross attributable revenue", "net share", "deductions", "payout lag", "disputes"], true, true),
  sponsorship: lane("sponsorship", "DIRECT_REVENUE", "brand or institution", "sponsored placement, research, content, event, or surface", ["audience evidence", "inventory", "disclosure", "brand-safety rules", "deliverables", "payment terms"], ["sold inventory", "delivery", "reach", "engagement", "renewal", "revenue"], true, true),
  professional_service: lane("professional_service", "DIRECT_REVENUE", "business client", "implementation, analysis, audit, integration, or managed service", ["buyer problem", "scope", "deliverables", "acceptance criteria", "price", "payment method"], ["qualified leads", "close rate", "revenue", "delivery hours", "gross margin", "repeat work"], true, true),
  research_license: lane("research_license", "DIRECT_REVENUE", "media, enterprise, investor, team, or research buyer", "research report, intelligence feed, or licensed methodology", ["owned analysis", "source citations", "license boundary", "update cadence", "buyer use case"], ["licensed reports", "subscribers", "renewal", "update cost", "citation defects"], true, true),
  grant: lane("grant", "NON_DILUTIVE", "grantor or challenge sponsor", "awarded non-dilutive funding or prize", ["official rules", "eligibility", "deadline", "application receipt", "award notice", "payment receipt"], ["eligible programs", "applications", "awards", "cash received", "restricted-use compliance", "owner hours"], false, true),
  agentic_micropayment: lane("agentic_micropayment", "DIRECT_REVENUE", "software agent or machine client", "machine-paid API call or digital resource", ["protocol support", "legal and tax review", "wallet and custody model", "fraud controls", "settlement evidence"], ["paid machine calls", "settlement failures", "fees", "fraud", "net revenue", "support cost"], true, true),
  cost_avoidance: lane("cost_avoidance", "COST_LEVER", "internal budget", "verified reduction in cash or owner-time cost", ["frozen baseline", "shadow comparison", "quality parity", "measured invoice or usage reduction"], ["monthly cash saved", "hours saved", "quality delta", "failure rate", "switching cost"], true, false),
  cloud_credit: lane("cloud_credit", "NON_DILUTIVE", "cloud or platform program", "approved and activated service credit", ["official eligibility", "application receipt", "award notice", "activation", "covered-service ledger", "expiration"], ["approved credits", "activated credits", "consumed credits", "cash displaced", "expiration risk"], false, true),
  none: lane("none", "NONE", "none", "non-monetized research or capability", ["defined learning or resilience objective"], ["learning captured", "decision improved"], false, false),
};

export function getMonetizationLane(laneId: RevenueLane): MonetizationLaneDefinition {
  return MONETIZATION_LANES[laneId];
}
