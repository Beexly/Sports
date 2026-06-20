/**
 * Galaxy Dynasty — seeded loop content.
 *
 * Deterministic scenarios so the core loop is always playable with zero other
 * humans and no live-data dependency (anti-ghost-town, bible §4.3; DECISION
 * D-010). Each War Room scenario is a real, fully-specified game settlement that
 * the engine grades — honest reps, not fake data. Wiring live Odds API games for
 * pre-kickoff predictions is a logged roadmap item (Stage 2).
 *
 * All copy here must pass the Language Law (enforced by the galaxy-language-law
 * test).
 */

import type { PickType } from "@sports/types";

export interface WarRoomOption {
  readonly key: "A" | "B";
  readonly label: string;
  readonly pickType: PickType;
  readonly selection: string;
  readonly line: number;
}

export interface WarRoomScenario {
  readonly id: string;
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly context: string;
  readonly market: string;
  readonly options: readonly [WarRoomOption, WarRoomOption];
  /** Real final used for engine settlement. */
  readonly homeScore: number;
  readonly awayScore: number;
  /**
   * GSE Pro "deeper read" — process/context a sharp would weigh. It improves the
   * player's VISION, never reveals the answer (anti-pay-to-win). Free users see a
   * locked upgrade prompt; Pro sees the intel.
   */
  readonly proIntel: string;
}

/**
 * War Room reps. Teams are real NFL clubs; the picks settle against the listed
 * final via the GSN/GSE engine. Selections follow the engine's settlement
 * convention (home pick starts with home team; TOTAL starts with OVER/UNDER;
 * SPREAD line is home-perspective).
 */
export const WAR_ROOM_SCENARIOS: readonly WarRoomScenario[] = [
  {
    id: "wr-1",
    sportKey: "americanfootball_nfl",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Las Vegas Raiders",
    context: "Home favorite off a short week. The number sits at -6.5.",
    market: "Spread — pick a side",
    options: [
      { key: "A", label: "Chiefs -6.5", pickType: "SPREAD", selection: "Kansas City Chiefs -6.5", line: -6.5 },
      { key: "B", label: "Raiders +6.5", pickType: "SPREAD", selection: "Las Vegas Raiders +6.5", line: -6.5 },
    ],
    homeScore: 27,
    awayScore: 17,
    proIntel:
      "Sharp lens: short rest dents a favorite's prep, and public money tends to inflate a marquee home number. Weigh the rest gap and the points against the consensus before you commit.",
  },
  {
    id: "wr-2",
    sportKey: "americanfootball_nfl",
    homeTeam: "Buffalo Bills",
    awayTeam: "Miami Dolphins",
    context: "Cold-weather divisional game. Total opened 49.5 and ticked down.",
    market: "Total — read the pace",
    options: [
      { key: "A", label: "OVER 47.5", pickType: "TOTAL", selection: "OVER 47.5", line: 47.5 },
      { key: "B", label: "UNDER 47.5", pickType: "TOTAL", selection: "UNDER 47.5", line: 47.5 },
    ],
    homeScore: 20,
    awayScore: 13,
    proIntel:
      "Sharp lens: cold-weather divisional games trend toward defense and the run; a total that ticked down often means informed money on the Under. Weigh pace and weather over the opening number.",
  },
  {
    id: "wr-3",
    sportKey: "americanfootball_nfl",
    homeTeam: "Detroit Lions",
    awayTeam: "Green Bay Packers",
    context: "Home dog getting a field goal. Moneyline value on the board.",
    market: "Moneyline — who wins?",
    options: [
      { key: "A", label: "Lions ML (+135)", pickType: "MONEYLINE", selection: "Detroit Lions ML (+135)", line: 135 },
      { key: "B", label: "Packers ML (-155)", pickType: "MONEYLINE", selection: "Green Bay Packers ML (-155)", line: -155 },
    ],
    homeScore: 24,
    awayScore: 21,
    proIntel:
      "Sharp lens: a home dog getting a field goal in a tight divisional matchup is a classic value spot — moneyline underdogs in coin-flip games carry price value. Weigh the matchup parity against the favorite's juice.",
  },
] as const;

export function getWarRoomScenario(id: string): WarRoomScenario | null {
  return WAR_ROOM_SCENARIOS.find((s) => s.id === id) ?? null;
}

// ── Blacktop mini-game — quick stat/trivia Signal Checks ──────────────────────

export interface BlacktopQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly optionA: string;
  readonly optionB: string;
  readonly correct: "A" | "B";
  readonly explanation: string;
}

export const BLACKTOP_QUESTIONS: readonly BlacktopQuestion[] = [
  {
    id: "bt-1",
    prompt: "A -110 price implies roughly what break-even win rate?",
    optionA: "About 52.4%",
    optionB: "About 47.6%",
    correct: "A",
    explanation: "-110 → 110/210 ≈ 52.4%. Beating the vig means clearing that line, not 50%.",
  },
  {
    id: "bt-2",
    prompt: "Closing-line value measures whether you beat…",
    optionA: "The opening number",
    optionB: "The final pre-game number",
    correct: "B",
    explanation: "CLV compares your locked number to the closing line — the market's sharpest read.",
  },
  {
    id: "bt-3",
    prompt: "Which is the better-calibrated habit?",
    optionA: "Always stating 90% confidence",
    optionB: "Matching confidence to how sure you actually are",
    correct: "B",
    explanation: "Calibration is the whole game — confidence should track reality, not bravado.",
  },
] as const;

export function getBlacktopQuestion(id: string): BlacktopQuestion | null {
  return BLACKTOP_QUESTIONS.find((q) => q.id === id) ?? null;
}

