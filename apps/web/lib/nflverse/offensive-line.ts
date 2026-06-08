import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { loadNflverseCombine, type CombineRow, type NflverseCombine } from "@/lib/nflverse/combine";
import { loadNflverseDepthCharts, type NflverseDepthCharts } from "@/lib/nflverse/depth-charts";
import {
  loadNflversePressureCoverage,
  type NflversePressureCoverage,
  type QbPressureRow,
} from "@/lib/nflverse/pressure-coverage";
import {
  loadNflverseSnapShare,
  olGroup,
  type NflverseSnapShare,
  type OlPositionGroup,
  type OlSnapShareRow,
} from "@/lib/nflverse/snap-share";

/**
 * The Trenches — Offensive Line data layer. A SERVER loader that assembles, per
 * team and per lineman, the deepest OL picture the FREE/legal nflverse universe
 * can honestly support. It JOINS four already-existing loaders rather than
 * re-fetching:
 *
 *   1. OL snap share  — `snap-share.ts` (`offensiveLine` T/G/C buckets): the
 *      settled "iron-man" workload tell. Real `offense_snaps`/`offense_pct`.
 *   2. OL depth/order — `depth-charts.ts`: starter (depthOrder 1) vs backup, the
 *      structural role behind every line.
 *   3. College athletic measurables — `combine.ts`: 40 / 3-cone / vertical /
 *      bench, joined by name+OL-position. Labeled the PRE-DRAFT PRIOR — i.e. the
 *      "college vs now" athletic baseline a lineman tested at, NOT current form.
 *   4. Team protection context — `pressure-coverage.ts` QB rows aggregated to
 *      team: pressure rate allowed + mean pocket time. This is a TEAM PROTECTION
 *      PROXY (the unit + QB + scheme together), NOT a per-lineman PFF grade.
 *
 * INTEGRITY — the two things free data CANNOT give honestly are labeled as GAPs
 * and never fabricated:
 *   • Per-lineman pass-protection grade (PFF-paywalled) — `perLinemanPassProGap`.
 *   • Scheme fit / zone-vs-gap classification (PFF/charting-paywalled) —
 *     `schemeFitGap`.
 * Every numeric field that the source lacks for a given player/team is null (an
 * honest dash), never invented. Combine is a college-era prior, explicitly framed
 * so a reader never mistakes it for a current-season grade.
 *
 * Read-only, real nflverse data (CC-BY-4.0), serializable output, honest
 * source-error / empty states matching the other loaders. canPublishProjections
 * stays false — this is settled context and scouting priors, not a pick.
 */

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Where a single field's value came from, so the UI can label its provenance. */
export type OlSource = "snap_counts" | "depth_charts" | "combine" | "pfr_advstats";

/** A lineman's college athletic prior (the "college vs now" baseline). All real
 *  combine measurements; any field the combine lacks for him is null. */
export interface OlCollegePrior {
  readonly school: string | null; // college (combine `school`)
  readonly draftYear: number | null; // combine `draft_year`/`season`
  readonly heightIn: string | null; // combine `ht`
  readonly weight: number | null; // combine `wt`
  readonly forty: number | null; // 40-yard dash (s)
  readonly vertical: number | null; // vertical (in)
  readonly broadJump: number | null; // broad jump (in)
  readonly cone: number | null; // 3-cone (s)
  readonly shuttle: number | null; // short shuttle (s)
  readonly bench: number | null; // 225 bench reps
  /** True only when an actual combine row matched this lineman by name+position. */
  readonly matched: boolean;
}

export interface OffensiveLinemanRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  /** Raw PFR position code from snap_counts (LT/RT/LG/RG/C/T/G). */
  readonly position: string;
  /** Bucketed OL group (T / G / C). */
  readonly group: OlPositionGroup;
  // ── Workload (snap_counts, real) ─────────────────────────────────────────────
  readonly games: number;
  readonly snapSharePct: number; // 0..1 mean offensive snap share
  readonly snapsPerGame: number;
  readonly totalOffenseSnaps: number;
  // ── Role (depth_charts, real) ────────────────────────────────────────────────
  /** Depth-chart order (1 = starter); null when not found on the latest chart. */
  readonly depthOrder: number | null;
  readonly isStarter: boolean; // depthOrder === 1
  // ── College athletic prior (combine, real — the "college vs now" baseline) ───
  readonly collegePrior: OlCollegePrior;
  // ── Honest GAPs (PFF-paywalled — never fabricated) ───────────────────────────
  /** Always null — no free per-lineman pass-pro grade exists. */
  readonly passProGrade: null;
  /** Always null — scheme fit (zone/gap) is not in any free source. */
  readonly schemeFit: null;
}

