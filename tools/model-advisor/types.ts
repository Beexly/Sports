/**
 * model-advisor — dev-facing model catalog + deterministic task router.
 *
 * Standalone tool: no runtime dependencies, no imports from apps/ or packages/.
 * It is NOT product code and must never be imported by the Next.js app or the
 * AI Control Plane. See docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md (Task 1).
 */

/** How a catalog entry was verified. Unverified models are not allowed here. */
export type VerificationStatus = "verified" | "known-real";

export type ModelRole =
  | "local-primary"
  | "local-coder"
  | "reasoning"
  | "frontier"
  | "cheap-frontier"
  | "long-context"
  | "multimodal";

export type Tier = "local" | "openrouter" | "frontier" | "batch";

export interface ModelEntry {
  /** Stable kebab-case identifier, e.g. "qwen3-coder-30b-a3b". */
  id: string;
  label: string;
  provider: string;
  /** Hugging Face repo id; null for hosted-only models. */
  hfRepo: string | null;
  license: string;
  verification: VerificationStatus;
  /** True when a GGUF/Ollama path exists so it runs on operator hardware. */
  localRunnable: boolean;
  roles: readonly ModelRole[];
  contextTokens: number | null;
  /**
   * Third-party *reported* pricing (USD per 1M tokens), never provider-confirmed
   * truth. Null for local models and unknowns.
   */
  reportedInputUsdPerM: number | null;
  reportedOutputUsdPerM: number | null;
  notes: string;
}

export type TaskKind =
  | "coding"
  | "reasoning"
  | "agentic"
  | "long-context"
  | "multimodal"
  | "bulk";

export interface TaskProfile {
  kind: TaskKind;
  /** 1 (trivial) .. 10 (hardest). Values outside the range are clamped. */
  complexity: number;
  contextTokens?: number;
  toolUse?: boolean;
  privacy?: "local-only" | "any";
  budget?: "free" | "cheap" | "any";
}

export interface Recommendation {
  tier: Tier;
  primary: ModelEntry;
  fallbacks: readonly ModelEntry[];
  rationale: string;
}
