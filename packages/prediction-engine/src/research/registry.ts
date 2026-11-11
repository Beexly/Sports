/**
 * Research registry — the bridge from the extracted paper corpus to engine numbers.
 *
 * ENABLED by human call (Garrett, 2026-11-10). Paper-derived values DO influence
 * projections from here on; the repo's earlier additive-only convention is
 * superseded for this layer.
 *
 * Fail-closed rules that survive the switch to enabled:
 *   - a paper with no stated value contributes nothing
 *   - a malformed record is dropped, never coerced
 *   - an empty corpus reproduces the pre-research behaviour exactly
 */
import {
  isFiniteNumber,
  type ResearchEvidence,
  type ResearchLane,
  type ResearchParameter,
} from "./types.js";
import { blendTowardEvidence, combineParameter, computeWeights } from "./weighting.js";

const VALID_LANES: ReadonlySet<string> = new Set<ResearchLane>([
  "calibration",
  "modeling",
  "feature",
  "evaluation",
  "unknown",
]);

/**
 * One row as emitted by the extraction pipeline. `sourceText` is kept verbatim so
 * every number can be traced back to the sentence it came from.
 */
export interface EvidenceRecord {
  readonly arxiv_id?: string | null;
  readonly paper_title?: string | null;
  readonly lane?: string | null;
  readonly confidence?: number | null;
  readonly enabled?: boolean | null;
  readonly parameters?: ReadonlyArray<{ name?: string | null; value?: unknown; unit?: string | null; sourceText?: string | null }> | null;
}

/** Coerce one raw record, dropping anything that cannot be trusted. */
export function normaliseRecord(raw: EvidenceRecord): ResearchEvidence | null {
  const title = typeof raw.paper_title === "string" ? raw.paper_title.trim() : "";
  if (!title) return null;
  const lane = typeof raw.lane === "string" && VALID_LANES.has(raw.lane) ? (raw.lane as ResearchLane) : "unknown";
  const confidence = isFiniteNumber(raw.confidence) ? raw.confidence : 0;
  if (confidence <= 0 || confidence > 1) return null;

  const parameters: ResearchParameter[] = [];
  for (const p of raw.parameters ?? []) {
    if (!p || typeof p.name !== "string" || !p.name.trim()) continue;
    if (!isFiniteNumber(p.value)) continue;
    parameters.push({
      name: p.name.trim(),
      value: p.value,
      ...(typeof p.unit === "string" && p.unit.trim() ? { unit: p.unit.trim() } : {}),
    });
  }

  return {
    arxivId: typeof raw.arxiv_id === "string" && raw.arxiv_id.trim() ? raw.arxiv_id.trim() : null,
    title,
    lane,
    confidence,
    enabled: raw.enabled !== false, // enabled unless explicitly disabled
    parameters,
  };
}

/** Build evidence from raw rows, discarding every malformed record. */
export function loadRegistry(rows: readonly EvidenceRecord[]): ResearchEvidence[] {
  const out: ResearchEvidence[] = [];
  for (const row of rows) {
    const e = normaliseRecord(row);
    if (e) out.push(e);
  }
  return out;
}

export interface ResolvedParameter {
  readonly name: string;
  readonly prior: number;
  readonly value: number;
  readonly contributors: number;
  readonly weight: number;
}

/**
 * Resolve one engine slot from evidence.
 *
 * `strength` is how much of the evidence-derived value to adopt: the corpus is
 * broad but rarely speaks to one exact slot, so the default is deliberately
 * partial (0.5) rather than a full takeover.
 */
export function resolveParameter(
  evidence: readonly ResearchEvidence[],
  name: string,
  prior: number,
  strength = 0.5,
): ResolvedParameter {
  const weighted = computeWeights(evidence);
  const combined = combineParameter(weighted, name, prior);
  const value = blendTowardEvidence(prior, combined.value, combined.contributors === 0 ? 0 : strength);
  return {
    name,
    prior,
    value: isFiniteNumber(value) ? value : prior,
    contributors: combined.contributors,
    weight: combined.weight,
  };
}

/** Total usable weight, useful for reporting whether the corpus is actually wired. */
export function evidenceMass(evidence: readonly ResearchEvidence[]): number {
  return computeWeights(evidence).reduce((sum, e) => sum + e.weight, 0);
}
