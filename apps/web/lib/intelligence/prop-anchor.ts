import type { MarketAnchoredPlayerProjection } from "@sports/prediction-engine";
import { buildDivergenceBoard, type DivergenceBoard, type DivergenceSignalInput } from "./divergence";

export type PropAnchorMetric = "yards" | "touchdowns" | "fantasy-points";

export interface PlayerPropAnchorLine {
  readonly id: string;
  readonly playerId: string;
  readonly label: string;
  readonly book: string;
  readonly market: string;
  readonly metric: PropAnchorMetric;
  readonly line: number;
  readonly fairValue?: number;
  readonly marketStdev?: number;
  readonly sourceReliability?: number;
  readonly team?: string | null;
  readonly position?: string | null;
}

export interface PropAnchorResidual {
  readonly line: PlayerPropAnchorLine;
  readonly player: MarketAnchoredPlayerProjection;
  readonly anchorValue: number;
  readonly propExpectedValue: number;
  readonly expectationBasis: "fair-value" | "posted-line-median";
  readonly residual: number;
  readonly residualPct: number;
  readonly residualZ: number;
  readonly divergenceSignal: DivergenceSignalInput;
  readonly priced: false;
  readonly status: "shadow";
  readonly draftOnly: true;
}

export interface PropAnchorTriangulation {
  readonly generatedAt: string;
  readonly residuals: readonly PropAnchorResidual[];
  readonly unmatchedLineIds: readonly string[];
  readonly divergenceBoard: DivergenceBoard;
  readonly maxAbsResidualZ: number;
  readonly priced: false;
  readonly status: "shadow";
  readonly draftOnly: true;
}

export interface PropAnchorOptions {
  readonly generatedAt?: string;
  readonly minRouteScore?: number;
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function anchorValueForMetric(player: MarketAnchoredPlayerProjection, metric: PropAnchorMetric): number {
  switch (metric) {
    case "yards":
      return player.projectedYards;
    case "touchdowns":
      return player.projectedTouchdowns;
    case "fantasy-points":
      return player.fantasyPoints;
  }
}

function fallbackScale(line: PlayerPropAnchorLine): number {
  switch (line.metric) {
    case "yards":
      return Math.max(12, Math.abs(line.line) * 0.18);
    case "touchdowns":
      return Math.max(0.35, Math.abs(line.line) * 0.35);
    case "fantasy-points":
      return Math.max(2.5, Math.abs(line.line) * 0.22);
  }
}

function scaleFor(line: PlayerPropAnchorLine): number {
  const stdev = line.marketStdev;
  if (stdev != null && Number.isFinite(stdev) && stdev > 0) return stdev;
  return fallbackScale(line);
}

function confidenceFor(line: PlayerPropAnchorLine): number {
  const reliability = clamp(line.sourceReliability ?? 0.62, 0, 1);
  const hasFairValue = line.fairValue == null ? 0 : 0.08;
  const hasStdev = line.marketStdev == null ? 0 : 0.06;
  return round(clamp(0.42 + reliability * 0.38 + hasFairValue + hasStdev, 0.35, 0.88), 3);
}

function reasonFor(line: PlayerPropAnchorLine, anchorValue: number, expected: number, residual: number): string {
  const direction = residual >= 0 ? "above" : "below";
  return `${line.book} ${line.market} sits ${round(Math.abs(residual), 2)} ${line.metric} ${direction} the B3 market-anchored ${line.metric} value (${round(expected, 2)} vs ${round(anchorValue, 2)}).`;
}

function buildResidual(
  line: PlayerPropAnchorLine,
  player: MarketAnchoredPlayerProjection,
): PropAnchorResidual {
  const anchorValue = anchorValueForMetric(player, line.metric);
  const propExpectedValue = line.fairValue ?? line.line;
  const residual = propExpectedValue - anchorValue;
  const denominator = Math.max(Math.abs(anchorValue), Math.abs(propExpectedValue), 1);
  const residualPct = residual / denominator;
  const residualZ = residual / scaleFor(line);
  const divergenceSignal: DivergenceSignalInput = {
    source: "prop-anchor",
    subjectType: "player",
    subjectId: line.playerId,
    label: line.label,
    team: line.team ?? null,
    position: line.position ?? player.position,
    rawScore: round(residualZ, 3),
    confidence: confidenceFor(line),
    reason: reasonFor(line, anchorValue, propExpectedValue, residual),
  };

  return {
    line,
    player,
    anchorValue: round(anchorValue),
    propExpectedValue: round(propExpectedValue),
    expectationBasis: line.fairValue == null ? "posted-line-median" : "fair-value",
    residual: round(residual),
    residualPct: round(residualPct),
    residualZ: round(residualZ),
    divergenceSignal,
    priced: false,
    status: "shadow",
    draftOnly: true,
  };
}

export function reconcilePlayerPropsAgainstMarketAnchor(
  players: readonly MarketAnchoredPlayerProjection[],
  lines: readonly PlayerPropAnchorLine[],
  options: PropAnchorOptions = {},
): PropAnchorTriangulation {
  const playersById = new Map(players.map((player) => [player.playerId, player]));
  const residuals: PropAnchorResidual[] = [];
  const unmatchedLineIds: string[] = [];

  for (const line of lines) {
    const player = playersById.get(line.playerId);
    if (!player) {
      unmatchedLineIds.push(line.id);
      continue;
    }
    residuals.push(buildResidual(line, player));
  }

  const divergenceBoard = buildDivergenceBoard(
    residuals.map((residual) => residual.divergenceSignal),
    { minRouteScore: options.minRouteScore ?? 0.6 },
  );
  const maxAbsResidualZ = residuals.reduce(
    (max, residual) => Math.max(max, Math.abs(residual.residualZ)),
    0,
  );

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    residuals,
    unmatchedLineIds,
    divergenceBoard,
    maxAbsResidualZ: round(maxAbsResidualZ),
    priced: false,
    status: "shadow",
    draftOnly: true,
  };
}
