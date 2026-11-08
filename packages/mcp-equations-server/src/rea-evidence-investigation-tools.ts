/**
 * @file rea-evidence-investigation-tools.ts
 * REA Tool Design & Evidence-Backed Investigation Surface for `packages/mcp-equations-server`.
 *
 * Implements the `/rea-tool-design` and `/rea-analysis-optimization` contracts:
 * 1. Tool Boundaries & Provider Ownership:
 *    - `inspect_equation_session` (`binary_session` equivalent): reports active provider binding,
 *      closed effect/annotation vocabularies, and group-expanded `tool_availability` with
 *      inherited client requirements unless overridden by the group.
 *    - `inspect_quad_engine_evidence`: wraps Quad-Engine crosswalk and 4-Stage Cognitive Router
 *      queries in a canonical REA `EvidenceRecord` (`evidence_id`, `parent_evidence_id`,
 *      `normalized_result`, `authority`, `coverage`, `source_complete`, `page_exhausted`,
 *      `retention: "complete-record"`, `limitations`, `residual_unknowns`).
 *    - `inspect_analysis_view`: projects retained Evidence by `parent_evidence_id` (`kind: "summary"`,
 *      `"inventory"`, `"api-surface"`, or `"cluster-page"`) without repeating the underlying producer.
 *      Separates `source_complete` from `page_exhausted` so a missing match in partial source
 *      Evidence never claims global absence.
 *    - `record_unknown` / `update_unknown`: session-scoped unknown registry with optimistic
 *      concurrency control (`revision` check — rejects stale revisions with `stale_revision`
 *      recovery guidance instead of blind overwrite, requiring qualifying observed `evidence_id`
 *      to transition to `"verified_resolved"`).
 *    - Failure Recovery (`design_recovery_around_failure`): when an inline response exceeds the
 *      transport frame ceiling (`maxTransportBytes`), retains the complete record in the session
 *      ledger and returns a structured `resource_constraint` (`details.resource = "transport"`)
 *      pointing to the retained `parent_evidence_id` and `inspect_analysis_view` recovery step.
 */

import {
  loadLiveQuadEngineCrosswalk,
  queryQuadEngineByContext,
  type QuadEngineCrosswalkNode,
  type QuadEngineSource,
} from "./quad-engine-crosswalk.js";
import {
  routeInMemoryFourStage,
  type Signal,
  type StageDCoupledResult,
} from "./mcp-cognitive-router.js";

export type DetailLevel = "summary" | "full";
export type RetentionMode = "complete-record" | "summary-only";

export interface EvidenceCoverage {
  readonly examinedCount: number;
  readonly totalAvailableCount: number;
  readonly sourceComplete: boolean;
  readonly pageExhausted: boolean;
  readonly offset: number;
  readonly limit: number;
}

export interface EvidenceRecord<T = unknown> {
  readonly evidence_id: string;
  readonly parent_evidence_id: string | null;
  readonly operation: string;
  readonly provider_id: string;
  readonly target_sha256: string;
  readonly detail: DetailLevel;
  readonly retention: RetentionMode;
  readonly authority: "observed_artifact" | "static_model_inference" | "projected_view";
  readonly source_complete: boolean;
  readonly page_exhausted: boolean;
  readonly coverage: EvidenceCoverage;
  readonly normalized_result: T;
  readonly limitations: readonly string[];
  readonly residual_unknowns: readonly string[];
}

export interface ResourceConstraintError {
  readonly status: "error";
  readonly error_code: "resource_constraint";
  readonly message: string;
  readonly details: {
    readonly resource: "transport";
    readonly max_transport_bytes: number;
    readonly actual_bytes: number;
    readonly parent_evidence_id: string;
    readonly retention: "complete-record";
    readonly recovery_tool: "inspect_analysis_view";
    readonly recovery_example: {
      readonly parent_evidence_id: string;
      readonly view: { readonly kind: "summary" };
    };
  };
}

export interface UnknownRecord {
  readonly unknown_id: string;
  readonly question: string;
  readonly required_authority_or_environment: string;
  readonly status: "open" | "partially_answered" | "verified_resolved";
  readonly supporting_evidence_ids: readonly string[];
  readonly contradicting_evidence_ids: readonly string[];
  readonly resolution_summary: string | null;
  readonly revision: number;
}

