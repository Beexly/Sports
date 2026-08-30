import { scanMediaClaimText, type ClaimSafetyResult } from "./claim-safety";
import {
  FIRST_MONTH_DAILY_WATCH_TOPICS,
  FIRST_MONTH_WEEKLY_SEEDS,
  type FirstMonthWeeklySeed,
} from "./first-month-content-seeds";
import type { GseContentPillar } from "./content-pillars";
import { scoreContentIdea, type ContentIdeaScoreResult } from "./content-idea-score";
import type { MediaPlatform } from "./platform-strategy";

export type FirstMonthContentFormat =
  | "daily_watch"
  | "long_video"
  | "short_clip"
  | "newsletter"
  | "founder_build_log"
  | "board_meeting";

export type FirstMonthContentQueueItem = {
  readonly id: string;
  readonly day: number;
  readonly week: number;
  readonly platform: MediaPlatform;
  readonly pillar: GseContentPillar;
  readonly format: FirstMonthContentFormat;
  readonly title: string;
  readonly hook: string;
  readonly scriptBeats: readonly string[];
  readonly cta: string;
  readonly score: ContentIdeaScoreResult;
  readonly approval: {
    readonly status: "DRAFT_ONLY";
    readonly manualReviewRequired: true;
    readonly publishAllowed: false;
    readonly externalSendAllowed: false;
  };
};

export type FirstMonthPartnerOutreachBatch = {
  readonly id: string;
  readonly day: number;
  readonly targetCount: 10;
  readonly categories: readonly string[];
  readonly manualSendOnly: true;
  readonly externalSendAllowed: false;
};

export type FirstMonthClaimSafetyEntry = {
  readonly id: string;
  readonly title: string;
  readonly day: number;
  readonly week: number;
  readonly platform: MediaPlatform;
  readonly pillar: GseContentPillar;
  readonly format: FirstMonthContentFormat;
  readonly claimSafety: ClaimSafetyResult;
  readonly publishAllowed: false;
  readonly externalSendAllowed: false;
};

export type FirstMonthClaimSafetyReport = {
  readonly generatedAt: string;
  readonly totalItems: number;
  readonly blockedItems: number;
  readonly evidenceRequiredItems: number;
  readonly warningItems: number;
  readonly dailyCoverageDays: number;
  readonly partnerOutreachBatches: number;
  readonly partnerOutreachTargets: number;
  readonly allLiveActionLocksClosed: boolean;
  readonly weeklyCadence: readonly FirstMonthWeeklyCadence[];
  readonly entries: readonly FirstMonthClaimSafetyEntry[];
};

export type FirstMonthWeeklyCadence = {
  readonly week: number;
  readonly longVideos: number;
  readonly shortClips: number;
  readonly newsletters: number;
  readonly founderBuildLogs: number;
  readonly boardMeetings: number;
  readonly dailyWatchPosts: number;
  readonly meetsMinimum: boolean;
};

export function buildFirstMonthMediaQueue(): readonly FirstMonthContentQueueItem[] {
  return [...buildDailyWatchPosts(), ...FIRST_MONTH_WEEKLY_SEEDS.flatMap((seed) => buildWeeklyItems(seed))].sort(
    (left, right) => left.day - right.day || left.id.localeCompare(right.id),
  );
}

export function buildFirstMonthPartnerOutreachBatches(): readonly FirstMonthPartnerOutreachBatch[] {
  return Array.from({ length: 30 }, (_, index) => ({
    categories: ["creator", "sports_data", "fantasy_tool", "ai_tool"],
    day: index + 1,
    externalSendAllowed: false,
    id: `partner_outreach_day_${pad(index + 1)}`,
    manualSendOnly: true,
    targetCount: 10,
  }));
}

export function buildFirstMonthClaimSafetyReport(input: {
  readonly queue?: readonly FirstMonthContentQueueItem[];
  readonly outreachBatches?: readonly FirstMonthPartnerOutreachBatch[];
  readonly generatedAt?: string;
} = {}): FirstMonthClaimSafetyReport {
  const queue = input.queue ?? buildFirstMonthMediaQueue();
  const outreachBatches = input.outreachBatches ?? buildFirstMonthPartnerOutreachBatches();
  const entries: readonly FirstMonthClaimSafetyEntry[] = queue.map((item): FirstMonthClaimSafetyEntry => ({
    claimSafety: scanMediaClaimText([item.title, item.hook, ...item.scriptBeats, item.cta].join(" ")),
    day: item.day,
    externalSendAllowed: false,
    format: item.format,
    id: item.id,
    pillar: item.pillar,
    platform: item.platform,
    publishAllowed: false,
    title: item.title,
    week: item.week,
  }));
  return {
    allLiveActionLocksClosed: queue.every((item) => !item.approval.publishAllowed && !item.approval.externalSendAllowed),
    blockedItems: entries.filter((entry) => !entry.claimSafety.ok).length,
    dailyCoverageDays: new Set(queue.map((item) => item.day)).size,
    entries,
    evidenceRequiredItems: entries.filter((entry) => entry.claimSafety.evidenceRequiredHits.length > 0).length,
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    partnerOutreachBatches: outreachBatches.length,
    partnerOutreachTargets: outreachBatches.reduce((total, batch) => total + batch.targetCount, 0),
    totalItems: queue.length,
    warningItems: entries.filter((entry) => entry.claimSafety.warnings.length > 0).length,
    weeklyCadence: buildWeeklyCadence(queue),
  };
}

