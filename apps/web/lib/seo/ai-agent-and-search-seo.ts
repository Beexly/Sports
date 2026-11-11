/**
 * Search & Discovery Metadata Module for Galaxy Sports Edge (`apps/web`).
 *
 * Provides structured JSON-LD and high-intent search keywords across:
 *   - NFL Picks, Against the Spread (ATS) & Totals
 *   - NFL Player Props & De-Vigged Fair Odds
 *   - NFL DraftKings Showdown & Main-Slate DFS Lineups
 *   - NFL FanDuel Single-Game & Main-Slate DFS Projections
 *   - Fantasy Football Rankings, Start/Sit & Target Share
 *   - Sportsbook Odds Comparison, Closing Line Value (CLV) & Correlated Same-Game Parlays
 */

export const HIGH_INTENT_SEARCH_KEYWORDS: string[] = [
  "NFL picks",
  "best NFL picks today",
  "NFL predictions against the spread",
  "Thursday Night Football picks",
  "NFL player props",
  "best NFL prop bets tonight",
  "NFL DraftKings optimizer",
  "DraftKings TNF Showdown lineup",
  "DraftKings NFL DFS projections",
  "NFL FanDuel optimizer",
  "FanDuel single game DFS picks",
  "FanDuel NFL projections",
  "fantasy football rankings",
  "fantasy football start sit",
  "fantasy football target share rankings",
  "sports betting picks",
  "NFL film breakdown picks",
  "NFL trench matchup analysis",
  "sportsbook odds comparison",
  "same game parlay SGP picks",
  "correlated parlay builder",
  "closing line value CLV tracker",
  "de-vigged sportsbook odds",
  "NFL injury matchup analysis",
  "Galaxy Sports Edge",
];

export const AI_CRAWLER_USER_AGENTS: string[] = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Googlebot",
  "Bingbot",
  "Applebot-Extended",
  "GrokBot",
  "xAI-Bot",
  "CCBot",
];

