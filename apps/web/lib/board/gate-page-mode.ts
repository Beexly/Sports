/**
 * Which rows `/board/gate` is about to show, and whether it may call them live.
 *
 * WHY THIS IS A SEPARATE MODULE. The page is a React server component, so the
 * branch that matters most here — "the live read threw, fall back without
 * claiming live" — is the branch hardest to exercise from a render test. Putting
 * the decision in a plain function makes the failure path directly testable,
 * which is the only reason to trust it.
 *
 * THE INVARIANT. `mode` and `rows` are produced together, by one function, from
 * one attempt. Nothing downstream can pair a "live" label with illustrative
 * rows, because there is no code path that computes them separately. That
 * pairing — real-looking label over made-up inputs — is the single failure this
 * page exists to argue against, so it is prevented structurally rather than by
 * remembering to keep two variables in sync.
 *
 * FAIL CLOSED. A thrown live read does not produce an error page and does not
 * produce a silently-illustrative one. It produces illustrative rows plus a
 * named reason, shown to the reader. A honesty surface that hides its own
 * degradation is worse than one that never had a live mode.
 */

import {
  buildCalibrationRows,
  buildCandidateRows,
  type BuiltRows,
  type RawPickRow,
} from "./gate-rows";
import { fetchGateSlate, isLiveGateSlateEnabled } from "./load-gate-slate";

/**
 * `live` — rows are today's published slate, read from the database.
 * `illustrative` — rows are the seeded demonstration set.
 *
 * There is no third value, and in particular no "live but empty" state that
 * could be shown as live. An empty live read is reported as `illustrative` with
 * a reason, because a page confidently showing nothing is a claim about the
 * slate that the empty result does not support.
 */
export type GateMode = "live" | "illustrative";

export interface GateSlateSource {
  readonly mode: GateMode;
  readonly calibration: BuiltRows;
  readonly candidates: BuiltRows;
  /**
   * Production rows too incomplete to describe at all. Zero for the
   * illustrative set by construction — it is built complete.
   */
  readonly undescribable: number;
  /**
   * Why live was not used, when it was attempted and did not succeed. Absent
   * when the flag is off (nothing was attempted, so there is nothing to
   * explain) and absent when live succeeded.
   */
  readonly degradedReason?: string;
}

/** Deterministic, seeded — the same illustration every load, no hidden RNG. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Illustrative rows. Two strata by design:
 *   nfl|SPREAD    — well past the calibration floor, so the gate genuinely
 *                   evaluates and genuinely declines some rows
 *   nba|MONEYLINE — deliberately thin, to show the state a pre-launch product
 *                   is actually in most of the time
 * Plus one row with no captured odds, which must NOT read as a refusal.
 */
export function illustrativePicks(): {
  settled: RawPickRow[];
  pending: RawPickRow[];
} {
  const rand = seeded(20260724);
  const mk = (
    i: number,
    sport: string,
    pickType: RawPickRow["pickType"],
    result: RawPickRow["result"],
  ): RawPickRow => {
    const conf = 45 + Math.floor(rand() * 45);
    return {
      id: `${sport}-${pickType}-${result}-${i}`,
      selection: `Home Team ${i} -2.5`,
      confidence: conf,
      pickType,
      result,
      sportName: sport,
      homeTeamName: `Home Team ${i}`,
      awayTeamName: `Away Team ${i}`,
      homePrice: -110,
      awayPrice: -110,
    };
  };

  const settled: RawPickRow[] = [];
  for (let i = 0; i < 260; i++) {
    settled.push(mk(i, "nfl", "SPREAD", rand() < 0.52 ? "WIN" : "LOSS"));
  }
  // Under the floor on purpose.
  for (let i = 0; i < 18; i++) {
    settled.push(mk(i, "nba", "MONEYLINE", rand() < 0.5 ? "WIN" : "LOSS"));
  }
  // Excluded from calibration entirely — a push is not a loss.
  settled.push({ ...mk(900, "nfl", "SPREAD", "PUSH") });

  const pending: RawPickRow[] = [];
  for (let i = 0; i < 6; i++) pending.push(mk(500 + i, "nfl", "SPREAD", "PENDING"));
  for (let i = 0; i < 2; i++) pending.push(mk(600 + i, "nba", "MONEYLINE", "PENDING"));
  // No captured two-sided odds — must surface as "not evaluated", not a refusal.
  pending.push({ ...mk(700, "nfl", "SPREAD", "PENDING"), homePrice: null, awayPrice: null });

  return { settled, pending };
}

