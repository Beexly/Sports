/**
 * DraftKings salary CSV parser.
 *
 * Parses the CSV export from DK's lineup optimizer page:
 *   Position, Name + ID, Name, ID, Roster Position, Salary, Game Info, TeamAbbrev, AvgPointsPerGame
 *
 * The user downloads this CSV from DK (public, logged-off access) and
 * uploads it to the platform. We never scrape DK directly.
 */

export interface ParsedDkRow {
  position: string;
  name: string;
  sitePlayerId: string;
  rosterSlot: string;
  salary: number;
  gameInfo: string;
  team: string;
  opponent: string;
  avgPoints: number | null;
}

function parseOpponent(gameInfo: string, team: string): string {
  // gameInfo format: "KC@DEN 06:00PM ET" or "MIA@BUF 1:00PM ET"
  // The @ separates away@home; time follows a space.
  const matchup = gameInfo.split(" ")[0] ?? "";
  const parts = matchup.split("@");
  if (parts.length !== 2) return "";
  const [away, home] = parts as [string, string];
  const teamUpper = team.toUpperCase();
  if (teamUpper === away.toUpperCase()) return home;
  if (teamUpper === home.toUpperCase()) return away;
  return "";
}

function parseSalary(raw: string): number {
  const cleaned = raw.replace(/,/g, "").trim();
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? 0 : val;
}

function parseAvgPoints(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const val = parseFloat(raw.trim());
  return isNaN(val) ? null : val;
}

export function parseDkCsv(csvText: string): ParsedDkRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trimEnd());

  // Find first non-empty, non-comment line → header
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    headerIdx = i;
    break;
  }

  if (headerIdx === -1) {
    throw new Error("DK CSV is empty or contains only comments.");
  }

  const headers = lines[headerIdx]!.split(",").map((h) => h.trim());

  function col(name: string): number {
    return headers.indexOf(name);
  }

  const required = ["Position", "Name", "ID", "Salary", "TeamAbbrev"] as const;
  for (const req of required) {
    if (col(req) === -1) {
      throw new Error(
        `DK CSV is missing required column "${req}". Found columns: ${headers.join(", ")}`
      );
    }
  }

  const colPosition = col("Position");
  const colName = col("Name");
  const colId = col("ID");
  const colRosterPos = col("Roster Position");
  const colSalary = col("Salary");
  const colGameInfo = col("Game Info");
  const colTeam = col("TeamAbbrev");
  const colAvgPts = col("AvgPointsPerGame");

  const rows: ParsedDkRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const cells = line.split(",");

    const position = (cells[colPosition] ?? "").trim();
    const name = (cells[colName] ?? "").trim();
    const sitePlayerId = (cells[colId] ?? "").trim();
    const team = (cells[colTeam] ?? "").trim();

    if (!position || !name || !sitePlayerId || !team) continue;

    const salary = parseSalary(cells[colSalary] ?? "");
    const gameInfo = colGameInfo >= 0 ? (cells[colGameInfo] ?? "").trim() : "";
    const rosterSlot = colRosterPos >= 0 ? (cells[colRosterPos] ?? "").trim() : position;
    const avgPoints = parseAvgPoints(colAvgPts >= 0 ? cells[colAvgPts] : undefined);
    const opponent = gameInfo ? parseOpponent(gameInfo, team) : "";

    rows.push({
      position,
      name,
      sitePlayerId,
      rosterSlot,
      salary,
      gameInfo,
      team,
      opponent,
      avgPoints,
    });
  }

  return rows;
}
