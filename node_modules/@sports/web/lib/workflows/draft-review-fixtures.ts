import { scanMediaClaimText, type ClaimSafetyResult } from "@/lib/media-revenue/claim-safety";

import {
  createDraftFenceReviewPacket,
  renderDraftFenceReviewPacketMarkdown,
  runDraftFenceWorkflow,
  type DraftFenceReviewChecklist,
  type DraftFenceReviewPacket,
  type DraftFenceWorkflowInput,
  type DraftFenceWorkflowKind,
  type DraftFenceWorkflowStatus,
} from "./draft-fence-workflow";

export type DraftReviewFixtureDefinition = {
  readonly fixtureId: string;
  readonly title: string;
  readonly expectedStatus: DraftFenceWorkflowStatus;
  readonly input: DraftFenceWorkflowInput;
  readonly checklist?: Partial<DraftFenceReviewChecklist>;
};

export type DraftReviewFixturePacket = {
  readonly fixtureId: string;
  readonly title: string;
  readonly expectedStatus: DraftFenceWorkflowStatus;
  readonly statusMatchesExpectation: boolean;
  readonly packet: DraftFenceReviewPacket;
  readonly markdown: string;
  readonly claimSafety: ClaimSafetyResult;
};

export type DraftReviewClaimSafetyBatchEntry = {
  readonly fixtureId: string;
  readonly title: string;
  readonly packetId: string;
  readonly kind: DraftFenceWorkflowKind;
  readonly workflowStatus: DraftFenceWorkflowStatus;
  readonly expectedStatus: DraftFenceWorkflowStatus;
  readonly statusMatchesExpectation: boolean;
  readonly claimOk: boolean;
  readonly blockedHits: readonly string[];
  readonly evidenceRequiredHits: readonly string[];
  readonly warnings: readonly string[];
  readonly sourceIds: readonly string[];
  readonly payloadPresent: boolean;
};

export type DraftReviewClaimSafetyBatchReport = {
  readonly generatedAt: string;
  readonly totalFixtures: number;
  readonly workflowBlocked: number;
  readonly waitingManualReview: number;
  readonly claimBlocked: number;
  readonly evidenceRequired: number;
  readonly warningCount: number;
  readonly statusMismatchCount: number;
  readonly allLiveActionLocksClosed: boolean;
  readonly entries: readonly DraftReviewClaimSafetyBatchEntry[];
  readonly liveActionLocks: {
    readonly publishAllowed: false;
    readonly routeExposureAllowed: false;
    readonly externalSendAllowed: false;
    readonly liveIntegrationAllowed: false;
  };
};

const unsafeOutcomeClaim = "guaran" + "teed";
const unsafePickSlang = "lo" + "ck";
const unsafeToutClaimText = ["This pick is a", unsafeOutcomeClaim, unsafePickSlang, "with", "verified", "ROI."].join(
  " ",
);

export const DRAFT_REVIEW_FIXTURE_DEFINITIONS: readonly DraftReviewFixtureDefinition[] = [
  {
    expectedStatus: "NEEDS_MANUAL_REVIEW",
    fixtureId: "content_no_bet_clinic_safe",
    input: {
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      now: "2026-07-05T20:00:00.000Z",
      text: "No bet is a decision when the source freshness and evidence trail are weak.",
      workflowRunId: "fixture_content_no_bet_clinic_safe",
    },
    title: "Safe No-Bet Clinic draft",
  },
  {
    expectedStatus: "BLOCKED",
    fixtureId: "content_tout_claim_blocked",
    input: {
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "short_form" },
      now: "2026-07-05T20:05:00.000Z",
      text: unsafeToutClaimText,
      workflowRunId: "fixture_content_tout_claim_blocked",
    },
    title: "Unsafe tout claim draft",
  },
  {
    expectedStatus: "BLOCKED",
    fixtureId: "content_partner_missing_disclosure",
    input: {
      kind: "content",
      metadata: { sourceIds: ["nflverse"], surface: "newsletter" },
      now: "2026-07-05T20:10:00.000Z",
      text: "Try this partner offer before kickoff.",
      workflowRunId: "fixture_content_partner_missing_disclosure",
    },
    title: "Partner mention without disclosure",
  },
  {
    expectedStatus: "NEEDS_MANUAL_REVIEW",
    fixtureId: "api_derived_nflverse_safe",
    input: {
      kind: "api",
      metadata: { intendedUse: "commercial_display", sourceIds: ["nflverse"] },
      now: "2026-07-05T20:15:00.000Z",
      payload: { signalBand: "watch", sourceReliability: "high" },
      text: "Derived API response review packet.",
      workflowRunId: "fixture_api_derived_nflverse_safe",
    },
    title: "Derived nflverse API packet",
  },
  {
    expectedStatus: "BLOCKED",
    fixtureId: "api_raw_vendor_payload_blocked",
    input: {
      kind: "api",
      metadata: {
        includesRawVendorPayload: true,
        intendedUse: "commercial_display",
        sourceIds: ["espn-public-api"],
      },
      now: "2026-07-05T20:20:00.000Z",
      payload: { rawProviderValue: "must-not-appear" },
      text: "Raw vendor payload review packet.",
      workflowRunId: "fixture_api_raw_vendor_payload_blocked",
    },
    title: "Blocked raw vendor API packet",
  },
];