/** Team-level protection CONTEXT — a proxy, not a per-lineman grade. */
export interface OlTeamProtection {
  readonly team: string;
  readonly linemenTracked: number; // OL players with qualifying snap rows
  readonly starters: number; // OL rows at depthOrder 1
  /** Team pressure rate ALLOWED — mean of the team's QB rows' pressurePct
   *  (`times_pressured_pct`). Lower is better protection. Null when no QB row. */
  readonly pressureRateAllowed: number | null;
  /** Mean QB pocket time (s) on the team (pfr `pocket_time`). Higher = more time.
   *  Null when the season lacks the column / no QB row. */
  readonly pocketTime: number | null;
  /** Sum of sacks the team's QBs took (pfr `times_sacked`). Context, not blame. */
  readonly sacksAllowed: number | null;
  /** How the proxy is framed, so the UI never sells it as a per-lineman grade. */
  readonly proxyNote: string;
}

export interface OffensiveLineTeam {
  readonly team: string;
  readonly protection: OlTeamProtection;
  /** The team's OL, sorted starters-first then by snap share. */
  readonly linemen: readonly OffensiveLinemanRow[];
}

export interface NflverseOffensiveLine {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  /** Per-team OL views, sorted by team code. */
  readonly teams: readonly OffensiveLineTeam[];
  /** Flat lineman list (all teams), sorted by snap share — for league-wide tables. */
  readonly linemen: readonly OffensiveLinemanRow[];
  readonly sourceRows: {
    readonly snapShare: number;
    readonly depthCharts: number;
    readonly combine: number;
    readonly pressure: number;
  };
  /** Per-source status so the UI can show which join leg degraded. */
  readonly sourceStatus: Readonly<Record<OlSource, "live" | "source-error">>;
  readonly canPublishProjections: false;
  readonly blockReason: string;
  /** The two metrics free data cannot honestly provide — labeled, never faked. */
  readonly perLinemanPassProGap: string;
  readonly schemeFitGap: string;
  readonly sources: Readonly<Record<OlSource, string>>;
  readonly error: string | null;
}

/** Normalize a player name for the combine name+position join (combine has no
 *  gsis/pfr id, so we match on a lowercased, punctuation/suffix-stripped name). */
function nameKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (combining diacritics)
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "") // drop generational suffixes
    .replace(/[^a-z]/g, ""); // keep letters only
}

/** Build a combine lookup keyed by name+OL-group, keeping the most recent draft
 *  class when a name repeats. Only OL combine rows are indexed. */
function indexCombine(combine: NflverseCombine): Map<string, CombineRow> {
  const byKey = new Map<string, CombineRow>();
  for (const row of combine.latestClass.concat(combine.fastestForty)) {
    const group = olGroup(row.position);
    if (!group) continue;
    const key = `${nameKey(row.name)}|${group}`;
    const prior = byKey.get(key);
    if (!prior || row.draftYear > prior.draftYear) byKey.set(key, row);
  }
  return byKey;
}

/** Latest depth-chart order per (player name + OL group), so we can attach role
 *  to a snap-share row even when the two sources disagree on player-id scheme. */
function indexDepth(depth: NflverseDepthCharts): Map<string, number> {
  const byKey = new Map<string, number>();
  for (const row of depth.rows) {
    const group = olGroup(row.position);
    if (!group) continue;
    const key = `${nameKey(row.playerName)}|${group}`;
    const prior = byKey.get(key);
    // Keep the best (lowest = most prominent) order seen for this lineman.
    if (prior === undefined || row.depthOrder < prior) byKey.set(key, row.depthOrder);
  }
  return byKey;
}

