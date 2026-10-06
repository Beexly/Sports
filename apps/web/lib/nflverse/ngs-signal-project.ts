/**
 * ngs-signal-project.ts — pure projection from nflverse Next Gen Stats weekly
 * rows into `signals`-table payloads.
 *
 * WHY THIS EXISTS. The NGS typed-access layer (`@sports/data-ingestion`
 * nflverse-ngs.ts) parsed tracking-derived metrics (receiver separation,
 * rusher RYOE, passer CPOE) but had zero production callers — nothing fetched
 * the assets on a schedule and nothing persisted them. This module is the
 * persist-side half: it turns parsed weekly NGS rows into `Signal` payloads
 * (entityType "player", gsisId join key) for the cron route to upsert.
 *
 * HONESTY CONTRACT:
 * - Weekly rows only (week > 0). Season aggregates (week 0) are a display
 *   concern owned by `next-gen-stats.ts`; they are not freshness signals.
 * - One headline metric per facet: avg_separation (receiving), ryoe_per_att
 *   (rushing), cpoe (passing). All three are higher-is-better, so
 *   value = valueRaw is directionally correct.
 * - weight = 0. NGS weighting is founder-gated; uncalibrated signals compute
 *   in shadow and never affect published outputs. These rows exist so the
 *   tuning pass (Tier 1 #4 caller) has real per-key evidence to fit against.
 * - confidence = 1.0: settled tracking measurements, not rumors.
 * - Sample size (targets / rush attempts / pass attempts) rides in
 *   rightsSnapshot so calibration can filter small-sample weeks instead of
 *   this writer inventing a cutoff.
 * - NGS is INTERNAL-ONLY per the 2026-09-28 doctrine: rows land in the
 *   internal `signals` table (read only by shadow/ops paths); nothing here
 *   touches the public surface.
 */

import type {
  NgsPassingRow,
  NgsReceivingRow,
  NgsRushingRow,
} from "@sports/data-ingestion";

export const NGS_SIGNAL_CATEGORY = "RATINGS" as const;
export const NGS_SOURCE_ID = "nflverse" as const;

export const NGS_SIGNAL_KEYS = {
  receiving: "ngs.avg_separation",
  rushing: "ngs.ryoe_per_att",
  passing: "ngs.cpoe",
} as const;

export interface NgsSignalPayload {
  readonly entityType: "player";
  readonly entityId: string; // gsisId
  readonly key: string;
  readonly category: typeof NGS_SIGNAL_CATEGORY;
  readonly valueRaw: number;
  /** Directional reading. All three headline metrics are higher-is-better. */
  readonly value: number;
  /** 0 = uncalibrated. NGS weighting is founder-gated; shadow only. */
  readonly weight: 0;
  /** Settled tracking measurement, not rumor. */
  readonly confidence: 1;
  readonly season: number;
  readonly week: number;
  readonly sourceId: typeof NGS_SOURCE_ID;
  readonly rightsSnapshot: {
    readonly license: "CC-BY-4.0";
    readonly via: "nflverse";
    readonly attribution: "NFL Next Gen Stats via nflverse";
    readonly sample: number;
    readonly playerName: string;
    readonly team: string;
  };
  readonly capturedAt: Date;
  readonly fetchedAt: Date;
}

export interface NgsSignalProjectInput {
  readonly receiving: readonly NgsReceivingRow[];
  readonly rushing: readonly NgsRushingRow[];
  readonly passing: readonly NgsPassingRow[];
  readonly season: number;
  readonly week: number;
  readonly now?: Date;
}

function basePayload(
  row: { gsisId: string; player: string; team: string; season: number; week: number },
  key: string,
  metric: number | null,
  sample: number | null,
  now: Date,
): NgsSignalPayload | null {
  if (!row.gsisId || metric === null || !Number.isFinite(metric)) return null;
  return {
    entityType: "player",
    entityId: row.gsisId,
    key,
    category: NGS_SIGNAL_CATEGORY,
    valueRaw: metric,
    value: metric,
    weight: 0,
    confidence: 1,
    season: row.season,
    week: row.week,
    sourceId: NGS_SOURCE_ID,
    rightsSnapshot: {
      license: "CC-BY-4.0",
      via: "nflverse",
      attribution: "NFL Next Gen Stats via nflverse",
      sample: sample ?? 0,
      playerName: row.player,
      team: row.team,
    },
    capturedAt: now,
    fetchedAt: now,
  };
}

/**
 * Project parsed NGS weekly rows into `signals` payloads for one season/week.
 * Skips season aggregates (week 0), non-matching season/week rows, rows with
 * no gsisId, and rows with a null headline metric. Dedupes on
 * (entityId, key, season, week) — first row wins.
 */
export function projectNgsSignalRows(input: NgsSignalProjectInput): NgsSignalPayload[] {
  const now = input.now ?? new Date();
  const seen = new Set<string>();
  const out: NgsSignalPayload[] = [];

  const push = (payload: NgsSignalPayload | null) => {
    if (!payload) return;
    const dedupe = `${payload.entityId}::${payload.key}::${payload.season}::${payload.week}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push(payload);
  };

  const inScope = <T extends { season: number; week: number }>(row: T): boolean =>
    row.season === input.season && row.week === input.week && row.week > 0;

  for (const row of input.receiving) {
    if (!inScope(row)) continue;
    push(basePayload(row, NGS_SIGNAL_KEYS.receiving, row.avgSeparation, row.targets, now));
  }
  for (const row of input.rushing) {
    if (!inScope(row)) continue;
    push(basePayload(row, NGS_SIGNAL_KEYS.rushing, row.ryoePerAtt, row.rushAttempts, now));
  }
  for (const row of input.passing) {
    if (!inScope(row)) continue;
    push(basePayload(row, NGS_SIGNAL_KEYS.passing, row.cpoe, row.attempts, now));
  }

  return out;
}
