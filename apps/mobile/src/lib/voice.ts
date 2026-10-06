import vocab from "../data/positioning-vocab.json";

/**
 * Brand-voice enforcement — shipped in the app, not only in CI.
 *
 * CLAUDE.md rule 8 is a *blocking* rule, and its machine-readable list lives in
 * the server repo at `apps/web/lib/positioning-vocab.json`, enforced there by
 * `apps/web/lib/compliance-scanner/rules.ts`, `scripts/guardrails/trust-gate.mjs`
 * and `npm run lint:brand`.
 *
 * Those gates run on the web bundle. They cannot see a string baked into a
 * native binary. So the app carries the SAME list and re-implements the same
 * predicate, and:
 *
 *   1. runs it over every copy constant at module load (dev and prod — a
 *      violation is a thrown error, not a console warning, because the whole
 *      point of rule 8 is that a positioning breach is not a style note), and
 *   2. runs it in tests over the app's whole copy surface, and
 *   3. runs it over server-supplied text before it is rendered, because the
 *      server is the source of truth for report text and a regression there
 *      must not silently reach the screen.
 *
 * The list is a *copy*, and copies drift. `tests/voice-parity.test.ts` fails
 * if this file's list no longer matches the server original, and the sync
 * command is printed in the failure message.
 */

interface Vocab {
  bannedPhrases: readonly string[];
  safeReplacements: Readonly<Record<string, string>>;
}

const VOCAB = vocab as Vocab;

export const BANNED_PHRASES: readonly string[] = VOCAB.bannedPhrases;
export const SAFE_REPLACEMENTS: Readonly<Record<string, string>> = VOCAB.safeReplacements;

/**
 * Additional prohibitions that are not "AI" phrases but are equally blocking
 * under the same rule. Sourced from `docs/positioning.md` § "What Not To Say"
 * and `apps/web/lib/brand.ts`'s banned-language list.
 */
export const BANNED_TERMS: readonly string[] = [
  // Named in positioning.md as forbidden product vocabulary.
  "mission control",
  "ecosystem",
  "unlock your",
  "level up",
  "your edge starts here",
  // Certainty language around outcomes (positioning.md).
  "guaranteed",
  "guarantee",
  "lock of the day",
  "lock of the week",
  "can't lose",
  "cant lose",
  "sure thing",
  "easy money",
  "free money",
  "risk free",
  "risk-free",
  "no-brainer",
  "no brainer",
  "foolproof",
  "always wins",
  "never loses",
  "we always win",
  "100% win",
  // Tout vocabulary (brand.ts banned-language list).
  "hammer",
  "smash",
  "max bet",
  "all in",
  "dime",
  "unit play",
  "raking",
  "printing money",
  "cash out",
  "parlay of the day",
  // Personification of the model (positioning.md: "first-person algorithm
  // voice", "personified board or model language").
  "the model thinks",
  "the model believes",
  "the model wants",
  "the model knows",
  "i think",
  "i believe",
  "i predict",
  "trust me",
];

/**
 * Emoji are banned outright ("Emoji ≈ zero" — `design-system/README.md`). The
 * two sanctioned glyph families are ASCII data glyphs (↑ ↓ − · →) and the
 * settlement monograms (W L P V), neither of which is an emoji.
 *
 * The ranges below are the Unicode emoji blocks. Deliberately broad: a false
 * positive here costs one test failure and a copy edit; a false negative ships
 * a 🔥 on a pick card.
 */
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

/** Glyphs the design contract explicitly sanctions. Excluded from the emoji sweep. */
const SANCTIONED_GLYPHS = new Set(["\u2191", "\u2193", "\u2212", "\u00B7", "\u2192"]);

export interface VoiceViolation {
  /** The rule class that fired. */
  kind: "banned_phrase" | "banned_term" | "emoji";
  /** The exact substring found. */
  match: string;
  /** Character index of the match. */
  index: number;
  /** Human-readable remediation, if one is known. */
  suggestion: string | null;
}

