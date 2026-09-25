import { db, type Prisma } from "@sports/db";
import {
  NGS_FEATURE_CATEGORY,
  NGS_FEATURE_KEYS,
  NGS_FEATURE_SOURCE,
  NGS_SIGNAL_WEEK,
  NGS_TEAM_SIGNAL_KEY,
  NGS_TEAM_WEIGHT,
  NGS_TEAM_CONFIDENCE,
  normalizeNgsFeatures,
  ngsTeamScore,
  hasNgsTeamValue,
  type NgsFeatureInput,
  type NgsTeamFeatureInput,
} from "@sports/types";

/**
 * Durable NGS -> universal Signal bridge.
 *
 * Reads only the already-ingested, rights-stamped NextGenStat rows. The writer
 * keeps the latest row for each player/statType, merges the passing, receiving,
 * and rushing fields for that player, then writes one normalized, idempotent
 * Signal row per available feature. Week 0 is read on its own so a bounded
 * weekly query cannot omit the season aggregate. Each player is then read
 * from one source week; each team is read from one shared week (week 0 when
 * present, else the latest available week). Team rows are arithmetic means
 * across the team's players, never a first-row shortcut. The season's NGS
 * key set is replaced atomically in one explicitly bounded transaction, so a
 * failed write cannot leave a partial generation. No network access occurs
 * here.
 */

const MAX_ROWS = 100_000;

type NgsDbRow = {
  gsisId: string;
  team: string | null;
  season: number;
  week: number;
  seasonType: string;
  statType: string;
  cpoe: number | null;
  avgTimeToThrow: number | null;
  avgSeparation: number | null;
  avgYacAboveExpectation: number | null;
  rushYardsOverExpectedPerAtt: number | null;
  avgCushion: number | null;
  sourceId: string;
  rightsSnapshot: unknown;
  fetchedAt: Date;
};

type PlayerAggregate = {
  gsisId: string;
  team: string | null;
  rows: Map<string, NgsDbRow>;
  sourceWeek: number;
  capturedAt: Date;
};

export const NGS_SIGNAL_CREATE_CHUNK = 2000;
export const NGS_SIGNAL_TRANSACTION_MAX_WAIT_MS = 10_000;
export const NGS_SIGNAL_TRANSACTION_TIMEOUT_MS = 30_000;

const NGS_SIGNAL_KEYS = [...NGS_FEATURE_KEYS, NGS_TEAM_SIGNAL_KEY] as const;

export type NgsSignalWrite = {
  entityType: "player" | "team";
  entityId: string;
  key: string;
  category: string;
  valueRaw: number | null;
  value: number;
  weight: number;
  confidence: number;
  capturedAt: Date;
  season: number;
  week: number;
  sourceId: string;
  rightsSnapshot: Prisma.InputJsonValue;
  fetchedAt: Date;
};

