import type {
  DraftFenceReviewPacket,
  DraftFenceWorkflowKind,
  DraftFenceWorkflowStatus,
} from "./draft-fence-workflow";
import type { FirstMonthReviewQueueExport, FirstMonthReviewQueuePacket } from "@/lib/media-revenue/first-month-review-queue";
import type { PartnerSponsorReviewFixturePacket } from "./partner-sponsor-review-fixtures";

export type LocalReviewQueuePacketSource =
  | "draft_review_fixture"
  | "first_month_media"
  | "partner_sponsor"
  | "manual_shadow";

export type LocalReviewQueueStatus =
  | DraftFenceWorkflowStatus
  | "REPAIR_REQUIRED"
  | "APPROVED_FOR_DRAFT_USE"
  | "ARCHIVED";

export type LocalReviewQueueOwnerDecision = "UNREVIEWED" | "REPAIR_REQUIRED" | "APPROVED_FOR_DRAFT_USE";

export type LocalReviewQueueLiveActionLocks = {
  readonly publishAllowed: boolean;
  readonly routeExposureAllowed: boolean;
  readonly externalSendAllowed: boolean;
  readonly liveIntegrationAllowed: boolean;
  readonly affiliateActivationAllowed: boolean;
  readonly sponsorApprovalAutomatic: boolean;
  readonly databaseWritesAllowed: false;
  readonly durablePersistenceEnabled: false;
};

export type LocalReviewQueuePacketInput = {
  readonly packetId: string;
  readonly workflowRunId: string;
  readonly source: LocalReviewQueuePacketSource;
  readonly title: string;
  readonly kind: DraftFenceWorkflowKind;
  readonly status: DraftFenceWorkflowStatus;
  readonly createdAt: string;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly fixHints: readonly string[];
  readonly sourceIds: readonly string[];
  readonly payloadPresent: boolean;
  readonly liveActionLocks: LocalReviewQueueLiveActionLocks;
};

export type LocalReviewQueuePacketRecord = Omit<LocalReviewQueuePacketInput, "status"> & {
  readonly status: LocalReviewQueueStatus;
  readonly initialWorkflowStatus: DraftFenceWorkflowStatus;
  readonly version: number;
  readonly ownerDecision: LocalReviewQueueOwnerDecision;
  readonly reviewer: string | null;
  readonly reviewedAt: string | null;
  readonly notes: string;
  readonly updatedAt: string;
  readonly lastEventId: string;
};

export type LocalReviewQueueEnqueueEvent = {
  readonly eventId: string;
  readonly eventType: "PACKET_ENQUEUED";
  readonly occurredAt: string;
  readonly packet: LocalReviewQueuePacketInput;
};

export type LocalReviewQueueDecisionEvent = {
  readonly eventId: string;
  readonly eventType: "OWNER_DECISION_RECORDED";
  readonly occurredAt: string;
  readonly packetId: string;
  readonly expectedVersion: number;
  readonly decision: Exclude<LocalReviewQueueOwnerDecision, "UNREVIEWED">;
  readonly reviewer: string;
  readonly notes: string;
};

export type LocalReviewQueueArchiveEvent = {
  readonly eventId: string;
  readonly eventType: "PACKET_ARCHIVED";
  readonly occurredAt: string;
  readonly packetId: string;
  readonly expectedVersion: number;
  readonly reviewer: string;
  readonly notes: string;
};

export type LocalReviewQueueEvent =
  | LocalReviewQueueEnqueueEvent
  | LocalReviewQueueDecisionEvent
  | LocalReviewQueueArchiveEvent;

export type LocalReviewQueueAppendResult =
  | {
      readonly ok: true;
      readonly event: LocalReviewQueueEvent;
      readonly snapshot: LocalReviewQueueSnapshot;
    }
  | {
      readonly ok: false;
      readonly code:
        | "duplicate_event"
        | "duplicate_packet"
        | "unknown_packet"
        | "version_conflict"
        | "unresolved_blockers"
        | "live_action_unlock_blocked";
      readonly message: string;
      readonly snapshot: LocalReviewQueueSnapshot;
    };

