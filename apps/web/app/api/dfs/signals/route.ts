/**
 * POST /api/dfs/signals
 * Persist a DFS narrative signal and return impact classification.
 */

import { NextResponse } from "next/server";
import { db } from "@sports/db";
import type { DfsNarrativeSignalType } from "@sports/types";
import {
  classifyNarrativeImpact,
} from "@/lib/dfs/narrative/signals";

export const dynamic = "force-dynamic";

const VALID_SIGNAL_TYPES: DfsNarrativeSignalType[] = [
  "CONTRACT_INCENTIVE",
  "MILESTONE_GAME",
  "BIRTHDAY_GAME",
  "REVENGE_GAME",
  "HOMECOMING",
  "PRIMETIME_CONTEXT",
  "PLAYOFF_URGENCY",
  "SEEDING_URGENCY",
  "AWARD_CHASE",
  "PERSONAL_ACHIEVEMENT",
  "COACH_QUOTE",
  "BEAT_REPORT",
  "ROLE_PROMISE",
  "DEPTH_CHART_PROMOTION",
  "TEAMMATE_INJURY_OPPORTUNITY",
  "RETURN_FROM_INJURY",
  "RETURN_FROM_SUSPENSION",
  "TRADE_DEBUT",
  "NEW_TEAM_ROLE",
  "CONTRACT_YEAR",
  "LOCKER_ROOM_FRICTION",
  "MEDIA_HYPE_SPIKE",
  "PUBLIC_SENTIMENT_SPIKE",
  "WEATHER_TOUGHNESS_NARRATIVE",
  "RIVALRY_CONTEXT",
];

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const {
      slateId,
      playerName,
      team,
      signalType,
      claim,
      evidence,
      counterEvidence,
      falsifiers,
      confidence,
    } = body as Record<string, unknown>;

    // Validate required fields
    if (!playerName || typeof playerName !== "string") {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }
    if (!team || typeof team !== "string") {
      return NextResponse.json({ error: "team is required" }, { status: 400 });
    }
    if (!signalType || typeof signalType !== "string") {
      return NextResponse.json({ error: "signalType is required" }, { status: 400 });
    }
    if (!claim || typeof claim !== "string") {
      return NextResponse.json({ error: "claim is required" }, { status: 400 });
    }
    if (!evidence || typeof evidence !== "string") {
      return NextResponse.json({ error: "evidence is required" }, { status: 400 });
    }

    // Validate signalType enum
    if (!VALID_SIGNAL_TYPES.includes(signalType as DfsNarrativeSignalType)) {
      return NextResponse.json(
        {
          error: `Invalid signalType "${signalType}". Valid values: ${VALID_SIGNAL_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const typedSignalType = signalType as DfsNarrativeSignalType;
    const typedConfidence =
      typeof confidence === "number" ? confidence : undefined;

    // Classify narrative impact
    const impactResult = classifyNarrativeImpact({
      playerName,
      team,
      slateId: typeof slateId === "string" ? slateId : undefined,
      signalType: typedSignalType,
      claim,
      evidence,
      counterEvidence: typeof counterEvidence === "string" ? counterEvidence : undefined,
      falsifiers: Array.isArray(falsifiers)
        ? (falsifiers as string[]).filter((f) => typeof f === "string")
        : [],
      confidence: typedConfidence,
    });

    // Persist to DB
    const signal = await db.dfsNarrativeSignal.create({
      data: {
        playerName,
        team,
        slateId: typeof slateId === "string" ? slateId : undefined,
        signalType: typedSignalType,
        claim,
        evidence,
        counterEvidence: typeof counterEvidence === "string" ? counterEvidence : undefined,
        falsifiers: Array.isArray(falsifiers)
          ? (falsifiers as string[]).filter((f) => typeof f === "string")
          : [],
        confidence: typedConfidence,
        freshness: "FRESH",
        impactType: impactResult.impactType,
        projectionDelta: impactResult.projectionDelta,
        ownershipDelta: impactResult.ownershipDelta,
        hypeInflationDelta: impactResult.hypeInflationDelta,
        volatilityDelta: impactResult.volatilityDelta,
        sourceReliability: 0.5,
      },
    });

    return NextResponse.json({ signal, impactResult }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/dfs/signals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