export interface NgsSignalWriterDb {
  nextGenStat: {
    findMany(args: {
      where?: unknown;
      select?: unknown;
      orderBy?: unknown;
      take?: number;
    }): Promise<readonly unknown[] | null>;
  };
  signal: {
    deleteMany(args: {
      where: {
        season: number;
        key: { in: string[] };
      };
    }): Promise<{ count: number }>;
    createMany(args: { data: NgsSignalWrite[] }): Promise<{ count: number }>;
  };
  $transaction(
    run: (tx: { signal: NgsSignalWriterDb["signal"] }) => Promise<number>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<number>;
}

export interface NgsSignalWriterResult {
  status: "ok" | "no-data" | "error";
  season: number;
  rowsRead: number;
  playersWithSignals: number;
  signalsWritten: number;
  teamsWritten: number;
  errors: string[];
}

function initial(season: number, status: NgsSignalWriterResult["status"] = "no-data"): NgsSignalWriterResult {
  return {
    status,
    season,
    rowsRead: 0,
    playersWithSignals: 0,
    signalsWritten: 0,
    teamsWritten: 0,
    errors: [],
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return (value ?? { source_id: NGS_FEATURE_SOURCE }) as Prisma.InputJsonValue;
}

function ngsRightsSnapshot(rows: readonly NgsDbRow[], sourceWeek: number): Prisma.InputJsonValue {
  const first = rows[0]?.rightsSnapshot;
  const base = first && typeof first === "object" && !Array.isArray(first)
    ? first as Record<string, unknown>
    : { value: first ?? null };
  return {
    ...base,
    _ngs: {
      sourceWeek,
      statTypes: [...new Set(rows.map((row) => row.statType))].sort(),
    },
  } as Prisma.InputJsonValue;
}

function isUsableRow(value: unknown): value is NgsDbRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<NgsDbRow>;
  return typeof row.gsisId === "string" && row.gsisId.length > 0 &&
    Number.isInteger(row.season) && typeof row.week === "number" &&
    Number.isInteger(row.week) && row.week >= 0 &&
    typeof row.statType === "string" && row.fetchedAt instanceof Date &&
    Number.isFinite(row.fetchedAt.getTime());
}

function aggregatePlayers(rows: readonly NgsDbRow[]): Map<string, PlayerAggregate> {
  const players = new Map<string, PlayerAggregate>();
  for (const row of rows) {
    if (!isUsableRow(row)) continue;
    const current = players.get(row.gsisId) ?? {
      gsisId: row.gsisId,
      team: row.team,
      rows: new Map<string, NgsDbRow>(),
      sourceWeek: row.week === 0 ? 0 : -1,
      capturedAt: row.fetchedAt,
    };
    // Keep one latest fetch for each (source week, stat type). The selected
    // week is resolved only after all rows are seen, so a later-arriving
    // week-0 aggregate cannot be mixed with a stale weekly row.
    const rowKey = `${row.week}:${row.statType}`;
    const prior = current.rows.get(rowKey);
    if (!prior || row.fetchedAt > prior.fetchedAt) current.rows.set(rowKey, row);
    if (!current.team && row.team) current.team = row.team;
    players.set(row.gsisId, current);
  }
  for (const aggregate of players.values()) {
    const availableWeeks = new Set([...aggregate.rows.values()].map((row) => row.week));
    aggregate.sourceWeek = availableWeeks.has(0) ? 0 : Math.max(...availableWeeks);
    for (const [rowKey, row] of [...aggregate.rows]) {
      if (row.week !== aggregate.sourceWeek) aggregate.rows.delete(rowKey);
    }
    const contributing = [...aggregate.rows.values()];
    // Freshness is deliberately conservative: the oldest contributing source
    // row dates the generated signal, not an unrelated refresh of another
    // week/stat type.
    aggregate.capturedAt = contributing.reduce(
      (oldest, row) => row.fetchedAt < oldest ? row.fetchedAt : oldest,
      contributing[0]?.fetchedAt ?? aggregate.capturedAt,
    );
  }
  return players;
}

function playerInput(aggregate: PlayerAggregate): NgsFeatureInput {
  const rows = [...aggregate.rows.values()];
  return {
    cpoe: rows.find((r) => Number.isFinite(r.cpoe))?.cpoe ?? null,
    avgTimeToThrow: rows.find((r) => Number.isFinite(r.avgTimeToThrow))?.avgTimeToThrow ?? null,
    avgSeparation: rows.find((r) => Number.isFinite(r.avgSeparation))?.avgSeparation ?? null,
    avgYacAboveExpectation: rows.find((r) => Number.isFinite(r.avgYacAboveExpectation))?.avgYacAboveExpectation ?? null,
    rushYardsOverExpectedPerAtt: rows.find((r) => Number.isFinite(r.rushYardsOverExpectedPerAtt))?.rushYardsOverExpectedPerAtt ?? null,
    avgCushion: rows.find((r) => Number.isFinite(r.avgCushion))?.avgCushion ?? null,
  };
}

function mean(values: readonly (number | null | undefined)[]): number | null {
  const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (finite.length === 0) return null;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
}

function teamInput(aggregates: readonly PlayerAggregate[]): NgsTeamFeatureInput {
  return {
    cpoe: mean(aggregates.map((a) => playerInput(a).cpoe)),
    timeToThrow: mean(aggregates.map((a) => playerInput(a).avgTimeToThrow)),
    separation: mean(aggregates.map((a) => playerInput(a).avgSeparation)),
    yacAboveExpectation: mean(aggregates.map((a) => playerInput(a).avgYacAboveExpectation)),
    ryoePerAttempt: mean(aggregates.map((a) => playerInput(a).rushYardsOverExpectedPerAtt)),
    cushion: mean(aggregates.map((a) => playerInput(a).avgCushion)),
  };
}

type TeamAggregate = {
  readonly sourceWeek: number;
  readonly players: readonly PlayerAggregate[];
};

function selectTeamAggregate(aggregates: readonly PlayerAggregate[]): TeamAggregate | null {
  const usable = aggregates.filter((aggregate) => hasNgsValue(playerInput(aggregate)));
  if (usable.length === 0) return null;
  const weeks = new Set(usable.map((aggregate) => aggregate.sourceWeek));
  const sourceWeek = weeks.has(0) ? 0 : Math.max(...weeks);
  const players = usable.filter((aggregate) => aggregate.sourceWeek === sourceWeek);
  return players.length > 0 ? { sourceWeek, players } : null;
}

function hasNgsValue(input: NgsFeatureInput): boolean {
  return NGS_FEATURE_KEYS.some((key) => {
    const field = key === "ngs.cpoe" ? input.cpoe :
      key === "ngs.separation" ? input.avgSeparation :
      key === "ngs.yac_above_expectation" ? input.avgYacAboveExpectation :
      key === "ngs.ryoe_per_attempt" ? input.rushYardsOverExpectedPerAtt :
      key === "ngs.time_to_throw" ? input.avgTimeToThrow : input.avgCushion;
    return typeof field === "number" && Number.isFinite(field);
  });
}

function buildNgsSignalWrites(
  season: number,
  playerWrites: readonly { aggregate: PlayerAggregate; feature: ReturnType<typeof normalizeNgsFeatures>[number] }[],
  teamWrites: readonly { team: string; selected: TeamAggregate }[],
): NgsSignalWrite[] {
  const writes: NgsSignalWrite[] = [];
  for (const { aggregate, feature } of playerWrites) {
    writes.push({
      entityType: "player",
      entityId: aggregate.gsisId,
      key: feature.key,
      category: NGS_FEATURE_CATEGORY,
      valueRaw: feature.raw,
      value: feature.value,
      weight: feature.weight,
      confidence: feature.confidence,
      capturedAt: aggregate.capturedAt,
      season,
      week: aggregate.sourceWeek,
      sourceId: feature.sourceId,
      rightsSnapshot: ngsRightsSnapshot([...aggregate.rows.values()], aggregate.sourceWeek),
      fetchedAt: aggregate.capturedAt,
    });
  }
  for (const { team, selected } of teamWrites) {
    const input = teamInput(selected.players);
    if (!hasNgsTeamValue(input)) continue;
    const capturedAt = selected.players.reduce(
      (oldest, player) => player.capturedAt < oldest ? player.capturedAt : oldest,
      selected.players[0]!.capturedAt,
    );
    const sourceRows = selected.players.flatMap((player) => [...player.rows.values()]);
    const value = ngsTeamScore(input);
    writes.push({
      entityType: "team",
      entityId: team,
      key: NGS_TEAM_SIGNAL_KEY,
      category: NGS_FEATURE_CATEGORY,
      valueRaw: value,
      value,
      weight: NGS_TEAM_WEIGHT,
      confidence: NGS_TEAM_CONFIDENCE,
      capturedAt,
      season,
      week: selected.sourceWeek,
      sourceId: NGS_FEATURE_SOURCE,
      rightsSnapshot: ngsRightsSnapshot(sourceRows, selected.sourceWeek),
      fetchedAt: capturedAt,
    });
  }
  return writes;
}

export async function persistNgsSignals(
  season: number,
  client: NgsSignalWriterDb = db as unknown as NgsSignalWriterDb,
): Promise<NgsSignalWriterResult> {
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    return { ...initial(season, "error"), errors: ["invalid season"] };
  }

