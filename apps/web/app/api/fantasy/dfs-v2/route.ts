import { NextResponse } from "next/server";
import { z } from "zod";
import { optimizeDfsV2Portfolio } from "@/lib/fantasy/dfs-v2-client";

const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pos: z.enum(["QB", "RB", "WR", "TE", "DST"]),
  team: z.string().min(2),
  opp: z.string().min(2),
  salary: z.number().int().positive(),
  proj: z.number().nonnegative(),
  floor: z.number().nonnegative().default(0),
  ceiling: z.number().nonnegative().default(0),
  own: z.number().nonnegative().default(0.08),
});

const RequestSchema = z.object({
  mode: z.enum(["CLASSIC", "SHOWDOWN"]).default("CLASSIC"),
  numLineups: z.number().int().min(1).max(10).default(3),
  salaryCap: z.number().int().min(10_000).max(100_000).optional(),
  byeTeams: z.array(z.string()).default([]),
  outPlayers: z.array(z.string()).default([]),
  maxOverlap: z.number().int().min(0).max(8).optional(),
  seed: z.number().int().min(0).optional(),
  players: z.array(PlayerSchema).optional(),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid portfolio request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await optimizeDfsV2Portfolio(parsed.data);
  if (result.lineups.length === 0) {
    return NextResponse.json(
      { error: "No feasible lineup found for the supplied filters" },
      { status: 422 },
    );
  }

  return NextResponse.json(result, { status: 200 });
}
