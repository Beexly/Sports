/**
 * GSE Ownership CSV parser.
 *
 * Accepts user-uploaded ownership projection CSVs:
 *   Name, Team, Position, Ownership
 *
 * Ownership can be a decimal (0.25) or percentage (25); values > 1 are
 * divided by 100.
 */

export interface ParsedOwnershipRow {
  name: string;
  team: string;
  position: string;
  projectedOwnership: number; // always 0.0–1.0
}

const TEMPLATE_HEADER = "Name,Team,Position,Ownership";

export function ownershipCsvTemplate(): string {
  return (
    TEMPLATE_HEADER +
    "\n" +
    "Patrick Mahomes,KC,QB,0.25\n" +
    "Justin Jefferson,MIN,WR,18\n"
  );
}

function normalizeOwnership(raw: string): number {
  const val = parseFloat(raw.trim());
  if (isNaN(val)) {
    throw new Error(`Invalid ownership value: "${raw}"`);
  }
  return val > 1 ? val / 100 : val;
}

export function parseOwnershipCsv(csvText: string): ParsedOwnershipRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trimEnd());

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    headerIdx = i;
    break;
  }

  if (headerIdx === -1) {
    throw new Error("Ownership CSV is empty or contains only comments.");
  }

  const headers = lines[headerIdx]!.split(",").map((h) => h.trim());

  function col(name: string): number {
    return headers.indexOf(name);
  }

  const required = ["Name", "Team", "Position", "Ownership"] as const;
  for (const req of required) {
    if (col(req) === -1) {
      throw new Error(
        `Ownership CSV is missing required column "${req}". Found columns: ${headers.join(", ")}`
      );
    }
  }

  const colName = col("Name");
  const colTeam = col("Team");
  const colPosition = col("Position");
  const colOwnership = col("Ownership");

  const rows: ParsedOwnershipRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "") continue;

    const cells = line.split(",");

    const name = (cells[colName] ?? "").trim();
    const team = (cells[colTeam] ?? "").trim();
    const position = (cells[colPosition] ?? "").trim();
    const rawOwnership = (cells[colOwnership] ?? "").trim();

    if (!name || !team || !position || !rawOwnership) continue;

    const projectedOwnership = normalizeOwnership(rawOwnership);

    rows.push({ name, team, position, projectedOwnership });
  }

  return rows;
}
