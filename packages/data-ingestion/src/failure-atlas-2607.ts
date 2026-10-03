/**
 * FailureAtlas reliability-audit harness: 5x2 failure-mode grid over provider/API hops
 *
 * Research port: arXiv:2607.17525v1
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure audit/classification tooling for the paper's 5x2 failure-mode grid:
 * 5 mechanism families x 2 axes (persistence: transient|persistent,
 * origin: provider-side|client-side). classifyIncident maps an incident report to
 * a grid cell, or returns null when the incident fits no cell ("without forcing").
 * auditHops runs the grid over every hop between GSE code and its model/API
 * providers (OmniRoute routes, odds polling, agent-bus messaging) and reports
 * classified vs unclassified incidents per hop.
 *
 * The three seeded mechanisms are the paper's released reproduction scripts
 * (shared-state turn loss; synchronized-retry saturation; index=0 emission). The
 * two remaining families are operator-extensible placeholders covering the rest
 * of the surveyed issue space; unknown mechanisms are never coerced into a cell.
 *
 * ACCEPTANCE GATE: ADAPT if (a) all three released reproduction scripts reproduce
 * their claimed failure mechanisms on the lab VM — an ops step outside this pure
 * module — and (b) the grid classifies every surveyed issue example without
 * forcing, i.e. auditHops(...).unclassified === 0. This is infrastructure hygiene,
 * not a prediction edge — schedule as ops hardening.
 */

export type Persistence = "transient" | "persistent";
export type Origin = "provider-side" | "client-side";

export type FailureMechanism =
  | "shared-state-turn-loss"
  | "synchronized-retry-saturation"
  | "index-zero-emission"
  | "credential-quota-exhaustion"
  | "schema-contract-drift";

/** Canonical grid signature of each mechanism family. */
export const MECHANISM_SIGNATURES: Record<
  FailureMechanism,
  { persistence: Persistence; origin: Origin; description: string }
> = {
  "shared-state-turn-loss": {
    persistence: "persistent",
    origin: "client-side",
    description:
      "conversation/session state dropped between turns (paper reproduction #1)",
  },
  "synchronized-retry-saturation": {
    persistence: "transient",
    origin: "client-side",
    description:
      "retry storms saturate the provider; jittered backoff succeeds (paper reproduction #2)",
  },
  "index-zero-emission": {
    persistence: "persistent",
    origin: "provider-side",
    description:
      "provider emits a degenerate index=0 choice regardless of input (paper reproduction #3)",
  },
  "credential-quota-exhaustion": {
    persistence: "transient",
    origin: "provider-side",
    description:
      "expired credentials or exhausted quotas on a provider hop (operator-extensible)",
  },
  "schema-contract-drift": {
    persistence: "persistent",
    origin: "provider-side",
    description:
      "provider response schema drifts from the stored contract (operator-extensible)",
  },
};

export interface IncidentReport {
  /** hop id, e.g. "omniroute/route-7", "odds-polling", "agent-bus" */
  hop: string;
  mechanism: string;
  persistence: string;
  origin: string;
  /** ISO-8601 timestamp of observation */
  observedAt: string;
  detail?: string;
}

export interface GridCell {
  mechanism: FailureMechanism;
  persistence: Persistence;
  origin: Origin;
}

export interface Classification {
  cell: GridCell;
  /** whether the report matches the mechanism's canonical grid signature */
  signatureMatch: boolean;
}

function isPersistence(v: string): v is Persistence {
  return v === "transient" || v === "persistent";
}

function isOrigin(v: string): v is Origin {
  return v === "provider-side" || v === "client-side";
}

function isMechanism(v: string): v is FailureMechanism {
  return Object.prototype.hasOwnProperty.call(MECHANISM_SIGNATURES, v);
}

/**
 * Classify one incident into the 5x2 grid. Returns null when the incident fits
 * no cell — unknown mechanism, invalid axes, or empty hop — never forced.
 */
export function classifyIncident(report: IncidentReport): Classification | null {
  if (!report || typeof report.hop !== "string" || report.hop.length === 0) {
    return null;
  }
  if (!isMechanism(report.mechanism)) return null;
  if (!isPersistence(report.persistence)) return null;
  if (!isOrigin(report.origin)) return null;
  const sig = MECHANISM_SIGNATURES[report.mechanism];
  return {
    cell: {
      mechanism: report.mechanism,
      persistence: report.persistence,
      origin: report.origin,
    },
    signatureMatch:
      sig.persistence === report.persistence && sig.origin === report.origin,
  };
}

export interface HopAudit {
  hop: string;
  classified: Classification[];
  signatureMismatches: number;
  unclassified: number;
}

export interface AtlasReport {
  hops: HopAudit[];
  totalIncidents: number;
  classified: number;
  unclassified: number;
  /** gate condition (b): every surveyed incident classified without forcing */
  clean: boolean;
}

/**
 * Run the 5x2 grid over all surveyed incidents, grouped by provider hop.
 * Incidents that fit no cell are counted as unclassified, never coerced.
 */
export function auditHops(incidents: IncidentReport[]): AtlasReport {
  const byHop = new Map<string, HopAudit>();
  let classified = 0;
  let unclassified = 0;
  for (const inc of incidents ?? []) {
    const c = classifyIncident(inc);
    const hop = typeof inc?.hop === "string" && inc.hop.length > 0 ? inc.hop : "(unknown)";
    let audit = byHop.get(hop);
    if (!audit) {
      audit = { hop, classified: [], signatureMismatches: 0, unclassified: 0 };
      byHop.set(hop, audit);
    }
    if (c === null) {
      audit.unclassified += 1;
      unclassified += 1;
    } else {
      audit.classified.push(c);
      if (!c.signatureMatch) audit.signatureMismatches += 1;
      classified += 1;
    }
  }
  const hops = [...byHop.values()].sort((a, b) => (a.hop < b.hop ? -1 : 1));
  return {
    hops,
    totalIncidents: incidents?.length ?? 0,
    classified,
    unclassified,
    clean: unclassified === 0,
  };
}

export const GSE_FAILURE_ATLAS_ENABLED = false;
