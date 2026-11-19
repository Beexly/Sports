import { NextResponse } from "next/server";
import {
  auditAndRepairDfsLineup,
  loadActiveStage0AndDfsPool,
  redactLineupDoctorForFreeViewer,
  type ContestFormat,
  type LineupDoctorSubmittedPlayer,
} from "@/lib/fantasy/lineup-doctor";
import { verifyUnlockCookie } from "@/lib/packages/unlock-cookie";
import { checkPurchaseLedgerAccess } from "@/lib/packages/purchase-ledger";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DFS_PACK_SLUGS = [
  "week8-all-access",
  "redzone-dfs-pro-pack",
  "week8-sun-mon-dfs-expanded-pack",
  "vip-season-pass",
];

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const raw = part.slice(eq + 1).trim();
      try {
        return raw ? decodeURIComponent(raw) : null;
      } catch {
        return raw || null;
      }
    }
  }
  return null;
}

async function hasDfsPackCookieAccess(req: Request): Promise<boolean> {
  const header = req.headers.get("cookie") || "";
  if (!header) return false;
  for (const slug of DFS_PACK_SLUGS) {
    const rawCookie = readCookie(header, `gse_unlock_${slug}`);
    if (!rawCookie) continue;
    const verified = verifyUnlockCookie(rawCookie, slug);
    if (!verified.valid || !verified.sessionId) continue;
    const access = await checkPurchaseLedgerAccess({
      slug,
      sessionId: verified.sessionId,
    });
    if (access.unlocked) return true;
  }
  return false;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || !Array.isArray(body["players"])) {
      return NextResponse.json(
        { ok: false, error: "Provide a 'players' array of player names to audit." },
        { status: 400 },
      );
    }

    const contestType: ContestFormat =
      body["contestType"] === "showdown" ? "showdown" : "classic";

    const rawPlayers = body["players"].slice(0, 12);
    const players: Array<string | LineupDoctorSubmittedPlayer> = [];
    for (const item of rawPlayers) {
      if (typeof item === "string" && item.trim()) {
        players.push(item.trim());
      } else if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        if (typeof rec["name"] === "string" && rec["name"].trim()) {
          players.push({
            name: rec["name"].trim(),
            slot: typeof rec["slot"] === "string" ? rec["slot"] : undefined,
            salary: typeof rec["salary"] === "number" ? rec["salary"] : undefined,
          });
        }
      }
    }

    const [viewer, hasPackCookie] = await Promise.all([
      getViewerEntitlements(),
      hasDfsPackCookieAccess(req),
    ]);
    const hasFullAccess = viewer.canUseFantasyFull || hasPackCookie;

    const { stage0, pool } = loadActiveStage0AndDfsPool();
    const fullReport = auditAndRepairDfsLineup({ contestType, players }, stage0, pool);
    const report = redactLineupDoctorForFreeViewer(fullReport, hasFullAccess);

    return NextResponse.json(report, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not audit lineup right now." },
      { status: 500 },
    );
  }
}
