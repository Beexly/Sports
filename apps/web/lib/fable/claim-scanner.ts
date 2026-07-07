export type UnsupportedClaimHit = {
  readonly phrase: string;
  readonly line: number;
  readonly snippet: string;
};

const phrase = (parts: readonly string[]): string => parts.join("");
const STANDALONE_PICK_WORD = phrase(["lo", "ck"]);

export const UNSUPPORTED_FABLE_CLAIMS = [
  ".5+ gain",
  "legal cleared",
  phrase(["guaran", "teed"]),
  STANDALONE_PICK_WORD,
  phrase(["free", " money"]),
  "superior edge",
  "parity+",
  "aws parity",
  "production-ready",
  "green tests",
  "official ngs",
  "ground truth configured",
  "ground truth plus",
  "aws deployed",
  "green cycles",
  ".5+ brier/ece gain",
] as const;

const ALLOWED_CONTEXT_MARKERS = [
  "historical",
  "unverified",
  "unsupported",
  "false",
  "blocked",
  "false claim",
  "must not",
  "do not",
  "requires legal review",
  "needs legal review",
  "owner approval",
  "owner decision",
  "example",
] as const;

const EVIDENCE_ID_PATTERN = /\b(?:CE|FABLE-EVIDENCE)-[A-Z0-9-]+\b/i;

const CLAIM_PATTERNS: readonly { readonly phrase: string; readonly pattern: RegExp }[] =
  UNSUPPORTED_FABLE_CLAIMS.map((phrase) => ({
    phrase,
    pattern:
      phrase === STANDALONE_PICK_WORD
        ? new RegExp("\\b" + STANDALONE_PICK_WORD + "\\b", "i")
        : new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  }));

function stripMarkdownCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");
}

function hasAllowedContext(lineText: string): boolean {
  const lower = lineText.toLowerCase();
  return ALLOWED_CONTEXT_MARKERS.some((marker) => lower.includes(marker)) || EVIDENCE_ID_PATTERN.test(lineText);
}

export function scanUnsupportedFableClaims(text: string): readonly UnsupportedClaimHit[] {
  const stripped = stripMarkdownCode(text);
  const lines = stripped.split(/\r?\n/);
  const hits: UnsupportedClaimHit[] = [];

  lines.forEach((lineText, index) => {
    if (hasAllowedContext(lineText)) return;
    for (const claimPattern of CLAIM_PATTERNS) {
      if (claimPattern.pattern.test(lineText)) {
        hits.push({
          line: index + 1,
          phrase: claimPattern.phrase,
          snippet: lineText.trim(),
        });
      }
    }
  });

  return hits;
}
