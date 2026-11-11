/**
 * apps/web/lib/content-os/video-and-revenue-engine.ts
 *
 * Typed Content-OS & Multi-Stream Revenue / Short-Form Video / DFS / Week 10 Commercial Posture surface.
 * Strictly adheres to:
 *  - Official New Engine Verified Record (36-13-1, 73.5%, +20.14u entering Week 10:
 *    16-5-0 +10.45u pre-TNF prior + 14-6-1 +7.19u TNF CAR@GB + 6-2-0 +2.50u Sun Nov 1).
 *    All-in secondary view 47-19-1 (+24.92u) is labeled secondary wherever it appears.
 *  - Customer-Facing Human Copy Doctrine (natural football-film & matchup analysis; zero internal pipeline jargon).
 *  - Paywall Protection Doctrine (public previews share game-environment analytics; official plays & full DFS lineups stay behind `/packages` and `/fantasy/dfs`).
 */

export interface OfficialVerifiedRecordSummary {
  readonly record: "36-13-1";
  readonly wins: 36;
  readonly losses: 13;
  readonly pushes: 1;
  readonly winRateLabel: "73.5%";
  readonly netUnits: 20.14;
  readonly preWeek8Record: "16-5-0";
  readonly preWeek8Units: 10.45;
  readonly tnfRecord: "14-6-1";
  readonly tnfUnits: 7.19;
  readonly sundayRecord: "6-2-0";
  readonly sundayUnits: 2.5;
  readonly paywallCheckoutUrl: "https://www.galaxysportsedge.com/packages";
  readonly dfsHubUrl: "https://www.galaxysportsedge.com/fantasy/dfs";
}

export interface ShortFormVideoScriptPacket {
  readonly videoId: string;
  readonly title: string;
  readonly platforms: readonly ("TikTok" | "YouTube Shorts" | "Instagram Reels" | "X Video")[];
  readonly durationSeconds: number;
  readonly aspectRatio: "9:16 (1080x1920 60fps)";
  readonly hook0To3s: string;
  readonly filmBreakdown3To25s: string;
  readonly matchupOverlay25To45s: string;
  readonly ctaPaywallAndFollow45To60s: string;
  readonly remotionCompositionId: string;
  readonly paywallSafe: true;
}

export interface RevenueStreamAttributionItem {
  readonly streamId: string;
  readonly channel: string;
  readonly identifierOrUrl: string;
  readonly monetizationRole: string;
  readonly posthogEvents: readonly string[];
  readonly active: true;
}

export interface DfsAndPlaysCommercialPosture {
  readonly verifiedRecord: OfficialVerifiedRecordSummary;
  readonly fullBoardMarketTypesReviewed: 77;
  readonly dfsPlatformsSupported: readonly ["DraftKings", "FanDuel"];
  readonly publicTeasersShareEnvironmentOnly: true;
  readonly officialPicksAndLineupsGated: true;
  readonly adsensePublisherId: "ca-pub-8151105906877749";
  readonly posthogProjectId: "516325";
}

const VERIFIED_RECORD_SUMMARY: OfficialVerifiedRecordSummary = {
  record: "36-13-1",
  wins: 36,
  losses: 13,
  pushes: 1,
  winRateLabel: "73.5%",
  netUnits: 20.14,
  preWeek8Record: "16-5-0",
  preWeek8Units: 10.45,
  tnfRecord: "14-6-1",
  tnfUnits: 7.19,
  sundayRecord: "6-2-0",
  sundayUnits: 2.5,
  paywallCheckoutUrl: "https://www.galaxysportsedge.com/packages",
  dfsHubUrl: "https://www.galaxysportsedge.com/fantasy/dfs",
};

