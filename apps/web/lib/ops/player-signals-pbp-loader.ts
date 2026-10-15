/**
 * player-signals-pbp-loader — the populate path for census row C-074.
 *
 * THE GAP THIS CLOSES. The player-level store (Prisma model `Signal`,
 * table `signals`, rows with entityType "player" — there is no table
 * literally named `player_signals`) was recorded BUILT-EMPTY on
 * 2026-09-27 with the note "the prop pipeline cannot exist without it",
 * and census C-074 still reads 0 rows. The DB writer
 * (`signal-ledger-writer.ts`) projects from production tables; this loader
 * is the in-repo counterpart: it projects the SAME candidate shape from
 * the play-by-play aggregates the repo already carries
 * (`intelligence/signals/player_week_pbp.jsonl`, extracted by
 * `intelligence/signals/extract_player_week_pbp.py` from the in-repo
 * nflverse parquets in `intelligence/coaching/data/`). The population
 * path therefore exists, runs, and is auditable without a production
 * database; the write itself goes through the writer's own upsert shape.
 *
 * HONESTY RULES (the same ones the writer and the engine slate live by):
 *   - Every value is a MEASURED aggregate off the parquets. Nothing is
 *     modeled, imputed, or sampled; a player-week with no plays in a role
 *     emits no rows for that role — absence is silence.
 *   - `pbp.*` keys have NO fitted scale in `signal-scale-table.ts` yet, so
 *     `value` carries the raw measured reading, `weight` is 0 (the
 *     schema's own convention: present and honest, not allowed to move a
 *     score), and the rightsSnapshot says `normalization: "raw-unfitted"`.
 *     Fitting scales for these keys is the named follow-on; population is
 *     not promotion.
 *   - Every row carries provenance: sourceId, the source files' sha256
 *     (from the extraction manifest), the extraction timestamp, the
 *     row's as-of (the latest game date inside that player-week), and the
 *     write time (`fetchedAt`, injected — never a hidden wall clock).
 *   - `pass_attempts` is the nflverse `pass_attempt` flag verbatim (pass
 *     plays as flagged by the source, sacks/spikes included as flagged);
 *     it is not an official attempts recount.
 *
 * Pure: rows in, candidates out. The DB write is the caller's job via the
 * writer's `SignalWriterDb` interface (see scripts/dfs/populate-player-signals).
 */

import type { SignalWriteCandidate } from "./signal-ledger-writer-types.js";

export const PLAYER_SIGNAL_SOURCE_ID = "nflverse-pbp";

/** One aggregated player-week row, as emitted by the extractor. */
export interface PlayerWeekPbpRow {
  readonly gsis_id: string;
  readonly player_name: string;
  readonly team: string | null;
  readonly season: number;
  readonly week: number;
  /** Latest game date (YYYY-MM-DD) inside this player-week. The as-of. */
  readonly as_of: string;
  readonly targets: number;
  readonly receptions: number;
  readonly receiving_yards: number;
  readonly air_yards: number;
  readonly yards_after_catch: number;
  readonly rush_attempts: number;
  readonly rushing_yards: number;
  readonly pass_attempts: number;
  readonly completions: number;
  readonly passing_yards: number;
  readonly team_pass_attempts: number;
}

/** Provenance of the aggregates file, from its extraction manifest. */
export interface PbpExtractionManifest {
  readonly extractedAt: string;
  readonly files: readonly { readonly file: string; readonly sha256: string }[];
}

interface MetricDef {
  readonly key: string;
  /** The role opportunity that must exist for the row to be emitted. */
  readonly role: "receiving" | "rushing" | "passing";
  readonly read: (row: PlayerWeekPbpRow) => number | null;
}

/**
 * The key set. One candidate per key per player-week, gated on the role
 * actually occurring that week (a pure receiver emits no passing rows).
 * `pbp.target_share` is the only derived value, and both of its inputs
 * (targets, team pass attempts) are themselves emitted rows, so the share
 * is checkable rather than trusted.
 */
