export type FounderWorkLane =
  | "FIRST_CASH"
  | "LAUNCH_BLOCKER"
  | "COST_AVOIDANCE"
  | "SECURITY_CONTINUITY"
  | "COMPOUNDING_ASSET"
  | "FRONTIER_OPTION";

export type FounderWorkState =
  | "DISCOVERED"
  | "VERIFIED"
  | "READY"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "OWNER_DECISION"
  | "MEASURED"
  | "PARKED";

export type FounderWorkAuthority = "AGENT_INTERNAL" | "OWNER_ONLY" | "AGENT_THEN_OWNER";

export interface FounderWorkItem {
  readonly id: string;
  readonly title: string;
  readonly project: "GSE" | "GSN" | "NOVA" | "XXX" | "LUMERA" | "PERSONAL";
  readonly lane: FounderWorkLane;
  readonly state: FounderWorkState;
  readonly authority: FounderWorkAuthority;
  readonly what: string;
  readonly why: string;
  readonly when: string;
  readonly how: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly evidenceRequired: readonly string[];
  readonly agentCanDo: readonly string[];
  readonly ownerOnly: readonly string[];
  readonly urgency: 1 | 2 | 3 | 4 | 5;
  readonly revenueImpact: 0 | 1 | 2 | 3 | 4 | 5;
  readonly cashAvoidance: 0 | 1 | 2 | 3 | 4 | 5;
  readonly strategicLeverage: 0 | 1 | 2 | 3 | 4 | 5;
  readonly founderMinutes: number;
  readonly estimatedEngineeringHours: number;
  readonly externalActionsAllowed: false;
}

export interface FounderOperatingPolicy {
  readonly canonicalProduct: "GSE";
  readonly canonicalCompany: "GSN";
  readonly humanInCommand: true;
  readonly zeroCashDefault: true;
  readonly maxRevenueImplementations: 1;
  readonly maxExperiments: 2;
  readonly maxUrgentRiskResponses: 1;
  readonly maxDailyBriefItems: 5;
  readonly memoryLayers: readonly ["CANONICAL", "ACTIVE", "OUTCOMES"];
  readonly nightlyAutopsyRequired: true;
  readonly premiumModelRole: "JUDGMENT_AND_ADVERSARIAL_REVIEW";
  readonly localModelRole: "MECHANICAL_IMPLEMENTATION_AND_TEST_LOOPS";
  readonly externalActionsAllowed: false;
}

export const FOUNDER_OPERATING_POLICY: FounderOperatingPolicy = {
  canonicalProduct: "GSE",
  canonicalCompany: "GSN",
  humanInCommand: true,
  zeroCashDefault: true,
  maxRevenueImplementations: 1,
  maxExperiments: 2,
  maxUrgentRiskResponses: 1,
  maxDailyBriefItems: 5,
  memoryLayers: ["CANONICAL", "ACTIVE", "OUTCOMES"],
  nightlyAutopsyRequired: true,
  premiumModelRole: "JUDGMENT_AND_ADVERSARIAL_REVIEW",
  localModelRole: "MECHANICAL_IMPLEMENTATION_AND_TEST_LOOPS",
  externalActionsAllowed: false,
};

export interface FounderQueueDecision {
  readonly item: FounderWorkItem;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface FounderDailyBrief {
  readonly generatedAt: string;
  readonly decisions: readonly FounderQueueDecision[];
  readonly ownerMinutesRequested: number;
  readonly hasFirstCashLane: boolean;
  readonly hasContinuityLane: boolean;
  readonly externalActionsAllowed: false;
}

export interface NightlyAutopsyInput {
  readonly date: string;
  readonly planned: readonly string[];
  readonly completed: readonly string[];
  readonly blocked: readonly string[];
  readonly evidenceCreated: readonly string[];
  readonly revenueCreatedUsd: number;
  readonly cashAvoidedUsd: number;
  readonly ownerMinutesUsed: number;
  readonly modelSpendUsd: number;
}

export interface NightlyAutopsy {
  readonly date: string;
  readonly planCompletionRate: number;
  readonly revenueCreatedUsd: number;
  readonly cashAvoidedUsd: number;
  readonly ownerMinutesUsed: number;
  readonly modelSpendUsd: number;
  readonly lessons: readonly string[];
  readonly activeMemoryCandidates: readonly string[];
  readonly outcomeRecords: readonly string[];
  readonly nextDayCorrections: readonly string[];
}

const LANE_WEIGHT: Readonly<Record<FounderWorkLane, number>> = {
  FIRST_CASH: 30,
  LAUNCH_BLOCKER: 26,
  SECURITY_CONTINUITY: 24,
  COST_AVOIDANCE: 22,
  COMPOUNDING_ASSET: 14,
  FRONTIER_OPTION: 6,
};

function boundedRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) return numerator > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