export type LocalReviewQueueSnapshotOptions = {
  readonly now?: string;
  readonly staleAfterHours?: number;
};

export type LocalReviewQueueSnapshot = {
  readonly generatedAt: string;
  readonly persistenceMode: "memory_shadow";
  readonly databaseWritesAllowed: false;
  readonly durablePersistenceEnabled: false;
  readonly externalSideEffectsAllowed: false;
  readonly totalEvents: number;
  readonly totalPackets: number;
  readonly blockedPackets: number;
  readonly waitingManualReviewPackets: number;
  readonly repairRequiredPackets: number;
  readonly approvedForDraftUsePackets: number;
  readonly archivedPackets: number;
  readonly unresolvedBlockerPackets: readonly string[];
  readonly stalePackets: readonly string[];
  readonly sourceIds: readonly string[];
  readonly allLiveActionLocksClosed: boolean;
  readonly packets: readonly LocalReviewQueuePacketRecord[];
  readonly events: readonly LocalReviewQueueEvent[];
  readonly replayErrors: readonly string[];
};

export type LocalReviewQueuePersistenceSimulator = {
  readonly append: (event: LocalReviewQueueEvent) => LocalReviewQueueAppendResult;
  readonly appendMany: (events: readonly LocalReviewQueueEvent[]) => readonly LocalReviewQueueAppendResult[];
  readonly snapshot: (options?: LocalReviewQueueSnapshotOptions) => LocalReviewQueueSnapshot;
  readonly events: () => readonly LocalReviewQueueEvent[];
  readonly findPacket: (packetId: string) => LocalReviewQueuePacketRecord | null;
};

const CLOSED_LIVE_ACTION_LOCKS: LocalReviewQueueLiveActionLocks = {
  affiliateActivationAllowed: false,
  databaseWritesAllowed: false,
  durablePersistenceEnabled: false,
  externalSendAllowed: false,
  liveIntegrationAllowed: false,
  publishAllowed: false,
  routeExposureAllowed: false,
  sponsorApprovalAutomatic: false,
};

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function cloneLocks(locks: LocalReviewQueueLiveActionLocks): LocalReviewQueueLiveActionLocks {
  return {
    affiliateActivationAllowed: locks.affiliateActivationAllowed,
    databaseWritesAllowed: false,
    durablePersistenceEnabled: false,
    externalSendAllowed: locks.externalSendAllowed,
    liveIntegrationAllowed: locks.liveIntegrationAllowed,
    publishAllowed: locks.publishAllowed,
    routeExposureAllowed: locks.routeExposureAllowed,
    sponsorApprovalAutomatic: locks.sponsorApprovalAutomatic,
  };
}

function normalizeLocks(
  locks?: Partial<Omit<LocalReviewQueueLiveActionLocks, "databaseWritesAllowed" | "durablePersistenceEnabled">>,
): LocalReviewQueueLiveActionLocks {
  return {
    ...CLOSED_LIVE_ACTION_LOCKS,
    affiliateActivationAllowed: locks?.affiliateActivationAllowed ?? false,
    externalSendAllowed: locks?.externalSendAllowed ?? false,
    liveIntegrationAllowed: locks?.liveIntegrationAllowed ?? false,
    publishAllowed: locks?.publishAllowed ?? false,
    routeExposureAllowed: locks?.routeExposureAllowed ?? false,
    sponsorApprovalAutomatic: locks?.sponsorApprovalAutomatic ?? false,
  };
}

function locksAreClosed(locks: LocalReviewQueueLiveActionLocks): boolean {
  return (
    !locks.publishAllowed &&
    !locks.routeExposureAllowed &&
    !locks.externalSendAllowed &&
    !locks.liveIntegrationAllowed &&
    !locks.affiliateActivationAllowed &&
    !locks.sponsorApprovalAutomatic &&
    !locks.databaseWritesAllowed &&
    !locks.durablePersistenceEnabled
  );
}

