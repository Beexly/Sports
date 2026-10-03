/**
 * Market Memory Engine — what the market DID, measured carefully over time.
 *
 * Tracks a line's journey (open → lock → current → close), how much it moved in our
 * favor, its velocity, and book disagreement. It is measurement, not narrative: it
 * NEVER calls movement "sharp money" unless a genuine, sourced sharp/public split is
 * provided — the banned-language discipline applied to market behavior. Pure, no I/O.
 *
 * Orientation: the caller passes `betterForUsIsLower` (e.g. for a spread/total we took,
 * a lower closing line is favorable), so every "favorable" number is oriented to the
 * side we actually took rather than to home/away.
 */

export interface MarketMemoryInput {
  readonly openLine: number;
  readonly lockLine: number; // the line we locked at when the pick was made
  readonly currentLine: number;
  readonly closeLine?: number | null; // null until close
  /** True when a LOWER line is better for the side we took. */
  readonly betterForUsIsLower: boolean;
  /** Optional ordered snapshots (oldest→newest) for velocity. */
  readonly snapshots?: ReadonlyArray<{ readonly atIso: string; readonly line: number }>;
  /** Max−min line across books at the latest read. */
  readonly bookDisagreementPoints?: number;
  /** Only true with a genuine, sourced sharp/public split — gates "sharp" language. */
  readonly sharpSplitSourced?: boolean;
}

export interface MarketMemory {
  /** Favorable points open→close (+ = market moved to our side). Null until close. */
  readonly openToCloseFavorable: number | null;
  readonly openToLockFavorable: number;
  readonly lockToCurrentFavorable: number;
  /** Whether the line has moved in our favor since we locked. */
  readonly favorableSinceLock: boolean;
  /** CLV in points: favorable move lock→close (+ = we beat the close). Null until close. */
  readonly clvVsCloseFavorable: number | null;
  /** Favorable points per hour over the snapshot window. Null without ≥2 timed snapshots. */
  readonly velocityFavorablePerHour: number | null;
  readonly bookDisagreementPoints: number;
  /** Whether "sharp"/"public split" language is permitted (only when sourced). */
  readonly mayUseSharpLanguage: boolean;
  readonly note: string;
}

function round(v: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Favorable points moving from `from` to `to`, oriented to the side we took. */
function fav(from: number, to: number, betterForUsIsLower: boolean): number {
  return betterForUsIsLower ? from - to : to - from;
}

export function buildMarketMemory(input: MarketMemoryInput): MarketMemory {
  const lower = input.betterForUsIsLower;

  const openToLockFavorable = round(fav(input.openLine, input.lockLine, lower));
  const lockToCurrentFavorable = round(fav(input.lockLine, input.currentLine, lower));
  const openToCloseFavorable =
    input.closeLine != null ? round(fav(input.openLine, input.closeLine, lower)) : null;
  const clvVsCloseFavorable =
    input.closeLine != null ? round(fav(input.lockLine, input.closeLine, lower)) : null;

  let velocityFavorablePerHour: number | null = null;
  const snaps = input.snapshots ?? [];
  if (snaps.length >= 2) {
    const first = snaps[0]!;
    const last = snaps[snaps.length - 1]!;
    const hours = (Date.parse(last.atIso) - Date.parse(first.atIso)) / 3_600_000;
    if (Number.isFinite(hours) && hours > 0) {
      velocityFavorablePerHour = round(fav(first.line, last.line, lower) / hours);
    }
  }

  const bookDisagreementPoints = round(Math.max(0, input.bookDisagreementPoints ?? 0));
  const mayUseSharpLanguage = input.sharpSplitSourced === true;

  const favorableSinceLock = lockToCurrentFavorable > 0;
  const clvWord =
    clvVsCloseFavorable == null
      ? "the close isn't in yet"
      : clvVsCloseFavorable > 0
        ? `the market moved ${clvVsCloseFavorable} pts toward your side by close`
        : clvVsCloseFavorable < 0
          ? `the market moved ${Math.abs(clvVsCloseFavorable)} pts against your side by close`
          : "the market closed where you locked";

  const note =
    `Since you locked, the line moved ${Math.abs(lockToCurrentFavorable)} pts ` +
    `${favorableSinceLock ? "in your favor" : lockToCurrentFavorable < 0 ? "against you" : "not at all"}; ${clvWord}.` +
    (mayUseSharpLanguage ? "" : " (Market behavior only, not attributed to sharp/public money.)");

  return {
    openToCloseFavorable,
    openToLockFavorable,
    lockToCurrentFavorable,
    favorableSinceLock,
    clvVsCloseFavorable,
    velocityFavorablePerHour,
    bookDisagreementPoints,
    mayUseSharpLanguage,
    note,
  };
}
