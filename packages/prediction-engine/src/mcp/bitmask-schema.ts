import { createHash } from "node:crypto";

export type League = "NFL" | "NBA" | "NHL" | "CFB";

export interface GameContextBitmaskInput {
  readonly gameId: string;
  readonly league: League;
  readonly temperatureF: number;
  readonly windSpeedMph: number;
  readonly precipitationRateMmHr: number;
  readonly altitudeFt: number;
  readonly surfaceTractionCoeff: number;
  readonly isDome: boolean;
  readonly daysRestHome: number;
  readonly daysRestAway: number;
  readonly timeZoneShiftHours: number;
  readonly homeInteriorOlOutCount: number;
  readonly awayInteriorOlOutCount: number;
  readonly homeIlb1Out: boolean;
  readonly homeIlb2Out: boolean;
  readonly awayIlb1Out: boolean;
  readonly awayIlb2Out: boolean;
  readonly homeProjectedSackRate: number;
  readonly awayProjectedSackRate: number;
  readonly homeCb1Out: boolean;
  readonly awayCb1Out: boolean;
  readonly homeNickelCbActive: boolean;
  readonly awayNickelCbActive: boolean;
  readonly totalSteamMovePts: number;
  readonly spreadLineAbs: number;
  readonly homeRookieRouteRampInflection: boolean;
  readonly awayRookieRouteRampInflection: boolean;
  readonly qbRushPropHookInDangerZone: boolean;
}

export interface ContextualBitmaskReceipt {
  readonly words: Uint32Array;
  readonly hexString: string;
  readonly sha256Digest: string;
  readonly activeBitIndices: readonly number[];
  readonly secondOrderFlags: {
    readonly mutualDefSpineVoid: boolean;
    readonly olAttritionNeutralizedByZeroRush: boolean;
    readonly ilbVoidNickelActiveTeRbFunnel: boolean;
    readonly calmWeatherExtendedFgYacRegime: boolean;
    readonly qbKneeldownHookHazard: boolean;
    readonly rookieRampVsDepletedCb1: boolean;
  };
}

const LEAGUE_NIBBLE: Record<League, number> = {
  NFL: 0b0001,
  NBA: 0b0010,
  NHL: 0b0011,
  CFB: 0b0100,
};

export function setBit(words: Uint32Array, bitIndex: number): void {
  if (bitIndex < 0 || bitIndex >= 288) {
    throw new RangeError(`Bit index ${bitIndex} out of bounds [0, 287]`);
  }
  const wordIdx = Math.floor(bitIndex / 32);
  const offset = bitIndex % 32;
  words[wordIdx] = (words[wordIdx]! | (1 << offset)) >>> 0;
}

export function getBit(words: Uint32Array, bitIndex: number): boolean {
  const wordIdx = Math.floor(bitIndex / 32);
  const offset = bitIndex % 32;
  return ((words[wordIdx]! >>> offset) & 1) === 1;
}

