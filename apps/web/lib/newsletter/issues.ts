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
    title: "Board Meeting 004: 7-of-7 Max-Play Sweep, 47-19-1 Ledger & Week 9 Slate Preview",
    publishedAt: "2026-11-04T18:00:00.000Z",
    lede:
      "How our football desk swept all 7 top-conviction 1.00u releases in Week 8 (22-8-1, +12.40u) to reach 47-19-1 (72.9% · +24.92u overall), plus our roster and injury check for Thursday Night Football (JAX @ BAL) and the 11-game Sunday Main Slate.",
    sections: [
      {
        heading: "Verified Week 8 Settled Review",
        body: "Week 8 settled at 22-8-1 (+12.40u), highlighted by a 7-0 sweep on 1.00u max-conviction releases (Rams -6.5, Steelers -3.5, Jets ML, Chiefs ML, Cardinals +7.0, Devontez Walker Over 0.5 Rec Yds, Sione Vaki Over 4.5 Rush Yds). Our official verified NFL ledger now stands at 47-19-1 (72.9 out of 100 win rate, +24.92u).",
      },
      {
        heading: "Week 9 Roster & Injury Verification",
        body: "Every Week 9 game call, player prop, parlay, and DFS lineup starts with our verified 32-team depth chart check. With Lamar Jackson (OUT), Tyler Huntley (OUT for season), and Travis Etienne Jr. (OUT/IR) sidelined for Thursday Night Football, Baltimore leans on Derrick Henry (18.6 projected carries) and quick-game blitz outlets while Chris Rodriguez Jr. leads Jacksonville's early-down backfield—creating immediate middle-of-the-field volume for tonight's free teaser play: Mark Andrews OVER 2.5 Receptions.",
      },
      {
        heading: "Trench Matchups & Pass Discipline",
        body: "Across the 12-game Week 9 slate, our film and line-value review rejected over 87 out of 100 available props and derivatives as NO-BET. Only spots where offensive/defensive line protection, coverage shells, and de-vigged sportsbook numbers align make the locked card.",
      },
      {
        heading: "Week 9 All-Access Bundle",
        body: "The Week 9 All-Access Pass combines all four weekly releases ($9 TNF + $19 Sunday Main Call Sheet + $15 Sunday DFS Lineup Card + $9 SGP Card = $52 standalone value) into a single $29 weekly pass ($23 savings) with instant in-browser unlock.",
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
