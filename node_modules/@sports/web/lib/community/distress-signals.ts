/**
 * Distress signal detection — pure detection law for room messages.
 *
 * Policy source: docs/legal/COMMUNITY_MODERATION_POLICY.md §Responsible-play
 *
 * detectDistressSignals(text) → typed signals
 * routeDistress(signal)       → required response: nudge + resources, NEVER upsell
 *
 * The law: neverUpsell: true is a literal typed field — encode it the same way
 * externalActionsAllowed: false is done in lib/jarvis/agent-council.ts.
 * No offer, upgrade prompt, or subscription mention may appear in a distress
 * response. This is not configurable.
 *
 * False-positive discipline:
 *   - All patterns are word-boundary anchored to avoid matching inside longer
 *     words (e.g. "double-digit win", "doubleheader", "recovery room").
 *   - Normal betting talk is not a signal. The patterns target phrases that
 *     describe a compulsive emotional state, not betting activity in general.
 */

// ── Signal kinds ──────────────────────────────────────────────────────────────

export type DistressKind = "CHASING" | "PANIC" | "RENT_MONEY";

export interface DistressSignal {
  readonly kind: DistressKind;
  /** The matched phrase or pattern label (for audit/logging, not shown to user). */
  readonly matchedPattern: string;
  /** Normalised lowercase source text (for audit). */
  readonly sourceText: string;
}

// ── Response type ─────────────────────────────────────────────────────────────

export interface DistressResource {
  readonly name: string;
  readonly href: string;
  readonly body: string;
}

/**
 * The required distress response shape.
 *
 * neverUpsell: true is a LITERAL type, not a boolean flag you can flip.
 * The platform never uses a distress event to market tiers.
 *
 * Mirrors the externalActionsAllowed: false pattern from lib/jarvis/agent-council.ts.
 */
export interface DistressResponse {
  readonly kind: "support_nudge";
  readonly neverUpsell: true;
  readonly message: string;
  readonly resources: readonly DistressResource[];
}

// ── Resources — reused from app/responsible-play/page.tsx ────────────────────
// Single source of truth kept in the page; mirrored here for the detection
// pipeline. If a resource changes, update both places and the tests will catch
// any drift via the "non-empty and canonical" assertions.

export const DISTRESS_RESOURCES: readonly DistressResource[] = [
  {
    name: "National Council on Problem Gambling",
    href: "https://www.ncpgambling.org/",
    body: "Free confidential helpline, chat, and text: 24/7, all 50 US states.",
  },
  {
    name: "GamTalk",
    href: "https://www.gamtalk.org/",
    body: "Anonymous peer-support community for anyone affected by gambling.",
  },
  {
    name: "Gamblers Anonymous",
    href: "https://www.gamblersanonymous.org/",
    body: "In-person and online support groups based on a twelve-step program.",
  },
  {
    name: "Self-exclusion (state-by-state)",
    href: "https://www.ncpgambling.org/state-resources/",
    body: "Many US states maintain self-exclusion lists you can join to block yourself from sportsbooks for a fixed term.",
  },
] as const;

// Helpline number from lib/brand.ts HELPLINE — included inline here so this
// module stays import-free from brand (pure, testable without Next.js env).
const HELPLINE_NUMBER = "1-800-GAMBLER";
const HELPLINE_HREF = "https://www.ncpgambling.org/help-treatment/";

// ── Pattern table ─────────────────────────────────────────────────────────────
//
// Each entry:
//   kind     – which distress kind this pattern signals
//   pattern  – case-insensitive regex, word-boundary anchored where needed
//   label    – human-readable label for audit logs
//
// FALSE-POSITIVE DISCIPLINE:
//   CHASING: "double up" matches as a phrase (not "double-digit", "doubleheader").
//            "win it back" / "make it back" target the chasing idiom specifically.
//            "need to win" catches the emotional need framing.
//   PANIC:   targets catastrophe language ("i'm done", "wiped out", "destroyed my").
//   RENT_MONEY: "rent money", "can't afford", "bill money", "mortgage" in betting
//              context, "borrowed money", "last dollar", "only money I have".

interface PatternEntry {
  readonly kind: DistressKind;
  readonly pattern: RegExp;
  readonly label: string;
}

