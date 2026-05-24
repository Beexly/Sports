/**
 * Pick provenance builder for cockpit operators.
 *
 * Converts persisted Pick + SourceSnapshot rows into a deterministic,
 * read-only envelope that answers "how did this pick come to exist?" with:
 * source chain, factor list, confidence math, final fields, and narrative.
 */

import type { FactorBreakdown } from "@sports/types";

export interface PickProvenanceSourceRowInput {
  readonly id: string;
  readonly provider: string;
  readonly sourceKind: string;
  readonly fetchedAt: Date;
  readonly payloadHash: string;
  readonly payloadBytes: number;
  readonly ingestionRunId: string | null;
}

export interface PickProvenancePickInput {
  readonly id: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly consensusPct: number;
  readonly bookmakerCount: number;
  readonly tier: string;
  readonly pickGrade: string;
  readonly riskLevel: string;
  readonly reasoning: string;
  readonly reasoningShort: string;
  readonly modelVersion: string;
  readonly generatedAt: Date;
  readonly dataFreshnessAt: Date | null;
  readonly factorBreakdown: unknown;
}

export interface PickProvenancePayload {
  readonly pickId: string;
  readonly modelVersion: string;
  readonly generatedAt: string;
  readonly sources: ReadonlyArray<{
    readonly id: string;
    readonly provider: string;
    readonly sourceKind: string;
    readonly fetchedAt: string;
    readonly payloadHashPrefix: string;
    readonly payloadBytes: number;
    readonly ingestionRunId: string | null;
  }>;
  readonly factors: ReadonlyArray<{
    readonly name: string;
    readonly impact: string;
    readonly weight: number;
    readonly description: string;
    readonly sourceCategory: string | null;
    readonly sourceName: string | null;
    readonly freshnessStatus: string | null;
    readonly activationStatus: string | null;
  }>;
  readonly confidence: {
    readonly score: number;
    readonly math: {
      readonly components: Readonly<Record<string, number>>;
      readonly rawScore: number;
      readonly clampedScore: number;
      readonly storedScore: number;
      readonly deltaVsStored: number;
    };
  };
  readonly finalPick: {
    readonly pickType: string;
    readonly selection: string;
    readonly line: number;
    readonly tier: string;
    readonly pickGrade: string;
    readonly riskLevel: string;
    readonly edgeScore: number;
    readonly consensusPct: number;
    readonly bookmakerCount: number;
    readonly dataFreshnessAt: string | null;
  };
  readonly narrative: {
    readonly reasoning: string;
    readonly reasoningShort: string;
  } | null;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function numeric(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function parseFactorBreakdown(raw: unknown): FactorBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  const maybe = raw as Partial<FactorBreakdown>;
  if (
    typeof maybe.consensusScore !== "number" ||
    typeof maybe.marketDepthScore !== "number" ||
    typeof maybe.edgeScore !== "number" ||
    typeof maybe.lineMovementScore !== "number" ||
    typeof maybe.volatilityPenalty !== "number" ||
    !Array.isArray(maybe.factors)
  ) {
    return null;
  }
  return maybe as FactorBreakdown;
}

// Build the API payload from already-loaded DB rows (pure, no I/O).
export function buildPickProvenance(
  pick: PickProvenancePickInput,
  sourceRows: readonly PickProvenanceSourceRowInput[]
): PickProvenancePayload {
  const breakdown = parseFactorBreakdown(pick.factorBreakdown);

  const components: Record<string, number> = {
    consensusScore: numeric(breakdown?.consensusScore),
    marketDepthScore: numeric(breakdown?.marketDepthScore),
    edgeScore: numeric(breakdown?.edgeScore),
    lineMovementScore: numeric(breakdown?.lineMovementScore),
    volatilityPenalty: numeric(breakdown?.volatilityPenalty),
    headToHeadScore: numeric(breakdown?.headToHeadScore),
    venueFormScore: numeric(breakdown?.venueFormScore),
    uncertaintyPenalty: numeric(breakdown?.uncertaintyPenalty),
    crossMarketScore: numeric(breakdown?.crossMarketScore),
    scheduleStressScore: numeric(breakdown?.scheduleStressScore),
  };

  const rawScore = Object.values(components).reduce((sum, n) => sum + n, 0);
  const clamped = clampScore(rawScore);

  return {
    pickId: pick.id,
    modelVersion: pick.modelVersion,
    generatedAt: pick.generatedAt.toISOString(),
    sources: sourceRows.map((s) => ({
      id: s.id,
      provider: s.provider,
      sourceKind: s.sourceKind,
      fetchedAt: s.fetchedAt.toISOString(),
      payloadHashPrefix: s.payloadHash.slice(0, 12),
      payloadBytes: s.payloadBytes,
      ingestionRunId: s.ingestionRunId,
    })),
    factors: (breakdown?.factors ?? []).map((f) => ({
      name: f.name,
      impact: f.impact,
      weight: f.weight,
      description: f.description,
      sourceCategory: f.evidence?.sourceCategory ?? null,
      sourceName: f.evidence?.sourceName ?? null,
      freshnessStatus: f.evidence?.freshnessStatus ?? null,
      activationStatus: f.evidence?.activationStatus ?? null,
    })),
    confidence: {
      score: pick.confidence,
      math: {
        components,
        rawScore,
        clampedScore: clamped,
        storedScore: pick.confidence,
        deltaVsStored: pick.confidence - clamped,
      },
    },
    finalPick: {
      pickType: pick.pickType,
      selection: pick.selection,
      line: pick.line,
      tier: pick.tier,
      pickGrade: pick.pickGrade,
      riskLevel: pick.riskLevel,
      edgeScore: pick.edgeScore,
      consensusPct: pick.consensusPct,
      bookmakerCount: pick.bookmakerCount,
      dataFreshnessAt: pick.dataFreshnessAt
        ? pick.dataFreshnessAt.toISOString()
        : null,
    },
    narrative:
      pick.reasoning || pick.reasoningShort
        ? {
            reasoning: pick.reasoning,
            reasoningShort: pick.reasoningShort,
          }
        : null,
  };
}
