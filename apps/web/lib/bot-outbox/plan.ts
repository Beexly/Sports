import {
  buildPickPublicationTweet,
  buildPostMortemThread,
  buildSettlementTweet,
  buildSlateStateGatedTweet,
  type FactorKey,
} from "@/lib/twitter-bot/templates";
import {
  buildPickPublicationEmbed,
  buildSettlementEmbed,
  buildSlateStateGatedEmbed,
  type DiscordEmbed,
} from "@/lib/discord-bot/templates";
import { getRulesForTemplate } from "@/lib/compliance-scanner/rules";
import { normalizeForComplianceScan } from "@/lib/compliance-scanner/normalize";

export type BotOutboxChannel = "TWITTER" | "DISCORD";

export type BotOutboxEventKind =
  | "PICK_PUBLICATION"
  | "SLATE_STATE_GATED"
  | "SETTLEMENT"
  | "POST_MORTEM_THREAD";

export type BotOutboxBlockedReason =
  | "premium-pick"
  | "bootstrap-data"
  | "unpublished-pick"
  | "pending-settlement"
  | "non-loss-post-mortem"
  | "compliance-blocked";

export interface PlannedBotOutboxItem {
  idempotencyKey: string;
  channel: BotOutboxChannel;
  eventKind: BotOutboxEventKind;
  gameId: string;
  pickId: string | null;
  bodyText: string | null;
  threadText: string[] | null;
  embed: DiscordEmbed | null;
  linkUrl: string;
  shouldPost: boolean;
  blockedReason: BotOutboxBlockedReason | null;
}

export interface BotPickPublicationInput {
  pickId: string;
  gameId: string;
  matchup: string;
  pickKind: string;
  line: string;
  side: string;
  pickGrade: string;
  confidence: number;
  edgeIndex: number | null;
  sport: string;
  modelVersion: string;
  gameStartsAt: Date;
  tier: "FREE" | "PREMIUM";
  isPublished: boolean;
  isBootstrap: boolean;
}

export interface BotSettlementInput {
  pickId: string;
  gameId: string;
  matchup: string;
  pickLine: string;
  outcome: "W" | "L" | "PUSH" | "PENDING";
  finalScore: string;
  confidenceAtPublish: number;
  heaviestContributorFactor: FactorKey | null;
  biggestMissFactor: FactorKey | null;
  oneLineCause: string | null;
  sport: string;
  modelVersion: string;
  settledAt: Date | null;
  tier: "FREE" | "PREMIUM";
  isPublished: boolean;
  isBootstrap: boolean;
  topFactorsAtPublish: Array<{ factor: FactorKey; score: number }>;
  whatChanged: string;
  whatThisUpdates: string;
}

export interface BotGatedSlateInput {
  gateDecisionId: string;
  gameId: string;
  matchup: string;
  edgeIndex: number | null;
  gateReason: string;
  gateReasonText: string;
  sport: string;
  modelVersion: string;
  gateDecisionAt: Date;
  isBootstrap: boolean;
}

function roomUrl(publicUrl: string, gameId: string): string {
  return `${publicUrl}/room/${gameId}`;
}

function blockedPublicationReason(
  input: Pick<BotPickPublicationInput, "tier" | "isPublished" | "isBootstrap">,
): BotOutboxBlockedReason | null {
  if (input.tier !== "FREE") return "premium-pick";
  if (input.isBootstrap) return "bootstrap-data";
  if (!input.isPublished) return "unpublished-pick";
  return null;
}

function blockedSettlementReason(
  input: Pick<
    BotSettlementInput,
    "tier" | "isPublished" | "isBootstrap" | "outcome" | "settledAt"
  >,
): BotOutboxBlockedReason | null {
  if (input.tier !== "FREE") return "premium-pick";
  if (input.isBootstrap) return "bootstrap-data";
  if (!input.isPublished) return "unpublished-pick";
  if (input.outcome === "PENDING" || input.settledAt === null) return "pending-settlement";
  return null;
}

function buildBlockedItem(params: {
  idempotencyKey: string;
  channel: BotOutboxChannel;
  eventKind: BotOutboxEventKind;
  gameId: string;
  pickId: string | null;
  linkUrl: string;
  blockedReason: BotOutboxBlockedReason;
}): PlannedBotOutboxItem {
  return {
    ...params,
    bodyText: null,
    threadText: null,
    embed: null,
    shouldPost: false,
  };
}

