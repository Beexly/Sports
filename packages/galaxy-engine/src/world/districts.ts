/**
 * Galaxy Dynasty — District Registry (world-graph architecture).
 *
 * The Campus is the command map; districts are its nodes. This is the single,
 * typed source of truth for what each district IS, what you do there, what it
 * rewards, how it hooks crews/factions/cards/GSE/commerce, and its room type now
 * vs. later. Every district must write progression back to the one account.
 *
 * Pure data — no DB, no Next. The app renders it; tests assert completeness.
 */

export type DistrictId =
  | "war-room"
  | "vault"
  | "crew-hall"
  | "proving-grounds"
  | "blacktop"
  | "depths"
  | "academy"
  | "creator-row"
  | "merch-foundry"
  | "season-gate"
  | "stadium-gates"
  | "my-dynasty";

export type RoomType =
  | "web-native"
  | "solo-interactive"
  | "async-pvp"
  | "pvm-encounter"
  | "phaser-minigame"
  | "2d-district"
  | "colyseus-room"
  | "premium-3d-room"
  | "event-room"
  | "creator-room";

export interface DistrictDef {
  readonly id: DistrictId;
  readonly name: string;
  readonly tagline: string;
  readonly href: string;
  readonly status: "live" | "preview";
  readonly primaryAction: string;
  readonly dailyHook: string;
  readonly weeklyHook: string;
  readonly reward: string;
  readonly gseConnection: string;
  readonly crewConnection: string;
  readonly factionConnection: string;
  readonly cardConnection: string;
  readonly monetizationHook: string;
  readonly roomTypeNow: RoomType;
  readonly roomTypeFuture: RoomType;
  readonly requiredSystems: readonly string[];
  readonly lockedFuture: string;
  readonly brandMotifs: readonly string[];
  /** Admin metric keys this district contributes. */
  readonly metrics: readonly string[];
  /** Stable id for UI tests. */
  readonly testId: string;
  /** Accent hex (Galaxy visual law palette). */
  readonly accent: string;
}

const GOLD = "#F4C95D", BLUE = "#2B5FE3", CYAN = "#00E5FF", MAG = "#FF2DD6", VIOLET = "#7A5CFF";

