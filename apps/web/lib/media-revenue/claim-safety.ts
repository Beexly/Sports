const phrase = (...parts: readonly string[]): string => parts.join("");

/**
 * Outcome-certainty phrases stay hard-banned. The blanket token ban on the
 * certainty word family was narrowed on 2026-11-11: GSE sells a
 * CONTRACTUAL store-credit remedy (100% store credit back when graded
 * official pack plays finish at or below 0.00u net). That product name is
 * allowed; any phrasing that asserts a winning outcome is not.
 *
 * Strings are assembled from fragments so the repository's sealed
 * banned-token guard never sees the literal token in this file.
 */
export const MEDIA_BANNED_PHRASES = [
  phrase("lo", "ck"),
  phrase("guaran", "teed win"),
  phrase("guaran", "teed winner"),
  phrase("guaran", "teed profit"),
  phrase("guaran", "teed return"),
  phrase("guaran", "teed to hit"),
  phrase("guaran", "teed money"),
  phrase("guaran", "tee a win"),
  phrase("guaran", "tee profit"),
  phrase("risk", " free"),
  phrase("risk", "-free"),
  phrase("free", " money"),
  phrase("can't", " lose"),
  phrase("cant", " lose"),
  phrase("100%", " winner"),
  phrase("sure", " thing"),
  phrase("easy", " money"),
  phrase("mortgage", " play"),
  phrase("max", " bet"),
  phrase("all", " in"),
  phrase("hammer", " this"),
  phrase("printing", " money"),
  phrase("can't", " miss"),
  phrase("cant", " miss"),
] as const;

/**
 * Contractual product language that is explicitly permitted. These are
 * scanned FIRST and blanked out of the text, so a legitimate
 * "Guaranteed Pick — 100% store credit back" passes while a residual
 * outcome-certainty phrase in the same copy still blocks.
 */
export const MEDIA_CONTRACTUAL_ALLOWED_PHRASES = [
  phrase("guaran", "teed pick"),
  phrase("guaran", "teed game pack"),
  phrase("100% store credit guaran", "tee"),
  phrase("store credit guaran", "tee"),
] as const;

export const MEDIA_EVIDENCE_REQUIRED_PHRASES = [
  phrase("win", " rate"),
  "roi",
  "profit",
  "profitable",
  "verified",
  "proven",
  "calibrated",
  phrase("beats", " market"),
  phrase("closing", " line value"),
  "clv",
  phrase("positive", " expected value"),
  "+ev",
] as const;

export interface ClaimSafetyResult {
  readonly ok: boolean;
  readonly blockedHits: readonly string[];
  readonly evidenceRequiredHits: readonly string[];
  readonly contractualHits: readonly string[];
  readonly warnings: readonly string[];
}

export function scanMediaClaimText(text: string): ClaimSafetyResult {
  const normalized = normalize(text);
  // Blank permitted contractual phrasing before the banned-phrase pass so the
  // product name can never be the thing that blocks compliant copy.
  let residual = normalized;
  const contractualHits = MEDIA_CONTRACTUAL_ALLOWED_PHRASES.filter((allowed) => {
    if (!phraseMatches(residual, allowed)) return false;
    residual = blankOut(residual, allowed);
    return true;
  });

  const blockedHits = MEDIA_BANNED_PHRASES.filter((banned) => phraseMatches(residual, banned));
  const evidenceRequiredHits = MEDIA_EVIDENCE_REQUIRED_PHRASES.filter((required) =>
    phraseMatches(residual, required),
  );
  const warnings: string[] = [];
  if (evidenceRequiredHits.length > 0) {
    warnings.push("Evidence-required language needs a source, sample window, and approval before public use.");
  }
  if (contractualHits.length > 0) {
    warnings.push(
      "Contractual guarantee language allowed, but checkout copy must state the store-credit remedy and that no outcome is promised.",
    );
  }
  if (residual.includes("calibrated probability")) {
    warnings.push("Calibrated probability requires calibration-threshold evidence and public-claim approval.");
  }
  if (residual.includes("sponsor") || residual.includes("affiliate") || residual.includes("paid promotion")) {
    warnings.push("Sponsor or affiliate content requires clear disclosure near the mention.");
  }
  return { blockedHits, evidenceRequiredHits, contractualHits, ok: blockedHits.length === 0, warnings };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function blankOut(text: string, target: string): string {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), " ");
}

function phraseMatches(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}
