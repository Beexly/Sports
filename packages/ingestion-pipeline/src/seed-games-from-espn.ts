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
  const horizonHours = opts?.horizonHours ?? 168;
  const horizon = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);

  const { games, errors } = await fetchAllEspnSeedGames({
    fetchImpl: opts?.fetchImpl,
    shorts: opts?.shorts,
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
      for (const g of list) {
        try {
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
