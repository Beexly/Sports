/**
 * Board honest-empty classifier — refuse-default public board states.
 *
 * Never paint "healthy live board" over zeros when LIVE_BOARD is off or the
 * eligible set is empty for structural reasons. Callers compose this with
 * loadBoardState / buildBoardHealth; this module is pure and unit-testable.
 *
 * Law: LIVE_BOARD off · refuse-default · no invented zeros as fireable slate
 */

export type BoardStateClass =
  /** Real rows available and product board is allowed to show them. */
  | "HAS_ROWS"
  /**
   * Empty because LIVE_BOARD is off — the honesty-correct production default.
   * Must never be presented as "no edge today" win/loss claim.
   */
  | "HONEST_EMPTY_LIVE_BOARD_OFF"
  /**
   * Live board allowed but zero eligible rows after gate (calibration thin,
   * dual-asOf refuse, etc.). Honest empty, not a fabricated slate.
   */
  | "HONEST_EMPTY_NO_ELIGIBLE"
  /** Demo / stub rows suppressed. */
  | "SUPPRESSED_DEMO"
  /** Stale kill-switch emptied the board. */
  | "SUPPRESSED_STALE"
  /** Data store unreachable — empty nonblocking. */
  | "DB_UNREACHABLE"
  /** Bootstrap / seed mode — not a live public claim. */
  | "BOOTSTRAP";

export interface ClassifyBoardStateInput {
  readonly liveBoardOn: boolean;
  readonly bootstrap: boolean;
  readonly rowCount: number;
  readonly dataError?: "DB_UNREACHABLE" | null;
  readonly suppressedReason?: "DEMO_DATA" | "STALE_DATA" | null;
}

export interface ClassifiedBoardState {
  readonly state: BoardStateClass;
  /** Safe for UI strip — never invents performance. */
  readonly publicMessage: string;
  /** True when the board must refuse to claim a live fireable slate. */
  readonly refusePublicFire: true | false;
  /** True when empty is structural honesty, not a failure. */
  readonly honestEmpty: boolean;
}

const MESSAGES: Record<BoardStateClass, string> = {
  HAS_ROWS: "Board has active rows.",
  HONEST_EMPTY_LIVE_BOARD_OFF:
    "Live board is held (founder gate). Empty slate is the honesty-correct default — not a claim that no edges exist.",
  HONEST_EMPTY_NO_ELIGIBLE:
    "No eligible rows after gate. Empty is refuse-default, not a fabricated zero-edge win rate.",
  SUPPRESSED_DEMO: "Demo rows were suppressed from the public board.",
  SUPPRESSED_STALE: "Stale public-board rows were suppressed before rendering.",
  DB_UNREACHABLE: "Board data store did not answer; empty nonblocking state returned.",
  BOOTSTRAP: "Bootstrap mode — board is not a live public claim surface.",
};

/**
 * Classify public board emptiness. Deterministic pure function.
 *
 * Precedence (highest first): DB error → suppression → bootstrap → LIVE_BOARD off
 * → has rows → honest empty no eligible.
 */
export function classifyBoardState(
  input: ClassifyBoardStateInput,
): ClassifiedBoardState {
  if (input.dataError === "DB_UNREACHABLE") {
    return {
      state: "DB_UNREACHABLE",
      publicMessage: MESSAGES.DB_UNREACHABLE,
      refusePublicFire: true,
      honestEmpty: true,
    };
  }
  if (input.suppressedReason === "DEMO_DATA") {
    return {
      state: "SUPPRESSED_DEMO",
      publicMessage: MESSAGES.SUPPRESSED_DEMO,
      refusePublicFire: true,
      honestEmpty: true,
    };
  }
  if (input.suppressedReason === "STALE_DATA") {
    return {
      state: "SUPPRESSED_STALE",
      publicMessage: MESSAGES.SUPPRESSED_STALE,
      refusePublicFire: true,
      honestEmpty: true,
    };
  }
  if (input.bootstrap) {
    return {
      state: "BOOTSTRAP",
      publicMessage: MESSAGES.BOOTSTRAP,
      refusePublicFire: true,
      honestEmpty: input.rowCount === 0,
    };
  }
  if (!input.liveBoardOn) {
    return {
      state: "HONEST_EMPTY_LIVE_BOARD_OFF",
      publicMessage: MESSAGES.HONEST_EMPTY_LIVE_BOARD_OFF,
      refusePublicFire: true,
      honestEmpty: true,
    };
  }
  if (input.rowCount > 0) {
    return {
      state: "HAS_ROWS",
      publicMessage: MESSAGES.HAS_ROWS,
      refusePublicFire: false,
      honestEmpty: false,
    };
  }
  return {
    state: "HONEST_EMPTY_NO_ELIGIBLE",
    publicMessage: MESSAGES.HONEST_EMPTY_NO_ELIGIBLE,
    refusePublicFire: true,
    honestEmpty: true,
  };
}
