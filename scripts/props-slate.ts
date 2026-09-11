/**
 * Props slate runner — Phase A of docs/ops/PROPS_PRODUCTION_PIPELINE_PROMPT_2026-09-10.md
 *
 * Wires the already-written, already-tested edge-lab prop math to real nflverse
 * player-week data. Pure math stays in packages/prediction-engine/src/edge-lab:
 *   fitGroupPrior → posteriorRate → probOver | probOverContinuous → firePostedProp
 *
 * No keys, no DB, no writes. Deterministic: same slate + same cached CSVs →
 * same output. The nflverse fetch is cached on disk and the season + download
 * date are recorded in the output so a number can always be traced to the file
 * it came from.
 *
 * Usage:
 *   npx tsx scripts/props-slate.ts --slate props.json [--seasons 2022,2023,2024,2025]
 *                                                  [--cache <dir>] [--window season|lastN]
 *
 * Slate JSON:
 *   { "props": [ { "player": "Christian McCaffrey", "market": "receptions",
 *                  "line": 4.5, "games": 17,
 *                  "books": [ { "book": "A", "american": -120 },
 *                             { "book": "B", "american": -105 } ] } ] }
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  fitGroupPrior,
  posteriorRate,
  probOver,
  probOverContinuous,
  type RateSample,
} from "@sports/prediction-engine/src/edge-lab/props-hb.js";
import { firePostedProp } from "@sports/prediction-engine/src/edge-lab/props-fire-gate.js";
import type { ShopBook } from "@sports/prediction-engine/src/edge-lab/props-line-shop.js";

// ── markets ────────────────────────────────────────────────────────────────
// `kind` decides the distribution family: counts use the Negative-Binomial
// posterior-predictive (probOver), yardage uses the Gamma continuous path
// (probOverContinuous) — see props-hb.ts's "Two target types" section.

type MarketSpec = {
  readonly column: string;
  readonly kind: "count" | "yards";
  /** positions that genuinely run this market (the pooling group) */
  readonly groups: readonly string[];
  /** a week counts as "played" for this market when the column is > 0 unless
   *  the market is one where a zero is a real, informative game. */
  readonly playedWhenPositive: boolean;
};

const MARKETS: Record<string, MarketSpec> = {
  receptions: { column: "receptions", kind: "count", groups: ["RB", "WR", "TE"], playedWhenPositive: true },
  targets: { column: "targets", kind: "count", groups: ["RB", "WR", "TE"], playedWhenPositive: true },
  carries: { column: "carries", kind: "count", groups: ["RB", "QB"], playedWhenPositive: true },
  rushing_tds: { column: "rushing_tds", kind: "count", groups: ["RB", "QB"], playedWhenPositive: false },
  receiving_tds: { column: "receiving_tds", kind: "count", groups: ["RB", "WR", "TE"], playedWhenPositive: false },
  passing_tds: { column: "passing_tds", kind: "count", groups: ["QB"], playedWhenPositive: false },
  receiving_yards: { column: "receiving_yards", kind: "yards", groups: ["WR", "TE"], playedWhenPositive: true },
  rushing_yards: { column: "rushing_yards", kind: "yards", groups: ["RB"], playedWhenPositive: true },
  passing_yards: { column: "passing_yards", kind: "yards", groups: ["QB"], playedWhenPositive: true },
};

