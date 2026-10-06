/**
 * Fail-closed mint gate for a game the mind was asked to cover.
 *
 * `intelligence` `analyze()` is not on the publish path. This function is the
 * only door a trace has toward a mint, and it does not mint a probability.
 * INVALID or any DATA-GAP track withholds the game. Anything else passes the
 * game through to the fair value that was already built. A game the mind was
 * not asked to cover is `undefined` here and passes, unchanged.
 *
 * The return has no probability slot. A 0.5 substitute cannot be expressed.
 */

export type MindVerdict = {
  readonly asked: true;
  /** `analyze()` label. "INVALID" withholds. */
  readonly label: string;
  /** Checklist track → verdict. "DATA-GAP" withholds. */
  readonly checklist: Readonly<Record<string, string>>;
};

export type MintAfterMind =
  | { readonly action: "pass" }
  | { readonly action: "withhold"; readonly reason: string };

function isDataGap(verdict: string): boolean {
  return verdict === "DATA-GAP" || verdict === "DATA_GAP";
}

export function mintAfterMind(verdict: MindVerdict | undefined | null): MintAfterMind {
  if (verdict == null || verdict.asked !== true) {
    return { action: "pass" };
  }
  const label = verdict.label.trim();
  if (label === "INVALID" || label.startsWith("INVALID")) {
    return {
      action: "withhold",
      reason: "analyze() returned INVALID; the game is withheld and no probability was substituted",
    };
  }
  const gaps = Object.entries(verdict.checklist)
    .filter(([, value]) => isDataGap(value))
    .map(([track]) => track)
    .sort();
  if (gaps.length > 0) {
    return {
      action: "withhold",
      reason: `analyze() DATA-GAP on ${gaps.join(", ")}; the game is withheld and no probability was substituted`,
    };
  }
  return { action: "pass" };
}