export function buildGlobalSearchAndAiJsonLd(siteUrl: string = "https://galaxysportsedge.com") {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "SportsOrganization"],
        "@id": `${siteUrl}/#organization`,
        name: "Galaxy Sports Edge",
        alternateName: ["GSE", "Galaxy Sports Edge Football Desk"],
        url: siteUrl,
        description:
          "NFL and multi-sport football analysis platform built on film tendencies, offensive and defensive line trench matchups, blitz and coverage shells, verified 32-team injury reports, de-vigged line comparisons, Same-Game Parlays, and DraftKings & FanDuel DFS lineups.",
        sameAs: ["https://x.com/GalaxySportsAI"],
        knowsAbout: [
          "NFL Picks Against the Spread",
          "NFL Over/Under Totals",
          "NFL Player Props",
          "DraftKings NFL DFS",
          "FanDuel NFL DFS",
          "Fantasy Football Projections",
          "Sportsbook Odds De-Vigging",
          "Same Game Parlay (SGP) Game Scripts",
          "Closing Line Value (CLV)",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Galaxy Sports Edge — NFL Picks, Player Props, DraftKings & FanDuel DFS, Parlays & Line Value",
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", "h2", "main p"],
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#application`,
        name: "Galaxy Sports Edge NFL Picks, Props, Parlays & DFS Platform",
        applicationCategory: "SportsApplication",
        operatingSystem: "Web, iOS",
        url: siteUrl,
        featureList: [
          "NFL Spread, Total & Moneyline Breakdowns with XX/100 Conviction Ratings",
          "Two-Sided Sportsbook De-Vigging & Strict Pass Discipline",
          "360-Degree NFL Player Props (Quarters, Halves, Passing, Rushing, Receiving, Kicking, IDP Sacks & Tackles, TDs)",
          "DraftKings & FanDuel TNF Showdown Captain-Mode & Main-Slate DFS Lineups",
          "Verified 32-Team Injury & Target/Carry Redistribution Tracking",
          "Correlated Same-Game Parlay (SGP) Tickets Built Around Connected Game Scripts",
        ],
      },
      {
        "@type": "Dataset",
        "@id": `${siteUrl}/#dataset`,
        name: "Galaxy Sports Edge Verified NFL Picks, Player Props & Closing Line Value Ledger",
        description:
          "Verified public NFL settlement ledger reporting a 36-13-1 (+20.14u) verified record (73.5%, MAIN + DERIVATIVE + TNF SINGLE-STAKE) alongside settled closing line value (CLV) comparisons and conviction-band calibration; 47-19-1 (+24.92u) is the all-in secondary view.",
        dateModified: "2026-11-07",
        url: `${siteUrl}/calibration`,
        creator: { "@id": `${siteUrl}/#organization` },
        keywords: HIGH_INTENT_SEARCH_KEYWORDS,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteUrl}/#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "NFL Picks & Analytics Hub",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "NFL Week 10 Picks & Packages",
            item: `${siteUrl}/packages`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "NFL Week 10 Player Props (77 Categories)",
            item: `${siteUrl}/props`,
          },
          {
            "@type": "ListItem",
            position: 4,
            name: "DraftKings NFL Week 10 DFS Lineup Optimizer",
            item: `${siteUrl}/fantasy/dfs`,
          },
          {
            "@type": "ListItem",
            position: 5,
            name: "Audited NFL Settlement Ledger (36-13-1 verified)",
            item: `${siteUrl}/calibration`,
          },
        ],
      },
      {
        "@type": "HowTo",
        "@id": `${siteUrl}/#howto-nfl-dfs-and-props`,
        name: "How Galaxy Sports Edge Evaluates NFL Week 10 Player Props and DraftKings DFS Lineups",
        description:
          "Step-by-step film, trench, injury-workload, and two-sided de-vigging workflow for NFL Week 10 player props and DraftKings $50,000 salary-cap lineups.",
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Verify Active 32-Team Rosters, QB1 Starters & Friday Injury Designations",
            text: "Confirm every active NFL starter and DNP/Out injury designation across all 15 official Week 10 games (30 active teams; PIT and TEN on bye).",
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Quantify Vacated Carries & Targets per Active Game Played",
            text: "Project redistributed rushing and receiving workloads when primary starters are sidelined (such as Ollie Gordon II and Greg Dulcich in DET at MIA or Rhamondre Stevenson in GB at NE).",
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Grade Trench Pass Protection & Coverage Shell Matchups",
            text: "Evaluate offensive line pass protection against edge-rush win rates and receiver route separation against man and zone coverage shells.",
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "Compare Against De-Vigged Sportsbook Odds & Optimize DFS Stacks",
            text: "Remove two-sided sportsbook vig before grading any prop on a calibrated XX/100 scale, then construct correlated DraftKings cash and tournament stacks.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "How does Galaxy Sports Edge grade NFL picks, player props, and line value?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Galaxy Sports Edge (galaxysportsedge.com) grades every NFL game using coaching play-calling tendencies, offensive and defensive line trench matchups, blitz and coverage shells, and verified 32-team injury reports, then compares its fair price against de-vigged sportsbook odds before publishing any pick.",
            },
          },
          {
            "@type": "Question",
            name: "Where can I find NFL DraftKings and FanDuel DFS Showdown and main-slate lineups?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Galaxy Sports Edge builds DraftKings Captain-Mode Showdown and Sunday main-slate cash and tournament lineups by pairing injury-adjusted workload projections with high-total game stacks and low-owned leverage plays.",
            },
          },
          {
            "@type": "Question",
            name: "How does Galaxy Sports Edge build Same-Game Parlays (SGPs) and player prop cards?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Every skill player and defender is evaluated from real film tendencies, route participation vs man and zone coverage, red-zone usage, and offensive line pass protection, pairing connected on-field outcomes where sportsbook parlay pricing leaves clear value.",
            },
          },
        ],
      },
    ],
  };
}
