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

import { normalizeForComplianceScan } from "./normalize";

export type RuleSeverity = "block" | "warn" | "info";
export type RuleLayer = 1 | 2 | 3 | 4;

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
 * LAYER 4 — Payments-processor underwriting vocabulary.
 *
 * Warn-only scan for gambling/betting-coded copy on paid-product surfaces
 * (`/pricing`, `/clv`, `/methodology`, `/dashboard`) that a processor
 * underwriter could read as sports-betting risk. NEVER `block` — this
 * layer must not change Studio / Journal / waitlist / bot-outbox gates.
 *
 * Opt-in via `PAYMENTS_SURFACE` (see TEMPLATE_SPECIFIC_RULES) or
 * `scanPaymentsSurfaceCopy`. Not part of `ALL_RULES`.
 */
export const LAYER_4_PAYMENTS_UNDERWRITING: ComplianceRule[] = [
  {
    id: "L4-GAMBLING-OPERATOR",
    layer: 4,
    severity: "warn",
    pattern: /\b(gambling|gamblers?|gambles?|casinos?|sportsbooks?|bookmakers?|bookies?)\b/i,
    message:
      "Payments underwriting: gambling-operator vocabulary. Processors treat casino / sportsbook / gambling copy as high-risk MCC signal.",
    suggestion:
      "Describe the product as a scored decision board or subscription research tool, not a gambling venue.",
  },
  {
    id: "L4-WAGERING",
    layer: 4,
    severity: "warn",
    pattern: /\bwager(?:s|ed|ing)?\b/i,
    message:
      "Payments underwriting: 'wager' / 'wagering' is processor-coded gambling language.",
    suggestion: "Prefer 'paper contest', 'no prizes', or 'subscription' framing.",
  },
  {
    id: "L4-SPORTS-BETTING",
    layer: 4,
    severity: "warn",
    pattern: /\bsports[\s-]?betting\b/i,
    message:
      "Payments underwriting: 'sports betting' is a restricted-category phrase for card networks.",
    suggestion: "Use 'sports decisioning' or name the specific surface (board, ledger, CLV).",
  },
  {
    id: "L4-BETTING-AS-PRODUCT",
    layer: 4,
    severity: "warn",
    pattern: /\bbetting\b/i,
    message:
      "Payments underwriting: standalone 'betting' on a paid surface reads as a betting product.",
    suggestion: "Name the artifact (factor trail, line movement, board) without 'betting' as the category.",
  },
  {
    id: "L4-BET-VOCAB",
    layer: 4,
    severity: "warn",
    pattern: /\b(bets?|bettors?)\b/i,
    message:
      "Payments underwriting: 'bet' / 'bets' / 'bettor' is wagering vocabulary, even in tracker or No-Bet copy.",
    suggestion: "Prefer 'pick', 'position', 'reader', or 'logged close' depending on the surface.",
  },
  {
    id: "L4-STAKE-BANKROLL",
    layer: 4,
    severity: "warn",
    pattern: /\b(bankroll|staking)\b/i,
    message:
      "Payments underwriting: bankroll / staking language implies wager sizing.",
    suggestion: "If the tool is educational, call it a 'sizing calculator' without bankroll framing.",
  },
  {
    id: "L4-MONEYLINE-MARKET",
    layer: 4,
    severity: "warn",
    pattern: /\b(moneylines?|over\/under|o\/u|bet slips?|unit bets?)\b/i,
    message:
      "Payments underwriting: sportsbook market vocabulary (moneyline, O/U, bet slip).",
    suggestion: "On paid marketing surfaces, prefer 'price', 'total', or 'ticket' without sportsbook jargon.",
  },
  {
    id: "L4-PARLAY",
    layer: 4,
    severity: "warn",
    pattern: /\bparlays?\b/i,
    message:
      "Payments underwriting: 'parlay' is a wagering product name, including branded uses like Parlay MRI.",
    suggestion: "Keep the product, but flag the word on processor-facing copy reviews.",
  },
  {
    id: "L4-PLACE-BET-CTA",
    layer: 4,
    severity: "warn",
    pattern: /\b(place (?:a |your )?bets?|click to bet|bet now|deposit to (?:bet|wager)|odds[\s-]?making)\b/i,
    message:
      "Payments underwriting: bet-placement or odds-making CTA. Reads as facilitating wagers.",
    suggestion: "Never invite a deposit-to-bet or place-a-bet action on these surfaces.",
  },
];

/** Alias used by the payments-surface scanner and its tests. */
export const PAYMENTS_SURFACE_RULES: ComplianceRule[] = LAYER_4_PAYMENTS_UNDERWRITING;

/**
 * Combined ruleset — layers 1–3 only.
 *
 * Layer 4 is warn-only and opt-in so existing Studio / Journal / waitlist /
 * bot-outbox scans keep the same block-gate behavior.
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

  // Paid-product surfaces: extra underwriting vocabulary, warn-only.
  PAYMENTS_SURFACE: LAYER_4_PAYMENTS_UNDERWRITING,
};

/**
 * Helper: get all applicable rules for a given template kind.
 */
export function getRulesForTemplate(templateKind: string): ComplianceRule[] {
  return [...ALL_RULES, ...(TEMPLATE_SPECIFIC_RULES[templateKind] ?? [])];
}

function statelessPattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace("g", ""));
}

export interface PaymentsSurfaceFlag {
  readonly id: string;
  readonly layer: 4;
  readonly severity: "warn";
  readonly match: string;
  readonly message: string;
  readonly suggestion: string | null;
}

/**
 * Scan copy with Layer 4 only. Hits are always `warn`; this function never
 * applies layers 1–3 and never returns `block`.
 */
export function scanPaymentsSurfaceCopy(text: string): PaymentsSurfaceFlag[] {
  const flags: PaymentsSurfaceFlag[] = [];
  const scanTarget = normalizeForComplianceScan(text);
  for (const rule of LAYER_4_PAYMENTS_UNDERWRITING) {
    // Layer 4 is warn-only by contract. Skip anything that is not `warn`
    // so a mislabeled rule can never become a publish/checkout block.
    if (rule.severity !== "warn") continue;
    const match = statelessPattern(rule.pattern).exec(scanTarget);
    if (!match) continue;
    flags.push({
      id: rule.id,
      layer: 4,
      severity: "warn",
      match: match[0],
      message: rule.message,
      suggestion: rule.suggestion,
    });
  }
  return flags;
}