const MULTI_CHANNEL_VIDEO_SCRIPTS: readonly ShortFormVideoScriptPacket[] = [
  {
    videoId: "VID-W9-01",
    title: "Why Road Offenses Lose 0.2 Seconds at the Snap in Loud Indoor Stadiums",
    platforms: ["TikTok", "YouTube Shorts", "Instagram Reels", "X Video"],
    durationSeconds: 52,
    aspectRatio: "9:16 (1080x1920 60fps)",
    hook0To3s:
      "Watch the right guard's left hand right before the snap—this silent-count delay is why road pass protection breaks down in loud domes.",
    filmBreakdown3To25s:
      "In a loud indoor stadium, offensive tackles cannot hear the quarterback's cadence. They wait for the guard's hand tap and the center's head bob while the defensive end keys the football directly—giving the pass rusher a clean first-step advantage off the edge.",
    matchupOverlay25To45s:
      "When an offensive tackle loses that initial half-step against a wide-9 speed rusher, the quarterback must get the ball out in under 2.4 seconds to his slot receiver or tight end.",
    ctaPaywallAndFollow45To60s:
      "We broke down every Week 10 trench matchup for our verified 36-13-1 (+20.14u) card. Follow now and unlock the full Week 10 board at galaxysportsedge.com/packages.",
    remotionCompositionId: "GseVerticalFilmBreakdownV1",
    paywallSafe: true,
  },
  {
    videoId: "VID-W9-02",
    title: "How Two-High Safety Disguises Trap Quarterbacks After the Snap",
    platforms: ["TikTok", "YouTube Shorts", "Instagram Reels", "X Video"],
    durationSeconds: 48,
    aspectRatio: "9:16 (1080x1920 60fps)",
    hook0To3s:
      "Before the snap, this looks like standard two-high zone—watch what happens the instant the football is snapped.",
    filmBreakdown3To25s:
      "The boundary safety spins down into the middle robber window while the slot defender brings pressure. By the time the quarterback resets his eyes from the rotating safety to his backside progression, interior pressure closes the pocket.",
    matchupOverlay25To45s:
      "Against disguised post-snap safety rotations, running back checkdowns and underneath tight end option routes spike while deep boundary throws stall.",
    ctaPaywallAndFollow45To60s:
      "Our verified engine is 36-13-1 (73.5%, +20.14u) entering Week 10. Follow for daily film analysis and unlock every official Week 10 play at galaxysportsedge.com/packages.",
    remotionCompositionId: "GseVerticalSafetySpinV1",
    paywallSafe: true,
  },
  {
    videoId: "VID-W9-03",
    title: "The 1st-Quarter Scripted Play-Call Edge on the Week 10 Board",
    platforms: ["TikTok", "YouTube Shorts", "Instagram Reels", "X Video"],
    durationSeconds: 50,
    aspectRatio: "9:16 (1080x1920 60fps)",
    hook0To3s:
      "The first 15 plays of an NFL game are scripted all week—making 1st-quarter markets completely distinct from full-game lines.",
    filmBreakdown3To25s:
      "Before second-half score effects take over, offensive coordinators dial up their highest-percentage schemed touches on Drive 1 and Drive 2.",
    matchupOverlay25To45s:
      "Offenses that script high early-down pass rates in the opening quarter create concentrated early receiving volume before defensive adjustments at halftime.",
    ctaPaywallAndFollow45To60s:
      "We review all 77 market types on every game—backed by our verified 36-13-1 (+20.14u) record. Unlock full Week 10 access at galaxysportsedge.com/packages.",
    remotionCompositionId: "GseVerticalFirstQuarterScriptV1",
    paywallSafe: true,
  },
  {
    videoId: "VID-W9-04",
    title: "How to Structure Week 10 DraftKings & FanDuel Tournament Stacks",
    platforms: ["TikTok", "YouTube Shorts", "Instagram Reels", "X Video"],
    durationSeconds: 55,
    aspectRatio: "9:16 (1080x1920 60fps)",
    hook0To3s:
      "Stop building uncorrelated DFS lineups—here is how sharp tournament players structure Week 10 stacks for ceiling.",
    filmBreakdown3To25s:
      "Large-field tournament wins require concentrated play volume in high-pace games where a fourth-quarter score forces the trailing offense to pass on every snap.",
    matchupOverlay25To45s:
      "Pairing a high-ceiling quarterback with his primary red-zone target and a low-owned secondary pass catcher captures the 300-yard bonus while separating from chalk lineups.",
    ctaPaywallAndFollow45To60s:
      "Our Week 10 DraftKings and FanDuel Cash Core and GPP leverage stacks are live now at galaxysportsedge.com/fantasy/dfs.",
    remotionCompositionId: "GseVerticalDfsStackBlueprintV1",
    paywallSafe: true,
  },
  {
    videoId: "VID-W9-05",
    title: "Why Kicking Points & Defensive Sack Props Hold Massive Week 10 Value",
    platforms: ["TikTok", "YouTube Shorts", "Instagram Reels", "X Video"],
    durationSeconds: 47,
    aspectRatio: "9:16 (1080x1920 60fps)",
    hook0To3s:
      "Most bettors only look at passing yards—while the biggest pricing gaps sit in kicking points and defensive sack markets.",
    filmBreakdown3To25s:
      "When an offense moves efficiently between the 20s but faces a condensed red-zone defense indoors, drives repeatedly stall between the 15 and 28 yard line—setting up multiple field-goal attempts.",
    matchupOverlay25To45s:
      "On the defensive side, when a premier edge rusher faces a backup tackle against a pass-heavy game script, half-sack clearance opportunities climb sharply.",
    ctaPaywallAndFollow45To60s:
      "Our 360-degree Week 10 board review covers kicking, defensive sacks, quarters, halves, and player props. Unlock the verified 36-13-1 (+20.14u) card at galaxysportsedge.com/packages.",
    remotionCompositionId: "GseVerticalKickingAndIdpEdgeV1",
    paywallSafe: true,
  },
];