function scanBotCopyForBlock(content: string): boolean {
  // Collapse soft line-wraps before scanning so a banned phrase split across a
  // newline can't slip the pre-post gate (defense in depth, matching the
  // read-time guard). Bot copy joins fields/threads with "\n", so a phrase can
  // straddle two joined segments.
  const scanTarget = normalizeForComplianceScan(content);
  return getRulesForTemplate("BOT_OUTBOX").some((rule) => {
    if (rule.severity !== "block") return false;
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags.replace("g", ""));
    return pattern.test(scanTarget);
  });
}

function embedSearchText(embed: DiscordEmbed): string {
  return [
    embed.title,
    embed.description ?? "",
    ...embed.fields.flatMap((field) => [field.name, field.value]),
    embed.footer.text,
  ].join("\n");
}

function plannedItemSearchText(item: PlannedBotOutboxItem): string {
  return [
    item.bodyText ?? "",
    ...(item.threadText ?? []),
    item.embed ? embedSearchText(item.embed) : "",
  ].join("\n");
}

function applyBotComplianceGate(item: PlannedBotOutboxItem): PlannedBotOutboxItem {
  if (!item.shouldPost) return item;
  if (!scanBotCopyForBlock(plannedItemSearchText(item))) return item;

  return buildBlockedItem({
    idempotencyKey: item.idempotencyKey,
    channel: item.channel,
    eventKind: item.eventKind,
    gameId: item.gameId,
    pickId: item.pickId,
    linkUrl: item.linkUrl,
    blockedReason: "compliance-blocked",
  });
}

function applyBotComplianceGates(items: PlannedBotOutboxItem[]): PlannedBotOutboxItem[] {
  const gatedItems = items.map(applyBotComplianceGate);
  const hasBlockedItem = gatedItems.some((item) => item.blockedReason === "compliance-blocked");
  if (!hasBlockedItem) return gatedItems;

  return gatedItems.map((item) =>
    item.blockedReason === "compliance-blocked" || item.shouldPost
      ? buildBlockedItem({
          idempotencyKey: item.idempotencyKey,
          channel: item.channel,
          eventKind: item.eventKind,
          gameId: item.gameId,
          pickId: item.pickId,
          linkUrl: item.linkUrl,
          blockedReason: "compliance-blocked",
        })
      : item
  );
}

export function planPickPublicationOutbox(
  input: BotPickPublicationInput,
  publicUrl: string,
): PlannedBotOutboxItem[] {
  const linkUrl = roomUrl(publicUrl, input.gameId);
  const blockedReason = blockedPublicationReason(input);

  if (blockedReason !== null) {
    return (["TWITTER", "DISCORD"] as const).map((channel) =>
      buildBlockedItem({
        idempotencyKey: `${channel.toLowerCase()}:pick-publication:${input.pickId}:${input.modelVersion}`,
        channel,
        eventKind: "PICK_PUBLICATION",
        gameId: input.gameId,
        pickId: input.pickId,
        linkUrl,
        blockedReason,
      }),
    );
  }

  const tweet = buildPickPublicationTweet(input, publicUrl);
  const embed = buildPickPublicationEmbed(input, publicUrl);

  return applyBotComplianceGates([
    {
      idempotencyKey: `twitter:pick-publication:${input.pickId}:${input.modelVersion}`,
      channel: "TWITTER",
      eventKind: "PICK_PUBLICATION",
      gameId: input.gameId,
      pickId: input.pickId,
      bodyText: tweet.text,
      threadText: null,
      embed: null,
      linkUrl: tweet.linkUrl,
      shouldPost: true,
      blockedReason: null,
    },
    {
      idempotencyKey: `discord:pick-publication:${input.pickId}:${input.modelVersion}`,
      channel: "DISCORD",
      eventKind: "PICK_PUBLICATION",
      gameId: input.gameId,
      pickId: input.pickId,
      bodyText: null,
      threadText: null,
      embed,
      linkUrl,
      shouldPost: true,
      blockedReason: null,
    },
  ]);
}

