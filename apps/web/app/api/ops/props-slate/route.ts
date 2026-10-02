/**
 * GET /api/ops/props-slate — SHADOW props slate runner (default-off).
 *
 * WHY. `runPropsSlate` (the GSE 4-Beat props pipeline: shin-devig, gate, pass
 * list, board, Monte Carlo sanity) had no production caller, and its
 * `modelProbOver` input had no producer. This route is the first honest caller:
 * prop lines come from The Odds API, model P(over) comes from the engine's own
 * market-anchored player projections (lib/ops/props-model-prob.ts) — never
 * the market's devigged probability substituted silently.
 *
 * POSTURE:
 * - Default-off: requires PROPS_SLATE_ENABLED=1, else 404 (dark).
 * - CRON_SECRET Bearer auth (cronAuthError).
 * - Writes ONLY to the `signals` table (player entity, `props.*` keys) —
 *   the table the picks route does not read. NEVER writes published picks,
 *   never touches scoring weights.
 * - `dryRun=1` skips all writes and returns what WOULD be persisted.
 *
 * CREDIT DISCIPLINE. One Odds API credit per game (single event-odds call
 * carrying prop + totals + spreads markets). Max 3 games per run. Garrett
 * pays per credit and wants off the plan — this route spends like it.
 *
 * QUERY PARAMS (all optional):
 * - `season=2026&week=5` — defaults to the latest REG week with player stats.
 * - `gameId=<db id>` — single game; default: next 3 upcoming NFL games.
 * - `dryRun=1` — no writes.
 *
 * HONEST LIMITS (stated in the response):
 * - Player name -> engine player matching is by slugged fullName on the two
 *   rosters; unmatched props are skipped, never fuzzy-matched.
 * - Team totals/spread anchoring is market-derived (stated); the engine's edge
 *   is player allocation, not the total.
 * - QB efficiency uses fantasy-points-per-attempt (no passing-yards column in
 *   PlayerGameStat); relative ranking only.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import {
  OddsApiClient,
  resolveOddsApiKey,
} from "@sports/data-ingestion";
// `OddsApiEvent` lives in @sports/types, not @sports/data-ingestion. The
// data-ingestion modules import it FROM there; re-importing it from
// data-ingestion resolved to nothing and did not type-check.
import type { OddsApiEvent } from "@sports/types";
import {
  runPropsSlate,
} from "@sports/ingestion-pipeline";
// `PlayerProp` is defined in props-gates and re-exported by props-slate, but it
// is NOT re-exported from the ingestion-pipeline barrel, so importing the name
// from the barrel resolved to undefined. Imported from the module that owns it.
import type { PlayerProp } from "@sports/ingestion-pipeline/src/props-slate.js";
import {
  reconcileMarketAnchoredPlayers,
  type MarketAnchoredPlayerProjection,
} from "@sports/prediction-engine";
import { buildModelProbOver, RECONCILIATION_TEMPERATURE } from "@/lib/ops/props-model-prob";
import {
  buildPropPlayerInputs,
  type PlayerGameStatLike,
} from "@/lib/ops/props-player-inputs";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ENABLED = process.env.PROPS_SLATE_ENABLED === "1";
const MAX_GAMES = 3;
const BANKROLL_PAPER = 1000;
const LINE_FRESHNESS_MINUTES = 30;

/** Odds API player-prop markets with an engine projection mapping. */
const PROP_MARKETS = [
  "player_pass_yds",
  "player_rush_yds",
  "player_reception_yds",
  "player_pass_tds",
  "player_rush_tds",
  "player_reception_tds",
  "player_anytime_td",
] as const;