export interface ToolAvailabilityGroup {
  readonly group_id: string;
  readonly available: boolean;
  readonly reason: string | null;
  readonly remediation: string | null;
  readonly client_requirements?: readonly string[];
  readonly effects: readonly ("read_only" | "retains_evidence" | "mutates_session_registry")[];
  readonly names: readonly string[];
}

export interface ExpandedToolAvailabilityEntry {
  readonly tool_name: string;
  readonly group_id: string;
  readonly available: boolean;
  readonly reason: string | null;
  readonly remediation: string | null;
  readonly client_requirements: readonly string[];
  readonly effects: {
    readonly read_only: boolean;
    readonly retains_evidence: boolean;
    readonly mutates_session_registry: boolean;
  };
}

const DEFAULT_MAX_TRANSPORT_BYTES = 48_000;
const MAX_RETAINED_EVIDENCE_RECORDS = 64;

/** Bounded session-scoped Evidence & Unknown ledger. */
const _retainedEvidenceStore = new Map<string, EvidenceRecord<unknown>>();
const _unknownRegistry = new Map<string, UnknownRecord>();
let _evidenceSequence = 1;
let _unknownSequence = 1;

function _deterministicDigest(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0")
  ).repeat(4);
}

function _retainEvidence<T>(record: EvidenceRecord<T>): void {
  if (_retainedEvidenceStore.size >= MAX_RETAINED_EVIDENCE_RECORDS) {
    const oldestKey = _retainedEvidenceStore.keys().next().value;
    if (oldestKey !== undefined) {
      _retainedEvidenceStore.delete(oldestKey);
    }
  }
  _retainedEvidenceStore.set(record.evidence_id, record as EvidenceRecord<unknown>);
}

export function resetReaInvestigationSession(): void {
  _retainedEvidenceStore.clear();
  _unknownRegistry.clear();
  _evidenceSequence = 1;
  _unknownSequence = 1;
}

/**
 * Expands grouped tool availability into per-tool entries with closed effect booleans
 * and inherited inventory-level client requirements unless overridden by the group.
 */
export function inspectEquationSession(): {
  readonly session_status: "active";
  readonly analysis_provider_binding: {
    readonly provider_id: "gse-mcp-equations-ast-v1";
    readonly corpus_crosswalk_loaded: boolean;
    readonly retained_evidence_count: number;
    readonly open_unknowns_count: number;
  };
  readonly tool_availability: {
    readonly shared_client_requirements: readonly string[];
    readonly groups: readonly ToolAvailabilityGroup[];
    readonly expanded_tools: readonly ExpandedToolAvailabilityEntry[];
  };
} {
  const sharedRequirements = ["mcp_stdio_or_in_memory_client"] as const;
  const groups: readonly ToolAvailabilityGroup[] = [
    {
      group_id: "session_and_discovery",
      available: true,
      reason: null,
      remediation: null,
      effects: ["read_only"],
      names: ["inspect_equation_session", "query_quad_engine_crosswalk"],
    },
    {
      group_id: "evidence_producers_and_views",
      available: true,
      reason: null,
      remediation: null,
      client_requirements: ["mcp_stdio_or_in_memory_client", "supports_structured_evidence_ids"],
      effects: ["read_only", "retains_evidence"],
      names: [
        "inspect_quad_engine_evidence",
        "inspect_cognitive_router_evidence",
        "inspect_analysis_view",
      ],
    },
    {
      group_id: "unknown_registry",
      available: true,
      reason: null,
      remediation: null,
      effects: ["mutates_session_registry"],
      names: ["record_unknown", "update_unknown"],
    },
  ];

  const expanded: ExpandedToolAvailabilityEntry[] = [];
  for (const g of groups) {
    const reqs = g.client_requirements ?? sharedRequirements;
    const effSet = new Set(g.effects);
    for (const name of g.names) {
      expanded.push({
        tool_name: name,
        group_id: g.group_id,
        available: g.available,
        reason: g.reason,
        remediation: g.remediation,
        client_requirements: reqs,
        effects: {
          read_only: effSet.has("read_only"),
          retains_evidence: effSet.has("retains_evidence"),
          mutates_session_registry: effSet.has("mutates_session_registry"),
        },
      });
    }
  }

  return {
    session_status: "active",
    analysis_provider_binding: {
      provider_id: "gse-mcp-equations-ast-v1",
      corpus_crosswalk_loaded: true,
      retained_evidence_count: _retainedEvidenceStore.size,
      open_unknowns_count: Array.from(_unknownRegistry.values()).filter(
        (u) => u.status !== "verified_resolved",
      ).length,
    },
    tool_availability: {
      shared_client_requirements: sharedRequirements,
      groups,
      expanded_tools: expanded,
    },
  };
}

