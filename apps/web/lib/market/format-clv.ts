import { formatMarketDelta, normalizeMarketPoint } from "@sports/types";

export type CanonicalClvKind = "POINTS" | "PROBABILITY";
export type CanonicalClvVerdict =
  | "BEAT_CLOSE"
  | "MATCHED_CLOSE"
  | "LOST_TO_CLOSE";

export interface CanonicalClvProjection {
  readonly kind: CanonicalClvKind;
  readonly value: number;
  readonly verdict: CanonicalClvVerdict;
  readonly display: string;
}

const MONEYLINE_MATCH_EPSILON = 0.005;

export function formatCanonicalClv(
  pickType: string,
  kind: string | null | undefined,
  value: number | null | undefined,
  sport: string,
): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (!normalizeMarketPoint("SPREAD_POINTS", sport, 0)) return null;
  if (pickType === "MONEYLINE" && kind === "PROBABILITY") {
    if (Math.abs(value) > 1) return null;
    const rounded = Number((value * 100).toFixed(1));
    const percentagePoints = Object.is(rounded, -0) ? 0 : rounded;
    return `${percentagePoints > 0 ? "+" : ""}${percentagePoints.toFixed(1)} pp`;
  }
  if ((pickType === "SPREAD" || pickType === "TOTAL") && kind === "POINTS") {
    const point = normalizeMarketPoint("SPREAD_POINTS", sport, value);
    if (!point) return null;
    const display = formatMarketDelta(point.normalized);
    return display === "N/A" ? null : `${display} pts`;
  }
  return null;
}

export function projectCanonicalClv(input: {
  readonly pickType: string;
  readonly kind: string | null | undefined;
  readonly value: number | null | undefined;
  readonly verdict: string | null | undefined;
  readonly sport: string;
}): CanonicalClvProjection | null {
  const display = formatCanonicalClv(
    input.pickType,
    input.kind,
    input.value,
    input.sport,
  );
  if (!display || input.value == null) return null;

  const kind = normalizeKind(input.kind);
  const verdict = normalizeVerdict(input.verdict);
  if (!kind || !verdict) return null;

  const expectedVerdict = verdictForValue(input.pickType, input.value);
  if (!expectedVerdict || verdict !== expectedVerdict) return null;

  return { kind, value: input.value, verdict, display };
}

function normalizeKind(raw: string | null | undefined): CanonicalClvKind | null {
  return raw === "POINTS" || raw === "PROBABILITY" ? raw : null;
}

function normalizeVerdict(
  raw: string | null | undefined,
): CanonicalClvVerdict | null {
  return raw === "BEAT_CLOSE" ||
    raw === "MATCHED_CLOSE" ||
    raw === "LOST_TO_CLOSE"
    ? raw
    : null;
}

function verdictForValue(
  pickType: string,
  value: number,
): CanonicalClvVerdict | null {
  if (!Number.isFinite(value)) return null;
  const epsilon = pickType === "MONEYLINE" ? MONEYLINE_MATCH_EPSILON : 1e-9;
  if (value > epsilon) return "BEAT_CLOSE";
  if (value < -epsilon) return "LOST_TO_CLOSE";
  return "MATCHED_CLOSE";
}
