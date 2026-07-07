export interface ContentIdeaScoreInput {
  readonly demand: number;
  readonly hookStrength: number;
  readonly gseAuthorityFit: number;
  readonly differentiation: number;
  readonly monetizationFit: number;
  readonly productionEase: number;
  readonly complianceSafety: number;
}

export interface ContentIdeaScoreResult {
  readonly score: number;
  readonly grade: "DROP" | "BACKLOG" | "TEST" | "PRIORITY" | "FLAGSHIP";
  readonly reasons: readonly string[];
}

const WEIGHTS: Readonly<Record<keyof ContentIdeaScoreInput, number>> = {
  complianceSafety: 0.1,
  demand: 0.2,
  differentiation: 0.14,
  gseAuthorityFit: 0.16,
  hookStrength: 0.18,
  monetizationFit: 0.12,
  productionEase: 0.1,
};

export function scoreContentIdea(input: ContentIdeaScoreInput): ContentIdeaScoreResult {
  const normalized = normalizeInput(input);
  const score = roundScore(
    (normalized.demand * WEIGHTS.demand +
      normalized.hookStrength * WEIGHTS.hookStrength +
      normalized.gseAuthorityFit * WEIGHTS.gseAuthorityFit +
      normalized.differentiation * WEIGHTS.differentiation +
      normalized.monetizationFit * WEIGHTS.monetizationFit +
      normalized.productionEase * WEIGHTS.productionEase +
      normalized.complianceSafety * WEIGHTS.complianceSafety) *
      100,
  );
  const reasons: string[] = [];
  if (normalized.complianceSafety < 0.5) reasons.push("Compliance safety is weak; require review before drafting.");
  if (normalized.gseAuthorityFit >= 0.8) reasons.push("Strong fit with GSE evidence and trust posture.");
  if (normalized.hookStrength >= 0.8) reasons.push("Hook is strong enough for platform testing.");
  if (normalized.productionEase < 0.35) reasons.push("Production complexity may slow cadence.");
  return { grade: gradeContentIdea(score), reasons, score };
}

function normalizeInput(input: ContentIdeaScoreInput): ContentIdeaScoreInput {
  return {
    complianceSafety: clamp01(input.complianceSafety),
    demand: clamp01(input.demand),
    differentiation: clamp01(input.differentiation),
    gseAuthorityFit: clamp01(input.gseAuthorityFit),
    hookStrength: clamp01(input.hookStrength),
    monetizationFit: clamp01(input.monetizationFit),
    productionEase: clamp01(input.productionEase),
  };
}

function gradeContentIdea(score: number): ContentIdeaScoreResult["grade"] {
  if (score < 40) return "DROP";
  if (score < 60) return "BACKLOG";
  if (score < 75) return "TEST";
  if (score < 90) return "PRIORITY";
  return "FLAGSHIP";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
