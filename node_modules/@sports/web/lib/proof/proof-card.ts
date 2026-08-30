/**
 * Dynamic Proof Cards — the viral loop: proof → share → signup. The shared unit is a
 * verifiable RECEIPT, not a brag (settled pick, loss autopsy, no-bet pass, calibration
 * milestone, CLV milestone). This builds the card's text content and refuses to mint a
 * card whose copy isn't claim-safe — it composes `scanForBannedPhrases` (the single
 * source of truth), never re-implements it. The OG image render is a separate route;
 * this is the pure, testable content + safety core. A card is only `shareable` when safe.
 */

import { scanForBannedPhrases } from "@/lib/trust-claims";

export type ProofCardKind =
  | "settled-pick"
  | "loss-autopsy"
  | "no-bet"
  | "calibration-milestone"
  | "clv-milestone";

export interface ProofCardInput {
  readonly kind: ProofCardKind;
  readonly headline: string;
  readonly subhead: string;
  /** The single proof number/stat (already gated upstream by the claim compiler). */
  readonly stat: string;
  /** Optional override; defaults to the responsible-gaming disclaimer. */
  readonly footer?: string;
}

export const DEFAULT_FOOTER = "Past performance does not guarantee future results. 21+.";

export interface ProofCard {
  readonly kind: ProofCardKind;
  readonly headline: string;
  readonly subhead: string;
  readonly stat: string;
  readonly footer: string;
  readonly claimSafe: boolean;
  readonly shareable: boolean;
  readonly blockers: readonly string[];
}

/**
 * Build a proof card. Scans all copy for banned phrases; `claimSafe`/`shareable` are
 * false (with blockers) if anything trips the scanner — no unsafe card ever ships.
 */
export function buildProofCard(input: ProofCardInput): ProofCard {
  const footer = input.footer && input.footer.trim() !== "" ? input.footer : DEFAULT_FOOTER;
  const corpus = [input.headline, input.subhead, input.stat, footer].join("\n");
  const hits = scanForBannedPhrases(corpus);
  const blockers = [...new Set(hits.map((h) => h.phrase))];
  const claimSafe = blockers.length === 0;

  return {
    kind: input.kind,
    headline: input.headline,
    subhead: input.subhead,
    stat: input.stat,
    footer,
    claimSafe,
    shareable: claimSafe,
    blockers,
  };
}
