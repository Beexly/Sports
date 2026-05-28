/**
 * Signal Ledger Service (ADR 004)
 *
 * Append-only accounting ledger for pick lifecycle events. Every state
 * transition — publish, gate flip, settlement, autopsy — produces a new row.
 * The Calibration Report reads from this table to compute per-version
 * accuracy by confidence band.
 *
 * Callers must never mutate existing rows. New events always append.
 */

import { db as prisma, Prisma } from "@sports/db";
import type { SignalLedgerEntry } from "@prisma/client";

// ── Event types ───────────────────────────────────────────────────────────

export const SIGNAL_LEDGER_EVENT_TYPES = [
  "pick_proposed",
  "gate_evaluated",
  "gate_passed",
  "gate_failed",
  "published",
  "unpublished",
  "settled_win",
  "settled_loss",
  "settled_push",
  "settled_void",
  "autopsy_filed",
  "model_version_tagged",
  "confidence_revised",
  "operator_override",
  "calibration_snapshot",
] as const;

export type SignalLedgerEventType = (typeof SIGNAL_LEDGER_EVENT_TYPES)[number];

// ── Types ─────────────────────────────────────────────────────────────────

export interface LedgerEventInsert {
  pickId: string;
  modelVersion: string;
  eventType: SignalLedgerEventType;
  actor?: string;
  payload?: Record<string, unknown>;
  confidenceAt?: number;
  resultBinary?: boolean;
  notes?: string;
}

export interface CalibrationBandStats {
  band: "high" | "strong" | "moderate" | "exploratory";
  minConfidence: number;
  maxConfidence: number;
  settledCount: number;
  winCount: number;
  lossCount: number;
  winRate: number | null;
}

export interface CalibrationReport {
  modelVersion: string;
  totalSettled: number;
  gateCleared: boolean;
  bands: CalibrationBandStats[];
  computedAt: Date;
}

// ── Confidence bands ──────────────────────────────────────────────────────

const CONFIDENCE_BANDS = [
  { band: "high" as const, min: 80, max: 100 },
  { band: "strong" as const, min: 65, max: 79 },
  { band: "moderate" as const, min: 50, max: 64 },
  { band: "exploratory" as const, min: 40, max: 49 },
] as const;

const CALIBRATION_GATE_THRESHOLD = 30;

// ── Write ─────────────────────────────────────────────────────────────────

export async function appendLedgerEvent(
  input: LedgerEventInsert,
): Promise<SignalLedgerEntry> {
  return prisma.signalLedgerEntry.create({
    data: {
      pickId: input.pickId,
      modelVersion: input.modelVersion,
      eventType: input.eventType,
      actor: input.actor ?? "system",
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      confidenceAt: input.confidenceAt,
      resultBinary: input.resultBinary,
      notes: input.notes,
    },
  });
}

/** Record settlement outcome — the canonical path that advances calibration. */
export async function recordSettlement(
  pickId: string,
  modelVersion: string,
  outcome: "win" | "loss" | "push" | "void",
  confidenceAt: number,
  actor = "system",
): Promise<SignalLedgerEntry> {
  const resultBinary =
    outcome === "win" ? true : outcome === "loss" ? false : undefined;

  return appendLedgerEvent({
    pickId,
    modelVersion,
    eventType: `settled_${outcome}` as SignalLedgerEventType,
    actor,
    payload: { outcome },
    confidenceAt,
    resultBinary,
  });
}

// ── Read / Calibration ────────────────────────────────────────────────────

export async function getCalibrationReport(
  modelVersion: string,
): Promise<CalibrationReport> {
  const settled = await prisma.signalLedgerEntry.findMany({
    where: {
      modelVersion,
      eventType: {
        in: ["settled_win", "settled_loss"],
      },
      resultBinary: { not: null },
    },
    select: {
      confidenceAt: true,
      resultBinary: true,
    },
  });

  const totalSettled = settled.length;
  const gateCleared = totalSettled >= CALIBRATION_GATE_THRESHOLD;

  const bands: CalibrationBandStats[] = CONFIDENCE_BANDS.map(({ band, min, max }) => {
    const inBand = settled.filter(
      (e: { confidenceAt: number | null; resultBinary: boolean | null }) =>
        e.confidenceAt !== null && e.confidenceAt >= min && e.confidenceAt <= max,
    );
    const settledCount = inBand.length;
    const winCount = inBand.filter((e: { resultBinary: boolean | null }) => e.resultBinary === true).length;
    const lossCount = inBand.filter((e: { resultBinary: boolean | null }) => e.resultBinary === false).length;
    const winRate =
      settledCount >= CALIBRATION_GATE_THRESHOLD
        ? winCount / settledCount
        : null;

    return {
      band,
      minConfidence: min,
      maxConfidence: max,
      settledCount,
      winCount,
      lossCount,
      winRate,
    };
  });

  return {
    modelVersion,
    totalSettled,
    gateCleared,
    bands,
    computedAt: new Date(),
  };
}

/** All model versions with at least one ledger entry, newest first. */
export async function listModelVersions(): Promise<string[]> {
  const rows = await prisma.signalLedgerEntry.groupBy({
    by: ["modelVersion"],
    orderBy: { _count: { modelVersion: "desc" } },
  });
  return rows.map((r: { modelVersion: string }) => r.modelVersion);
}
