/**
 * Cookieless AI-referral classification.
 *
 * The `/llms.txt` + Proof API surface exists so an AI agent can independently
 * verify the record and cite it — this closes the loop on the OTHER side:
 * knowing (in aggregate, never per-person) which AI assistants are actually
 * sending readers here. A single request's Referer header is enough; nothing
 * is stored per-visitor, nothing is a cookie, no identity is attached. Same
 * posture as `provider-gating.ts`'s beacon-only analytics.
 *
 * Pure: takes a referrer string, returns a bucket or null. No I/O.
 */

export type AiReferralSource =
  | "chatgpt"
  | "perplexity"
  | "claude"
  | "gemini"
  | "copilot";

const AI_REFERRER_HOSTS: ReadonlyMap<string, AiReferralSource> = new Map([
  ["chatgpt.com", "chatgpt"],
  ["chat.openai.com", "chatgpt"],
  ["perplexity.ai", "perplexity"],
  ["claude.ai", "claude"],
  ["gemini.google.com", "gemini"],
  ["copilot.microsoft.com", "copilot"],
]);

/**
 * Classify a referrer URL string into an AI-assistant bucket, or null when
 * it isn't one of the known assistants (including no referrer at all, a
 * malformed URL, or an ordinary web referrer). Case-insensitive on host;
 * matches the exact host or any subdomain of it (e.g. "www.perplexity.ai").
 */
export function classifyAiReferrer(referrer: string | null | undefined): AiReferralSource | null {
  if (typeof referrer !== "string" || referrer.trim().length === 0) return null;

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }

  for (const [knownHost, source] of AI_REFERRER_HOSTS) {
    if (host === knownHost || host.endsWith(`.${knownHost}`)) return source;
  }
  return null;
}
