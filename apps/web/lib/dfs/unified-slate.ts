import fs from "fs";
import path from "path";

export interface DfsPlayer {
  id: string;
  name: string;
  pos: "QB" | "RB" | "WR" | "TE" | "DST";
  salary: number;
  proj: number;
  floor: number;
  ceiling: number;
  own: number;
  team: string;
  opp: string;
}

let cachedSlate: DfsPlayer[] | null = null;

export function getUnifiedDfsSlate(): DfsPlayer[] | null {
  if (cachedSlate) return cachedSlate;

  try {
    const candidatePaths = [
      path.resolve(process.cwd(), "dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv"),
      path.resolve(process.cwd(), "../../dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv"),
      path.resolve(__dirname, "../../../../dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv"),
    ];

    let foundPath: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) return null;

    const raw = fs.readFileSync(foundPath, "utf8");
    const lines = raw.trim().split("\n");
    if (lines.length <= 1) return null;

    const header = lines[0]!.split(",").map((c) => c.trim().toLowerCase());
    const playerIdx = header.indexOf("player");
    const posIdx = header.indexOf("pos");
    const salaryIdx = header.indexOf("salary");
    const projIdx = header.indexOf("mkt_implied_dk_pts");
    const teamIdx = header.indexOf("team");
    const oppIdx = header.indexOf("opp");

    const players: DfsPlayer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i]!.split(",").map((c) => c.trim());
      if (row.length < header.length) continue;

      const name = row[playerIdx] || `Player ${i}`;
      const pos = (row[posIdx] || "WR").toUpperCase() as DfsPlayer["pos"];
      const salary = parseInt(row[salaryIdx] || "4000", 10) || 4000;
      const proj = parseFloat(row[projIdx] || "10.0") || 10.0;
      const team = row[teamIdx] || "NFL";
      const opp = row[oppIdx] || "OPP";

      players.push({
        id: `dk-${i}-${name.replace(/\s+/g, "_").toLowerCase()}`,
        name,
        pos,
        salary,
        proj,
        floor: Math.max(0, parseFloat((proj * 0.6).toFixed(1))),
        ceiling: parseFloat((proj * 1.5).toFixed(1)),
        own: 10,
        team,
        opp,
      });
    }

    cachedSlate = players;
    return players;
  } catch {
    return null;
  }
}
