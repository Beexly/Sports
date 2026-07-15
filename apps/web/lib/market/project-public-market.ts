import {
  formatAmericanOdds,
  formatMarketPoint,
  formatSignedMarketPoint,
  normalizeAmericanOdds,
  normalizeMarketPoint,
  type PickType,
} from "@sports/types";

export interface PublicMarketProjection {
  readonly pickType: PickType;
  readonly selection: string;
  readonly line: number;
  readonly lineMovement: {
    readonly opening: number;
    readonly current: number;
  } | null;
}

export function projectPublicMarket(input: {
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly sport: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly openingSpread?: number | null;
  readonly openingTotal?: number | null;
}): PublicMarketProjection | null {
  const pickType = normalizePickType(input.pickType);
  if (!pickType) return null;

  if (pickType === "MONEYLINE") {
    const line = normalizeAmericanOdds(input.line);
    const side = selectedSide(input.selection, input.homeTeam, input.awayTeam);
    if (!line || !side) return null;
    const team = side === "home" ? input.homeTeam : input.awayTeam;
    const canonicalSelection = `${team} ML (${formatAmericanOdds(line.normalized)})`;
    if (!sameSelection(input.selection, canonicalSelection)) return null;
    return {
      pickType,
      selection: canonicalSelection,
      line: line.normalized,
      lineMovement: null,
    };
  }

  const unit = pickType === "SPREAD" ? "SPREAD_POINTS" : "TOTAL_POINTS";
  const line = normalizeMarketPoint(unit, input.sport, input.line);
  if (!line) return null;

  if (pickType === "TOTAL") {
    const direction = /\bOVER\b/i.test(input.selection)
      ? "OVER"
      : /\bUNDER\b/i.test(input.selection)
        ? "UNDER"
        : null;
    if (!direction) return null;
    const canonicalSelection = `${direction} ${formatMarketPoint(line.normalized)}`;
    if (!sameSelection(input.selection, canonicalSelection)) return null;
    const opening = normalizeMarketPoint("TOTAL_POINTS", input.sport, input.openingTotal);
    return {
      pickType,
      selection: canonicalSelection,
      line: line.normalized,
      lineMovement: opening
        ? { opening: opening.normalized, current: line.normalized }
        : null,
    };
  }

  const side = selectedSide(input.selection, input.homeTeam, input.awayTeam);
  if (!side) return null;
  const team = side === "home" ? input.homeTeam : input.awayTeam;
  const selectedLine = side === "home" ? line.normalized : -line.normalized;
  const canonicalSelection = `${team} ${formatSignedMarketPoint(selectedLine)}`;
  if (!sameSelection(input.selection, canonicalSelection)) return null;
  const opening = normalizeMarketPoint("SPREAD_POINTS", input.sport, input.openingSpread);
  return {
    pickType,
    selection: canonicalSelection,
    line: line.normalized,
    lineMovement: opening
      ? { opening: opening.normalized, current: line.normalized }
      : null,
  };
}

function sameSelection(raw: string, canonical: string): boolean {
  return raw.trim().toLocaleUpperCase("en-US") === canonical.toLocaleUpperCase("en-US");
}

function normalizePickType(raw: string): PickType | null {
  return raw === "SPREAD" || raw === "TOTAL" || raw === "MONEYLINE" ? raw : null;
}

function selectedSide(
  selection: string,
  homeTeam: string,
  awayTeam: string,
): "home" | "away" | null {
  const normalized = selection.toLocaleUpperCase("en-US");
  const candidates: Array<["home" | "away", string]> = [
    ["home", homeTeam],
    ["away", awayTeam],
  ];
  candidates.sort((a, b) => b[1].length - a[1].length);
  for (const [side, team] of candidates) {
    if (team && normalized.includes(team.toLocaleUpperCase("en-US"))) return side;
  }
  return null;
}