/** The illustrative set, built into gate rows. Never throws, never reads a DB. */
export function illustrativeSource(degradedReason?: string): GateSlateSource {
  const { settled, pending } = illustrativePicks();
  return {
    mode: "illustrative",
    // No `PRODUCTION_CALIBRATION_OPTS` here, deliberately: these rows have no
    // provenance to read, and requiring learning-eligibility of a fixture would
    // exclude all of them and render an empty demonstration.
    calibration: buildCalibrationRows(settled),
    candidates: buildCandidateRows(pending),
    undescribable: 0,
    ...(degradedReason ? { degradedReason } : {}),
  };
}

/**
 * Injection seam for tests. Defaults to the real loader and the real flag
 * reader, so production behaviour needs no wiring at the call site.
 */
export interface ResolveGateSlateDeps {
  readonly fetchSlate?: typeof fetchGateSlate;
  readonly isLiveEnabled?: () => boolean;
}

/**
 * Decide the mode and produce the matching rows.
 *
 * The order of the guards is the whole safety argument:
 *   1. Flag off        -> illustrative, no reason (nothing was attempted).
 *   2. Read threw      -> illustrative + reason. Never a 500, never silent.
 *   3. Read returned
 *      null            -> illustrative + reason. This is the stub-mode and
 *                         flag-disagreement case; `fetchGateSlate` applies its
 *                         own guards and null means "not live", not "empty".
 *   4. No candidates   -> illustrative + reason. A live read that found nothing
 *                         placeable has no board to show, and rendering it as a
 *                         live empty board asserts "we looked and declined
 *                         everything" when the truth is "there was nothing to
 *                         look at".
 *   5. Otherwise       -> live.
 *
 * Guard 4 is the one worth arguing about, and it is why the mission line says a
 * labelled illustrative board beats a live board that declines every row for
 * thin history. Note it is keyed on candidates EXISTING, not on any of them
 * firing: a live slate that evaluated eight games and refused all eight is a
 * true and valuable thing to publish, and is shown as live.
 */
export async function resolveGateSlate(
  deps: ResolveGateSlateDeps = {},
): Promise<GateSlateSource> {
  const isLiveEnabled = deps.isLiveEnabled ?? isLiveGateSlateEnabled;
  const fetchSlate = deps.fetchSlate ?? fetchGateSlate;

  if (!isLiveEnabled()) return illustrativeSource();

  let slate: Awaited<ReturnType<typeof fetchGateSlate>>;
  try {
    slate = await fetchSlate();
  } catch {
    // The error itself is deliberately not surfaced to the reader. A Prisma
    // failure message can carry a host, a database name, or a role, and this is
    // an unauthenticated public page. The reader is told the truth that
    // concerns them — these rows are not live — without being handed
    // infrastructure detail.
    return illustrativeSource(
      "The live slate could not be read on this request, so the illustrative set is shown instead.",
    );
  }

  if (slate === null) {
    return illustrativeSource(
      "No live slate is available in this environment, so the illustrative set is shown instead.",
    );
  }

  if (slate.candidates.rows.length === 0 && slate.candidates.excluded.length === 0) {
    return illustrativeSource(
      "The live slate had no upcoming games to judge, so the illustrative set is shown instead.",
    );
  }

  return {
    mode: "live",
    calibration: slate.calibration,
    candidates: slate.candidates,
    undescribable: slate.undescribable,
  };
}