  const select = {
    gsisId: true, team: true, season: true, week: true, seasonType: true, statType: true,
    cpoe: true, avgTimeToThrow: true, avgSeparation: true,
    avgYacAboveExpectation: true, rushYardsOverExpectedPerAtt: true,
    avgCushion: true, sourceId: true, rightsSnapshot: true, fetchedAt: true,
  };
  const [aggregateRaw, weeklyRaw] = await Promise.all([
    client.nextGenStat.findMany({
      where: { season, seasonType: "REG", week: NGS_SIGNAL_WEEK },
      select,
      orderBy: [{ fetchedAt: "desc" }],
      take: MAX_ROWS,
    }),
    client.nextGenStat.findMany({
      where: { season, seasonType: "REG", week: { gt: NGS_SIGNAL_WEEK } },
      select,
      orderBy: [{ week: "desc" }, { fetchedAt: "desc" }],
      take: MAX_ROWS,
    }),
  ]);
  const rows = [
    ...(Array.isArray(aggregateRaw) ? aggregateRaw : []).filter((row) => isUsableRow(row) && row.week === NGS_SIGNAL_WEEK),
    ...(Array.isArray(weeklyRaw) ? weeklyRaw : []).filter((row) => isUsableRow(row) && row.week > NGS_SIGNAL_WEEK),
  ];
  if (rows.length === 0) return initial(season);

