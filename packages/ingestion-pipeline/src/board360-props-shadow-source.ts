/**
 * Read-only adapter exposing verified two-sided player prop lines from
 * `data/engine/game_boards_360_s*_w*.json` as a `PropsSlateShadowSource`.
 *
 * Strictly enforces fail-closed honesty:
 * - Single-sided quotes (missing `overOdds` or `underOdds`) are dropped, never imputed.
 * - Team-level lines (empty `athlete`) are skipped.
 * - Missing historical stat samples omit `rateHistory` rather than guessing.
 */

import fs from "node:fs";
import path from "node:path";
import type { BookOdds, PlayerProp } from "@sports/prediction-engine";
import type { PlayerRateHistory } from "./props-hb-bridge.js";
import type { PropsSlateShadowSource, ShadowPropLine } from "./props-slate-shadow.js";

export type RateHistoryResolver = (params: {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly propType: string;
  readonly line: number;
}) => Promise<PlayerRateHistory | undefined>;

export interface Board360ShadowSourceOptions {
  readonly boardFilePath?: string;
  readonly resolveRateHistory?: RateHistoryResolver;
}

const SUITE_WHITELIST = new Set([
  "qb_full_game",
  "skill_full_game",
  "1q_1h_player_props",
  "touchdown_scorers",
]);

function americanToImpliedProb(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

export function mapBoard360MarketToPropType(market: string): string | null {
  const m = market.toLowerCase();
  if (m.includes("1st quarter") || m.includes("1st half")) return null;
  if (m.includes("receiving yards")) return "receiving_yards";
  if (m.includes("rushing yards")) return "rushing_yards";
  if (m.includes("passing yards")) return "passing_yards";
  if (m.includes("passing touchdowns")) return "passing_tds";
  if (m.includes("pass completions")) return "passing_completions";
  if (m.includes("passing attempts")) return "passing_attempts";
  if (m.includes("interceptions")) return "interceptions";
  if (m.includes("receptions")) return "receptions";
  if (m.includes("carries") || m.includes("rushing attempts")) return "rushing_attempts";
  return null;
}

function normalizePos(raw: unknown): PlayerProp["position"] {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (s === "QB" || s === "RB" || s === "WR" || s === "TE") return s;
  return "WR";
}

function parseSeasonWeekSortKey(filename: string): number {
  const m = /s(\d{4})_w(\d{1,2})/.exec(filename);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number(m[2]);
}

function findLatestBoard360Path(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "data/engine"),
    path.resolve(process.cwd(), "../../data/engine"),
  ];
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^game_boards_360_s\d{4}_w\d{1,2}\.json$/.test(f))
      .sort((a, b) => parseSeasonWeekSortKey(b) - parseSeasonWeekSortKey(a));
    if (files[0]) {
      return path.join(dir, files[0]);
    }
  }
  return null;
}

function slugPlayerId(name: string, team: string): string {
  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${team.toLowerCase()}_${cleanName}`;
}

export function createBoard360PropsShadowSource(
  options: Board360ShadowSourceOptions = {},
): PropsSlateShadowSource {
  return {
    name: "game_boards_360",
    async loadPropLines(): Promise<readonly ShadowPropLine[]> {
      const targetPath = options.boardFilePath ?? findLatestBoard360Path();
      if (!targetPath || !fs.existsSync(targetPath)) {
        return [];
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(fs.readFileSync(targetPath, "utf8")) as Record<string, unknown>;
      } catch {
        return [];
      }

      const boards = parsed["game_boards"];
      if (!boards || typeof boards !== "object") {
        return [];
      }

      const capturedAt =
        typeof parsed["generated_utc"] === "string"
          ? parsed["generated_utc"]
          : new Date(0).toISOString();

      const seenProps = new Set<string>();
      const out: ShadowPropLine[] = [];

      for (const [matchupKey, boardRaw] of Object.entries(boards as Record<string, unknown>)) {
        if (!boardRaw || typeof boardRaw !== "object") continue;
        const [awayTeam = "", homeTeam = ""] = matchupKey.split("@");
        const suites = (boardRaw as Record<string, unknown>)["suites"];
        if (!suites || typeof suites !== "object") continue;

        for (const [suiteName, rows] of Object.entries(suites as Record<string, unknown>)) {
          if (!SUITE_WHITELIST.has(suiteName) || !Array.isArray(rows)) continue;

          for (const rowRaw of rows) {
            if (!rowRaw || typeof rowRaw !== "object") continue;
            const row = rowRaw as Record<string, unknown>;
            const athlete = typeof row["athlete"] === "string" ? row["athlete"].trim() : "";
            if (!athlete) continue;
            if (row["two_sided_valid"] !== true) continue;

            const line = row["line"];
            const overOdds = row["overOdds"];
            const underOdds = row["underOdds"];
            if (
              typeof line !== "number" ||
              !Number.isFinite(line) ||
              typeof overOdds !== "number" ||
              !Number.isFinite(overOdds) ||
              overOdds === 0 ||
              typeof underOdds !== "number" ||
              !Number.isFinite(underOdds) ||
              underOdds === 0
            ) {
              continue;
            }

            const market = typeof row["market"] === "string" ? row["market"] : "";
            const propType = mapBoard360MarketToPropType(market);
            if (!propType) continue;

            const team = typeof row["team"] === "string" ? row["team"].trim().toUpperCase() : "";
            if (!team) continue;

            const opponent = team === awayTeam ? homeTeam : awayTeam;
            const playerId = slugPlayerId(athlete, team);
            const dedupeKey = `${playerId}:${propType}`;
            if (seenProps.has(dedupeKey)) continue;
            seenProps.add(dedupeKey);

            const vigPct = Number(
              ((americanToImpliedProb(overOdds) + americanToImpliedProb(underOdds) - 1) * 100).toFixed(2),
            );
            const bookmaker =
              typeof row["source"] === "string" && row["source"].trim()
                ? row["source"].trim()
                : "DraftKings";

            const quote: BookOdds = {
              bookmaker,
              overOdds,
              underOdds,
              line,
              vigPct: Math.max(0, vigPct),
              isSharp: bookmaker.toLowerCase().includes("pinnacle"),
              capturedAt,
            };

            const prop: PlayerProp = {
              playerId,
              playerName: athlete,
              position: normalizePos(row["position"]),
              team,
              opponent: opponent || "OPP",
              propType,
              odds: [quote],
            };

            const rateHistory = options.resolveRateHistory
              ? await options.resolveRateHistory({
                  playerId,
                  playerName: athlete,
                  team,
                  propType,
                  line,
                })
              : undefined;

            out.push(rateHistory ? { prop, rateHistory } : { prop });
          }
        }
      }

      return out;
    },
  };
}
