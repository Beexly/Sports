/**
 * Batch self-CLV reporter over an owned closing archive.
 * Refuse-default on incomplete open→close pairs. Never fabricates ROI.
 */

import {
  selfClvFromClosingArchive,
  type ClosingArchive,
} from "./closing-archive.js";
import type { FormulaResult } from "../formulas/derived.js";

export type SelfClvRow = {
  eventId: string;
  market: string;
  side: string;
  result: FormulaResult;
};

export type SelfClvCohortReport = {
  nPairs: number;
  nOk: number;
  nRefused: number;
  meanBps: number | null;
  meanBpsPublic: boolean;
  publishFloor: number;
  rows: SelfClvRow[];
  refuseCodes: Record<string, number>;
  law: readonly string[];
};

/**
 * Enumerate open keys from archive touches and score self-CLV for each open.
 */
export function reportSelfClvFromArchive(
  archive: ClosingArchive,
  eventIds: readonly string[],
  opts: { publishFloor?: number } = {},
): SelfClvCohortReport {
  const publishFloor = opts.publishFloor ?? 50;
  const rows: SelfClvRow[] = [];
  const refuseCodes: Record<string, number> = {};
  const seen = new Set<string>();

  for (const eventId of eventIds) {
    const touches = archive.touches(eventId);
    for (const t of touches) {
      if (t.role !== "open") continue;
      const key = `${t.eventId}|${t.market}|${t.side}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const result = selfClvFromClosingArchive(
        archive,
        t.eventId,
        t.market,
        t.side,
      );
      rows.push({
        eventId: t.eventId,
        market: t.market,
        side: t.side,
        result,
      });
      if (!result.ok && result.refuseCode) {
        refuseCodes[result.refuseCode] =
          (refuseCodes[result.refuseCode] ?? 0) + 1;
      }
    }
  }

  const okRows = rows.filter((r) => r.result.ok);
  const meanBps =
    okRows.length > 0
      ? okRows.reduce((a, r) => a + r.result.value, 0) / okRows.length
      : null;
  const publicOk = okRows.length >= publishFloor;

  return {
    nPairs: rows.length,
    nOk: okRows.length,
    nRefused: rows.length - okRows.length,
    meanBps: publicOk && meanBps !== null ? Math.round(meanBps * 100) / 100 : null,
    meanBpsPublic: publicOk,
    publishFloor,
    rows,
    refuseCodes,
    law: [
      "Self-CLV only on first-party closing archive",
      "oddsApiRequired=false",
      `Cohort mean published only when nOk ≥ ${publishFloor}`,
      "No ROI / win-rate claims from this surface",
    ],
  };
}

/** Demo archive fixtures for honesty explainer (not performance claims). */
export function buildDemoSelfClvReport(): SelfClvCohortReport {
  // Lazy import pattern avoided — caller supplies archive in production.
  // This helper only documents expected empty refusal shape.
  return {
    nPairs: 0,
    nOk: 0,
    nRefused: 0,
    meanBps: null,
    meanBpsPublic: false,
    publishFloor: 50,
    rows: [],
    refuseCodes: { incomplete_archive: 0 },
    law: [
      "Demo empty report — feed Gamma cron_delta then open→close pairs",
      "oddsApiRequired=false",
      "Cohort mean closed until n≥50",
    ],
  };
}
