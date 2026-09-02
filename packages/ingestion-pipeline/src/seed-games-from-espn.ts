/**
 * Upsert upcoming Game rows from free ESPN scoreboards.
 * Unblocks generateSignalSlate when Odds/Rundown keys are ABSENT and Game is empty.
 * Never invents odds, ROI, or PROVEN.
 */

import { db } from "@sports/db";
import {
  fetchAllEspnSeedGames,
  type EspnSeedGame,
  type ShortSportKey,
} from "@sports/data-ingestion";
import {
  resolveCanonicalGame,
  preferLongerTeamName,
  type GameIdentityDb,
} from "./game-identity.js";

export type SeedGamesFromEspnResult = {
  readonly ok: boolean;
  readonly fetched: number;
  readonly upcoming: number;
  readonly upserted: number;
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
      // This seed writes `espn:<short>:<id>` while espn-odds-client writes
      // `espn:<sportKey>:<id>` and the paid path writes the Odds API id — three
      // ids for one contest. Reuse the row we already have when identity proves
      // it is the same game; a twin is claimed at most once per run.
      const claimedTwinIds = new Set<string>();
      for (const g of list) {
        try {
          let twin: { id: string; homeTeamName: string; awayTeamName: string } | null = null;
          try {
            const resolved = await resolveCanonicalGame(db as unknown as GameIdentityDb, {
              sportId: sportRecord.id,
              sportKey: g.sportKey,
              externalId: g.externalId,
              homeTeamName: g.homeTeamName,
              awayTeamName: g.awayTeamName,
              commenceTime: g.commenceTime,
            });
            if (
              resolved &&
              resolved.matchedBy === "twin" &&
              !claimedTwinIds.has(resolved.game.id)
            ) {
              twin = resolved.game;
            }
          } catch (identityErr) {
            // Fall back to the original upsert-by-externalId behaviour.
            console.warn(
              `${logPrefix} identity lookup failed for ${g.externalId}: ` +
                `${identityErr instanceof Error ? identityErr.message : identityErr}`,
            );
          }

          if (twin) {
            claimedTwinIds.add(twin.id);
            await db.game.update({
              where: { id: twin.id },
              // ESPN display names are the most specific we get — but never
              // shorten a stored name that is already longer.
              data: {
                homeTeamName: preferLongerTeamName(twin.homeTeamName, g.homeTeamName),
                awayTeamName: preferLongerTeamName(twin.awayTeamName, g.awayTeamName),
                commenceTime: g.commenceTime,
              },
            });
          } else {
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
          }
          upserted += 1;
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
    `upserted=${upserted} skippedPast=${skippedPast}`;
  console.log(`${logPrefix} ${note}`);
  return {
    ok: upserted > 0 || (upcoming.length === 0 && writeErrors.length === 0),
    fetched: games.length,
    upcoming: upcoming.length,
    upserted,
    skippedPast,
    errors: writeErrors,
    note,
  };
}