export function scoreFounderWork(item: FounderWorkItem): FounderQueueDecision {
  const founderAttentionPenalty = Math.min(20, item.founderMinutes / 6);
  const engineeringPenalty = Math.min(20, item.estimatedEngineeringHours * 1.5);
  const score = Math.round(
    LANE_WEIGHT[item.lane] +
      item.urgency * 6 +
      item.revenueImpact * 7 +
      item.cashAvoidance * 5 +
      item.strategicLeverage * 3 -
      founderAttentionPenalty -
      engineeringPenalty,
  );

  const reasons = [
    `${item.lane} lane weight ${LANE_WEIGHT[item.lane]}`,
    `urgency ${item.urgency}/5`,
    `revenue impact ${item.revenueImpact}/5`,
    `cash avoidance ${item.cashAvoidance}/5`,
    `founder attention ${item.founderMinutes} minutes`,
    `engineering estimate ${item.estimatedEngineeringHours} hours`,
  ];
  return { item, score, reasons };
}

function isSelectable(item: FounderWorkItem): boolean {
  return !["MEASURED", "PARKED"].includes(item.state);
}

export function buildFounderQueue(items: readonly FounderWorkItem[]): readonly FounderQueueDecision[] {
  const ranked = items.filter(isSelectable).map(scoreFounderWork).sort((a, b) => b.score - a.score);
  const selected: FounderQueueDecision[] = [];
  let revenueImplementations = 0;
  let experiments = 0;
  let urgentRiskResponses = 0;

  for (const decision of ranked) {
    const { item } = decision;
    const isRevenueImplementation = item.lane === "FIRST_CASH" && item.state !== "DISCOVERED";
    const isExperiment = item.lane === "COMPOUNDING_ASSET" || item.lane === "FRONTIER_OPTION";
    const isUrgentRisk = item.lane === "SECURITY_CONTINUITY" && item.urgency >= 4;

    if (isRevenueImplementation && revenueImplementations >= FOUNDER_OPERATING_POLICY.maxRevenueImplementations) continue;
    if (isExperiment && experiments >= FOUNDER_OPERATING_POLICY.maxExperiments) continue;
    if (isUrgentRisk && urgentRiskResponses >= FOUNDER_OPERATING_POLICY.maxUrgentRiskResponses) continue;

    selected.push(decision);
    if (isRevenueImplementation) revenueImplementations += 1;
    if (isExperiment) experiments += 1;
    if (isUrgentRisk) urgentRiskResponses += 1;
  }

  return selected;
}

function chooseRequiredLane(
  ranked: readonly FounderQueueDecision[],
  predicate: (decision: FounderQueueDecision) => boolean,
): FounderQueueDecision | undefined {
  return ranked.find(predicate);
}

