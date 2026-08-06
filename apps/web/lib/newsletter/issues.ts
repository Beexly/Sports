export type NewsletterIssue = {
  slug: string;
  number: number;
  title: string;
  publishedAt: string;
  lede: string;
  sections: Array<{ heading: string; body: string }>;
};

export const ISSUES: readonly NewsletterIssue[] = [
  {
    slug: "001-board-meeting-zero",
    number: 1,
    title: "Board Meeting Zero: honesty over hype",
    publishedAt: "2026-08-01T12:00:00.000Z",
    lede:
      "Why GSE ships dark instead of half-built, how No-Bet protects bankroll and brand, and the free paper Contest Bay now open for process practice.",
    sections: [
      {
        heading: "The rule",
        body: "Public surfaces are complete, waitlisted with a real form, readiness-sealed, or dark. We do not advertise unfinished product. Contest Bay is free skill paper only — no fees, no prizes, no wagering.",
      },
      {
        heading: "No-Bet of the week",
        body: "Pass when evidence chains fail freshness, rights, calibration agreement, or responsible-gaming boundaries. Passing is a first-class decision with the same audit trail as a fire.",
      },
      {
        heading: "Build note",
        body: "Glass Ledger posture: pre-kickoff commit, CLV vs efficient close, recompute path. Hit-rate marketing without coverage denominators stays banned by code.",
      },
      {
        heading: "Read next",
        body: "Podcast Ep 001 (honesty gates), methodology, and today's board when the readiness gate clears a published slate.",
      },
    ],
  },
  {
    slug: "002-selective-edge",
    number: 2,
    title: "Selective edge: coverage is the product",
    publishedAt: "2026-08-05T12:00:00.000Z",
    lede:
      "Full-slate hero rates are a trap. Selective conformal gates, props volume, and why silence beats a forced fire.",
    sections: [
      {
        heading: "Math in one line",
        body: "Fire on calibrated edge e = p − q with a conformal lower bound above vig — never on confidence alone.",
      },
      {
        heading: "Market blend test",
        body: "If the model coefficient on market logits is indistinguishable from zero, the correct product action is zero fires — not a confident narrative.",
      },
      {
        heading: "What you can practice now",
        body: "Contest Bay paper board, Academy floors, and the Board Meeting archive. Subscribe below for the next operator-reviewed issue.",
      },
    ],
  },
];

export function listIssues() {
  return [...ISSUES].sort((a, b) => b.number - a.number);
}

export function getIssue(slug: string) {
  return ISSUES.find((i) => i.slug === slug);
}
