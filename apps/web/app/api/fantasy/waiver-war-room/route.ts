import { NextResponse } from "next/server";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadFfcAdp, FFC_ATTRIBUTION } from "@/lib/fantasy/adp-source";
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { loadSleeperTrending } from "@/lib/integrations/sleeper";
import { byeCollisions, marketDisagreements, type RosterPlayerRef } from "@/lib/fantasy/waiver-war-room";

export const dynamic = "force-dynamic";

const MAX_ROSTER = 60;

/**
 * Waiver War Room — POST a synced roster, get back two DESCRIPTIVE reads:
 * real bye-week collisions (FFC ADP feed) and model-vs-market disagreements
 * (live nflverse process grades × live Sleeper waiver momentum).
 *
 * PRO/ELITE gated + per-user rate-limited via the shared helper (the
 * entitlement gate strictly precedes the limiter). Each data leg degrades to
 * its own honest "source-error" status independently — a failed leg is
 * reported as unavailable, NEVER as an empty "no collisions / no
 * disagreements" result, and never blocks the other leg.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requirePremiumApiRateLimited("fantasy/waiver-war-room");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }
  const raw = (body as { players?: unknown })?.players;
  const roster: RosterPlayerRef[] = (Array.isArray(raw) ? raw : [])
    .filter(
      (p): p is { name: string; pos: string; team?: string } =>
        typeof p === "object" && p !== null && typeof (p as { name?: unknown }).name === "string" && typeof (p as { pos?: unknown }).pos === "string",
    )
    .slice(0, MAX_ROSTER)
    .map((p) => ({ name: p.name, pos: p.pos, team: typeof p.team === "string" ? p.team : "" }));

  const [adp, model, trending] = await Promise.all([loadFfcAdp(), loadPlayerModel(), loadSleeperTrending()]);

  // `clear` (per-player joined byes with no collision) is deliberately NOT
  // serialized: the panel never renders it, and shipping unrendered
  // FFC-derived per-player data would be an un-displayed data-export vector.
  const byes = (() => {
    if (adp.status !== "live") return { status: "source-error" as const, attribution: FFC_ATTRIBUTION };
    const report = byeCollisions(roster, adp.rows);
    return {
      status: "ok" as const,
      collisions: report.collisions,
      unknown: report.unknown,
      season: adp.season,
      attribution: adp.attribution,
    };
  })();

  const disagreements =
    model.status === "live" && trending.status === "live"
      ? {
          status: "ok" as const,
          rows: marketDisagreements(
            model.profiles,
            trending,
            roster.map((p) => p.name),
          ),
          modelSeason: model.season,
          modelThroughWeek: model.throughWeek,
          lookbackHours: trending.lookbackHours,
          attribution: trending.attribution,
        }
      : { status: "source-error" as const };

  return NextResponse.json({ success: true, data: { status: "ok", byes, disagreements } });
}
