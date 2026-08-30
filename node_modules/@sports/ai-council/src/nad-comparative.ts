/**
 * NAD comparative / superiority claim standards — productized for council.
 * Not legal advice. Patterns from public NAD practice commentary.
 */

export interface NadComparativeStandard {
  readonly id: string;
  readonly claimForm: string;
  readonly nadExpectation: string;
  readonly gseControl: "HARD_REFUSE" | "REQUIRE_STUDY" | "ALLOW_PROCESS";
  readonly exampleRefuse: string;
  readonly exampleAllow: string;
}

export const NAD_COMPARATIVE_STANDARDS: readonly NadComparativeStandard[] = [
  {
    id: "number_one_market_share",
    claimForm: "#1 / No. 1 brand or product",
    nadExpectation:
      "Widely understood as highest market share category-wide; channel/timebox disclosures that contradict the headline are a poor fit (e.g. DREO fan #1 SWIFT #7424 practice)",
    gseControl: "HARD_REFUSE",
    exampleRefuse: "#1 sports prediction platform",
    exampleAllow: "We publish rights-tagged contracts with refuse-default (process claim)",
  },
  {
    id: "best_superlative_tied_to_attribute",
    claimForm: "Best / greatest when tied to measurable attribute",
    nadExpectation:
      "Superlatives linked to product attributes need substantiation — not pure puffery when objective",
    gseControl: "HARD_REFUSE",
    exampleRefuse: "Best edge model in the industry",
    exampleAllow: "Selective gate refuses when dual-asOf fails",
  },
  {
    id: "more_than_anyone",
    claimForm: "More stats / more data than anyone / dominate feed",
    nadExpectation:
      "Implied comparative superiority requires defined universe + measurement method + recent evidence",
    gseControl: "REQUIRE_STUDY",
    exampleRefuse: "More stats than anyone else in the world",
    exampleAllow:
      "873 rights-tagged contracts in our registry (self-referential inventory, not competitive ranking)",
  },
  {
    id: "beats_all_books",
    claimForm: "Beats all books / everyone",
    nadExpectation:
      "Comparative performance needs fair baseline method and representative sample — not cherry-picked fires",
    gseControl: "HARD_REFUSE",
    exampleRefuse: "Beats all books every week",
    exampleAllow: "Self-CLV closed cohort when n≥floor (measured, not superiority vs books)",
  },
  {
    id: "parity_those_other_brands",
    claimForm: "As good as / better than those other brands (hazy set)",
    nadExpectation:
      "Hazy competitive set often requires showing superiority/parity vs substantial share of category (~85% practice commentary)",
    gseControl: "REQUIRE_STUDY",
    exampleRefuse: "Better than those other touts",
    exampleAllow: "Empty board is success under LIVE_BOARD off",
  },
  {
    id: "ai_accuracy_comparative",
    claimForm: "AI more accurate / AI detects better",
    nadExpectation:
      "NAD AI cases: claim must match evidence breadth; limitations in claim not fine print; training+validation+in-product verification",
    gseControl: "REQUIRE_STUDY",
    exampleRefuse: "Our AI is more accurate than any model",
    exampleAllow: "Scorebug OCR harness reports measured precision on labeled frames (eval-only)",
  },
  {
    id: "up_to_performance",
    claimForm: "Up to X% win rate",
    nadExpectation:
      "Up-to claims need evidence that a non-trivial share achieves near the max under normal use",
    gseControl: "HARD_REFUSE",
    exampleRefuse: "Up to 90% win rate",
    exampleAllow: "We refuse-default when sample floor fails",
  },
] as const;

export function assessComparativeClaim(text: string): {
  hits: NadComparativeStandard[];
  hardRefuse: boolean;
  requireStudy: boolean;
} {
  const t = text.toLowerCase();
  const hits: NadComparativeStandard[] = [];
  for (const s of NAD_COMPARATIVE_STANDARDS) {
    if (
      (s.id === "number_one_market_share" && /#1|no\.?\s*1|number\s*one/.test(t)) ||
      (s.id === "best_superlative_tied_to_attribute" &&
        /\bbest\b.*\b(edge|model|predictor|api|stats)\b|\b(edge|model|predictor)\b.*\bbest\b/.test(
          t,
        )) ||
      (s.id === "more_than_anyone" &&
        /more stats than|more data than|than anyone|dominate (the )?(game|market|industry)/.test(
          t,
        )) ||
      (s.id === "beats_all_books" && /beats? all|beats? (the )?books|everyone/.test(t)) ||
      (s.id === "parity_those_other_brands" && /better than those|other touts|other brands/.test(t)) ||
      (s.id === "ai_accuracy_comparative" &&
        /ai (is )?more accurate|more accurate than any|ai detects better/.test(t)) ||
      (s.id === "up_to_performance" && /up to \d{1,3}%/.test(t))
    ) {
      hits.push(s);
    }
  }
  return {
    hits,
    hardRefuse: hits.some((h) => h.gseControl === "HARD_REFUSE"),
    requireStudy: hits.some((h) => h.gseControl === "REQUIRE_STUDY"),
  };
}
