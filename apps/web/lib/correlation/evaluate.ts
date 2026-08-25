import {
  validateCorrelationQuery,
  type CorrelationAggregate,
  type CorrelationField,
  type CorrelationFilter,
  type CorrelationQuery,
} from "@/lib/correlation/query-schema";

export interface CorrelationPickRow {
  readonly sport: string;
  readonly pickType: string;
  readonly riskLevel: string;
  readonly pickGrade: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly consensusPct: number;
  readonly bookmakerCount: number;
  readonly result: "WIN" | "LOSS" | "PUSH";
  readonly modelVersion: string;
}

export interface CorrelationGroupResult {
  readonly key: string;
  readonly sampleSize: number;
  readonly aggregates: Readonly<Record<CorrelationAggregate, number>>;
}

export interface CorrelationEvaluation {
  readonly ok: boolean;
  readonly blockers: readonly string[];
  readonly groups: readonly CorrelationGroupResult[];
}

function valueFor(row: CorrelationPickRow, field: CorrelationField): string | number | null {
  if (field === "sport") return row.sport;
  if (field === "pickType") return row.pickType;
  if (field === "riskLevel") return row.riskLevel;
  if (field === "pickGrade") return row.pickGrade;
  if (field === "confidence") return row.confidence;
  if (field === "edgeScore") return row.edgeScore;
  if (field === "consensusPct") return row.consensusPct;
  if (field === "bookmakerCount") return row.bookmakerCount;
  if (field === "result") return row.result;
  if (field === "modelVersion") return row.modelVersion;
  return null;
}

function compare(filter: CorrelationFilter, row: CorrelationPickRow): boolean {
  if (filter.entity !== "PICK") return true;
  const rowValue = valueFor(row, filter.field);
  if (rowValue === null) return false;

  if (filter.operator === "EQ") return rowValue === filter.value;
  if (filter.operator === "NEQ") return rowValue !== filter.value;
  if (filter.operator === "IN" && Array.isArray(filter.value)) {
    return filter.value.includes(rowValue as never);
  }
  if (typeof rowValue !== "number") return false;
  if (filter.operator === "GT") return rowValue > Number(filter.value);
  if (filter.operator === "GTE") return rowValue >= Number(filter.value);
  if (filter.operator === "LT") return rowValue < Number(filter.value);
  if (filter.operator === "LTE") return rowValue <= Number(filter.value);
  if (filter.operator === "BETWEEN" && Array.isArray(filter.value)) {
    const [min, max] = filter.value;
    return rowValue >= Number(min) && rowValue <= Number(max);
  }
  return false;
}

function groupKey(row: CorrelationPickRow, groupBy: readonly CorrelationField[]): string {
  if (groupBy.length === 0) return "ALL";
  return groupBy.map((field) => `${field}:${valueFor(row, field) ?? "N/A"}`).join("|");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function aggregateRows(rows: readonly CorrelationPickRow[], aggregate: CorrelationAggregate): number {
  if (aggregate === "COUNT") return rows.length;
  if (rows.length === 0) return 0;
  if (aggregate === "WIN_RATE") {
    // Decided-only denominator. `rows` explicitly includes PUSH (see
    // CorrelationPickRow.result and load-settled-picks.ts, which selects
    // result IN (WIN, LOSS, PUSH)), so dividing by rows.length counted every
    // push as a loss. Matches the house idiom in
    // `lib/performance/public-performance-policy.ts` (eligibleForRate).
    // Worked example — 56W / 40L / 4 PUSH: 56/100 = 0.560 (old, under-sells)
    // vs 56/96 = 0.583 (decided-only, correct).
    const wins = rows.filter((row) => row.result === "WIN").length;
    const losses = rows.filter((row) => row.result === "LOSS").length;
    const decided = wins + losses;
    return decided > 0 ? round(wins / decided) : 0;
  }
  if (aggregate === "PUSH_RATE") {
    // PUSH_RATE intentionally keeps the FULL denominator: it reports what share
    // of the whole population pushed, so pushes must stay in it.
    return round(rows.filter((row) => row.result === "PUSH").length / rows.length);
  }
  if (aggregate === "AVG_CONFIDENCE") {
    return round(rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length);
  }
  if (aggregate === "AVG_EDGE") {
    return round(rows.reduce((sum, row) => sum + row.edgeScore, 0) / rows.length);
  }
  return 0;
}

export function evaluateCorrelationQuery(
  query: CorrelationQuery,
  rows: readonly CorrelationPickRow[]
): CorrelationEvaluation {
  const validation = validateCorrelationQuery(query);
  if (!validation.ok || !validation.normalized) {
    return { ok: false, blockers: validation.blockers, groups: [] };
  }

  const filtered = rows.filter((row) => validation.normalized!.filters.every((filter) => compare(filter, row)));
  const byGroup = new Map<string, CorrelationPickRow[]>();
  for (const row of filtered) {
    const key = groupKey(row, validation.normalized.groupBy);
    byGroup.set(key, [...(byGroup.get(key) ?? []), row]);
  }

  const groups = Array.from(byGroup.entries())
    .filter(([, groupRows]) => groupRows.length >= validation.normalized!.minSampleSize)
    .map(([key, groupRows]): CorrelationGroupResult => {
      const aggregates = Object.fromEntries(
        validation.normalized!.aggregates.map((aggregate) => [aggregate, aggregateRows(groupRows, aggregate)])
      ) as Readonly<Record<CorrelationAggregate, number>>;
      return { key, sampleSize: groupRows.length, aggregates };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);

  return {
    ok: true,
    blockers:
      groups.length === 0
        ? ["No group met the minimum sample-size gate."]
        : [],
    groups,
  };
}
