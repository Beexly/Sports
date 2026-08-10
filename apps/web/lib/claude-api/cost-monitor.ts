export type ClaudeApiSurface =
  | "BLOG_GENERATION"
  | "STUDIO_GENERATION"
  | "MODEL_JOURNAL_DRAFT"
  | "MODEL_COURT_ANSWER"
  | "CALIBRATION_WEEKLY_INSIGHT"
  | "PRE_MORTEM_SUMMARY"
  | "PICK_EXPLANATION"
  | "LOSS_AUTOPSY_DRAFT"
  | "OTHER";

export type ClaudeBudgetStatus = "green" | "yellow" | "orange" | "red" | "hard_cap";

export interface ClaudeApiBudgetPolicy {
  readonly surface: ClaudeApiSurface;
  readonly monthlyBudgetUsd: number;
  readonly thresholds: {
    readonly yellow: number;
    readonly orange: number;
    readonly red: number;
    readonly hardCap: number;
  };
}

export interface ClaudeBudgetUsage {
  readonly surface: ClaudeApiSurface;
  readonly spentUsd: number;
  readonly budgetUsd: number;
  readonly ratio: number;
  readonly status: ClaudeBudgetStatus;
  readonly requestAllowed: boolean;
  readonly fallbackMessage: string | null;
}

export interface ClaudeTokenPricing {
  readonly inputUsdPerMillionTokens: number;
  readonly outputUsdPerMillionTokens: number;
  /** Cache read $/MTok (Anthropic ~0.1× input). Defaults to 0.1× input when omitted. */
  readonly cacheReadUsdPerMillionTokens?: number;
  /** Cache write $/MTok (Anthropic ~1.25× input for 5m TTL). Defaults to 1.25× input. */
  readonly cacheWriteUsdPerMillionTokens?: number;
}

export const CLAUDE_API_SURFACES: readonly ClaudeApiSurface[] = [
  "BLOG_GENERATION",
  "STUDIO_GENERATION",
  "MODEL_JOURNAL_DRAFT",
  "MODEL_COURT_ANSWER",
  "CALIBRATION_WEEKLY_INSIGHT",
  "PRE_MORTEM_SUMMARY",
  "PICK_EXPLANATION",
  "LOSS_AUTOPSY_DRAFT",
  "OTHER",
];

const DEFAULT_THRESHOLDS = {
  yellow: 0.5,
  orange: 0.8,
  red: 1,
  hardCap: 1.5,
} as const;

export const DEFAULT_CLAUDE_API_BUDGETS: Readonly<Record<ClaudeApiSurface, ClaudeApiBudgetPolicy>> = {
  BLOG_GENERATION: {
    surface: "BLOG_GENERATION",
    monthlyBudgetUsd: 50,
    thresholds: DEFAULT_THRESHOLDS,
  },
  STUDIO_GENERATION: {
    surface: "STUDIO_GENERATION",
    monthlyBudgetUsd: 500,
    thresholds: DEFAULT_THRESHOLDS,
  },
  MODEL_JOURNAL_DRAFT: {
    surface: "MODEL_JOURNAL_DRAFT",
    monthlyBudgetUsd: 50,
    thresholds: DEFAULT_THRESHOLDS,
  },
  MODEL_COURT_ANSWER: {
    surface: "MODEL_COURT_ANSWER",
    monthlyBudgetUsd: 2000,
    thresholds: DEFAULT_THRESHOLDS,
  },
  CALIBRATION_WEEKLY_INSIGHT: {
    surface: "CALIBRATION_WEEKLY_INSIGHT",
    monthlyBudgetUsd: 50,
    thresholds: DEFAULT_THRESHOLDS,
  },
  PRE_MORTEM_SUMMARY: {
    surface: "PRE_MORTEM_SUMMARY",
    monthlyBudgetUsd: 0,
    thresholds: DEFAULT_THRESHOLDS,
  },
  PICK_EXPLANATION: {
    surface: "PICK_EXPLANATION",
    monthlyBudgetUsd: 200,
    thresholds: DEFAULT_THRESHOLDS,
  },
  LOSS_AUTOPSY_DRAFT: {
    surface: "LOSS_AUTOPSY_DRAFT",
    monthlyBudgetUsd: 50,
    thresholds: DEFAULT_THRESHOLDS,
  },
  OTHER: {
    surface: "OTHER",
    monthlyBudgetUsd: 100,
    thresholds: DEFAULT_THRESHOLDS,
  },
};

