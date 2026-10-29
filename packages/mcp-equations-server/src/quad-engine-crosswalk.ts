/**
 * @file quad-engine-crosswalk.ts
 * Unified Kaggle + arXiv + OpenAlex + Hugging Face + DOCX OMML Quad-Engine Crosswalk
 * and Cognitive Router Retrieval Layer.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type QuadEngineSource = 'ARXIV' | 'OPENALEX' | 'KAGGLE' | 'HUGGINGFACE' | 'DOCX_OMML';

export interface QuadEngineCrosswalkNode {
  canonicalId: string;
  title: string;
  sources: Array<{ engine: QuadEngineSource; externalId: string; localPath?: string }>;
  domain: 'COACH_SCHEME' | 'CAUSAL_FCI' | 'MARKET_MICROSTRUCTURE' | 'BIOMECHANICS_NGS' | 'BAYESIAN_SHRINKAGE' | 'OPTIMAL_TRANSPORT' | 'DEEP_RL_MDP' | 'CONFORMAL_CALIBRATION';
  equationLatex?: string;
  tsModulePath?: string;
  stageAssignment: 'STAGE_A_3646' | 'STAGE_B_2000' | 'STAGE_C_250' | 'STAGE_D_25';
  priorWeight: number;
  acceptanceGatePassed: boolean;
}

const DEFAULT_DOMAIN: QuadEngineCrosswalkNode['domain'] = 'COACH_SCHEME';
const DEFAULT_STAGE: QuadEngineCrosswalkNode['stageAssignment'] = 'STAGE_A_3646';
const DEFAULT_PRIOR_WEIGHT = 0.75;
const DEFAULT_ACCEPTANCE_GATE = true;

/**
 * Deduplicate entries with the same normalized canonicalId, unioning their sources
 * array without duplicate (engine, externalId) pairs, and defaulting fields.
 */
