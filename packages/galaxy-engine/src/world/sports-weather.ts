/**
 * Galaxy Dynasty — Sports Weather (the live world layer).
 *
 * The open world isn't geography — it's the live sports ecosystem. "Weather"
 * states shift district copy, quest recommendations, boss rotation, card prompts,
 * GSE prompts, and crew/faction missions. Deterministic fixtures now; the
 * interface is designed so a live sports feed can replace the rotation later.
 *
 * Pure data. `affectedDistricts` are validated against the District Registry in
 * tests so weather can never point at a district that doesn't exist.
 */

import type { DistrictId } from "./districts.js";

export type WeatherId =
  | "upset_storm"
  | "rookie_heat"
  | "injury_fog"
  | "trade_shock"
  | "playoff_pressure"
  | "public_collapse"
  | "card_heat"
  | "rivalry_surge"
  | "deadline_shock"
  | "championship_gravity"
  | "fantasy_waiver_surge"
  | "slump_watch"
  | "breakout_signal"
  | "market_whiplash";

export interface SportsWeather {
  readonly id: WeatherId;
  readonly name: string;
  readonly summary: string;
  readonly affectedDistricts: readonly DistrictId[];
  readonly bossRotation: readonly string[];
  readonly cardPrompts: readonly string[];
  readonly gsePrompt: string;
  readonly questPrompt: string;
  readonly crewPrompt: string;
  readonly factionPrompt: string;
  readonly adminAlert: string;
  readonly accent: string;
}

const GOLD = "#F4C95D", BLUE = "#2B5FE3", CYAN = "#00E5FF", MAG = "#FF2DD6", VIOLET = "#7A5CFF";