export const PLAYER_SIGNAL_METRICS: readonly MetricDef[] = [
  { key: "pbp.targets", role: "receiving", read: (r) => r.targets },
  { key: "pbp.receptions", role: "receiving", read: (r) => r.receptions },
  { key: "pbp.receiving_yards", role: "receiving", read: (r) => r.receiving_yards },
  { key: "pbp.air_yards", role: "receiving", read: (r) => r.air_yards },
  { key: "pbp.yards_after_catch", role: "receiving", read: (r) => r.yards_after_catch },
  {
    key: "pbp.target_share", role: "receiving",
    read: (r) => (r.team_pass_attempts > 0 ? r.targets / r.team_pass_attempts : null),
  },
  { key: "pbp.rush_attempts", role: "rushing", read: (r) => r.rush_attempts },
  { key: "pbp.rushing_yards", role: "rushing", read: (r) => r.rushing_yards },
  { key: "pbp.pass_attempts", role: "passing", read: (r) => r.pass_attempts },
  { key: "pbp.completions", role: "passing", read: (r) => r.completions },
  { key: "pbp.passing_yards", role: "passing", read: (r) => r.passing_yards },
];

function roleOccurred(role: MetricDef["role"], row: PlayerWeekPbpRow): boolean {
  switch (role) {
    case "receiving": return row.targets > 0 || row.receptions > 0;
    case "rushing": return row.rush_attempts > 0;
    case "passing": return row.pass_attempts > 0;
  }
}

export interface PlayerSignalLoadReport {
  readonly inputRows: number;
  readonly candidates: number;
  readonly byKey: Readonly<Record<string, number>>;
  readonly bySeason: Readonly<Record<string, number>>;
  /** Player-weeks dropped, with the reason visible rather than silent. */
  readonly dropped: readonly { gsisId: string; season: number; week: number; reason: string }[];
  readonly players: number;
}

/**
 * Project aggregated player-weeks into `signals` write candidates.
 * `now` is the write stamp (fetchedAt); `capturedAt` is each row's own
 * as-of, so a backfill never pretends the data was observed today.
 */
export function projectPlayerWeekSignals(
  rows: readonly PlayerWeekPbpRow[],
  options: { readonly now: Date; readonly manifest: PbpExtractionManifest },
): { candidates: SignalWriteCandidate[]; report: PlayerSignalLoadReport } {
  const candidates: SignalWriteCandidate[] = [];
  const dropped: PlayerSignalLoadReport["dropped"][number][] = [];
  const byKey: Record<string, number> = {};
  const bySeason: Record<string, number> = {};
  const players = new Set<string>();

  const rightsSnapshot: Record<string, unknown> = {
    dataset: "nflverse play_by_play (in-repo parquets)",
    sourceFiles: options.manifest.files.map((f) => ({ file: f.file, sha256: f.sha256 })),
    extractedAt: options.manifest.extractedAt,
    normalization: "raw-unfitted",
    scaleFit: "PENDING — no fitted scale for pbp.* keys; weight 0 until fitted",
  };

  for (const row of rows) {
    if (!row.gsis_id) {
      dropped.push({ gsisId: row.gsis_id, season: row.season, week: row.week, reason: "no gsis id — a signal row without an entity id is not writable" });
      continue;
    }
    const capturedAt = new Date(`${row.as_of}T00:00:00.000Z`);
    if (Number.isNaN(capturedAt.getTime())) {
      dropped.push({ gsisId: row.gsis_id, season: row.season, week: row.week, reason: `unparseable as-of stamp: ${row.as_of}` });
      continue;
    }
    let emitted = 0;
    for (const metric of PLAYER_SIGNAL_METRICS) {
      if (!roleOccurred(metric.role, row)) continue;
      const value = metric.read(row);
      if (value === null || !Number.isFinite(value)) continue;
      candidates.push({
        entityType: "player",
        entityId: row.gsis_id,
        key: metric.key,
        category: "PRODUCTION",
        value,
        valueRaw: value,
        weight: 0,
        confidence: 1,
        capturedAt,
        season: row.season,
        week: row.week,
        sourceId: PLAYER_SIGNAL_SOURCE_ID,
        fetchedAt: options.now,
        rightsSnapshot,
      });
      byKey[metric.key] = (byKey[metric.key] ?? 0) + 1;
      bySeason[String(row.season)] = (bySeason[String(row.season)] ?? 0) + 1;
      emitted += 1;
    }
    if (emitted > 0) players.add(row.gsis_id);
  }

  return {
    candidates,
    report: {
      inputRows: rows.length,
      candidates: candidates.length,
      byKey,
      bySeason,
      dropped,
      players: players.size,
    },
  };
}