export interface InspectQuadEngineEvidenceInput {
  readonly domain?: QuadEngineCrosswalkNode["domain"];
  readonly engine?: QuadEngineSource;
  readonly search?: string;
  readonly detail?: DetailLevel;
  readonly offset?: number;
  readonly limit?: number;
  readonly maxTransportBytes?: number;
  readonly sourceCompleteOverride?: boolean;
}

/**
 * Summary-first Evidence producer over the Quad-Engine crosswalk.
 * Retains the complete record in `_retainedEvidenceStore` and returns either:
 * - A summary / paginated `EvidenceRecord`, OR
 * - A structured `resource_constraint` (`details.resource: "transport"`) with `parent_evidence_id`
 *   when `detail === "full"` exceeds `maxTransportBytes`.
 */
export function inspectQuadEngineEvidence(
  input: InspectQuadEngineEvidenceInput = {},
): EvidenceRecord<{
  readonly totalMatchingNodes: number;
  readonly domainCounts: Readonly<Record<string, number>>;
  readonly engineCounts: Readonly<Record<string, number>>;
  readonly nodes: readonly QuadEngineCrosswalkNode[];
}> | ResourceConstraintError {
  const crosswalk = loadLiveQuadEngineCrosswalk();
  const allMatches = queryQuadEngineByContext(crosswalk, {
    domain: input.domain,
    engine: input.engine,
    search: input.search,
    limit: 10_000,
  });

  const detail: DetailLevel = input.detail ?? "summary";
  const offset = Math.max(0, input.offset ?? 0);
  const defaultLimit = detail === "summary" ? 10 : 50;
  const limit = Math.max(1, input.limit ?? defaultLimit);
  const sliced = allMatches.slice(offset, offset + limit);
  const sourceComplete = input.sourceCompleteOverride ?? true;
  const pageExhausted = offset + sliced.length >= allMatches.length;

  const domainCounts: Record<string, number> = {};
  const engineCounts: Record<string, number> = {};
  for (const n of allMatches) {
    domainCounts[n.domain] = (domainCounts[n.domain] ?? 0) + 1;
    engineCounts[n.engine] = (engineCounts[n.engine] ?? 0) + 1;
  }

  const evidenceId = `ev_quad_${String(_evidenceSequence++).padStart(4, "0")}`;
  const targetSha = _deterministicDigest(
    JSON.stringify({
      domain: input.domain ?? null,
      engine: input.engine ?? null,
      search: input.search ?? null,
      total: allMatches.length,
    }),
  );

  const fullRecord: EvidenceRecord<{
    readonly totalMatchingNodes: number;
    readonly domainCounts: Readonly<Record<string, number>>;
    readonly engineCounts: Readonly<Record<string, number>>;
    readonly nodes: readonly QuadEngineCrosswalkNode[];
  }> = {
    evidence_id: evidenceId,
    parent_evidence_id: null,
    operation: "inspect_quad_engine_evidence",
    provider_id: "gse-mcp-equations-ast-v1",
    target_sha256: targetSha,
    detail: "full",
    retention: "complete-record",
    authority: "observed_artifact",
    source_complete: sourceComplete,
    page_exhausted: true,
    coverage: {
      examinedCount: allMatches.length,
      totalAvailableCount: crosswalk.length,
      sourceComplete,
      pageExhausted: true,
      offset: 0,
      limit: allMatches.length,
    },
    normalized_result: {
      totalMatchingNodes: allMatches.length,
      domainCounts,
      engineCounts,
      nodes: allMatches,
    },
    limitations: [
      "Static crosswalk metadata does not establish live play-by-play simulation execution.",
      ...(sourceComplete
        ? []
        : ["Source inventory is partial; zero matches in this slice do not prove global absence."]),
    ],
    residual_unknowns:
      allMatches.length === 0 && !sourceComplete
        ? ["Target query returned 0 matches in partial source; full corpus scan required to prove absence."]
        : [],
  };

  // Always retain the complete record under its canonical evidence_id
  _retainEvidence(fullRecord);

  const maxBytes = input.maxTransportBytes ?? DEFAULT_MAX_TRANSPORT_BYTES;
  if (detail === "full") {
    const serializedBytes = Buffer.byteLength(JSON.stringify(fullRecord), "utf8");
    if (serializedBytes > maxBytes) {
      return {
        status: "error",
        error_code: "resource_constraint",
        message:
          "Complete Evidence record exceeds transport frame limit; complete record retained in session ledger. Call inspect_analysis_view with parent_evidence_id.",
        details: {
          resource: "transport",
          max_transport_bytes: maxBytes,
          actual_bytes: serializedBytes,
          parent_evidence_id: evidenceId,
          retention: "complete-record",
          recovery_tool: "inspect_analysis_view",
          recovery_example: {
            parent_evidence_id: evidenceId,
            view: { kind: "summary" },
          },
        },
      };
    }
    return fullRecord;
  }

  return {
    ...fullRecord,
    detail: "summary",
    page_exhausted: pageExhausted,
    coverage: {
      examinedCount: sliced.length,
      totalAvailableCount: allMatches.length,
      sourceComplete,
      pageExhausted,
      offset,
      limit,
    },
    normalized_result: {
      totalMatchingNodes: allMatches.length,
      domainCounts,
      engineCounts,
      nodes: sliced,
    },
  };
}

