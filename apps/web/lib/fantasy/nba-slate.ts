/**
 * FICTIONAL NBA DFS slate — all players, salaries, and projections are
 * invented for optimizer/validation testing. Not real contest data.
 * Real NBA team codes are used for roster-shape realism only.
 */

export type NbaPosition = "PG" | "SG" | "SF" | "PF" | "C";

export interface NbaPlayer {
  id: string;
  name: string;
  team: string;
  positions: NbaPosition[];
  salary: number;
  projection: number;
}

export const NBA_SALARY_CAP = 50_000;

/** DraftKings NBA Classic: PG, SG, SF, PF, C, G (PG/SG), F (SF/PF), UTIL (any). */
export const NBA_SLOTS: NbaPosition[][] = [
  ["PG"],
  ["SG"],
  ["SF"],
  ["PF"],
  ["C"],
  ["PG", "SG"],
  ["SF", "PF"],
  ["PG", "SG", "SF", "PF", "C"],
];

export const NBA_LINEUP_SIZE = NBA_SLOTS.length;

export const NBA_SLATE: NbaPlayer[] = [
  { id: "nba01", name: "Marcus Bell", team: "BOS", positions: ["PG"], salary: 9200, projection: 48.5 },
  { id: "nba02", name: "DeAndre Cole", team: "BOS", positions: ["SG", "SF"], salary: 7800, projection: 36.2 },
  { id: "nba03", name: "Tyrone Webb", team: "BOS", positions: ["PF", "C"], salary: 8400, projection: 40.1 },
  { id: "nba04", name: "Julian Frost", team: "LAL", positions: ["PG", "SG"], salary: 8900, projection: 45.0 },
  { id: "nba05", name: "Eddie Marsh", team: "LAL", positions: ["SF"], salary: 6200, projection: 28.4 },
  { id: "nba06", name: "Chris Dalton", team: "LAL", positions: ["PF"], salary: 7100, projection: 33.7 },
  { id: "nba07", name: "Ray Porter", team: "LAL", positions: ["C"], salary: 6800, projection: 31.9 },
  { id: "nba08", name: "Sam Whitaker", team: "DEN", positions: ["PG"], salary: 7500, projection: 35.6 },
  { id: "nba09", name: "Leo Grant", team: "DEN", positions: ["SG"], salary: 5900, projection: 26.8 },
  { id: "nba10", name: "Victor Hale", team: "DEN", positions: ["SF", "PF"], salary: 8100, projection: 38.3 },
  { id: "nba11", name: "Owen Drake", team: "DEN", positions: ["C"], salary: 9500, projection: 51.2 },
  { id: "nba12", name: "Paul Reyes", team: "GSW", positions: ["PG", "SG"], salary: 8300, projection: 39.9 },
  { id: "nba13", name: "Nate Sullivan", team: "GSW", positions: ["SF"], salary: 5600, projection: 24.1 },
  { id: "nba14", name: "Kyle Benson", team: "GSW", positions: ["PF"], salary: 5400, projection: 23.5 },
  { id: "nba15", name: "Andre Moss", team: "GSW", positions: ["C"], salary: 6100, projection: 27.2 },
  { id: "nba16", name: "Devon Price", team: "NYK", positions: ["PG"], salary: 6900, projection: 32.4 },
  { id: "nba17", name: "Carlos Vega", team: "NYK", positions: ["SG", "SF"], salary: 6400, projection: 29.8 },
  { id: "nba18", name: "Brian Holt", team: "NYK", positions: ["PF"], salary: 5800, projection: 25.9 },
  { id: "nba19", name: "Gary Nolan", team: "NYK", positions: ["C"], salary: 5700, projection: 25.1 },
  { id: "nba20", name: "Trevor Shaw", team: "MIA", positions: ["PG", "SG"], salary: 5200, projection: 22.7 },
  { id: "nba21", name: "Will Osborne", team: "MIA", positions: ["SF", "PF"], salary: 5000, projection: 21.3 },
  { id: "nba22", name: "Henry Fox", team: "MIA", positions: ["C"], salary: 4800, projection: 20.2 },
  { id: "nba23", name: "Derek Vaughn", team: "DAL", positions: ["PG"], salary: 8700, projection: 43.6 },
  { id: "nba24", name: "Sean Riley", team: "DAL", positions: ["SG"], salary: 5300, projection: 23.0 },
  { id: "nba25", name: "Frank Lowe", team: "DAL", positions: ["SF", "PF"], salary: 5100, projection: 21.9 },
  { id: "nba26", name: "Peter Crane", team: "DAL", positions: ["C"], salary: 4600, projection: 19.4 },
  { id: "nba27", name: "Aaron Steele", team: "PHX", positions: ["PG", "SG"], salary: 4400, projection: 18.1 },
  { id: "nba28", name: "Jonah Pierce", team: "PHX", positions: ["PF", "C"], salary: 4200, projection: 17.0 },
];

export interface NbaLineupValidation {
  valid: boolean;
  errors: string[];
  totalSalary: number;
  totalProjection: number;
}

export function validateNbaLineup(lineup: NbaPlayer[]): NbaLineupValidation {
  const errors: string[] = [];
  const totalSalary = lineup.reduce((sum, p) => sum + p.salary, 0);
  const totalProjection = lineup.reduce((sum, p) => sum + p.projection, 0);

  if (lineup.length !== NBA_LINEUP_SIZE) {
    errors.push(`Lineup must have ${NBA_LINEUP_SIZE} players, got ${lineup.length}`);
  }

  const ids = lineup.map((p) => p.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("Lineup contains duplicate players");
  }

  if (totalSalary > NBA_SALARY_CAP) {
    errors.push(`Salary ${totalSalary} exceeds cap ${NBA_SALARY_CAP}`);
  }

  // Slot-feasibility check: each player must fit at least one slot, and the
  // full 8 must be assignable to distinct slots (bipartite match via DFS).
  const fits = lineup.map((p) => NBA_SLOTS.map((slot) => p.positions.some((pos) => slot.includes(pos))));
  const slotMatch: number[] = new Array(NBA_LINEUP_SIZE).fill(-1);
  const canAssign = (playerIdx: number, seen: boolean[]): boolean => {
    const row = fits[playerIdx];
    if (!row) return false;
    return row.some((ok, slotIdx) => {
      if (!ok || seen[slotIdx] === true) return false;
      seen[slotIdx] = true;
      const occupant = slotMatch[slotIdx] ?? -1;
      if (occupant === -1 || canAssign(occupant, seen)) {
        slotMatch[slotIdx] = playerIdx;
        return true;
      }
      return false;
    });
  };

  let assignable = 0;
  lineup.forEach((p, i) => {
    const row = fits[i];
    if (!row || !row.some(Boolean)) {
      errors.push(`Player ${p.id} (${p.name}) fits no roster slot`);
    } else if (canAssign(i, new Array(NBA_LINEUP_SIZE).fill(false))) {
      assignable += 1;
    }
  });
  if (lineup.length === NBA_LINEUP_SIZE && assignable !== NBA_LINEUP_SIZE) {
    errors.push("Lineup cannot fill all roster slots by position eligibility");
  }

  return { valid: errors.length === 0, errors, totalSalary, totalProjection };
}
