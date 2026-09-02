/**
 * Game identity resolution — one contest, one `games` row.
 *
 * Every writer keys the `games` table on `externalId`, and we ingest the SAME
 * contest under three different ids:
 *
 *   a) The Odds API event id (32-hex)            — process-sport.ts upsert
 *   b) TheRundown `event_id`                     — same upsert, failover path
 *   c) `espn:<sportKey>:<espnId>`                — espn-odds-client feed
 *   d) `espn:<short>:<espnId>`                   — espn schedule seed
 *
 * Result: up to three rows per real game, each with its own picks. This module
 * is the single place that answers "is this feed row a game we already have?"
 * BEFORE a new row is created.
 *
 * Precedent: packages/data-ingestion/src/nfl-preseason-map.ts matches a feed row
 * to an existing game by team pair + commence time (18h tolerance). This module
 * generalises that to every sport and every feed, with strictly tighter safety
 * rules, because a WRONG merge (odds attached to the wrong contest) is far worse
 * than a duplicate row. Every ambiguity therefore fails closed → null → today's
 * behaviour (a separate row), never a guess.
 *
 * Pure matching (`findTwinCandidate`) has no I/O and no DB types, so it is unit
 * testable on its own. `resolveCanonicalGame` is the injectable DB wrapper.
 *
 * Kill switch: GAME_IDENTITY_MERGE_DISABLED=true makes `resolveCanonicalGame`
 * a no-op that returns null WITHOUT touching the database, so every caller falls
 * back to exactly the pre-existing upsert-by-externalId behaviour with no deploy.
 */

/**
 * Kickoff clocks differ across feeds (ESPN vs Odds API vs TheRundown), so the
 * same contest can carry times hours apart. Same tolerance as the tested
 * precedent NFL_PRESEASON_COMMENCE_MATCH_MS (18h) — declared locally so this
 * module stays dependency-free and unit-testable in isolation.
 */
export const GAME_IDENTITY_COMMENCE_MATCH_MS = 18 * 60 * 60 * 1000;

/**
 * Shortest normalized name allowed to participate in a city-only PREFIX match.
 * Blocks 2–3 letter abbreviations ("NY", "LAA") from prefix-matching a full name.
 */
export const MIN_PREFIX_MATCH_LENGTH = 4;

/**
 * Normalized city tokens shared by two or more teams inside a single league
 * (MLB Dodgers/Angels, Yankees/Mets, Cubs/White Sox; NBA Lakers/Clippers; NFL
 * Rams/Chargers, Giants/Jets; NHL Rangers/Islanders; MLS LAFC/Galaxy, NYCFC/
 * Red Bulls). A bare city here identifies a LEAGUE, not a team, so it may never
 * prefix-match — not even when only one candidate is on the board, because the
 * one row we happen to have may belong to the OTHER team in that city.
 */
export const AMBIGUOUS_CITY_TOKENS: ReadonlySet<string> = new Set([
  "losangeles",
  "newyork",
  "chicago",
]);

/**
 * Sports whose team names are "City Nickname", where a bare city is a safe
 * prefix of exactly one club (modulo AMBIGUOUS_CITY_TOKENS above).
 *
 * College keys are deliberately ABSENT: "Texas" is a prefix of "Texas Tech",
 * "Miami" of "Miami (OH)", "Washington" of "Washington State" — all DIFFERENT
 * schools that routinely play inside the same 18h window. An unknown/omitted
 * sport key also disables prefix matching (fails closed to exact names only).
 */
export const PREFIX_MATCH_SPORT_KEYS: ReadonlySet<string> = new Set([
  "americanfootball_nfl",
  "basketball_nba",
  "baseball_mlb",
  "icehockey_nhl",
  "soccer_usa_mls",
  "soccer_epl",
]);

/** An existing `games` row, reduced to the fields identity resolution needs. */
export type GameTwinCandidate = {
  readonly id: string;
  readonly externalId: string;
  readonly sportId: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
};

/** The incoming feed row we are about to persist. */
export type GameIdentityProbe = {
  readonly sportId: string;
  readonly externalId: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  /**
   * Odds-API style sport key (e.g. "baseball_mlb"). Optional; when omitted or
   * not in PREFIX_MATCH_SPORT_KEYS, only EXACT normalized names match.
   */
  readonly sportKey?: string;
};

export type GameTwinMatch = {
  readonly candidate: GameTwinCandidate;
  /**
   * "aligned"  — probe home ↔ candidate home (safe to reuse)
   * "flipped"  — probe home ↔ candidate away. Detected (the pair match is
   *              order-insensitive) but NEVER reused by resolveCanonicalGame:
   *              the row's home/away drive settlement and the odds we are about
   *              to write are in the feed's orientation. Merging would grade
   *              picks against a swapped line.
   */
  readonly orientation: "aligned" | "flipped";
  /** True when BOTH sides matched on exact normalized names (no prefix). */
  readonly exact: boolean;
  readonly commenceDeltaMs: number;
};

