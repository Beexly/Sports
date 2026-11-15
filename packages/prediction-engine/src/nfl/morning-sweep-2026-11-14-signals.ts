/**
 * Nov-14 Morning Analytics Sweep — typed, sample-shrunk signal module.
 *
 * Wires the 63 morning-sweep CSVs (commit e1508322c,
 * docs/research/2026-11-14/full-tables/*.csv) into the prediction engine as
 * typed signals. The statistical contract is empirical-Bayes sample shrinkage:
 * any rate estimated from fewer than SHRINK_PSEUDOCOUNT (20) observations is
 * pulled toward a season baseline so a tiny sample cannot masquerade as a
 * stable edge. This is the same James-Stein / pseudo-count idea the engine's
 * hierarchical pools use, expressed as a single transparent weight:
 *
 *     weight = n / (n + K)
 *     shrunk = weight * observed + (1 - weight) * baseline      (K = 20)
 *
 * No sportsbook lines, spreads, totals, or implied odds are read or emitted
 * here — these are football-tendency and player-production signals only.
 */

export const SHRINK_PSEUDOCOUNT = 20;

export interface ShrunkEstimate {
  readonly observed: number;
  readonly n: number;
  readonly baseline: number;
  readonly shrunk: number;
  /** n / (n + K): the weight kept on the observed rate. */
  readonly weight: number;
  /** True when n < K, i.e. the estimate is majority-baseline. */
  readonly smallSample: boolean;
}

/**
 * Shrink an observed rate toward a season baseline with a pseudo-count of K.
 * n = 0 collapses fully to the baseline; large n stays near the observation.
 */
export function shrinkTowardBaseline(
  observed: number,
  n: number,
  baseline: number,
  k: number = SHRINK_PSEUDOCOUNT,
): ShrunkEstimate {
  const safeN = Number.isFinite(n) && n > 0 ? n : 0;
  const weight = safeN / (safeN + k);
  const shrunk = weight * observed + (1 - weight) * baseline;
  return { observed, n: safeN, baseline, shrunk, weight, smallSample: safeN < k };
}

// ── CSV primitives ───────────────────────────────────────────────────────────

export type CsvRow = Record<string, string>;

/** Minimal RFC-4180-ish parser: CRLF tolerant, quoted fields, empty cells. */
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // Skip fully-empty trailing rows.
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      // swallow; the following \n (or EOF) ends the row
      if (text[i + 1] !== "\n") pushRow();
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  if (rows.length === 0) return [];
  const header = rows[0]!.map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const out: CsvRow = {};
    header.forEach((h, idx) => {
      out[h] = (cells[idx] ?? "").trim();
    });
    return out;
  });
}

