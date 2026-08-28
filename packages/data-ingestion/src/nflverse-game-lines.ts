/**
 * nflverse schedules/games.csv — historical closing-ish lines (CC-BY-4.0).
 * Verified locally 2026-08-27: every 2018–2025 game has spread_line, total_line,
 * and moneylines (267–285 games/season). This is the 2018–2025 history gap close.
 * Attribution: nflverse (Lee Sharpe nfldata / nflverse-data schedules).
 */
export type NflverseGameLine = {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly gameday: string;
  readonly spreadLine: number | null;
  readonly totalLine: number | null;
  readonly homeMoneyline: number | null;
  readonly awayMoneyline: number | null;
  readonly homeSpreadOdds: number | null;
  readonly awaySpreadOdds: number | null;
};

function num(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

export function parseNflverseGameLines(csv: string): NflverseGameLine[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]!).map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const iGame = idx("game_id");
  const iSeason = idx("season");
  const iWeek = idx("week");
  const iHome = idx("home_team");
  const iAway = idx("away_team");
  const iDay = idx("gameday");
  const iSpread = idx("spread_line");
  const iTotal = idx("total_line");
  const iHml = idx("home_moneyline");
  const iAml = idx("away_moneyline");
  const iHs = idx("home_spread_odds");
  const iAs = idx("away_spread_odds");
  if (iGame < 0 || iSeason < 0 || iHome < 0 || iAway < 0) return [];
  const out: NflverseGameLine[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]!);
    const season = num(cols[iSeason] ?? "");
    if (season == null) continue;
    out.push({
      gameId: cols[iGame] ?? "",
      season,
      week: num(cols[iWeek] ?? "") ?? 0,
      homeTeam: cols[iHome] ?? "",
      awayTeam: cols[iAway] ?? "",
      gameday: iDay >= 0 ? (cols[iDay] ?? "") : "",
      spreadLine: iSpread >= 0 ? num(cols[iSpread]) : null,
      totalLine: iTotal >= 0 ? num(cols[iTotal]) : null,
      homeMoneyline: iHml >= 0 ? num(cols[iHml]) : null,
      awayMoneyline: iAml >= 0 ? num(cols[iAml]) : null,
      homeSpreadOdds: iHs >= 0 ? num(cols[iHs]) : null,
      awaySpreadOdds: iAs >= 0 ? num(cols[iAs]) : null,
    });
  }
  return out;
}

/** Closing-line history window the Galaxy workstream needed. */
export function linesInSeasons(
  rows: readonly NflverseGameLine[],
  from: number,
  to: number,
): NflverseGameLine[] {
  return rows.filter((r) => r.season >= from && r.season <= to);
}
