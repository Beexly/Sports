/**
 * Economic policy layer for LLM dispatch.
 *
 * The provider router's default rule — "try credits provider, fall back to direct
 * Anthropic on failure" — is reliability-first. For a cash-constrained operator that
 * default is wrong: a silent fallback creates cash charges exactly when you believe
 * credits are paying. `LLM_COST_MODE` makes the economic policy explicit:
 *
 *   normal        Reliability-first. Provider errors fall back to direct Anthropic.
 *   credits-only  Bedrock/Vertex only. A provider failure FAILS CLOSED — it throws
 *                 rather than falling through to the billable Anthropic API.
 *   zero-cash     Strictest. Same dispatch rule as credits-only (credit providers are
 *                 prepaid/non-cash), and signals call sites to prefer the free lane
 *                 (internal-llm, Cerebras) before calling Claude at all.
 *
 * Unrecognized LLM_COST_MODE values throw rather than defaulting to "normal" —
 * a typo must never silently re-enable cash billing.
 */
import type { CreditPool } from "./credit-pool";

export type LlmCostMode = "normal" | "credits-only" | "zero-cash";

const MODE_ALIASES: Record<string, LlmCostMode> = {
  "normal": "normal",
  "credits-only": "credits-only",
  "credits_only": "credits-only",
  "creditsonly": "credits-only",
  "zero-cash": "zero-cash",
  "zero_cash": "zero-cash",
  "zerocash": "zero-cash",
};

export class CostPolicyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostPolicyConfigError";
  }
}

/** Thrown when the active cost mode forbids the only remaining (billable) path. */
export class CostPolicyBlockedError extends Error {
  readonly costMode: LlmCostMode;
  readonly fallbackReason: string;
  constructor(costMode: LlmCostMode, fallbackReason: string) {
    super(
      `LLM_COST_MODE=${costMode} blocks the billable direct Anthropic API (${fallbackReason}). ` +
        `Fix the credit provider, switch LLM_COST_MODE=normal deliberately, or route this task to the free lane.`,
    );
    this.name = "CostPolicyBlockedError";
    this.costMode = costMode;
    this.fallbackReason = fallbackReason;
  }
}

export function resolveLlmCostMode(env: Record<string, string | undefined> = process.env): LlmCostMode {
  const raw = env["LLM_COST_MODE"]?.trim().toLowerCase();
  if (!raw) return "normal";
  const mode = MODE_ALIASES[raw];
  if (!mode) {
    throw new CostPolicyConfigError(
      `Unrecognized LLM_COST_MODE "${raw}". Valid values: normal | credits-only | zero-cash. ` +
        `Refusing to guess — an unrecognized value must not silently enable cash billing.`,
    );
  }
  return mode;
}

/** Only "normal" mode may fall through to the billable direct Anthropic API. */
export function billableFallbackAllowed(mode: LlmCostMode): boolean {
  return mode === "normal";
}

export type DispatchProvider = "bedrock" | "vertex" | "anthropic";

/** Per-call telemetry: which provider was asked for, which paid, and why. */
export interface LlmDispatchRecord {
  readonly costMode: LlmCostMode;
  readonly providerRequested: DispatchProvider;
  readonly providerUsed: DispatchProvider | "blocked";
  readonly modelRequested: string;
  readonly modelUsed: string | null;
  readonly fallbackReason: string | null;
  readonly billingPool: CreditPool | "blocked";
  readonly surface: string | null;
}