export type CanonicalGameResolution = {
  readonly game: GameTwinCandidate;
  readonly matchedBy: "externalId" | "twin";
};

/** Minimal structural view of the Prisma client this module needs. */
export type GameIdentityDb = {
  readonly game: {
    findUnique(args: {
      where: { externalId: string };
      select: {
        id: true;
        externalId: true;
        sportId: true;
        homeTeamName: true;
        awayTeamName: true;
        commenceTime: true;
      };
    }): Promise<GameTwinCandidate | null>;
    findMany(args: {
      where: {
        sportId: string;
        commenceTime: { gte: Date; lte: Date };
      };
      select: {
        id: true;
        externalId: true;
        sportId: true;
        homeTeamName: true;
        awayTeamName: true;
        commenceTime: true;
      };
    }): Promise<GameTwinCandidate[]>;
  };
};

const GAME_ROW_SELECT = {
  id: true,
  externalId: true,
  sportId: true,
  homeTeamName: true,
  awayTeamName: true,
  commenceTime: true,
} as const;

/**
 * Same normalization as apps/web/lib/data-sources/score-verification.ts
 * `normalizeTeamToken` — lowercase, strip everything that is not [a-z0-9].
 * Duplicated (not imported) because that module lives in the Next.js app and
 * this package must not depend on it.
 */
export function normalizeGameTeamToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type SideMatch = "exact" | "prefix" | null;

/**
 * One side (home or away) of the pair.
 *
 * exact  — normalized names are identical.
 * prefix — one normalized name is a prefix of the other, which is how a
 *          city-only feed name ("Los Angeles" from TheRundown) meets a full
 *          name ("Los Angeles Dodgers"). Gated three ways: prefix matching must
 *          be enabled for the sport, the shorter token must be ≥
 *          MIN_PREFIX_MATCH_LENGTH, and it must not be a shared-city token.
 */
export function matchTeamSide(
  a: string,
  b: string,
  allowPrefix: boolean,
): SideMatch {
  const na = normalizeGameTeamToken(a);
  const nb = normalizeGameTeamToken(b);
  if (!na || !nb) return null;
  if (na === nb) return "exact";
  if (!allowPrefix) return null;
  const short = na.length <= nb.length ? na : nb;
  const long = na.length <= nb.length ? nb : na;
  if (short.length < MIN_PREFIX_MATCH_LENGTH) return null;
  if (AMBIGUOUS_CITY_TOKENS.has(short)) return null;
  if (!long.startsWith(short)) return null;
  return "prefix";
}

type PairMatch = { orientation: "aligned" | "flipped"; exact: boolean } | null;

function matchTeamPair(
  probe: GameIdentityProbe,
  candidate: GameTwinCandidate,
  allowPrefix: boolean,
): PairMatch {
  const home = matchTeamSide(probe.homeTeamName, candidate.homeTeamName, allowPrefix);
  const away = matchTeamSide(probe.awayTeamName, candidate.awayTeamName, allowPrefix);
  if (home && away) {
    return { orientation: "aligned", exact: home === "exact" && away === "exact" };
  }
  const homeFlipped = matchTeamSide(probe.homeTeamName, candidate.awayTeamName, allowPrefix);
  const awayFlipped = matchTeamSide(probe.awayTeamName, candidate.homeTeamName, allowPrefix);
  if (homeFlipped && awayFlipped) {
    return {
      orientation: "flipped",
      exact: homeFlipped === "exact" && awayFlipped === "exact",
    };
  }
  return null;
}

/** True when GAME_IDENTITY_MERGE_DISABLED is explicitly "true" (default: off). */
export function gameIdentityMergeDisabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return (env["GAME_IDENTITY_MERGE_DISABLED"] ?? "").trim().toLowerCase() === "true";
}

/**
 * Pure twin matcher — no DB, no clock, no env.
 *
 * Rules, in order:
 *  1. Candidate must share the probe's sportId and commence within
 *     GAME_IDENTITY_COMMENCE_MATCH_MS.
 *  2. Team pair must match (order-insensitive; the orientation is reported).
 *  3. EXACT-name matches outrank prefix matches. If any exact match exists,
 *     prefix matches are discarded entirely.
 *  4. Inside the winning tier the NEAREST commence time wins — the honest
 *     tie-break when a real 18h-apart pair exists (MLB night game + next-day
 *     matinee, doubleheaders).
 *  5. Fails closed → null when: two distinct candidates tie on the nearest
 *     commence time, or when the winning tier is PREFIX and more than one
 *     candidate matched (the "Los Angeles" case where the Dodgers and the
 *     Angels both play inside the window). Never guesses.
 */
