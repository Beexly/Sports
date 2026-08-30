/**
 * Synthetic NFL-like panel for R-10. Not nflverse, not a game table, not
 * the odds archive. Rows mimic the injury-report fields the prototype
 * would consume (QB report_status Out/Limited) so the DML code has a
 * stable contract. Real nflverse is not in this workspace; swapping the
 * generator for a loader is a follow-up, not this prototype.
 *
 * Seeded, pure, no I/O.
 */

export type QbStatus = "active" | "limited" | "out";

export interface DmlGameRow {
  readonly season: number;
  readonly week: number;
  readonly team: number;
  readonly opponent: number;
  /** 1 if this team's starting QB is out or limited. */
  readonly treatment: 0 | 1;
  readonly qbStatus: QbStatus;
  readonly win: 0 | 1;
  readonly restDays: number;
  readonly travelKm: number;
  readonly strengthMean: number;
  readonly strengthVar: number;
  readonly opponentStrength: number;
}

export interface PanelDesign {
  readonly nTeams: number;
  readonly nWeeks: number;
  readonly nSeasons: number;
  /** True ATT on the win-probability scale, used only to plant. */
  readonly plantedAtt: number;
}

export const DEFAULT_PANEL: PanelDesign = {
  nTeams: 8,
  nWeeks: 18,
  nSeasons: 2,
  plantedAtt: -0.08,
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bernoulli(rand: () => number, p: number): 0 | 1 {
  return rand() < p ? 1 : 0;
}

function sigmoid(z: number): number {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

/** Time index for sorting / folds: season*100 + week. */
export function timeIndex(row: DmlGameRow): number {
  return row.season * 100 + row.week;
}

/**
 * Generate a balanced schedule-ish panel. Treatment probability depends
 * on rest/travel (confounding). Outcome depends on strength + treatment.
 */
export function generateDmlPanel(seed: number, design: PanelDesign = DEFAULT_PANEL): DmlGameRow[] {
  const rand = mulberry32(seed);
  const strength = new Float64Array(design.nTeams);
  for (let t = 0; t < design.nTeams; t++) strength[t] = (rand() - 0.5) * 0.8;
  const rows: DmlGameRow[] = [];
  for (let season = 1; season <= design.nSeasons; season++) {
    for (let week = 1; week <= design.nWeeks; week++) {
      const teams = Array.from({ length: design.nTeams }, (_, i) => i);
      for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = teams[i]!;
        teams[i] = teams[j]!;
        teams[j] = tmp;
      }
      for (let p = 0; p + 1 < teams.length; p += 2) {
        const home = teams[p]!;
        const away = teams[p + 1]!;
        pushGame(rows, rand, design, season, week, home, away, strength);
        pushGame(rows, rand, design, season, week, away, home, strength);
      }
    }
  }
  return rows;
}

function pushGame(
  rows: DmlGameRow[],
  rand: () => number,
  design: PanelDesign,
  season: number,
  week: number,
  team: number,
  opponent: number,
  strength: Float64Array,
): void {
  const restDays = 4 + Math.floor(rand() * 5);
  const travelKm = rand() * 3000;
  const strengthMean = strength[team]!;
  const strengthVar = 0.05 + rand() * 0.1;
  const opponentStrength = strength[opponent]!;
  const prop =
    0.08 + 0.04 * (restDays < 6 ? 1 : 0) + 0.03 * (travelKm > 1500 ? 1 : 0);
  const treatment: 0 | 1 = bernoulli(rand, Math.min(0.35, prop));
  const qbStatus: QbStatus = treatment === 0 ? "active" : rand() < 0.5 ? "out" : "limited";
  const logit =
    0.15 +
    1.2 * (strengthMean - opponentStrength) +
    0.04 * (restDays - 6) -
    0.00004 * travelKm +
    design.plantedAtt * 4 * treatment;
  const win = bernoulli(rand, sigmoid(logit));
  rows.push({
    season,
    week,
    team,
    opponent,
    treatment,
    qbStatus,
    win,
    restDays,
    travelKm,
    strengthMean,
    strengthVar,
    opponentStrength,
  });
}
