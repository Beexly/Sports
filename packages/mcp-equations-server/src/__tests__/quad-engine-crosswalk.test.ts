import { describe, expect, it } from "vitest";
import {
  buildQuadEngineCrosswalk,
  queryQuadEngineByContext,
  loadLiveQuadEngineCrosswalk,
  QuadEngineCrosswalkNode,
  QuadEngineSource,
} from "../quad-engine-crosswalk.js";
import {
  query_quad_engine_crosswalk,
  queryQuadEngineCrosswalkTool,
} from "../index.js";

describe("Quad-Engine Crosswalk: build and deduplication", () => {
  it("merges duplicate canonicalId entries across ARXIV, OPENALEX, and KAGGLE into 1 node with all 3 sources", () => {
    const rawEntries: Partial<QuadEngineCrosswalkNode>[] = [
      {
        canonicalId: "ARXIV:2309.00756",
        title: "Inverse MDP 4th Down",
        sources: [
          { engine: "ARXIV", externalId: "2309.00756", localPath: "packages/prediction-engine/src/equations/arxiv-paper-2026/2309-00756-inverse-mdp-fourth-down.ts" },
        ],
        domain: "DEEP_RL_MDP",
        stageAssignment: "STAGE_D_25",
        priorWeight: 0.85,
      },
      {
        canonicalId: "arxiv:2309.00756",
        title: "Inverse-optimization MDP for NFL 4th-down risk preference (Sandholtz 2024)",
        sources: [
          { engine: "OPENALEX", externalId: "W4389921102" },
        ],
        equationLatex: "V_{\\tau}(F) = F^{-1}(\\tau)",
      },
      {
        canonicalId: "2309.00756",
        sources: [
          { engine: "KAGGLE", externalId: "sandholtz-4th-down-mdp-dataset", localPath: "data/nflverse/4th_down.parquet" },
          { engine: "ARXIV", externalId: "2309.00756" }, // Duplicate source pair; should be de-duped
        ],
      },
    ];

    const crosswalk = buildQuadEngineCrosswalk(rawEntries);

    expect(crosswalk).toHaveLength(1);
    const node = crosswalk[0]!;
    expect(node.canonicalId).toBe("ARXIV:2309.00756");
    expect(node.domain).toBe("DEEP_RL_MDP");
    expect(node.stageAssignment).toBe("STAGE_D_25");
    expect(node.priorWeight).toBe(0.85);
    expect(node.equationLatex).toBe("V_{\\tau}(F) = F^{-1}(\\tau)");
    expect(node.acceptanceGatePassed).toBe(true);

    // Verify all 3 unique source engines are present
    const engines = node.sources.map((s) => s.engine);
    expect(engines).toContain("ARXIV");
    expect(engines).toContain("OPENALEX");
    expect(engines).toContain("KAGGLE");
    expect(node.sources).toHaveLength(3);
  });

  it("applies defaults for missing fields", () => {
    const crosswalk = buildQuadEngineCrosswalk([
      { canonicalId: "GENERIC-EQUATION-001" },
    ]);
    expect(crosswalk).toHaveLength(1);
    expect(crosswalk[0]!.domain).toBe("COACH_SCHEME");
    expect(crosswalk[0]!.stageAssignment).toBe("STAGE_A_3646");
    expect(crosswalk[0]!.priorWeight).toBe(0.75);
    expect(crosswalk[0]!.acceptanceGatePassed).toBe(true);
    expect(crosswalk[0]!.sources).toEqual([]);
  });
});