// ── Academy first Signal Check (onboarding rep) ───────────────────────────────

export const ACADEMY_FIRST_CHECK: BlacktopQuestion = {
  id: "academy-1",
  prompt:
    "A team won big last week and the crowd is piling on this week. The smart first instinct is to…",
  optionA: "Ride the hot team — momentum is real",
  optionB: "Check whether the price already moved past the edge",
  correct: "B",
  explanation:
    "Recency bias inflates prices. The first Academy lesson: read the number, not the narrative.",
};

// ── Starter cards (collection + display only; no custody — bible Phase 5) ──────

export interface StarterCardDef {
  readonly slug: string;
  readonly name: string;
  readonly subjectType: "TEAM" | "CONCEPT" | "ARCHETYPE";
  readonly rarity: "COMMON" | "RARE" | "LEGEND";
  readonly gseRating: number;
  readonly formTrend: "UP" | "FLAT" | "DOWN";
  readonly valueTrend: "UP" | "FLAT" | "DOWN";
  readonly statLine: Record<string, string | number>;
}

export const STARTER_CARDS: readonly StarterCardDef[] = [
  {
    slug: "signal-core",
    name: "Signal Core",
    subjectType: "CONCEPT",
    rarity: "RARE",
    gseRating: 72,
    formTrend: "UP",
    valueTrend: "UP",
    statLine: { archetype: "Sharp", focus: "Calibration", tier: "Founders" },
  },
  {
    slug: "rookie-scout-kit",
    name: "Rookie Scout Kit",
    subjectType: "ARCHETYPE",
    rarity: "COMMON",
    gseRating: 61,
    formTrend: "FLAT",
    valueTrend: "UP",
    statLine: { archetype: "Scout", focus: "Form Reads", tier: "Starter" },
  },
  {
    slug: "war-room-pass",
    name: "War Room Pass",
    subjectType: "CONCEPT",
    rarity: "COMMON",
    gseRating: 58,
    formTrend: "UP",
    valueTrend: "FLAT",
    statLine: { access: "War Room", focus: "Intelligence", tier: "Starter" },
  },
] as const;

// ── Quests ────────────────────────────────────────────────────────────────────

export interface QuestDef {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly surface: "ACADEMY" | "WAR_ROOM" | "BLACKTOP" | "BOSS" | "DUEL" | "DAILY";
  readonly sportKey?: string;
  readonly rewardCredits: number;
  readonly rewardXp: number;
}

export const STARTER_QUESTS: readonly QuestDef[] = [
  {
    key: "first-war-room-read",
    title: "First War Room Read",
    description: "Make your first confidence-scored read in the War Room.",
    surface: "WAR_ROOM",
    sportKey: "americanfootball_nfl",
    rewardCredits: 60,
    rewardXp: 90,
  },
  {
    key: "clear-the-public-trap",
    title: "Clear The Public Trap",
    description: "Beat the PvM boss by reading value over the crowd.",
    surface: "BOSS",
    rewardCredits: 150,
    rewardXp: 200,
  },
  {
    key: "daily-signal",
    title: "Daily Signal",
    description: "Run one Signal Check today to keep your streak alive.",
    surface: "DAILY",
    rewardCredits: 30,
    rewardXp: 50,
  },
] as const;

// ── Ghost / AI profiles for ladder seeding (bible §4.3) ───────────────────────

export interface GhostProfileDef {
  readonly handle: string;
  readonly archetype: string;
  readonly faction: string;
  readonly characterLevel: number;
  readonly calibration: number;
}

// ── Creator Gauntlet — curated challenge boards (Stage 2) ─────────────────────
// Curated, not open UGC: open creator submissions require the moderation/review
// pipeline (logged Stage-4 item). These are authored challenge sets built from
// the existing War Room reps.

export interface CreatorChallenge {
  readonly id: string;
  readonly creator: string;
  readonly title: string;
  readonly blurb: string;
  /** War Room scenario ids that make up the gauntlet. */
  readonly scenarioIds: readonly string[];
  readonly rewardLabel: string;
}

export const CREATOR_CHALLENGES: readonly CreatorChallenge[] = [
  {
    id: "cg-sharp-eye",
    creator: "Ghost_SharpEcho",
    title: "The Sharp Eye",
    blurb: "Three reads, three numbers. Trust the math, not the names.",
    scenarioIds: ["wr-1", "wr-2", "wr-3"],
    rewardLabel: "Calibration reps + Season Points",
  },
  {
    id: "cg-form-hunt",
    creator: "Ghost_FormHawk",
    title: "Form Hunt",
    blurb: "Read the spot, not the storyline. Two quick reps.",
    scenarioIds: ["wr-1", "wr-3"],
    rewardLabel: "Scout XP + Season Points",
  },
] as const;

export function getCreatorChallenge(id: string): CreatorChallenge | null {
  return CREATOR_CHALLENGES.find((c) => c.id === id) ?? null;
}

export const GHOST_PROFILES: readonly GhostProfileDef[] = [
  { handle: "Ghost_SharpEcho", archetype: "SHARP", faction: "SHARPS", characterLevel: 9, calibration: 71 },
  { handle: "Ghost_FormHawk", archetype: "SCOUT", faction: "SCOUTS", characterLevel: 7, calibration: 64 },
  { handle: "Ghost_VaultKeeper", archetype: "COLLECTOR", faction: "COLLECTORS", characterLevel: 6, calibration: 60 },
  { handle: "Ghost_RoomRunner", archetype: "GM", faction: "BUILDERS", characterLevel: 8, calibration: 67 },
  { handle: "Ghost_NightCaptain", archetype: "CAPTAIN", faction: "CAPTAINS", characterLevel: 5, calibration: 58 },
] as const;