export function findTwinCandidate(
  candidates: readonly GameTwinCandidate[],
  probe: GameIdentityProbe,
): GameTwinMatch | null {
  const probeMs = probe.commenceTime.getTime();
  if (!Number.isFinite(probeMs)) return null;
  const allowPrefix =
    probe.sportKey != null && PREFIX_MATCH_SPORT_KEYS.has(probe.sportKey);

  const matches: GameTwinMatch[] = [];
  for (const candidate of candidates) {
    if (candidate.sportId !== probe.sportId) continue;
    const candidateMs = candidate.commenceTime.getTime();
    if (!Number.isFinite(candidateMs)) continue;
    const delta = Math.abs(candidateMs - probeMs);
    if (delta > GAME_IDENTITY_COMMENCE_MATCH_MS) continue;
    const pair = matchTeamPair(probe, candidate, allowPrefix);
    if (!pair) continue;
    matches.push({
      candidate,
      orientation: pair.orientation,
      exact: pair.exact,
      commenceDeltaMs: delta,
    });
  }

  if (matches.length === 0) return null;

  const exactMatches = matches.filter((m) => m.exact);
  const tier = exactMatches.length > 0 ? exactMatches : matches;

  // Prefix tier: any ambiguity at all is fatal — a bare city that matches two
  // rows identifies a city, not a team.
  if (exactMatches.length === 0 && tier.length > 1) return null;

  let best = tier[0]!;
  let tied = false;
  for (const match of tier.slice(1)) {
    if (match.commenceDeltaMs < best.commenceDeltaMs) {
      best = match;
      tied = false;
    } else if (match.commenceDeltaMs === best.commenceDeltaMs && match.candidate.id !== best.candidate.id) {
      tied = true;
    }
  }
  if (tied) return null;
  return best;
}

/**
 * Resolve the `games` row a feed row belongs to.
 *
 *  (i)  a row already carries this externalId  → return it ("externalId"),
 *       leaving the caller's existing upsert semantics untouched;
 *  (ii) else an unambiguous twin (same sport, matching team pair, kickoff
 *       within 18h)                            → return it ("twin");
 *  (iii) else                                  → null (caller creates a row).
 *
 * Never throws for a "no match" — but DB errors propagate, so callers wrap it
 * and fall back to the plain upsert. Returns null immediately, without any DB
 * call, when the kill switch is set.
 */
export async function resolveCanonicalGame(
  db: GameIdentityDb,
  probe: GameIdentityProbe,
  options: {
    /** Pre-loaded candidates (skips the window query). Testing / batching. */
    readonly candidates?: readonly GameTwinCandidate[];
    readonly env?: Record<string, string | undefined>;
    readonly logPrefix?: string;
  } = {},
): Promise<CanonicalGameResolution | null> {
  if (gameIdentityMergeDisabled(options.env)) return null;

  const existing = await db.game.findUnique({
    where: { externalId: probe.externalId },
    select: GAME_ROW_SELECT,
  });
  if (existing) return { game: existing, matchedBy: "externalId" };

  const probeMs = probe.commenceTime.getTime();
  if (!Number.isFinite(probeMs)) return null;

  const candidates =
    options.candidates ??
    (await db.game.findMany({
      where: {
        sportId: probe.sportId,
        commenceTime: {
          gte: new Date(probeMs - GAME_IDENTITY_COMMENCE_MATCH_MS),
          lte: new Date(probeMs + GAME_IDENTITY_COMMENCE_MATCH_MS),
        },
      },
      select: GAME_ROW_SELECT,
    }));

  const twin = findTwinCandidate(candidates, probe);
  if (!twin) return null;

  const prefix = options.logPrefix ?? "[game-identity]";
  const sportTag = probe.sportKey ?? probe.sportId;
  if (twin.orientation === "flipped") {
    console.warn(
      `${prefix} orientation conflict — NOT merged: sport=${sportTag} ` +
        `existing=${twin.candidate.externalId} ("${twin.candidate.homeTeamName}" vs "${twin.candidate.awayTeamName}") ` +
        `incoming=${probe.externalId} ("${probe.homeTeamName}" vs "${probe.awayTeamName}")`,
    );
    return null;
  }

  console.info(
    `${prefix} twin reused: sport=${sportTag} ` +
      `canonical=${twin.candidate.externalId} incoming=${probe.externalId} ` +
      `teams="${probe.homeTeamName}" vs "${probe.awayTeamName}" ` +
      `(existing "${twin.candidate.homeTeamName}" vs "${twin.candidate.awayTeamName}", ` +
      `exact=${twin.exact}, deltaMin=${Math.round(twin.commenceDeltaMs / 60000)})`,
  );
  return { game: twin.candidate, matchedBy: "twin" };
}

/**
 * Team-name merge rule for a reused twin: keep the MORE specific name.
 *
 * TheRundown emits city-only names ("Los Angeles", "St. Louis"); ESPN and The
 * Odds API emit full names. A later city-only cycle must never degrade a stored
 * full name, so the longer trimmed string wins and ties keep the stored value.
 */
export function preferLongerTeamName(existing: string, incoming: string): string {
  const a = (existing ?? "").trim();
  const b = (incoming ?? "").trim();
  if (!b) return a;
  if (!a) return b;
  return b.length > a.length ? b : a;
}
