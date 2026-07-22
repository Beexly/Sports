/**
 * Settlement evidence — append-only observations, race-safe anomaly
 * lifecycle, idempotent owner-review requests and append-only decision
 * history (Phase 1E, hardened per directive section 6).
 *
 * Structural guarantees:
 *
 *   1. NOT A COUNTER: corroboration is DERIVED inside one database
 *      transaction from the append-only SettlementObservation rows.
 *      Concurrent runs cannot double-count, miss, or miscount.
 *   2. RETRIES NEVER CORROBORATE (6.1): observations carry a DURABLE
 *      settlement-run id (SettlementRun, upserted on the externally stable
 *      idempotency key source+sport+scheduledWindow+snapshotFingerprint —
 *      see settlement-run.ts), and the compound unique
 *      (gameId, settlementRunId, payloadFingerprint) makes a retried
 *      run/payload a no-op insert. On top of that, corroboration requires
 *      runs with DISTINCT source-snapshot fingerprints OR minimum temporal
 *      separation (MIN_CORROBORATION_SEPARATION_MINUTES) — so even retries
 *      that cross a scheduling-window boundary (fresh run id, same source
 *      bytes, seconds apart) can never promote an anomaly.
 *   3. HISTORY IS APPEND-ONLY: nothing here deletes or resets
 *      observations, anomalies, requests, or decision events. Score
 *      arrival RESOLVES the anomaly and appends a SYSTEM decision event;
 *      the evidence trail survives.
 *   4. REQUEST != DECISION (6.3): crossing the review threshold creates
 *      one idempotent OwnerDecisionRequest (unique anomalyId) and appends
 *      one SYSTEM SettlementDecisionEvent (REVIEW_REQUESTED, prior/next
 *      state, actor receipt). Actual owner decisions (ACKNOWLEDGED /
 *      WAIT_FOR_SOURCE / MARK_POSTPONED / VOID_PICKS / DISMISS_ANOMALY /
 *      RESOLVE_SCORES_ARRIVED) append further events — they never consume
 *      or overwrite the request, and a SYSTEM event never impersonates an
 *      owner (actorType is part of the receipt).
 *
 * The pipeline still NEVER infers POSTPONED, NEVER voids picks, and leaves
 * already-terminal games untouched — promotion only flags the anomaly for
 * OWNER review.
 */

import { createHash } from "node:crypto";

/** Anomaly type for "feed says completed, but no usable score, while the
 *  game is still SCHEDULED/LIVE". */
export const SCORELESS_COMPLETED_ANOMALY = "SCORELESS_COMPLETED";

/** Corroborating settlement runs required before OWNER_REVIEW promotion. */
export const SCORELESS_REVIEW_THRESHOLD = 3;

/** Minimum temporal separation between two runs sharing a source-snapshot
 *  fingerprint for BOTH to count as corroboration (6.1). Distinct
 *  snapshots corroborate regardless of spacing; identical snapshots only
 *  corroborate when genuinely separated in time. */
export const MIN_CORROBORATION_SEPARATION_MINUTES = 30;

/** Decision kinds an OWNER may append (6.3). */
export const OWNER_DECISION_KINDS = [
  "ACKNOWLEDGED",
  "WAIT_FOR_SOURCE",
  "MARK_POSTPONED",
  "VOID_PICKS",
  "DISMISS_ANOMALY",
  "RESOLVE_SCORES_ARRIVED",
] as const;
export type OwnerDecisionKind = (typeof OWNER_DECISION_KINDS)[number];

