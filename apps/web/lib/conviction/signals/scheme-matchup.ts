/**
 * SCHEME MATCHUP — does the offence/defence matchup back the side we took?
 *
 * WIRED BUT INERT TODAY. This signal returns `null` on every candidate until
 * the coverage-split data actually exists AND a caller constructs it with
 * `live: true`. As of this writing `/api/health` reports `nflverse-reports`
 * UNAVAILABLE ("nflverse hard assets unreachable"), so there is nothing real to
 * read and the signal is a no-op: it cannot hold a pick and it cannot publish
 * one.
 *
 * INTENDED SOURCE, NAMED EXACTLY.
 *   - Primary: **nflverse play-by-play** (the weekly `load_pbp` release assets
 *     already used elsewhere in this repo). Fields needed, per team offence:
 *     plays faced by defensive look, and the offence's success rate on them —
 *     i.e. for each of {man coverage, zone coverage, light box (<= 6 in the
 *     box), stacked box (>= 8 in the box)} a `rate` plus the `sampleSize` of
 *     plays it was computed on. nflverse pbp carries box counts and a coverage
 *     indicator on a subset of plays; the sample size field exists because that
 *     subset is NOT every play and a rate computed on a handful of snaps must
 *     not be allowed to vote.
 *   - Supplement: **Next Gen Stats** would be required for the coverage splits
 *     at full coverage (AGENTS.md scraping queue item 5: "supplement with Next
 *     Gen Stats if the license clears"). The licence has not cleared. Until it
 *     does, man/zone rates may only come from what nflverse publishes, and
 *     anything nflverse does not publish stays `null`.
 *
 * WHAT IT MAY NEVER DO (gate-contract.ts):
 *   - It may only help WITHHOLD publication. It never adds conviction, never
 *     changes a selection, a line, a probability or MODEL_VERSION.
 *   - It NEVER estimates a missing value. A rate we did not read is `null`, not
 *     a league average, not the other team's rate, not 0.50. A rate computed on
 *     fewer than MIN_SAMPLE_PLAYS snaps does not vote at all.
 *   - `null` from this signal means "no real data", never agreement.
 *
 * WHAT TURNS IT LIVE (both):
 *   1. nflverse hard assets reachable again (`/api/health` `nflverse-reports`
 *      healthy) and a loader that computes the four rates with their real
 *      sample sizes per team.
 *   2. A caller constructs this signal with `live: true` and injects that
 *      loader. No network and no database access lives in this module.
 */

import type { GateCandidate, SignalFn, SignalRead } from "../gate-contract";

/**
 * One rate and the sample it was computed on. `rate` is `number | null`
 * because an unmeasured split is absent, not zero. `sampleSize` is the number
 * of plays behind the rate and is required even when the rate is null, so a
 * reader can tell "we saw 12 snaps" from "we saw none".
 */
export type SchemeRate = {
  /** Offensive success rate against this look, 0-1. Null when unmeasured. */
  readonly rate: number | null;
  /** Plays the rate was computed on. */
  readonly sampleSize: number;
};

/** One team's offensive profile against the four defensive looks. */
export type TeamSchemeProfile = {
  readonly team: string;
  readonly vsMan: SchemeRate;
  readonly vsZone: SchemeRate;
  readonly vsLightBox: SchemeRate;
  readonly vsStackedBox: SchemeRate;
};

/** Both teams' profiles for one game, with provenance and an as-of stamp. */
export type MatchupProfile = {
  readonly gameId: string;
  readonly home: TeamSchemeProfile;
  readonly away: TeamSchemeProfile;
  /** Real source name, e.g. "nflverse play-by-play". Never a placeholder. */
  readonly source: string;
  /** When the underlying data was last rebuilt. Freshness is checked against it. */
  readonly asOf: Date;
};

export type SchemeMatchupDeps = {
  /** Injected loader. No network, no database inside this module. */
  readonly loadMatchup: (gameId: string) => Promise<MatchupProfile | null>;
  /** Injected clock — never `Date.now()` inside this module, so it is testable. */
  readonly now: () => Date;
  /**
   * FALSE by default. nflverse hard assets are currently unreachable, so there
   * is nothing honest to read and the signal returns null unconditionally.
   */
  readonly live?: boolean;
  /** Override the freshness window. Defaults to MAX_PROFILE_AGE_MS. */
  readonly maxAgeMs?: number;
};

/**
 * Minimum plays behind a rate before it may vote.
 *
 * At a success rate near 0.45 the standard error on 100 plays is
 * sqrt(0.45 * 0.55 / 100) = 0.0497, i.e. about five points; on 25 plays it is
 * about ten points, wider than any gap we would call decisive. 100 is the point
 * at which a single team's rate is a measurement rather than a rumour. A rate
 * below this sample is dropped entirely — not down-weighted, not averaged in.
 */
export const MIN_SAMPLE_PLAYS = 100;