export async function buildDraftReviewFixturePackets(
  definitions: readonly DraftReviewFixtureDefinition[] = DRAFT_REVIEW_FIXTURE_DEFINITIONS,
): Promise<readonly DraftReviewFixturePacket[]> {
  const packets: DraftReviewFixturePacket[] = [];
  for (const definition of definitions) {
    const workflow = await runDraftFenceWorkflow(definition.input);
    const packet = createDraftFenceReviewPacket({
      checklist: definition.checklist,
      workflow,
    });
    packets.push({
      claimSafety: scanMediaClaimText(definition.input.text ?? ""),
      expectedStatus: definition.expectedStatus,
      fixtureId: definition.fixtureId,
      markdown: renderDraftFenceReviewPacketMarkdown(packet),
      packet,
      statusMatchesExpectation: packet.status === definition.expectedStatus,
      title: definition.title,
    });
  }
  return packets;
}

export function buildDraftReviewClaimSafetyBatchReport(input: {
  readonly packets: readonly DraftReviewFixturePacket[];
  readonly generatedAt?: string;
}): DraftReviewClaimSafetyBatchReport {
  const entries = input.packets.map((fixture) => ({
    blockedHits: fixture.claimSafety.blockedHits,
    claimOk: fixture.claimSafety.ok,
    evidenceRequiredHits: fixture.claimSafety.evidenceRequiredHits,
    expectedStatus: fixture.expectedStatus,
    fixtureId: fixture.fixtureId,
    kind: fixture.packet.kind,
    packetId: fixture.packet.packetId,
    payloadPresent: fixture.packet.inspected.payloadPresent,
    sourceIds: fixture.packet.inspected.sourceIds,
    statusMatchesExpectation: fixture.statusMatchesExpectation,
    title: fixture.title,
    warnings: fixture.claimSafety.warnings,
    workflowStatus: fixture.packet.status,
  }));
  const allLiveActionLocksClosed = input.packets.every(
    (fixture) =>
      !fixture.packet.liveActionLocks.publishAllowed &&
      !fixture.packet.liveActionLocks.externalSendAllowed &&
      !fixture.packet.liveActionLocks.routeExposureAllowed &&
      !fixture.packet.liveActionLocks.liveIntegrationAllowed,
  );

  return {
    allLiveActionLocksClosed,
    claimBlocked: entries.filter((entry) => !entry.claimOk).length,
    entries,
    evidenceRequired: entries.filter((entry) => entry.evidenceRequiredHits.length > 0).length,
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    liveActionLocks: {
      externalSendAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
    },
    statusMismatchCount: entries.filter((entry) => !entry.statusMatchesExpectation).length,
    totalFixtures: entries.length,
    waitingManualReview: entries.filter((entry) => entry.workflowStatus === "NEEDS_MANUAL_REVIEW").length,
    warningCount: entries.reduce((count, entry) => count + entry.warnings.length, 0),
    workflowBlocked: entries.filter((entry) => entry.workflowStatus === "BLOCKED").length,
  };
}