/** Aggregate the QB pressure rows into a per-team protection proxy. */
function buildTeamProtection(qbRows: readonly QbPressureRow[]): Map<string, OlTeamProtection> {
  interface Acc {
    press: number[];
    pocket: number[];
    sacks: number;
  }
  const byTeam = new Map<string, Acc>();
  for (const qb of qbRows) {
    if (!qb.team) continue;
    const acc = byTeam.get(qb.team) ?? { press: [], pocket: [], sacks: 0 };
    acc.press.push(qb.pressurePct);
    if (qb.pocketTime !== null) acc.pocket.push(qb.pocketTime);
    acc.sacks += qb.sacks;
    byTeam.set(qb.team, acc);
  }
  const out = new Map<string, OlTeamProtection>();
  for (const [team, acc] of byTeam) {
    const press = acc.press.length > 0 ? acc.press.reduce((s, v) => s + v, 0) / acc.press.length : null;
    const pocket = acc.pocket.length > 0 ? acc.pocket.reduce((s, v) => s + v, 0) / acc.pocket.length : null;
    out.set(team, {
      team,
      linemenTracked: 0,
      starters: 0,
      pressureRateAllowed: press === null ? null : Math.round(press * 1000) / 1000,
      pocketTime: pocket === null ? null : Math.round(pocket * 100) / 100,
      sacksAllowed: acc.sacks,
      proxyNote:
        "Team protection PROXY: pressure rate allowed and pocket time reflect the whole unit + QB + scheme together, not any single lineman. It is NOT a per-lineman PFF pass-protection grade.",
    });
  }
  return out;
}

/** Empty protection record for a team with no QB pressure row. */
function emptyProtection(team: string): OlTeamProtection {
  return {
    team,
    linemenTracked: 0,
    starters: 0,
    pressureRateAllowed: null,
    pocketTime: null,
    sacksAllowed: null,
    proxyNote:
      "Team protection PROXY unavailable for this team (no qualifying QB pressure row). Shown as a dash, never fabricated.",
  };
}

/** Assemble one lineman row by joining a snap-share row with depth + combine. */
function assembleLineman(
  snap: OlSnapShareRow,
  depthByKey: Map<string, number>,
  combineByKey: Map<string, CombineRow>,
): OffensiveLinemanRow {
  const key = `${nameKey(snap.playerName)}|${snap.group}`;
  const depthOrder = depthByKey.get(key) ?? null;
  const c = combineByKey.get(key) ?? null;
  const collegePrior: OlCollegePrior = c
    ? {
        school: c.school && c.school.trim() !== "" ? c.school : null,
        draftYear: c.draftYear > 0 ? c.draftYear : null,
        heightIn: c.heightIn && c.heightIn.trim() !== "" ? c.heightIn : null,
        weight: c.weight,
        forty: c.forty,
        vertical: c.vertical,
        broadJump: c.broadJump,
        cone: c.cone,
        shuttle: c.shuttle,
        bench: c.bench,
        matched: true,
      }
    : {
        school: null,
        draftYear: null,
        heightIn: null,
        weight: null,
        forty: null,
        vertical: null,
        broadJump: null,
        cone: null,
        shuttle: null,
        bench: null,
        matched: false,
      };

  return {
    playerId: snap.playerId,
    playerName: snap.playerName,
    team: snap.team,
    position: snap.position,
    group: snap.group,
    games: snap.games,
    snapSharePct: snap.snapSharePct,
    snapsPerGame: snap.snapsPerGame,
    totalOffenseSnaps: snap.totalOffenseSnaps,
    depthOrder,
    isStarter: depthOrder === 1,
    collegePrior,
    passProGrade: null,
    schemeFit: null,
  };
}

const PASS_PRO_GAP =
  "Per-lineman pass-protection grade is PFF-paywalled and absent from every free/legal source — GSE shows a dash here and never fabricates an individual blocking grade. The closest FREE signal is the team protection proxy (pressure rate allowed / pocket time).";

const SCHEME_FIT_GAP =
  "Scheme fit (zone- vs gap-blocking classification and zone-vs-man run-scheme labels) is not published in any free nflverse source — it requires PFF/All-22 charting. GSE labels this a gap rather than guessing a scheme.";

const BLOCK_REASON =
  "The OL view is settled nflverse fact (snap share, depth order, college combine measurements) plus a clearly-labeled team protection proxy. It is historical context and scouting priors, not a projection, ranking, or betting pick.";

export function resetOffensiveLineCacheForTests(): void {
  cache = null;
}

let cache: { readonly expiresAt: number; readonly value: NflverseOffensiveLine } | null = null;

