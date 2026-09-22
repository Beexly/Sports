/**
 * Quarterly swamp-indicator dashboard for the feature store / signal inventory
 *
 * Research port: arXiv:2606.08266
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure port of the paper's data-lake governance audit: six swamp indicators
 * computed over the feature store / signal inventory — per-table ownership,
 * metadata completeness (target >=90%), 90-day dormancy flags, full source
 * lineage, and duplication <20% — with quarter-over-quarter trajectory (the
 * metric is the trajectory, not the thresholds) and stage-based intervention
 * triggers when a quarter deteriorates. The operator supplies the table
 * inventory; this module computes the indicators and the intervention stage.
 *
 * ACCEPTANCE GATE: ADOPT the dashboard + quarterly GDAM iff: (a) all six
 * indicators are computable (no missing-instrumentation gaps) within one
 * quarter; (b) metadata completeness >=90% and duplication <20% at first full
 * run; (c) quarterly re-run takes <2 hours of operator time.
 */

export interface TableInventory {
  table: string;
  owner?: string;
  /** 0..1 fraction of required metadata fields present */
  metadataCompleteness: number;
  /** days since last read or write */
  daysSinceActivity: number;
  /** source lineage chain; empty = missing lineage */
  lineage: string[];
  /** 0..1 estimated row duplication rate */
  duplicationRate: number;
}

export interface SwampIndicators {
  tables: number;
  /** share of tables with a named owner */
  ownership: number;
  /** mean metadata completeness */
  metadataCompleteness: number;
  /** share of tables dormant >= 90 days */
  dormancy90: number;
  /** share of tables with non-empty lineage */
  lineageCoverage: number;
  /** max duplication rate across tables */
  duplication: number;
  /** share of tables with duplication >= 20% */
  duplicationBreach: number;
  /** all six indicators computable (no NaN / missing instrumentation) */
  computable: boolean;
  /** first-run bar: completeness >=90% and duplication <20% */
  firstRunBar: boolean;
}

function validRate(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

/** Compute the six swamp indicators over a table inventory. */
export function swampIndicators(tables: TableInventory[]): SwampIndicators {
  const n = tables.length;
  const empty: SwampIndicators = {
    tables: 0, ownership: Number.NaN, metadataCompleteness: Number.NaN,
    dormancy90: Number.NaN, lineageCoverage: Number.NaN, duplication: Number.NaN,
    duplicationBreach: Number.NaN, computable: false, firstRunBar: false,
  };
  if (n === 0) return empty;
  let computable = true;
  let owned = 0;
  let metaSum = 0;
  let dormant = 0;
  let lineageOk = 0;
  let maxDup = 0;
  let dupBreach = 0;
  for (const t of tables) {
    if (t.owner && t.owner.trim().length > 0) owned++;
    if (!validRate(t.metadataCompleteness) || !Number.isFinite(t.daysSinceActivity) || !validRate(t.duplicationRate)) {
      computable = false;
    }
    metaSum += validRate(t.metadataCompleteness) ? t.metadataCompleteness : 0;
    if (Number.isFinite(t.daysSinceActivity) && t.daysSinceActivity >= 90) dormant++;
    if (t.lineage.length > 0) lineageOk++;
    if (validRate(t.duplicationRate)) {
      maxDup = Math.max(maxDup, t.duplicationRate);
      if (t.duplicationRate >= 0.2) dupBreach++;
    }
  }
  const ind: SwampIndicators = {
    tables: n,
    ownership: owned / n,
    metadataCompleteness: metaSum / n,
    dormancy90: dormant / n,
    lineageCoverage: lineageOk / n,
    duplication: maxDup,
    duplicationBreach: dupBreach / n,
    computable,
    firstRunBar: false,
  };
  ind.firstRunBar = computable && ind.metadataCompleteness >= 0.9 && ind.duplication < 0.2;
  return ind;
}

export type InterventionStage = "none" | "watch" | "remediate" | "freeze";

export interface QuarterComparison {
  current: SwampIndicators;
  previous?: SwampIndicators;
  /** deteriorated indicator names quarter-over-quarter */
  deteriorated: string[];
  stage: InterventionStage;
}

/**
 * Quarter-over-quarter trajectory: the metric is the trajectory, not the
 * thresholds. Deteriorating quarters escalate the intervention stage:
 * watch (1 deteriorated), remediate (2+), freeze (3+ or dormancy surge).
 */
export function compareQuarters(
  current: SwampIndicators,
  previous?: SwampIndicators,
): QuarterComparison {
  const deteriorated: string[] = [];
  if (previous && previous.tables > 0) {
    const worse = (name: string, cur: number, prevV: number, higherWorse: boolean): void => {
      if (!Number.isFinite(cur) || !Number.isFinite(prevV)) return;
      if (higherWorse ? cur > prevV + 1e-9 : cur < prevV - 1e-9) deteriorated.push(name);
    };
    worse("ownership", current.ownership, previous.ownership, false);
    worse("metadataCompleteness", current.metadataCompleteness, previous.metadataCompleteness, false);
    worse("dormancy90", current.dormancy90, previous.dormancy90, true);
    worse("lineageCoverage", current.lineageCoverage, previous.lineageCoverage, false);
    worse("duplication", current.duplication, previous.duplication, true);
  }
  let stage: InterventionStage = "none";
  if (deteriorated.length >= 3 || current.dormancy90 > 0.5) stage = "freeze";
  else if (deteriorated.length >= 2) stage = "remediate";
  else if (deteriorated.length >= 1) stage = "watch";
  return { current, previous, deteriorated, stage };
}

export const GSE_SWAMP_DASHBOARD_ENABLED = false;
