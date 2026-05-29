/**
 * Explainability Ladder — the six explanation levels Galaxy supports.
 *
 * Each level carries a content policy. Public levels (`plain`, `standard`,
 * `sharp`) **never** reveal confidential methodology. The Academy and
 * Operator levels are gated and may surface more depth.
 *
 * Hard rule (Constitution #5, AI risk control rc-003):
 * No public-tier level may include factor weights, thresholds,
 * calibration formulas, system prompt text, or aggregation logic.
 */

export const EXPLANATION_LEVELS = [
  "plain", // first-time user, no jargon
  "standard", // regular reader of /today and /picks
  "sharp", // operator-vocabulary aware, methodology-followed
  "technical-safe", // structural depth without revealing internals
  "academy", // tracked learning context, can reference module content
  "operator-only", // server-only audience (cockpit / studio)
] as const;

export type ExplanationLevel = (typeof EXPLANATION_LEVELS)[number];

export type ExplanationAudience = "public" | "authenticated" | "operator";

export const LEVEL_AUDIENCE: Record<ExplanationLevel, ExplanationAudience> = {
  plain: "public",
  standard: "public",
  sharp: "public",
  "technical-safe": "public",
  academy: "authenticated",
  "operator-only": "operator",
};

/** Disclosures each level is allowed to surface. */
export const LEVEL_ALLOWED_TERMS: Record<ExplanationLevel, ReadonlyArray<string>> = {
  plain: ["model", "signal", "pass", "evidence", "freshness"],
  standard: [
    "model",
    "signal",
    "pass",
    "evidence",
    "freshness",
    "confidence band",
    "factor",
    "edge",
    "closing line",
  ],
  sharp: [
    "model",
    "signal",
    "pass",
    "evidence",
    "freshness",
    "confidence band",
    "factor",
    "edge",
    "closing line",
    "calibration",
    "edge score",
    "CLV",
    "factor trail",
  ],
  "technical-safe": [
    "model",
    "signal",
    "pass",
    "evidence",
    "freshness",
    "confidence band",
    "factor",
    "edge",
    "closing line",
    "calibration",
    "edge score",
    "CLV",
    "factor trail",
    "feature category",
    "data pipeline",
    "publish gate",
    "settlement",
  ],
  academy: [
    "all-public-vocabulary",
    "module-cross-reference",
    "worked-example",
  ],
  "operator-only": [
    "internal-monitor",
    "queue-state",
    "scoring-trace",
    "prompt-template-reference (by id, not text)",
  ],
};

/** Terms that no public-tier level may contain. */
export const PUBLIC_FORBIDDEN_TERMS: ReadonlyArray<string> = [
  "exact threshold",
  "factor weight",
  "the formula is",
  "prompt template",
  "calibration coefficient",
  "system prompt",
  "private threshold",
  "weight vector",
];

export function isPublicLevel(level: ExplanationLevel): boolean {
  return LEVEL_AUDIENCE[level] === "public";
}

export function containsForbiddenForPublic(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of PUBLIC_FORBIDDEN_TERMS) {
    if (lower.includes(term)) return term;
  }
  return null;
}
