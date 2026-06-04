/**
 * Ingested-text safety — untrusted text (Reddit posts, news, scraped pages) flows
 * into the narrative signal and the LLM content lane. Two risks this guards:
 *   1. Prompt injection — text like "ignore previous instructions" trying to hijack
 *      a model that later summarizes it. We neutralize the markers before model use.
 *   2. Rumor laundering — crowd "reportedly / unconfirmed" claims must be DOWN-weighted,
 *      never amplified as fact (the narrative layer reads the credibility tier).
 *
 * Pure, no I/O.
 */

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore (?:the )?(?:previous|above|prior|all) (?:instructions?|prompts?|messages?)/gi,
  /disregard (?:the )?(?:previous|above|prior|system)/gi,
  /\byou are now\b/gi,
  /\bsystem prompt\b/gi,
  /new instructions\s*:/gi,
  /<\/?(?:system|instructions?|prompt)>/gi,
  /^\s*(?:system|assistant|user)\s*:/gim,
];

export interface SanitizationResult {
  readonly sanitized: string;
  readonly injectionFlagged: boolean;
  readonly matchedPatterns: readonly string[];
}

/** Neutralize prompt-injection markers in untrusted text before it reaches a model. */
export function sanitizeForModel(text: string): SanitizationResult {
  const matched: string[] = [];
  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "[redacted]");
      matched.push(pattern.source);
    }
  }
  return { sanitized, injectionFlagged: matched.length > 0, matchedPatterns: matched };
}

export type Credibility = "rumored" | "reported" | "neutral";

const RUMOR_RE = /\b(?:rumou?r(?:ed|s)?|unconfirmed|allegedly|speculation|speculat(?:ed|ing)|sources say)\b/i;
const REPORTED_RE = /\b(?:reported(?:ly)?|according to|per (?:a |the )?report|confirmed)\b/i;

/**
 * Credibility tier of a text item. Rumor markers take precedence (be cautious):
 * "rumored" < "reported" < "neutral" is the trust order the narrative layer uses
 * to weight an item — unverified buzz is a signal, never a stated fact.
 */
export function classifyCredibility(text: string): Credibility {
  if (RUMOR_RE.test(text)) return "rumored";
  if (REPORTED_RE.test(text)) return "reported";
  return "neutral";
}
