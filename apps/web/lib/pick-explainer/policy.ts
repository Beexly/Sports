/**
 * Output policy for pick explanations — the enforced (not merely instructed)
 * guardrail. Mirrors the Model Court answer policy: reject empty/over-long
 * output, output missing a grounding citation, or output that drifts into
 * betting certainty, personal advice, EV/Kelly/win-rate, or competitor talk.
 *
 * Pure and fully unit-tested. A failing explanation is never shown to the user.
 */

// Same families the Model Court enforces, tuned for explanation OUTPUT (not the
// user's question). Certainty here targets unconditional outcome claims.
const CERTAINTY_PATTERNS = [
  /\bwill\s+(?:definitely\s+)?(?:win|cover|hit|lose)\b/i,
  /\bguaranteed\b/i,
  /\block of the\b/i,
  /\bcan'?t\s+lose\b/i,
  /\bsure\s+thing\b/i,
] as const;

const PERSONAL_ADVICE_PATTERNS = [
  /\byou\s+should\s+(?:bet|tail|fade|play|take|back)\b/i,
  /\bbankroll\b/i,
  /\bstake\b/i,
  /\bbet\s+size\b/i,
  /\bunit[s]?\b/i,
  /\bhedge\b/i,
] as const;

const EV_PATTERNS = [
  /\bexpected value\b/i,
  /\bkelly\b/i,
  /\bwin[\s-]?rate\b/i,
  /\broi\b/i,
  /\bpositive ev\b/i,
  /\b\+ev\b/i,
] as const;

const COMPETITOR_PATTERNS = [
  /\bdraftkings\b/i,
  /\bfanduel\b/i,
  /\bbetter than\b.*\b(other|service|site|book)\b/i,
] as const;

const CITATION_PATTERN =
  /\(source:\s*(?:factor_breakdown|signal_snapshot)\s+at\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z\)/i;

export type PickExplanationPolicyFailure =
  | "EMPTY"
  | "TOO_LONG"
  | "MISSING_CITATION"
  | "BETTING_CERTAINTY"
  | "PERSONAL_ADVICE"
  | "EV_KELLY_WINRATE"
  | "COMPETITOR_COMPARE";

function matchesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Shared no-fabrication / no-advice language check, reused by the loss-autopsy
 * drafter. Returns the families that matched (empty = clean). Does NOT check
 * citation/length — callers layer those on per surface.
 */
export function detectBannedLanguage(text: string): PickExplanationPolicyFailure[] {
  const failures: PickExplanationPolicyFailure[] = [];
  if (matchesAny(text, CERTAINTY_PATTERNS)) failures.push("BETTING_CERTAINTY");
  if (matchesAny(text, PERSONAL_ADVICE_PATTERNS)) failures.push("PERSONAL_ADVICE");
  if (matchesAny(text, EV_PATTERNS)) failures.push("EV_KELLY_WINRATE");
  if (matchesAny(text, COMPETITOR_PATTERNS)) failures.push("COMPETITOR_COMPARE");
  return failures;
}

/**
 * Returns the list of policy failures for an explanation. Empty array = passes.
 */
export function evaluatePickExplanationPolicy(text: string): PickExplanationPolicyFailure[] {
  const failures: PickExplanationPolicyFailure[] = [];
  const trimmed = text.trim();

  if (trimmed.length === 0) failures.push("EMPTY");
  if (trimmed.length > 1600) failures.push("TOO_LONG");
  if (!CITATION_PATTERN.test(trimmed)) failures.push("MISSING_CITATION");
  if (matchesAny(trimmed, CERTAINTY_PATTERNS)) failures.push("BETTING_CERTAINTY");
  if (matchesAny(trimmed, PERSONAL_ADVICE_PATTERNS)) failures.push("PERSONAL_ADVICE");
  if (matchesAny(trimmed, EV_PATTERNS)) failures.push("EV_KELLY_WINRATE");
  if (matchesAny(trimmed, COMPETITOR_PATTERNS)) failures.push("COMPETITOR_COMPARE");

  return failures;
}