export const DISTRICTS: readonly DistrictDef[] = [
  {
    id: "war-room",
    name: "The War Room",
    tagline: "Read the board. Make the call. The engine grades it.",
    href: "/galaxy/war-room",
    status: "live",
    primaryAction: "Run a confidence-scored Signal Check",
    dailyHook: "One daily War Room read",
    weeklyHook: "Climb your Sports IQ on the live sport",
    reward: "XP · Credits · Sports IQ · Season Points",
    gseConnection: "Pro 'Sharp Read' intel panel; deepens GSE War Room usage",
    crewConnection: "Builder lane fills crew clash power",
    factionConnection: "Reads feed your faction's power",
    cardConnection: "Card-linked reads surface watchlist prompts",
    monetizationHook: "GSE Pro unlocks deeper read tools (vision, not wins)",
    roomTypeNow: "web-native",
    roomTypeFuture: "premium-3d-room",
    requiredSystems: ["grading-engine", "calibration", "signal-check"],
    lockedFuture: "3D War Room Plaza with live line-movement walls",
    brandMotifs: ["front-office intelligence", "stat geometry", "deep blue"],
    metrics: ["signalChecks", "avgCalibration", "proPromptViews"],
    testId: "district-war-room",
    accent: BLUE,
  },
  {
    id: "proving-grounds",
    name: "The Proving Grounds",
    tagline: "Signal Duels — ranked PvP. Read the same game as your rival.",
    href: "/galaxy/duel",
    status: "live",
    primaryAction: "Duel a Ghost or post an open duel",
    dailyHook: "One ranked duel",
    weeklyHook: "Climb the skill-tiered ladder",
    reward: "Rating · XP · Credits · Galaxy Score",
    gseConnection: "War Room prep prompt before each duel",
    crewConnection: "Sharp lane: win duels for the crew",
    factionConnection: "Duel wins raise faction standing",
    cardConnection: "Card-themed duels (later)",
    monetizationHook: "Pro opponent scouting (context, not outcomes)",
    roomTypeNow: "async-pvp",
    roomTypeFuture: "colyseus-room",
    requiredSystems: ["duel", "rating", "signal-check"],
    lockedFuture: "Live duel lobby; 2v2 / 3v3 formats",
    brandMotifs: ["arena", "stadium lights", "gold"],
    metrics: ["duels", "duelsResolved", "avgRating"],
    testId: "district-proving-grounds",
    accent: GOLD,
  },
  {
    id: "blacktop",
    name: "The Blacktop",
    tagline: "Quick sports-IQ reps. Pure grind, real XP.",
    href: "/galaxy/blacktop",
    status: "live",
    primaryAction: "Play a fast Signal Check mini-game",
    dailyHook: "A daily Blacktop run",
    weeklyHook: "Beat your Signal Sprint streak",
    reward: "XP · Credits · Signal tags",
    gseConnection: "Teaches the signal vocabulary GSE uses",
    crewConnection: "Grinder lane: keep the daily run alive",
    factionConnection: "Reps contribute to faction power",
    cardConnection: "Card-value guess mode",
    monetizationHook: "Cosmetic flair on the Blacktop",
    roomTypeNow: "web-native",
    roomTypeFuture: "phaser-minigame",
    requiredSystems: ["signal-check"],
    lockedFuture: "Phaser arcade room with leaderboards",
    brandMotifs: ["street-level sports", "gold", "night court"],
    metrics: ["blacktopCompletions"],
    testId: "district-blacktop",
    accent: GOLD,
  },
  {
    id: "depths",
    name: "The Depths",
    tagline: "Five bad-logic bosses. Beat the bias.",
    href: "/galaxy/depths",
    status: "live",
    primaryAction: "Fight a PvM boss encounter",
    dailyHook: "The week's featured boss",
    weeklyHook: "Clear the boss rotation",
    reward: "XP · Credits · merch unlock · clear bonus",
    gseConnection: "Each boss maps to a GSE study prompt",
    crewConnection: "Crew co-op raid bar fills from boss runs",
    factionConnection: "Boss clears raise faction standing",
    cardConnection: "Boss-linked card tie-ins",
    monetizationHook: "Achievement-gated merch on clear",
    roomTypeNow: "pvm-encounter",
    roomTypeFuture: "colyseus-room",
    requiredSystems: ["bosses", "signal-check", "raid"],
    lockedFuture: "Live crew raid rooms; hard mode",
    brandMotifs: ["the depths", "antagonist", "magenta"],
    metrics: ["bossAttempts", "bossClears"],
    testId: "district-depths",
    accent: MAG,
  },
  {
    id: "vault",
    name: "The Vault",
    tagline: "Your card collection and companion intelligence.",
    href: "/galaxy/vault",
    status: "live",
    primaryAction: "Open your collection and watchlist",
    dailyHook: "Check card heat",
    weeklyHook: "Grow your watchlist + collection",
    reward: "Collector progress · Galaxy Score",
    gseConnection: "GSE rating overlay on every card",
    crewConnection: "Collector lane: add cards to the watchlist",
    factionConnection: "Faction-linked card sets",
    cardConnection: "This IS the card district",
    monetizationHook: "Card-frame cosmetics; future marketplace",
    roomTypeNow: "web-native",
    roomTypeFuture: "premium-3d-room",
    requiredSystems: ["cards", "card-analytics", "market"],
    lockedFuture: "Premium 3D card gallery (first showcase room)",
    brandMotifs: ["card-vault glow", "gold", "luxury"],
    metrics: ["cardWatches", "tradeOffers"],
    testId: "district-vault",
    accent: GOLD,
  },
  {
    id: "crew-hall",
    name: "Crew Hall",
    tagline: "Form a Crew, run missions, raid together.",
    href: "/galaxy/crew",
    status: "live",
    primaryAction: "Pick a lane and run its mission",
    dailyHook: "Your daily lane task",
    weeklyHook: "Crew Clash + co-op raid",
    reward: "Crew XP · contribution · raid banner",
    gseConnection: "Each lane has a GSE hook",
    crewConnection: "This IS the crew district",
    factionConnection: "Crews fly faction colors",
    cardConnection: "Trader lane works the Vault Market",
    monetizationHook: "Clubhouse customization (cosmetic)",
    roomTypeNow: "web-native",
    roomTypeFuture: "colyseus-room",
    requiredSystems: ["crew", "crew-roles", "crew-clash", "raid"],
    lockedFuture: "Live clubhouse room with presence + chat",
    brandMotifs: ["crew", "clubhouse", "violet"],
    metrics: ["crews", "crewRoleTasks"],
    testId: "district-crew-hall",
    accent: VIOLET,
  },
  {
    id: "academy",
    name: "The Academy",
    tagline: "Learn to read the number, not the narrative.",
    href: "/galaxy/war-room?academy=1",
    status: "live",
    primaryAction: "Complete an Academy Signal Check",
    dailyHook: "A daily lesson rep",
    weeklyHook: "Level the fundamentals",
    reward: "XP · Sports IQ · Credits",
    gseConnection: "Onboards the GSE way of thinking",
    crewConnection: "New members start here",
    factionConnection: "Sets your starting lane",
    cardConnection: "Teaches card-reading basics",
    monetizationHook: "Funnel to GSE Pro",
    roomTypeNow: "web-native",
    roomTypeFuture: "2d-district",
    requiredSystems: ["signal-check", "calibration"],
    lockedFuture: "2D campus classroom district",
    brandMotifs: ["campus", "training facility", "cyan"],
    metrics: ["academyChecks"],
    testId: "district-academy",
    accent: CYAN,
  },
  {
    id: "creator-row",
    name: "Creator Row",
    tagline: "Curated challenge gauntlets from the community.",
    href: "/galaxy/creators",
    status: "live",
    primaryAction: "Run a Creator Gauntlet",
    dailyHook: "Today's featured gauntlet",
    weeklyHook: "Clear new creator sets",
    reward: "XP · Season Points",
    gseConnection: "Creator challenges teach GSE concepts",
    crewConnection: "Creator lane publishes challenges",
    factionConnection: "Faction creator boards (later)",
    cardConnection: "Card-themed gauntlets",
    monetizationHook: "Creator tools (later); subscription",
    roomTypeNow: "web-native",
    roomTypeFuture: "creator-room",
    requiredSystems: ["signal-check", "content"],
    lockedFuture: "Creator storefront street + UGC moderation",
    brandMotifs: ["creator row", "street", "violet"],
    metrics: ["creatorRuns"],
    testId: "district-creator-row",
    accent: VIOLET,
  },
  {
    id: "merch-foundry",
    name: "The Merch Foundry",
    tagline: "Earned unlocks, cosmetics, and the Wardrobe.",
    href: "/galaxy/store",
    status: "live",
    primaryAction: "Claim unlocks; equip cosmetics",
    dailyHook: "Check season drops",
    weeklyHook: "Unlock the season's gear",
    reward: "Merch entitlements · cosmetics",
    gseConnection: "GSE Pro upgrade path lives here",
    crewConnection: "Crew cosmetics (later)",
    factionConnection: "Faction banners",
    cardConnection: "Card-frame cosmetics",
    monetizationHook: "Nova (test mode) · merch · subscription · boosts",
    roomTypeNow: "web-native",
    roomTypeFuture: "premium-3d-room",
    requiredSystems: ["store", "cosmetics", "consumables"],
    lockedFuture: "Premium 3D Merch Foundry room",
    brandMotifs: ["foundry", "gold", "merch as proof"],
    metrics: ["merchUnlocks"],
    testId: "district-merch-foundry",
    accent: GOLD,
  },
  {
    id: "season-gate",
    name: "Signal Cup",
    tagline: "The season program — climb the tiers.",
    href: "/galaxy/season",
    status: "live",
    primaryAction: "Claim season tiers; chase objectives",
    dailyHook: "Daily season objective",
    weeklyHook: "Weekly season objective",
    reward: "Season tiers · Credits · cosmetics",
    gseConnection: "Pro season objectives add depth",
    crewConnection: "Crew season contribution",
    factionConnection: "Faction season race",
    cardConnection: "Season card sets",
    monetizationHook: "Free + Pro track (Pro = depth, not outcomes)",
    roomTypeNow: "web-native",
    roomTypeFuture: "event-room",
    requiredSystems: ["season"],
    lockedFuture: "Live season finale event rooms",
    brandMotifs: ["season campaign board", "cyan", "cup"],
    metrics: ["seasonProgress"],
    testId: "district-season-gate",
    accent: CYAN,
  },
  {
    id: "stadium-gates",
    name: "Stadium Gates",
    tagline: "Sport-by-sport campaign portals.",
    href: "/galaxy/stadium",
    status: "live",
    primaryAction: "Enter a sport's campaign",
    dailyHook: "Today's featured sport quest",
    weeklyHook: "Sport-specific boss + card prompt",
    reward: "Sport-specific XP route",
    gseConnection: "Sport-specific GSE content prompts",
    crewConnection: "Sport-focused crew missions",
    factionConnection: "Sport-themed faction pushes",
    cardConnection: "Sport-specific card prompts",
    monetizationHook: "Sport-themed cosmetics",
    roomTypeNow: "web-native",
    roomTypeFuture: "event-room",
    requiredSystems: ["world-state"],
    lockedFuture: "Live season portals per sport",
    brandMotifs: ["stadium gates", "deep blue", "portals"],
    metrics: ["stadiumGateClicks"],
    testId: "district-stadium-gates",
    accent: BLUE,
  },
  {
    id: "my-dynasty",
    name: "My Dynasty",
    tagline: "Your record, rating, badges, and status.",
    href: "/galaxy/dynasty",
    status: "live",
    primaryAction: "Review your profile and Galaxy Score",
    dailyHook: "See what advanced today",
    weeklyHook: "Track your climb",
    reward: "Identity · status",
    gseConnection: "Galaxy Score breakdown (GSE-derived)",
    crewConnection: "Your crew + role",
    factionConnection: "Your faction standing",
    cardConnection: "Your collection summary",
    monetizationHook: "Cosmetic flex; Crib decor",
    roomTypeNow: "web-native",
    roomTypeFuture: "premium-3d-room",
    requiredSystems: ["profile", "galaxy-score"],
    lockedFuture: "Walkable 3D Crib",
    brandMotifs: ["locker room", "identity", "cyan"],
    metrics: ["campusVisits"],
    testId: "district-my-dynasty",
    accent: CYAN,
  },
] as const;

const INDEX: ReadonlyMap<DistrictId, DistrictDef> = new Map(DISTRICTS.map((d) => [d.id, d]));

export function getDistrict(id: DistrictId): DistrictDef | null {
  return INDEX.get(id) ?? null;
}
export function isDistrictId(value: string): value is DistrictId {
  return INDEX.has(value as DistrictId);
}
