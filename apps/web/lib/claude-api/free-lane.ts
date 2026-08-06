/**
 * Content free-lane dispatcher (Cerebras).
 * Policy: free-lane-policy.ts. Cloud path: callClaude (Jynx multi-cloud).
 */
import { callClaude } from "./provider-dispatch";
import type { ClaudeMessagesRequest, ClaudeMessagesResult } from "./messages";
import { callCerebrasMessages, CerebrasMessagesError } from "./providers/cerebras";
import type { ClaudeSurface } from "./model-router";
import {
  FREE_LANE_SURFACES,
  isFreeLaneEnabled,
  shouldUseFreeLane,
} from "./free-lane-policy";

export { FREE_LANE_SURFACES, isFreeLaneEnabled, shouldUseFreeLane };

type Env = Record<string, string | undefined>;

export interface ContentMessagesRequest extends ClaudeMessagesRequest {
  readonly cerebrasModel?: string;
}

export async function generateContentMessages(
  request: ContentMessagesRequest,
  env: Env = process.env
): Promise<ClaudeMessagesResult> {
  const cerebrasKey = env["CEREBRAS_API_KEY"]?.trim();
  if (cerebrasKey && shouldUseFreeLane(request.surface, env)) {
    try {
      return await callCerebrasMessages({
        apiKey: cerebrasKey,
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens,
        model: request.cerebrasModel,
        temperature: request.temperature,
        fetchImpl: request.fetchImpl,
      });
    } catch (error) {
      if (!(error instanceof CerebrasMessagesError)) throw error;
    }
  }
  return callClaude(request, env);
}

// silence unused type export consumers
export type { ClaudeSurface };