export function planSettlementOutbox(
  input: BotSettlementInput,
  publicUrl: string,
): PlannedBotOutboxItem[] {
  const linkUrl = roomUrl(publicUrl, input.gameId);
  const blockedReason = blockedSettlementReason(input);

  if (blockedReason !== null) {
    return (["TWITTER", "DISCORD"] as const).map((channel) =>
      buildBlockedItem({
        idempotencyKey: `${channel.toLowerCase()}:settlement:${input.pickId}:${input.modelVersion}`,
        channel,
        eventKind: "SETTLEMENT",
        gameId: input.gameId,
        pickId: input.pickId,
        linkUrl,
        blockedReason,
      }),
    );
  }

  if (input.outcome === "PENDING" || input.settledAt === null) {
    throw new Error("Pending settlements must be blocked before outbox rendering.");
  }

  const settledAt = input.settledAt;
  const settlementInput = {
    matchup: input.matchup,
    pickLine: input.pickLine,
    outcome: input.outcome,
    heaviestContributorFactor: input.heaviestContributorFactor,
    biggestMissFactor: input.biggestMissFactor,
    oneLineCause: input.oneLineCause,
    sport: input.sport,
    gameId: input.gameId,
    modelVersion: input.modelVersion,
  };
  const tweet = buildSettlementTweet(settlementInput, publicUrl);
  const embed = buildSettlementEmbed(
    {
      ...settlementInput,
      finalScore: input.finalScore,
      confidenceAtPublish: input.confidenceAtPublish,
      settledAt,
    },
    publicUrl,
  );

  const items: PlannedBotOutboxItem[] = [
    {
      idempotencyKey: `twitter:settlement:${input.pickId}:${input.modelVersion}`,
      channel: "TWITTER",
      eventKind: "SETTLEMENT",
      gameId: input.gameId,
      pickId: input.pickId,
      bodyText: tweet.text,
      threadText: null,
      embed: null,
      linkUrl: tweet.linkUrl,
      shouldPost: true,
      blockedReason: null,
    },
    {
      idempotencyKey: `discord:settlement:${input.pickId}:${input.modelVersion}`,
      channel: "DISCORD",
      eventKind: "SETTLEMENT",
      gameId: input.gameId,
      pickId: input.pickId,
      bodyText: null,
      threadText: null,
      embed,
      linkUrl,
      shouldPost: true,
      blockedReason: null,
    },
  ];

  if (input.outcome === "L") {
    const threadText = buildPostMortemThread(
      {
        ...settlementInput,
        outcome: "L",
        topFactorsAtPublish: input.topFactorsAtPublish,
        whatChanged: input.whatChanged,
        whatThisUpdates: input.whatThisUpdates,
      },
      publicUrl,
    );

    items.push({
      idempotencyKey: `twitter:post-mortem-thread:${input.pickId}:${input.modelVersion}`,
      channel: "TWITTER",
      eventKind: "POST_MORTEM_THREAD",
      gameId: input.gameId,
      pickId: input.pickId,
      bodyText: null,
      threadText,
      embed: null,
      linkUrl,
      shouldPost: true,
      blockedReason: null,
    });
  }

  return applyBotComplianceGates(items);
}

export function planGatedSlateOutbox(
  input: BotGatedSlateInput,
  publicUrl: string,
): PlannedBotOutboxItem[] {
  const linkUrl = roomUrl(publicUrl, input.gameId);

  if (input.isBootstrap) {
    return (["TWITTER", "DISCORD"] as const).map((channel) =>
      buildBlockedItem({
        idempotencyKey: `${channel.toLowerCase()}:slate-state-gated:${input.gateDecisionId}:${input.modelVersion}`,
        channel,
        eventKind: "SLATE_STATE_GATED",
        gameId: input.gameId,
        pickId: null,
        linkUrl,
        blockedReason: "bootstrap-data",
      }),
    );
  }

  const tweet = buildSlateStateGatedTweet(input, publicUrl);
  const embed = buildSlateStateGatedEmbed(input, publicUrl);

  return applyBotComplianceGates([
    {
      idempotencyKey: `twitter:slate-state-gated:${input.gateDecisionId}:${input.modelVersion}`,
      channel: "TWITTER",
      eventKind: "SLATE_STATE_GATED",
      gameId: input.gameId,
      pickId: null,
      bodyText: tweet.text,
      threadText: null,
      embed: null,
      linkUrl: tweet.linkUrl,
      shouldPost: true,
      blockedReason: null,
    },
    {
      idempotencyKey: `discord:slate-state-gated:${input.gateDecisionId}:${input.modelVersion}`,
      channel: "DISCORD",
      eventKind: "SLATE_STATE_GATED",
      gameId: input.gameId,
      pickId: null,
      bodyText: null,
      threadText: null,
      embed,
      linkUrl,
      shouldPost: true,
      blockedReason: null,
    },
  ]);
}