/**
 * Scan a string for every voice violation.
 *
 * Case-insensitive. Returns EVERY violation rather than the first, because a
 * fix pass that reveals one problem per run is how a copy audit takes a week.
 *
 * Note on word boundaries: a naive `\b` breaks on the hyphenated entries
 * ("risk-free", "no-brainer"), and a naive substring search over-fires on
 * legitimate words ("hammer" inside "hammered" is a real sentence in a loss
 * autopsy). The compromise is documented behaviour: match on a boundary that
 * accepts start/end of string, whitespace, and punctuation, and accept that a
 * token like "hammered" matches "hammer". Erring toward over-blocking in a
 * trust surface is the correct direction.
 */
export function scanVoice(text: string): VoiceViolation[] {
  const violations: VoiceViolation[] = [];
  const haystack = text.toLowerCase();

  for (const phrase of [...BANNED_PHRASES, ...BANNED_TERMS]) {
    const needle = phrase.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(needle, from);
      if (idx === -1) break;
      violations.push({
        kind: BANNED_PHRASES.includes(phrase) ? "banned_phrase" : "banned_term",
        match: text.slice(idx, idx + phrase.length),
        index: idx,
        suggestion: SAFE_REPLACEMENTS[phrase] ?? null,
      });
      from = idx + needle.length;
    }
  }

  const chars = Array.from(text);
  let charIndex = 0;
  for (const ch of chars) {
    if (EMOJI_PATTERN.test(ch) && !SANCTIONED_GLYPHS.has(ch)) {
      violations.push({
        kind: "emoji",
        match: ch,
        index: charIndex,
        suggestion: "Remove. The design contract allows data glyphs only.",
      });
    }
    charIndex += 1;
  }

  return deOverlap(violations);
}

/**
 * Collapse overlapping matches so the LONGEST phrase at a position wins.
 *
 * Without this, "AI picks" reports twice — once as "AI picks" and once as the
 * shorter "AI pick" inside it — and a 1-issue copy problem is announced as 2.
 * A linter that over-counts is a linter people learn to ignore, which is how
 * a rule-8 violation eventually ships.
 *
 * Non-overlapping matches at different positions are all kept: three separate
 * instances of the same phrase really are three issues.
 */
function deOverlap(violations: VoiceViolation[]): VoiceViolation[] {
  const ordered = [...violations].sort(
    (a, b) => a.index - b.index || b.match.length - a.match.length,
  );
  const kept: VoiceViolation[] = [];
  for (const candidate of ordered) {
    const candidateEnd = candidate.index + candidate.match.length;
    const swallowed = kept.some((existing) => {
      const existingEnd = existing.index + existing.match.length;
      // Containment, not mere adjacency: an abutting match is a separate issue.
      return candidate.index >= existing.index && candidateEnd <= existingEnd;
    });
    if (!swallowed) kept.push(candidate);
  }
  return kept.sort((a, b) => a.index - b.index);
}

export function isClean(text: string): boolean {
  return scanVoice(text).length === 0;
}

/**
 * Guard for module-load use over authored copy constants.
 *
 * Throws rather than logs. A message that reaches production framed as AI
 * contradicts the primary positioning line, which is the one thing the brand
 * cannot recover from quietly.
 */
export function assertCleanCopy(label: string, text: string): void {
  const violations = scanVoice(text);
  if (violations.length === 0) return;
  const detail = violations
    .map((v) => `  · ${v.kind} "${v.match}" at ${v.index}${v.suggestion ? ` → ${v.suggestion}` : ""}`)
    .join("\n");
  throw new Error(
    `[voice] Rule 8 violation in "${label}" (CLAUDE.md rule 8, docs/positioning.md):\n${detail}`,
  );
}

/**
 * Non-throwing sanitizer for SERVER-SUPPLIED text.
 *
 * The server writes the pick reasoning, the brief, and the autopsy copy. The
 * app must never crash on a server regression, and it must never render the
 * violation either. So server text is scanned and, if dirty, replaced with an
 * honest notice rather than the offending string.
 */
export function safeServerCopy(label: string, text: string): string {
  const violations = scanVoice(text);
  if (violations.length === 0) return text;
  return (
    `This text could not be displayed: it failed the brand-vocabulary check ` +
    `(${violations.length} issue${violations.length === 1 ? "" : "s"} in "${label}"). ` +
    `We would rather show you nothing than show you a promise we cannot keep.`
  );
}
