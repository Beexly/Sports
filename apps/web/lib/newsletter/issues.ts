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
  {
    slug: "003-launch-autonomy",
    number: 3,
    title: "Launch autonomy: free lanes, dark gates, receipts",
    publishedAt: "2026-08-06T16:00:00.000Z",
    lede:
      "How GSE runs with minimal human input: free-first data, Jynx credit routing, settlement health, and why public boards stay gated until proof clears.",
    sections: [
      {
        heading: "What runs without a human",
        body: "Hourly free-path settle, free-spine health, Jarvis snapshots, health alerts. Operators flip env and gates — not every cron.",
      },
      {
        heading: "What stays dark on purpose",
        body: "LIVE_BOARD, public picks, and StatKing remain off until rights, settlement, and proof bars clear. Empty honesty beats a half-built board.",
      },
      {
        heading: "Cost intelligence",
        body: "Content free-lane (Cerebras / open free hosts) first, then AWS/Azure/Google Claude credits, cash Anthropic last.",
      },
      {
        heading: "Read next",
        body: "Methodology, Contests paper bay, /llms.txt proof map, and the founding waitlist if you want the next operator-reviewed issue.",
      },
    ],
  },
  {
    slug: "004-week-8-sweep-and-week-9-stage-0-gate",
    number: 4,
    title: "Board Meeting 004: 7-of-7 Max-Play Sweep, 62-23-1 Ledger & Week 9 Stage 0 Gate",
    publishedAt: "2026-11-04T18:00:00.000Z",
    lede:
      "How the 5-Stage GSE Engine swept all 7 top-conviction 1.00u plays in Week 8 (22-8-1, +12.40u) to reach 38-13-1 (+22.85u overall), and how Stage 0 locks Week 9 TNF (JAX @ BAL) and the 11-game Sunday Main Slate.",
    sections: [
      {
        heading: "Verified Week 8 Forensic Audit",
        body: "Week 8 settled at 22-8-1 (+12.40u), highlighted by a 7-0 sweep on 1.00u max-conviction releases (Rams -6.5, Steelers -3.5, Jets ML, Chiefs ML, Cardinals +7.0, Devontez Walker Over 0.5 Rec Yds, Sione Vaki Over 4.5 Rush Yds). The official New Engine ledger stands at 38-13-1 (74.5 out of 100 win rate, +22.85u).",
      },
      {
        heading: "Stage 0 Live Roster & Transaction Firewall",
        body: "Every Week 9 simulation, prop, SGP, and DFS packet is gated by Stage 0 (data/nflverse/week9_live_roster_transactions_and_starters_2026.json). Lamar Jackson (OUT), Tyler Huntley (OUT for season), and Travis Etienne Jr. (OUT/IR) are hard-blocked before any optimization runs, with Jacoby Brissett (traded ARI -> BAL on Nov 4) and Tank Bigsby priced into the JAX @ BAL Thursday Night Football spine.",
      },
      {
        heading: "GSI WP-05 Conformal-OT v2.0 Breakthrough",
        body: "Galaxy Science Institute (Texas Domestic Nonprofit Corporation, Filing #15043440630001, IRS EIN 43-2804773) published WP-05: Multi-Frame Wasserstein-Mahalanobis Conformal Whitening and One-Sided Pathological Strain Cone RFF kernels lifted real MIT MIMIC-IV ICU sepsis/mortality ROC-AUC from the 0.7721 linear floor to 0.8313 with zero data leakage.",
      },
      {
        heading: "Week 9 All-Access Value Architecture",
        body: "Following Thaler (1985) mental accounting principles, the Week 9 All-Access Pass bundles $52 of standalone packets ($9 TNF + $19 Sunday Main Call Sheet + $15 Sunday Stochastic MILP DFS + $9 SNF/SGP Matrix) for $29 ($23 transaction utility surplus).",
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