function clonePacketInput(packet: LocalReviewQueuePacketInput): LocalReviewQueuePacketInput {
  return {
    blockers: [...packet.blockers],
    createdAt: packet.createdAt,
    fixHints: [...packet.fixHints],
    kind: packet.kind,
    liveActionLocks: cloneLocks(packet.liveActionLocks),
    packetId: packet.packetId,
    payloadPresent: packet.payloadPresent,
    source: packet.source,
    sourceIds: [...packet.sourceIds],
    status: packet.status,
    title: packet.title,
    warnings: [...packet.warnings],
    workflowRunId: packet.workflowRunId,
  };
}

function clonePacketRecord(packet: LocalReviewQueuePacketRecord): LocalReviewQueuePacketRecord {
  return {
    blockers: [...packet.blockers],
    createdAt: packet.createdAt,
    fixHints: [...packet.fixHints],
    kind: packet.kind,
    initialWorkflowStatus: packet.initialWorkflowStatus,
    lastEventId: packet.lastEventId,
    liveActionLocks: cloneLocks(packet.liveActionLocks),
    notes: packet.notes,
    ownerDecision: packet.ownerDecision,
    packetId: packet.packetId,
    payloadPresent: packet.payloadPresent,
    reviewedAt: packet.reviewedAt,
    reviewer: packet.reviewer,
    source: packet.source,
    sourceIds: [...packet.sourceIds],
    status: packet.status,
    title: packet.title,
    updatedAt: packet.updatedAt,
    version: packet.version,
    warnings: [...packet.warnings],
    workflowRunId: packet.workflowRunId,
  };
}

function cloneEvent(event: LocalReviewQueueEvent): LocalReviewQueueEvent {
  if (event.eventType === "PACKET_ENQUEUED") {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      packet: clonePacketInput(event.packet),
    };
  }
  return { ...event };
}

function cloneEvents(events: readonly LocalReviewQueueEvent[]): readonly LocalReviewQueueEvent[] {
  return events.map(cloneEvent);
}

function packetRecordFromEnqueue(event: LocalReviewQueueEnqueueEvent): LocalReviewQueuePacketRecord {
  return {
    ...clonePacketInput(event.packet),
    initialWorkflowStatus: event.packet.status,
    lastEventId: event.eventId,
    notes: "",
    ownerDecision: "UNREVIEWED",
    reviewedAt: null,
    reviewer: null,
    status: event.packet.status,
    updatedAt: event.occurredAt,
    version: 1,
  };
}

function statusForDecision(decision: Exclude<LocalReviewQueueOwnerDecision, "UNREVIEWED">): LocalReviewQueueStatus {
  return decision === "REPAIR_REQUIRED" ? "REPAIR_REQUIRED" : "APPROVED_FOR_DRAFT_USE";
}

function applyEventToPackets(
  packets: Map<string, LocalReviewQueuePacketRecord>,
  event: LocalReviewQueueEvent,
): string | null {
  if (event.eventType === "PACKET_ENQUEUED") {
    if (packets.has(event.packet.packetId)) return `Duplicate packet ${event.packet.packetId} during replay.`;
    if (!locksAreClosed(event.packet.liveActionLocks)) {
      return `Packet ${event.packet.packetId} attempted to unlock live actions during replay.`;
    }
    packets.set(event.packet.packetId, packetRecordFromEnqueue(event));
    return null;
  }

  const existing = packets.get(event.packetId);
  if (existing === undefined) return `Event ${event.eventId} targets unknown packet ${event.packetId}.`;
  if (existing.version !== event.expectedVersion) {
    return `Event ${event.eventId} expected version ${event.expectedVersion} but packet ${event.packetId} is version ${existing.version}.`;
  }
  if (
    event.eventType === "OWNER_DECISION_RECORDED" &&
    event.decision === "APPROVED_FOR_DRAFT_USE" &&
    existing.blockers.length > 0
  ) {
    return `Packet ${event.packetId} has unresolved blockers and cannot be approved for draft use.`;
  }

  packets.set(event.packetId, {
    ...clonePacketRecord(existing),
    lastEventId: event.eventId,
    notes: event.notes,
    ownerDecision: event.eventType === "OWNER_DECISION_RECORDED" ? event.decision : existing.ownerDecision,
    reviewedAt: event.occurredAt,
    reviewer: event.reviewer,
    status: event.eventType === "PACKET_ARCHIVED" ? "ARCHIVED" : statusForDecision(event.decision),
    updatedAt: event.occurredAt,
    version: existing.version + 1,
  });
  return null;
}