function buildDailyWatchPosts(): readonly FirstMonthContentQueueItem[] {
  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    return contentItem({
      day,
      format: "daily_watch",
      hook: "One slate question before any action.",
      pillar: "market_mirage",
      platform: "x_thread",
      scriptBeats: ["Name the watch item.", "State the source or freshness question.", "Close with manual review."],
      title: `What I am watching tonight: ${
        FIRST_MONTH_DAILY_WATCH_TOPICS[index % FIRST_MONTH_DAILY_WATCH_TOPICS.length] ?? "source freshness before action"
      }.`,
    });
  });
}

function buildWeeklyItems(seed: FirstMonthWeeklySeed): readonly FirstMonthContentQueueItem[] {
  const baseDay = (seed.week - 1) * 7 + 1;
  return [
    ...seed.longVideos.map((title, index) =>
      contentItem({ day: baseDay + index * 2, format: "long_video", hook: title, pillar: longVideoPillar(index), platform: "youtube_long", scriptBeats: longScriptBeats(title), title }),
    ),
    ...seed.shorts.map((title, index) =>
      contentItem({ day: baseDay + (index % 7), format: "short_clip", hook: title, pillar: shortPillar(index), platform: shortPlatform(index), scriptBeats: shortScriptBeats(title), title }),
    ),
    contentItem({ day: baseDay + 4, format: "newsletter", hook: seed.newsletter, pillar: "board_meeting", platform: "newsletter", scriptBeats: boardScriptBeats(), title: seed.newsletter }),
    contentItem({ day: baseDay + 1, format: "founder_build_log", hook: seed.founderBuildLog, pillar: "founder_build_log", platform: "linkedin", scriptBeats: founderScriptBeats(), title: seed.founderBuildLog }),
    contentItem({ day: baseDay + 5, format: "board_meeting", hook: seed.boardMeeting, pillar: "board_meeting", platform: "podcast", scriptBeats: boardScriptBeats(), title: seed.boardMeeting }),
  ];
}

function contentItem(input: {
  readonly day: number;
  readonly platform: MediaPlatform;
  readonly pillar: GseContentPillar;
  readonly format: FirstMonthContentFormat;
  readonly title: string;
  readonly hook: string;
  readonly scriptBeats: readonly string[];
}): FirstMonthContentQueueItem {
  const safety = scanMediaClaimText([input.title, input.hook, ...input.scriptBeats].join(" "));
  return {
    ...input,
    approval: { externalSendAllowed: false, manualReviewRequired: true, publishAllowed: false, status: "DRAFT_ONLY" },
    cta: ctaFor(input.format),
    id: `day_${pad(input.day)}_${input.format}_${slug(input.title)}`,
    score: scoreContentIdea({
      complianceSafety: safety.ok && safety.warnings.length === 0 ? 1 : 0.65,
      demand: input.format === "daily_watch" ? 0.62 : 0.78,
      differentiation: 0.86,
      gseAuthorityFit: 0.9,
      hookStrength: input.title.length > 70 ? 0.76 : 0.84,
      monetizationFit: input.pillar === "sports_data_business" || input.pillar === "partner_tool_review" ? 0.88 : 0.7,
      productionEase: input.platform === "youtube_long" || input.platform === "podcast" ? 0.58 : 0.86,
    }),
    week: Math.ceil(input.day / 7),
  };
}

function buildWeeklyCadence(queue: readonly FirstMonthContentQueueItem[]): readonly FirstMonthWeeklyCadence[] {
  return FIRST_MONTH_WEEKLY_SEEDS.map((seed) => {
    const weekItems = queue.filter((item) => item.week === seed.week);
    const cadence = {
      boardMeetings: weekItems.filter((item) => item.format === "board_meeting").length,
      dailyWatchPosts: weekItems.filter((item) => item.format === "daily_watch").length,
      founderBuildLogs: weekItems.filter((item) => item.format === "founder_build_log").length,
      longVideos: weekItems.filter((item) => item.format === "long_video").length,
      newsletters: weekItems.filter((item) => item.format === "newsletter").length,
      shortClips: weekItems.filter((item) => item.format === "short_clip").length,
    };
    return { ...cadence, meetsMinimum: cadence.longVideos >= 2 && cadence.shortClips >= 10 && cadence.newsletters >= 1 && cadence.founderBuildLogs >= 1 && cadence.boardMeetings >= 1, week: seed.week };
  });
}

function longVideoPillar(index: number): GseContentPillar {
  return index % 2 === 0 ? "gse_lab" : "sports_data_business";
}

function shortPillar(index: number): GseContentPillar {
  const pillars: readonly GseContentPillar[] = ["no_bet_clinic", "market_mirage", "player_signal_lab", "decision_psychology", "gse_lab"];
  return pillars[index % pillars.length] ?? "gse_lab";
}

function shortPlatform(index: number): MediaPlatform {
  const platforms: readonly MediaPlatform[] = ["youtube_short", "tiktok", "instagram_reel", "youtube_short"];
  return platforms[index % platforms.length] ?? "youtube_short";
}

function longScriptBeats(title: string): readonly string[] {
  return ["Open with the misconception.", title, "Show the evidence boundary.", "Close with newsletter review, not a pick."];
}

function shortScriptBeats(title: string): readonly string[] {
  return ["One-line hook.", title, "One evidence or discipline lesson.", "One manual-review CTA."];
}

function founderScriptBeats(): readonly string[] {
  return ["State what shipped.", "Name one blocker.", "Explain why the blocker protects trust."];
}

function boardScriptBeats(): readonly string[] {
  return ["What shipped.", "What stayed blocked.", "What the next manual review covers."];
}

function ctaFor(format: FirstMonthContentFormat): string {
  if (format === "long_video" || format === "short_clip") return "Join the newsletter for board notes.";
  if (format === "daily_watch") return "Save the watch item before the slate.";
  return "Read the board notes when the draft is approved.";
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 56);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
