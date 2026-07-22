/**
 * Settlement evidence — append-only observations, race-safe anomaly
 * lifecycle, and exactly-once owner-decision receipts (Phase 1E).
 *
 * Replaces the rejected in-place counter design (PR #157). Every one of
 * that design's failure modes is closed structurally here:
 *
 *   1. NOT ATOMIC (read-count-then-increment): corroboration is never a
 *      stored counter that gets incremented. It is DERIVED inside one
 *      database transaction by counting DISTINCT settlementRunId over the
 *      append-only SettlementObservation rows. Concurrent runs cannot
 *      double-count, miss, or miscount — the rows themselves are the truth.
 *   2. RETRIES COUNTED AS CORROBORATION: observations carry the run id and
 *      a deterministic payload fingerprint, and the table has a compound
 *      unique on (gameId, settlementRunId, payloadFingerprint). Inserts go
 *      through createMany(skipDuplicates) — Postgres INSERT ... ON CONFLICT
 *      DO NOTHING — so a retry of the same run/payload is a no-op insert
 *      and can never add a distinct run.
 *   3. HISTORY DESTROYED ON RESOLUTION: nothing here (or anywhere in the
 *      pipeline) deletes or resets observations, anomalies, or decisions.
 *      Score arrival RESOLVES the anomaly (state + reason + timestamp);
 *      the evidence trail and the decision receipt survive it.
 *   4. NO DURABLE OWNER RECEIPT: crossing the review threshold creates a
 *      SettlementDecision row exactly once — the unique FK on anomalyId is
 *      the exactly-once guarantee, and the promotion itself is guarded by
 *      an updateMany scoped to state:"OPEN" so only one transaction can
 *      win the promotion race (the loser matches 0 rows and never attempts
 *      the receipt insert).
 *
 * The pipeline still NEVER infers POSTPONED, NEVER voids picks, and leaves
 * already-terminal games untouched — promotion only flags the anomaly for
 * OWNER review. Auto-voiding a paid user's pick from a status the feed
 * never states explicitly is an owner decision, not a pipeline one.
 */

import { createHash } from "node:crypto";

/** Anomaly type for "feed says completed, but no usable score, while the
 *  game is still SCHEDULED/LIVE". */
export const SCORELESS_COMPLETED_ANOMALY = "SCORELESS_COMPLETED";

/**
 * Distinct settlement runs that must all observe a game completed-but-
 * scoreless before its anomaly is promoted to OWNER_REVIEW. A single
 * sighting is never enough: a transient Odds-API score drop or a
 * team-name-mapping miss is byte-identical to a real postponement.
 * (Same threshold value the rejected #157 used — the threshold was fine;
 * the counter mechanics were not.)
 */
export const SCORELESS_REVIEW_THRESHOLD = 3;

/** Deterministic sha256 fingerprint over the normalized source row content.
 *  Key order is fixed by construction, so the same source payload always
 *  produces the same fingerprint (the dedupe key's third component). */
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

// ── Structural db surface (mirrors settlement-snapshots.ts's doctrine) ──

interface ObservationCreateData {
  gameId: string;
  source: string;
  settlementRunId: string;
  payloadFingerprint: string;
  observedSourceStatus: string;
  homeScorePresent: boolean;
  awayScorePresent: boolean;
  mappingStatus: string;
  freshnessState: string;
  observedAt: Date;
}

interface AnomalyRow {
  readonly id: string;
  readonly state: string;
}

