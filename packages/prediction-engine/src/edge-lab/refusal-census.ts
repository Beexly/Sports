/**
 * Refusal census — every fail-closed path, counted, never silent.
 *
 * A refusal nobody counts is a gate nobody can audit. This mill is a PURE
 * function over already-loaded rows. It does not open a database.
 *
 * 936be9c wired tryReadTrainableTrueProb into ranking-prob.ts (the only
 * production read). admitTrainableTrueProbRows is the mill; tests-only until
 * this census. requireTrainableTrueProbBasis (throwing) is still NOT called
 * by any trainer — types definition + types tests only.
 *
 * Replica SQL covers five families. The other five (CQR / Jackknife+ /
 * IVAP / conformal / devig) are not columns on picks today. The mill
 * counts them only when the caller attaches the flags; a replica extract
 * that omits them reports those families as unobserved, not as 0%.
 *
 * SHADOW. priced false. dbQueried false.
 */

import {
  pricesWorseThanMarket,
  tryReadTrainableTrueProb,
  type IndependentEdgeSummary,
} from "@sports/types";
import type { JackknifeRefusedBound } from "../calibration/jackknife-plus.js";

export type { JackknifeRefusedBound };

export type RefusalFamily =
  | "trueprob_basis"
  | "independent_edge_pass"
  | "adverse_edge"
  | "published_pass"
  | "gate_gated"
  | "cqr_unlicensed"
  | "jackknife_plus_unlicensed"
  | "ivap_empty"
  | "conformal_unlicensed"
  | "devig_refused";

export type CensusEvent = {
  readonly id: string;
  readonly sport: string;
  readonly weekKey: string;
  readonly family: RefusalFamily;
  readonly reason: string;
};

export type CensusCell = {
  readonly family: RefusalFamily;
  readonly reason: string;
  readonly sport: string;
  readonly weekKey: string;
  readonly n: number;
};

export type CensusInputCoverage = {
  readonly nRows: number;
  /** Rows that carried the input each family needs. 0 ⇒ family is unobserved, not a 0% rate. */
  readonly observed: Readonly<Record<RefusalFamily, number>>;
  readonly unobservedFamilies: readonly RefusalFamily[];
};

export type RefusalCensusTable = {
  readonly nEvents: number;
  readonly nRows: number;
  readonly cells: readonly CensusCell[];
  readonly byFamily: Readonly<Record<RefusalFamily, number>>;
  readonly inputCoverage: CensusInputCoverage;
  readonly priced: false;
  readonly status: "shadow";
  readonly dbQueried: false;
};

export type ProductionPickRow = {
  readonly id: string;
  readonly sport: string;
  readonly weekKey: string;
  readonly factorBreakdown?: unknown;
  readonly isPublished?: boolean;
  readonly result?: string;
  readonly gateStatus?: string | null;
  readonly gateReasonCode?: string | null;
  readonly cqrLicensed?: boolean;
  readonly jackknifeLicensed?: boolean;
  readonly jackknifeRefusedBound?: JackknifeRefusedBound;
  readonly ivapWidth?: number;
  readonly conformalLicensed?: boolean;
  readonly devigOk?: boolean;
};

/**
 * Exact query a read replica must answer. Column aliases match
 * ProductionPickRow for the five families the schema actually stores.
 * CQR / Jackknife+ / IVAP / conformal / devig flags are NOT in this
 * query — they are not columns on picks. See REFUSAL_CENSUS_PRODUCTION_NEEDS.
 */
export const REFUSAL_CENSUS_SQL = `
SELECT json_agg(row_to_json(t))
FROM (
  SELECT
    p.id,
    s.key AS sport,
    to_char(g."commenceTime" AT TIME ZONE 'UTC', 'IYYY-"W"IW') AS "weekKey",
    p."factorBreakdown" AS "factorBreakdown",
    p."isPublished" AS "isPublished",
    p.result::text AS result,
    gd.status::text AS "gateStatus",
    gd."reasonCode" AS "gateReasonCode"
  FROM picks p
  JOIN games g ON g.id = p."gameId"
  JOIN sports s ON s.id = g."sportId"
  LEFT JOIN LATERAL (
    SELECT status, "reasonCode"
    FROM gate_decisions
    WHERE "pickId" = p.id
    ORDER BY "evaluatedAt" DESC
    LIMIT 1
  ) gd ON true
  WHERE g."mergedIntoGameId" IS NULL
) t
`.trim();

