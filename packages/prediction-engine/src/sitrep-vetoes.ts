/**
 * SITREP v1 hard vetoes — GB-2 of the Green Board dispatch.
 *
 * Pure function from a typed SitrepVetoInput (already-computed pipeline
 * fields) to { flags, provenance }. Each flag is a HARD VETO for the
 * green-board predicate (GB-1): if a flag is present, the pick cannot
 * be on the board regardless of how high its calibrated p.
 *
 * The four v1 flags are the "situation vetoes" — the catch-22 of
 * "we have a high-confidence model pick BUT the situation says no":
 *
 *   - REST_DEFICIT       rest differential at or below minus 2 days
 *   - QB_OUT             starting QB listed out or doubtful on the
 *                        official injury report
 *   - HIGH_WIND_TOTAL    wind above 20 mph AND the pick is a TOTAL
 *   - REVERSE_LINE_MOVE  line moved opposite the price-implied
 *                        direction between OPEN and latest snapshot
 *
 * Absent data = no flag (honest miss), never a guess. Each flag's
 * provenance string explains which input field was read and what value
 * triggered the veto, so GB-5 can render "why was I vetoed" honestly.
 *
 * v1 limits (intentional, do NOT silently extend):
 *   - REST_DEFICIT is measured in CALENDAR DAYS between the picked
 *     team's last game and the upcoming game vs. the opponent's last
 *     game. It is NOT the restAdvantageScore from game-context.ts.
 *   - HIGH_WIND_TOTAL is a hard cutoff at 20 mph. A pick on a SPREAD
 *     or MONEYLINE with the same wind does NOT fire.
 *   - REVERSE_LINE_MOVE compares opening vs latest snapshot for the
 *     pick's own market only. If only one snapshot exists, no flag.
 *
 * v2 candidates (gated behind real data paths; see REPO BLOCK notes):
 *   - QB_OUT requires a live injuries feed; today the data exists in
 *     the nflverse injuries table but is NOT joined to picks on
 *     pre-game public read.
 */

export const REST_DEFICIT_DAYS = 2;            // picked team >= 2 days fewer than opponent
export const HIGH_WIND_MPH = 20;               // open-air venue wind threshold for totals
export const REVERSE_LINE_MOVE_MIN_PTS = 0.5;  // minimum |movement| in points to count

/**
 * Canonical v1 flag names. Exported so the green-board predicate (GB-1)
 * and the public renderer (GB-5) can build exhaustive switch statements
 * over the closed set. v2 additions are a separate constant.
 */
export const SITREP_V1_FLAGS = [
  "REST_DEFICIT",
  "QB_OUT",
  "HIGH_WIND_TOTAL",
  "REVERSE_LINE_MOVE",
] as const;
export type SitrepV1Flag = (typeof SITREP_V1_FLAGS)[number];

/**
 * Pick market type. Same vocabulary as the rest of the engine. SPREAD
 * and MONEYLINE picks are not subject to HIGH_WIND_TOTAL by design —
 * wind does not bend a spread the way it bends a total.
 */
export type SitrepMarket = "SPREAD" | "TOTAL" | "MONEYLINE";

/**
 * SitrepVetoInput — the read-side input the SITREP v1 function needs.
 * All fields are explicit. ABSENT DATA is signaled by `null`, NEVER by
 * omitting the field or passing `undefined`; this keeps the type closed
 * and the absent-data cases mechanical.
 *
 * Field provenance (where GB-3 should source each from):
 *   - market          : Pick.market (Prisma)
 *   - pickedSide      : Pick.pickedSide (Prisma)
 *   - restDaysPicked  : Game.restDaysHome or Game.restDaysAway
 *                      (selected by pickedSide)
 *   - restDaysOpponent: the other side's rest days
 *   - startingQbOut   : a derived signal from the injuries table.
 *                      Today this is null on the read-side because
 *                      the join isn't wired. A truthy value MUST come
 *                      from a real injury row, never a heuristic.
 *   - windMph         : GameWeatherForecast.windMph (open-meteo feed)
 *   - openingLine     : first snapshot for the pick's market from
 *                      the OddsLineSnapshot table. null if only one
 *                      snapshot has been captured.
 *   - latestLine      : latest pre-game-start snapshot for the
 *                      pick's market. null if only one snapshot.
 *
 * Read-side mapping note (GB-3): the resolver populates this input
 * from the same fields the calibration resolver uses, so the green
 * predicate sees the SAME probability and the SAME line snapshots the
 * published pick card shows. Drift between "what the board filters on"
 * and "what the public card shows" is a trust violation.
 */