/**
 * How far apart the two offences' rates must be, in the same dimension, before
 * the matchup is called for a side.
 *
 * The standard error of the DIFFERENCE of two rates at the minimum sample is
 * about sqrt(2) * 0.0497 = 0.070, so 0.08 is roughly 1.1 standard errors. That
 * is deliberately NOT a significance test: this gate can only withhold, so a
 * band that is slightly loose costs us picks we would have published and never
 * publishes one we would not have. A tighter band would buy precision we cannot
 * spend.
 */
export const CLEAR_EDGE = 0.08;

/**
 * Freshness window. nflverse rebuilds its play-by-play weekly, so a profile
 * older than eight days has missed a full game week for both teams — the exact
 * week whose scheme changes we would be betting into. Past this the signal
 * returns null rather than voting on last week's league.
 */
export const MAX_PROFILE_AGE_MS = 8 * 24 * 60 * 60 * 1000;

type DimensionKey = "vsMan" | "vsZone" | "vsLightBox" | "vsStackedBox";

const DIMENSIONS: readonly { readonly key: DimensionKey; readonly label: string }[] = [
  { key: "vsMan", label: "man coverage" },
  { key: "vsZone", label: "zone coverage" },
  { key: "vsLightBox", label: "a light box" },
  { key: "vsStackedBox", label: "a stacked box" },
];

function usableRate(entry: SchemeRate): number | null {
  if (entry.rate === null) return null;
  if (!Number.isFinite(entry.rate)) return null;
  if (entry.sampleSize < MIN_SAMPLE_PLAYS) return null;
  return entry.rate;
}

function normaliseTeam(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamMatches(a: string, b: string): boolean {
  const x = normaliseTeam(a);
  const y = normaliseTeam(b);
  if (x.length === 0 || y.length === 0) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function points(value: number): string {
  return `${(value * 100).toFixed(1)} points`;
}

function read(
  verdict: SignalRead["verdict"],
  reason: string,
  basis: string,
  completeness: number,
): SignalRead {
  return { key: "scheme-matchup", verdict, reason, basis, completeness };
}

/**
 * Build the scheme-matchup signal.
 *
 * Returns null (no vote) when: not live, no profile, the profile is stale past
 * the freshness window, the team names do not line up with the candidate, the
 * engine's side is unknown, the pick is a TOTAL (see below), or no dimension
 * has an adequately-sampled rate on BOTH teams.
 *
 * TOTAL returns null on purpose. A total asks about an absolute scoring level,
 * and this profile carries only the two teams' own rates — there is no league
 * baseline in it to compare them against. Inventing one would be exactly the
 * estimate this module forbids, so the signal declines to vote.
 */
export function createSchemeMatchupSignal(deps: SchemeMatchupDeps): SignalFn {
  const live = deps.live ?? false;
  const maxAgeMs = deps.maxAgeMs ?? MAX_PROFILE_AGE_MS;

  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    // Hard honesty gate. nflverse hard assets are unreachable; until they are
    // back and a caller opts in, this signal says nothing at all.
    if (!live) return null;

    if (candidate.pickType === "TOTAL") return null;
    if (candidate.side !== "home" && candidate.side !== "away") return null;

    const profile = await deps.loadMatchup(candidate.gameId);
    if (profile === null) return null;

    const ageMs = deps.now().getTime() - profile.asOf.getTime();
    if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) return null;

    const homeMatches = teamMatches(profile.home.team, candidate.homeTeamName);
    const awayMatches = teamMatches(profile.away.team, candidate.awayTeamName);
    if (!homeMatches || !awayMatches) return null;

    const ourProfile = candidate.side === "home" ? profile.home : profile.away;
    const theirProfile = candidate.side === "home" ? profile.away : profile.home;

    const compared: { label: string; gap: number }[] = [];
    for (const dimension of DIMENSIONS) {
      const ours = usableRate(ourProfile[dimension.key]);
      const theirs = usableRate(theirProfile[dimension.key]);
      if (ours === null || theirs === null) continue;
      compared.push({ label: dimension.label, gap: ours - theirs });
    }

    if (compared.length === 0) return null;

    const meanGap = compared.reduce((sum, d) => sum + d.gap, 0) / compared.length;
    const completeness = compared.length / DIMENSIONS.length;
    const basis = `${profile.source} (${compared.length} of ${DIMENSIONS.length} scheme splits with at least ${MIN_SAMPLE_PLAYS} plays on both teams)`;
    const dimensionList = compared.map((d) => d.label).join(", ");

    if (meanGap >= CLEAR_EDGE) {
      return read(
        "CONFIRMS",
        `${ourProfile.team} moves the ball better than ${theirProfile.team} against the looks this matchup produces — ${points(meanGap)} better on average across ${dimensionList}.`,
        basis,
        completeness,
      );
    }

    if (meanGap <= -CLEAR_EDGE) {
      return read(
        "CONTRADICTS",
        `${theirProfile.team} moves the ball better than ${ourProfile.team} against the looks this matchup produces — ${points(-meanGap)} better on average across ${dimensionList}, which cuts against our side.`,
        basis,
        completeness,
      );
    }

    return read(
      "NEUTRAL",
      `The two offences handle these looks about the same (${points(Math.abs(meanGap))} apart across ${dimensionList}), so the matchup does not lean either way.`,
      basis,
      completeness,
    );
  };
}
