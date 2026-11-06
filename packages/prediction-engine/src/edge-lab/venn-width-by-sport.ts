/**
 * Sport-stratified Venn–Abers width veto mill.
 *
 * Flash (2026-09-18, VENN-WIDTH-MEASURE): median width 0.024; a global
 * Δp > 0.20 vetoes 23% overall and 40% of NFL. A single cap is a sport
 * lottery. This mill reports veto rates BY SPORT for a caller-supplied
 * cap. It does not invent a new NFL number and it does not default
 * maxWidthForFire — the gate stays caller-supplied and off.
 *
 * FLASH_VENN_WIDTH_MEASURE is a citation of flash's finding, not a
 * re-measurement of production rows. dbQueried is always false.
 *
 * SHADOW. priced false.
 */

/** Citation. Source: flash/20260918T194145225Z-669d. Not re-run here. */
export const FLASH_VENN_WIDTH_MEASURE = {
  recordedAt: "2026-09-18",
  source: "flash/20260918T194145225Z-669d",
  medianWidth: 0.024,
  globalCap: 0.2,
  vetoOverall: 0.23,
  vetoNfl: 0.4,
} as const;

export type VennWidthRow = {
  readonly sport: string;
  readonly width: number;
  /** True when the row would otherwise have fired (cleared τ). Width veto is inside that branch. */
  readonly wouldFireWithoutWidthCap: boolean;
};

export type VennWidthSportCard = {
  readonly sport: string;
  readonly n: number;
  readonly fireEligible: number;
  readonly vetoed: number;
  readonly vetoRate: number | null;
  readonly medianWidth: number | null;
  readonly licensed: boolean;
};

export type VennWidthReport = {
  readonly cap: number;
  readonly n: number;
  readonly overall: VennWidthSportCard;
  readonly bySport: readonly VennWidthSportCard[];
  /**
   * True when some sport's veto rate differs from overall by ≥ 0.10 at
   * licensed sample. That is the lottery: one cap, two sports, two regimes.
   */
  readonly globalCapIsSportLottery: boolean;
  readonly priced: false;
  readonly status: "shadow";
  readonly dbQueried: false;
  readonly flashCitation: typeof FLASH_VENN_WIDTH_MEASURE;
};

export const VENN_WIDTH_MIN_N = 20;

function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function card(sport: string, rows: readonly VennWidthRow[], cap: number): VennWidthSportCard {
  const eligible = rows.filter((r) => r.wouldFireWithoutWidthCap);
  const vetoed = eligible.filter((r) => r.width > cap);
  const licensed = eligible.length >= VENN_WIDTH_MIN_N;
  return {
    sport,
    n: rows.length,
    fireEligible: eligible.length,
    vetoed: vetoed.length,
    vetoRate: eligible.length > 0 ? vetoed.length / eligible.length : null,
    medianWidth: median(rows.map((r) => r.width)),
    licensed,
  };
}

/**
 * Measure sport-stratified width-veto rates at a caller-supplied cap.
 * Throws on empty or a cap outside (0, 1]. Does not pick a production cap.
 */
export function measureVennWidthBySport(
  rows: readonly VennWidthRow[],
  cap: number,
): VennWidthReport {
  if (rows.length === 0) {
    throw new RangeError("measureVennWidthBySport: empty sample");
  }
  if (!(cap > 0 && cap <= 1) || !Number.isFinite(cap)) {
    throw new RangeError(`measureVennWidthBySport: cap must be in (0, 1], got ${cap}`);
  }
  for (const row of rows) {
    if (!(row.width >= 0) || !Number.isFinite(row.width)) {
      throw new RangeError(`measureVennWidthBySport: width must be finite ≥ 0, got ${row.width}`);
    }
  }
  const bySportMap = new Map<string, VennWidthRow[]>();
  for (const row of rows) {
    const list = bySportMap.get(row.sport) ?? [];
    list.push(row);
    bySportMap.set(row.sport, list);
  }
  const bySport = [...bySportMap.keys()].sort().map((sport) => card(sport, bySportMap.get(sport)!, cap));
  const overall = card("ALL", rows, cap);
  const licensedSports = bySport.filter((s) => s.licensed && s.vetoRate != null);
  const globalCapIsSportLottery = licensedSports.some(
    (s) => overall.vetoRate != null && Math.abs(s.vetoRate! - overall.vetoRate) >= 0.1,
  );
  return {
    cap,
    n: rows.length,
    overall,
    bySport,
    globalCapIsSportLottery,
    priced: false,
    status: "shadow",
    dbQueried: false,
    flashCitation: FLASH_VENN_WIDTH_MEASURE,
  };
}
