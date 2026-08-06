/**
 * Open-weight / free-API catalog for Jynx planning.
 *
 * Scores and prices are operator-facing research snapshots (not runtime SLAs).
 * They guide which FREE_LANE_SECONDARY_MODEL / INTERNAL_LLM_MODEL to set — they
 * do not auto-route production without env + quality validation.
 *
 * Law: free/open hosts are content + internal only until validated. Studio /
 * journal / model-court stay on Claude credit clouds.
 */

export type OpenWeightLane =
  | "free_content" // free-lane eligible (with env)
  | "internal_only" // classify/dedup — never user-facing claims
  | "self_host" // local / own GPU (Azure GPU, NIM, etc.)
  | "paid_open_weight" // open weights but paid API
  | "avoid_public"; // too weak / wrong modality for GSE surfaces

export interface OpenWeightEntry {
  readonly id: string;
  readonly provider: string;
  readonly score: number; // relative leaderboard score from operator research
  readonly contextK: number;
  readonly inputPerM: number | "free";
  readonly outputPerM: number | "free";
  readonly lane: OpenWeightLane;
  readonly jynxNote: string;
}

/**
 * High-signal subset of the 2026 open/free leaderboard mapped to GSE lanes.
 * Full table lives in docs/ops/JYNX_OPEN_WEIGHT_FREE_MAP.md.
 */
export const OPEN_WEIGHT_CATALOG: readonly OpenWeightEntry[] = [
  {
    id: "gemma-4-26b-a4b-free",
    provider: "Google",
    score: 69,
    contextK: 262,
    inputPerM: "free",
    outputPerM: "free",
    lane: "free_content",
    jynxNote: "Top free API candidate for secondary free-lane (after Cerebras).",
  },
  {
    id: "gemma-4-31b-free",
    provider: "Google",
    score: 69,
    contextK: 262,
    inputPerM: "free",
    outputPerM: "free",
    lane: "free_content",
    jynxNote: "Strong free quality; host via free Google/OpenRouter when available.",
  },
  {
    id: "nemotron-3-nano-omni-free",
    provider: "NVIDIA",
    score: 68,
    contextK: 256,
    inputPerM: "free",
    outputPerM: "free",
    lane: "free_content",
    jynxNote: "NVIDIA free NIM / build program — pairs with Founders Hub GPU path.",
  },
  {
    id: "nemotron-3-super-free",
    provider: "NVIDIA",
    score: 63,
    contextK: 262,
    inputPerM: "free",
    outputPerM: "free",
    lane: "free_content",
    jynxNote: "Free NVIDIA host; good internal+content when NIM free tier live.",
  },
  {
    id: "nemotron-3-ultra-free",
    provider: "NVIDIA",
    score: 60,
    contextK: 1024,
    inputPerM: "free",
    outputPerM: "free",
    lane: "self_host",
    jynxNote: "1M context free host when available; heavy — use sparingly.",
  },
  {
    id: "gpt-oss-120b",
    provider: "OpenAI weights / Cerebras host",
    score: 49,
    contextK: 131,
    inputPerM: "free",
    outputPerM: "free",
    lane: "free_content",
    jynxNote: "DEFAULT free-lane on Cerebras today (primary content $0 path).",
  },
  {
    id: "gpt-oss-20b-free",
    provider: "OpenAI weights",
    score: 56,
    contextK: 131,
    inputPerM: "free",
    outputPerM: "free",
    lane: "internal_only",
    jynxNote: "Smaller free oss — good INTERNAL_LLM_MODEL candidate.",
  },
  {
    id: "minimax-m3",
    provider: "MiniMax",
    score: 65,
    contextK: 1000,
    inputPerM: 0.3,
    outputPerM: 1.2,
    lane: "paid_open_weight",
    jynxNote: "Cheap paid open-weight API — use only if free hosts exhausted.",
  },
  {
    id: "deepseek-v4-pro",
    provider: "DeepSeek",
    score: 58,
    contextK: 1000,
    inputPerM: 0.43,
    outputPerM: 0.87,
    lane: "paid_open_weight",
    jynxNote: "Strong coding/bench; not free — prefer credits for Claude quality path.",
  },
  {
    id: "kimi-k3",
    provider: "Moonshot",
    score: 59,
    contextK: 1000,
    inputPerM: 3.0,
    outputPerM: 15.0,
    lane: "avoid_public",
    jynxNote: "Expensive for GSE; do not put on free-lane. Claude credits better ROI.",
  },
  {
    id: "llama-4-scout",
    provider: "Meta",
    score: 49,
    contextK: 1300,
    inputPerM: 0.1,
    outputPerM: 0.3,
    lane: "internal_only",
    jynxNote: "Long-context specialist via host; internal classify / research only.",
  },
  {
    id: "qwen3-coder-480b",
    provider: "Alibaba",
    score: 46,
    contextK: 262,
    inputPerM: 0.3,
    outputPerM: 1.0,
    lane: "internal_only",
    jynxNote: "Coding agent host — Claude Max Pro remains human coding; optional internal.",
  },
  {
    id: "north-mini-code-free",
    provider: "Cohere",
    score: 59,
    contextK: 256,
    inputPerM: "free",
    outputPerM: "free",
    lane: "internal_only",
    jynxNote: "Free code-ish model — internal tooling only until quality proven.",
  },
] as const;

export function freeContentCandidates(): readonly OpenWeightEntry[] {
  return OPEN_WEIGHT_CATALOG.filter((e) => e.lane === "free_content");
}

export function internalOnlyCandidates(): readonly OpenWeightEntry[] {
  return OPEN_WEIGHT_CATALOG.filter((e) => e.lane === "internal_only");
}

/** Recommended FREE_LANE_SECONDARY_MODEL ids in preference order (research). */
export const RECOMMENDED_SECONDARY_FREE_MODELS = [
  "gemma-4-31b",
  "gemma-4-26b-a4b",
  "nemotron-3-nano-omni",
  "nemotron-3-super",
  "gpt-oss-20b",
] as const;
