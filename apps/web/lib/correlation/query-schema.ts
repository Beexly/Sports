export type CorrelationEntity = "PICK" | "GAME_SIGNAL" | "SLATE";
export type CorrelationOperator = "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "IN" | "BETWEEN";
export type CorrelationAggregate = "COUNT" | "WIN_RATE" | "PUSH_RATE" | "AVG_CONFIDENCE" | "AVG_EDGE";

export type CorrelationField =
  | "sport"
  | "pickType"
  | "riskLevel"
  | "pickGrade"
  | "confidence"
  | "edgeScore"
  | "consensusPct"
  | "bookmakerCount"
  | "result"
  | "modelVersion"
  | "signalKey"
  | "trustLevel"
  | "sourceCategory";

export interface CorrelationFilter {
  readonly entity: CorrelationEntity;
  readonly field: CorrelationField;
  readonly operator: CorrelationOperator;
  readonly value: string | number | readonly string[] | readonly number[];
}

export interface CorrelationQuery {
  readonly title: string;
  readonly filters: readonly CorrelationFilter[];
  readonly groupBy: readonly CorrelationField[];
  readonly aggregates: readonly CorrelationAggregate[];
  readonly minSampleSize: number;
}

export interface CorrelationQueryValidation {
  readonly ok: boolean;
  readonly blockers: readonly string[];
  readonly normalized: CorrelationQuery | null;
}

const NUMERIC_FIELDS = new Set<CorrelationField>([
  "confidence",
  "edgeScore",
  "consensusPct",
  "bookmakerCount",
  "trustLevel",
]);

const PUBLIC_AGGREGATES = new Set<CorrelationAggregate>([
  "COUNT",
  "WIN_RATE",
  "PUSH_RATE",
  "AVG_CONFIDENCE",
  "AVG_EDGE",
]);

function cleanTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 100);
}

function isNumericValue(value: CorrelationFilter["value"]): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => typeof item === "number" && Number.isFinite(item));
  return false;
}

function validateFilter(filter: CorrelationFilter): string | null {
  const numericField = NUMERIC_FIELDS.has(filter.field);
  if ((filter.operator === "GT" || filter.operator === "GTE" || filter.operator === "LT" || filter.operator === "LTE") && !numericField) {
    return `${filter.field} does not support numeric comparison.`;
  }
  if (filter.operator === "BETWEEN") {
    if (!numericField || !Array.isArray(filter.value) || filter.value.length !== 2 || !isNumericValue(filter.value)) {
      return `${filter.field} requires a numeric two-value range.`;
    }
  }
  if ((filter.operator === "IN" || filter.operator === "BETWEEN") && !Array.isArray(filter.value)) {
    return `${filter.operator} requires an array value.`;
  }
  if (numericField && !isNumericValue(filter.value) && filter.operator !== "IN") {
    return `${filter.field} requires a numeric value.`;
  }
  if (filter.field === "result" && filter.entity !== "PICK") {
    return "result filters are only valid for settled pick history.";
  }
  return null;
}

export function validateCorrelationQuery(query: CorrelationQuery): CorrelationQueryValidation {
  const blockers: string[] = [];
  const title = cleanTitle(query.title);
  if (title.length < 4) blockers.push("Query title must be at least 4 characters.");
  if (query.filters.length === 0) blockers.push("At least one filter is required.");
  if (query.filters.length > 12) blockers.push("Query is too broad: maximum 12 filters.");
  if (query.groupBy.length > 3) blockers.push("Query is too broad: maximum 3 group-by fields.");
  if (query.minSampleSize < 25) blockers.push("Minimum sample size must be at least 25.");

  for (const aggregate of query.aggregates) {
    if (!PUBLIC_AGGREGATES.has(aggregate)) blockers.push(`${aggregate} is not an approved aggregate.`);
  }

  for (const filter of query.filters) {
    const blocker = validateFilter(filter);
    if (blocker) blockers.push(blocker);
  }

  const normalized: CorrelationQuery | null =
    blockers.length === 0
      ? {
          title,
          filters: query.filters,
          groupBy: Array.from(new Set(query.groupBy)),
          aggregates: Array.from(new Set(query.aggregates)),
          minSampleSize: Math.round(query.minSampleSize),
        }
      : null;

  return { ok: blockers.length === 0, blockers, normalized };
}
