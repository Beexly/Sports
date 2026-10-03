/**
 * Public unfinished-copy fence.
 *
 * Product rule: public surfaces must not advertise incomplete work.
 * Sealed / readiness-gated / waitlist states are allowed when they read as
 * intentional product posture — never "coming soon", "not finished", or
 * "under construction".
 */

export const PUBLIC_UNFINISHED_PHRASES = [
  "coming soon",
  "not finished",
  "under construction",
  "agent-assisted foundation",
  "not yet measured",
  "todo:",
  "fixme",
  "wip:",
  "lorem ipsum",
] as const;

export type UnfinishedHit = {
  phrase: string;
  index: number;
};

/** Case-insensitive scan of source or rendered copy. */
export function findUnfinishedPublicCopy(text: string): UnfinishedHit[] {
  const lower = text.toLowerCase();
  const hits: UnfinishedHit[] = [];
  for (const phrase of PUBLIC_UNFINISHED_PHRASES) {
    let from = 0;
    while (true) {
      const index = lower.indexOf(phrase, from);
      if (index < 0) break;
      hits.push({ phrase, index });
      from = index + phrase.length;
    }
  }
  return hits;
}

export function assertNoUnfinishedPublicCopy(text: string, label: string): void {
  const hits = findUnfinishedPublicCopy(text);
  if (hits.length === 0) return;
  const summary = hits
    .slice(0, 12)
    .map((h) => `  - "${h.phrase}" @ ${h.index}`)
    .join("\n");
  throw new Error(`${label} contains unfinished public copy:\n${summary}`);
}
