/**
 * Compliance Scanner — Rule Definitions
 *
 * The banned vocabulary list + competitive-claim patterns + voice violations
 * as data. Consumed by every Phase 3-4 surface:
 *
 *   - Galaxy Studio (per-asset)
 *   - Twitter bot (pre-post)
 *   - Discord bot (pre-post)
 *   - Model Court (per-answer)
 *   - Model Journal (pre-publish)
 *   - Pre-mortem pipeline (per-render)
 *
 * Source of truth for the banned vocabulary is `docs/positioning.md` and
 * master plan Part 3. Editing this file changes the platform's voice rules.
 * Add to the decision log when modifying.
 */

export type RuleSeverity = "block" | "warn" | "info";
export type RuleLayer = 1 | 2 | 3;

export interface ComplianceRule {
  id: string;
  layer: RuleLayer;
  severity: RuleSeverity;
  pattern: RegExp;
  message: string;
  suggestion: string | null;
}

/**
 * LAYER 1 — Platform-wide banned vocabulary.
 *
 * These rules apply to EVERY surface that produces user-facing content. No
 * exceptions, no overrides except by decision-log entry.
 */
export const LAYER_1_PLATFORM_BANS: ComplianceRule[] = [
  {
    id: "L1-AI-POWERED",
    layer: 1,
    severity: "block",
    pattern: /\b(AI[\s-]powered|powered by AI|AI[\s-]driven|AI[\s-]enabled)\b/i,
    message: "Banned: 'AI-powered' / 'AI-driven' framing. The platform's position is 'We're not AI. We're math you can read.' (DEC-001/002)",
    suggestion: "Use 'deterministic scoring' or 'factor model' instead.",
  },
  {
    id: "L1-MULTIMODAL-INTELLIGENCE",
    layer: 1,
    severity: "block",
    pattern: /\b(multimodal intelligence|AI agents|machine learning models?)\b/i,
    message: "Banned: AI-category marketing language.",
    suggestion: "Describe the actual mechanism (deterministic scoring, factor breakdown) instead.",
  },
  {
    id: "L1-MISSION-CONTROL",
    layer: 1,
    severity: "block",
    pattern: /\bmission control\b/i,
    message: "Banned: 'Mission Control' eyebrow. Generic.",
    suggestion: "Use 'Today's Board' or remove the eyebrow.",
  },
  {
    id: "L1-ECOSYSTEM",
    layer: 1,
    severity: "block",
    pattern: /\b(your |the )(?:edge |betting |sports[\s-]betting )?ecosystem\b/i,
    message: "Banned: 'ecosystem' as marketing language. Generic SaaS jargon.",
    suggestion: "Be specific about what you mean (the platform, the engine, the slate, etc.).",
  },
  {
    id: "L1-TRANSFORM-UNLOCK-LEVEL-UP",
    layer: 1,
    severity: "block",
    pattern: /\b(transform your|unlock your|level up your|your edge starts here)\b/i,
    message: "Banned: pitch-deck cosplay verbs.",
    suggestion: "Describe the actual action without verbing the user's interior state.",
  },
  {
    id: "L1-FIRST-PERSON-ALGORITHM",
    layer: 1,
    severity: "block",
    pattern: /\b(I see|I think|I stay quiet|I wait|I hunt|in my opinion)\b/,
    message: "Banned: first-person algorithm voice.",
    suggestion: "Use 'the model' or 'the engine' as the subject instead.",
  },
  {
    id: "L1-BOARD-PERSONIFICATION",
    layer: 1,
    severity: "block",
    pattern: /\b(the board stays|the board earns|the board waits|a signal is allowed|the system thinks|the engine sees|the system learns|the system hunts)\b/i,
    message: "Banned: personification of board / algorithm / engine.",
    suggestion: "Use active third-person ('We don't post when...', 'The model gates when...').",
  },
  {
    id: "L1-PICK-CARD",
    layer: 1,
    severity: "block",
    pattern: /\b(pick card|VIP card|sunday vip|sunday card)\b/i,
    message: "Banned: 'card' framing for picks. Tout-coded.",
    suggestion: "Use 'pick', 'play', 'slip', or 'ticket'.",
  },
];

/**
 * LAYER 2 — Unsupported claims and guarantees.
 *
 * Catches certainty language, guarantees, win-rate claims, EV/Kelly leakage
 * into public-facing content.
 */
export const LAYER_2_UNSUPPORTED_CLAIMS: ComplianceRule[] = [
  {
    id: "L2-GUARANTEE",
    layer: 2,
    severity: "block",
    pattern: /\b(guarantee|guaranteed|guaranteed to|sure thing|cant lose|cannot lose|must profit)\b/i,
    message: "Banned: guarantee or certainty language about outcomes.",
    suggestion: "Use 'the model reads' or 'the factor breakdown shows' instead of asserting outcomes.",
  },
  {
    id: "L2-DEFINITELY-WILL",
    layer: 2,
    severity: "block",
    pattern: /\b(definitely will|certain to|always wins|never loses|100% (of the time|sure))\b/i,
    message: "Banned: certainty language about outcomes.",
    suggestion: "Speak in terms of factor reads and probabilities, not certainty.",
  },
  {
    id: "L2-PUBLIC-WIN-RATE",
    layer: 2,
    severity: "block",
    pattern: /\b(we hit \d{2,}%|we win \d{2,}%|our win rate is|\d{2,}% accuracy|\d{2,}% hit rate)\b/i,
    message: "Banned: aggregate win-rate claim. The platform does not publish a marketing win rate.",
    suggestion: "Point users to /ledger and /board for the data instead.",
  },
  {
    id: "L2-PUBLIC-EV",
    layer: 2,
    severity: "block",
    pattern: /\b(expected value of |EV of |[+-]\d+(\.\d+)? units? per|EV per pick|expected value per pick)\b/i,
    message: "Banned: public EV claim. EV depends on user-specific inputs; the platform does not publish public EV.",
    suggestion: "If discussing EV, route the user to the Kelly sizer in the Edge Lab.",
  },
  {
    id: "L2-PUBLIC-KELLY",
    layer: 2,
    severity: "block",
    pattern: /\b(Kelly stake of|stake \d+(\.\d+)?% of bankroll|bet \d+(\.\d+)? units?)\b/i,
    message: "Banned: public Kelly / stake recommendation.",
    suggestion: "Direct users to the Edge Lab Kelly sizer for their own bankroll calc.",
  },
];

