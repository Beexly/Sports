/**
 * W1 — shadow metrics (Wave 1 Foundation item, owner-authorized).
 *
 * `recordShadowWindow` writes one `SrqcShadowMetric` row per Track B
 * (formal-receipt-job.ts) detection pass — continuous per-window operating
 * evidence, recorded whether or not that pass witnessed a violation. Where
 * `FormalIncident` is written only on a NEWLY witnessed CTI, this is the
 * base-rate counterpart: how many events did this pass see, how many
 * projected invocations were GE2/rejected-unbound, and how many would have
 * been REFUSEd had ENFORCE been active — all computed from data the caller
 * already has, never a second ledger read.
 *
 * PURE OBSERVATION: this module never calls `admitUnderSRQC` with
 * `mode: "ENFORCE"`, never sets `SRQC_ENFORCE`, and its write happens
 * strictly after the caller's own (SHADOW, always-ADMIT) decision path has
 * already run its course. `admitWouldRefuse` answers "how many would have
 * been refused," never "refuse them."
 */

import { randomUUID } from "node:crypto";
import { isViolation } from "./srqc-projection";
import type { AbstractControlState } from "./srqc-projection";
import type { ControlSqlClient } from "./control-store";

export interface ShadowWindowSummary {
  readonly windowSince: string;
  readonly windowUntil: string;
  readonly eventsSeen: number;
  readonly ge2Count: number;
  readonly rejectedUnbound: number;
  readonly admitWouldRefuse: number;
  readonly srqcVersion: number | null;
}

/**
 * Record one shadow-metrics row for a detection pass. Takes the
 * ALREADY-COMPUTED projected states and event count — no independent ledger
 * read, so this never doubles the DB round-trips a caller like
 * `runFormalReceiptPass` already pays.
 *
 * `admitWouldRefuse` is computed independently as
 * `projected.filter(isViolation).length`, NOT derived as
 * `ge2Count + rejectedUnbound` — an invocation could in principle satisfy
 * both predicates simultaneously, and deriving it from the sum would risk
 * double-counting that edge case.
 */
export async function recordShadowWindow(
  sql: ControlSqlClient,
  input: {
    readonly windowSinceInclusive: Date;
    readonly windowUntilExclusive: Date;
    readonly eventsSeen: number;
    readonly projected: readonly AbstractControlState[];
    readonly srqcVersion: number | null;
  },
): Promise<ShadowWindowSummary> {
  const ge2Count = input.projected.filter((s) => s.pendingCountClass === "GE2").length;
  const rejectedUnbound = input.projected.filter(
    (s) => s.hasRejectedFp && !s.fingerprintBound,
  ).length;
  const admitWouldRefuse = input.projected.filter(isViolation).length;

  await sql.query(
    `INSERT INTO "srqc_shadow_metric"
       ("id", "windowSince", "windowUntil", "eventsSeen", "ge2Count", "rejectedUnbound", "admitWouldRefuse", "srqcVersion")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      randomUUID(),
      input.windowSinceInclusive,
      input.windowUntilExclusive,
      input.eventsSeen,
      ge2Count,
      rejectedUnbound,
      admitWouldRefuse,
      input.srqcVersion,
    ],
  );

  return {
    windowSince: input.windowSinceInclusive.toISOString(),
    windowUntil: input.windowUntilExclusive.toISOString(),
    eventsSeen: input.eventsSeen,
    ge2Count,
    rejectedUnbound,
    admitWouldRefuse,
    srqcVersion: input.srqcVersion,
  };
}
