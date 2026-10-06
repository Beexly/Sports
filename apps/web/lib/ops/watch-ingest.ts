/**
 * Watch-ingest persistence — writes the HF Space's per-frame JSON output to
 * the watch.* learning store (Neon).
 *
 * Flow: Windows watcher → HF Space /process-frame → watcher relays the Space's
 * JSON here → this persists detections/tracklets/positions/derived metrics.
 * DB credentials stay server-side on Vercel; the Space never sees them.
 *
 * Raw frames are NEVER accepted or stored here — the Space returns JSON only.
 *
 * HARD RULE: migrations against the default Neon branch are forbidden for
 * agents (branch-only testing). The DDL lives in
 * packages/prediction-engine/src/watch/watch-schema.sql; a founder applies it.
 * These writers assume the tables exist and fail loudly otherwise.
 */

export interface SpaceFrameOutput {
  game_id: string;
  t: number; // epoch seconds
  fps: number;
  burst: boolean;
  width: number;
  height: number;
  detections: Array<{
    bbox: { x: number; y: number; width: number; height: number };
    confidence: number;
    classId: string;
  }>;
  active_tracklets: Array<{
    id: string;
    team_hint: string;
    role: string;
    n_points: number;
  }>;
  finished_tracklets: Array<{
    id: string;
    team_hint: string;
    role: string;
    n_points: number;
    start_t: number;
    end_t: number;
  }>;
  metrics: {
    positions: Array<{
      tracklet_id: string;
      t: number;
      x_px: number;
      y_px: number;
      x_yd: number | null;
      y_yd: number | null;
    }>;
    separations: Array<{ tracklet_id: string; nearest_other_yd: number | null }>;
    break_angles: Array<{ tracklet_id: string; max_heading_change_deg: number }>;
  };
}

export interface IngestResult {
  gameId: string;
  frameIdx: number;
  detections: number;
  activeTracklets: number;
  finishedTracklets: number;
  positions: number;
  dryRun: boolean;
}

export function validateSpaceOutput(body: unknown): SpaceFrameOutput {
  if (typeof body !== "object" || body === null) {
    throw new Error("watch-ingest: body must be an object");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.game_id !== "string" || b.game_id.length === 0) {
    throw new Error("watch-ingest: game_id required");
  }
  if (typeof b.t !== "number" || !Number.isFinite(b.t)) {
    throw new Error("watch-ingest: t (epoch seconds) required");
  }
  if (!Array.isArray(b.detections)) {
    throw new Error("watch-ingest: detections[] required");
  }
  return b as unknown as SpaceFrameOutput;
}

export interface WatchDb {
  $executeRawUnsafe(query: string, ...params: unknown[]): Promise<number>;
  $queryRawUnsafe<T>(query: string, ...params: unknown[]): Promise<T>;
}

/**
 * Persist one Space frame output. Returns the ingest summary.
 * `frameIdx` is allocated as max(frame_idx)+1 per game (idempotent per ts:
 * callers should dedupe on (game_id, t) before calling).
 */
export async function persistFrameOutput(
  db: WatchDb,
  out: SpaceFrameOutput,
  opts: { dryRun?: boolean; now?: Date } = {},
): Promise<IngestResult> {
  const dryRun = opts.dryRun ?? false;
  const frameTs = new Date(out.t * 1000);

  if (dryRun) {
    return {
      gameId: out.game_id,
      frameIdx: -1,
      detections: out.detections.length,
      activeTracklets: out.active_tracklets.length,
      finishedTracklets: out.finished_tracklets.length,
      positions: out.metrics.positions.length,
      dryRun: true,
    };
  }

  // Ensure the game row exists (scheduler normally upserts it first).
  await db.$executeRawUnsafe(
    `INSERT INTO watch.games (game_id, season, week, away, home, kickoff_ts, window_start, status)
     VALUES ($1, 0, 0, 'UNK', 'UNK', $2, $2, 'live')
     ON CONFLICT (game_id) DO UPDATE SET
       status = EXCLUDED.status,
       frames_ingested = watch.games.frames_ingested + 1,
       updated_at = now()`,
    out.game_id,
    frameTs,
  );

  const rows = await db.$queryRawUnsafe<Array<{ next_idx: number }>>(
    `SELECT COALESCE(MAX(frame_idx), -1) + 1 AS next_idx FROM watch.frames WHERE game_id = $1`,
    out.game_id,
  );
  const frameIdx = Number(rows[0]?.next_idx ?? 0);

  await db.$executeRawUnsafe(
    `INSERT INTO watch.frames (game_id, frame_ts, frame_idx, fps, burst, detections)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    out.game_id,
    frameTs,
    frameIdx,
    out.fps,
    out.burst,
    JSON.stringify(out.detections),
  );

  for (const t of out.finished_tracklets) {
    await db.$executeRawUnsafe(
      `INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames, team_hint, role)
       VALUES ($1, $2, to_timestamp($3), to_timestamp($4), $5, $6, $7)
       ON CONFLICT (game_id, tracklet_id) DO NOTHING`,
      out.game_id,
      t.id,
      t.start_t,
      t.end_t,
      t.n_points,
      t.team_hint,
      t.role,
    );
  }

  for (const p of out.metrics.positions) {
    if (p.x_yd == null || p.y_yd == null) continue;
    // Position rows need their tracklet row; finished tracklets were just
    // inserted above; still-active ones get a placeholder row.
    await db.$executeRawUnsafe(
      `INSERT INTO watch.tracklets (game_id, tracklet_id, start_ts, end_ts, n_frames)
       VALUES ($1, $2, $3, $3, 1)
       ON CONFLICT (game_id, tracklet_id) DO NOTHING`,
      out.game_id,
      p.tracklet_id,
      new Date(p.t * 1000),
    );
    await db.$executeRawUnsafe(
      `INSERT INTO watch.field_positions (game_id, tracklet_id, t, x_yd, y_yd)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (game_id, tracklet_id, t) DO NOTHING`,
      out.game_id,
      p.tracklet_id,
      new Date(p.t * 1000),
      p.x_yd,
      p.y_yd,
    );
  }

  const sepByTracklet = new Map(
    out.metrics.separations.map((s) => [s.tracklet_id, s.nearest_other_yd]),
  );
  for (const [trackletId, sep] of sepByTracklet) {
    if (sep == null) continue;
    await db.$executeRawUnsafe(
      `INSERT INTO watch.derived_metrics (game_id, tracklet_id, segment, metric, value, t)
       VALUES ($1, $2, 'frame', 'sep_nearest_other_yd', $3, $4)
       ON CONFLICT (game_id, tracklet_id, segment, metric) DO UPDATE SET value = EXCLUDED.value, t = EXCLUDED.t`,
      out.game_id,
      trackletId,
      sep,
      frameTs,
    );
  }
  for (const ba of out.metrics.break_angles) {
    await db.$executeRawUnsafe(
      `INSERT INTO watch.derived_metrics (game_id, tracklet_id, segment, metric, value, t)
       VALUES ($1, $2, 'route', 'break_angle_max_deg', $3, $4)
       ON CONFLICT (game_id, tracklet_id, segment, metric) DO UPDATE SET value = EXCLUDED.value, t = EXCLUDED.t`,
      out.game_id,
      ba.tracklet_id,
      ba.max_heading_change_deg,
      frameTs,
    );
  }

  return {
    gameId: out.game_id,
    frameIdx,
    detections: out.detections.length,
    activeTracklets: out.active_tracklets.length,
    finishedTracklets: out.finished_tracklets.length,
    positions: out.metrics.positions.filter((p) => p.x_yd != null).length,
    dryRun: false,
  };
}
