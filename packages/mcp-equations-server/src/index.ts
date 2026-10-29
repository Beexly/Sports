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

export const tools = [queryQuadEngineCrosswalkTool];
