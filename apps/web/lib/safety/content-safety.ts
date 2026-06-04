/**
 * Content Safety — the platform's brand-safety guardrail.
 *
 * A runtime check that keeps everything Galaxy Sports Edge produces or hosts
 * clean and on-policy: Studios scripts, the weekly brief, and (when opened) any
 * community or user-generated text. It categorizes risk and returns a verdict —
 * safe / review / block — so nothing off-brand ships, and nothing borderline
 * ships without a human looking at it.
 *
 * This is the TEXT engine (pure, deterministic). Image/video moderation is an
 * interface here; a real NSFW classifier (e.g. an open_nsfw / nsfwjs model) is
 * wired behind the founder gate, and the default fails CLOSED to human review.
 *
 * The in-code lexicons are compact seeds; production loads maintained lists from
 * config. We deliberately do not enumerate slurs in the repo — the hate category
 * is structural and populated from a maintained source.
 */

export type SafetyCategory = "sexual" | "profanity" | "hate" | "violence" | "self-harm" | "pii" | "overclaim";
export type SafetyVerdict = "safe" | "review" | "block";

/** What each category does to the verdict. */
const CATEGORY_ACTION: Record<SafetyCategory, SafetyVerdict> = {
  sexual: "block",
  hate: "block",
  "self-harm": "review",
  violence: "review",
  profanity: "review",
  pii: "review",
  overclaim: "review",
};

export type SafetyHit = { readonly category: SafetyCategory; readonly match: string; readonly action: SafetyVerdict };
export type SafetyResult = {
  readonly verdict: SafetyVerdict;
  readonly hits: readonly SafetyHit[];
  readonly categories: readonly SafetyCategory[];
};

// Compact seed lexicons (word-boundary, case-insensitive). Extended from config in prod.
const LEXICONS: Partial<Record<SafetyCategory, readonly string[]>> = {
  // clearly-explicit tokens that never appear in legitimate sports copy
  sexual: ["nude", "nudes", "naked", "porn", "pornographic", "xxx", "nsfw", "explicit content", "onlyfans", "sext"],
  profanity: ["fuck", "shit", "bitch", "asshole", "bastard"],
  "self-harm": ["kill myself", "suicide", "self-harm"],
  violence: ["kill him", "shoot him", "beat him to death"],
  // betting overclaims — mirrors the trust registry's spirit at runtime
  overclaim: ["guaranteed", "sure thing", "risk-free", "can't lose", "lock of the day", "free money"],
};

// PII patterns
const PII_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "email", re: /[\w.+-]+@[\w-]+\.[\w.-]+/i },
  { label: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { label: "phone", re: /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/ },
  { label: "card", re: /\b(?:\d[ -]?){15,16}\b/ },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function scanText(text: string): SafetyResult {
  const hits: SafetyHit[] = [];

  for (const [cat, words] of Object.entries(LEXICONS) as [SafetyCategory, readonly string[]][]) {
    for (const w of words) {
      // phrases match literally; single words use word boundaries
      const re = /\s/.test(w) ? new RegExp(escapeRe(w), "i") : new RegExp(`\\b${escapeRe(w)}\\b`, "i");
      if (re.test(text)) hits.push({ category: cat, match: w, action: CATEGORY_ACTION[cat] });
    }
  }

  for (const p of PII_PATTERNS) {
    if (p.re.test(text)) hits.push({ category: "pii", match: p.label, action: CATEGORY_ACTION.pii });
  }

  const verdict: SafetyVerdict = hits.some((h) => h.action === "block")
    ? "block"
    : hits.some((h) => h.action === "review")
      ? "review"
      : "safe";

  const categories = [...new Set(hits.map((h) => h.category))];
  return { verdict, hits, categories };
}

export const isPublishable = (r: SafetyResult): boolean => r.verdict === "safe";

// ─────────────── media moderation interface (founder-gated) ───────────────

export type ImageSafety = { readonly nsfwScore: number; readonly verdict: SafetyVerdict };
export interface ImageClassifier {
  classify(imageRef: string): Promise<ImageSafety>;
}

/**
 * Default classifier: no model configured → FAIL CLOSED to human review. A real
 * NSFW model (open_nsfw / nsfwjs) is injected behind the founder gate in prod.
 */
export const HUMAN_REVIEW_CLASSIFIER: ImageClassifier = {
  async classify() {
    return { nsfwScore: -1, verdict: "review" };
  },
};

export function imageVerdict(score: number, blockAt = 0.7, reviewAt = 0.3): SafetyVerdict {
  if (score < 0) return "review"; // not classified → human review
  if (score >= blockAt) return "block";
  if (score >= reviewAt) return "review";
  return "safe";
}
