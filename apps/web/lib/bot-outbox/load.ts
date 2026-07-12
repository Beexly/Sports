import { db } from "@sports/db";
import {
  planGatedSlateOutbox,
  planPickPublicationOutbox,
  planSettlementOutbox,
  type PlannedBotOutboxItem,
} from "@/lib/bot-outbox/plan";
import {
  gateDecisionRecordToGatedInput,
  pickRecordToPublicationInput,
  pickRecordToSettlementInput,
} from "@/lib/bot-outbox/records";
import { SITE_URL } from "@/lib/seo/site-url";

export interface LoadBotOutboxDraftsOptions {
  readonly now?: Date;
  readonly lookbackMinutes?: number;
  readonly limitPerKind?: number;
  readonly publicUrl?: string;
}

export interface BotOutboxDraftsPayload {
  readonly generatedAt: string;
  readonly lookbackMinutes: number;
  readonly policy: {
    readonly draftOnly: true;
    readonly externalDelivery: false;
    readonly persistence: false;
  };
  readonly counts: {
    readonly pickPublications: number;
    readonly settlements: number;
    readonly gatedSlateStates: number;
    readonly outboxItems: number;
    readonly blockedItems: number;
  };
  readonly items: PlannedBotOutboxItem[];
}

function windowStart(now: Date, lookbackMinutes: number): Date {
  return new Date(now.getTime() - lookbackMinutes * 60_000);
}

export async function loadBotOutboxDrafts(
  options: LoadBotOutboxDraftsOptions = {},
): Promise<BotOutboxDraftsPayload> {
  const now = options.now ?? new Date();
  const lookbackMinutes = options.lookbackMinutes ?? 60;
  const limitPerKind = options.limitPerKind ?? 25;
  // Default bot-post links to the canonical site host (www) so they match every
  // other absolute URL we emit; callers may still override with an explicit host.
  const publicUrl = options.publicUrl ?? SITE_URL;
  const since = windowStart(now, lookbackMinutes);

  const [pickPublications, settlements, gatedSlateStates] = await Promise.all([
    db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        tier: "FREE",
        result: "PENDING",
        generatedAt: { gte: since, lte: now },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { generatedAt: "desc" },
      take: limitPerKind,
    }).catch(() => []),
    db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        tier: "FREE",
        result: { in: ["WIN", "LOSS", "PUSH"] },
        settledAt: { gte: since, lte: now },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "desc" },
      take: limitPerKind,
    }).catch(() => []),
    db.gateDecision.findMany({
      where: {
        status: "GATED",
        isBootstrap: false,
        evaluatedAt: { gte: since, lte: now },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { evaluatedAt: "desc" },
      take: limitPerKind,
    }).catch(() => []),
  ]);

  const items = [
    ...pickPublications.flatMap((pick) =>
      planPickPublicationOutbox(pickRecordToPublicationInput(pick), publicUrl),
    ),
    ...settlements.flatMap((pick) =>
      planSettlementOutbox(pickRecordToSettlementInput(pick), publicUrl),
    ),
    ...gatedSlateStates.flatMap((decision) =>
      planGatedSlateOutbox(gateDecisionRecordToGatedInput(decision), publicUrl),
    ),
  ];

  return {
    generatedAt: now.toISOString(),
    lookbackMinutes,
    policy: {
      draftOnly: true,
      externalDelivery: false,
      persistence: false,
    },
    counts: {
      pickPublications: pickPublications.length,
      settlements: settlements.length,
      gatedSlateStates: gatedSlateStates.length,
      outboxItems: items.length,
      blockedItems: items.filter((item) => !item.shouldPost).length,
    },
    items,
  };
}