  const result = { ...initial(season, "ok"), rowsRead: rows.length };
  const players = aggregatePlayers(rows);
  const playerWrites: { aggregate: PlayerAggregate; feature: ReturnType<typeof normalizeNgsFeatures>[number] }[] = [];
  for (const aggregate of players.values()) {
    const input = playerInput(aggregate);
    if (!hasNgsValue(input)) continue;
    for (const feature of normalizeNgsFeatures(input)) {
      playerWrites.push({ aggregate, feature });
    }
  }

  const teamWrites: { team: string; selected: TeamAggregate }[] = [];
  const byTeam = new Map<string, PlayerAggregate[]>();
  for (const aggregate of players.values()) {
    const team = aggregate.team?.trim();
    if (!team) continue;
    const current = byTeam.get(team) ?? [];
    current.push(aggregate);
    byTeam.set(team, current);
  }
  for (const [team, aggregates] of byTeam) {
    const selected = selectTeamAggregate(aggregates);
    if (!selected) continue;
    teamWrites.push({ team, selected });
  }

  const playersWithSignals = new Set(playerWrites.map((write) => write.aggregate.gsisId)).size;
  if (playerWrites.length === 0 && teamWrites.length === 0) {
    return { ...result, status: "ok", playersWithSignals, teamsWritten: 0 };
  }

  const writes = buildNgsSignalWrites(season, playerWrites, teamWrites);
  const teamsWritten = writes.filter((write) => write.entityType === "team").length;
  if (writes.length === 0) {
    return { ...result, status: "ok", playersWithSignals, teamsWritten: 0 };
  }
  try {
    const signalsWritten = await client.$transaction(async (tx) => {
      // Signal's unique identity excludes sourceId. Delete the season's NGS key
      // set (not only nflverse rows) so a stale same-key row from any source
      // cannot collide with the replacement createMany batch.
      await tx.signal.deleteMany({
        where: {
          season,
          key: { in: [...NGS_SIGNAL_KEYS] },
        },
      });
      let written = 0;
      for (let offset = 0; offset < writes.length; offset += NGS_SIGNAL_CREATE_CHUNK) {
        const chunk = writes.slice(offset, offset + NGS_SIGNAL_CREATE_CHUNK);
        const created = await tx.signal.createMany({ data: chunk });
        written += created.count;
      }
      return written;
    }, {
      maxWait: NGS_SIGNAL_TRANSACTION_MAX_WAIT_MS,
      timeout: NGS_SIGNAL_TRANSACTION_TIMEOUT_MS,
    });
    return {
      ...result,
      status: "ok",
      playersWithSignals,
      signalsWritten,
      teamsWritten,
    };
  } catch (error) {
    return {
      ...result,
      status: "error",
      playersWithSignals: 0,
      signalsWritten: 0,
      teamsWritten: 0,
      errors: [error instanceof Error ? error.message : "transaction failed"],
    };
  }
}