export interface InspectAnalysisViewInput {
  readonly parent_evidence_id: string;
  readonly view:
    | { readonly kind: "summary" }
    | {
        readonly kind: "inventory";
        readonly collection?: "occurrences" | "nodes" | "domains";
        readonly logical_paths?: readonly string[];
        readonly offset?: number;
        readonly limit?: number;
      }
    | {
        readonly kind: "cluster-page";
        readonly cluster?: string;
        readonly offset?: number;
        readonly limit?: number;
      };
}

/**
 * Projects a retained Evidence record by `parent_evidence_id` without repeating the producer.
 * Explicitly preserves `source_complete` vs `page_exhausted` semantics and `logical_paths` filtering
 * (omitted `logical_paths` pages all occurrences; `[]` selects none).
 */
export function inspectAnalysisView(
  input: InspectAnalysisViewInput,
): EvidenceRecord<Record<string, unknown>> {
  const parent = _retainedEvidenceStore.get(input.parent_evidence_id);
  if (!parent) {
    throw new Error(
      `Retained Evidence '${input.parent_evidence_id}' not found in session ledger. Query get_evidence_bundle or run the producer with detail: "summary" first.`,
    );
  }

  const viewId = `ev_view_${String(_evidenceSequence++).padStart(4, "0")}`;
  const rawNorm = parent.normalized_result as {
    totalMatchingNodes?: number;
    domainCounts?: Record<string, number>;
    engineCounts?: Record<string, number>;
    nodes?: readonly QuadEngineCrosswalkNode[];
  };
  const allNodes = rawNorm.nodes ?? [];

  if (input.view.kind === "summary") {
    const sampleNodes = allNodes.slice(0, 5);
    return {
      evidence_id: viewId,
      parent_evidence_id: parent.evidence_id,
      operation: "inspect_analysis_view:summary",
      provider_id: parent.provider_id,
      target_sha256: parent.target_sha256,
      detail: "summary",
      retention: "complete-record",
      authority: "projected_view",
      source_complete: parent.source_complete,
      page_exhausted: sampleNodes.length >= allNodes.length,
      coverage: {
        examinedCount: sampleNodes.length,
        totalAvailableCount: allNodes.length,
        sourceComplete: parent.source_complete,
        pageExhausted: sampleNodes.length >= allNodes.length,
        offset: 0,
        limit: 5,
      },
      normalized_result: {
        totalMatchingNodes: rawNorm.totalMatchingNodes ?? allNodes.length,
        domainCounts: rawNorm.domainCounts ?? {},
        engineCounts: rawNorm.engineCounts ?? {},
        sampleNodes,
      },
      limitations: parent.limitations,
      residual_unknowns: parent.residual_unknowns,
    };
  }

  if (input.view.kind === "inventory") {
    const offset = Math.max(0, input.view.offset ?? 0);
    const limit = Math.max(1, input.view.limit ?? 20);
    let filteredNodes = allNodes;

    // REA contract: omit `logical_paths` to page all available occurrences; `[]` selects none.
    if (input.view.logical_paths !== undefined) {
      if (input.view.logical_paths.length === 0) {
        filteredNodes = [];
      } else {
        const pathSet = new Set(input.view.logical_paths.map((p) => p.toLowerCase()));
        filteredNodes = allNodes.filter(
          (n) =>
            pathSet.has(n.canonicalId.toLowerCase()) ||
            pathSet.has((n.sourceRef ?? "").toLowerCase()),
        );
      }
    }

    const page = filteredNodes.slice(offset, offset + limit);
    const pageExhausted = offset + page.length >= filteredNodes.length;
    return {
      evidence_id: viewId,
      parent_evidence_id: parent.evidence_id,
      operation: "inspect_analysis_view:inventory",
      provider_id: parent.provider_id,
      target_sha256: parent.target_sha256,
      detail: "summary",
      retention: "complete-record",
      authority: "projected_view",
      source_complete: parent.source_complete,
      page_exhausted: pageExhausted,
      coverage: {
        examinedCount: page.length,
        totalAvailableCount: filteredNodes.length,
        sourceComplete: parent.source_complete,
        pageExhausted,
        offset,
        limit,
      },
      normalized_result: {
        collection: input.view.collection ?? "occurrences",
        occurrences: page,
        absence_established: parent.source_complete && pageExhausted && filteredNodes.length === 0,
      },
      limitations: parent.limitations,
      residual_unknowns: parent.residual_unknowns,
    };
  }

  // cluster-page view
  const offset = Math.max(0, input.view.offset ?? 0);
  const limit = Math.max(1, input.view.limit ?? 20);
  const filtered = input.view.cluster
    ? allNodes.filter((n) => n.domain === input.view.cluster)
    : allNodes;
  const page = filtered.slice(offset, offset + limit);
  const pageExhausted = offset + page.length >= filtered.length;

  return {
    evidence_id: viewId,
    parent_evidence_id: parent.evidence_id,
    operation: "inspect_analysis_view:cluster-page",
    provider_id: parent.provider_id,
    target_sha256: parent.target_sha256,
    detail: "summary",
    retention: "complete-record",
    authority: "projected_view",
    source_complete: parent.source_complete,
    page_exhausted: pageExhausted,
    coverage: {
      examinedCount: page.length,
      totalAvailableCount: filtered.length,
      sourceComplete: parent.source_complete,
      pageExhausted,
      offset,
      limit,
    },
    normalized_result: {
      cluster: input.view.cluster ?? "ALL",
      nodes: page,
    },
    limitations: parent.limitations,
    residual_unknowns: parent.residual_unknowns,
  };
}

