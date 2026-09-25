/**
 * D3 — Sleeper intake.
 *
 * Free depth charts + injuries from the Sleeper public API.
 * As-of designations: every designation carries an as-of timestamp and is
 * never retroactively updated. Designations after kickoff are excluded.
 *
 * COMPOSES WITH: injury-availability-layer (availability inputs),
 * sleeper-feeds-client (transport).
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const SLEEPER_INTAKE_ENABLED_ENV = "SLEEPER_INTAKE_ENABLED";

export function sleeperIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, SLEEPER_INTAKE_ENABLED_ENV);
}

export type InjuryDesignation =
  | "Out"
  | "Doubtful"
  | "Questionable"
  | "Probable"
  | "IR"
  | "PUP"
  | "Healthy";

export interface DepthChartEntry {
  readonly playerId: string;
  readonly team: string;
  readonly position: string;
  /** 1 = starter, 2 = backup, … */
  readonly depthOrder: number;
  /** As-of timestamp for this depth position. */
  readonly asOf: string;
  readonly source: string;
}

export interface InjuryDesignationRecord {
  readonly playerId: string;
  readonly team: string;
  readonly designation: InjuryDesignation;
  /** As-of timestamp — the designation is frozen at this time. */
  readonly asOf: string;
  readonly source: string;
}

export interface AvailabilityInput {
  readonly playerId: string;
  readonly depthOrder: number | null;
  readonly designation: InjuryDesignation | null;
  /** True when the player is projected available (Healthy/Probable + on chart). */
  readonly available: boolean | null;
  readonly asOf: string;
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/**
 * Ingest depth-chart entries. As-of discipline: entries must carry a valid
 * asOf timestamp. Entries issued after `asOfTime` are excluded.
 */
export function ingestDepthCharts(
  entries: readonly DepthChartEntry[],
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{ readonly accepted: readonly DepthChartEntry[]; readonly rejected: readonly { readonly index: number; readonly reason: string }[] }> {
  if (!sleeperIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `sleeper intake disabled — set ${SLEEPER_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!Array.isArray(entries)) {
    return { ok: false, reason: "entries must be an array" };
  }

  const accepted: DepthChartEntry[] = [];
  const rejected: { index: number; reason: string }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (!e.playerId || e.playerId.trim().length === 0) {
      rejected.push({ index: i, reason: "missing playerId" });
      continue;
    }
    const asOf = Date.parse(e.asOf);
    if (!Number.isFinite(asOf)) {
      rejected.push({ index: i, reason: "invalid asOf" });
      continue;
    }
    if (asOf > t) {
      rejected.push({ index: i, reason: "asOf after cutoff — future designation excluded" });
      continue;
    }
    if (!Number.isInteger(e.depthOrder) || e.depthOrder < 1) {
      rejected.push({ index: i, reason: "invalid depthOrder" });
      continue;
    }
    accepted.push(e);
  }

  return { ok: true, data: { accepted, rejected } };
}

/**
 * Ingest injury designations with as-of discipline.
 * Designations issued after `asOfTime` are excluded — never retroactively
 * updated into past predictions.
 */
export function ingestInjuryDesignations(
  records: readonly InjuryDesignationRecord[],
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{ readonly accepted: readonly InjuryDesignationRecord[]; readonly rejected: readonly { readonly index: number; readonly reason: string }[] }> {
  if (!sleeperIntakeEnabled(env)) {
    return {
      ok: false,
      reason: `sleeper intake disabled — set ${SLEEPER_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!Array.isArray(records)) {
    return { ok: false, reason: "records must be an array" };
  }

  const validDesignations = new Set<string>([
    "Out",
    "Doubtful",
    "Questionable",
    "Probable",
    "IR",
    "PUP",
    "Healthy",
  ]);

  const accepted: InjuryDesignationRecord[] = [];
  const rejected: { index: number; reason: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i]!;
    if (!r.playerId || r.playerId.trim().length === 0) {
      rejected.push({ index: i, reason: "missing playerId" });
      continue;
    }
    const asOf = Date.parse(r.asOf);
    if (!Number.isFinite(asOf)) {
      rejected.push({ index: i, reason: "invalid asOf" });
      continue;
    }
    if (asOf > t) {
      rejected.push({ index: i, reason: "asOf after cutoff — future designation excluded" });
      continue;
    }
    if (!validDesignations.has(r.designation)) {
      rejected.push({ index: i, reason: `invalid designation ${r.designation}` });
      continue;
    }
    accepted.push(r);
  }

  return { ok: true, data: { accepted, rejected } };
}

/**
 * Latest designation for a player as-of `asOfTime`.
 * Returns null when none exists — never imputed as Healthy.
 */
export function designationAsOf(
  records: readonly InjuryDesignationRecord[],
  playerId: string,
  asOfTime: string,
): InjuryDesignationRecord | null {
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) return null;
  const eligible = records
    .filter((r) => {
      const asOf = Date.parse(r.asOf);
      return r.playerId === playerId && Number.isFinite(asOf) && asOf <= t;
    })
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf));
  return eligible.length > 0 ? eligible[0]! : null;
}

/**
 * Latest depth order for a player as-of `asOfTime`.
 * Returns null when the player is not on the chart — never imputed.
 */
export function depthOrderAsOf(
  entries: readonly DepthChartEntry[],
  playerId: string,
  asOfTime: string,
): number | null {
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) return null;
  const eligible = entries
    .filter((e) => {
      const asOf = Date.parse(e.asOf);
      return e.playerId === playerId && Number.isFinite(asOf) && asOf <= t;
    })
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf));
  return eligible.length > 0 ? eligible[0]!.depthOrder : null;
}

/**
 * Build availability inputs for the injury-availability layer.
 * `available` is null when designation is unknown — never guessed.
 */
export function buildAvailabilityInputs(
  playerIds: readonly string[],
  depthChart: readonly DepthChartEntry[],
  injuries: readonly InjuryDesignationRecord[],
  asOfTime: string,
): readonly AvailabilityInput[] {
  return playerIds.map((playerId) => {
    const depthOrder = depthOrderAsOf(depthChart, playerId, asOfTime);
    const desigRec = designationAsOf(injuries, playerId, asOfTime);
    const designation = desigRec?.designation ?? null;

    let available: boolean | null;
    if (designation === null) {
      available = null;
    } else if (designation === "Healthy" || designation === "Probable") {
      available = depthOrder !== null;
    } else {
      available = false;
    }

    return {
      playerId,
      depthOrder,
      designation,
      available,
      asOf: asOfTime,
    };
  });
}