const REVENUE_ATTRIBUTION_MATRIX: readonly RevenueStreamAttributionItem[] = [
  {
    streamId: "REV-01",
    channel: "Stripe Subscriptions & Day/Week Passes",
    identifierOrUrl: "https://www.galaxysportsedge.com/packages",
    monetizationRole: "Instant paywall unlock for official Week 10 sides, totals, player props, SGP tickets, and DFS cores.",
    posthogEvents: ["package_checkout_started", "subscription_activated"],
    active: true,
  },
  {
    streamId: "REV-02",
    channel: "Google AdSense Display Monetization",
    identifierOrUrl: "ca-pub-8151105906877749",
    monetizationRole: "Verified ads.txt & AdSense display monetization on public research and preview pages (suppressed on /embed/*).",
    posthogEvents: ["public_research_viewed", "adsense_slot_rendered"],
    active: true,
  },
  {
    streamId: "REV-03",
    channel: "Whop Storefront & VIP Community",
    identifierOrUrl: "https://whop.com/galaxy-sports-edge",
    monetizationRole: "Cross-platform membership checkout & automated community entitlement sync.",
    posthogEvents: ["whop_storefront_clicked", "whop_membership_synced"],
    active: true,
  },
  {
    streamId: "REV-04",
    channel: "Impact.com Partner Network",
    identifierOrUrl: "Impact Account 8111208",
    monetizationRole: "Verified CPA and revenue-share attribution across partner sportsbooks and fantasy platforms.",
    posthogEvents: ["affiliate_partner_clicked", "impact_conversion_logged"],
    active: true,
  },
  {
    streamId: "REV-05",
    channel: "OddsJam Execution Referral",
    identifierOrUrl: "https://oddsjam.com/?ref=zwniodg",
    monetizationRole: "Partner referral attribution on line-shopping and price-comparison tools.",
    posthogEvents: ["oddsjam_referral_clicked"],
    active: true,
  },
  {
    streamId: "REV-06",
    channel: "CapperTek Verified Leaderboard Funnel",
    identifierOrUrl: "CapperTek Verified Tracker (36-13-1, +20.14u)",
    monetizationRole: "Verified third-party record distribution driving high-intent subscribers to /packages.",
    posthogEvents: ["cappertek_referral_landed", "package_checkout_started"],
    active: true,
  },
  {
    streamId: "REV-07",
    channel: "Short-Form Video Creator Monetization (TikTok, Shorts, Reels, X)",
    identifierOrUrl: "VID-W9-01..05 Vertical Storyboard Feed",
    monetizationRole: "Platform video ad-share plus organic follower flywheel routing to /packages and /fantasy/dfs.",
    posthogEvents: ["video_hook_viewed", "social_cta_clicked", "dfs_hub_viewed"],
    active: true,
  },
];

export function getWeek9VideoAndRevenueSummary(): OfficialVerifiedRecordSummary {
  return VERIFIED_RECORD_SUMMARY;
}

