/**
 * Agent Actions — the canonical list of actions an AI agent (autonomous
 * worker, MCP-driven assistant, content pipeline) is allowed to perform.
 *
 * Anything not on the allow-list is implicitly forbidden. Adding an
 * action requires owner review.
 */

export type AgentAction =
  | "read-public-doc"
  | "read-server-config"
  | "draft-content"
  | "score-internal-rubric"
  | "annotate-evidence"
  | "summarize-public-news"
  | "explain-methodology"
  | "answer-faq"
  | "open-academy-module-suggestion"
  | "propose-no-bet-rationale";

export const ALLOWED_AGENT_ACTIONS: ReadonlySet<AgentAction> = new Set<AgentAction>([
  "read-public-doc",
  "read-server-config",
  "draft-content",
  "score-internal-rubric",
  "annotate-evidence",
  "summarize-public-news",
  "explain-methodology",
  "answer-faq",
  "open-academy-module-suggestion",
  "propose-no-bet-rationale",
]);

/** Actions that no agent may ever perform, ever. */
export const HARD_FORBIDDEN_ACTIONS: ReadonlySet<string> = new Set([
  "place-bet",
  "transfer-funds",
  "send-external-email",
  "send-external-sms",
  "post-to-social",
  "modify-pricing",
  "publish-without-gate",
  "fetch-from-arbitrary-url",
  "execute-arbitrary-code",
  "exfiltrate-secrets",
  "modify-trust-gate",
  "modify-no-fake-percentages-test",
  "modify-guardrails",
]);

export function isAllowedAction(name: string): boolean {
  return ALLOWED_AGENT_ACTIONS.has(name as AgentAction);
}

export function isHardForbiddenAction(name: string): boolean {
  return HARD_FORBIDDEN_ACTIONS.has(name);
}

/** Result of an action authorization check. */
export interface ActionAuth {
  readonly allowed: boolean;
  readonly reason: "allow-list" | "hard-forbidden" | "not-on-allow-list";
}

export function authorizeAction(name: string): ActionAuth {
  if (isHardForbiddenAction(name)) return { allowed: false, reason: "hard-forbidden" };
  if (isAllowedAction(name)) return { allowed: true, reason: "allow-list" };
  return { allowed: false, reason: "not-on-allow-list" };
}