export function buildContextualBitmask288(
  ctx: GameContextBitmaskInput,
): ContextualBitmaskReceipt {
  const words = new Uint32Array(9);

  if (ctx.temperatureF < 32) setBit(words, 0);
  else if (ctx.temperatureF < 50) setBit(words, 1);
  else if (ctx.temperatureF <= 70) setBit(words, 2);
  else setBit(words, 3);

  if (ctx.windSpeedMph <= 8.0) setBit(words, 4);
  else if (ctx.windSpeedMph <= 15.0) setBit(words, 5);
  else if (ctx.windSpeedMph <= 22.0) setBit(words, 6);
  else setBit(words, 7);

  if (ctx.precipitationRateMmHr > 0.1) setBit(words, 10);
  if (ctx.altitudeFt > 4000) setBit(words, 13);
  if (ctx.surfaceTractionCoeff < 0.75) setBit(words, 14);
  if (ctx.isDome) setBit(words, 15);

  if (ctx.daysRestHome <= 4 || ctx.daysRestAway <= 4) setBit(words, 16);
  if (ctx.daysRestHome >= 13 || ctx.daysRestAway >= 13) setBit(words, 17);
  if (ctx.timeZoneShiftHours >= 1) setBit(words, 22);

  if (ctx.homeInteriorOlOutCount >= 2) setBit(words, 41);
  if (ctx.awayInteriorOlOutCount >= 2) setBit(words, 57);

  if (ctx.homeIlb1Out) setBit(words, 72);
  if (ctx.homeIlb2Out) setBit(words, 73);
  if (ctx.homeProjectedSackRate < 0.045) setBit(words, 76);
  if (ctx.awayIlb1Out) setBit(words, 88);
  if (ctx.awayIlb2Out) setBit(words, 89);
  if (ctx.awayProjectedSackRate < 0.045) setBit(words, 92);

  if (ctx.homeCb1Out) setBit(words, 96);
  if (ctx.homeNickelCbActive) setBit(words, 100);
  if (ctx.awayCb1Out) setBit(words, 112);
  if (ctx.awayNickelCbActive) setBit(words, 116);

  if (Math.abs(ctx.totalSteamMovePts) >= 3.0) setBit(words, 140);
  if (Math.abs(ctx.spreadLineAbs - 3.0) < 0.01) setBit(words, 152);

  if (ctx.homeRookieRouteRampInflection) setBit(words, 216);
  if (ctx.awayRookieRouteRampInflection) setBit(words, 220);

  const mutualDefSpineVoid =
    getBit(words, 72) &&
    getBit(words, 73) &&
    (getBit(words, 112) || (getBit(words, 88) && getBit(words, 89)));
  if (mutualDefSpineVoid) setBit(words, 224);

  const olAttritionNeutralizedByZeroRush = getBit(words, 57) && getBit(words, 76);
  if (olAttritionNeutralizedByZeroRush) setBit(words, 225);

  const ilbVoidNickelActiveTeRbFunnel =
    (getBit(words, 72) && getBit(words, 73) && getBit(words, 100)) ||
    (getBit(words, 88) && getBit(words, 89) && getBit(words, 116));
  if (ilbVoidNickelActiveTeRbFunnel) setBit(words, 226);

  const calmWeatherExtendedFgYacRegime =
    getBit(words, 2) && getBit(words, 4) && !getBit(words, 10) && getBit(words, 224);
  if (calmWeatherExtendedFgYacRegime) setBit(words, 228);

  const qbKneeldownHookHazard =
    ctx.qbRushPropHookInDangerZone && getBit(words, 152);
  if (qbKneeldownHookHazard) {
    setBit(words, 230);
    // Word 8 endgame hazards from the league table. 280 kneel, 281 checkdown.
    setBit(words, 280);
    setBit(words, 281);
  }

  const rookieRampVsDepletedCb1 =
    (getBit(words, 216) && getBit(words, 112)) ||
    (getBit(words, 220) && getBit(words, 96));
  if (rookieRampVsDepletedCb1) setBit(words, 234);

  const nibble = LEAGUE_NIBBLE[ctx.league];
  for (let i = 0; i < 4; i++) {
    if ((nibble & (1 << i)) !== 0) setBit(words, 256 + i);
  }

  const activeBitIndices: number[] = [];
  for (let b = 0; b < 288; b++) if (getBit(words, b)) activeBitIndices.push(b);

  const hexString = Array.from(words)
    .map((w) => w.toString(16).padStart(8, "0"))
    .join("");
  const sha256Digest = createHash("sha256").update(hexString).digest("hex");

  return {
    words,
    hexString,
    sha256Digest,
    activeBitIndices,
    secondOrderFlags: {
      mutualDefSpineVoid,
      olAttritionNeutralizedByZeroRush,
      ilbVoidNickelActiveTeRbFunnel,
      calmWeatherExtendedFgYacRegime,
      qbKneeldownHookHazard,
      rookieRampVsDepletedCb1,
    },
  };
}

export const NE_CHI_20261022_BITMASK_INPUT: GameContextBitmaskInput = {
  gameId: "2026-10-22-NE-CHI",
  league: "NFL",
  temperatureF: 56.6,
  windSpeedMph: 5.1,
  precipitationRateMmHr: 0,
  altitudeFt: 597,
  surfaceTractionCoeff: 0.92,
  isDome: false,
  daysRestHome: 4,
  daysRestAway: 4,
  timeZoneShiftHours: 0,
  homeInteriorOlOutCount: 0,
  awayInteriorOlOutCount: 2,
  homeIlb1Out: true,
  homeIlb2Out: true,
  awayIlb1Out: false,
  awayIlb2Out: false,
  homeProjectedSackRate: 0.032,
  awayProjectedSackRate: 0.08,
  homeCb1Out: false,
  awayCb1Out: true,
  homeNickelCbActive: true,
  awayNickelCbActive: false,
  totalSteamMovePts: 3.5,
  spreadLineAbs: 3.0,
  homeRookieRouteRampInflection: true,
  awayRookieRouteRampInflection: false,
  qbRushPropHookInDangerZone: true,
};

/** Bits the 2026-10-22 NE @ CHI card must set. Schema-version nibble stays 0 so the locked pattern matches the autopsy table exactly. */
export const NE_CHI_20261022_REQUIRED_BITS = [
  2, 4, 16, 57, 72, 73, 76, 100, 112, 140, 152, 216, 224, 225, 226, 228, 230, 234, 256, 280, 281,
] as const;

/** Bits present in exactly one of the two masks. */
export function bitmaskXorIndices(left: readonly number[], right: readonly number[]): number[] {
  const a = new Set(left);
  const b = new Set(right);
  const flipped: number[] = [];
  for (const bit of a) if (!b.has(bit)) flipped.push(bit);
  for (const bit of b) if (!a.has(bit)) flipped.push(bit);
  return flipped.sort((x, y) => x - y);
}