export function buildFounderDailyBrief(
  items: readonly FounderWorkItem[],
  now: Date = new Date(),
): FounderDailyBrief {
  const ranked = buildFounderQueue(items);
  const chosen: FounderQueueDecision[] = [];
  const add = (decision: FounderQueueDecision | undefined): void => {
    if (!decision || chosen.some((entry) => entry.item.id === decision.item.id)) return;
    if (chosen.length < FOUNDER_OPERATING_POLICY.maxDailyBriefItems) chosen.push(decision);
  };

  add(chooseRequiredLane(ranked, (entry) => entry.item.lane === "FIRST_CASH"));
  add(
    chooseRequiredLane(
      ranked,
      (entry) => entry.item.lane === "SECURITY_CONTINUITY" || entry.item.lane === "LAUNCH_BLOCKER",
    ),
  );
  for (const decision of ranked) add(decision);

  return {
    generatedAt: now.toISOString(),
    decisions: chosen,
    ownerMinutesRequested: chosen.reduce((total, entry) => total + entry.item.founderMinutes, 0),
    hasFirstCashLane: chosen.some((entry) => entry.item.lane === "FIRST_CASH"),
    hasContinuityLane: chosen.some(
      (entry) => entry.item.lane === "SECURITY_CONTINUITY" || entry.item.lane === "LAUNCH_BLOCKER",
    ),
    externalActionsAllowed: false,
  };
}

export function buildNightlyAutopsy(input: NightlyAutopsyInput): NightlyAutopsy {
  const completionRate = boundedRatio(input.completed.length, input.planned.length);
  const lessons: string[] = [];
  const corrections: string[] = [];

  if (completionRate < 0.6) {
    lessons.push("Planned work exceeded demonstrated execution capacity.");
    corrections.push("Reduce the next active queue and split the largest task into a smaller evidence-producing slice.");
  }
  if (input.ownerMinutesUsed > 90 && input.revenueCreatedUsd === 0) {
    lessons.push("Founder attention was consumed without measured cash creation.");
    corrections.push("Move preparation back to the agent and reserve owner time for approvals, customer contact, and payment decisions.");
  }
  if (input.modelSpendUsd > input.revenueCreatedUsd + input.cashAvoidedUsd) {
    lessons.push("Model spend exceeded measured economic value for the day.");
    corrections.push("Route mechanical work to the local lane and require explicit economic approval for paid fallback.");
  }
  if (input.blocked.length > 0) {
    lessons.push(`${input.blocked.length} blocker(s) survived the operating day.`);
    corrections.push("Convert every surviving blocker into one owner decision, one missing input, or one bounded engineering task.");
  }
  if (lessons.length === 0) lessons.push("Execution matched the current plan without a material operating exception.");
  if (corrections.length === 0) corrections.push("Preserve the current limits and repeat the highest-yield verified loop.");

  return {
    date: input.date,
    planCompletionRate: completionRate,
    revenueCreatedUsd: input.revenueCreatedUsd,
    cashAvoidedUsd: input.cashAvoidedUsd,
    ownerMinutesUsed: input.ownerMinutesUsed,
    modelSpendUsd: input.modelSpendUsd,
    lessons,
    activeMemoryCandidates: [
      ...input.blocked.map((item) => `BLOCKER: ${item}`),
      ...lessons.map((item) => `LESSON: ${item}`),
    ],
    outcomeRecords: [
      ...input.completed.map((item) => `COMPLETED: ${item}`),
      ...input.evidenceCreated.map((item) => `EVIDENCE: ${item}`),
    ],
    nextDayCorrections: corrections,
  };
}

export function validateFounderWorkItem(item: FounderWorkItem): readonly string[] {
  const errors: string[] = [];
  if (!item.id.trim()) errors.push("Founder work item requires an id.");
  if (!item.what.trim() || !item.why.trim() || !item.when.trim()) {
    errors.push(`${item.id || "unknown"} must state what, why, and when.`);
  }
  if (item.how.length === 0) errors.push(`${item.id} must state how the work is performed.`);
  if (item.acceptanceCriteria.length === 0) errors.push(`${item.id} needs acceptance criteria.`);
  if (item.evidenceRequired.length === 0) errors.push(`${item.id} needs evidence requirements.`);
  if (item.agentCanDo.length === 0) errors.push(`${item.id} must identify agent-owned work.`);
  if (item.authority !== "AGENT_INTERNAL" && item.ownerOnly.length === 0) {
    errors.push(`${item.id} must identify owner-only actions.`);
  }
  if (item.externalActionsAllowed !== false) errors.push(`${item.id} cannot grant external authority.`);
  if (item.founderMinutes < 0 || item.estimatedEngineeringHours < 0) {
    errors.push(`${item.id} has an invalid effort estimate.`);
  }
  return errors;
}
