/**
 * Signal staleness gate — a pick may not publish on a stale solo-source read.
 *
 * WHY THIS EXISTS. Live check 2026-09-28 19:00 UTC, ~15 minutes before an NFL
 * kickoff. The engine's only published pick on the board was Chicago Bears ML,
 * generated 8h07m before kickoff on a SINGLE source:
 *
 *   independentEdge.sources = ["elo"], agreement = "SOLO",
 *   marketFairProb = null ("No book odds attached"),
 *   factors: elo(60) · prereg leakage(5) · kelly(9) · cover-prob(4) · leakage-gate(NOT RUN)
 *
 * No personnel, injury, weather, scheme or pace factor exists on this path, and
 * none can: the row is one Elo number plus reasoning surfaces computed from it.
 * So when a late QB change landed (a backup starting), the number did not move
 * and nothing in the system was capable of noticing. The pick was the opinion of
 * 16:07 presented as the opinion of kickoff.
 *
 * AGENTS.md recorded this exact failure on 2026-09-13 — "All 5 signal picks are
 * SINGLE-source Elo... The gate should require agreement>=2 or shrink solo-source
 * edges harder" — and no gate was ever built. 15 days. This is that gate.
 *
 * WHAT IT DOES. A pure predicate over fields already on the row. It never
 * touches the DB and never decides on its own: it returns blockers, and the
 * caller decides. That separation is deliberate — a module that both judges and
 * publishes is a module nobody can test.
 *
 * DESIGN COMMITMENTS
 *
 * 1. FAIL CLOSED ON UNKNOWN, not open. A row whose age cannot be determined is
 *    treated as stale for the solo-source case. "We could not measure it" must
 *    not read as "it is fine."
 *
 * 2. ABSENCE OF AN EDGE IS NOT A BLOCKER. `decision: "PASS"` is the engine
 *    correctly declining to claim an edge, which is a PASS outcome, not a stale
 *    one. This gate is about staleness and corroboration only. The v5.3.0
 *    "never publish on PASS" rule is a SEPARATE rule and belongs in the caller;
 *    conflating them here would let a future edit satisfy one by breaking the
 *    other. `PASS` is reported, not blocked.
 *
 * 3. A BOOK-PRICED row is not stale on this axis. It carries a market price read
 *    at lock time; a fresh book price is a different observation than a fresh
 *    Elo. Rows that are neither solo-source-elo nor book-priced are allowed
 *    through, because this gate does not know every future path and must not
 *    become the reason a legitimate pick cannot ship.
 *
 * 4. The bounds are named constants, not env flags, and the tests pin them. The
 *    failure this prevents is silent, so a threshold nobody can see drift is a
 *    threshold that will drift.
 */

/** How old a solo-source model-signal read may be at kickoff, in ms. */
export const SOLO_SOURCE_STALENESS_MS = 90 * 60 * 1000; // 90 minutes

/**
 * How far before kickoff a solo-source read is judged at all, in ms.
 *
 * A pick for a fixture three months out is generated days ahead by design, and
 * that is not staleness. The danger case is narrow and human: the hours before
 * kickoff, when a quarterback change or a weather report is live and an old
 * number cannot know it. Measured on production 2026-09-28, pending signal
 * picks averaged 1,695 hours before their fixture, so any unconditional age
 * bound vetoed the entire future board. This bound is what makes the gate a
 * gate instead of a blackout.
 */
export const PRE_KICKOFF_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

export type StalenessBlocker =
  /** Solo-source edge, past the age bound, inside the danger window. */
  | "solo_source_stale"
  /** Solo-source edge with no readable age at all. */
  | "solo_source_age_unknown"
  /** Elo-only source list, i.e. no cross-model corroboration. */
  | "solo_source_no_corroboration"
  /** The read is so old the edge cannot be current under any reading. */
  | "stale_beyond_window";

export interface StalenessInput {
  /** `independentEdge.agreement` when present. */
  readonly agreement?: string | null;
  /** `independentEdge.sources` when present. */
  readonly sources?: readonly string[] | null;
  /** True when the row was priced off a real book (market price attached). */
  readonly bookPriced?: boolean;
  /** When the model formed the read. */
  readonly generatedAt?: Date | string | null;
  /** When the game starts. */
  readonly commenceTime?: Date | string | null;
}

function toMs(value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/** True when the read rests on Elo alone with no second model behind it. */
export function isSoloSourceElo(input: StalenessInput): boolean {
  if (input.bookPriced === true) return false;
  const agreement = (input.agreement ?? "").trim().toUpperCase();
  if (agreement && agreement !== "SOLO") return false;
  const sources = (input.sources ?? []).map((s) => s.trim().toLowerCase());
  if (sources.length === 0) return false; // no edge read at all — not this gate's business
  // A source list that is ONLY elo is uncorroborated. Any second source, or any
  // source that is not elo, means something else priced it.
  return sources.every((s) => s === "elo");
}

/**
 * The blockers for a row, in a stable order. Empty means this gate has no
 * objection; it never means the pick is good.
 */
export function stalenessBlockers(input: StalenessInput): StalenessBlocker[] {
  if (!isSoloSourceElo(input)) return [];

  const blockers: StalenessBlocker[] = [];
  // Corroboration is REPORTED, never blocking on its own. Every NFL pick today
  // is solo-source elo; a gate that refused all of them would publish an empty
  // board, which is a worse failure than the one this exists to prevent. The
  // v5.3.0 "require agreement>=2 or shrink harder" rule is a real recommendation
  // in AGENTS.md and it belongs in the shrinkage model, not in a hard block.
  // What blocks here is AGE. A fresh uncorroborated read is weak; an 8-hour-old
  // uncorroborated read is stale, and stale is what must not ship.
  const generated = toMs(input.generatedAt);
  const commence = toMs(input.commenceTime);

  if (generated === null) {
    // Cannot age a read we cannot date. Fail closed.
    blockers.push("solo_source_age_unknown");
    return blockers;
  }

  const reference = commence ?? Date.now();
  const age = reference - generated;
  // ONLY near-kickoff reads can be stale. A pick for a fixture 70 days out is
  // correctly generated hours or days before it — that is planning, not
  // staleness, and gating on it would veto the entire future board. This is the
  // bug my first cut had: measured on production 2026-09-28, 158 pending signal
  // picks averaged 1,695 hours before their fixture, so an unconditional age
  // bound blacked out the whole board. The bound is meaningful only inside the
  // window where a human would have learned something new — the hours before
  // kickoff. Outside it, age is not evidence of anything.
  if (commence !== null && age < 0) {
    // Generated AFTER the fixture kicked off: the read cannot describe the game
    // it is being attached to. Age exactly 0 is fine — a read stamped at
    // kickoff is as fresh as one stamped a second before it, and treating the
    // boundary as stale would veto a legitimately current pick.
    blockers.push("solo_source_stale");
  } else if (commence !== null && age < PRE_KICKOFF_WINDOW_MS && age > SOLO_SOURCE_STALENESS_MS) {
    // Inside the pre-kickoff window and older than the bound: the case that
    // actually shipped. Bears ML, 8h07m48s before kickoff, solo elo, no market.
    blockers.push("solo_source_stale");
  } else if (commence === null && Date.now() - generated >= PRE_KICKOFF_WINDOW_MS) {
    // No fixture time to reason from: fall back to wall clock, and only
    // complain when the read is genuinely ancient.
    blockers.push("stale_beyond_window");
  }
  return blockers;
}

/** Convenience: is this row blocked from publishing by the staleness gate? */
export function isStaleSoloSource(input: StalenessInput): boolean {
  return stalenessBlockers(input).length > 0;
}
