/**
 * GSE GALILEO — Bookmaker DNA (Invention 4).
 *
 * Re-exports the tested lead/lag profiler and assembles a per-book behavioral FINGERPRINT
 * across market types: first-mover/follower rates, median lag (minutes), stale-window rate,
 * prop-lag vs side-lag, alt-vs-main lag, a public-shade score, and a confidence weight. No
 * hard-coded opinions — everything is inferred from timestamped movement (the public-shade
 * input is the one externally-supplied signal). Pure.
 */

export * from "../market-physics/book-dna.js";
import type { BookLeadLagProfile } from "../market-physics/book-dna.js";

export interface BookmakerFingerprint {
  readonly book: string;
  readonly firstMoverRate: number;
  readonly followerRate: number;
  readonly medianLagMinutes: number;
  readonly staleWindowRate: number;
  /** median prop lag − median side lag (minutes); + = slower on props. */
  readonly propLagScore: number;
  /** median alt-ladder lag − median main-line lag (minutes); + = slower on alts. */
  readonly altLineLagScore: number;
  /** 0..1 tendency to sit on the public side (externally supplied; 0 if unknown). */
  readonly publicShadeScore: number;
  /** 0 (ignore this book's number) → 1 (trust as price discovery). */
  readonly bookConfidenceWeight: number;
}

const toMin = (msVal: number) => Math.round((msVal / 60_000) * 100) / 100;

/**
 * Build a book's fingerprint from its lead/lag profiles. `sideProfile` and `propProfile`
 * (and optionally `mainProfile`/`altProfile`) are profileBook() outputs for this book in the
 * respective market types. `publicShadeScore` is an optional externally-measured signal.
 */
export function bookmakerFingerprint(args: {
  book: string;
  sideProfile: BookLeadLagProfile;
  propProfile?: BookLeadLagProfile;
  mainProfile?: BookLeadLagProfile;
  altProfile?: BookLeadLagProfile;
  publicShadeScore?: number;
}): BookmakerFingerprint {
  const { book, sideProfile, propProfile, mainProfile, altProfile } = args;
  const firstMoverRate = sideProfile.leadFreq;
  const followerRate = sideProfile.followFreq;
  const staleWindowRate = sideProfile.followFreq + sideProfile.missRate;
  const propLagScore = propProfile ? toMin(propProfile.medianLagMs - sideProfile.medianLagMs) : 0;
  const altLineLagScore = altProfile && mainProfile ? toMin(altProfile.medianLagMs - mainProfile.medianLagMs) : 0;
  // Confidence: leaders with short lag are trustworthy price discovery; followers/missers are not.
  const lagPenalty = Math.min(1, sideProfile.medianLagMs / (5 * 60_000));
  const bookConfidenceWeight = Math.max(0, Math.min(1, firstMoverRate * (1 - 0.5 * lagPenalty) + 0.2 * (1 - staleWindowRate)));
  return {
    book,
    firstMoverRate,
    followerRate,
    medianLagMinutes: toMin(sideProfile.medianLagMs),
    staleWindowRate,
    propLagScore,
    altLineLagScore,
    publicShadeScore: args.publicShadeScore ?? 0,
    bookConfidenceWeight,
  };
}
