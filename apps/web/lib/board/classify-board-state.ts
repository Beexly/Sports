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

// Customer-facing copy. Empty states are refuse-default: an empty board is
// never dressed up as a measured zero-edge result.
const MESSAGES: Record<BoardStateClass, string> = {
  HAS_ROWS: "Live picks on the board.",
  HONEST_EMPTY_LIVE_BOARD_OFF:
    "Picks are paused right now. An empty board is not a claim that there's no value on the slate.",
  HONEST_EMPTY_NO_ELIGIBLE:
    "Nothing cleared our bar today, so we're passing. A pass is not a result.",
  SUPPRESSED_DEMO: "Example picks are hidden from the live board.",
  SUPPRESSED_STALE: "Older picks came down because their lines went stale.",
  DB_UNREACHABLE: "The board couldn't load. Try again in a minute.",
  BOOTSTRAP: "The board is warming up. These aren't live picks yet.",
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