function slugName(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.'"]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function median(xs: number[]): number | null {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * The line the model P(over) is computed against. This MUST match the book
 * gateProp devigs (sharpest book's line, else the first book's line) — the
 * EV comparison `modelP / fairP - 1` is only valid at the same line.
 * isSharp is currently false for all books (no sharp classification exists
 * in the repo; not invented here), so this is odds[0]. If sharp books are
 * ever classified, this follows automatically.
 */
function gateLineFor(prop: PlayerProp): number {
  const sharp = prop.odds.filter((o) => o.isSharp);
  const best = sharp.length > 0 ? sharp[0] : prop.odds[0];
  return best?.line ?? NaN;
}

function consensusAnchor(event: OddsApiEvent): { total: number; spread: number } | null {
  const totals: number[] = [];
  const spreads: number[] = [];
  for (const book of event.bookmakers ?? []) {
    for (const market of book.markets ?? []) {
      for (const o of market.outcomes ?? []) {
        if (market.key === "totals" && o.point != null) totals.push(o.point);
        if (market.key === "spreads" && o.point != null) spreads.push(o.point);
      }
    }
  }
  const total = median(totals);
  const spread = median(spreads);
  if (total == null || spread == null) return null;
  return { total, spread };
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!ENABLED) return new NextResponse("Not found", { status: 404 });
  const denied = await cronAuthError(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const onlyGameId = url.searchParams.get("gameId");
  const report: Record<string, unknown> = {
    enabled: true,
    dryRun,
    games: [],
    errors: [],
  };

  try {
    const apiKey = resolveOddsApiKey(process.env);
    if (!apiKey) {
      return NextResponse.json(
        { ...report, ok: false, error: "THE_ODDS_API_KEY not configured" },
        { status: 200 },
      );
    }
    const client = new OddsApiClient(apiKey);

    const season = Number(url.searchParams.get("season") ?? 2026);
    let week = Number(url.searchParams.get("week") ?? NaN);
    if (!Number.isFinite(week)) {
      const latest = await db.playerGameStat.aggregate({
        where: { season, seasonType: "REG" },
        _max: { week: true },
      });
      week = latest._max.week ?? 4;
    }

    const games = await db.game.findMany({
      where: onlyGameId
        ? { id: onlyGameId }
        : {
            sportId: "americanfootball_nfl",
            status: "SCHEDULED",
            commenceTime: { gt: new Date() },
          },
      orderBy: { commenceTime: "asc" },
      take: MAX_GAMES,
    });

    for (const game of games) {
      const gameReport: Record<string, unknown> = {
        gameId: game.id,
        matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
      };
      try {
        const eventRes = await client.getEventOdds(
          "americanfootball_nfl",
          game.externalId,
          [...PROP_MARKETS, "totals", "spreads"],
        );
        const event = eventRes.data;
        const anchor = consensusAnchor(event);
        if (!anchor) {
          gameReport.skipped = "no consensus total/spread for market anchor";
          (report.games as unknown[]).push(gameReport);
          continue;
        }

        // Roster -> playerId map by slugged name.
        const roster = await db.player.findMany({
          where: {
            recentTeam: { in: [game.homeTeamName, game.awayTeamName] },
            position: { in: ["QB", "RB", "WR", "TE"] },
          },
          select: { id: true, fullName: true, position: true, recentTeam: true },
        });
        const bySlug = new Map(roster.map((p) => [slugName(p.fullName), p]));

        // Build PlayerProp[] from the book outcomes, grouped by (player, market).
        const props: PlayerProp[] = [];
        const seen = new Map<string, PlayerProp>();
        const nowMs = Date.now();
        let oldestMs = 0;
        for (const book of event.bookmakers ?? []) {
          for (const market of book.markets ?? []) {
            if (!(PROP_MARKETS as readonly string[]).includes(market.key)) continue;
            const perPlayer = new Map<string, { over?: number; under?: number; line?: number; name: string }>();
            for (const o of market.outcomes ?? []) {
              const desc = (o as { description?: string }).description;
              if (!desc) continue;
              const side = o.name?.trim().toLowerCase();
              const e = perPlayer.get(desc) ?? { name: desc };
              if (side === "over") { e.over = o.price; e.line = o.point; }
              else if (side === "under") { e.under = o.price; e.line = o.point; }
              perPlayer.set(desc, e);
            }
            for (const [, e] of perPlayer) {
              if (e.over == null || e.under == null || e.line == null) continue;
              const player = bySlug.get(slugName(e.name));
              if (!player) continue;
              const key = `${player.id}:${market.key}`;
              let p = seen.get(key);
              if (!p) {
                p = {
                  playerId: player.id,
                  playerName: player.fullName,
                  position: player.position ?? "",
                  team: player.recentTeam ?? "",
                  opponent: "",
                  propType: market.key,
                  odds: [],
                };
                seen.set(key, p);
                props.push(p);
              }
              (p.odds as unknown[]).push({
                bookmaker: book.key,
                overOdds: e.over,
                underOdds: e.under,
                line: e.line,
                vigPct: 0,
                isSharp: false,
                capturedAt: book.last_update ?? market.last_update,
              });
              const ageMin =
                (nowMs - new Date(book.last_update ?? market.last_update).getTime()) / 60000;
              if (ageMin > oldestMs) oldestMs = ageMin;
            }
          }
        }
        gameReport.propsConsidered = props.length;

        if (props.length === 0) {
          gameReport.skipped = "no matchable props";
          (report.games as unknown[]).push(gameReport);
          continue;
        }

        // Player inputs from the DB (trailing 4 weeks).
        const statRows = await db.playerGameStat.findMany({
          where: {
            season,
            seasonType: "REG",
            week: { gte: week - 4, lt: week },
            playerId: { in: roster.map((p) => p.id) },
          },
          select: {
            playerId: true,
            week: true,
            targets: true,
            carries: true,
            attempts: true,
            receivingYards: true,
            rushingYards: true,
            fantasyPointsPpr: true,
          },
        });
        const homeAbbr = game.homeTeamName;
        const inputsLike: PlayerGameStatLike[] = statRows.map((r) => {
          const pl = roster.find((x) => x.id === r.playerId);
          return {
            playerId: r.playerId,
            position: pl?.position ?? null,
            teamSide: (pl?.recentTeam === homeAbbr ? "home" : "away") as "home" | "away",
            week: r.week,
            targets: r.targets,
            carries: r.carries,
            attempts: r.attempts,
            receivingYards: r.receivingYards,
            rushingYards: r.rushingYards,
            fantasyPointsPpr: r.fantasyPointsPpr,
          };
        });
        const { inputs, skippedNoGames } = buildPropPlayerInputs(inputsLike, week);
        gameReport.playerInputs = inputs.length;
        gameReport.skippedNoGames = skippedNoGames.length;

        const reconciled = reconcileMarketAnchoredPlayers(
          {
            gameId: game.id,
            totalPoints: anchor.total,
            homeSpread: anchor.spread,
            // The engine default (1) is degenerate winner-take-all at yard-scale
            // scores — see RECONCILIATION_TEMPERATURE docs. Passed explicitly.
            assumptions: { allocationTemperature: RECONCILIATION_TEMPERATURE },
          },
          inputs,
        );
        const projMap = new Map<string, MarketAnchoredPlayerProjection>(
          reconciled.players.map((p) => [p.playerId, p]),
        );

        const modelProbOver = buildModelProbOver(
          projMap,
          props.map((p) => ({
            playerId: p.playerId,
            propType: p.propType,
            // Same line gateProp devigs — see gateLineFor.
            line: gateLineFor(p),
          })),
        );
        gameReport.modelProbs = Object.keys(modelProbOver).length;

        const slate = runPropsSlate({
          props,
          modelProbOver,
          lineFreshnessMinutes: Math.max(1, Math.ceil(oldestMs)),
          bankroll: BANKROLL_PAPER,
          projectedMean: anchor.total / 2,
          projectedStdDev: 10,
        });
        gameReport.slate = {
          ok: slate.ok,
          considered: slate.propsConsidered,
          passed: slate.passed,
          fired: slate.fired.length,
          errors: slate.errors.slice(0, 5),
        };

        if (!dryRun) {
          // Persist model P(over) as shadow player signals. The picks route
          // does not read the signals table; nothing published is affected.
          const now = new Date();
          let written = 0;
          for (const [key, pOver] of Object.entries(modelProbOver)) {
            const [playerId, propType] = key.split(":");
            await db.signal.upsert({
              where: {
                entityType_entityId_key_season_week: {
                  entityType: "player",
                  entityId: playerId!,
                  key: `props.model_p_over.${propType}`,
                  season,
                  week,
                },
              },
              create: {
                entityType: "player",
                entityId: playerId!,
                key: `props.model_p_over.${propType}`,
                category: "RATINGS",
                value: pOver,
                valueRaw: pOver,
                // `fetchedAt` is REQUIRED on Signal; without it the insert throws
                // at runtime. It is the moment this slate read its inputs, which
                // is the `now` already in scope — not a wall-clock guess.
                fetchedAt: now,
                weight: 0,
                confidence: 1,
                season,
                week,
                sourceId: "gse-props-slate",
                capturedAt: now,
                rightsSnapshot: {
                  provenance: "engine market-anchored projection",
                  note: "shadow-only; uncalibrated",
                },
              },
              update: {
                value: pOver,
                valueRaw: pOver,
                capturedAt: now,
              },
            });
            written += 1;
          }
          gameReport.signalsWritten = written;
        }
      } catch (err) {
        gameReport.error = err instanceof Error ? err.message : String(err);
        captureError(err, { route: "ops/props-slate", gameId: game.id });
      }
      (report.games as unknown[]).push(gameReport);
    }

    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    captureError(err, { route: "ops/props-slate" });
    return NextResponse.json(
      { ...report, ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
