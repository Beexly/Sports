/**
 * Jynx complete — preferred single entry for LLM surfaces.
 * plan → free-lane (if eligible) → multi-cloud callClaude → cash.
 */
import type { ClaudeMessagesResult } from "./messages";
import { callClaude } from "./provider-dispatch";
import { planJynx } from "./jynx";
import { generateContentMessages, type ContentMessagesRequest } from "./free-lane";
import { shouldUseFreeLane } from "./free-lane-policy";

type Env = Record<string, string | undefined>;

export interface JynxCompleteResult extends ClaudeMessagesResult {
  readonly jynxPrimaryLane: string;
  readonly jynxReason: string;
}

export async function jynxComplete(
  request: ContentMessagesRequest,
  env: Env = process.env,
): Promise<JynxCompleteResult> {
  const plan = planJynx(
    { surface: request.surface, model: request.model, maxTokens: request.maxTokens },
    env,
  );

  const withModel: ContentMessagesRequest = {
    ...request,
    model: request.model ?? plan.anthropicModelId,
  };

  const result = shouldUseFreeLane(request.surface, env)
    ? await generateContentMessages(withModel, env)
    : await callClaude(withModel, env);

  return {
    ...result,
    jynxPrimaryLane: plan.primaryLane,
    jynxReason: plan.reason,
  };
}
