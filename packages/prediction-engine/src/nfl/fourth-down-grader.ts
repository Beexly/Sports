export type FourthDownCall = "go" | "kick" | "punt";

export interface FourthDownPlayInput {
  readonly gameId: string;
  readonly playId: string;
  readonly call: FourthDownCall;
  readonly optimalCall: FourthDownCall;
  readonly wpActual: number;
  readonly wpOptimal: number;
  readonly team: string;
  readonly season: number;
  readonly week: number;
}

export type FourthDownGrade = "A" | "B" | "C" | "D";

export interface FourthDownGradeRow extends FourthDownPlayInput {
  readonly wpLost: number;
  readonly grade: FourthDownGrade;
}

export interface FourthDownTeamAggregate {
  readonly team: string;
  readonly season: number;
  readonly week: number;
  readonly plays: number;
  readonly goRate: number;
  readonly meanWpLost: number;
  readonly gradeCounts: Readonly<Record<FourthDownGrade, number>>;
}

function clampProbability(value: number): number | null {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

/** Grade one call from the already-computed WP difference (no heuristic penalty). */
export function gradeFourthDownPlay(input: FourthDownPlayInput): FourthDownGradeRow | null {
  const wpActual = clampProbability(input.wpActual);
  const wpOptimal = clampProbability(input.wpOptimal);
  if (wpActual === null || wpOptimal === null) return null;
  const wpLost = Math.max(0, wpOptimal - wpActual);
  const grade: FourthDownGrade = wpLost <= 0.005 ? "A" : wpLost <= 0.01 ? "B" : wpLost <= 0.03 ? "C" : "D";
  return { ...input, wpActual, wpOptimal, wpLost, grade };
}

export function aggregateFourthDownGrades(rows: readonly FourthDownGradeRow[]): readonly FourthDownTeamAggregate[] {
  const groups = new Map<string, FourthDownGradeRow[]>();
  for (const row of rows) {
    const key = `${row.team}:${row.season}:${row.week}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    team: group[0]!.team,
    season: group[0]!.season,
    week: group[0]!.week,
    plays: group.length,
    goRate: group.filter((row) => row.call === "go").length / group.length,
    meanWpLost: group.reduce((sum, row) => sum + row.wpLost, 0) / group.length,
    gradeCounts: {
      A: group.filter((row) => row.grade === "A").length,
      B: group.filter((row) => row.grade === "B").length,
      C: group.filter((row) => row.grade === "C").length,
      D: group.filter((row) => row.grade === "D").length,
    },
  }));
}

export function gradeFourthDownCalls(
  inputs: readonly FourthDownPlayInput[],
): { readonly rows: readonly FourthDownGradeRow[]; readonly aggregates: readonly FourthDownTeamAggregate[] } {
  const rows = inputs.map(gradeFourthDownPlay).filter((row): row is FourthDownGradeRow => row !== null);
  return { rows, aggregates: aggregateFourthDownGrades(rows) };
}
