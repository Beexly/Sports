/**
 * Host-side budget from deepseek-ai/deepseek-recipe.
 *
 * The Rust library's ConversationRequest::resolve_max_tokens checks the
 * prompt against the context limit and fills a default when the caller
 * sets none: 8192 plain, 65536 thinking, 131072 thinking with max effort.
 *
 * GSE does not serve DeepSeek-V4. Those defaults would raise cost. The
 * part that cuts cost is the check: never send a prompt that cannot fit,
 * and never let an unset cap become the thinking-mode default on a
 * free-tier call.
 */

export const RECIPE_DEFAULT_MAX_TOKENS = {
  plain: 8192,
  thinking: 65536,
  thinkingMax: 131072,
} as const;

export const BGE_M3_CONTEXT_TOKENS = 8192;

/** Conservative chars-per-token bound. Over-counts tokens, so the cap sends less, not more. */
export const CHARS_PER_TOKEN_BOUND = 2;

export function clampPromptToContext(
  text: string,
  contextTokens: number,
  charsPerToken: number = CHARS_PER_TOKEN_BOUND,
): { text: string; truncated: boolean; charCap: number } {
  const charCap = Math.max(0, Math.floor(contextTokens * charsPerToken));
  if (text.length <= charCap) return { text, truncated: false, charCap };
  return { text: text.slice(0, charCap), truncated: true, charCap };
}

export function resolveMaxTokens(args: {
  promptTokens: number;
  contextLimit: number;
  requested?: number;
  thinking?: boolean;
  effort?: "default" | "max";
  costCeiling?: number;
}): { maxTokens: number; refused: boolean; reason: string } {
  const room = args.contextLimit - args.promptTokens;
  if (!(room > 0) || !Number.isFinite(args.promptTokens) || !Number.isFinite(args.contextLimit)) {
    return { maxTokens: 0, refused: true, reason: "prompt does not fit context" };
  }
  const recipeDefault = args.thinking
    ? args.effort === "max"
      ? RECIPE_DEFAULT_MAX_TOKENS.thinkingMax
      : RECIPE_DEFAULT_MAX_TOKENS.thinking
    : RECIPE_DEFAULT_MAX_TOKENS.plain;
  let chosen = args.requested ?? recipeDefault;
  if (args.costCeiling !== undefined) chosen = Math.min(chosen, args.costCeiling);
  chosen = Math.min(chosen, room);
  if (!(chosen > 0)) return { maxTokens: 0, refused: true, reason: "no room under ceiling" };
  return { maxTokens: Math.floor(chosen), refused: false, reason: "clamped" };
}
