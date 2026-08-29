/**
 * Upsert upcoming Game rows from free ESPN scoreboards.
 * Unblocks generateSignalSlate when Odds/Rundown keys are ABSENT and Game is empty.
 * Never invents odds, ROI, or PROVEN.
 */

import { db } from "@sports/db";
import {
  fetchAllEspnSeedGames,
  matchGameByTeamsAndTime,
  type EspnSeedGame,
  type GameIdentityCandidate,
  type ShortSportKey,
} from "@sports/data-ingestion";

/**
 * Cross-source commence tolerance for game-identity dedup (same contest,
 * different feed clocks). Doubleheaders are protected by the matcher's
 * ambiguity guard: two candidates at similar deltas → no dedup, row created.
 */
const SEED_DEDUP_COMMENCE_MATCH_MS = 18 * 60 * 60 * 1000;

export type SeedGamesFromEspnResult = {
  readonly ok: boolean;
  readonly fetched: number;
  readonly upcoming: number;
  readonly upserted: number;
  /** Seed rows skipped because the same physical game already exists under another externalId convention. */
  readonly deduped: number;
  readonly skippedPast: number;
  readonly errors: readonly string[];
  readonly note: string;
};

function isUpcoming(g: EspnSeedGame, now: Date, horizon: Date): boolean {
  if (g.state === "post") return false;
  const t = g.commenceTime.getTime();
  return t >= now.getTime() - 3 * 60 * 60 * 1000 && t <= horizon.getTime();
}

/**
 * Seed Game + Sport from free ESPN. Idempotent on externalId `espn:{sport}:{id}`.
 */
export async function seedGamesFromEspn(opts?: {
  readonly horizonHours?: number;
  readonly logPrefix?: string;
  readonly now?: Date;
  readonly shorts?: readonly ShortSportKey[];
  readonly fetchImpl?: typeof fetch;
}): Promise<SeedGamesFromEspnResult> {
  const logPrefix = opts?.logPrefix ?? "[espn-seed]";
  const now = opts?.now ?? new Date();
  const horizonHours = opts?.horizonHours ?? 504; // 21d — early CFB/NFL weeks
  const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);

  const { games, errors } = await fetchAllEspnSeedGames({
    fetchImpl: opts?.fetchImpl,
    shorts: opts?.shorts,
    now,
    horizonDays: Math.ceil(horizonHours / 24),
  });

  const upcoming = games.filter((g) => isUpcoming(g, now, horizon));
  let upserted = 0;
  let deduped = 0;
  const writeErrors = [...errors];

  // Group by sport key for sport upsert once each.
  const bySport = new Map<string, EspnSeedGame[]>();
  for (const g of upcoming) {
    const list = bySport.get(g.sportKey) ?? [];
    list.push(g);
    bySport.set(g.sportKey, list);
  }

  for (const [sportKey, list] of bySport) {
    const sample = list[0]!;
    try {
      const sportRecord = await db.sport.upsert({
        where: { key: sportKey },
        create: {
          key: sportKey,
          name: sample.sportName,
          displayName: sample.sportDisplayName,
        },
        update: {},
      });

      // Game-identity dedup: the same physical game may already exist under a
      // different externalId convention (The Odds API / TheRundown hash, or
      // `espn:{canonicalKey}:{id}` from the ESPN odds fallback). Creating an
      // `espn:{short}:{id}` sibling strands any picks it collects — the paid
      // settlement path matches scores by externalId only and can never reach
      // it. Load the sport's existing rows once and match before creating.
      const existingRows = await db.game.findMany({
        where: {
          sportId: sportRecord.id,
          commenceTime: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            lte: horizon,
          },
        },
        select: {
          externalId: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
        },
      });
      const candidateIds = new Set(existingRows.map((r) => r.externalId));
      const candidates: GameIdentityCandidate[] = existingRows.map((r) => ({
        externalId: r.externalId,
        homeTeam: r.homeTeamName,
        awayTeam: r.awayTeamName,
        commenceTimeMs: r.commenceTime.getTime(),
      }));

      for (const g of list) {
        try {
          if (!candidateIds.has(g.externalId)) {
            // Same ESPN event already stored under the canonical-key
            // convention (`espn:baseball_mlb:401816675` vs `espn:mlb:401816675`)?
            const espnEventId = g.externalId.split(":").pop() ?? "";
            const canonicalSibling = `espn:${g.sportKey}:${espnEventId}`;
            if (candidateIds.has(canonicalSibling)) {
              deduped += 1;
              continue;
            }
            // Same physical game under any other convention (team + time match)?
            const match = matchGameByTeamsAndTime(
              candidates,
              {
                homeTeam: g.homeTeamName,
                awayTeam: g.awayTeamName,
                commenceTimeMs: g.commenceTime.getTime(),
              },
              SEED_DEDUP_COMMENCE_MATCH_MS,
            );
            if (match) {
              deduped += 1;
              continue;
            }
          }
          await db.game.upsert({
            where: { externalId: g.externalId },
            create: {
              externalId: g.externalId,
              sportId: sportRecord.id,
              homeTeamName: g.homeTeamName,
              awayTeamName: g.awayTeamName,
              commenceTime: g.commenceTime,
            },
            update: {
              homeTeamName: g.homeTeamName,
              awayTeamName: g.awayTeamName,
              commenceTime: g.commenceTime,
            },
          });
          upserted += 1;
          if (!candidateIds.has(g.externalId)) {
            candidateIds.add(g.externalId);
            candidates.push({
              externalId: g.externalId,
              homeTeam: g.homeTeamName,
              awayTeam: g.awayTeamName,
              commenceTimeMs: g.commenceTime.getTime(),
            });
          }
        } catch (err) {
          writeErrors.push(
            `${g.externalId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      writeErrors.push(
        `sport ${sportKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const skippedPast = games.length - upcoming.length;
  const note =
    `espn seed fetched=${games.length} upcoming=${upcoming.length} ` +
    `upserted=${upserted} deduped=${deduped} skippedPast=${skippedPast}`;
  console.log(`${logPrefix} ${note}`);
  return {
    ok: upserted > 0 || deduped > 0 || (upcoming.length === 0 && writeErrors.length === 0),
    fetched: games.length,
    upcoming: upcoming.length,
    upserted,
    deduped,
    skippedPast,
    errors: writeErrors,
    note,
  };
}
