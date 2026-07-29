/**
 * Vercel cron — context plane CONSUMED path (officials + contracts).
 *
 * Pure engine: hydrateContextToMemory → NflverseMemoryStore
 * Rights: nflverse CC-BY-4.0 (contracts via OTC redistrib; attribution required)
 * oddsApiRequired=false · LIVE_BOARD independent
 *
 * GET without body: runs demo fixtures (proves CONSUMED path in logs).
 * POST JSON: { contracts?: [], officials?: [] } for real hydrate.
 *
 * Schedule: daily 10:00 UTC (after cold-plane 09:30).
 * Auth: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import {
  NflverseMemoryStore,
  hydrateContextToMemory,
  type ContractRowIn,
  type OfficialRowIn,
} from "@sports/stats-api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const memoryStore = new NflverseMemoryStore();

const DEMO_CONTRACTS: ContractRowIn[] = [
  { gsis_id: "00-0033873", player: "demo-qb", apy: 40_000_000, year_signed: 2020 },
  { gsis_id: "00-0034857", player: "demo-wr", apy: 18_000_000, year_signed: 2022 },
];

const DEMO_OFFICIALS: OfficialRowIn[] = [
  {
    game_id: "2024_01_DEMO",
    season: 2024,
    week: 1,
    referee: "Demo Referee",
    umpire: "Demo Umpire",
  },
];

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const result = hydrateContextToMemory(memoryStore, {
    contracts: DEMO_CONTRACTS,
    officials: DEMO_OFFICIALS,
  });

  return NextResponse.json(
    {
      success: result.refused === 0,
      mode: "demo_fixtures",
      ...result,
      storeSize: memoryStore.size(),
      oddsApiRequired: false,
      note:
        "Demo fixtures prove CONSUMED path. POST real rows or wire nflverse fetch for production density.",
      attribution: result.attribution,
    },
    {
      headers: {
        "X-GSE-API": "stats.v1.context",
        "X-GSE-RIGHTS": "CC-BY-4.0",
        "X-GSE-ODDS-API": "not-required",
      },
    },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  let body: { contracts?: ContractRowIn[]; officials?: OfficialRowIn[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON", code: "bad_json" }, { status: 400 });
  }

  const result = hydrateContextToMemory(memoryStore, {
    contracts: body.contracts ?? [],
    officials: body.officials ?? [],
  });

  return NextResponse.json(
    {
      success: result.refused === 0 || result.contractsWritten + result.officialsWritten > 0,
      mode: "payload",
      ...result,
      storeSize: memoryStore.size(),
      oddsApiRequired: false,
    },
    {
      status: result.refused > 0 && result.contractsWritten + result.officialsWritten === 0 ? 422 : 200,
      headers: {
        "X-GSE-API": "stats.v1.context",
        "X-GSE-RIGHTS": "CC-BY-4.0",
      },
    },
  );
}