export interface SitrepVetoInput {
  readonly market: SitrepMarket;
  readonly pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER";
  readonly restDaysPicked: number | null;
  readonly restDaysOpponent: number | null;
  readonly startingQbOut: boolean | null;
  readonly windMph: number | null;
  readonly openingLine: number | null;
  readonly latestLine: number | null;
}

/**
 * SitrepVetoResult — the output of the v1 function.
 *   - flags[]       : every v1 flag that fired (closed-set strings)
 *   - provenance[]  : parallel array of human-readable explanations,
 *                     one per flag, in the same order. The public
 *                     renderer shows these verbatim; the retro (GB-4)
 *                     logs them as audit trail.
 */
export interface SitrepVetoResult {
  readonly flags: readonly SitrepV1Flag[];
  readonly provenance: readonly string[];
}

/**
 * computeSitrepVetoes — pure v1 function. GB-2.
 *
 * Read the file header for the closed-set contract. Never throws on
 * input shape (silent honest-miss is the policy). Throws only on
 * truly malformed numbers (NaN, +Infinity, -Infinity in fields the
 * dispatch requires to be finite), because those indicate a bug in
 * the resolver that produced the input, not a real game state.
 */
export function computeSitrepVetoes(input: SitrepVetoInput): SitrepVetoResult {
  const flags: SitrepV1Flag[] = [];
  const provenance: string[] = [];

  // ── G1 REST_DEFICIT ──────────────────────────────────────
  // Picked team has >= REST_DEFICIT_DAYS (2) fewer rest days than
  // the opponent. Direction: restDaysPicked - restDaysOpponent. A
  // negative value means the picked team is on shorter rest. We
  // fire when that gap is at or below -2 days.
  if (
    input.restDaysPicked !== null &&
    input.restDaysOpponent !== null &&
    isFiniteDays(input.restDaysPicked) &&
    isFiniteDays(input.restDaysOpponent)
  ) {
    const diff = input.restDaysPicked - input.restDaysOpponent;
    if (diff <= -REST_DEFICIT_DAYS) {
      flags.push("REST_DEFICIT");
      provenance.push(
        `picked team ${input.restDaysPicked}d rest vs opponent ${input.restDaysOpponent}d (diff=${diff}d, threshold=-${REST_DEFICIT_DAYS}d)`,
      );
    }
  }

  // ── G2 QB_OUT ─────────────────────────────────────────────
  // Starting QB listed out or doubtful on the official injury
  // report. The read-side resolver must produce a real boolean
  // here, never a guess; null means data not joined yet, which is
  // the common case until the injuries feed is wired to pre-game
  // public reads.
  if (input.startingQbOut === true) {
    flags.push("QB_OUT");
    provenance.push("starting QB listed out or doubtful on injury report");
  }

  // ── G3 HIGH_WIND_TOTAL ────────────────────────────────────
  // Wind above HIGH_WIND_MPH (20) AND the pick is a TOTAL. SPREAD
  // and MONEYLINE picks with the same wind do NOT fire — the veto
  // is intentionally narrow because the wind effect on a total is
  // the one the literature consistently supports.
  if (
    input.market === "TOTAL" &&
    input.windMph !== null &&
    isFiniteWind(input.windMph) &&
    input.windMph > HIGH_WIND_MPH
  ) {
    flags.push("HIGH_WIND_TOTAL");
    provenance.push(
      `wind=${input.windMph}mph > ${HIGH_WIND_MPH}mph on ${input.market} pick (venue open-air)`,
    );
  }

  // ── G4 REVERSE_LINE_MOVE ──────────────────────────────────
  // Line moved opposite the price-implied direction between OPEN
  // and latest snapshot. For TOTALs: opening below latest and we
  // pick UNDER means the total steamed UP, which fades the UNDER
  // pick. For SPREADs: opening less negative than latest and we
  // pick the now-favorite (line steamed further toward them) means
  // we are on the same side as the steam — NOT a reverse. The
  // "reverse" case is the OPPOSITE: line moved away from the pick.
  //
  // Minimum movement REVERSE_LINE_MOVE_MIN_PTS (0.5) to count;
  // sub-half-point noise is the kind of thing the market does
  // every minute and would produce a false fire on every pick.
  if (
    input.openingLine !== null &&
    input.latestLine !== null &&
    isFiniteLine(input.openingLine) &&
    isFiniteLine(input.latestLine)
  ) {
    const move = input.latestLine - input.openingLine;
    if (Math.abs(move) >= REVERSE_LINE_MOVE_MIN_PTS) {
      const reverse = isReverseLineMove(input.market, input.pickedSide, move);
      if (reverse) {
        flags.push("REVERSE_LINE_MOVE");
        provenance.push(
          `${input.market} line moved ${move > 0 ? "up" : "down"} ${Math.abs(move).toFixed(1)}pts from open; opposite to ${input.pickedSide} pick`,
        );
      }
    }
  }

  return { flags, provenance };
}