export const REFUSAL_CENSUS_REQUIRED_COLUMNS = [
  "id",
  "sport",
  "weekKey",
  "factorBreakdown",
  "isPublished",
  "result",
  "gateStatus",
  "gateReasonCode",
] as const;

/** Families the replica SQL can populate. The rest need persisted flags. */
export const REFUSAL_CENSUS_REPLICA_FAMILIES = [
  "trueprob_basis",
  "independent_edge_pass",
  "adverse_edge",
  "published_pass",
  "gate_gated",
] as const satisfies readonly RefusalFamily[];

/** Families that are not columns on picks / gate_decisions today. */
export const REFUSAL_CENSUS_UNPERSISTED_FAMILIES = [
  "cqr_unlicensed",
  "jackknife_plus_unlicensed",
  "ivap_empty",
  "conformal_unlicensed",
  "devig_refused",
] as const satisfies readonly RefusalFamily[];

export const REFUSAL_CENSUS_PRODUCTION_NEEDS = {
  replicaSql: "REFUSAL_CENSUS_SQL",
  tables: ["picks", "games", "sports", "gate_decisions"] as const,
  env: "READONLY_DATABASE_URL",
  client: "psql",
  coversFromReplica: REFUSAL_CENSUS_REPLICA_FAMILIES,
  notPersistedToday: REFUSAL_CENSUS_UNPERSISTED_FAMILIES,
  missingInput:
    "CQR licensed, Jackknife+ licensed/refusedBound, IVAP width, conformal licensed, and devig-ok are not columns on picks. Attach them on the row or persist a shadow_math_refusals table before those families can be censused from a replica. A replica extract that omits them reports those families as unobserved, not as a 0% refusal rate.",
  callerList:
    "tryReadTrainableTrueProb: ranking-prob.ts (production), trueprob-admission.ts (mill), types tests. requireTrainableTrueProbBasis: types definition + types tests only. No trainer calls the throwing form as of 936be9c.",
} as const;

const FAMILIES: readonly RefusalFamily[] = [
  "trueprob_basis",
  "independent_edge_pass",
  "adverse_edge",
  "published_pass",
  "gate_gated",
  "cqr_unlicensed",
  "jackknife_plus_unlicensed",
  "ivap_empty",
  "conformal_unlicensed",
  "devig_refused",
];

function readIndependentEdge(factorBreakdown: unknown): IndependentEdgeSummary | null {
  if (!factorBreakdown || typeof factorBreakdown !== "object") return null;
  const edge = (factorBreakdown as { independentEdge?: unknown }).independentEdge;
  if (!edge || typeof edge !== "object") return null;
  return edge as IndependentEdgeSummary;
}

function event(
  row: ProductionPickRow,
  family: RefusalFamily,
  reason: string,
): CensusEvent {
  return { id: row.id, sport: row.sport, weekKey: row.weekKey, family, reason };
}

/**
 * Extract every refusal this row can speak to. A row with no independentEdge
 * is silence on those families, not a pass and not a refusal.
 */