const NFLVERSE_URL = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/player_stats/stats_player_week_${season}.csv`;

// ── tiny CSV reader (no deps; the nflverse files are well-formed CSV) ──────

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    rows.push(splitCsvLine(line));
  }
  return { header, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// ── fetch + cache ──────────────────────────────────────────────────────────

type SeasonData = {
  readonly season: number;
  readonly path: string;
  readonly downloadedAt: string;
  readonly sha256: string;
  readonly rows: string[][];
  readonly columnAt: (name: string) => number;
};

async function loadSeason(season: number, cacheDir: string): Promise<SeasonData> {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  const csvPath = join(cacheDir, `stats_player_week_${season}.csv`);
  const metaPath = join(cacheDir, `stats_player_week_${season}.meta.json`);
  let text: string;
  let downloadedAt: string;
  if (existsSync(csvPath) && existsSync(metaPath)) {
    text = readFileSync(csvPath, "utf8");
    downloadedAt = (JSON.parse(readFileSync(metaPath, "utf8")) as { downloadedAt: string }).downloadedAt;
  } else {
    const res = await fetch(NFLVERSE_URL(season), { redirect: "follow" });
    if (!res.ok) throw new Error(`nflverse fetch failed for ${season}: HTTP ${res.status}`);
    text = await res.text();
    downloadedAt = new Date().toISOString();
    writeFileSync(csvPath, text);
    writeFileSync(metaPath, JSON.stringify({ season, downloadedAt, url: NFLVERSE_URL(season) }, null, 1));
  }
  const { header, rows } = parseCsv(text);
  const index = new Map(header.map((h, i) => [h, i]));
  return {
    season,
    path: csvPath,
    downloadedAt,
    sha256: createHash("sha256").update(text).digest("hex"),
    rows,
    columnAt: (name: string) => {
      const i = index.get(name);
      if (i === undefined) throw new Error(`column ${name} missing from season ${season}`);
      return i;
    },
  };
}

// ── slate + priors ─────────────────────────────────────────────────────────

type SlateProp = {
  readonly player: string;
  readonly market: string;
  readonly line: number;
  /** optional: override the games the player is assumed to play (default 1) */
  readonly games?: number;
  /** optional: restrict the sample to the player's most recent N played games */
  readonly window?: number;
  /** optional: restrict the sample to a single season (e.g. 2023) */
  readonly season?: number;
  readonly books?: readonly ShopBook[];
  /** optional two-way book quote; enables the Shin de-vigged edge e = p − q */
  readonly quote?: { readonly overAmerican: number; readonly underAmerican: number };
};

type PlayerWeek = { readonly season: number; readonly week: number; readonly position: string; readonly value: number };

function collectPlayerWeeks(
  seasons: readonly SeasonData[],
  spec: MarketSpec,
  playerName: string,
  seasonFilter?: number,
): PlayerWeek[] {
  const out: PlayerWeek[] = [];
  for (const s of seasons) {
    if (seasonFilter !== undefined && s.season !== seasonFilter) continue;
    const nameAt = s.columnAt("player_display_name");
    const posAt = s.columnAt("position");
    const typeAt = s.columnAt("season_type");
    const weekAt = s.columnAt("week");
    const valAt = s.columnAt(spec.column);
    for (const r of s.rows) {
      if (r[nameAt] !== playerName) continue;
      if (r[typeAt] !== "REG") continue;
      const value = Number(r[valAt] ?? 0);
      if (!Number.isFinite(value)) continue;
      if (spec.playedWhenPositive && value <= 0) continue; // DNP / no role
      out.push({ season: s.season, week: Number(r[weekAt]), position: r[posAt], value });
    }
  }
  return out.sort((a, b) => (a.season - b.season) || (a.week - b.week));
}

/** Group prior: one RateSample per player (games played, total events) in the
 *  same position group, over the most recent season available. */
function groupRates(
  season: SeasonData,
  spec: MarketSpec,
  group: readonly string[],
  windowGames?: number,
): RateSample[] {
  const nameAt = season.columnAt("player_display_name");
  const posAt = season.columnAt("position");
  const typeAt = season.columnAt("season_type");
  const valAt = season.columnAt(spec.column);
  const byPlayer = new Map<string, number[]>();
  for (const r of season.rows) {
    if (r[typeAt] !== "REG") continue;
    if (!group.includes(r[posAt])) continue;
    const value = Number(r[valAt] ?? 0);
    if (!Number.isFinite(value)) continue;
    if (spec.playedWhenPositive && value <= 0) continue;
    const key = r[nameAt];
    const list = byPlayer.get(key) ?? [];
    list.push(value);
    byPlayer.set(key, list);
  }
  const samples: RateSample[] = [];
  for (const values of Array.from(byPlayer.values())) {
    const used = windowGames && values.length > windowGames ? values.length - windowGames : 0;
    const slice = values.slice(0); // values are in file order (week order for one season)
    slice.splice(0, used);
    samples.push({ games: slice.length, total: slice.reduce((a, b) => a + b, 0) });
  }
  return samples;
}

/** Group shape for the continuous (yardage) path: Gamma shape k = (mean/sd)^2
 *  fitted on per-game values in the group. */
function groupShape(season: SeasonData, spec: MarketSpec, group: readonly string[]): number {
  const posAt = season.columnAt("position");
  const typeAt = season.columnAt("season_type");
  const valAt = season.columnAt(spec.column);
  const vals: number[] = [];
  for (const r of season.rows) {
    if (r[typeAt] !== "REG") continue;
    if (!group.includes(r[posAt])) continue;
    const v = Number(r[valAt] ?? 0);
    if (!Number.isFinite(v)) continue;
    if (spec.playedWhenPositive && v <= 0) continue;
    vals.push(v);
  }
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  return (mean * mean) / variance;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const arg = (name: string, fallback?: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : fallback;
  };
  const slatePath = arg("slate");
  if (!slatePath) {
    console.error("usage: npx tsx scripts/props-slate.ts --slate props.json [--seasons 2022,2023,2024,2025] [--cache dir]");
    process.exit(2);
  }
  const seasonsArg = arg("seasons", "2022,2023,2024") as string;
  const seasons = seasonsArg.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  const cacheDir = arg("cache", join(tmpdir(), "gse-nflverse-cache")) as string;
  const slate = JSON.parse(readFileSync(slatePath, "utf8")) as { props: SlateProp[] };

  const loaded: SeasonData[] = [];
  for (const s of seasons) loaded.push(await loadSeason(s, cacheDir));
  const latest = loaded[loaded.length - 1];

  const lines: string[] = [];
  lines.push(`# props-slate — ${new Date().toISOString()}`);
  lines.push(`# seasons: ${loaded.map((l) => `${l.season}@${l.downloadedAt}`).join(", ")}`);
  lines.push(`# cache: ${cacheDir}`);
  lines.push("");
  lines.push("player                    market            line    games  total   p_over   edge?   fire");
  lines.push("----------------------------------------------------------------------------------------");

  const results: unknown[] = [];
  for (const prop of slate.props) {
    const spec = MARKETS[prop.market];
    if (!spec) {
      lines.push(`${prop.player.padEnd(25)} ${prop.market.padEnd(17)} UNSUPPORTED MARKET`);
      continue;
    }
    const weeks = collectPlayerWeeks(loaded, spec, prop.player, prop.season);
    if (weeks.length === 0) {
      lines.push(`${prop.player.padEnd(25)} ${prop.market.padEnd(17)} NO DATA`);
      continue;
    }
    const recent = prop.window && weeks.length > prop.window ? weeks.slice(-prop.window) : weeks;
    const games = recent.length;
    const total = recent.reduce((a, w) => a + w.value, 0);
    const group = weeks[weeks.length - 1].position;
    const prior = fitGroupPrior(groupRates(latest, spec, group.length ? [group] : spec.groups));
    if (!prior) {
      lines.push(`${prop.player.padEnd(25)} ${prop.market.padEnd(17)} NO PRIOR (degenerate group)`);
      continue;
    }
    const posterior = posteriorRate(prior, total, games);
    const p =
      spec.kind === "count"
        ? probOver(posterior, prop.line, 1)
        : probOverContinuous(posterior, prop.line, groupShape(latest, spec, [group]));
    const fire = firePostedProp(p, prop.quote ?? null, prop.books ?? []);
    const edge = fire.ok && fire.shin.ok ? fire.shin.edgeOver : null;
    const status = fire.ok && fire.fire ? "FIRE" : fire.ok ? "no" : `deny:${fire.refuse}`;
    lines.push(
      `${prop.player.padEnd(25)} ${prop.market.padEnd(17)} ${String(prop.line).padEnd(7)} ${String(games).padEnd(6)} ${String(total).padEnd(7)} ${p.toFixed(4)}  ${edge === null ? "  n/a " : edge.toFixed(4)}  ${status}`,
    );
    results.push({
      player: prop.player,
      market: prop.market,
      line: prop.line,
      group,
      sample: { games, total, rawRate: total / games },
      prior: { alpha: prior.alpha, beta: prior.beta },
      posterior: { mean: posterior.mean, alpha: posterior.alpha, beta: posterior.beta },
      pOver: p,
      fire,
    });
  }
  console.log(lines.join("\n"));
  console.log("");
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), seasons: loaded.map((l) => ({ season: l.season, sha256: l.sha256, downloadedAt: l.downloadedAt })), results }, null, 1));
}

void main();
