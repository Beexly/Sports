/**
 * Runtime caller for the evidence-readiness matrix.
 *
 * This module is deliberately split into pure mapping/evaluation functions and
 * an injected database seam. It reports what is present; it never gates scoring,
 * publishing, or any other production path. In particular, a stored Signal is
 * reported as SHADOW_ONLY because the universal Signal table is storage-only in
 * the current architecture, even when its row is fresh and trusted.
 */

import type {
  EvidenceRecord,
  EvidenceActivationStatus,
  SignalCategory,
} from "@sports/types";
import {
  buildEvidenceReadinessMatrix,
  EVIDENCE_FACTOR_DEFINITIONS,
  getEvidenceFactorDefinition,
  type EvidenceFactorKey,
  type EvidenceMatrixRow,
  type EvidenceReadinessMatrix,
} from "./evidence-readiness-matrix.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_MAX_AGE_MS = DAY_MS;
const AGING_MAX_AGE_MS = 7 * DAY_MS;

const SIGNAL_CATEGORIES: readonly SignalCategory[] = [
  "ODDS",
  "SCHEDULE",
  "WEATHER",
  "INJURIES",
  "RATINGS",
  "MARKET_SENTIMENT",
  "PLAYER_AVAILABILITY",
  "OFFICIALS",
  "VENUE_ENVIRONMENT",
  "TEAM_RATES",
  "STANDINGS",
  "DIVISION_CONTEXT",
  "MILESTONES",
  "PACE",
];

/**
 * The only current GameSignal writer that is also consumed by the live scorer.
 * A persisted row is not an admission bit: an allowlist prevents an unrelated
 * numeric metric (for example wind speed) from becoming an ACTIVE factor.
 */
const ACTIVE_GAME_SIGNAL_KEYS = new Set([
  "schedule_density_7d_home",
  "schedule_density_7d_away",
]);

/** The GameSignal fields needed by the report, kept independent of Prisma. */
export interface GameSignalEvidenceRow {
  readonly sourceCategory: SignalCategory | string;
  readonly sourceName: string;
  readonly signalKey: string;
  readonly signalValue: unknown;
  readonly fetchedAt: Date;
  readonly expiresAt?: Date | null;
  readonly trustLevel: number;
  readonly isBootstrap: boolean;
}

/** The universal Signal fields needed by the report, kept independent of Prisma. */
export interface SignalEvidenceRow {
  readonly entityType: string;
  readonly entityId: string;
  readonly key: string;
  readonly category: string;
  readonly valueRaw: number | null;
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: Date;
  readonly season: number;
  readonly week: number;
  readonly sourceId: string;
  readonly fetchedAt: Date;
}

/**
 * A narrow DB seam. The route supplies Prisma-shaped closures; unit tests
 * supply plain arrays. The loader never imports @sports/db or performs I/O
 * itself.
 */
export interface EvidenceReadinessDb {
  readonly gameSignal: {
    findMany(args: {
      readonly orderBy: { readonly fetchedAt: "desc" };
      readonly take: number;
    }): Promise<readonly GameSignalEvidenceRow[]>;
  };
  readonly signal: {
    findMany(args: {
      readonly orderBy: { readonly fetchedAt: "desc" };
      readonly take: number;
    }): Promise<readonly SignalEvidenceRow[]>;
  };
}

export interface EvidenceBundle {
  readonly evidence: readonly EvidenceRecord[];
  readonly now?: Date;
}

export interface LoadEvidenceReadinessOptions {
  readonly now?: Date;
  readonly limit?: number;
}

/** Enumerated from the matrix so a new factor cannot silently disappear here. */
export const EVIDENCE_FACTOR_KEYS: readonly EvidenceFactorKey[] =
  EVIDENCE_FACTOR_DEFINITIONS.map((definition) => definition.key);

export function evaluateFactorReadiness(
  factorKey: EvidenceFactorKey,
  bundle: EvidenceBundle,
): EvidenceMatrixRow {
  getEvidenceFactorDefinition(factorKey);
  const matrix = buildEvidenceReadinessMatrix({
    evidence: bundle.evidence,
    now: bundle.now,
  });
  const row = matrix.rows.find((candidate) => candidate.key === factorKey);
  if (!row) {
    throw new Error(`Matrix omitted factor ${factorKey}`);
  }
  return row;
}

export function reportAllFactorReadiness(
  bundle: EvidenceBundle,
): EvidenceReadinessMatrix {
  return buildEvidenceReadinessMatrix({
    evidence: bundle.evidence,
    now: bundle.now,
  });
}

/**
 * Map persisted GameSignal rows to the report contract. A non-bootstrap row is
 * reported ACTIVE because it is source-backed and currently used by the live
 * enrichment path; this is a report verdict, not permission to change scoring.
 * A bootstrap row is SHADOW_ONLY and remains blocked by the matrix's bootstrap
 * rule. Expired rows remain visible as STALE rather than being silently omitted.
 */