/**
 * Assemble the OL view for a season by joining snap share + depth + combine +
 * protection proxy. Each leg loads independently; a degraded leg (source-error)
 * downgrades only its own contribution — the view still renders the legs that
 * loaded, with honest dashes/empties for the rest. Returns "source-error" only
 * when the workload spine (snap share) itself fails, since without it there are
 * no linemen to anchor the join.
 */
export async function loadNflverseOffensiveLine({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflverseOffensiveLine> {
  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) return cache.value;

  // assertIngestible("nflverse") runs inside each leg's loader before any fetch.
  const [snap, depth, combine, pressure]: [
    NflverseSnapShare,
    NflverseDepthCharts,
    NflverseCombine,
    NflversePressureCoverage,
  ] = await Promise.all([
    loadNflverseSnapShare({ season, timeoutMs, cacheTtlMs, fetcher }),
    loadNflverseDepthCharts({ season, timeoutMs, cacheTtlMs, fetcher }),
    loadNflverseCombine({ timeoutMs, cacheTtlMs, fetcher }),
    loadNflversePressureCoverage({ season, timeoutMs, cacheTtlMs, fetcher }),
  ]);

  const sourceStatus: Record<OlSource, "live" | "source-error"> = {
    snap_counts: snap.status,
    depth_charts: depth.status,
    combine: combine.status,
    pfr_advstats: pressure.status,
  };
  const sources: Record<OlSource, string> = {
    snap_counts: snap.sourceUrl,
    depth_charts: depth.sourceUrl,
    combine: combine.sourceUrl,
    pfr_advstats: pressure.sourceUrls.pass,
  };
  const sourceRows = {
    snapShare: snap.sourceRows,
    depthCharts: depth.sourceRows,
    combine: combine.sourceRows,
    pressure: pressure.sourceRows,
  };

  // Spine: the OL snap-share rows. Without them there is nothing to anchor.
  const olSnapRows: OlSnapShareRow[] = [
    ...snap.offensiveLine.T,
    ...snap.offensiveLine.G,
    ...snap.offensiveLine.C,
  ];

  if (snap.status === "source-error" || olSnapRows.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: snap.season,
      seasonType: "REG",
      teams: [],
      linemen: [],
      sourceRows,
      sourceStatus,
      canPublishProjections: false,
      blockReason:
        "The OL workload spine (snap counts) could not load from nflverse. The product shows an empty state instead of a fabricated offensive line.",
      perLinemanPassProGap: PASS_PRO_GAP,
      schemeFitGap: SCHEME_FIT_GAP,
      sources,
      error: snap.error ?? "no OL snap rows",
    };
  }

  const depthByKey = indexDepth(depth);
  const combineByKey = indexCombine(combine);
  const protectionByTeam = buildTeamProtection(pressure.qbPressure);

  const linemen = olSnapRows
    .map((s) => assembleLineman(s, depthByKey, combineByKey))
    .sort((a, b) => b.snapSharePct - a.snapSharePct || b.totalOffenseSnaps - a.totalOffenseSnaps);

  // Group linemen by team and attach the protection proxy with live counts.
  const byTeam = new Map<string, OffensiveLinemanRow[]>();
  for (const lineman of linemen) {
    const list = byTeam.get(lineman.team) ?? [];
    list.push(lineman);
    byTeam.set(lineman.team, list);
  }

  const teams: OffensiveLineTeam[] = [];
  for (const [team, list] of byTeam) {
    const base = protectionByTeam.get(team) ?? emptyProtection(team);
    const starters = list.filter((l) => l.isStarter).length;
    const sortedList = [...list].sort(
      (a, b) => Number(b.isStarter) - Number(a.isStarter) || b.snapSharePct - a.snapSharePct,
    );
    teams.push({
      team,
      protection: { ...base, linemenTracked: list.length, starters },
      linemen: sortedList,
    });
  }
  teams.sort((a, b) => a.team.localeCompare(b.team));

  const value: NflverseOffensiveLine = {
    generatedAt: new Date().toISOString(),
    status: "live",
    season: snap.season,
    seasonType: "REG",
    teams,
    linemen,
    sourceRows,
    sourceStatus,
    canPublishProjections: false,
    blockReason: BLOCK_REASON,
    perLinemanPassProGap: PASS_PRO_GAP,
    schemeFitGap: SCHEME_FIT_GAP,
    sources,
    error: null,
  };
  if (cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
  return value;
}