/** Deterministic sha256 fingerprint over the normalized source row content. */
export function fingerprintScorePayload(payload: {
  readonly externalId: string;
  readonly completed: boolean;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}): string {
  const canonical = JSON.stringify([
    payload.externalId,
    payload.completed,
    payload.homeScore,
    payload.awayScore,
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ── Corroboration rule (pure, unit-tested) ──────────────────────────────

export interface CorroborationObservation {
  readonly settlementRunId: string;
  readonly sourceSnapshotFingerprint: string | null;
  readonly observedAt: Date;
}

/**
 * Counts CORROBORATING runs over the observation rows (6.1):
 *   - one earliest sighting per distinct run id;
 *   - runs sorted by observedAt ascending, greedily selected;
 *   - a run corroborates iff its source-snapshot fingerprint is distinct
 *     from every already-selected run's, OR it is at least
 *     `minSeparationMs` after the last selected run;
 *   - legacy rows with a null snapshot fingerprint rely on temporal
 *     separation only (fail-closed: null never matches "distinct").
 * Pure and deterministic — callable inside the evidence transaction and
 * directly by tests.
 */
export function countCorroboratingRuns(
  rows: readonly CorroborationObservation[],
  minSeparationMs: number = MIN_CORROBORATION_SEPARATION_MINUTES * 60_000,
): { corroboratingRunIds: string[]; distinctRunCount: number } {
  const earliestByRun = new Map<string, CorroborationObservation>();
  for (const row of rows) {
    const existing = earliestByRun.get(row.settlementRunId);
    if (!existing || row.observedAt.getTime() < existing.observedAt.getTime()) {
      earliestByRun.set(row.settlementRunId, row);
    }
  }
  const runs = [...earliestByRun.values()].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );

  const selected: CorroborationObservation[] = [];
  const seenFingerprints = new Set<string>();
  for (const run of runs) {
    const fp = run.sourceSnapshotFingerprint;
    const distinctSnapshot = fp !== null && !seenFingerprints.has(fp);
    const last = selected[selected.length - 1];
    const separated =
      last === undefined ||
      run.observedAt.getTime() - last.observedAt.getTime() >= minSeparationMs;
    if (distinctSnapshot || separated) {
      selected.push(run);
      if (fp !== null) seenFingerprints.add(fp);
    }
  }
  return {
    corroboratingRunIds: selected.map((r) => r.settlementRunId),
    distinctRunCount: runs.length,
  };
}

// ── Structural db surface (mirrors settlement-snapshots.ts's doctrine) ──

interface ObservationCreateData {
  gameId: string;
  source: string;
  settlementRunId: string;
  payloadFingerprint: string;
  sourceSnapshotFingerprint: string | null;
  observedSourceStatus: string;
  homeScorePresent: boolean;
  awayScorePresent: boolean;
  mappingStatus: string;
  freshnessState: string;
  observedAt: Date;
  sourceObservedAt: Date | null;
}

interface AnomalyRow {
  readonly id: string;
  readonly state: string;
}

export interface SettlementDecisionEventCreateData {
  anomalyId: string;
  decisionKind: string;
  actorType: "OWNER" | "SYSTEM";
  actorReceipt: unknown;
  priorState: string;
  nextState: string;
  reason?: string | null;
  evidence?: unknown;
}

export interface SettlementEvidenceTx {
  settlementObservation: {
    createMany(args: {
      data: ObservationCreateData[];
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
    findMany(args: {
      where: { gameId: string; observedSourceStatus: string };
      select: {
        settlementRunId: true;
        sourceSnapshotFingerprint: true;
        observedAt: true;
      };
    }): Promise<
      Array<{
        settlementRunId: string;
        sourceSnapshotFingerprint: string | null;
        observedAt: Date;
      }>
    >;
  };
  settlementAnomaly: {
    findUnique(args: {
      where: { gameId_anomalyType: { gameId: string; anomalyType: string } };
      select: { id: true; state: true };
    }): Promise<AnomalyRow | null>;
    upsert(args: {
      where: { gameId_anomalyType: { gameId: string; anomalyType: string } };
      create: {
        gameId: string;
        anomalyType: string;
        state: "OPEN";
        firstSeenAt: Date;
        lastSeenAt: Date;
        distinctRunCount: number;
      };
      update: { lastSeenAt: Date; distinctRunCount: number };
      select: { id: true; state: true };
    }): Promise<AnomalyRow>;
    updateMany(args: {
      where: { id: string; state: "OPEN" };
      data: { state: "OWNER_REVIEW"; lastSeenAt: Date };
    }): Promise<{ count: number }>;
  };
  ownerDecisionRequest: {
    create(args: {
      data: { anomalyId: string; requestKind: string; context: unknown };
    }): Promise<unknown>;
  };
  settlementDecisionEvent: {
    create(args: { data: SettlementDecisionEventCreateData }): Promise<unknown>;
  };
}

export interface SettlementEvidenceDb {
  $transaction<T>(fn: (tx: SettlementEvidenceTx) => Promise<T>): Promise<T>;
}

export interface ScorelessEvidenceInput {
  readonly db: SettlementEvidenceDb;
  readonly gameId: string;
  readonly externalId: string;
  readonly gameStatus: string;
  /** DURABLE run id from getOrCreateSettlementRun (settlement-run.ts). */
  readonly settlementRunId: string;
  /** sha256 over the run's whole normalized source snapshot (6.1). */
  readonly sourceSnapshotFingerprint: string;
  readonly source: string;
  readonly payload: {
    readonly externalId: string;
    readonly completed: boolean;
    readonly homeScore: number | null;
    readonly awayScore: number | null;
  };
  readonly observedAt: Date;
  /** Source-provided event timestamp, retained verbatim when available. */
  readonly sourceObservedAt?: Date | null;
  /** Review threshold — defaults to SCORELESS_REVIEW_THRESHOLD (3). */
  readonly threshold?: number;
  /** Minimum same-snapshot separation — defaults to
   *  MIN_CORROBORATION_SEPARATION_MINUTES. */
  readonly minSeparationMinutes?: number;
}

export interface ScorelessEvidenceOutcome {
  /** True when this run/payload was a genuinely new observation. */
  readonly observationRecorded: boolean;
  /** Corroborating runs per the 6.1 rule (distinct snapshot OR separated). */
  readonly corroboratingRunCount: number;
  /** Raw COUNT(DISTINCT settlementRunId) — telemetry only. */
  readonly distinctRunCount: number;
  /** True when the anomaly row was created by this call. */
  readonly anomalyOpened: boolean;
  /** True when THIS transaction won the OPEN→OWNER_REVIEW promotion and
   *  created the idempotent OwnerDecisionRequest + appended the SYSTEM
   *  REVIEW_REQUESTED decision event. At-most-once per anomaly. */
  readonly anomalyPromoted: boolean;
}

/**
 * Records one completed-but-scoreless sighting inside ONE database
 * transaction: insert-or-noop the deduplicated observation, derive
 * corroboration per the 6.1 rule, race-safely upsert the single anomaly,
 * and (at threshold) promote OPEN→OWNER_REVIEW exactly once with an
 * idempotent OwnerDecisionRequest and an append-only SYSTEM decision event.
 *
 * Never voids picks, never changes Game.status, never deletes anything.
 * Throws on database failure — the caller (settle-sport) isolates it.
 */
export async function recordScorelessCompletedEvidence(
  input: ScorelessEvidenceInput,
): Promise<ScorelessEvidenceOutcome> {
  const threshold = input.threshold ?? SCORELESS_REVIEW_THRESHOLD;
  const minSeparationMs =
    (input.minSeparationMinutes ?? MIN_CORROBORATION_SEPARATION_MINUTES) * 60_000;
  const now = input.observedAt;
  const payloadFingerprint = fingerprintScorePayload(input.payload);

  return input.db.$transaction(async (tx) => {
    // (a) Insert-or-noop: ON CONFLICT DO NOTHING via skipDuplicates.
    const inserted = await tx.settlementObservation.createMany({
      data: [
        {
          gameId: input.gameId,
          source: input.source,
          settlementRunId: input.settlementRunId,
          payloadFingerprint,
          sourceSnapshotFingerprint: input.sourceSnapshotFingerprint,
          observedSourceStatus: SCORELESS_COMPLETED_ANOMALY,
          homeScorePresent: input.payload.homeScore !== null,
          awayScorePresent: input.payload.awayScore !== null,
          mappingStatus: "matched",
          freshnessState: "within-settlement-window",
          observedAt: input.observedAt,
          sourceObservedAt: input.sourceObservedAt ?? null,
        },
      ],
      skipDuplicates: true,
    });
    const observationRecorded = inserted.count > 0;

    // (b) Corroboration per the hardened rule — derived fresh in-tx.
    const rows = await tx.settlementObservation.findMany({
      where: { gameId: input.gameId, observedSourceStatus: SCORELESS_COMPLETED_ANOMALY },
      select: {
        settlementRunId: true,
        sourceSnapshotFingerprint: true,
        observedAt: true,
      },
    });
    const { corroboratingRunIds, distinctRunCount } = countCorroboratingRuns(
      rows,
      minSeparationMs,
    );
    const corroboratingRunCount = corroboratingRunIds.length;

    // (c) Exactly one anomaly row per (gameId, anomalyType) — race-safe
    // upsert on the compound unique; update branch never touches `state`.
    const existing = await tx.settlementAnomaly.findUnique({
      where: {
        gameId_anomalyType: { gameId: input.gameId, anomalyType: SCORELESS_COMPLETED_ANOMALY },
      },
      select: { id: true, state: true },
    });
    const anomaly = await tx.settlementAnomaly.upsert({
      where: {
        gameId_anomalyType: { gameId: input.gameId, anomalyType: SCORELESS_COMPLETED_ANOMALY },
      },
      create: {
        gameId: input.gameId,
        anomalyType: SCORELESS_COMPLETED_ANOMALY,
        state: "OPEN",
        firstSeenAt: now,
        lastSeenAt: now,
        distinctRunCount,
      },
      update: { lastSeenAt: now, distinctRunCount },
      select: { id: true, state: true },
    });
    const anomalyOpened = existing === null;

    // (d) Threshold promotion — exactly once. The state-scoped updateMany
    // is the race gate; OwnerDecisionRequest's unique anomalyId is the
    // constraint backstop. The SYSTEM decision event is appended with an
    // honest actor receipt — it requests review, it decides nothing.
    let anomalyPromoted = false;
    if (corroboratingRunCount >= threshold && anomaly.state === "OPEN") {
      const promoted = await tx.settlementAnomaly.updateMany({
        where: { id: anomaly.id, state: "OPEN" },
        data: { state: "OWNER_REVIEW", lastSeenAt: now },
      });
      if (promoted.count === 1) {
        const context = {
          gameId: input.gameId,
          externalId: input.externalId,
          gameStatusAtPromotion: input.gameStatus,
          anomalyType: SCORELESS_COMPLETED_ANOMALY,
          corroboratingRunCount,
          distinctRunCount,
          corroboratingRunIds,
          threshold,
          minSeparationMs,
          promotedAt: now.toISOString(),
          note:
            "Owner review requested: feed reports completed=true with no usable score " +
            "across the corroboration threshold. Picks left PENDING — never auto-voided.",
        };
        await tx.ownerDecisionRequest.create({
          data: {
            anomalyId: anomaly.id,
            requestKind: "SCORELESS_COMPLETED_REVIEW",
            context,
          },
        });
        await tx.settlementDecisionEvent.create({
          data: {
            anomalyId: anomaly.id,
            decisionKind: "REVIEW_REQUESTED",
            actorType: "SYSTEM",
            actorReceipt: {
              actorType: "SYSTEM",
              subjectId: "system:settlement-pipeline",
              runId: input.settlementRunId,
              observedAt: now.toISOString(),
            },
            priorState: "OPEN",
            nextState: "OWNER_REVIEW",
            reason: "corroboration-threshold-reached",
            evidence: context,
          },
        });
        anomalyPromoted = true;
      }
    }

    return {
      observationRecorded,
      corroboratingRunCount,
      distinctRunCount,
      anomalyOpened,
      anomalyPromoted,
    };
  });
}