export function buildQuadEngineCrosswalk(entries: Partial<QuadEngineCrosswalkNode>[]): QuadEngineCrosswalkNode[] {
  const map = new Map<string, QuadEngineCrosswalkNode>();

  for (const entry of entries) {
    if (!entry) continue;
    const rawId = (entry.canonicalId ?? "").trim();
    if (!rawId) continue;

    const normKey = rawId.toLowerCase().replace(/^(arxiv|openalex|kaggle|huggingface|docx_omml):/, "").trim();
    const existing = map.get(normKey);

    if (!existing) {
      const nodeSources: Array<{ engine: QuadEngineSource; externalId: string; localPath?: string }> = [];
      const seenSources = new Set<string>();

      if (Array.isArray(entry.sources)) {
        for (const s of entry.sources) {
          if (!s || !s.engine || !s.externalId) continue;
          const sKey = `${s.engine}::${s.externalId.trim().toLowerCase()}`;
          if (!seenSources.has(sKey)) {
            seenSources.add(sKey);
            nodeSources.push({
              engine: s.engine,
              externalId: s.externalId.trim(),
              ...(s.localPath ? { localPath: s.localPath } : {}),
            });
          }
        }
      }

      const node: QuadEngineCrosswalkNode = {
        canonicalId: rawId,
        title: entry.title?.trim() || rawId,
        sources: nodeSources,
        domain: entry.domain ?? DEFAULT_DOMAIN,
        stageAssignment: entry.stageAssignment ?? DEFAULT_STAGE,
        priorWeight: entry.priorWeight ?? DEFAULT_PRIOR_WEIGHT,
        acceptanceGatePassed: entry.acceptanceGatePassed !== undefined ? entry.acceptanceGatePassed : DEFAULT_ACCEPTANCE_GATE,
        ...(entry.equationLatex ? { equationLatex: entry.equationLatex } : {}),
        ...(entry.tsModulePath ? { tsModulePath: entry.tsModulePath } : {}),
      };

      map.set(normKey, node);
    } else {
      // Union sources without duplicates
      const seenSources = new Set(existing.sources.map((s) => `${s.engine}::${s.externalId.trim().toLowerCase()}`));
      if (Array.isArray(entry.sources)) {
        for (const s of entry.sources) {
          if (!s || !s.engine || !s.externalId) continue;
          const sKey = `${s.engine}::${s.externalId.trim().toLowerCase()}`;
          if (!seenSources.has(sKey)) {
            seenSources.add(sKey);
            existing.sources.push({
              engine: s.engine,
              externalId: s.externalId.trim(),
              ...(s.localPath ? { localPath: s.localPath } : {}),
            });
          } else if (s.localPath) {
            const match = existing.sources.find(
              (es) => es.engine === s.engine && es.externalId.trim().toLowerCase() === s.externalId.trim().toLowerCase()
            );
            if (match && !match.localPath) {
              match.localPath = s.localPath;
            }
          }
        }
      }

      // Update fields if provided in new entry
      if (entry.title && (!existing.title || existing.title === existing.canonicalId)) {
        existing.title = entry.title.trim();
      }
      if (entry.domain) {
        existing.domain = entry.domain;
      }
      if (entry.stageAssignment) {
        existing.stageAssignment = entry.stageAssignment;
      }
      if (entry.priorWeight !== undefined) {
        existing.priorWeight = entry.priorWeight;
      }
      if (entry.acceptanceGatePassed !== undefined) {
        existing.acceptanceGatePassed = entry.acceptanceGatePassed;
      }
      if (entry.equationLatex && !existing.equationLatex) {
        existing.equationLatex = entry.equationLatex;
      }
      if (entry.tsModulePath && !existing.tsModulePath) {
        existing.tsModulePath = entry.tsModulePath;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Filter crosswalk nodes by domain, source engine, and text query.
 */
export function queryQuadEngineByContext(
  crosswalk: QuadEngineCrosswalkNode[],
  query: {
    domain?: QuadEngineCrosswalkNode['domain'];
    engine?: QuadEngineSource;
    search?: string;
    limit?: number;
  }
): QuadEngineCrosswalkNode[] {
  let result = crosswalk;

  if (query.domain) {
    result = result.filter((n) => n.domain === query.domain);
  }

  if (query.engine) {
    result = result.filter((n) => n.sources.some((s) => s.engine === query.engine));
  }

  if (query.search && query.search.trim().length > 0) {
    const q = query.search.trim().toLowerCase();
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.canonicalId.toLowerCase().includes(q) ||
        (n.equationLatex ? n.equationLatex.toLowerCase().includes(q) : false)
    );
  }

  if (query.limit !== undefined && query.limit >= 0) {
    result = result.slice(0, query.limit);
  }

  return result;
}

const FALLBACK_SEED_CROSSWALK: QuadEngineCrosswalkNode[] = [
  {
    canonicalId: "ARXIV:2309.00756",
    title: "Inverse-optimization MDP for NFL 4th-down risk preference (Sandholtz et al. AOAS 2024)",
    sources: [
      {
        engine: "ARXIV",
        externalId: "2309.00756",
        localPath: "packages/prediction-engine/src/equations/arxiv-paper-2026/2309-00756-inverse-mdp-fourth-down.ts",
      },
    ],
    domain: "DEEP_RL_MDP",
    equationLatex: "V_{\\tau}(F) = F^{-1}(\\tau)",
    tsModulePath: "packages/prediction-engine/src/equations/arxiv-paper-2026/2309-00756-inverse-mdp-fourth-down.ts",
    stageAssignment: "STAGE_D_25",
    priorWeight: 0.88,
    acceptanceGatePassed: true,
  },
  {
    canonicalId: "OPENALEX:W4386895311",
    title: "Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs in sports rankings",
    sources: [
      {
        engine: "OPENALEX",
        externalId: "W4386895311",
        localPath: "docs/arxiv-program/research/2026-10-28/OPENALEX_ARXIV_NFL_COACHING_SCHEME_FIT_CORPUS.md",
      },
    ],
    domain: "BAYESIAN_SHRINKAGE",
    equationLatex: "\\gamma_{SHR} = (I - R) \\gamma_{MLE} + R u",
    stageAssignment: "STAGE_C_250",
    priorWeight: 0.82,
    acceptanceGatePassed: true,
  },
  {
    canonicalId: "KAGGLE:BDB2027-COMBINE-SPEED",
    title: "Big Data Bowl Combine NGS Sensor Dynamics & DL Game Speed Transfer Suite",
    sources: [
      {
        engine: "KAGGLE",
        externalId: "bdb2027-combine-suite",
        localPath: "docs/engine/research/2026-10-28/bdb2027-combine-suite",
      },
    ],
    domain: "BIOMECHANICS_NGS",
    equationLatex: "v_{burst}(t) = \\frac{d x_{tracking}}{dt} \\cdot \\kappa_{combine}",
    stageAssignment: "STAGE_B_2000",
    priorWeight: 0.80,
    acceptanceGatePassed: true,
  },
  {
    canonicalId: "HUGGINGFACE:GSE-COACH-BRAIN-SFT",
    title: "GSE Coach-Brain LLM Fine-Tuning Corpus and Ultra-Scale Playbook Formulas",
    sources: [
      {
        engine: "HUGGINGFACE",
        externalId: "gse-coach-brain-v1-sft",
        localPath: "data/llm/gse-coach-brain-v1-sft.jsonl",
      },
    ],
    domain: "COACH_SCHEME",
    equationLatex: "\\mathcal{L}_{SFT}(\\theta) = -\\sum_{t} \\log P(y_t | y_{<t}, x)",
    stageAssignment: "STAGE_A_3646",
    priorWeight: 0.90,
    acceptanceGatePassed: true,
  },
  {
    canonicalId: "DOCX_OMML:BELICHICK-277-001",
    title: "Master Execution Report The Belichick OMML Blueprint Equation 001",
    sources: [
      {
        engine: "DOCX_OMML",
        externalId: "Belichick-OMML-001",
        localPath: "C:\\Users\\Garrett\\Downloads\\Master Execution Report_ The Belichick.docx",
      },
    ],
    domain: "COACH_SCHEME",
    equationLatex: "R^2 = 0.283",
    stageAssignment: "STAGE_A_3646",
    priorWeight: 0.75,
    acceptanceGatePassed: true,
  },
];

/**
 * Load live crosswalk from disk (docs/engine/research/2026-10-28/QUAD-ENGINE-MASTER-CROSSWALK.json)
 * or fallback to representative seeds across all 5 engines.
 */
export function loadLiveQuadEngineCrosswalk(): QuadEngineCrosswalkNode[] {
  const possiblePaths = [
    join(process.cwd(), "docs/engine/research/2026-10-28/QUAD-ENGINE-MASTER-CROSSWALK.json"),
    resolve("C:/Users/Garrett/Sports/docs/engine/research/2026-10-28/QUAD-ENGINE-MASTER-CROSSWALK.json"),
  ];

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const repoRoot = resolve(dirname(currentFile), "../../../");
    possiblePaths.push(join(repoRoot, "docs/engine/research/2026-10-28/QUAD-ENGINE-MASTER-CROSSWALK.json"));
  } catch {
    // Ignore in non-ESM environments
  }

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        const entries = Array.isArray(parsed)
          ? parsed
          : (parsed.nodes || parsed.crosswalk || parsed.items || []);
        if (Array.isArray(entries) && entries.length > 0) {
          return buildQuadEngineCrosswalk(entries);
        }
      } catch {
        // Fall back to seed if error parsing
      }
    }
  }

  return buildQuadEngineCrosswalk(FALLBACK_SEED_CROSSWALK);
}