export function getMultiChannelVideoScripts(): readonly ShortFormVideoScriptPacket[] {
  return MULTI_CHANNEL_VIDEO_SCRIPTS;
}

export function getDfsAndPlaysCommercialPosture(): DfsAndPlaysCommercialPosture {
  return {
    verifiedRecord: VERIFIED_RECORD_SUMMARY,
    fullBoardMarketTypesReviewed: 77,
    dfsPlatformsSupported: ["DraftKings", "FanDuel"],
    publicTeasersShareEnvironmentOnly: true,
    officialPicksAndLineupsGated: true,
    adsensePublisherId: "ca-pub-8151105906877749",
    posthogProjectId: "516325",
  };
}

export function getRevenueStreamAttributionMatrix(): readonly RevenueStreamAttributionItem[] {
  return REVENUE_ATTRIBUTION_MATRIX;
}

export interface SocialEngagementItem {
  readonly id: string;
  readonly channel: "X Thread" | "X Poll / Hook" | "IG / Threads Carousel";
  readonly headline: string;
  readonly copy: string;
  readonly ctaUrl: "https://www.galaxysportsedge.com/packages" | "https://www.galaxysportsedge.com/fantasy/dfs";
  readonly paywallSafe: true;
}

const WEEK9_SOCIAL_ENGAGEMENT_PACK: readonly SocialEngagementItem[] = [
  {
    id: "X-THREAD-W9-01",
    channel: "X Thread",
    headline: "Week 10 Flagship 12-Post Film & Matchup Environment Thread",
    copy:
      "NFL Week 10 Film & Matchup Environment Thread: NE @ DET slot/motion duel, LV @ SF (Brock Purdy + Mike Evans red-zone leverage), NYJ @ KC (Geno Smith hot-read timing vs Spagnuolo blitz), ARI @ SEA (Sam Darnold slot volume vs Gardner Minshew II checkdowns), LAR @ WAS (Jayden Daniels + Stefon Diggs tempo), and LAC @ BAL (Josh Allen vs Carson Wentz & Flores simulated pressure). Verified 36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u).",
    ctaUrl: "https://www.galaxysportsedge.com/packages",
    paywallSafe: true,
  },
  {
    id: "X-POLL-W9-01",
    channel: "X Poll / Hook",
    headline: "Silent-Count Pass-Rush Trench Mismatch Poll",
    copy:
      "Which Week 10 offensive line faces the toughest silent-count pass-rush test? A) NYJ tackles at Arrowhead (protecting Geno Smith) B) ARI tackles at Seattle (protecting Gardner Minshew II) C) BUF line at Minnesota vs A-gap blitzes D) LV line at San Francisco vs wide-9 edge rush.",
    ctaUrl: "https://www.galaxysportsedge.com/packages",
    paywallSafe: true,
  },
  {
    id: "X-HOOK-W9-02",
    channel: "X Poll / Hook",
    headline: "2026 Alpha WR Red-Zone Call Hook",
    copy:
      "One receiver needs a touchdown inside the 15-yard line with the game on the line in Week 10: Mike Evans (SF WR) from Brock Purdy, Davante Adams (LAR WR) from Matthew Stafford, Amon-Ra St. Brown (DET WR) from Jared Goff, or Justin Jefferson (MIN WR) from Carson Wentz?",
    ctaUrl: "https://www.galaxysportsedge.com/packages",
    paywallSafe: true,
  },
  {
    id: "IG-CAROUSEL-W9-01",
    channel: "IG / Threads Carousel",
    headline: "8-Slide Week 10 Film & Matchup Blueprint Carousel",
    copy:
      "8-Slide Carousel covering NE @ DET, LV @ SF (Mike Evans), NYJ @ KC (Geno Smith), ARI @ SEA (Sam Darnold), LAR @ WAS (Jayden Daniels + Stefon Diggs), 1Q Scripted Touches, Kicking/Sack Pricing Gaps, and Week 10 DraftKings/FanDuel Stacking Rules.",
    ctaUrl: "https://www.galaxysportsedge.com/fantasy/dfs",
    paywallSafe: true,
  },
];

export function getWeek9SocialEngagementPack(): readonly SocialEngagementItem[] {
  return WEEK9_SOCIAL_ENGAGEMENT_PACK;
}

