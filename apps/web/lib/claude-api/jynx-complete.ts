/**
 * Jynx complete — preferred single entry for LLM surfaces.
 * plan → free-lane (if eligible) → multi-cloud callClaude → cash.
 *
 * Always clamps max_tokens to surface ceilings and enables system-prompt
 * caching by default so Azure CCU / cash burns stay bounded.
 */
import type { ClaudeMessagesResult } from "./messages";
import { callClaude } from "./provider-dispatch";
import { planJynx } from "./jynx";
import { generateContentMessages, type ContentMessagesRequest } from "./free-lane";
import { shouldUseFreeLane } from "./free-lane-policy";
import { maxTokensForSurface } from "./model-router";

type Env = Record<string, string | undefined>;

export interface JynxCompleteResult extends ClaudeMessagesResult {
  readonly jynxPrimaryLane: string;
  readonly jynxReason: string;
}

export async function jynxComplete(
  request: ContentMessagesRequest,
  env: Env = process.env,
): Promise<JynxCompleteResult> {
  const clampedMax = maxTokensForSurface(request.surface, request.maxTokens);
  const plan = planJynx(
    { surface: request.surface, model: request.model, maxTokens: clampedMax },
    env,
  );

  // Default system cache ON unless caller explicitly set cache (including false via {}).
  // Free-lane paths ignore cache (non-Anthropic). Cloud/cash paths benefit.
  const withDefaults: ContentMessagesRequest = {
    ...request,
    model: request.model ?? plan.anthropicModelId,
    maxTokens: clampedMax,
    cache: request.cache ?? { system: true },
  };

  const result = shouldUseFreeLane(request.surface, env)
    ? await generateContentMessages(withDefaults, env)
    : await callClaude(withDefaults, env);

  return {
    ...result,
    // Free-lane adapters may omit cache fields — normalize for ledger consumers.
    cacheCreationInputTokens: result.cacheCreationInputTokens ?? 0,
    cacheReadInputTokens: result.cacheReadInputTokens ?? 0,
    jynxPrimaryLane: plan.primaryLane,
    jynxReason: plan.reason,
  };
}
