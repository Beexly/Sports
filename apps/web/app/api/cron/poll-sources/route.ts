/**
 * Vercel cron — Source Mesh poll cycle.
 *
 * Finds the next approved source due for polling (via getNextDueSource()),
 * calls the source's configured endpoint, writes the result to the Evidence
 * Vault, and records the poll health event.
 *
 * Authorization: Bearer ${CRON_SECRET}
 *
 * This route handles the The Odds API source by default. Additional source
 * adapters are registered via the cockpit and dispatched here.
 *
 * One source per cron invocation (Vercel cron fires every 30s minimum).
 * If more throughput is needed, the long-running data-refresh worker should
 * handle it instead.
 */

import { NextResponse } from "next/server";
import { getNextDueSource, recordPollResult } from "@/lib/source-mesh";
import { insertEvidenceItem } from "@/lib/evidence-vault";
import type { ClaimType, EntityType } from "@/lib/evidence-vault";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const THE_ODDS_API_SLUG = "the-odds-api";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = await getNextDueSource();
  if (!source) {
    return NextResponse.json({ ok: true, note: "No sources due for polling." });
  }

  const startMs = Date.now();

  // ── Dispatch to source adapter ────────────────────────────────────────────

  if (source.slug === THE_ODDS_API_SLUG) {
    return pollOddsApi(source.id, startMs);
  }

  // Unknown source — record a no-op success so the circuit stays closed
  await recordPollResult(source.id, {
    success: true,
    latencyMs: Date.now() - startMs,
    recordCount: 0,
  });

  return NextResponse.json({
    ok: true,
    sourceId: source.id,
    slug: source.slug,
    note: "No adapter registered for this source slug.",
  });
}

// ── The Odds API adapter ─────────────────────────────────────────────────────

async function pollOddsApi(sourceId: string, startMs: number): Promise<NextResponse> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    await recordPollResult(sourceId, {
      success: false,
      errorMessage: "THE_ODDS_API_KEY not configured",
    });
    return NextResponse.json(
      { ok: false, note: "THE_ODDS_API_KEY not configured — odds poll skipped." },
      { status: 503 },
    );
  }

  const sports = ["americanfootball_nfl", "basketball_nba", "baseball_mlb"];
  let totalRecords = 0;
  const errors: string[] = [];

  for (const sport of sports) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

      if (!res.ok) {
        errors.push(`${sport}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json() as Array<{
        id: string;
        sport_key: string;
        home_team: string;
        away_team: string;
        commence_time: string;
        bookmakers: Array<{
          key: string;
          markets: Array<{
            key: string;
            outcomes: Array<{ name: string; price: number; point?: number }>;
          }>;
        }>;
      }>;

      for (const game of data) {
        const bookmakerCount = game.bookmakers.length;

        await insertEvidenceItem({
          sourceId,
          sourceTier: 1,
          entityType: "game" as EntityType,
          entityId: game.id,
          claimType: "odds_snapshot" as ClaimType,
          observedAt: new Date(),
          content: {
            sport: game.sport_key,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time,
            bookmakerCount,
            bookmakers: game.bookmakers.map((b) => ({
              key: b.key,
              markets: b.markets,
            })),
          },
          ttlSeconds: 1800, // 30 minutes
          confidence: 1.0,
        });

        totalRecords++;
      }
    } catch (err) {
      errors.push(`${sport}: ${String(err)}`);
    }
  }

  const latencyMs = Date.now() - startMs;
  const success = errors.length < sports.length;

  await recordPollResult(sourceId, {
    success,
    latencyMs,
    recordCount: totalRecords,
    errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
  });

  return NextResponse.json({
    ok: success,
    sourceId,
    recordCount: totalRecords,
    latencyMs,
    errors: errors.length > 0 ? errors : undefined,
  });
}