export function replayLocalReviewQueueEvents(
  events: readonly LocalReviewQueueEvent[],
  options: LocalReviewQueueSnapshotOptions = {},
): LocalReviewQueueSnapshot {
  const packets = new Map<string, LocalReviewQueuePacketRecord>();
  const replayErrors: string[] = [];
  const seenEventIds = new Set<string>();

  for (const event of events) {
    if (seenEventIds.has(event.eventId)) {
      replayErrors.push(`Duplicate event ${event.eventId} during replay.`);
      continue;
    }
    seenEventIds.add(event.eventId);
    const error = applyEventToPackets(packets, event);
    if (error !== null) replayErrors.push(error);
  }

  const packetRecords = [...packets.values()].map(clonePacketRecord);
  const generatedAt = options.now ?? new Date(0).toISOString();
  const staleAfterHours = options.staleAfterHours ?? 72;
  const generatedAtMs = Date.parse(generatedAt);
  const generatedAtParsable = Number.isFinite(generatedAtMs);
  const staleCutoffMs = generatedAtMs - staleAfterHours * 60 * 60 * 1000;
  const stalePackets = packetRecords
    .filter((packet) => {
      if (packet.status === "APPROVED_FOR_DRAFT_USE" || packet.status === "ARCHIVED") return false;
      const updatedAtMs = Date.parse(packet.updatedAt);
      // Fail closed on corrupt freshness inputs (non-negotiable #5): an unparsable
      // snapshot `now` or packet `updatedAt` must never read as fresh-green. Flag the
      // unresolved packet as needing refresh instead of silently marking it fresh,
      // mirroring detectStaleSource which never presents an unparsable timestamp as FRESH.
      if (!generatedAtParsable || !Number.isFinite(updatedAtMs)) return true;
      return updatedAtMs < staleCutoffMs;
    })
    .map((packet) => packet.packetId)
    .sort();

  return {
    allLiveActionLocksClosed: packetRecords.every((packet) => locksAreClosed(packet.liveActionLocks)),
    approvedForDraftUsePackets: packetRecords.filter((packet) => packet.status === "APPROVED_FOR_DRAFT_USE").length,
    archivedPackets: packetRecords.filter((packet) => packet.status === "ARCHIVED").length,
    blockedPackets: packetRecords.filter((packet) => packet.status === "BLOCKED").length,
    databaseWritesAllowed: false,
    durablePersistenceEnabled: false,
    events: cloneEvents(events),
    externalSideEffectsAllowed: false,
    generatedAt,
    packets: packetRecords,
    persistenceMode: "memory_shadow",
    repairRequiredPackets: packetRecords.filter((packet) => packet.status === "REPAIR_REQUIRED").length,
    replayErrors,
    sourceIds: uniqueSorted(packetRecords.flatMap((packet) => packet.sourceIds)),
    stalePackets,
    totalEvents: events.length,
    totalPackets: packetRecords.length,
    unresolvedBlockerPackets: packetRecords
      .filter((packet) => packet.blockers.length > 0 && packet.status !== "ARCHIVED")
      .map((packet) => packet.packetId)
      .sort(),
    waitingManualReviewPackets: packetRecords.filter((packet) => packet.status === "NEEDS_MANUAL_REVIEW").length,
  };
}

