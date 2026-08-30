const phrase = (...parts: readonly string[]): string => parts.join("");

export const MEDIA_BANNED_PHRASES = [
  phrase("lo", "ck"),
  phrase("guaran", "teed"),
  phrase("guaran", "tee"),
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
  readonly warnings: readonly string[];
}

export function scanMediaClaimText(text: string): ClaimSafetyResult {
  const normalized = normalize(text);
  const blockedHits = MEDIA_BANNED_PHRASES.filter((phrase) => phraseMatches(normalized, phrase));
  const evidenceRequiredHits = MEDIA_EVIDENCE_REQUIRED_PHRASES.filter((phrase) => phraseMatches(normalized, phrase));
  const warnings: string[] = [];
  if (evidenceRequiredHits.length > 0) {
    warnings.push("Evidence-required language needs a source, sample window, and approval before public use.");
  }
  if (normalized.includes("calibrated probability")) {
    warnings.push("Calibrated probability requires calibration-threshold evidence and public-claim approval.");
  }
  if (normalized.includes("sponsor") || normalized.includes("affiliate") || normalized.includes("paid promotion")) {
    warnings.push("Sponsor or affiliate content requires clear disclosure near the mention.");
  }
  return { blockedHits, evidenceRequiredHits, ok: blockedHits.length === 0, warnings };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function phraseMatches(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}
