/**
 * @file index.ts
 * MCP Equations Server: Cognitive Router & Unified Quad-Engine Crosswalk
 */

import {
  buildQuadEngineCrosswalk,
  queryQuadEngineByContext,
  loadLiveQuadEngineCrosswalk,
  QuadEngineCrosswalkNode,
  QuadEngineSource,
} from "./quad-engine-crosswalk.js";

export * from "./mcp-cognitive-router.js";
export * from "./quad-engine-crosswalk.js";
export * from "./foreman-warden-caveman-watcher.js";
export * from "./gse-content-os-engine.js";
export * from "./rea-evidence-investigation-tools.js";
export * from "./foundry-sovereign-corpus-bridge.js";

import {
  inspectEquationSession,
  inspectQuadEngineEvidence,
  inspectCognitiveRouterEvidence,
  inspectAnalysisView,
  recordUnknown,
  updateUnknown,
  type InspectQuadEngineEvidenceInput,
  type InspectAnalysisViewInput,
} from "./rea-evidence-investigation-tools.js";
import type { Signal } from "./mcp-cognitive-router.js";

export interface QueryQuadEngineInput {
  domain?: QuadEngineCrosswalkNode["domain"];
  engine?: QuadEngineSource;
  search?: string;
  limit?: number;
}

/**
 * Direct execution hook for querying the Quad-Engine crosswalk.
 */
export function query_quad_engine_crosswalk(
  query: QueryQuadEngineInput = {}
): QuadEngineCrosswalkNode[] {
  const crosswalk = loadLiveQuadEngineCrosswalk();
  return queryQuadEngineByContext(crosswalk, query);
}

/**
 * Standard MCP Tool definition for query_quad_engine_crosswalk.
 */
export const queryQuadEngineCrosswalkTool = {
  name: "query_quad_engine_crosswalk",
  description:
    "Query the unified Quad-Engine (arXiv, OpenAlex, Kaggle, HuggingFace, DOCX_OMML) crosswalk by context domain, source engine, or text search.",
  inputSchema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        enum: [
          "COACH_SCHEME",
          "CAUSAL_FCI",
          "MARKET_MICROSTRUCTURE",
          "BIOMECHANICS_NGS",
          "BAYESIAN_SHRINKAGE",
          "OPTIMAL_TRANSPORT",
          "DEEP_RL_MDP",
          "CONFORMAL_CALIBRATION",
        ],
        description: "Target domain filter",
      },
      engine: {
        type: "string",
        enum: ["ARXIV", "OPENALEX", "KAGGLE", "HUGGINGFACE", "DOCX_OMML"],
        description: "Source engine filter",
      },
      search: {
        type: "string",
        description: "Substring search query in title, canonicalId, or equationLatex",
      },
      limit: {
        type: "number",
        description: "Maximum number of records to return",
      },
    },
  },
  handler: query_quad_engine_crosswalk,
  execute: async (args: QueryQuadEngineInput) => query_quad_engine_crosswalk(args),
};

export const inspectEquationSessionTool = {
  name: "inspect_equation_session",
  description:
    "Inspect the active MCP equation investigation session, provider binding, retained Evidence count, open unknowns, and group-expanded tool_availability.",
  inputSchema: { type: "object", properties: {} },
  handler: inspectEquationSession,
  execute: async () => inspectEquationSession(),
};

export const inspectQuadEngineEvidenceTool = {
  name: "inspect_quad_engine_evidence",
  description:
    "Query the Quad-Engine crosswalk with summary-first REA Evidence semantics (evidence_id, normalized_result, source_complete, page_exhausted, retention: complete-record, and transport resource_constraint recovery).",
  inputSchema: {
    type: "object",
    properties: {
      domain: { type: "string" },
      engine: { type: "string" },
      search: { type: "string" },
      detail: { type: "string", enum: ["summary", "full"] },
      offset: { type: "number" },
      limit: { type: "number" },
      maxTransportBytes: { type: "number" },
    },
  },
  handler: inspectQuadEngineEvidence,
  execute: async (args: InspectQuadEngineEvidenceInput) => inspectQuadEngineEvidence(args),
};

export const inspectAnalysisViewTool = {
  name: "inspect_analysis_view",
  description:
    "Project a summary, inventory occurrence page, or cluster page from a retained parent_evidence_id without repeating the underlying producer.",
  inputSchema: {
    type: "object",
    properties: {
      parent_evidence_id: { type: "string" },
      view: { type: "object" },
    },
    required: ["parent_evidence_id", "view"],
  },
  handler: inspectAnalysisView,
  execute: async (args: InspectAnalysisViewInput) => inspectAnalysisView(args),
};

export const inspectCognitiveRouterEvidenceTool = {
  name: "inspect_cognitive_router_evidence",
  description:
    "Execute the 4-Stage Cognitive Router (288-bit mask -> Spectral Cluster Orthogonalization -> Stage D Jacobian Coupling & James-Stein Shrinkage) and retain a canonical REA Evidence record.",
  inputSchema: {
    type: "object",
    properties: {
      signals: { type: "array" },
      detail: { type: "string", enum: ["summary", "full"] },
      tauHatCoach: { type: "number" },
    },
    required: ["signals"],
  },
  handler: (args: { signals: readonly Signal[]; detail?: "summary" | "full"; tauHatCoach?: number }) =>
    inspectCognitiveRouterEvidence(args.signals, { detail: args.detail, tauHatCoach: args.tauHatCoach }),
  execute: async (args: { signals: readonly Signal[]; detail?: "summary" | "full"; tauHatCoach?: number }) =>
    inspectCognitiveRouterEvidence(args.signals, { detail: args.detail, tauHatCoach: args.tauHatCoach }),
};

export const recordUnknownTool = {
  name: "record_unknown",
  description:
    "Record an unresolved investigation question with its required authority or environment and supporting/contradicting Evidence IDs.",
  inputSchema: {
    type: "object",
    properties: {
      question: { type: "string" },
      required_authority_or_environment: { type: "string" },
      supporting_evidence_ids: { type: "array", items: { type: "string" } },
      contradicting_evidence_ids: { type: "array", items: { type: "string" } },
    },
    required: ["question", "required_authority_or_environment"],
  },
  handler: recordUnknown,
  execute: async (args: Parameters<typeof recordUnknown>[0]) => recordUnknown(args),
};

export const updateUnknownTool = {
  name: "update_unknown",
  description:
    "Update an existing UnknownRecord with optimistic concurrency control (expected_revision) and qualifying observed Evidence verification.",
  inputSchema: {
    type: "object",
    properties: {
      unknown_id: { type: "string" },
      expected_revision: { type: "number" },
      status: { type: "string", enum: ["open", "partially_answered", "verified_resolved"] },
      supporting_evidence_ids: { type: "array", items: { type: "string" } },
      contradicting_evidence_ids: { type: "array", items: { type: "string" } },
      resolution_summary: { type: "string" },
    },
    required: ["unknown_id", "expected_revision", "status"],
  },
  handler: updateUnknown,
  execute: async (args: Parameters<typeof updateUnknown>[0]) => updateUnknown(args),
};

export const tools = [
  inspectEquationSessionTool,
  queryQuadEngineCrosswalkTool,
  inspectQuadEngineEvidenceTool,
  inspectCognitiveRouterEvidenceTool,
  inspectAnalysisViewTool,
  recordUnknownTool,
  updateUnknownTool,
];