export const CLAUDE_BUDGET_FALLBACKS: Readonly<Record<ClaudeApiSurface, string>> = {
  BLOG_GENERATION:
    "Blog drafting is paused while the API budget recovers. Draft data is preserved for the next cycle.",
  STUDIO_GENERATION: [
    "Studio is at generation capacity for this billing cycle. Templates can be regenerated next month.",
    "",
    "You can still:",
    "- Open the Game Room directly for the raw signal data.",
    "- Use the existing assets in your generation history.",
  ].join("\n"),
  MODEL_JOURNAL_DRAFT:
    "The Model Journal weekly draft is paused while the API budget recovers. This week's data is preserved and will draft next cycle.",
  MODEL_COURT_ANSWER: [
    "The Model Court is at capacity for this billing cycle. Try again next month, or check the factor breakdown on this game directly.",
    "",
    "What we publish without the Court:",
    "- The Edge Index.",
    "- The factor breakdown.",
    "- The pre-mortem.",
    "- The Public Ledger for similar settled picks.",
  ].join("\n"),
  CALIBRATION_WEEKLY_INSIGHT:
    "Your weekly calibration insight is pending. We'll catch up next week without breaking the streak.",
  PRE_MORTEM_SUMMARY:
    "Pre-mortem summaries are paused while the API budget recovers. The underlying factor data is still available.",
  PICK_EXPLANATION:
    "The plain-language explainer is at capacity for this billing cycle. The full factor breakdown and evidence audit for this pick are still available below.",
  LOSS_AUTOPSY_DRAFT:
    "Loss-autopsy drafting is paused while the API budget recovers. Operators can still author autopsies by hand; the underlying signal snapshot is preserved.",
  OTHER:
    "This generation surface is at capacity for this billing cycle. Existing deterministic data remains available.",
};

/** Sonnet-class default pricing (used when model-specific pricing unavailable). */
export const DEFAULT_CLAUDE_TOKEN_PRICING: ClaudeTokenPricing = {
  inputUsdPerMillionTokens: 3,
  outputUsdPerMillionTokens: 15,
  cacheReadUsdPerMillionTokens: 0.3,
  cacheWriteUsdPerMillionTokens: 3.75,
};

export function evaluateClaudeBudgetUsage(
  surface: ClaudeApiSurface,
  spentUsd: number,
  policy: ClaudeApiBudgetPolicy = DEFAULT_CLAUDE_API_BUDGETS[surface]
): ClaudeBudgetUsage {
  const budgetUsd = policy.monthlyBudgetUsd;
  const ratio = budgetUsd > 0 ? spentUsd / budgetUsd : Number.POSITIVE_INFINITY;
  const status = statusFromRatio(ratio, policy.thresholds);
  const requestAllowed = status !== "red" && status !== "hard_cap";

  return {
    surface,
    spentUsd,
    budgetUsd,
    ratio,
    status,
    requestAllowed,
    fallbackMessage: requestAllowed ? null : CLAUDE_BUDGET_FALLBACKS[surface],
  };
}

/**
 * Estimate USD for a Claude call.
 * Legacy 2-arg form (input, output) preserved.
 * When cache tokens are provided, Anthropic billing semantics apply:
 *   uncached input + cache_write + cache_read + output.
 */
export function estimateClaudeCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: ClaudeTokenPricing = DEFAULT_CLAUDE_TOKEN_PRICING,
  cache?: { readonly cacheCreationInputTokens?: number; readonly cacheReadInputTokens?: number },
): number {
  const cacheWriteRate =
    pricing.cacheWriteUsdPerMillionTokens ?? pricing.inputUsdPerMillionTokens * 1.25;
  const cacheReadRate =
    pricing.cacheReadUsdPerMillionTokens ?? pricing.inputUsdPerMillionTokens * 0.1;
  const writeTok = cache?.cacheCreationInputTokens ?? 0;
  const readTok = cache?.cacheReadInputTokens ?? 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;
  const writeCost = (writeTok / 1_000_000) * cacheWriteRate;
  const readCost = (readTok / 1_000_000) * cacheReadRate;
  return Number((inputCost + outputCost + writeCost + readCost).toFixed(6));
}

/**
 * Cache hit rate for a single call (0–1). High rates mean the system prompt
 * is paying off. Creation-only calls report 0 until subsequent hits.
 */
export function cacheHitRate(usage: {
  readonly inputTokens: number;
  readonly cacheCreationInputTokens: number;
  readonly cacheReadInputTokens: number;
}): number {
  const total =
    usage.inputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
  if (total <= 0) return 0;
  return usage.cacheReadInputTokens / total;
}

function statusFromRatio(
  ratio: number,
  thresholds: ClaudeApiBudgetPolicy["thresholds"]
): ClaudeBudgetStatus {
  if (ratio >= thresholds.hardCap) return "hard_cap";
  if (ratio >= thresholds.red) return "red";
  if (ratio >= thresholds.orange) return "orange";
  if (ratio >= thresholds.yellow) return "yellow";
  return "green";
}
