/**
 * GSE Projection CSV parser.
 *
 * Accepts user-uploaded projection CSVs in the canonical GSE format:
 *   Name, Team, Position, Projection, Floor, Ceiling, Ownership, VolatilityNote, Notes
 *
 * Ownership can be expressed as a decimal (0.25) or percentage (25).
 * Values > 1 are treated as percentages and divided by 100.
 */

export interface ParsedProjectionRow {
  name: string;
  team: string;
  position: string;
  meanProjection: number;
  floorP10: number | null;
  ceilingP90: number | null;
  projectedOwnership: number | null; // always 0.0–1.0
  notes: string | null;
}

const TEMPLATE_HEADER =
  "Name,Team,Position,Projection,Floor,Ceiling,Ownership,VolatilityNote,Notes";

export function projectionCsvTemplate(): string {
  return (
    TEMPLATE_HEADER +
    "\n" +
    "Patrick Mahomes,KC,QB,28.5,18.0,48.0,0.25,,\n" +
    "Justin Jefferson,MIN,WR,22.0,10.0,42.0,18,,\n"
  );
}

function parseFloat2(raw: string | undefined): number | null {
  if (!raw || raw.trim() === "") return null;
  const val = parseFloat(raw.trim());
  return isNaN(val) ? null : val;
}

function normalizeOwnership(raw: string | undefined): number | null {
  const val = parseFloat2(raw);
  if (val === null) return null;
  return val > 1 ? val / 100 : val;
}

export function parseProjectionCsv(csvText: string): ParsedProjectionRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trimEnd());

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    headerIdx = i;
    break;
  }

  if (headerIdx === -1) {
    throw new Error("Projection CSV is empty or contains only comments.");
  }

  const headers = lines[headerIdx]!.split(",").map((h) => h.trim());

  function col(name: string): number {
    return headers.indexOf(name);
  }

  const required = ["Name", "Team", "Position", "Projection"] as const;
  for (const req of required) {
    if (col(req) === -1) {
      throw new Error(
        `Projection CSV is missing required column "${req}". Found columns: ${headers.join(", ")}`
      );
    }
  }

  const colName = col("Name");
  const colTeam = col("Team");
  const colPosition = col("Position");
  const colProjection = col("Projection");
  const colFloor = col("Floor");
  const colCeiling = col("Ceiling");
  const colOwnership = col("Ownership");
  const colNotes = col("Notes");

  const rows: ParsedProjectionRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "") continue;

    const cells = line.split(",");

    const name = (cells[colName] ?? "").trim();
    const team = (cells[colTeam] ?? "").trim();
    const position = (cells[colPosition] ?? "").trim();

    if (!name || !team || !position) continue;

    const rawProjection = (cells[colProjection] ?? "").trim();
    const meanProjection = parseFloat(rawProjection);
    if (isNaN(meanProjection) || meanProjection <= 0) {
      throw new Error(
        `Row ${i + 1}: Projection must be a positive number for player "${name}", got "${rawProjection}".`
      );
    }

    const floorP10 = colFloor >= 0 ? parseFloat2(cells[colFloor]) : null;
    const ceilingP90 = colCeiling >= 0 ? parseFloat2(cells[colCeiling]) : null;
    const projectedOwnership = colOwnership >= 0 ? normalizeOwnership(cells[colOwnership]) : null;
    const notes = colNotes >= 0 ? (cells[colNotes] ?? "").trim() || null : null;

    rows.push({
      name,
      team,
      position,
      meanProjection,
      floorP10,
      ceilingP90,
      projectedOwnership,
      notes,
    });
  }

  return rows;
}