export function gameSignalRowsToEvidenceRecords(
  rows: readonly GameSignalEvidenceRow[],
  now: Date = new Date(),
): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  for (const row of rows) {
    const sourceCategory = toSignalCategory(row.sourceCategory);
    if (!sourceCategory || !validDate(row.fetchedAt)) continue;

    const freshnessStatus = freshnessFor(
      row.fetchedAt,
      now,
      row.expiresAt,
    );
    const activationStatus: EvidenceActivationStatus =
      !row.isBootstrap && ACTIVE_GAME_SIGNAL_KEYS.has(row.signalKey)
        ? "ACTIVE"
        : "SHADOW_ONLY";
    const sampleSize = scheduleDensitySampleSize(row.signalKey, row.signalValue);

    records.push({
      sourceCategory,
      sourceName: row.sourceName,
      signalKey: row.signalKey,
      fetchedAt: row.fetchedAt,
      trustLevel: clamp01(row.trustLevel),
      isBootstrap: row.isBootstrap,
      activationStatus,
      freshnessStatus,
      sampleSize,
      whyUsedOrBlocked: row.isBootstrap
        ? "Stored GameSignal is bootstrap provenance; it is reported for shadow review and cannot activate scoring."
        : `Persisted GameSignal ${row.signalKey} from ${row.sourceName}.`,
      evidenceFactorKeys:
        row.signalKey === "schedule_density_7d_home" ||
        row.signalKey === "schedule_density_7d_away"
          ? ["schedule.density"]
          : undefined,
    });
  }
  return records;
}

/**
 * Map universal Signal rows to shadow evidence. The Signal ledger is explicitly
 * storage-only today, so every valid row is SHADOW_ONLY regardless of freshness
 * or trust. That prevents a durable row from being mistaken for a priced input.
 */
export function signalRowsToEvidenceRecords(
  rows: readonly SignalEvidenceRow[],
  now: Date = new Date(),
): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  for (const row of rows) {
    const sourceCategory = toSignalCategory(row.category);
    if (!sourceCategory || !validDate(row.fetchedAt)) continue;

    records.push({
      sourceCategory,
      sourceName: `signal:${row.sourceId}`,
      signalKey: row.key,
      fetchedAt: row.fetchedAt,
      trustLevel: clamp01(row.confidence),
      isBootstrap: false,
      activationStatus: "SHADOW_ONLY",
      freshnessStatus: freshnessFor(row.fetchedAt, now, null),
      sampleSize: null,
      whyUsedOrBlocked:
        "Persisted universal Signal row is retained as storage-only shadow evidence; " +
        "it is not a published scoring input.",
    });
  }
  return records;
}

/**
 * Read the two existing signal stores through an injected seam. The caller owns
 * Prisma construction and can add a later as-of filter without changing this
 * pure report contract. Both reads are bounded and newest-first.
 */
export async function loadEvidenceReadiness(
  db: EvidenceReadinessDb,
  options: LoadEvidenceReadinessOptions = {},
): Promise<EvidenceRecord[]> {
  const now = options.now ?? new Date();
  const limit = normalizeLimit(options.limit);
  const [gameRows, signalRows] = await Promise.all([
    db.gameSignal.findMany({
      orderBy: { fetchedAt: "desc" },
      take: limit,
    }),
    db.signal.findMany({
      orderBy: { fetchedAt: "desc" },
      take: limit,
    }),
  ]);

  return [
    ...gameSignalRowsToEvidenceRecords(gameRows, now),
    ...signalRowsToEvidenceRecords(signalRows, now),
  ];
}

function toSignalCategory(value: string): SignalCategory | null {
  return SIGNAL_CATEGORIES.includes(value as SignalCategory)
    ? (value as SignalCategory)
    : null;
}

function validDate(value: Date): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function freshnessFor(
  fetchedAt: Date,
  now: Date,
  expiresAt: Date | null | undefined,
): EvidenceRecord["freshnessStatus"] {
  if (expiresAt && validDate(expiresAt) && expiresAt.getTime() <= now.getTime()) {
    return "STALE";
  }
  const age = Math.max(0, now.getTime() - fetchedAt.getTime());
  if (age <= FRESH_MAX_AGE_MS) return "FRESH";
  if (age <= AGING_MAX_AGE_MS) return "AGING";
  return "STALE";
}

function numericSampleSize(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const key of ["sampleSize", "sample", "n", "count", "gamesLast7"]) {
      const candidate = object[key];
      if (
        typeof candidate === "number" &&
        Number.isFinite(candidate) &&
        candidate >= 0
      ) {
        return Math.floor(candidate);
      }
    }
  }
  return null;
}

function scheduleDensitySampleSize(
  signalKey: string,
  value: unknown,
): number | null {
  if (
    signalKey !== "schedule_density_7d_home" &&
    signalKey !== "schedule_density_7d_away"
  ) {
    return null;
  }
  return numericSampleSize(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 500;
  return Math.max(1, Math.min(2_000, Math.floor(value)));
}
