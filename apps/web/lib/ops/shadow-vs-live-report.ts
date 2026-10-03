/**
 * Offline scoring of the shadow engine against the live one, on the SAME games.
 *
 * This is the evidence gate that has to be cleared BEFORE any traffic is routed
 * to the shadow engine. It compares like with like: only games where BOTH engines
 * produced a probability are scored, so neither side is credited or penalised for
 * a game the other never saw. A market baseline is scored on the same set, because
 * "beats the live engine" is not interesting if both lose to the closing line.
 *
 * Pure aside from the caller-supplied rows — the DB read lives in
 * `shadow-signal-store.ts`. Scoring reuses `brierDecomposition` from
 * @sports/prediction-engine rather than a fourth Brier implementation.
 */

import { brierDecomposition, type CalibrationSample } from "@sports/prediction-engine";
import type { SettledShadowRow } from "./shadow-signal-store";

export interface EngineScore {
  readonly label: string;
  readonly brier: number;
  readonly resolution: number;
  readonly reliability: number;
  readonly sampleSize: number;
}

export interface ShadowVsLiveReport {
  /** Games where BOTH engines produced a probability — the only fair comparison set. */
  readonly comparedGames: number;
  /** Settled shadow rows that had no live confidence to compare against. */
  readonly shadowOnlyGames: number;
  readonly shadow: EngineScore | null;
  readonly live: EngineScore | null;
  readonly market: EngineScore | null;
  /** live.brier − shadow.brier. POSITIVE means the shadow engine is better. */
  readonly brierAdvantage: number | null;
  readonly verdict: "shadow-better" | "live-better" | "tied" | "insufficient-sample";
  readonly summary: string;
}

/**
 * Minimum compared games before a verdict is issued. Below this, week-to-week
 * Brier noise on a handful of games routinely exceeds any real difference, and
 * calling a winner would be fabricating confidence. Matches the discrimination
 * gate already used in apps/web/lib/calibration/compute.ts.
 */
export const MIN_COMPARISON_SAMPLE = 20;

/** Ties beneath this |Δ Brier| are reported as a tie, not a winner. */
export const BRIER_TIE_BAND = 0.002;

function score(label: string, samples: readonly CalibrationSample[]): EngineScore {
  const d = brierDecomposition(samples);
  return {
    label,
    brier: d.brier,
    resolution: d.resolution,
    reliability: d.reliability,
    sampleSize: d.sampleSize,
  };
}

export function buildShadowVsLiveReport(rows: readonly SettledShadowRow[]): ShadowVsLiveReport {
  const shadowSamples: CalibrationSample[] = [];
  const liveSamples: CalibrationSample[] = [];
  const marketSamples: CalibrationSample[] = [];
  let shadowOnlyGames = 0;

  for (const row of rows) {
    const y: 0 | 1 = row.outcome === 1 ? 1 : 0;
    if (row.liveConfidence === null) {
      shadowOnlyGames += 1;
      continue;
    }
    shadowSamples.push({ p: row.shadowProb, y });
    // Same confidence→probability clamp the calibration dashboard uses, so this
    // report and the public numbers cannot disagree about what the live engine said.
    liveSamples.push({ p: Math.max(0.01, Math.min(0.99, row.liveConfidence / 100)), y });
    marketSamples.push({ p: row.marketProb, y });
  }

  const comparedGames = shadowSamples.length;

  if (comparedGames < MIN_COMPARISON_SAMPLE) {
    return {
      comparedGames,
      shadowOnlyGames,
      shadow: comparedGames > 0 ? score("shadow", shadowSamples) : null,
      live: comparedGames > 0 ? score("live", liveSamples) : null,
      market: comparedGames > 0 ? score("market", marketSamples) : null,
      brierAdvantage: null,
      verdict: "insufficient-sample",
      summary:
        `Only ${comparedGames} game(s) had both a shadow and a live probability ` +
        `(need ${MIN_COMPARISON_SAMPLE}). No verdict — this is noise, not evidence.`,
    };
  }

  const shadow = score("shadow", shadowSamples);
  const live = score("live", liveSamples);
  const market = score("market", marketSamples);
  const brierAdvantage = live.brier - shadow.brier;

  const verdict =
    Math.abs(brierAdvantage) <= BRIER_TIE_BAND
      ? "tied"
      : brierAdvantage > 0
        ? "shadow-better"
        : "live-better";

  const beatsMarket = shadow.brier < market.brier;

  return {
    comparedGames,
    shadowOnlyGames,
    shadow,
    live,
    market,
    brierAdvantage,
    verdict,
    summary:
      `${comparedGames} compared games. Brier — shadow ${shadow.brier.toFixed(4)}, ` +
      `live ${live.brier.toFixed(4)}, market ${market.brier.toFixed(4)}. ` +
      `RES — shadow ${shadow.resolution.toFixed(4)}, live ${live.resolution.toFixed(4)}. ` +
      `Verdict: ${verdict} (Δ ${brierAdvantage.toFixed(4)}). ` +
      (beatsMarket
        ? "Shadow also beats the market baseline on this set."
        : "Shadow does NOT beat the market baseline — a win over the live engine alone is not an edge.") +
      " One week is one observation; this needs to hold repeatedly before it means anything.",
  };
}

/** Markdown rendering, for posting as an issue comment or an ops page. */
export function renderShadowVsLiveMarkdown(report: ShadowVsLiveReport): string {
  const lines = [
    "## Shadow vs live — offline comparison",
    "",
    `**Verdict: ${report.verdict}**`,
    "",
    report.summary,
    "",
    "| Engine | Brier | RES | REL | n |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const s of [report.shadow, report.live, report.market]) {
    if (s === null) continue;
    lines.push(
      `| ${s.label} | ${s.brier.toFixed(4)} | ${s.resolution.toFixed(4)} | ${s.reliability.toFixed(4)} | ${s.sampleSize} |`,
    );
  }
  if (report.shadowOnlyGames > 0) {
    lines.push(
      "",
      `_${report.shadowOnlyGames} settled shadow row(s) excluded: no live probability to compare against._`,
    );
  }
  lines.push(
    "",
    "_Shadow engine is not published and serves no user. This report is evidence only._",
  );
  return lines.join("\n");
}
