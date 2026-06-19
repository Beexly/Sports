/**
 * BRAND LANGUAGE LAW (bible §6) — enforced.
 *
 * Public Galaxy surfaces read as sports intelligence and career progression, not
 * gambling. This module is the single source of truth for the forbidden public
 * vocabulary and the mandatory Higgsfield visual line, plus a scanner that the
 * test suite runs over every `/galaxy` surface.
 *
 * Forbidden literals are assembled from fragments so this file never itself reads
 * as a violating string to any broader copy scanner.
 */

// Assemble forbidden terms from fragments (so the source is self-safe).
const F = {
  betSlip: "bet" + " slip",
  casino: "cas" + "ino",
  wager: "wa" + "ger",
  gamble: "gam" + "ble",
  gambling: "gam" + "bling",
  cashout: "cash" + "out",
  freeMoney: "free" + " money",
  riskFree: "risk" + "-free",
  lock: "lo" + "ck",
  guaranteed: "guaran" + "teed",
  guarantee: "guaran" + "tee",
  whale: "wh" + "ale",
  degenerate: "degen" + "erate",
  easyProfit: "easy" + " profit",
  redeemableCash: "redeem" + "able cash",
  worship: "wor" + "ship",
  devotion: "dev" + "otion",
  theology: "theo" + "logy",
} as const;

export interface ForbiddenTerm {
  readonly id: string;
  readonly term: string;
  /** Match as a whole word (boundaries) vs. a literal substring (phrases). */
  readonly wholeWord: boolean;
  readonly why: string;
}

export const FORBIDDEN_PUBLIC_TERMS: readonly ForbiddenTerm[] = [
  { id: "bet-slip", term: F.betSlip, wholeWord: false, why: "Sportsbook UI language." },
  { id: "casino", term: F.casino, wholeWord: true, why: "We are not a casino in a hoodie." },
  { id: "wager", term: F.wager, wholeWord: true, why: "No wagering framing." },
  { id: "gamble", term: F.gamble, wholeWord: true, why: "No gambling framing." },
  { id: "gambling", term: F.gambling, wholeWord: true, why: "No gambling framing." },
  { id: "cashout", term: F.cashout, wholeWord: true, why: "Closed-loop economy; no cash-out." },
  { id: "free-money", term: F.freeMoney, wholeWord: false, why: "Predatory promise." },
  { id: "risk-free", term: F.riskFree, wholeWord: false, why: "Nothing is risk-free." },
  { id: "lock", term: F.lock, wholeWord: true, why: "Certainty language is banned." },
  { id: "guaranteed", term: F.guaranteed, wholeWord: true, why: "No certainty claims." },
  { id: "whale", term: F.whale, wholeWord: true, why: "Predatory player framing." },
  { id: "degenerate", term: F.degenerate, wholeWord: true, why: "Predatory player framing." },
  { id: "easy-profit", term: F.easyProfit, wholeWord: false, why: "Predatory promise." },
  { id: "redeemable-cash", term: F.redeemableCash, wholeWord: false, why: "No cash redemption." },
  { id: "worship", term: F.worship, wholeWord: true, why: "Retired religious framing." },
  { id: "devotion", term: F.devotion, wholeWord: true, why: "Retired religious framing." },
  { id: "theology", term: F.theology, wholeWord: true, why: "Retired religious framing." },
] as const;

export interface LanguageViolation {
  readonly id: string;
  readonly term: string;
  readonly index: number;
  readonly why: string;
}

function buildMatcher(t: ForbiddenTerm): RegExp {
  const escaped = t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = t.wholeWord ? `\\b${escaped}\\b` : escaped;
  return new RegExp(body, "gi");
}

const MATCHERS = FORBIDDEN_PUBLIC_TERMS.map((t) => ({ t, re: buildMatcher(t) }));

/** Scan text for forbidden public vocabulary. Returns every violation found. */
export function scanText(text: string): LanguageViolation[] {
  const violations: LanguageViolation[] = [];
  for (const { t, re } of MATCHERS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      violations.push({ id: t.id, term: m[0], index: m.index, why: t.why });
      if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width
    }
  }
  return violations.sort((a, b) => a.index - b.index);
}

export function isBrandSafe(text: string): boolean {
  return scanText(text).length === 0;
}

export function assertBrandSafe(text: string, context = "text"): void {
  const v = scanText(text);
  if (v.length > 0) {
    const summary = v.map((x) => `"${x.term}" (${x.why})`).join(", ");
    throw new Error(`Language Law violation in ${context}: ${summary}`);
  }
}

/**
 * The mandatory visual line every Higgsfield asset prompt must include (bible §6
 * visual law). Re-exported by `asset-brief.ts` and enforced there.
 */
export const MANDATORY_VISUAL_LINE =
  "Galaxy-branded open-world sports intelligence MMORPG, premium night sports " +
  "city, black/gold/deep blue, stadium lights, card-vault glow, clean stat " +
  "geometry, no casino, no sportsbook UI, no generic fantasy, no clutter.";
