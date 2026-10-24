/**
 * Public ranking boards. Facts only: rank, team, points, injury status.
 * No expert notes. No login. Scoring does not read this.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface EcrPlayer {
  id: number;
  name: string;
  team: string;
  pos: string;
  ecr: number;
  min: string;
  max: string;
  ave: string;
  std: string;
  pts?: string;
  opp?: string;
}

export interface FbgPlayer {
  id: string;
  name: string;
  rank: number;
  team: string;
  pts: number;
}

interface FpFile {
  season: number;
  week: number;
  boards: Array<{ position: string; scoring: string; experts: number; count: number; players: EcrPlayer[] }>;
  draft: Array<{ position: string; scoring: string; experts: number; count: number; players: EcrPlayer[] }>;
  injuries: Array<{ id: number; name: string; team: string; pos: string; status: string; injury: string; updated: string; ecr: number }>;
}

interface FbgFile {
  season: number;
  week: number;
  weekly: Array<{ position: string; count: number; players: FbgPlayer[] }>;
  bob_harris_qb: FbgPlayer[];
}

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(__dirname, "data", "public-boards", name), "utf8")) as T;
}

let fpCache: FpFile | null = null;
let fbgCache: FbgFile | null = null;

function fp(): FpFile {
  return (fpCache ??= load<FpFile>("fantasypros-week7-2026.json"));
}
function fbg(): FbgFile {
  return (fbgCache ??= load<FbgFile>("footballguys-week7-2026.json"));
}

export function fantasyProsWeekly(position: string): EcrPlayer[] {
  return fp().boards.find((b) => b.position === position)?.players ?? [];
}

export function fantasyProsDraft(position: string): EcrPlayer[] {
  return fp().draft.find((b) => b.position === position)?.players ?? [];
}

export function footballguysWeekly(position: string): FbgPlayer[] {
  return fbg().weekly.find((b) => b.position === position)?.players ?? [];
}

export function bobHarrisQuarterbacks(): FbgPlayer[] {
  return fbg().bob_harris_qb;
}

export function fantasyProsInjury(name: string) {
  const key = name.toLowerCase();
  return fp().injuries.find((row) => row.name.toLowerCase() === key) ?? null;
}

export function fantasyProsInjuryCount(): number {
  return fp().injuries.length;
}

/** Where the two public week-7 QB boards do not share a name at the same rank. */
export function week7QuarterbackGaps(limit = 15): Array<{ name: string; team: string; fantasyPros: number; footballguys: number; gap: number }> {
  const theirs = new Map(footballguysWeekly("QB").map((p) => [p.name.toLowerCase(), p]));
  const gaps = [];
  for (const row of fantasyProsWeekly("QB")) {
    const other = theirs.get(row.name.toLowerCase());
    if (!other) continue;
    const gap = other.rank - row.ecr;
    if (gap === 0) continue;
    gaps.push({ name: row.name, team: row.team, fantasyPros: row.ecr, footballguys: other.rank, gap });
  }
  gaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  return gaps.slice(0, limit);
}
