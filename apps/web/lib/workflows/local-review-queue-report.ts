import type {
  LocalReviewQueuePacketRecord,
  LocalReviewQueuePacketSource,
  LocalReviewQueueSnapshot,
  LocalReviewQueueStatus,
} from "./local-review-queue-persistence";
import type { DraftFenceWorkflowKind } from "./draft-fence-workflow";

export type LocalReviewQueueBlockerGroupKind = "packet_source" | "workflow_surface" | "source_id";

export type LocalReviewQueueBlockerStatusCount = { readonly status: LocalReviewQueueStatus; readonly count: number };

export type LocalReviewQueueBlockerGroup = {
  readonly kind: LocalReviewQueueBlockerGroupKind;
  readonly id: string;
  readonly label: string;
  readonly packetCount: number;
  readonly blockerCount: number;
  readonly stalePacketCount: number;
  readonly packetIds: readonly string[];
  readonly blockerReasons: readonly string[];
  readonly statusCounts: readonly LocalReviewQueueBlockerStatusCount[];
  readonly nextAction: string;
};

export type LocalReviewQueuePriorityEntry = {
  readonly packetId: string;
  readonly title: string;
  readonly source: LocalReviewQueuePacketSource;
  readonly workflowSurface: DraftFenceWorkflowKind;
  readonly status: LocalReviewQueueStatus;
  readonly sourceIds: readonly string[];
  readonly blockerCount: number;
  readonly warningCount: number;
  readonly stale: boolean;
  readonly priorityScore: number;
  readonly blockerReasons: readonly string[];
  readonly nextAction: string;
};

export type LocalReviewQueueBlockerReport = {
  readonly generatedAt: string;
  readonly persistenceMode: "memory_shadow";
  readonly totalPackets: number;
  readonly unresolvedPacketCount: number;
  readonly staleUnresolvedPacketCount: number;
  readonly sourceIds: readonly string[];
  readonly byPacketSource: readonly LocalReviewQueueBlockerGroup[];
  readonly byWorkflowSurface: readonly LocalReviewQueueBlockerGroup[];
  readonly bySourceId: readonly LocalReviewQueueBlockerGroup[];
  readonly priorityQueue: readonly LocalReviewQueuePriorityEntry[];
  readonly reviewGates: {
    readonly databaseWritesAllowed: false;
    readonly durablePersistenceEnabled: false;
    readonly externalSideEffectsAllowed: false;
    readonly publishAllowed: false;
    readonly routeExposureAllowed: false;
    readonly externalSendAllowed: false;
    readonly liveIntegrationAllowed: false;
    readonly affiliateActivationAllowed: false;
    readonly sponsorApprovalAutomatic: false;
  };
};

type MutableBlockerGroup = {
  readonly kind: LocalReviewQueueBlockerGroupKind;
  readonly id: string;
  readonly label: string;
  readonly packetIds: Set<string>;
  readonly stalePacketIds: Set<string>;
  readonly blockerReasons: Set<string>;
  readonly statusCounts: Map<LocalReviewQueueStatus, number>;
  blockerCount: number;
};

const STATUS_ORDER = [
  "BLOCKED",
  "NEEDS_MANUAL_REVIEW",
  "REPAIR_REQUIRED",
  "APPROVED_FOR_DRAFT_USE",
  "ARCHIVED",
] as const satisfies readonly LocalReviewQueueStatus[];

function unresolvedPackets(snapshot: LocalReviewQueueSnapshot): readonly LocalReviewQueuePacketRecord[] {
  const unresolvedIds = new Set(snapshot.unresolvedBlockerPackets);
  return snapshot.packets.filter((packet) => unresolvedIds.has(packet.packetId));
}

function sourceIdKeys(packet: LocalReviewQueuePacketRecord): readonly string[] {
  if (packet.sourceIds.length > 0) return packet.sourceIds;
  return ["unspecified_source"];
}

function stalePacketIdSet(snapshot: LocalReviewQueueSnapshot): ReadonlySet<string> {
  return new Set(snapshot.stalePackets);
}

function createGroup(input: {
  readonly kind: LocalReviewQueueBlockerGroupKind;
  readonly id: string;
  readonly label: string;
}): MutableBlockerGroup {
  return {
    blockerCount: 0,
    blockerReasons: new Set(),
    id: input.id,
    kind: input.kind,
    label: input.label,
    packetIds: new Set(),
    stalePacketIds: new Set(),
    statusCounts: new Map(),
  };
}

function addPacketToGroup(input: {
  readonly group: MutableBlockerGroup;
  readonly packet: LocalReviewQueuePacketRecord;
  readonly stalePacketIds: ReadonlySet<string>;
}): void {
  input.group.packetIds.add(input.packet.packetId);
  input.group.blockerCount += input.packet.blockers.length;
  for (const blocker of input.packet.blockers) input.group.blockerReasons.add(blocker);
  if (input.stalePacketIds.has(input.packet.packetId)) input.group.stalePacketIds.add(input.packet.packetId);
  input.group.statusCounts.set(input.packet.status, (input.group.statusCounts.get(input.packet.status) ?? 0) + 1);
}

function groupLabel(kind: LocalReviewQueueBlockerGroupKind, id: string): string {
  if (kind === "packet_source") return id.replaceAll("_", " ");
  if (kind === "workflow_surface") return `${id} workflow`;
  if (id === "unspecified_source") return "Unspecified source";
  return id;
}

function nextActionForGroup(group: MutableBlockerGroup): string {
  if (group.stalePacketIds.size > 0) return "Refresh stale packet evidence, then repair the listed blockers.";
  if (group.kind === "source_id") return "Resolve source-rights and payload-rights blockers for this source before review.";
  if (group.kind === "workflow_surface") return "Repair blockers on this workflow surface before any manual draft approval.";
  return "Assign owner review for this queue source and keep all live actions locked.";
}

