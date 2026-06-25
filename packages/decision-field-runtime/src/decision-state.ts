/**
 * DECISION FIELD RUNTIME — the canonical DecisionState grammar (single source of truth).
 *
 * One organism, one grammar. Every layer — the runtime stat contracts, the state-specific compilers,
 * and the NFL source/acquisition matrix — consumes THIS union and nothing else. There is no second
 * taxonomy. `ALL_DECISION_STATES` is the enumerable witness used to prove exhaustive coverage at the
 * type level and in tests (so nothing can drift). Pure type + const; no I/O.
 *
 * Set decision (deliberate): the betting/fantasy core, plus the two genuinely DFS-specific states the
 * core lacked. INJURY_SOURCE_CONFLICT folds into DATA_CONFLICT and a prop/market lag folds into
 * GOOD_IDEA_BAD_PRICE / TOO_LATE — they are not separate states. NEEDS_CONFIRMATION and PASS are kept.
 */

export type DecisionState =
  | "ACTIONABLE"
  | "ROLE_UP_FANTASY_LATE"
  | "GOOD_IDEA_BAD_PRICE"
  | "PUBLIC_OVERREACTION"
  | "ROLE_MASS_MISALLOCATED"
  | "DATA_CONFLICT"
  | "NEEDS_CONFIRMATION"
  | "TOO_LATE"
  | "PASS"
  | "TRAP"
  | "WATCHLIST"
  | "NEEDS_LIVE_DATA"
  | "DFS_SALARY_LAG"
  | "OWNERSHIP_OVERREACTION";

/** The single enumerable witness of the union. Keep in sync with `DecisionState` (compile-guarded below). */
export const ALL_DECISION_STATES = [
  "ACTIONABLE",
  "ROLE_UP_FANTASY_LATE",
  "GOOD_IDEA_BAD_PRICE",
  "PUBLIC_OVERREACTION",
  "ROLE_MASS_MISALLOCATED",
  "DATA_CONFLICT",
  "NEEDS_CONFIRMATION",
  "TOO_LATE",
  "PASS",
  "TRAP",
  "WATCHLIST",
  "NEEDS_LIVE_DATA",
  "DFS_SALARY_LAG",
  "OWNERSHIP_OVERREACTION",
] as const satisfies readonly DecisionState[];

// Compile-time exhaustiveness: if a member is added to the union but not the array (or vice-versa),
// one of these aliases resolves to a non-`never` type and the package fails to typecheck.
type _MissingFromArray = Exclude<DecisionState, (typeof ALL_DECISION_STATES)[number]>;
type _ExtraInArray = Exclude<(typeof ALL_DECISION_STATES)[number], DecisionState>;
type _AssertExhaustive = [_MissingFromArray] extends [never]
  ? [_ExtraInArray] extends [never]
    ? true
    : never
  : never;
const _exhaustive: _AssertExhaustive = true;
void _exhaustive;

/** Runtime guard: is an arbitrary string a canonical DecisionState? */
export function isDecisionState(x: string): x is DecisionState {
  return (ALL_DECISION_STATES as readonly string[]).includes(x);
}
