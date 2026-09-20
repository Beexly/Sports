/**
 * Mint-side SUPERSEDE of an unpublished PENDING slot-holder (lane B, 2026-09-20).
 *
 * THE LIFECYCLE DEFECT THIS CLOSES. Three measured facts, read-only production
 * SQL on the Week 3 2026 NFL slate (30 rows, every SPREAD/TOTAL pick):
 *
 *   1. The stale-pick policy (apps/web/lib/board/stale-pick-policy.ts, WP-29)
 *      sets isPublished=false on a published PENDING pick it considers stale —
 *      founder decision 2026-09-05: UNPUBLISH, never void, never leave graded
 *      on a months-old line. Nothing ever sets isPublished back to true, by
 *      design.
 *   2. The refresh cycle updates those rows in place but the create half of
 *      the upsert only fires when NO row exists for the (gameId, pickType)
 *      unique slot — so the slot stays occupied by an invisible row forever.
 *   3. Net effect: once a row is unpublished, no fresh pick for that game and
 *      market can EVER publish through this path. Measured consequence: 30 of
 *      30 NFL Week 3 SPREAD/TOTAL rows invisible while all three scoring gates
 *      (MIN_BOOKMAKERS=2, CONSENSUS_MIN_PCT=0.55, MIN_PUBLISH_CONFIDENCE=50)
 *      pass on every one of them (11 books, both sides priced, consensus 1.0,
 *      confidence 50-100).
 *
 * WHAT THIS DOES. When the write loop finds the slot held by a row that is
 * result=PENDING and isPublished=false — invisible to every customer surface,
 * never to be republished by anyone — it voids that row through the SAME
 * transactional outbox the settlement lanes use (pick updateMany scoped to
 * PENDING+unpublished, one PickSettlementEvent carrying the RCA code in its
 * payload, post-settlement work rows), and the loop then creates the fresh,
 * fully gated pick with a new CLV lock minted at the current line.
 *
 * WHY A VOID AND NOT SOMETHING ELSE. The zero-sit lane (WP-29) voids every
 * still-PENDING pick after kickoff + 24h regardless of publication, so this
 * row's terminus is already VOID — superseding at mint time only moves an
 * inevitable void earlier, replaces it with the accurate cause, and frees the
 * slot while the game can still be priced. No row is deleted; the voided row
 * keeps its history, its receipt and its CLV lock untouched.
 *
 * WHAT THIS NEVER TOUCHES. A PUBLISHED row. The side-flip freeze, the
 * write-once bet terms and the settled-frozen rule apply to published rows in
 * full — an operator-visible pick is never reversed or rewritten here. The
 * unpublish decision itself is also untouched: the stale-pick policy keeps
 * unpublishing stale rows exactly as before; this only stops an unpublished
 * row from blocking its own replacement forever.
 */
import {
  enqueuePostSettlementWork,
  type PostSettlementWorkDelegate,
} from "./post-settlement-work.js";

/** RCA code stamped on the supersede void event (see root-cause-analysis). */
export const SUPERSEDED_UNPUBLISHED_RCA_CODE = "STALE_UNPUBLISHED_SUPERSEDED";
export const SUPERSEDE_EVENT_SCHEMA_VERSION = 1;
export const SUPERSEDE_ACTOR = "system:ingestion:process-sport";

/** Payload stamped on the VOID PickSettlementEvent (zero-sit payload shape). */
export type SupersedeVoidEventPayload = {
  schemaVersion: number;
  kind: "SUPERSEDE_VOID";
  lane: "mint-supersede";
  actor: string;
  pickId: string;
  gameId: string;
  sportKey: string;
  pickType: string;
  result: "VOID";
  rcaCode: typeof SUPERSEDED_UNPUBLISHED_RCA_CODE;
  reason: string;
  supersededSelection: string;
  supersededBySelection: string;
  settledAt: string;
  evidence: { publishedState: "UNPUBLISHED" };
  // SETTLE-TIME EVIDENCE (C-120), the same key the graded lanes write: a void
  // grades against no score by definition, and recording that explicitly is
  // the point.
  settledWith: {
    homeScore: null;
    awayScore: null;
    sources: readonly never[];
    path: "mint-supersede";
  };
};

