import {
  affiliateDisclosureFence,
  apiPayloadRightsFence,
  commercialCopyFence,
  evaluateFences,
  noRawNgsFence,
  responsibleGamingFence,
  sourceRightsFence,
  summarizeFenceResults,
  type FenceInput,
  type FencePlugin,
  type FenceResult,
  type FenceSeverity,
} from "@/lib/fences";

export type DraftFenceWorkflowKind = "content" | "api";

export type DraftFenceWorkflowStatus = "BLOCKED" | "NEEDS_MANUAL_REVIEW";

export type DraftFenceWorkflowStageId =
  | "source_rights"
  | "commercial_copy"
  | "affiliate_disclosure"
  | "responsible_gaming"
  | "api_payload_rights"
  | "restricted_tracking_data"
  | "manual_review";

export type DraftFenceWorkflowInput = {
  readonly kind: DraftFenceWorkflowKind;
  readonly text?: string;
  readonly payload?: unknown;
  readonly metadata: Record<string, unknown>;
  readonly now?: string;
  readonly workflowRunId?: string;
  readonly plugins?: readonly FencePlugin[];
};

export type DraftFenceWorkflowStageResult = {
  readonly order: number;
  readonly stageId: DraftFenceWorkflowStageId;
  readonly fenceId: string;
  readonly ok: boolean;
  readonly severity: FenceSeverity;
  readonly reasons: readonly string[];
  readonly fixHints: readonly string[];
};

export type DraftFenceManualReviewGate = {
  readonly required: true;
  readonly passed: false;
  readonly status: "WAITING_ON_REPAIR" | "WAITING_ON_OWNER_REVIEW";
  readonly reason: string;
};

export type DraftFenceWorkflowResult = {
  readonly workflowRunId: string;
  readonly kind: DraftFenceWorkflowKind;
  readonly status: DraftFenceWorkflowStatus;
  readonly generatedAt: string;
  readonly stageResults: readonly DraftFenceWorkflowStageResult[];
  readonly summary: FenceResult;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly fixHints: readonly string[];
  readonly manualReviewGate: DraftFenceManualReviewGate;
  readonly publishAllowed: false;
  readonly routeExposureAllowed: false;
  readonly externalSendAllowed: false;
  readonly liveIntegrationAllowed: false;
  readonly outputArtifacts: readonly string[];
  readonly inspected: {
    readonly sourceIds: readonly string[];
    readonly textCharacters: number;
    readonly payloadPresent: boolean;
  };
};

export const CONTENT_DRAFT_WORKFLOW_FENCES: readonly FencePlugin[] = [
  sourceRightsFence,
  commercialCopyFence,
  noRawNgsFence,
  affiliateDisclosureFence,
  responsibleGamingFence,
];

export const API_DRAFT_WORKFLOW_FENCES: readonly FencePlugin[] = [
  sourceRightsFence,
  apiPayloadRightsFence,
  noRawNgsFence,
];

function stageForFence(fenceId: string): DraftFenceWorkflowStageId {
  if (fenceId === "source-rights") return "source_rights";
  if (fenceId === "commercial-copy") return "commercial_copy";
  if (fenceId === "affiliate-disclosure") return "affiliate_disclosure";
  if (fenceId === "responsible-gaming") return "responsible_gaming";
  if (fenceId === "api-payload-rights") return "api_payload_rights";
  if (fenceId === "no-raw-ngs") return "restricted_tracking_data";
  return "manual_review";
}

function sourceIdsFromMetadata(metadata: Record<string, unknown>): readonly string[] {
  const sourceIds = metadata.sourceIds;
  if (!Array.isArray(sourceIds)) return [];
  return sourceIds.filter((sourceId): sourceId is string => typeof sourceId === "string" && sourceId.trim().length > 0);
}

function defaultWorkflowRunId(kind: DraftFenceWorkflowKind, generatedAt: string): string {
  const normalized = `${kind}:${generatedAt}`.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `draft-fence-${normalized.slice(0, 96)}`;
}

function pluginsForKind(input: DraftFenceWorkflowInput): readonly FencePlugin[] {
  if (input.plugins !== undefined) return input.plugins;
  return input.kind === "content" ? CONTENT_DRAFT_WORKFLOW_FENCES : API_DRAFT_WORKFLOW_FENCES;
}

function fenceInputFor(input: DraftFenceWorkflowInput): FenceInput {
  return {
    metadata: {
      ...input.metadata,
      workflowKind: input.kind,
    },
    payload: input.payload,
    surface: input.kind,
    text: input.text,
  };
}

function stageResultsFor(results: readonly FenceResult[]): readonly DraftFenceWorkflowStageResult[] {
  return results.map((result, index) => ({
    fenceId: result.fenceId,
    fixHints: result.fixHints,
    ok: result.ok,
    order: index + 1,
    reasons: result.reasons,
    severity: result.severity,
    stageId: stageForFence(result.fenceId),
  }));
}

export async function runDraftFenceWorkflow(input: DraftFenceWorkflowInput): Promise<DraftFenceWorkflowResult> {
  const generatedAt = input.now ?? new Date(0).toISOString();
  const workflowRunId = input.workflowRunId ?? defaultWorkflowRunId(input.kind, generatedAt);
  const results = await evaluateFences(pluginsForKind(input), fenceInputFor(input));
  const summary = summarizeFenceResults(results);
  const stageResults = stageResultsFor(results);
  const blockers = stageResults
    .filter((stage) => stage.severity === "BLOCK")
    .flatMap((stage) => stage.reasons.map((reason) => `${stage.fenceId}: ${reason}`));
  const warnings = stageResults
    .filter((stage) => stage.severity === "WARN")
    .flatMap((stage) => stage.reasons.map((reason) => `${stage.fenceId}: ${reason}`));
  const fixHints = stageResults.flatMap((stage) => stage.fixHints.map((hint) => `${stage.fenceId}: ${hint}`));
  const status: DraftFenceWorkflowStatus = blockers.length > 0 ? "BLOCKED" : "NEEDS_MANUAL_REVIEW";

  return {
    blockers,
    externalSendAllowed: false,
    fixHints,
    generatedAt,
    inspected: {
      payloadPresent: input.payload !== undefined,
      sourceIds: sourceIdsFromMetadata(input.metadata),
      textCharacters: input.text?.length ?? 0,
    },
    kind: input.kind,
    liveIntegrationAllowed: false,
    manualReviewGate: {
      passed: false,
      reason:
        status === "BLOCKED"
          ? "One or more fences blocked the draft before owner review."
          : "All automated fences finished; owner/manual review is still required before use.",
      required: true,
      status: status === "BLOCKED" ? "WAITING_ON_REPAIR" : "WAITING_ON_OWNER_REVIEW",
    },
    outputArtifacts: ["draft-review-packet", "fence-result-summary", "manual-review-item"],
    publishAllowed: false,
    routeExposureAllowed: false,
    stageResults,
    status,
    summary,
    warnings,
    workflowRunId,
  };
}
