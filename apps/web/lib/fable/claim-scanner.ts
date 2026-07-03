export type UnsupportedClaimHit = {
  readonly phrase: string;
  readonly line: number;
  readonly snippet: string;
};

export const UNSUPPORTED_FABLE_CLAIMS = [
  "legal cleared",
  "superior edge",
  "aws parity",
  "ground truth configured",
  "production-ready",
  "green tests",
  ".5+ brier/ece gain",
] as const;

function stripMarkdownCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");
}

export function scanUnsupportedFableClaims(text: string): readonly UnsupportedClaimHit[] {
  const stripped = stripMarkdownCode(text);
  const lines = stripped.split(/\r?\n/);
  const hits: UnsupportedClaimHit[] = [];

  lines.forEach((lineText, index) => {
    const lower = lineText.toLowerCase();
    for (const phrase of UNSUPPORTED_FABLE_CLAIMS) {
      if (lower.includes(phrase)) {
        hits.push({
          line: index + 1,
          phrase,
          snippet: lineText.trim(),
        });
      }
    }
  });

  return hits;
}