/**
 * LAYER 3 — Tout-coded language and engagement bait.
 */
export const LAYER_3_TOUT_AND_BAIT: ComplianceRule[] = [
  {
    id: "L3-LOCK-HAMMER",
    layer: 3,
    severity: "block",
    pattern: /\b(LOCK|HAMMER|SMASH|FADE ME|TAIL ME|MUST BET|MUST BACK)\b/,
    message: "Banned: tout-coded all-caps recommendation language.",
    suggestion: "State the factor read and let the reader decide.",
  },
  {
    id: "L3-ENGAGEMENT-BAIT",
    layer: 3,
    severity: "block",
    pattern: /\b(who do you have|comment your locks|RT if you|drop your picks below|tag a friend who|smash the like)\b/i,
    message: "Banned: engagement-bait CTA.",
    suggestion: "Drive engagement through the data, not through threadbait questions.",
  },
  {
    id: "L3-EMOJI-LADDER",
    layer: 3,
    severity: "block",
    pattern: /[🚨🔥💰💎🚀💯🏆]{2,}|🚨.*🔥|🔥.*🚨/u,
    message: "Banned: hype emoji ladder.",
    suggestion: "Galaxy uses ✅ / ❌ / ⚖️ for settlement outcomes only. No hype emojis.",
  },
  {
    id: "L3-COMPETITOR-COMPARE",
    layer: 3,
    severity: "block",
    pattern: /\b(better than other (services|operators|touts)|sharper than|outperform.+competitors?|unlike other (services|sites|apps))\b/i,
    message: "Banned: competitor comparison.",
    suggestion: "Publish your own data; don't claim relative superiority.",
  },
  {
    id: "L3-BEST-BOOK",
    layer: 3,
    severity: "block",
    pattern: /\b(best book|sharpest lines?|cheapest juice|lowest hold|fastest payouts?)\b/i,
    message: "Banned: comparative sportsbook claim. May conflict with sponsor claims.",
    suggestion: "Refer to 'the book' or the specific sportsbook by name without superlative.",
  },
];

/**
 * Combined ruleset — all three layers.
 */
export const ALL_RULES: ComplianceRule[] = [
  ...LAYER_1_PLATFORM_BANS,
  ...LAYER_2_UNSUPPORTED_CLAIMS,
  ...LAYER_3_TOUT_AND_BAIT,
];

/**
 * Per-surface overrides. Templates can opt INTO additional rules.
 * Templates can NOT opt OUT of base rules.
 */
export const TEMPLATE_SPECIFIC_RULES: Record<string, ComplianceRule[]> = {
  // Sponsor-safe blurb adds the explicit "no competitive claims about books"
  // rule even though it appears in Layer 3 — sponsor-safe enforces it as a
  // hard block regardless of context.
  SPONSOR_SAFE_BLURB: [],

  // Fan explainer adds extra rules that block ALL betting vocabulary.
  FAN_EXPLAINER: [
    {
      id: "FE-BETTING-VOCAB",
      layer: 3,
      severity: "block",
      pattern: /\b(spread|moneyline|odds|line|over\/under|o\/u|edge|pick|cover|push|juice|vig)\b/i,
      message: "Fan explainer forbids any betting vocabulary. The asset is a sporting-event preview.",
      suggestion: "Re-frame as game preview without betting context.",
    },
  ],

  // Betting education adds rules blocking recommendation language.
  BETTING_EDUCATION: [
    {
      id: "BE-RECOMMENDATION",
      layer: 3,
      severity: "block",
      pattern: /\b(should bet|recommend|take this side|hammer this|fade this|smash this)\b/i,
      message: "Betting education explains the read; it does not recommend the bet.",
      suggestion: "Use 'the model reads X' or 'the factor breakdown shows Y' without prescription.",
    },
  ],

  MODEL_JOURNAL: [
    {
      id: "MJ-FIRST-PERSON-CONFIDENCE",
      layer: 3,
      severity: "block",
      pattern: /\b(we believe|we think|we are confident|we're confident)\b/i,
      message: "Model Journal blocks first-person confidence framing.",
      suggestion: "State what the settled data showed, then cite the evidence.",
    },
  ],
};

/**
 * Helper: get all applicable rules for a given template kind.
 */
export function getRulesForTemplate(templateKind: string): ComplianceRule[] {
  return [...ALL_RULES, ...(TEMPLATE_SPECIFIC_RULES[templateKind] ?? [])];
}