export function createLocalReviewQueuePersistenceSimulator(
  initialEvents: readonly LocalReviewQueueEvent[] = [],
): LocalReviewQueuePersistenceSimulator {
  let events = cloneEvents(initialEvents);

  function snapshot(options: LocalReviewQueueSnapshotOptions = {}): LocalReviewQueueSnapshot {
    return replayLocalReviewQueueEvents(events, options);
  }

  function append(event: LocalReviewQueueEvent): LocalReviewQueueAppendResult {
    const current = snapshot({ now: event.occurredAt });
    if (current.events.some((candidate) => candidate.eventId === event.eventId)) {
      return {
        code: "duplicate_event",
        message: `Review queue event ${event.eventId} already exists.`,
        ok: false,
        snapshot: current,
      };
    }
    if (event.eventType === "PACKET_ENQUEUED") {
      if (current.packets.some((packet) => packet.packetId === event.packet.packetId)) {
        return {
          code: "duplicate_packet",
          message: `Review packet ${event.packet.packetId} already exists in the local queue.`,
          ok: false,
          snapshot: current,
        };
      }
      if (!locksAreClosed(event.packet.liveActionLocks)) {
        return {
          code: "live_action_unlock_blocked",
          message: `Review packet ${event.packet.packetId} attempted to unlock a live action.`,
          ok: false,
          snapshot: current,
        };
      }
    } else {
      const existing = current.packets.find((packet) => packet.packetId === event.packetId);
      if (existing === undefined) {
        return {
          code: "unknown_packet",
          message: `Review packet ${event.packetId} is not in the local queue.`,
          ok: false,
          snapshot: current,
        };
      }
      if (existing.version !== event.expectedVersion) {
        return {
          code: "version_conflict",
          message: `Review packet ${event.packetId} is version ${existing.version}, not ${event.expectedVersion}.`,
          ok: false,
          snapshot: current,
        };
      }
      if (
        event.eventType === "OWNER_DECISION_RECORDED" &&
        event.decision === "APPROVED_FOR_DRAFT_USE" &&
        existing.blockers.length > 0
      ) {
        return {
          code: "unresolved_blockers",
          message: `Review packet ${event.packetId} has unresolved blockers and cannot be approved for draft use.`,
          ok: false,
          snapshot: current,
        };
      }
    }

    const storedEvent = cloneEvent(event);
    events = [...events, storedEvent];
    return {
      event: cloneEvent(storedEvent),
      ok: true,
      snapshot: snapshot({ now: event.occurredAt }),
    };
  }

  function appendMany(inputEvents: readonly LocalReviewQueueEvent[]): readonly LocalReviewQueueAppendResult[] {
    return inputEvents.map((event) => append(event));
  }

  function findPacket(packetId: string): LocalReviewQueuePacketRecord | null {
    return snapshot().packets.find((packet) => packet.packetId === packetId) ?? null;
  }

  return {
    append,
    appendMany,
    events: () => cloneEvents(events),
    findPacket,
    snapshot,
  };
}

export function localReviewQueuePacketFromDraftFencePacket(input: {
  readonly packet: DraftFenceReviewPacket;
  readonly source: LocalReviewQueuePacketSource;
  readonly title?: string;
}): LocalReviewQueuePacketInput {
  return {
    blockers: [...input.packet.blockers],
    createdAt: input.packet.createdAt,
    fixHints: [...input.packet.fixHints],
    kind: input.packet.kind,
    liveActionLocks: normalizeLocks(input.packet.liveActionLocks),
    packetId: input.packet.packetId,
    payloadPresent: input.packet.inspected.payloadPresent,
    source: input.source,
    sourceIds: [...input.packet.inspected.sourceIds],
    status: input.packet.status,
    title: input.title ?? input.packet.packetId,
    warnings: [...input.packet.warnings],
    workflowRunId: input.packet.workflowRunId,
  };
}

export function localReviewQueuePacketFromFirstMonthReviewPacket(
  packet: FirstMonthReviewQueuePacket,
): LocalReviewQueuePacketInput {
  return {
    blockers: [...packet.blockers],
    createdAt: "2026-07-05T00:00:00.000Z",
    fixHints: [...packet.fixHints],
    kind: "content",
    liveActionLocks: normalizeLocks(packet.liveActionLocks),
    packetId: packet.packetId,
    payloadPresent: false,
    source: "first_month_media",
    sourceIds: [],
    status: packet.workflowStatus,
    title: packet.title,
    warnings: [...packet.warnings],
    workflowRunId: `first_month_review_${packet.itemId}`,
  };
}