/** Structural transaction surface this helper needs (mirrors zero-sit's TxDb). */
export interface SupersedeTx {
  pick: {
    updateMany(args: {
      where: { id: string; result: "PENDING"; isPublished: false };
      data: { result: "VOID"; settledAt: Date };
    }): Promise<{ count: number }>;
  };
  pickSettlementEvent: {
    create(args: { data: SupersedeVoidEventPayload }): Promise<unknown>;
  };
  postSettlementWork: PostSettlementWorkDelegate;
}

export interface SupersedeDb {
  $transaction<T>(fn: (tx: SupersedeTx) => Promise<T>): Promise<T>;
}

export type SupersedeArgs = {
  readonly pickId: string;
  readonly gameId: string;
  readonly sportKey: string;
  readonly pickType: string;
  /** The bet terms being withdrawn (for the event's evidence). */
  readonly supersededSelection: string;
  /** The fresh pick replacing it this cycle. */
  readonly supersededBySelection: string;
};

/**
 * Void one PENDING + UNPUBLISHED pick through the settlement outbox. Returns
 * true when this call performed the void; false when the row left the
 * PENDING+unpublished state before our scoped write could take it (a racing
 * settle/void lane won) — in which case NOTHING is written here, idempotent
 * under concurrency exactly like the zero-sit and settle lanes.
 */
export async function supersedeUnpublishedPendingPick(
  db: SupersedeDb,
  args: SupersedeArgs,
): Promise<boolean> {
  const now = new Date();
  return db.$transaction(async (tx) => {
    // PENDING-scoped AND publication-scoped: a row that got graded, voided by
    // zero-sit, or (hypothetically) republished between the write loop's read
    // and here matches zero rows and this helper writes nothing at all. The
    // publication scope also makes the helper safe against future callers: a
    // published row is never voided from the mint side.
    const voided = await tx.pick.updateMany({
      where: { id: args.pickId, result: "PENDING", isPublished: false },
      data: { result: "VOID", settledAt: now },
    });
    if (voided.count === 0) return false;

    const payload: SupersedeVoidEventPayload = {
      schemaVersion: SUPERSEDE_EVENT_SCHEMA_VERSION,
      kind: "SUPERSEDE_VOID",
      lane: "mint-supersede",
      actor: SUPERSEDE_ACTOR,
      pickId: args.pickId,
      gameId: args.gameId,
      sportKey: args.sportKey,
      pickType: args.pickType,
      result: "VOID",
      rcaCode: SUPERSEDED_UNPUBLISHED_RCA_CODE,
      reason:
        "Unpublished PENDING slot-holder superseded at mint time: the stale-pick " +
        "policy had set isPublished=false (never restored by design) and the " +
        "(gameId, pickType) slot blocked every future mint; replaced by a fresh, " +
        "fully gated pick carrying a new CLV lock at the current line.",
      supersededSelection: args.supersededSelection,
      supersededBySelection: args.supersededBySelection,
      settledAt: now.toISOString(),
      evidence: { publishedState: "UNPUBLISHED" },
      settledWith: {
        homeScore: null,
        awayScore: null,
        // Empty by construction, not by omission: a void grades against no
        // final, so there are no grading sources to record.
        sources: [],
        path: "mint-supersede",
      },
    };

    // TRANSACTIONAL OUTBOX (same lane as settle-sport.ts, free-settlement-runner
    // and zero-sit): the event rides in the void transaction; the outbox worker
    // closes VOID events as receipts (non-decisive) and never rewrites the
    // payload.
    await tx.pickSettlementEvent.create({ data: payload });

    // Same post-settlement rows the zero-sit void appends: the CLV grader and
    // the outcome snapshotter both need to see the void.
    await enqueuePostSettlementWork(
      tx.postSettlementWork as unknown as PostSettlementWorkDelegate,
      [
        { subjectId: args.pickId, kind: "CLV_GRADE" },
        { subjectId: args.pickId, kind: "SNAPSHOT_OUTCOME" },
      ],
    );

    return true;
  });
}