/**
 * Decide whether a line move in the given direction is "reverse" for
 * the given pick. The test:
 *
 *   TOTAL OVER   + open<latest  ⇒ reverse (total steamed up, fade the OVER)
 *   TOTAL UNDER  + open>latest  ⇒ reverse (total steamed down, fade the UNDER)
 *   SPREAD HOME  + open<latest  ⇒ reverse (home became less of a favorite, fade HOME)
 *   SPREAD AWAY  + open>latest  ⇒ reverse (away became less of a favorite, fade AWAY)
 *   MONEYLINE    ⇒ never fires in v1; the public MONEYLINE odds are
 *                  not a clean "line" and the reverse-move concept
 *                  doesn't transfer cleanly to a price. The dispatch
 *                  listed REVERSE_LINE_MOVE without market-scoping;
 *                  v1 scopes to SPREAD + TOTAL only. v2 may add a
 *                  dedicated ML handling.
 */
function isReverseLineMove(
  market: SitrepMarket,
  pickedSide: "HOME" | "AWAY" | "OVER" | "UNDER",
  move: number,
): boolean {
  if (market === "TOTAL") {
    if (pickedSide === "OVER") return move > 0;
    if (pickedSide === "UNDER") return move < 0;
    return false;
  }
  if (market === "SPREAD") {
    // SPREAD convention (American): home spread is negative when home is
    // favored. So a signed value going UP (toward zero) means home became
    // LESS of a favorite. A signed value going DOWN (more negative) means
    // home became MORE of a favorite.
    //
    // Reverse for HOME = home became less of a favorite = move > 0
    // Reverse for AWAY = away became less of a favorite. The away line
    // is the negation of the home line in the convention we use, so an
    // away-spread move "up" (toward zero) corresponds to a HOME-spread
    // move "down" (more negative). Equivalently: reverse for AWAY =
    // home-spread move < 0.
    if (pickedSide === "HOME") return move > 0;
    if (pickedSide === "AWAY") return move < 0;
    return false;
  }
  return false;
}

// ── Input-validation helpers (silent on absent, strict on malformed) ──

function isFiniteDays(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function isFiniteWind(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

function isFiniteLine(n: number): boolean {
  return Number.isFinite(n);
}
