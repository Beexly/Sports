/**
 * DraftKings salary-CSV import.
 *
 * DK exposes a salary CSV on every contest's draft page — the legitimate way to
 * feed a real slate into an optimizer (there is no public lineup API, and
 * scraping logged-in lineups violates DK's ToS). This parses that export into our
 * DfsPlayer shape.
 *
 * The CSV gives REAL players, positions, salaries, teams, matchups, and DK's
 * average points. It does NOT include projections, floor/ceiling, or ownership —
 * those are MODELED here (band off the average; ownership estimated from
 * points-per-dollar value) and clearly labelled as such until a real projection
 * source is wired behind the founder gate. Pure, no network.
 */

import { type DfsPlayer, type DfsPos } from "./dfs-slate";

const VALID: readonly DfsPos[] = ["QB", "RB", "WR", "TE", "DST"];

/** Split one CSV line, honoring quoted fields and escaped quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Match a header by normalized name (strip non-alpha, lowercase). */
function headerIndex(headers: string[], names: string[]): number {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  for (const n of names) {
    const idx = norm.indexOf(n);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** "DAL@PHI 09/07/2026 ..." + team PHI → opponent DAL. */
function parseOpp(gameInfo: string, team: string): string {
  const m = gameInfo.match(/([A-Za-z]{2,4})@([A-Za-z]{2,4})/);
  if (!m) return "";
  const away = m[1]!.toUpperCase();
  const home = m[2]!.toUpperCase();
  const t = team.toUpperCase();
  return t === home ? away : t === away ? home : "";
}

export type DkParseResult = {
  readonly players: DfsPlayer[];
  readonly warnings: string[];
  readonly rows: number;
  readonly modeled: boolean; // projections/ownership were modeled, not in the CSV
};

export function parseDkCsv(text: string): DkParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { players: [], warnings: ["File is empty or has no rows."], rows: 0, modeled: false };

  const headers = splitCsvLine(lines[0]!);
  const iPos = headerIndex(headers, ["position"]);
  const iName = headerIndex(headers, ["name"]);
  const iSalary = headerIndex(headers, ["salary"]);
  const iTeam = headerIndex(headers, ["teamabbrev", "team"]);
  const iAvg = headerIndex(headers, ["avgpointspergame", "avgpoints", "fppg"]);
  const iGame = headerIndex(headers, ["gameinfo", "game"]);
  const iId = headerIndex(headers, ["id"]);

  if (iPos < 0 || iName < 0 || iSalary < 0) {
    return { players: [], warnings: ["Missing required columns (Position, Name, Salary). Is this a DraftKings salary export?"], rows: 0, modeled: false };
  }

  const players: DfsPlayer[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let rows = 0;

  for (let li = 1; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li]!);
    rows++;
    const posRaw = (cols[iPos] ?? "").toUpperCase();
    const pos = posRaw as DfsPos;
    if (!VALID.includes(pos)) { warnings.push(`Skipped "${cols[iName] ?? `row ${li}`}": position "${posRaw}" not supported (Classic only).`); continue; }

    const name = cols[iName] ?? "";
    const salary = parseInt((cols[iSalary] ?? "").replace(/[^0-9]/g, ""), 10);
    if (!name || !Number.isFinite(salary) || salary <= 0) { warnings.push(`Skipped row ${li}: missing name or salary.`); continue; }

    const team = ((iTeam >= 0 ? cols[iTeam] : "") ?? "").toUpperCase();
    const avg = iAvg >= 0 ? parseFloat(cols[iAvg] ?? "0") || 0 : 0;
    const opp = iGame >= 0 ? parseOpp(cols[iGame] ?? "", team) : "";

    const rawId = iId >= 0 ? cols[iId] : "";
    let id = rawId ? `dk-${rawId}` : `dk-${name.replace(/\W+/g, "-").toLowerCase()}-${salary}`;
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);

    // Modeled fields (the CSV has none): projection from DK average (or a salary
    // fallback), a floor/ceiling band, and ownership estimated from value.
    const proj = avg > 0 ? Math.round(avg * 10) / 10 : Math.round(salary / 420);
    const floor = Math.round(proj * 0.45);
    const ceiling = Math.round(proj * 1.85);
    const valuePer1k = proj / (salary / 1000);
    const own = Math.max(0.02, Math.min(0.45, 0.03 + (valuePer1k - 2) * 0.04));

    players.push({ id, name, pos, team, opp, salary, proj, floor, ceiling, own: Math.round(own * 100) / 100 });
  }

  if (players.length === 0) warnings.unshift("No valid players were parsed from this file.");
  return { players, warnings, rows, modeled: true };
}

/** Quick validation that a slate can fill a DK Classic roster. */
export function validateSlate(players: readonly DfsPlayer[]): string[] {
  const need: Record<DfsPos, number> = { QB: 1, RB: 2, WR: 3, TE: 1, DST: 1 };
  const have: Record<string, number> = {};
  for (const p of players) have[p.pos] = (have[p.pos] ?? 0) + 1;
  const missing: string[] = [];
  for (const pos of Object.keys(need) as DfsPos[]) {
    if ((have[pos] ?? 0) < need[pos]) missing.push(`need ${need[pos]} ${pos} (have ${have[pos] ?? 0})`);
  }
  return missing;
}
