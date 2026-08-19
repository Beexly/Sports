import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/api/rate-limit";
import {
  planGatedSlateOutbox,
  planPickPublicationOutbox,
  planSettlementOutbox,
  type BotGatedSlateInput,
  type BotPickPublicationInput,
  type BotSettlementInput,
} from "@/lib/bot-outbox/plan";
import { loadBotOutboxDrafts } from "@/lib/bot-outbox/load";
import type { FactorKey } from "@/lib/twitter-bot/templates";

export const dynamic = "force-dynamic";

type PreviewEventKind = "PICK_PUBLICATION" | "SLATE_STATE_GATED" | "SETTLEMENT";

interface BotOutboxPreviewBody {
  readonly eventKind?: unknown;
  readonly payload?: unknown;
  readonly publicUrl?: unknown;
}

const FACTOR_KEYS = new Set<FactorKey>([
  "consensus",
  "depth",
  "edge",
  "lineMovement",
  "volatility",
  "headToHead",
  "venueForm",
  "scheduleStress",
  "restAdvantage",
  "crossMarket",
  "dataQuality",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberValue(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function nullableFactor(record: Record<string, unknown>, key: string): FactorKey | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  return typeof value === "string" && FACTOR_KEYS.has(value as FactorKey)
    ? (value as FactorKey)
    : null;
}

function dateValue(record: Record<string, unknown>, key: string): Date | null {
  const value = record[key];
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseEventKind(value: unknown): PreviewEventKind | null {
  return value === "PICK_PUBLICATION" || value === "SLATE_STATE_GATED" || value === "SETTLEMENT"
    ? value
    : null;
}

function parseTier(value: string | null): "FREE" | "PREMIUM" | null {
  return value === "FREE" || value === "PREMIUM" ? value : null;
}

function parseOutcome(value: string | null): "W" | "L" | "PUSH" | "PENDING" | null {
  return value === "W" || value === "L" || value === "PUSH" || value === "PENDING"
    ? value
    : null;
}

function parsePositiveInteger(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}

function parseTopFactors(value: unknown): Array<{ factor: FactorKey; score: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const factor = nullableFactor(entry, "factor");
    const score = numberValue(entry, "score");
    return factor && score !== null ? [{ factor, score }] : [];
  });
}

function parsePickPublicationPayload(payload: unknown): BotPickPublicationInput | null {
  if (!isRecord(payload)) return null;
  const tier = parseTier(stringValue(payload, "tier"));
  const gameStartsAt = dateValue(payload, "gameStartsAt");
  const required = {
    pickId: stringValue(payload, "pickId"),
    gameId: stringValue(payload, "gameId"),
    matchup: stringValue(payload, "matchup"),
    pickKind: stringValue(payload, "pickKind"),
    line: stringValue(payload, "line"),
    side: stringValue(payload, "side"),
    pickGrade: stringValue(payload, "pickGrade"),
    confidence: numberValue(payload, "confidence"),
    sport: stringValue(payload, "sport"),
    modelVersion: stringValue(payload, "modelVersion"),
    isPublished: booleanValue(payload, "isPublished"),
    isBootstrap: booleanValue(payload, "isBootstrap"),
  };

  const {
    pickId,
    gameId,
    matchup,
    pickKind,
    line,
    side,
    pickGrade,
    confidence,
    sport,
    modelVersion,
    isPublished,
    isBootstrap,
  } = required;

  if (
    !pickId ||
    !gameId ||
    !matchup ||
    !pickKind ||
    !line ||
    !side ||
    !pickGrade ||
    confidence === null ||
    !sport ||
    !modelVersion ||
    isPublished === null ||
    isBootstrap === null ||
    tier === null ||
    gameStartsAt === null
  ) {
    return null;
  }

  return {
    pickId,
    gameId,
    matchup,
    pickKind,
    line,
    side,
    pickGrade,
    confidence,
    sport,
    modelVersion,
    isPublished,
    isBootstrap,
    edgeIndex: numberValue(payload, "edgeIndex"),
    tier,
    gameStartsAt,
  };
}

function parseSettlementPayload(payload: unknown): BotSettlementInput | null {
  if (!isRecord(payload)) return null;
  const tier = parseTier(stringValue(payload, "tier"));
  const outcome = parseOutcome(stringValue(payload, "outcome"));
  const settledAt = payload["settledAt"] === null ? null : dateValue(payload, "settledAt");
  const required = {
    pickId: stringValue(payload, "pickId"),
    gameId: stringValue(payload, "gameId"),
    matchup: stringValue(payload, "matchup"),
    pickLine: stringValue(payload, "pickLine"),
    finalScore: stringValue(payload, "finalScore") ?? "",
    confidenceAtPublish: numberValue(payload, "confidenceAtPublish"),
    sport: stringValue(payload, "sport"),
    modelVersion: stringValue(payload, "modelVersion"),
    isPublished: booleanValue(payload, "isPublished"),
    isBootstrap: booleanValue(payload, "isBootstrap"),
    whatChanged: stringValue(payload, "whatChanged") ?? "No material change recorded.",
    whatThisUpdates: stringValue(payload, "whatThisUpdates") ?? "No model update recorded.",
  };

  const {
    pickId,
    gameId,
    matchup,
    pickLine,
    finalScore,
    confidenceAtPublish,
    sport,
    modelVersion,
    isPublished,
    isBootstrap,
    whatChanged,
    whatThisUpdates,
  } = required;

  if (
    !pickId ||
    !gameId ||
    !matchup ||
    !pickLine ||
    confidenceAtPublish === null ||
    !sport ||
    !modelVersion ||
    isPublished === null ||
    isBootstrap === null ||
    tier === null ||
    outcome === null
  ) {
    return null;
  }

  return {
    pickId,
    gameId,
    matchup,
    pickLine,
    finalScore,
    confidenceAtPublish,
    sport,
    modelVersion,
    isPublished,
    isBootstrap,
    whatChanged,
    whatThisUpdates,
    outcome,
    settledAt,
    tier,
    heaviestContributorFactor: nullableFactor(payload, "heaviestContributorFactor"),
    biggestMissFactor: nullableFactor(payload, "biggestMissFactor"),
    oneLineCause: stringValue(payload, "oneLineCause"),
    topFactorsAtPublish: parseTopFactors(payload["topFactorsAtPublish"]),
  };
}

function parseGatedSlatePayload(payload: unknown): BotGatedSlateInput | null {
  if (!isRecord(payload)) return null;
  const gateDecisionAt = dateValue(payload, "gateDecisionAt");
  const required = {
    gateDecisionId: stringValue(payload, "gateDecisionId"),
    gameId: stringValue(payload, "gameId"),
    matchup: stringValue(payload, "matchup"),
    gateReason: stringValue(payload, "gateReason"),
    gateReasonText: stringValue(payload, "gateReasonText"),
    sport: stringValue(payload, "sport"),
    modelVersion: stringValue(payload, "modelVersion"),
    isBootstrap: booleanValue(payload, "isBootstrap"),
  };

  const {
    gateDecisionId,
    gameId,
    matchup,
    gateReason,
    gateReasonText,
    sport,
    modelVersion,
    isBootstrap,
  } = required;

  if (
    !gateDecisionId ||
    !gameId ||
    !matchup ||
    !gateReason ||
    !gateReasonText ||
    !sport ||
    !modelVersion ||
    isBootstrap === null ||
    gateDecisionAt === null
  ) {
    return null;
  }

  return {
    gateDecisionId,
    gameId,
    matchup,
    gateReason,
    gateReasonText,
    sport,
    modelVersion,
    isBootstrap,
    edgeIndex: numberValue(payload, "edgeIndex"),
    gateDecisionAt,
  };
}

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }
  return { userId: session.user.id };
}