describe("Quad-Engine Crosswalk: query filtering", () => {
  const dataset: QuadEngineCrosswalkNode[] = [
    {
      canonicalId: "EQ-COACH-01",
      title: "Shanahan Outside Zone Wide Flow",
      sources: [{ engine: "HUGGINGFACE", externalId: "hf:coach-shanahan" }],
      domain: "COACH_SCHEME",
      stageAssignment: "STAGE_A_3646",
      priorWeight: 0.9,
      acceptanceGatePassed: true,
      equationLatex: "\\Delta_{zone} = \\sum w_i x_i",
    },
    {
      canonicalId: "EQ-NGS-02",
      title: "Pass Rush Get Off Speed Burst",
      sources: [{ engine: "KAGGLE", externalId: "kaggle:bdb-rush" }],
      domain: "BIOMECHANICS_NGS",
      stageAssignment: "STAGE_B_2000",
      priorWeight: 0.85,
      acceptanceGatePassed: true,
      equationLatex: "v_{burst} = a \\cdot t",
    },
    {
      canonicalId: "EQ-BAYES-03",
      title: "Bradley Terry Luce Shrinkage",
      sources: [{ engine: "OPENALEX", externalId: "openalex:W99182" }],
      domain: "BAYESIAN_SHRINKAGE",
      stageAssignment: "STAGE_C_250",
      priorWeight: 0.8,
      acceptanceGatePassed: true,
    },
    {
      canonicalId: "EQ-MDP-04",
      title: "Inverse MDP Coach Quantile",
      sources: [{ engine: "ARXIV", externalId: "arxiv:2309.00756" }],
      domain: "DEEP_RL_MDP",
      stageAssignment: "STAGE_D_25",
      priorWeight: 0.95,
      acceptanceGatePassed: true,
      equationLatex: "Q(s, a) = R(s, a) + \\gamma \\max Q",
    },
  ];

  it("filters accurately by domain", () => {
    const results = queryQuadEngineByContext(dataset, { domain: "BIOMECHANICS_NGS" });
    expect(results).toHaveLength(1);
    expect(results[0]!.canonicalId).toBe("EQ-NGS-02");
  });

  it("filters accurately by engine", () => {
    const results = queryQuadEngineByContext(dataset, { engine: "OPENALEX" });
    expect(results).toHaveLength(1);
    expect(results[0]!.canonicalId).toBe("EQ-BAYES-03");
  });

  it("filters by text search in title, canonicalId, and equationLatex", () => {
    const titleMatch = queryQuadEngineByContext(dataset, { search: "Outside Zone" });
    expect(titleMatch).toHaveLength(1);
    expect(titleMatch[0]!.canonicalId).toBe("EQ-COACH-01");

    const latexMatch = queryQuadEngineByContext(dataset, { search: "gamma \\max" });
    expect(latexMatch).toHaveLength(1);
    expect(latexMatch[0]!.canonicalId).toBe("EQ-MDP-04");

    const idMatch = queryQuadEngineByContext(dataset, { search: "EQ-NGS" });
    expect(idMatch).toHaveLength(1);
    expect(idMatch[0]!.canonicalId).toBe("EQ-NGS-02");
  });

  it("respects limit parameter", () => {
    const results = queryQuadEngineByContext(dataset, { limit: 2 });
    expect(results).toHaveLength(2);
  });
});

describe("Quad-Engine Crosswalk: live loading and 5 engine source coverage", () => {
  it("loads live crosswalk nodes across all 5 QuadEngineSource types", () => {
    const nodes = loadLiveQuadEngineCrosswalk();
    expect(nodes.length).toBeGreaterThanOrEqual(5);

    const allEngines = new Set<QuadEngineSource>();
    for (const node of nodes) {
      for (const s of node.sources) {
        allEngines.add(s.engine);
      }
    }

    expect(allEngines.has("ARXIV")).toBe(true);
    expect(allEngines.has("OPENALEX")).toBe(true);
    expect(allEngines.has("KAGGLE")).toBe(true);
    expect(allEngines.has("HUGGINGFACE")).toBe(true);
    expect(allEngines.has("DOCX_OMML")).toBe(true);
  });

  it("exposes query_quad_engine_crosswalk and MCP tool handler correctly", async () => {
    const results = query_quad_engine_crosswalk({ engine: "ARXIV" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((n) => n.sources.some((s) => s.engine === "ARXIV"))).toBe(true);

    const toolResult = await queryQuadEngineCrosswalkTool.execute({ engine: "DOCX_OMML" });
    expect(toolResult.length).toBeGreaterThan(0);
    expect(toolResult.some((n) => n.sources.some((s) => s.engine === "DOCX_OMML"))).toBe(true);
  });
});