export function eventsFromPickRow(row: ProductionPickRow): CensusEvent[] {
  if (!row.id || !row.sport || !row.weekKey) {
    throw new RangeError("eventsFromPickRow: id, sport, weekKey are required");
  }
  const out: CensusEvent[] = [];
  const edge = readIndependentEdge(row.factorBreakdown);

  if (edge) {
    const train = tryReadTrainableTrueProb(edge);
    if (!train.ok) {
      out.push(event(row, "trueprob_basis", train.reason));
    }
    if (edge.decision === "PASS") {
      out.push(event(row, "independent_edge_pass", "independentEdge.decision=PASS"));
      if (row.isPublished === true) {
        out.push(event(row, "published_pass", "isPublished && independentEdge.decision=PASS"));
      }
    }
    if (pricesWorseThanMarket(edge)) {
      out.push(event(row, "adverse_edge", "expectedClv<0"));
    }
  }

  if (row.gateStatus === "GATED") {
    out.push(event(row, "gate_gated", row.gateReasonCode ?? "GATED"));
  }
  if (row.cqrLicensed === false) {
    out.push(event(row, "cqr_unlicensed", "cqr.licensed=false"));
  }
  if (row.jackknifeRefusedBound && row.jackknifeRefusedBound !== "none") {
    out.push(
      event(row, "jackknife_plus_unlicensed", `refusedBound=${row.jackknifeRefusedBound}`),
    );
  } else if (row.jackknifeLicensed === false) {
    out.push(event(row, "jackknife_plus_unlicensed", "jackknifePlus.licensed=false"));
  }
  if (row.ivapWidth === 1) {
    out.push(event(row, "ivap_empty", "ivap.width=1"));
  }
  if (row.conformalLicensed === false) {
    out.push(event(row, "conformal_unlicensed", "conformal.licensed=false"));
  }
  if (row.devigOk === false) {
    out.push(event(row, "devig_refused", "devig=null"));
  }
  return out;
}

function emptyFamilyCounts(): Record<RefusalFamily, number> {
  const out = {} as Record<RefusalFamily, number>;
  for (const f of FAMILIES) out[f] = 0;
  return out;
}

function inputCoverageOf(rows: readonly ProductionPickRow[]): CensusInputCoverage {
  const observed = emptyFamilyCounts();
  for (const row of rows) {
    const hasEdge = readIndependentEdge(row.factorBreakdown) != null;
    if (hasEdge) {
      observed.trueprob_basis += 1;
      observed.independent_edge_pass += 1;
      observed.adverse_edge += 1;
      if (row.isPublished !== undefined) observed.published_pass += 1;
    }
    if (row.gateStatus !== undefined) observed.gate_gated += 1;
    if (row.cqrLicensed !== undefined) observed.cqr_unlicensed += 1;
    if (row.jackknifeLicensed !== undefined || row.jackknifeRefusedBound !== undefined) {
      observed.jackknife_plus_unlicensed += 1;
    }
    if (row.ivapWidth !== undefined) observed.ivap_empty += 1;
    if (row.conformalLicensed !== undefined) observed.conformal_unlicensed += 1;
    if (row.devigOk !== undefined) observed.devig_refused += 1;
  }
  const unobservedFamilies = FAMILIES.filter((f) => observed[f] === 0);
  return { nRows: rows.length, observed, unobservedFamilies };
}

/**
 * Collapse events into (family, reason, sport, week) counts.
 * Empty event list is a valid zero census (no refusals observed), not a
 * fabricated "production is clean" — nRows and unobservedFamilies are
 * reported so a caller who passed 0 rows, or rows missing a family's
 * input, cannot hide behind 0 events.
 */
export function censusRefusals(
  rows: readonly ProductionPickRow[],
): RefusalCensusTable {
  const events = rows.flatMap(eventsFromPickRow);
  const bucket = new Map<string, CensusCell>();
  const byFamily = emptyFamilyCounts();
  for (const e of events) {
    byFamily[e.family] += 1;
    const key = `${e.family}\t${e.reason}\t${e.sport}\t${e.weekKey}`;
    const prev = bucket.get(key);
    if (prev) bucket.set(key, { ...prev, n: prev.n + 1 });
    else bucket.set(key, { family: e.family, reason: e.reason, sport: e.sport, weekKey: e.weekKey, n: 1 });
  }
  const cells = [...bucket.values()].sort((a, b) => {
    if (a.family !== b.family) return a.family.localeCompare(b.family);
    if (a.sport !== b.sport) return a.sport.localeCompare(b.sport);
    if (a.weekKey !== b.weekKey) return a.weekKey.localeCompare(b.weekKey);
    return a.reason.localeCompare(b.reason);
  });
  return {
    nEvents: events.length,
    nRows: rows.length,
    cells,
    byFamily,
    inputCoverage: inputCoverageOf(rows),
    priced: false,
    status: "shadow",
    dbQueried: false,
  };
}