export async function GET(request: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied instanceof NextResponse) return denied;

  const url = new URL(request.url);
  const lookbackMinutes = parsePositiveInteger(url.searchParams.get("lookbackMinutes")) ?? 60;
  const limitPerKind = parsePositiveInteger(url.searchParams.get("limitPerKind")) ?? 25;
  const publicUrl = url.searchParams.get("publicUrl")?.startsWith("https://")
    ? url.searchParams.get("publicUrl")?.replace(/\/$/, "")
    : undefined;

  const payload = await loadBotOutboxDrafts({
    lookbackMinutes,
    limitPerKind,
    publicUrl,
  });

  return NextResponse.json({
    success: true,
    ...payload,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const denied = await requireAdmin();
  if (denied instanceof NextResponse) return denied;

  // Per-admin throttle on this bot-outbox preview planner (DB reads + planning).
  // Defense-in-depth; same bucket pattern as subscriptions/checkout, keyed by
  // admin id at 10/min (limit copied from subscriptions/checkout).
  const limit = consumeRateLimit("cockpit-bot-outbox-preview", denied.userId, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as BotOutboxPreviewBody;
  const eventKind = parseEventKind(body.eventKind);
  const publicUrl =
    typeof body.publicUrl === "string" && body.publicUrl.startsWith("https://")
      ? body.publicUrl.replace(/\/$/, "")
      : "https://galaxysportsedge.com";

  if (eventKind === null) {
    return NextResponse.json({ success: false, error: "invalid-event-kind" }, { status: 400 });
  }

  if (eventKind === "PICK_PUBLICATION") {
    const payload = parsePickPublicationPayload(body.payload);
    if (payload === null) {
      return NextResponse.json({ success: false, error: "invalid-payload" }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      items: planPickPublicationOutbox(payload, publicUrl),
      policy: {
        draftOnly: true,
        externalDelivery: false,
        persistence: false,
      },
    });
  }

  if (eventKind === "SETTLEMENT") {
    const payload = parseSettlementPayload(body.payload);
    if (payload === null) {
      return NextResponse.json({ success: false, error: "invalid-payload" }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      items: planSettlementOutbox(payload, publicUrl),
      policy: {
        draftOnly: true,
        externalDelivery: false,
        persistence: false,
      },
    });
  }

  const payload = parseGatedSlatePayload(body.payload);
  if (payload === null) {
    return NextResponse.json({ success: false, error: "invalid-payload" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    items: planGatedSlateOutbox(payload, publicUrl),
    policy: {
      draftOnly: true,
      externalDelivery: false,
      persistence: false,
    },
  });
}