export const SPORTS_WEATHER: readonly SportsWeather[] = [
  {
    id: "upset_storm",
    name: "Upset Storm",
    summary: "Favorites are falling. Crowd reads are collapsing across the board.",
    affectedDistricts: ["war-room", "depths", "proving-grounds"],
    bossRotation: ["public_trap"],
    cardPrompts: ["Watch the underdogs who just broke out"],
    gsePrompt: "Open the public-pressure splits in the War Room",
    questPrompt: "Read a value side against the public in the War Room",
    crewPrompt: "Assign a Sharp to fade the chalk today",
    factionPrompt: "Mavericks earn bonus standing on contrarian reads",
    adminAlert: "Upset Storm active — expect elevated War Room + Depths traffic",
    accent: MAG,
  },
  {
    id: "rookie_heat",
    name: "Rookie Heat",
    summary: "Young players are moving the board. Scouts and Collectors have bonus missions.",
    affectedDistricts: ["vault", "academy", "war-room"],
    bossRotation: ["recency_wraith"],
    cardPrompts: ["Add two rookie cards to your watchlist"],
    gsePrompt: "Open the rookie breakout board",
    questPrompt: "Run a Signal Check on a rookie spot",
    crewPrompt: "Assign a Scout to today's breakout route",
    factionPrompt: "Scouts earn bonus standing on early reads",
    accent: GOLD,
    adminAlert: "Rookie Heat — watchlist adds + Academy traffic likely up",
  },
  {
    id: "injury_fog",
    name: "Injury Fog",
    summary: "Status reports are murky. Replacement value is mispriced.",
    affectedDistricts: ["war-room", "depths", "vault"],
    bossRotation: ["injury_fog"],
    cardPrompts: ["Tag affected players with Injury Fog"],
    gsePrompt: "Check depth-chart + replacement context in the War Room",
    questPrompt: "Read a spot where a star is questionable",
    crewPrompt: "Assign a Builder to map replacement value",
    factionPrompt: "Builders earn bonus standing on depth reads",
    adminAlert: "Injury Fog — surface uncertainty disclosures prominently",
    accent: VIOLET,
  },
  {
    id: "trade_shock",
    name: "Trade Shock",
    summary: "A move just reshaped the landscape. Everything reprices.",
    affectedDistricts: ["vault", "war-room", "stadium-gates"],
    bossRotation: ["line_move_mimic"],
    cardPrompts: ["Re-rate cards affected by the move"],
    gsePrompt: "Open the line-movement lens on affected games",
    questPrompt: "Read whether the move is informed or noise",
    crewPrompt: "Assign a Trader to the affected cards",
    factionPrompt: "Builders + Collectors earn on re-rating",
    adminAlert: "Trade Shock — card watchlist churn expected",
    accent: BLUE,
  },
  {
    id: "playoff_pressure",
    name: "Playoff Pressure",
    summary: "Stakes are peaking. Discipline beats hype now more than ever.",
    affectedDistricts: ["proving-grounds", "depths", "season-gate"],
    bossRotation: ["parlay_hydra"],
    cardPrompts: ["Watch your contenders' form"],
    gsePrompt: "Study closing-line value on high-stakes games",
    questPrompt: "Win a ranked duel under pressure",
    crewPrompt: "Crew Clash intensifies — rally your lanes",
    factionPrompt: "Captains earn bonus standing leading the push",
    adminAlert: "Playoff Pressure — ladder + duel activity should spike",
    accent: GOLD,
  },
  {
    id: "public_collapse",
    name: "Public Collapse",
    summary: "The crowd is on tilt. The fade is loud.",
    affectedDistricts: ["war-room", "depths", "blacktop"],
    bossRotation: ["public_trap"],
    cardPrompts: ["Watch the over-faded names"],
    gsePrompt: "Open the public-money splits",
    questPrompt: "Resist the crowd in a Depths boss",
    crewPrompt: "Sharps lead the fade today",
    factionPrompt: "Mavericks surge in standing",
    adminAlert: "Public Collapse — Depths clears likely up",
    accent: MAG,
  },
  {
    id: "card_heat",
    name: "Card Heat",
    summary: "The Vault is moving. Value trends are swinging fast.",
    affectedDistricts: ["vault", "merch-foundry", "crew-hall"],
    bossRotation: ["recency_wraith"],
    cardPrompts: ["Add three trending cards to your watchlist"],
    gsePrompt: "Open the GSE rating overlay on hot cards",
    questPrompt: "Watch a card before it spikes",
    crewPrompt: "Collectors + Traders earn bonus contribution",
    factionPrompt: "Collectors surge in standing",
    adminAlert: "Card Heat — watchlist + market activity up",
    accent: GOLD,
  },
  {
    id: "rivalry_surge",
    name: "Rivalry Surge",
    summary: "Rivalry games are live. Narratives are loud — read past them.",
    affectedDistricts: ["proving-grounds", "stadium-gates", "war-room"],
    bossRotation: ["parlay_hydra"],
    cardPrompts: ["Watch the rivalry headliners"],
    gsePrompt: "Read the matchup, ignore the storyline",
    questPrompt: "Duel a rival on a rivalry game",
    crewPrompt: "Crew Clash bonus on rivalry reads",
    factionPrompt: "Faction War heats up — every read counts",
    adminAlert: "Rivalry Surge — faction + duel engagement up",
    accent: MAG,
  },
  {
    id: "deadline_shock",
    name: "Deadline Shock",
    summary: "Deadline moves are landing. The board is volatile.",
    affectedDistricts: ["vault", "war-room", "stadium-gates"],
    bossRotation: ["line_move_mimic"],
    cardPrompts: ["Re-rate movers; watch new fits"],
    gsePrompt: "Track which deadline moves are informed",
    questPrompt: "Read a post-move spot",
    crewPrompt: "Traders work the movers",
    factionPrompt: "Builders earn on re-rating fits",
    adminAlert: "Deadline Shock — high card + War Room churn",
    accent: BLUE,
  },
  {
    id: "championship_gravity",
    name: "Championship Gravity",
    summary: "The title is in view. Everything bends toward the finish.",
    affectedDistricts: ["season-gate", "depths", "proving-grounds"],
    bossRotation: ["parlay_hydra"],
    cardPrompts: ["Watch the championship-run cards"],
    gsePrompt: "Study closing-line value on title games",
    questPrompt: "Chase a seasonal title on the ladder",
    crewPrompt: "Crews push for the season finale",
    factionPrompt: "Faction race for the championship banner",
    adminAlert: "Championship Gravity — season finale engagement",
    accent: GOLD,
  },
  {
    id: "fantasy_waiver_surge",
    name: "Fantasy Waiver Surge",
    summary: "Waiver wire is live. Start/sit edges are everywhere.",
    affectedDistricts: ["academy", "blacktop", "vault"],
    bossRotation: ["recency_wraith"],
    cardPrompts: ["Watch waiver-relevant breakouts"],
    gsePrompt: "Open the start/sit and usage boards",
    questPrompt: "Run a start/sit Signal Check",
    crewPrompt: "Scouts surface the best waiver adds",
    factionPrompt: "Scouts earn bonus standing",
    adminAlert: "Waiver Surge — Academy + Blacktop traffic up",
    accent: CYAN,
  },
  {
    id: "slump_watch",
    name: "Slump Watch",
    summary: "Cold streaks are overpricing fades. Buy-low value is open.",
    affectedDistricts: ["vault", "war-room", "academy"],
    bossRotation: ["recency_wraith"],
    cardPrompts: ["Tag slumping names with Slump Watch"],
    gsePrompt: "Separate real decline from variance in the War Room",
    questPrompt: "Read a buy-low spot",
    crewPrompt: "Scouts hunt buy-low value",
    factionPrompt: "Scouts + Builders earn on disciplined reads",
    adminAlert: "Slump Watch — watchlist tagging up",
    accent: VIOLET,
  },
  {
    id: "breakout_signal",
    name: "Breakout Signal",
    summary: "Breakouts are firing. Early reads pay the most.",
    affectedDistricts: ["academy", "vault", "war-room"],
    bossRotation: ["recency_wraith"],
    cardPrompts: ["Add breakout candidates before they spike"],
    gsePrompt: "Open the breakout board",
    questPrompt: "Call a breakout in the War Room",
    crewPrompt: "Scouts lead the breakout route",
    factionPrompt: "Scouts surge in standing",
    adminAlert: "Breakout Signal — Academy + Vault engagement",
    accent: CYAN,
  },
  {
    id: "market_whiplash",
    name: "Market Whiplash",
    summary: "Lines are swinging both ways. Tell real steam from noise.",
    affectedDistricts: ["war-room", "proving-grounds", "depths"],
    bossRotation: ["line_move_mimic"],
    cardPrompts: ["Watch names with whipsawing value"],
    gsePrompt: "Compare opener vs current vs your number",
    questPrompt: "Read whether a big move is informed",
    crewPrompt: "Sharps separate steam from noise",
    factionPrompt: "Sharps earn bonus standing",
    adminAlert: "Market Whiplash — War Room + Depths focus",
    accent: BLUE,
  },
] as const;

const INDEX: ReadonlyMap<WeatherId, SportsWeather> = new Map(SPORTS_WEATHER.map((w) => [w.id, w]));

export function getWeather(id: WeatherId): SportsWeather | null {
  return INDEX.get(id) ?? null;
}

/**
 * Deterministic active weather for a given day index (UTC day). Designed so a
 * live sports feed can later replace this rotation without changing callers.
 */
export function activeWeatherForDay(dayIndex: number): SportsWeather {
  const i = ((Math.floor(dayIndex) % SPORTS_WEATHER.length) + SPORTS_WEATHER.length) % SPORTS_WEATHER.length;
  return SPORTS_WEATHER[i]!;
}

export function currentDayIndex(now: number = Date.now()): number {
  return Math.floor(now / (24 * 60 * 60 * 1000));
}