export interface SettlementEvidenceTx {
  settlementObservation: {
    createMany(args: {
      data: ObservationCreateData[];
      skipDuplicates: boolean;
    }): Promise<{ count: number }>;
    findMany(args: {
      where: { gameId: string; observedSourceStatus: string };
      distinct: ["settlementRunId"];
      select: { settlementRunId: true };
    }): Promise<Array<{ settlementRunId: string }>>;
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
  settlementDecision: {
    create(args: {
      data: { anomalyId: string; decisionKind: string; context: unknown };
    }): Promise<unknown>;
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
  readonly settlementRunId: string;
  readonly source: string;
  readonly payload: {
    readonly externalId: string;
    readonly completed: boolean;
    readonly homeScore: number | null;
    readonly awayScore: number | null;
  };
  readonly observedAt: Date;
  /** Review threshold — defaults to SCORELESS_REVIEW_THRESHOLD (3). */
  readonly threshold?: number;
}

export interface ScorelessEvidenceOutcome {
  /** True when this run/payload was a genuinely new observation (false for
   *  a retry — the unique-violation no-op path). */
  readonly observationRecorded: boolean;
  /** COUNT(DISTINCT settlementRunId) after this write. */
  readonly distinctRunCount: number;
  /** True when the anomaly row was created by this call (best-effort
   *  telemetry; the row itself is constraint-guaranteed unique). */
  readonly anomalyOpened: boolean;
  /** True when THIS transaction won the OPEN→OWNER_REVIEW promotion and
   *  created the decision receipt. Guaranteed at-most-once per anomaly. */
  readonly anomalyPromoted: boolean;
}

/**
 * Records one completed-but-scoreless sighting inside ONE database
 * transaction:
 *   (a) insert-or-noop the deduplicated observation,
 *   (b) derive distinct corroborating runs by counting DISTINCT
 *       settlementRunId (never an in-place counter),
 *   (c) upsert exactly one anomaly row per (gameId, anomalyType) —
 *       race-safe: the compound unique makes Prisma compile the upsert to
 *       INSERT ... ON CONFLICT, so concurrent transactions cannot create
 *       two rows,
 *   (d) if distinct runs >= threshold and the anomaly is still OPEN,
 *       promote it to OWNER_REVIEW (updateMany guarded on state:"OPEN" —
 *       only one racer matches) and create the SettlementDecision receipt
 *       (unique anomalyId FK — double-promotion is structurally impossible).
 *
 * Never voids picks, never changes Game.status, never deletes anything.
 * Throws on database failure — the caller (settle-sport) isolates it so an
 * evidence failure cannot abort settlement of other games.
 */
export async function recordScorelessCompletedEvidence(
  input: ScorelessEvidenceInput,
): Promise<ScorelessEvidenceOutcome> {
  const threshold = input.threshold ?? SCORELESS_REVIEW_THRESHOLD;
  const now = input.observedAt;
  const payloadFingerprint = fingerprintScorePayload(input.payload);

  return input.db.$transaction(async (tx) => {
    // (a) Insert-or-noop: ON CONFLICT DO NOTHING via skipDuplicates, so a
    // retry of the same (game, run, payload) records nothing and — because
    // corroboration is derived from the rows — corroborates nothing.
    const inserted = await tx.settlementObservation.createMany({
      data: [
        {
          gameId: input.gameId,
          source: input.source,
          settlementRunId: input.settlementRunId,
          payloadFingerprint,
          observedSourceStatus: SCORELESS_COMPLETED_ANOMALY,
          homeScorePresent: input.payload.homeScore !== null,
          awayScorePresent: input.payload.awayScore !== null,
          mappingStatus: "matched",
          freshnessState: "within-settlement-window",
          observedAt: input.observedAt,
        },
      ],
      skipDuplicates: true,
    });
    const observationRecorded = inserted.count > 0;

    // (b) Corroboration = COUNT(DISTINCT settlementRunId) over the
    // append-only evidence — derived fresh inside this transaction.
    const distinctRuns = await tx.settlementObservation.findMany({
      where: { gameId: input.gameId, observedSourceStatus: SCORELESS_COMPLETED_ANOMALY },
      distinct: ["settlementRunId"],
      select: { settlementRunId: true },
    });
    const distinctRunCount = distinctRuns.length;

    // (c) Exactly one anomaly row per (gameId, anomalyType). The prior
    // findUnique is telemetry only (did WE open it?) — correctness rests on
    // the compound unique + native upsert. The update branch never touches
    // `state`, so it can never demote OWNER_REVIEW (or un-resolve RESOLVED).
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
    // is the race gate (only one concurrent transaction matches the OPEN
    // row); the decision's unique anomalyId FK is the constraint backstop.
    let anomalyPromoted = false;
    if (distinctRunCount >= threshold && anomaly.state === "OPEN") {
      const promoted = await tx.settlementAnomaly.updateMany({
        where: { id: anomaly.id, state: "OPEN" },
        data: { state: "OWNER_REVIEW", lastSeenAt: now },
      });
      if (promoted.count === 1) {
        await tx.settlementDecision.create({
          data: {
            anomalyId: anomaly.id,
            decisionKind: "REVIEW_REQUESTED",
            context: {
              gameId: input.gameId,
              externalId: input.externalId,
              gameStatusAtPromotion: input.gameStatus,
              anomalyType: SCORELESS_COMPLETED_ANOMALY,
              distinctRunCount,
              corroboratingRunIds: distinctRuns.map((r) => r.settlementRunId),
              threshold,
              promotedAt: now.toISOString(),
              note:
                "Owner review requested: feed reports completed=true with no usable score " +
                "across the corroboration threshold. Picks left PENDING — never auto-voided.",
            },
          },
        });
        anomalyPromoted = true;
      }
    }

    return { observationRecorded, distinctRunCount, anomalyOpened, anomalyPromoted };
  });
}
