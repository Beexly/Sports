export type BoardHealthStatus = "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
export type BoardDegradationSeverity = "info" | "warning" | "critical";
export type BoardSuppressionReason = "DEMO_DATA" | "STALE_DATA";

export interface BoardDegradation {
  readonly code:
    | "DATA_STORE_UNREACHABLE"
    | "DEMO_DATA_SUPPRESSED"
    | "STALE_DATA_SUPPRESSED"
    | "NO_ACTIVE_BOARD_ROWS";
  readonly severity: BoardDegradationSeverity;
  readonly source: "board-state";
  readonly message: string;
}

export interface BoardHealthBadgeState {
  readonly status: BoardHealthStatus;
  readonly label: string;
  readonly rowCount: number;
  readonly generatedAt: string;
  readonly draftOnly: true;
  readonly priced: false;
}

export interface BoardHealthReport {
  readonly traceId: string;
  readonly degradations: readonly BoardDegradation[];
  readonly badge: BoardHealthBadgeState;
}

export interface BoardHealthInput {
  readonly now: Date | string;
  readonly modelVersion: string;
  readonly rowCounts: {
    readonly scoringNow: number;
    readonly publishedToday: number;
    readonly gatedTodayRows: number;
  };
  readonly dataError?: "DB_UNREACHABLE" | null;
  readonly suppressedReason?: BoardSuppressionReason | null;
}

function toIso(now: Date | string): string {
  return typeof now === "string" ? new Date(now).toISOString() : now.toISOString();
}

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createBoardTraceId(input: BoardHealthInput): string {
  const iso = toIso(input.now);
  const rows = input.rowCounts;
  const seed = [
    "board",
    iso,
    input.modelVersion,
    rows.scoringNow,
    rows.publishedToday,
    rows.gatedTodayRows,
    input.dataError ?? "ok",
    input.suppressedReason ?? "live",
  ].join("|");
  return `board-${iso.replace(/[-:.]/g, "").slice(0, 15)}-${stableHash(seed)}`;
}

function degradationForSuppression(reason: BoardSuppressionReason | null | undefined): BoardDegradation | null {
  if (reason === "DEMO_DATA") {
    return {
      code: "DEMO_DATA_SUPPRESSED",
      message: "Demo rows were suppressed from the public board.",
      severity: "warning",
      source: "board-state",
    };
  }
  if (reason === "STALE_DATA") {
    return {
      code: "STALE_DATA_SUPPRESSED",
      message: "Stale public-board rows were suppressed before rendering.",
      severity: "critical",
      source: "board-state",
    };
  }
  return null;
}

export function buildBoardHealth(input: BoardHealthInput): BoardHealthReport {
  const rowCount =
    input.rowCounts.scoringNow + input.rowCounts.publishedToday + input.rowCounts.gatedTodayRows;
  const degradations: BoardDegradation[] = [];

  if (input.dataError === "DB_UNREACHABLE") {
    degradations.push({
      code: "DATA_STORE_UNREACHABLE",
      message: "Board data store did not answer; empty nonblocking state returned.",
      severity: "critical",
      source: "board-state",
    });
  }

  const suppression = degradationForSuppression(input.suppressedReason);
  if (suppression) degradations.push(suppression);

  if (rowCount === 0 && degradations.length === 0) {
    degradations.push({
      code: "NO_ACTIVE_BOARD_ROWS",
      message: "No active board rows are available for this request.",
      severity: "info",
      source: "board-state",
    });
  }

  const hasCritical = degradations.some((degradation) => degradation.severity === "critical");
  const hasWarning = degradations.some((degradation) => degradation.severity === "warning");
  const status: BoardHealthStatus =
    hasCritical ? "UNAVAILABLE" : hasWarning || rowCount === 0 ? "DEGRADED" : "HEALTHY";

  return {
    badge: {
      draftOnly: true,
      generatedAt: toIso(input.now),
      label:
        status === "HEALTHY"
          ? "Healthy"
          : status === "DEGRADED"
            ? "Degraded"
            : "Unavailable",
      priced: false,
      rowCount,
      status,
    },
    degradations,
    traceId: createBoardTraceId(input),
  };
}