const PATTERNS: readonly PatternEntry[] = [
  // ── CHASING signals ──────────────────────────────────────────────────────
  {
    kind: "CHASING",
    pattern: /\bdouble\s+up\b/i,
    label: "double-up",
  },
  {
    // "make it back" but NOT "make it back to back" or "make it back-to-back" (back-to-back idiom)
    kind: "CHASING",
    pattern: /\bmake\s+it\s+back(?![\s-]to[\s-]back)\b/i,
    label: "make-it-back",
  },
  {
    // "win it back" but NOT "win it back-to-back" or "win it back to back"
    kind: "CHASING",
    pattern: /\bwin\s+it\s+back(?![\s-]to[\s-]back)\b/i,
    label: "win-it-back",
  },
  {
    kind: "CHASING",
    pattern: /\bget\s+it\s+back\b/i,
    label: "get-it-back",
  },
  {
    kind: "CHASING",
    pattern: /\bchasing\s+(my\s+)?(losses|money)\b/i,
    label: "chasing-losses",
  },
  {
    kind: "CHASING",
    pattern: /\bneed\s+to\s+win\s+(it|this|one|tonight|today|back)\b/i,
    label: "need-to-win",
  },
  {
    kind: "CHASING",
    pattern: /\brecoup\b/i,
    label: "recoup",
  },
  {
    kind: "CHASING",
    pattern: /\bchase\s+(the\s+)?(loss|losses)\b/i,
    label: "chase-loss",
  },
  {
    kind: "CHASING",
    pattern: /\bone\s+more\s+(bet|game|pick)\s+(and\s+)?(i('ll|\s+will)|to)\s+(be\s+)?(even|break\s+even|back)\b/i,
    label: "one-more-to-break-even",
  },

  // ── PANIC signals ────────────────────────────────────────────────────────
  {
    kind: "PANIC",
    pattern: /\bi('m|\s+am)\s+done\b/i,
    label: "im-done",
  },
  {
    kind: "PANIC",
    pattern: /\bwiped\s+out\b/i,
    label: "wiped-out",
  },
  {
    kind: "PANIC",
    pattern: /\bdestroyed\s+my\s+(bankroll|account|stack)\b/i,
    label: "destroyed-bankroll",
  },
  {
    kind: "PANIC",
    pattern: /\bcan('t|\s+not)\s+stop\b/i,
    label: "cant-stop",
  },
  {
    kind: "PANIC",
    pattern: /\bout\s+of\s+control\b/i,
    label: "out-of-control",
  },
  {
    kind: "PANIC",
    pattern: /\bspirallin(g)?\b/i,
    label: "spiraling",
  },
  {
    kind: "PANIC",
    pattern: /\bi\s+can't\s+(handle|take)\s+(this|it|anymore)\b/i,
    label: "cant-handle",
  },
  {
    kind: "PANIC",
    pattern: /\blosing\s+my\s+mind\b/i,
    label: "losing-my-mind",
  },

  // ── RENT_MONEY / funds-desperation signals ───────────────────────────────
  {
    kind: "RENT_MONEY",
    pattern: /\brent\s+money\b/i,
    label: "rent-money",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bbill\s+money\b/i,
    label: "bill-money",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bmortgage\s+money\b/i,
    label: "mortgage-money",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bborrowed\s+money\s+(to\s+)?(bet|gamble|play)\b/i,
    label: "borrowed-to-bet",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\blast\s+(dollar|buck|dime|cent)\b/i,
    label: "last-dollar",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bonly\s+money\s+i\s+have\b/i,
    label: "only-money-i-have",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bcan'?t\s+afford\s+(to\s+)?(lose|this)\b/i,
    label: "cant-afford-to-lose",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bgrocery\s+money\b/i,
    label: "grocery-money",
  },
  {
    kind: "RENT_MONEY",
    pattern: /\bused\s+(my\s+)?(savings|emergency\s+fund)\b/i,
    label: "used-savings",
  },
] as const;

// ── Detection ─────────────────────────────────────────────────────────────────

/**
 * Scan a room message for distress signals.
 *
 * Returns an array of matched signals (may be empty).
 * Multiple signals may match a single message (e.g. CHASING + RENT_MONEY).
 *
 * No side effects — pure function.
 */
export function detectDistressSignals(text: string): readonly DistressSignal[] {
  const normalised = text.toLowerCase();
  const signals: DistressSignal[] = [];
  const seenKinds = new Set<DistressKind>();

  for (const entry of PATTERNS) {
    if (entry.pattern.test(text)) {
      // Deduplicate to one signal per kind — the first match is recorded.
      if (!seenKinds.has(entry.kind)) {
        seenKinds.add(entry.kind);
        signals.push({
          kind: entry.kind,
          matchedPattern: entry.label,
          sourceText: normalised,
        });
      }
    }
  }

  return signals;
}

// ── Routing ───────────────────────────────────────────────────────────────────

const KIND_MESSAGE: Record<DistressKind, string> = {
  CHASING:
    "Hey, stepping back can be the smartest play. If this one's feeling urgent, that's worth noticing. Resources below if you want them.",
  PANIC:
    "This sounds tough. Pausing is a real option. There's no shame in walking away. Support is available whenever you want it.",
  RENT_MONEY:
    "A quick note: if these funds are needed elsewhere, please step back. Free, confidential support is available 24/7.",
};

/**
 * Route a detected distress signal to the required response.
 *
 * The response is a support nudge. It NEVER offers products, upgrades,
 * promotions, or subscription tiers. neverUpsell: true is literal.
 *
 * The platform never uses a distress event to market higher tiers.
 * This is encoded as a literal type, not a runtime flag — consistent with
 * the externalActionsAllowed: false pattern in lib/jarvis/agent-council.ts.
 */
export function routeDistress(signal: DistressSignal): DistressResponse {
  return {
    kind: "support_nudge",
    neverUpsell: true,
    message: `${KIND_MESSAGE[signal.kind]} Problem Gambling Helpline: ${HELPLINE_NUMBER} (${HELPLINE_HREF})`,
    resources: DISTRESS_RESOURCES,
  };
}
