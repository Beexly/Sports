import {
  buildFirstMonthMediaQueue,
  type FirstMonthContentQueueItem,
  type FirstMonthWeeklyCadence,
} from "./first-month-content-queue";
import { scanMediaClaimText, type ClaimSafetyResult } from "./claim-safety";
import {
  createDraftFenceReviewPacket,
  renderDraftFenceReviewPacketMarkdown,
  runDraftFenceWorkflow,
  type DraftFenceWorkflowStatus,
} from "@/lib/workflows/draft-fence-workflow";

export type FirstMonthReviewQueuePacket = {
  readonly itemId: string;
  readonly packetId: string;
  readonly day: number;
  readonly week: number;
  readonly title: string;
  readonly workflowStatus: DraftFenceWorkflowStatus;
  readonly score: number;
  readonly grade: string;
  readonly scriptBeatCount: number;
  readonly claimSafety: ClaimSafetyResult;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly fixHints: readonly string[];
  readonly markdown: string;
  readonly liveActionLocks: {
    readonly publishAllowed: false;
    readonly externalSendAllowed: false;
    readonly routeExposureAllowed: false;
    readonly liveIntegrationAllowed: false;
  };
};

export type FirstMonthReviewQueueExport = {
  readonly generatedAt: string;
  readonly totalPackets: number;
  readonly blockedPackets: number;
  readonly waitingManualReviewPackets: number;
  readonly claimBlockedPackets: number;
  readonly evidenceRequiredPackets: number;
  readonly allLiveActionLocksClosed: boolean;
  readonly weeklyCadence: readonly FirstMonthWeeklyCadence[];
  readonly packets: readonly FirstMonthReviewQueuePacket[];
};

export async function buildFirstMonthReviewQueueExport(input: {
  readonly queue?: readonly FirstMonthContentQueueItem[];
  readonly generatedAt?: string;
} = {}): Promise<FirstMonthReviewQueueExport> {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const queue = input.queue ?? buildFirstMonthMediaQueue();
  const packets = await Promise.all(queue.map((item) => buildReviewPacket(item, generatedAt)));
  return {
    allLiveActionLocksClosed: packets.every(
      (packet) =>
        !packet.liveActionLocks.publishAllowed &&
        !packet.liveActionLocks.externalSendAllowed &&
        !packet.liveActionLocks.routeExposureAllowed &&
        !packet.liveActionLocks.liveIntegrationAllowed,
    ),
    blockedPackets: packets.filter((packet) => packet.workflowStatus === "BLOCKED").length,
    claimBlockedPackets: packets.filter((packet) => !packet.claimSafety.ok).length,
    evidenceRequiredPackets: packets.filter((packet) => packet.claimSafety.evidenceRequiredHits.length > 0).length,
    generatedAt,
    packets,
    totalPackets: packets.length,
    waitingManualReviewPackets: packets.filter((packet) => packet.workflowStatus === "NEEDS_MANUAL_REVIEW").length,
    weeklyCadence: summarizeCadence(queue),
  };
}

async function buildReviewPacket(
  item: FirstMonthContentQueueItem,
  generatedAt: string,
): Promise<FirstMonthReviewQueuePacket> {
  const text = reviewTextFor(item);
  const workflow = await runDraftFenceWorkflow({
    kind: "content",
    metadata: {
      contentFormat: item.format,
      contentItemId: item.id,
      platform: item.platform,
      sourceIds: ["nflverse"],
      surface: item.platform,
    },
    now: generatedAt,
    text,
    workflowRunId: `first_month_review_${item.id}`,
  });
  const packet = createDraftFenceReviewPacket({ workflow });
  return {
    blockers: packet.blockers,
    claimSafety: scanMediaClaimText(text),
    day: item.day,
    fixHints: packet.fixHints,
    grade: item.score.grade,
    itemId: item.id,
    liveActionLocks: packet.liveActionLocks,
    markdown: renderMediaReviewMarkdown(item, renderDraftFenceReviewPacketMarkdown(packet)),
    packetId: packet.packetId,
    score: item.score.score,
    scriptBeatCount: item.scriptBeats.length,
    title: item.title,
    warnings: packet.warnings,
    week: item.week,
    workflowStatus: packet.status,
  };
}

function reviewTextFor(item: FirstMonthContentQueueItem): string {
  return [item.title, item.hook, ...item.scriptBeats, item.cta].join(" ");
}

function renderMediaReviewMarkdown(item: FirstMonthContentQueueItem, packetMarkdown: string): string {
  return [
    `# First-Month Media Review: ${item.title}`,
    "",
    `- Item id: ${item.id}`,
    `- Day: ${item.day}`,
    `- Week: ${item.week}`,
    `- Platform: ${item.platform}`,
    `- Pillar: ${item.pillar}`,
    `- Format: ${item.format}`,
    `- Score: ${item.score.score}`,
    `- Grade: ${item.score.grade}`,
    `- Script beat count: ${item.scriptBeats.length}`,
    "",
    packetMarkdown,
  ].join("\n");
}

function summarizeCadence(queue: readonly FirstMonthContentQueueItem[]): readonly FirstMonthWeeklyCadence[] {
  const weeks = [1, 2, 3, 4] as const;
  return weeks.map((week) => {
    const items = queue.filter((item) => item.week === week);
    const cadence = {
      boardMeetings: items.filter((item) => item.format === "board_meeting").length,
      dailyWatchPosts: items.filter((item) => item.format === "daily_watch").length,
      founderBuildLogs: items.filter((item) => item.format === "founder_build_log").length,
      longVideos: items.filter((item) => item.format === "long_video").length,
      newsletters: items.filter((item) => item.format === "newsletter").length,
      shortClips: items.filter((item) => item.format === "short_clip").length,
    };
    return {
      ...cadence,
      meetsMinimum:
        cadence.longVideos >= 2 &&
        cadence.shortClips >= 10 &&
        cadence.newsletters >= 1 &&
        cadence.founderBuildLogs >= 1 &&
        cadence.boardMeetings >= 1,
      week,
    };
  });
}
