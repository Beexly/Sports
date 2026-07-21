import type { OpportunitySource } from "./types";

export interface OpportunitySourceRunState {
  readonly sourceId: string;
  readonly lastCheckedAt?: string;
  readonly lastSuccessAt?: string;
  readonly consecutiveFailures: number;
  readonly nextEligibleAt?: string;
  readonly etag?: string;
  readonly lastModified?: string;
  readonly cursor?: string;
}

export interface ScheduledOpportunitySource {
  readonly source: OpportunitySource;
  readonly due: boolean;
  readonly priority: number;
  readonly overdueMs: number;
  readonly reason: string;
}

export interface OpportunitySchedulePolicy {
  readonly maxSourcesPerCycle: number;
  readonly includeDisabled: boolean;
}

export const DEFAULT_SCHEDULE_POLICY: OpportunitySchedulePolicy = {
  maxSourcesPerCycle: 12,
  includeDisabled: false,
};

const CADENCE_MS: Readonly<Record<OpportunitySource["cadence"], number | null>> = {
  event: 15 * 60 * 1000,
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  manual: null,
};

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function failureBackoffMs(failures: number): number {
  if (!Number.isInteger(failures) || failures < 0) {
    throw new RangeError("consecutiveFailures must be a non-negative integer.");
  }
  if (failures === 0) return 0;
  return Math.min(24 * 60 * 60 * 1000, 15 * 60 * 1000 * 2 ** Math.min(failures - 1, 7));
}

function sourcePriority(source: OpportunitySource): number {
  let score = 0;
  if (source.classes.includes("security_or_deprecation")) score += 50;
  if (source.classes.includes("startup_credit") || source.classes.includes("grant_or_challenge")) score += 35;
  if (source.classes.includes("ai_model_release") || source.classes.includes("platform_update")) score += 30;
  if (source.classes.includes("marketplace_channel") || source.classes.includes("partnership")) score += 25;
  if (source.classes.includes("api_or_data_feed") || source.classes.includes("developer_tool")) score += 20;
  if (source.evidenceTier === "official_primary") score += 15;
  if (source.evidenceTier === "vendor_terms_or_program_rules") score += 12;
  if (source.authority === "community") score -= 20;
  return score;
}

export function scheduleOpportunitySources(
  sources: readonly OpportunitySource[],
  states: readonly OpportunitySourceRunState[],
  now: Date = new Date(),
  policy: OpportunitySchedulePolicy = DEFAULT_SCHEDULE_POLICY,
): readonly ScheduledOpportunitySource[] {
  if (!Number.isInteger(policy.maxSourcesPerCycle) || policy.maxSourcesPerCycle < 0) {
    throw new RangeError("maxSourcesPerCycle must be a non-negative integer.");
  }
  const sourceIds = sources.map((source) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error("Opportunity source ids must be unique.");
  const stateIds = states.map((state) => state.sourceId);
  if (new Set(stateIds).size !== stateIds.length) throw new Error("Opportunity source state ids must be unique.");

  const stateById = new Map(states.map((state) => [state.sourceId, state]));
  const scheduled = sources.map((source): ScheduledOpportunitySource => {
    const state = stateById.get(source.id);
    const cadence = CADENCE_MS[source.cadence];
    if (!source.enabledByDefault && !policy.includeDisabled) {
      return { source, due: false, priority: sourcePriority(source), overdueMs: 0, reason: "Source is disabled by default." };
    }
    if (cadence === null || source.transport === "manual_snapshot") {
      return { source, due: false, priority: sourcePriority(source), overdueMs: 0, reason: "Source requires a manual terms or evidence snapshot." };
    }

    const lastCheckedAt = parseTimestamp(state?.lastCheckedAt);
    const dueAt = lastCheckedAt === null ? 0 : lastCheckedAt + cadence;
    const explicitNext = parseTimestamp(state?.nextEligibleAt);
    const failureNext = lastCheckedAt === null ? 0 : lastCheckedAt + failureBackoffMs(state?.consecutiveFailures ?? 0);
    const nextEligible = Math.max(dueAt, explicitNext ?? 0, failureNext);
    const due = now.getTime() >= nextEligible;
    const overdueMs = due ? Math.max(0, now.getTime() - nextEligible) : 0;
    const reason =
      lastCheckedAt === null
        ? "Source has never been checked."
        : due
          ? `Source is due and overdue by ${Math.round(overdueMs / 60000)} minute(s).`
          : `Source is not due until ${new Date(nextEligible).toISOString()}.`;
    return { source, due, priority: sourcePriority(source), overdueMs, reason };
  });

  const due = scheduled
    .filter((item) => item.due)
    .sort((a, b) => b.priority - a.priority || b.overdueMs - a.overdueMs || a.source.id.localeCompare(b.source.id))
    .slice(0, policy.maxSourcesPerCycle);
  const selected = new Set(due.map((item) => item.source.id));
  return scheduled
    .map((item) => item.due && !selected.has(item.source.id) ? { ...item, due: false, reason: "Deferred by per-cycle capacity limit." } : item)
    .sort((a, b) => Number(b.due) - Number(a.due) || b.priority - a.priority || a.source.id.localeCompare(b.source.id));
}