export function parseNum(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function parsePercent(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return NaN;
  return parseNum(value.replace(/%/g, ""));
}

function mean(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

// ── sfdata QB EPA by defensive tier ──────────────────────────────────────────

export type DefTier = "elite" | "good" | "weak" | "bad";

export interface QbTierEpa {
  readonly tier: DefTier;
  readonly rank: number | null;
  readonly epa: ShrunkEstimate;
}

export interface QbEpaRow {
  readonly rank: number;
  readonly qb: string;
  readonly ovrEpa: number;
  readonly tiers: QbTierEpa[];
}

export interface QbEpaByDefTierTable {
  readonly season: number;
  readonly qbs: QbEpaRow[];
}

const TIERS: DefTier[] = ["elite", "good", "weak", "bad"];

/**
 * Each tier's EPA is shrunk toward the QB's own overall EPA (his season
 * baseline) using the tier's dropback sample (tier_n). Blank tiers are skipped.
 */
export function parseQbEpaByDefTier(text: string, season: number): QbEpaByDefTierTable {
  const qbs: QbEpaRow[] = parseCsv(text).map((r) => {
    const ovrEpa = parseNum(r.ovr_epa);
    const tiers: QbTierEpa[] = [];
    for (const tier of TIERS) {
      const epa = parseNum(r[`${tier}_epa`]);
      if (!Number.isFinite(epa)) continue;
      const n = parseNum(r[`${tier}_n`]);
      tiers.push({
        tier,
        rank: Number.isFinite(parseNum(r[`${tier}_rank`])) ? parseNum(r[`${tier}_rank`]) : null,
        epa: shrinkTowardBaseline(epa, Number.isFinite(n) ? n : 0, ovrEpa),
      });
    }
    return { rank: parseNum(r.rank), qb: r.qb ?? "", ovrEpa, tiers };
  });
  return { season, qbs };
}

// ── Gridiron matchup cards ───────────────────────────────────────────────────

export interface GridironMatchupRow {
  readonly matchup: string;
  readonly offenseTeam: string;
  readonly defenseTeam: string;
  readonly metric: string;
  readonly offRank: string;
  readonly offValue: number;
  readonly defAllowedRank: string;
  readonly defAllowedValue: number;
}

export function parseGridironMatchup(text: string): GridironMatchupRow[] {
  return parseCsv(text).map((r) => ({
    matchup: r.matchup ?? "",
    offenseTeam: r.offense_team ?? "",
    defenseTeam: r.defense_team ?? "",
    metric: r.metric ?? "",
    offRank: r.off_rank ?? "",
    offValue: parseNum(r.off_value),
    defAllowedRank: r.def_allowed_rank ?? "",
    defAllowedValue: parseNum(r.def_allowed_value),
  }));
}

// ── Barrett Dank3 man/zone coverage ──────────────────────────────────────────

export interface ManZoneRow {
  readonly rank: number;
  readonly name: string;
  readonly games: number;
  readonly dbSnaps: number;
  readonly manPct: ShrunkEstimate;
  readonly zonePct: ShrunkEstimate;
  readonly fpPerDb: number;
}

/**
 * Man/zone rates are shrunk toward the league mean (the season baseline) using
 * the defensive coverage-snaps sample (db). An explicit baseline may be passed.
 */
export function parseBarrettManZone(text: string, baseline?: number): ManZoneRow[] {
  const rows = parseCsv(text);
  const manBaseline = baseline ?? mean(rows.map((r) => parsePercent(r.man_pct)));
  const zoneBaseline = mean(rows.map((r) => parsePercent(r.zone_pct)));
  return rows.map((r) => {
    const n = parseNum(r.db);
    return {
      rank: parseNum(r.rank),
      name: r.name ?? "",
      games: parseNum(r.g),
      dbSnaps: Number.isFinite(n) ? n : 0,
      manPct: shrinkTowardBaseline(parsePercent(r.man_pct), Number.isFinite(n) ? n : 0, manBaseline),
      zonePct: shrinkTowardBaseline(parsePercent(r.zone_pct), Number.isFinite(n) ? n : 0, zoneBaseline),
      fpPerDb: parseNum(r.fp_per_db),
    };
  });
}

// ── Dynatyze player cards (item/value) ───────────────────────────────────────

export function parseDynatyzeCard(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of parseCsv(text)) {
    const item = r.item ?? "";
    if (!item) continue;
    out[item] = parseNum(r.value);
  }
  return out;
}

// ── jmthrive injury report ───────────────────────────────────────────────────

export interface InjuryRow {
  readonly number: number;
  readonly player: string;
  readonly injury: string;
  readonly wed: string;
  readonly thur: string;
  readonly fri: string;
  readonly gameStatus: string;
}

export function parseJmThriveInjury(text: string): InjuryRow[] {
  return parseCsv(text).map((r) => ({
    number: parseNum(r.number),
    player: r.player ?? "",
    injury: r.injury ?? "",
    wed: r.wed ?? "",
    thur: r.thur ?? "",
    fri: r.fri ?? "",
    gameStatus: r.game ?? "",
  }));
}

// ── FantasyPts TPRR ──────────────────────────────────────────────────────────

export interface TprrRow {
  readonly rank: number;
  readonly name: string;
  readonly team: string;
  readonly pos: string;
  readonly games: number;
  readonly routes: number;
  readonly tprr: ShrunkEstimate;
  readonly yprr: number;
}

/** TPRR is shrunk toward the league mean using routes run as the sample. */
export function parseFantasyPtsTprr(text: string, baseline?: number): TprrRow[] {
  const rows = parseCsv(text);
  const tprrBaseline = baseline ?? mean(rows.map((r) => parseNum(r.tprr)));
  return rows.map((r) => {
    const routes = parseNum(r.rte);
    return {
      rank: parseNum(r.rank),
      name: r.name ?? "",
      team: r.team ?? "",
      pos: r.pos ?? "",
      games: parseNum(r.g),
      routes: Number.isFinite(routes) ? routes : 0,
      tprr: shrinkTowardBaseline(parseNum(r.tprr), Number.isFinite(routes) ? routes : 0, tprrBaseline),
      yprr: parseNum(r.yprr),
    };
  });
}

// ── Barrett Dank2 team details (League Avg baseline) ─────────────────────────

export interface Dank2Row {
  readonly name: string;
  readonly games: number;
  readonly epaPerPlay: ShrunkEstimate;
  readonly epaVs12: number;
}

/**
 * EPA/play is shrunk toward the table's "League Avg" row (the season baseline)
 * using games as the sample. The League Avg row itself is not a team signal.
 */
export function parseBarrettDank2(text: string): Dank2Row[] {
  const rows = parseCsv(text);
  const leagueAvg = rows.find((r) => (r.name ?? "").toLowerCase() === "league avg");
  const baseline = leagueAvg ? parseNum(leagueAvg.epa_per_play) : 0;
  return rows
    .filter((r) => (r.name ?? "").toLowerCase() !== "league avg")
    .map((r) => {
      const games = parseNum(r.g);
      return {
        name: r.name ?? "",
        games: Number.isFinite(games) ? games : 0,
        epaPerPlay: shrinkTowardBaseline(parseNum(r.epa_per_play), Number.isFinite(games) ? games : 0, baseline),
        epaVs12: parseNum(r.epa_vs_12_personnel),
      };
    });
}

// ── 63-file registry + bundle loader ─────────────────────────────────────────

export type SweepFamily =
  | "qb-epa-by-def-tier"
  | "gridiron-matchup"
  | "barrett-man-zone"
  | "barrett-dank2"
  | "barrett-game-of-week"
  | "dynatyze-card"
  | "injury-report"
  | "fantasypts-tprr"
  | "sfdata-tendencies"
  | "pff-analytics"
  | "statyx-analytics"
  | "gridiron-misc"
  | "nflmcp-analytics"
  | "misc-analytics";

/** Map a sweep filename to its signal family by source prefix. */
export function classifySweepFile(filename: string): SweepFamily {
  const f = filename.toLowerCase();
  if (f.startsWith("sfdata-qb-epa-by-def-tier")) return "qb-epa-by-def-tier";
  if (f.startsWith("gridiron-matchup-")) return "gridiron-matchup";
  if (f.startsWith("barrett-dank3-man-zone")) return "barrett-man-zone";
  if (f.startsWith("barrett-dank2")) return "barrett-dank2";
  if (f.startsWith("barrett-game-of-week")) return "barrett-game-of-week";
  if (f.startsWith("dynatyze-")) return "dynatyze-card";
  if (f.startsWith("jmthrive-")) return "injury-report";
  if (f.startsWith("fantasypts-tprr")) return "fantasypts-tprr";
  if (f.startsWith("sfdata-")) return "sfdata-tendencies";
  if (f.startsWith("pff-")) return "pff-analytics";
  if (f.startsWith("statyx-")) return "statyx-analytics";
  if (f.startsWith("gridiron-")) return "gridiron-misc";
  if (f.startsWith("nflmcp-")) return "nflmcp-analytics";
  return "misc-analytics";
}

export interface MorningSweepBundle {
  readonly fileCount: number;
  readonly familyCounts: Record<string, number>;
  readonly qbEpaByDefTier: QbEpaByDefTierTable[];
  readonly gridironMatchups: GridironMatchupRow[][];
  readonly manZone: ManZoneRow[];
  readonly dank2: Dank2Row[];
  readonly dynatyzeCards: Record<string, Record<string, number>>;
  readonly injuryReports: InjuryRow[][];
  readonly tprr: TprrRow[];
}

/**
 * Load every sweep CSV through its family adapter into one typed bundle.
 * `readFile` is injected so the loader is testable without touching disk.
 */
export function loadMorningSweepSignals(
  readFile: (filename: string) => string,
  files: string[],
): MorningSweepBundle {
  const familyCounts: Record<string, number> = {};
  const qbEpaByDefTier: QbEpaByDefTierTable[] = [];
  const gridironMatchups: GridironMatchupRow[][] = [];
  let manZone: ManZoneRow[] = [];
  let dank2: Dank2Row[] = [];
  const dynatyzeCards: Record<string, Record<string, number>> = {};
  const injuryReports: InjuryRow[][] = [];
  let tprr: TprrRow[] = [];

  for (const file of files) {
    const family = classifySweepFile(file);
    familyCounts[family] = (familyCounts[family] ?? 0) + 1;
    const text = readFile(file);
    switch (family) {
      case "qb-epa-by-def-tier": {
        const season = /-(20\d\d)\.csv$/.exec(file)?.[1];
        qbEpaByDefTier.push(parseQbEpaByDefTier(text, season ? Number(season) : 0));
        break;
      }
      case "gridiron-matchup":
        gridironMatchups.push(parseGridironMatchup(text));
        break;
      case "barrett-man-zone":
        manZone = parseBarrettManZone(text);
        break;
      case "barrett-dank2":
        dank2 = parseBarrettDank2(text);
        break;
      case "dynatyze-card":
        dynatyzeCards[file] = parseDynatyzeCard(text);
        break;
      case "injury-report":
        injuryReports.push(parseJmThriveInjury(text));
        break;
      case "fantasypts-tprr":
        tprr = parseFantasyPtsTprr(text);
        break;
      default:
        // Remaining families are parsed generically elsewhere; the census still
        // accounts for every file so no sweep table is silently dropped.
        break;
    }
  }

  return {
    fileCount: files.length,
    familyCounts,
    qbEpaByDefTier,
    gridironMatchups,
    manZone,
    dank2,
    dynatyzeCards,
    injuryReports,
    tprr,
  };
}