function materializeGroup(group: MutableBlockerGroup): LocalReviewQueueBlockerGroup {
  return {
    blockerCount: group.blockerCount,
    blockerReasons: [...group.blockerReasons].sort(),
    id: group.id,
    kind: group.kind,
    label: group.label,
    nextAction: nextActionForGroup(group),
    packetCount: group.packetIds.size,
    packetIds: [...group.packetIds].sort(),
    stalePacketCount: group.stalePacketIds.size,
    statusCounts: STATUS_ORDER.map((status) => ({ count: group.statusCounts.get(status) ?? 0, status })).filter(
      (entry) => entry.count > 0,
    ),
  };
}

function sortGroups(groups: readonly LocalReviewQueueBlockerGroup[]): readonly LocalReviewQueueBlockerGroup[] {
  return [...groups].sort(
    (left, right) =>
      right.blockerCount - left.blockerCount ||
      right.stalePacketCount - left.stalePacketCount ||
      right.packetCount - left.packetCount ||
      left.id.localeCompare(right.id),
  );
}

function buildGroups(input: {
  readonly packets: readonly LocalReviewQueuePacketRecord[];
  readonly stalePacketIds: ReadonlySet<string>;
  readonly keyForPacket: (packet: LocalReviewQueuePacketRecord) => readonly string[];
  readonly kind: LocalReviewQueueBlockerGroupKind;
}): readonly LocalReviewQueueBlockerGroup[] {
  const groups = new Map<string, MutableBlockerGroup>();
  for (const packet of input.packets) {
    for (const id of input.keyForPacket(packet)) {
      const existing = groups.get(id);
      const group = existing ?? createGroup({ id, kind: input.kind, label: groupLabel(input.kind, id) });
      addPacketToGroup({ group, packet, stalePacketIds: input.stalePacketIds });
      groups.set(id, group);
    }
  }
  return sortGroups([...groups.values()].map(materializeGroup));
}

function priorityScoreFor(packet: LocalReviewQueuePacketRecord, stale: boolean): number {
  const statusWeight = packet.status === "BLOCKED" ? 25 : packet.status === "REPAIR_REQUIRED" ? 18 : 10;
  const staleWeight = stale ? 20 : 0;
  const sourceWeight = packet.source === "partner_sponsor" ? 6 : packet.source === "manual_shadow" ? 4 : 2;
  return packet.blockers.length * 10 + packet.warnings.length * 2 + statusWeight + staleWeight + sourceWeight;
}

function nextActionForPacket(packet: LocalReviewQueuePacketRecord, stale: boolean): string {
  if (stale) return "Refresh packet evidence before owner review.";
  if (packet.status === "REPAIR_REQUIRED") return "Repair blockers and re-run the draft review packet.";
  if (packet.status === "BLOCKED") return "Resolve blocking fences before manual review can proceed.";
  return "Manual review can proceed only after listed blockers are cleared.";
}

function buildPriorityQueue(input: {
  readonly packets: readonly LocalReviewQueuePacketRecord[];
  readonly stalePacketIds: ReadonlySet<string>;
}): readonly LocalReviewQueuePriorityEntry[] {
  return input.packets
    .map((packet) => {
      const stale = input.stalePacketIds.has(packet.packetId);
      return {
        blockerCount: packet.blockers.length,
        blockerReasons: [...packet.blockers].sort(),
        nextAction: nextActionForPacket(packet, stale),
        packetId: packet.packetId,
        priorityScore: priorityScoreFor(packet, stale),
        source: packet.source,
        sourceIds: [...packet.sourceIds].sort(),
        stale,
        status: packet.status,
        title: packet.title,
        warningCount: packet.warnings.length,
        workflowSurface: packet.kind,
      };
    })
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        right.blockerCount - left.blockerCount ||
        left.packetId.localeCompare(right.packetId),
    );
}

export function buildLocalReviewQueueBlockerReport(snapshot: LocalReviewQueueSnapshot): LocalReviewQueueBlockerReport {
  const packets = unresolvedPackets(snapshot);
  const staleIds = stalePacketIdSet(snapshot);
  return {
    byPacketSource: buildGroups({
      keyForPacket: (packet) => [packet.source],
      kind: "packet_source",
      packets,
      stalePacketIds: staleIds,
    }),
    bySourceId: buildGroups({
      keyForPacket: sourceIdKeys,
      kind: "source_id",
      packets,
      stalePacketIds: staleIds,
    }),
    byWorkflowSurface: buildGroups({
      keyForPacket: (packet) => [packet.kind],
      kind: "workflow_surface",
      packets,
      stalePacketIds: staleIds,
    }),
    generatedAt: snapshot.generatedAt,
    persistenceMode: "memory_shadow",
    priorityQueue: buildPriorityQueue({ packets, stalePacketIds: staleIds }),
    reviewGates: {
      affiliateActivationAllowed: false,
      databaseWritesAllowed: false,
      durablePersistenceEnabled: false,
      externalSendAllowed: false,
      externalSideEffectsAllowed: false,
      liveIntegrationAllowed: false,
      publishAllowed: false,
      routeExposureAllowed: false,
      sponsorApprovalAutomatic: false,
    },
    sourceIds: [...snapshot.sourceIds],
    staleUnresolvedPacketCount: packets.filter((packet) => staleIds.has(packet.packetId)).length,
    totalPackets: snapshot.totalPackets,
    unresolvedPacketCount: packets.length,
  };
}
