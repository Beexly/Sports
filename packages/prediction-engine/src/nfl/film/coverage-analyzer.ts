export type CoverageLabel = "Cover 0" | "Cover 1" | "Cover 2" | "Cover 3" | "Cover 4/Quarters" | "Cover 6" | "Cover 1 Man";

export interface CoveragePlayer {
  readonly x: number;
  readonly y: number;
  readonly team: "offense" | "defense";
  readonly confidence: number;
}

export interface CoverageFrame {
  readonly time: number;
  readonly players: readonly CoveragePlayer[];
}

export interface PlayCoverage {
  readonly preSnap: CoverageLabel;
  readonly postSnap: CoverageLabel;
  readonly disguised: boolean;
}

export interface TeamCoverageSummary {
  readonly coverageDistribution: Readonly<Record<string, number>>;
  readonly disguiseRate: number;
  readonly tendencyByDownDistance: Readonly<Record<string, CoverageLabel>>;
}

function geometry(players: readonly CoveragePlayer[]): { highSafety: number; box: number; leverage: number } {
  const defense = players.filter((player) => player.team === "defense");
  if (defense.length === 0) throw new Error("coverage frame requires defensive players");
  const safeties = defense.filter((player) => player.y < 18);
  const high = safeties.filter((player) => player.y < 10.8);
  const box = defense.filter((player) => player.y < 27).length;
  const corners = defense.filter((player) => player.x < 25 || player.x > 75);
  const leverage = corners.length === 0 ? 0 : corners.reduce((sum, player) => sum + Math.abs(player.x - 50) / 50, 0) / corners.length;
  return { highSafety: high.length, box, leverage };
}

function classify(players: readonly CoveragePlayer[]): CoverageLabel {
  const value = geometry(players);
  if (value.highSafety >= 2 && value.box <= 7) return "Cover 3";
  if (value.highSafety === 1 && value.box <= 6 && value.leverage > 0.45) return "Cover 1 Man";
  if (value.highSafety >= 2) return "Cover 2";
  if (value.highSafety === 1 && value.box <= 7) return "Cover 1 Man";
  if (value.box >= 8) return "Cover 0";
  if (value.leverage > 0.65) return "Cover 4/Quarters";
  return "Cover 6";
}

export function analyzeCoverage(frames: readonly CoverageFrame[]): PlayCoverage {
  if (frames.length < 2) throw new Error("coverage analysis needs pre-snap and post-snap frames");
  const preSnap = classify(frames[0]!.players);
  const postSnap = classify(frames[1]!.players);
  return { preSnap, postSnap, disguised: preSnap !== postSnap };
}

export function summarizeCoverage(
  plays: ReadonlyArray<{ play: PlayCoverage; down: number; distance: number }>,
): TeamCoverageSummary {
  const distribution: Record<string, number> = {};
  const tendencyByDownDistance: Record<string, CoverageLabel> = {};
  let disguised = 0;
  for (const row of plays) {
    distribution[row.play.preSnap] = (distribution[row.play.preSnap] ?? 0) + 1;
    tendencyByDownDistance[`${row.down}-${row.distance}`] = row.play.preSnap;
    disguised += Number(row.play.disguised);
  }
  return {
    coverageDistribution: distribution,
    disguiseRate: plays.length === 0 ? 0 : disguised / plays.length,
    tendencyByDownDistance,
  };
}
