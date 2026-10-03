import type { MediaPlatform } from "./platform-strategy";

export type GseContentPillar =
  | "market_mirage"
  | "no_bet_clinic"
  | "loss_autopsy"
  | "player_signal_lab"
  | "gse_lab"
  | "sports_data_business"
  | "founder_build_log"
  | "decision_psychology"
  | "partner_tool_review"
  | "board_meeting";

export interface ContentPillarDefinition {
  readonly id: GseContentPillar;
  readonly name: string;
  readonly description: string;
  readonly audience: string;
  readonly coreIdea: string;
  readonly primaryPlatforms: readonly MediaPlatform[];
  readonly revenuePaths: readonly string[];
  readonly exampleHooks: readonly string[];
  readonly exampleFormats: readonly string[];
  readonly complianceNotes: readonly string[];
  readonly repoTieIn: string;
  readonly recommendedCadence: string;
  readonly exampleCtas: readonly string[];
  readonly failureModes: readonly string[];
}

export const CONTENT_PILLARS: readonly ContentPillarDefinition[] = [
  {
    audience: "Sports fans who know the public story is often incomplete.",
    complianceNotes: ["Educational framing only.", "No outcome certainty language.", "Explain stale market risk when line movement is discussed."],
    coreIdea: "The obvious public story may not be the true market signal.",
    description: "Dissects noisy line movement, consensus fragility, and public narratives without claiming an edge without proof.",
    exampleCtas: ["Join the newsletter for the weekly board.", "Read the market methodology."],
    exampleFormats: ["60 second market read", "8 minute explainer", "newsletter chart note"],
    exampleHooks: ["Everyone is reading this line wrong.", "The line moved, but the signal did not.", "This total looks obvious. That is the trap."],
    failureModes: ["Treating line movement as proof.", "Using sharp-money language without a verified source.", "Implying a bet is required."],
    id: "market_mirage",
    name: "Market Mirage",
    primaryPlatforms: ["youtube_long", "youtube_short", "tiktok", "x_thread", "newsletter"],
    recommendedCadence: "One long-form or newsletter segment weekly, plus short clips when slate context supports it.",
    repoTieIn: "Connects to market gravity, stale-line gates, CLV policy, and source reliability.",
    revenuePaths: ["newsletter", "subscription", "sports data partners", "odds tool partners"],
  },
  {
    audience: "Fans tired of forced action and tout framing.",
    complianceNotes: ["Never shame a pass.", "Use responsible-play language when betting context is present.", "Do not imply certain loss avoidance."],
    coreIdea: "Passing is intelligent when evidence is weak.",
    description: "Turns no-play decisions into a core trust asset.",
    exampleCtas: ["Save this before the next slate.", "Subscribe for the no-bet board notes."],
    exampleFormats: ["short-form clinic", "board meeting segment", "carousel checklist"],
    exampleHooks: ["The smartest play here may be no play.", "This is why GSE passed.", "No bet is a position."],
    failureModes: ["Making no-bet posture feel performative.", "Replacing evidence with vibes.", "Overexplaining without a clear takeaway."],
    id: "no_bet_clinic",
    name: "No-Bet Clinic",
    primaryPlatforms: ["youtube_short", "tiktok", "instagram_reel", "newsletter"],
    recommendedCadence: "Two short clinics per week during active slates.",
    repoTieIn: "Connects to no-bet pressure, freshness gates, calibration debt, and decision quality.",
    revenuePaths: ["trust", "subscription conversion", "responsible partner positioning"],
  },
  {
    audience: "Subscribers and skeptical observers who want process accountability.",
    complianceNotes: ["No cherry-picked performance claims.", "Use settled evidence only.", "Avoid implying one loss proves or disproves a model."],
    coreIdea: "Failures become trust assets when they are inspected clearly.",
    description: "Explains what failed, what was variance, and what changes after a missed read.",
    exampleCtas: ["Read the model journal.", "Send this to someone posting only wins."],
    exampleFormats: ["long-form autopsy", "newsletter note", "post-game short"],
    exampleHooks: ["We lost. Here is the autopsy.", "Variance or bad process?", "Why a win can still be a bad pick."],
    failureModes: ["Excuse-making.", "Hiding the original claim.", "Drawing broad lessons from tiny samples."],
    id: "loss_autopsy",
    name: "Loss Autopsy",
    primaryPlatforms: ["youtube_long", "newsletter", "linkedin", "x_thread"],
    recommendedCadence: "One public autopsy when there is settled evidence worth teaching.",
    repoTieIn: "Connects to loss room, performance policy, model journal, and replayable provenance.",
    revenuePaths: ["credibility", "retention"],
  },
  {
    audience: "Fantasy, player prop, and data-curious NFL audiences.",
    complianceNotes: ["Do not fabricate role data.", "Separate expectation from outcome.", "Use source attribution and freshness notes."],
    coreIdea: "Box scores lie; role, difficulty, and expectation tell the truth.",
    description: "Explains player role signals, target quality, opportunity, and scheme-created production.",
    exampleCtas: ["Join the watchlist.", "Read the player signal lab note."],
    exampleFormats: ["player short", "role volatility chart", "fantasy newsletter section"],
    exampleHooks: ["His box score was bad. His role was elite.", "Target share alone is lying to you.", "YAC creation vs scheme-created yards."],
    failureModes: ["Overstating props.", "Using hidden estimates as public facts.", "Confusing role signal with prediction certainty."],
    id: "player_signal_lab",
    name: "Player Signal Lab",
    primaryPlatforms: ["youtube_short", "instagram_carousel", "newsletter", "youtube_long"],
    recommendedCadence: "Two player-signal posts per week in season.",
    repoTieIn: "Connects to player opportunity, source reliability, proprietary metric bible, and fantasy surfaces.",
    revenuePaths: ["fantasy partners", "player prop audience", "newsletter", "API/data interest"],
  },
  {
    audience: "Builders, operators, AI governance people, and early GSE followers.",
    complianceNotes: ["Do not claim production readiness without proof.", "Do not expose secrets or internal access.", "Mark demos and fixtures clearly."],
    coreIdea: "Build the most auditable sports intelligence engine in public.",
    description: "Shows the product being built with proof, blockers, gates, and decisions.",
    exampleCtas: ["Follow the build log.", "Join the API waitlist."],
    exampleFormats: ["founder video", "screen-recorded walkthrough", "technical newsletter"],
    exampleHooks: ["I am building a sports AI that is allowed to say no.", "Confidence is not probability.", "The hardest part is proof."],
    failureModes: ["Turning into hype.", "Showing unreviewed internals.", "Calling draft systems live."],
    id: "gse_lab",
    name: "GSE Lab",
    primaryPlatforms: ["youtube_long", "linkedin", "x_thread", "newsletter"],
    recommendedCadence: "One lab/build piece per week.",
    repoTieIn: "Connects to FABLE evidence, guardrails, cockpit, and metric governance.",
    revenuePaths: ["API waitlist", "founder trust", "AI/dev partners"],
  },
  {
    audience: "Sports data buyers, builders, analysts, and partner prospects.",
    complianceNotes: ["No unverified provider claims.", "No scraped-data instructions that bypass terms.", "Distinguish public facts from licensed data."],
    coreIdea: "Raw sports data is not intelligence.",
    description: "Educates on data rights, APIs, pricing, freshness, and operational value.",
    exampleCtas: ["Read the source policy.", "Talk to GSE about data workflows."],
    exampleFormats: ["LinkedIn explainer", "YouTube business essay", "newsletter teardown"],
    exampleHooks: ["Why sports APIs are expensive.", "Odds feeds are not edge.", "What a sports data API actually sells."],
    failureModes: ["Vendor dunking without evidence.", "Encouraging terms violations.", "Confusing technical access with commercial rights."],
    id: "sports_data_business",
    name: "Sports Data / API Business",
    primaryPlatforms: ["linkedin", "youtube_long", "newsletter", "x_thread"],
    recommendedCadence: "Two business/data posts per month.",
    repoTieIn: "Connects to source-rights registry, provider policy, data ingestion, and AWS/FABLE docs.",
    revenuePaths: ["B2B", "dev tools", "partnerships"],
  },
  {
    audience: "People following the human build-in-public story.",
    complianceNotes: ["Stay disciplined and truthful.", "Do not make pressure the product.", "Avoid pity framing."],
    coreIdea: "The human founder journey should reinforce proof and discipline.",
    description: "Shows what moved, what blocked progress, and why the project exists.",
    exampleCtas: ["Follow the build.", "Reply with a useful partner lead."],
    exampleFormats: ["daily note", "weekly video", "LinkedIn build update"],
    exampleHooks: ["I worked 13 hours today. Here is what mattered.", "Building GSE under pressure.", "Why I am not waiting for perfect."],
    failureModes: ["Chaos posting.", "Oversharing private stress.", "Replacing shipped proof with intensity."],
    id: "founder_build_log",
    name: "Founder Build Log",
    primaryPlatforms: ["linkedin", "x_thread", "tiktok", "newsletter"],
    recommendedCadence: "One disciplined founder note weekly, more only when there is real progress.",
    repoTieIn: "Connects to release notes, final reports, branch handoffs, and public proof docs.",
    revenuePaths: ["trust", "audience", "partnerships"],
  },
  {
    audience: "Sports bettors, fantasy players, and operators trying to make better decisions.",
    complianceNotes: ["Educational only.", "No personalized betting advice.", "Use responsible-play posture for betting examples."],
    coreIdea: "Bad decisions compound faster than bad models.",
    description: "Explains cognitive traps, action bias, loss chasing, and evidence discipline.",
    exampleCtas: ["Use the checklist before kickoff.", "Read responsible play."],
    exampleFormats: ["short lesson", "carousel framework", "newsletter checklist"],
    exampleHooks: ["Chasing losses is a system failure.", "The brain wants action. The model wants evidence.", "Confidence feels better than uncertainty."],
    failureModes: ["Sounding preachy.", "Ignoring entertainment context.", "Turning behavior advice into financial advice."],
    id: "decision_psychology",
    name: "Betting Psychology / Decision Discipline",
    primaryPlatforms: ["youtube_short", "instagram_carousel", "tiktok", "newsletter"],
    recommendedCadence: "One short lesson weekly.",
    repoTieIn: "Connects to responsible-play, no-bet pressure, and confidence display policy.",
    revenuePaths: ["education", "responsible positioning", "membership"],
  },
  {
    audience: "Builders and sports fans who want better tools without spammy affiliate framing.",
    complianceNotes: ["Disclose affiliate or sponsor relationships.", "No fake endorsement.", "Do not review tools you have not used or researched."],
    coreIdea: "Tools should be judged by workflow value, evidence, and fit.",
    description: "Reviews creator, sports data, fantasy, AI, and dev tools in the context of GSE workflows.",
    exampleCtas: ["See the tool checklist.", "Partner inquiries are open."],
    exampleFormats: ["tool teardown", "workflow walkthrough", "sponsor-integrated segment"],
    exampleHooks: ["Tools I am using to build GSE.", "How one GSE idea becomes ten content pieces.", "Raw tools vs real workflow."],
    failureModes: ["Undisclosed paid placement.", "Reviewing without use.", "Letting sponsor preference affect editorial conclusions."],
    id: "partner_tool_review",
    name: "Partner / Tool Reviews",
    primaryPlatforms: ["youtube_long", "linkedin", "newsletter", "instagram_reel"],
    recommendedCadence: "One partner/tool piece every two weeks after review standards are met.",
    repoTieIn: "Connects to partner fit scoring, sponsor packages, source rights, and workflow docs.",
    revenuePaths: ["affiliate", "sponsors", "partner content"],
  },
  {
    audience: "Core community, partners, and future podcast listeners.",
    complianceNotes: ["Distinguish shipped, blocked, and planned work.", "Do not disclose private source or partner details.", "No unsupported performance claims."],
    coreIdea: "A weekly flagship ties the whole GSE system together.",
    description: "Recurring show format covering what shipped, broke, was learned, was passed on, and what partners are being sought.",
    exampleCtas: ["Sponsor the board meeting.", "Join the newsletter for notes."],
    exampleFormats: ["20 minute video", "podcast feed", "newsletter recap"],
    exampleHooks: ["The weekly GSE board is open.", "What shipped, what broke, what we passed on.", "This is the week proof mattered."],
    failureModes: ["Too much inside baseball.", "Turning into a picks show.", "Not separating facts from plans."],
    id: "board_meeting",
    name: "Weekly GSE Board Meeting",
    primaryPlatforms: ["youtube_long", "podcast", "newsletter", "linkedin"],
    recommendedCadence: "Weekly when enough proof exists; start as newsletter/video notes.",
    repoTieIn: "Connects to cockpit, FABLE reports, model journal, and partner asks.",
    revenuePaths: ["sponsor slot", "newsletter", "podcast"],
  },
] as const;

export const CONTENT_PILLARS_BY_ID: Readonly<Record<GseContentPillar, ContentPillarDefinition>> =
  Object.fromEntries(CONTENT_PILLARS.map((pillar) => [pillar.id, pillar])) as Readonly<Record<GseContentPillar, ContentPillarDefinition>>;