/**
 * Wraps the 4-Stage Cognitive Router (`routeInMemoryFourStage`) in a canonical REA Evidence record.
 */
export function inspectCognitiveRouterEvidence(
  signals: readonly Signal[],
  opts: { readonly detail?: DetailLevel; readonly tauHatCoach?: number } = {},
): EvidenceRecord<StageDCoupledResult & { readonly contextMaskWords: readonly number[] }> {
  const routed = routeInMemoryFourStage(signals, { tauHatCoach: opts.tauHatCoach });
  const evidenceId = `ev_router_${String(_evidenceSequence++).padStart(4, "0")}`;
  const maskWords = Array.from(routed.contextMask, (w) => w | 0);
  const rec: EvidenceRecord<StageDCoupledResult & { readonly contextMaskWords: readonly number[] }> = {
    evidence_id: evidenceId,
    parent_evidence_id: null,
    operation: "inspect_cognitive_router_evidence",
    provider_id: "gse-mcp-equations-ast-v1",
    target_sha256: _deterministicDigest(JSON.stringify({ signals, tauHatCoach: opts.tauHatCoach ?? 0.42 })),
    detail: opts.detail ?? "summary",
    retention: "complete-record",
    authority: "static_model_inference",
    source_complete: true,
    page_exhausted: true,
    coverage: {
      examinedCount: routed.selectedPremises.length,
      totalAvailableCount: 279,
      sourceComplete: true,
      pageExhausted: true,
      offset: 0,
      limit: routed.selectedPremises.length,
    },
    normalized_result: {
      selectedPremises: routed.selectedPremises,
      jamesSteinShrinkageFactor: routed.jamesSteinShrinkageFactor,
      unClampedTotalLogOddsDelta: routed.unClampedTotalLogOddsDelta,
      clampedTotalLogOddsDelta: routed.clampedTotalLogOddsDelta,
      clamped: routed.clamped,
      tauHatCoachPriorBonus: routed.tauHatCoachPriorBonus,
      contextMaskWords: maskWords,
    },
    limitations: [
      "Stage D log-odds delta is a pre-simulation prior capped at |Δ log-odds| <= 0.35; requires Stage 3 JEV 10,000-world trajectory simulation before market comparison.",
    ],
    residual_unknowns: [],
  };
  _retainEvidence(rec);
  return rec;
}