export function localReviewQueuePacketsFromFirstMonthReviewExport(
  reviewExport: FirstMonthReviewQueueExport,
): readonly LocalReviewQueuePacketInput[] {
  return reviewExport.packets.map((packet) => ({
    ...localReviewQueuePacketFromFirstMonthReviewPacket(packet),
    createdAt: reviewExport.generatedAt,
  }));
}

function partnerSponsorBlockers(packet: PartnerSponsorReviewFixturePacket): readonly string[] {
  return [
    ...packet.packet.blockers,
    ...packet.eligibility.blockers.map((blocker) => `${blocker.code}: ${blocker.message}`),
    ...packet.sponsorIndependence.reasons,
    ...packet.commercialCopy.blockedTerms.map((term) => `commercial-copy blocked term: ${term}`),
    ...packet.commercialCopy.evidenceRequiredTerms.map((term) => `commercial-copy evidence required: ${term}`),
  ];
}

export function localReviewQueuePacketFromPartnerSponsorFixture(
  packet: PartnerSponsorReviewFixturePacket,
): LocalReviewQueuePacketInput {
  const blockers = partnerSponsorBlockers(packet);
  return {
    blockers,
    createdAt: packet.packet.createdAt,
    fixHints: [...packet.packet.fixHints],
    kind: packet.packet.kind,
    liveActionLocks: normalizeLocks(packet.liveActionLocks),
    packetId: packet.packet.packetId,
    payloadPresent: packet.packet.inspected.payloadPresent,
    source: "partner_sponsor",
    sourceIds: [...packet.packet.inspected.sourceIds],
    status: blockers.length > 0 ? "BLOCKED" : "NEEDS_MANUAL_REVIEW",
    title: packet.title,
    warnings: [...packet.packet.warnings],
    workflowRunId: packet.packet.workflowRunId,
  };
}

export function localReviewQueuePacketsFromPartnerSponsorFixtures(
  packets: readonly PartnerSponsorReviewFixturePacket[],
): readonly LocalReviewQueuePacketInput[] {
  return packets.map(localReviewQueuePacketFromPartnerSponsorFixture);
}

export function createLocalReviewQueueEnqueueEvent(input: {
  readonly packet: LocalReviewQueuePacketInput;
  readonly eventId?: string;
  readonly occurredAt?: string;
}): LocalReviewQueueEnqueueEvent {
  return {
    eventId: input.eventId ?? `enqueue:${input.packet.packetId}`,
    eventType: "PACKET_ENQUEUED",
    occurredAt: input.occurredAt ?? input.packet.createdAt,
    packet: clonePacketInput(input.packet),
  };
}

export function renderLocalReviewQueueSnapshotMarkdown(snapshot: LocalReviewQueueSnapshot): string {
  const packetRows = snapshot.packets.map(
    (packet) =>
      `| ${packet.packetId} | ${packet.source} | ${packet.status} | ${packet.version} | ${packet.blockers.length} | ${packet.ownerDecision} |`,
  );
  return [
    "# Local Review Queue Persistence Snapshot",
    "",
    `- Generated at: ${snapshot.generatedAt}`,
    `- Persistence mode: ${snapshot.persistenceMode}`,
    `- Database writes allowed: no`,
    `- Durable persistence enabled: no`,
    `- External side effects allowed: no`,
    `- Total packets: ${snapshot.totalPackets}`,
    `- Total events: ${snapshot.totalEvents}`,
    `- All live action locks closed: ${snapshot.allLiveActionLocksClosed ? "yes" : "no"}`,
    `- Unresolved blocker packets: ${snapshot.unresolvedBlockerPackets.length}`,
    `- Stale packets: ${snapshot.stalePackets.length}`,
    "",
    "| Packet | Source | Status | Version | Blockers | Owner decision |",
    "| --- | --- | --- | ---: | ---: | --- |",
    ...(packetRows.length > 0 ? packetRows : ["| none | none | none | 0 | 0 | none |"]),
  ].join("\n");
}
