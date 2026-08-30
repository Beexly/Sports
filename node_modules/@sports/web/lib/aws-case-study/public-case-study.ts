export type AwsCaseStudyPillarId =
  | "operational_excellence"
  | "security"
  | "reliability"
  | "performance_efficiency"
  | "cost_optimization"
  | "sustainability";

export type AwsCaseStudyPillar = {
  readonly id: AwsCaseStudyPillarId;
  readonly name: string;
  readonly gseControl: string;
  readonly repoEvidence: readonly string[];
  readonly publicTakeaway: string;
};

export type AwsCaseStudyBoundary = {
  readonly label: string;
  readonly copy: string;
};

export type AwsCaseStudyProofPoint = {
  readonly label: string;
  readonly copy: string;
  readonly sourcePaths: readonly string[];
};

export type AwsCaseStudyLiveActionLocks = {
  readonly cloudResourcesCreated: false;
  readonly paidResources: false;
  readonly credentialsUsed: false;
  readonly deploymentApproved: false;
  readonly fundingApprovalClaimed: false;
  readonly productionReadyClaimed: false;
};

export const AWS_CASE_STUDY_LIVE_ACTION_LOCKS: AwsCaseStudyLiveActionLocks = {
  cloudResourcesCreated: false,
  credentialsUsed: false,
  deploymentApproved: false,
  fundingApprovalClaimed: false,
  paidResources: false,
  productionReadyClaimed: false,
};

export const AWS_CASE_STUDY_BOUNDARIES: readonly AwsCaseStudyBoundary[] = [
  {
    copy: "The route describes local AWS-style governance artifacts. It does not claim AWS approval, account setup, deployment, or production readiness.",
    label: "Shadow only",
  },
  {
    copy: "The work uses docs, fixtures, guardrails, and tests. It does not create AWS resources, mutate DNS, store credentials, or spend money.",
    label: "No-cost lane",
  },
  {
    copy: "Sports intelligence claims remain evidence-gated. Public probability, win-rate, profitability, and calibration claims require settled proof outside this case study.",
    label: "Evidence boundary",
  },
];

export const AWS_CASE_STUDY_PILLARS: readonly AwsCaseStudyPillar[] = [
  {
    gseControl: "Runbooks, local guardrails, review queues, and non-executable promotion packets define how the system is operated before live services exist.",
    id: "operational_excellence",
    name: "Operational excellence",
    publicTakeaway: "GSE treats operations as an evidence workflow, not a launch checklist.",
    repoEvidence: [
      "docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md",
      "docs/ops/LOCAL_REVIEW_QUEUE_PERSISTENCE_SIMULATOR.md",
    ],
  },
  {
    gseControl: "Source-rights fences, payload filters, API key hash contracts, raw-key absence checks, and no-raw-export guards reduce leakage risk.",
    id: "security",
    name: "Security",
    publicTakeaway: "The system is designed to fail closed around raw keys, raw source payloads, and unsafe public claims.",
    repoEvidence: ["docs/api/API_V1_SHADOW_SEAM.md", "docs/ip/SOURCE_RIGHTS_ENVELOPE.md"],
  },
  {
    gseControl: "Replay harnesses, idempotency checks, duplicate packet rejection, version conflicts, and stale packet reporting make failure states observable.",
    id: "reliability",
    name: "Reliability",
    publicTakeaway: "A decision system should be replayable enough to explain why it said no.",
    repoEvidence: ["docs/api/API_V1_SHADOW_ROUTE_REPLAY.md", "docs/api/API_V1_ABUSE_RESPONSE_FIXTURES.md"],
  },
  {
    gseControl: "Local fixture reports and metric payload envelopes keep the public route small while deeper model, source, and drift evidence stays behind review gates.",
    id: "performance_efficiency",
    name: "Performance efficiency",
    publicTakeaway: "The public surface can stay lean because the heavier intelligence work is structured behind typed seams.",
    repoEvidence: ["docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md", "docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md"],
  },
  {
    gseControl: "Cost gates, local-first fixtures, shadow infrastructure indexes, and non-executable promotion packets keep cloud ambition from becoming cloud spend.",
    id: "cost_optimization",
    name: "Cost optimization",
    publicTakeaway: "The case study is built to show discipline before spend.",
    repoEvidence: ["docs/aws/AWS_SHADOW_BOUNDARY.md", "docs/fable/aws/AWS_COST_SECURITY_GATES.md"],
  },
  {
    gseControl: "Synthetic fixtures, no-live-data demos, local screenshots, and hash-only storage patterns avoid unnecessary compute and data movement.",
    id: "sustainability",
    name: "Sustainability",
    publicTakeaway: "The first sustainable architecture choice is not running work that has not earned a reason to run.",
    repoEvidence: ["infra/aws-shadow/README.md", "docs/fable/aws/AWS_LOCAL_DATA_FACTORY.md"],
  },
];

export const AWS_CASE_STUDY_PROOF_POINTS: readonly AwsCaseStudyProofPoint[] = [
  {
    copy: "Shadow Control Tower fixtures describe governance gates without creating AWS accounts, organizations, DNS, or deploy targets.",
    label: "Governance operating system",
    sourcePaths: ["infra/aws-shadow/control-tower-policy.json", "docs/fable/aws/governance-os/README.md"],
  },
  {
    copy: "The Well-Architected lens maps each pillar to GSE controls while keeping every AWS action local and owner-gated.",
    label: "Six-pillar lens",
    sourcePaths: ["docs/aws/AWS_WELL_ARCHITECTED_GSE_LENS.md", "docs/fable/aws/AWS_SERVICE_SCORECARD.md"],
  },
  {
    copy: "API and review queue fixtures prove denial behavior, replay conflict handling, unresolved blocker reporting, and non-executable promotion gates.",
    label: "Abuse and review evidence",
    sourcePaths: ["docs/api/API_V1_ABUSE_RESPONSE_FIXTURES.md", "docs/ops/LOCAL_REVIEW_QUEUE_PERSISTENCE_SIMULATOR.md"],
  },
];