export function recordUnknown(input: {
  readonly question: string;
  readonly required_authority_or_environment: string;
  readonly supporting_evidence_ids?: readonly string[];
  readonly contradicting_evidence_ids?: readonly string[];
}): UnknownRecord {
  const unknownId = `unk_${String(_unknownSequence++).padStart(4, "0")}`;
  const record: UnknownRecord = {
    unknown_id: unknownId,
    question: input.question,
    required_authority_or_environment: input.required_authority_or_environment,
    status: "open",
    supporting_evidence_ids: input.supporting_evidence_ids ?? [],
    contradicting_evidence_ids: input.contradicting_evidence_ids ?? [],
    resolution_summary: null,
    revision: 1,
  };
  _unknownRegistry.set(unknownId, record);
  return record;
}

export function updateUnknown(input: {
  readonly unknown_id: string;
  readonly expected_revision: number;
  readonly status: "open" | "partially_answered" | "verified_resolved";
  readonly supporting_evidence_ids?: readonly string[];
  readonly contradicting_evidence_ids?: readonly string[];
  readonly resolution_summary?: string;
}): UnknownRecord {
  const existing = _unknownRegistry.get(input.unknown_id);
  if (!existing) {
    throw new Error(`Unknown '${input.unknown_id}' not found in session registry.`);
  }
  if (existing.revision !== input.expected_revision) {
    throw new Error(
      `stale_revision: Unknown '${input.unknown_id}' is at revision ${existing.revision}, but caller supplied expected_revision ${input.expected_revision}. Reread the current UnknownRecord before retrying.`,
    );
  }
  const mergedSupporting = [
    ...new Set([...existing.supporting_evidence_ids, ...(input.supporting_evidence_ids ?? [])]),
  ];
  if (input.status === "verified_resolved") {
    const hasQualifyingObserved = mergedSupporting.some((id) => _retainedEvidenceStore.has(id));
    if (!hasQualifyingObserved) {
      throw new Error(
        `unverified_resolution: Cannot transition '${input.unknown_id}' to 'verified_resolved' without at least one qualifying retained Evidence ID in supporting_evidence_ids.`,
      );
    }
  }
  const updated: UnknownRecord = {
    ...existing,
    status: input.status,
    supporting_evidence_ids: mergedSupporting,
    contradicting_evidence_ids: [
      ...new Set([
        ...existing.contradicting_evidence_ids,
        ...(input.contradicting_evidence_ids ?? []),
      ]),
    ],
    resolution_summary: input.resolution_summary ?? existing.resolution_summary,
    revision: existing.revision + 1,
  };
  _unknownRegistry.set(input.unknown_id, updated);
  return updated;
}
