/**
 * Public unfinished-copy fence.
 *
 * Product rule: public surfaces must not advertise incomplete work.
 * Sealed / readiness-gated / waitlist states are allowed when they read as
 * intentional product posture — never "coming soon" or "not finished".
 *
 * The two phrase classes are distinct, and conflating them made this fence
 * contradict the copy contract it was meant to protect:
 *
 *  - PUBLIC_UNFINISHED_PHRASES are PROMISES about work that does not exist yet.
 *    They are never acceptable on a public surface.
 *  - PUBLIC_STATE_LABELS are honest labels for a surface that is deliberately
 *    dark. Founder doctrine (2026-10-29) requires the gated routes to say the
 *    plain truth and point at the two live surfaces — /board literally pins
 *    "under construction" plus links to /packages and /fantasy/dfs — so the
 *    label is compliant only when the same source also carries a live-surface
 *    pointer. A dark surface that says "under construction" and gives the
 *    visitor nowhere to go is the unfinished advertising this fence exists to
 *    catch.
 */

export const PUBLIC_UNFINISHED_PHRASES = [
  "coming soon",
  "not finished",
  "agent-assisted foundation",
  "not yet measured",
  "todo:",
  "fixme",
  "wip:",
  "lorem ipsum",
] as const;

/** Honest labels for an intentionally dark surface (see the rule above). */
export const PUBLIC_STATE_LABELS = ["under construction"] as const;

/** Where the live product actually lives; a state label must point at one. */
export const LIVE_SURFACE_POINTERS = ["/packages", "/fantasy/dfs"] as const;

export type UnfinishedHit = {
  phrase: string;
  index: number;
};

/**
 * Case-insensitive scan of source or rendered copy.
 *
 * State labels are reported only when the same text carries no live-surface
 * pointer — see the class rule at the top of this file.
 */
export function findUnfinishedPublicCopy(text: string): UnfinishedHit[] {
  const lower = text.toLowerCase();
  const hits: UnfinishedHit[] = [];
  const scan = (phrases: readonly string[]) => {
    for (const phrase of phrases) {
      let from = 0;
      while (true) {
        const index = lower.indexOf(phrase, from);
        if (index < 0) break;
        hits.push({ phrase, index });
        from = index + phrase.length;
      }
    }
  };
  scan(PUBLIC_UNFINISHED_PHRASES);
  const pointsAtLiveSurface = LIVE_SURFACE_POINTERS.some((pointer) => lower.includes(pointer));
  if (!pointsAtLiveSurface) scan(PUBLIC_STATE_LABELS);
  return hits.sort((a, b) => a.index - b.index);
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
