/**
 * Game status and timeline utilities — pure, zero dependencies.
 *
 * Status labels, period/quarter/inning display, live clock formatting,
 * and game phase detection for NFL, NBA, MLB, NHL, and soccer.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Sport =
  | "americanfootball_nfl"
  | "basketball_nba"
  | "baseball_mlb"
  | "icehockey_nhl"
  | "soccer_epl"
  | "americanfootball_ncaaf"
  | "basketball_ncaab";

export type GamePhase =
  | "pregame" // > 1 hour before
  | "imminent" // < 1 hour before
  | "live" // in progress
  | "halftime"
  | "final" // completed
  | "postponed"
  | "cancelled";

export interface GameClock {
  minutes: number;
  seconds: number;
}

export interface PeriodInfo {
  label: string; // "Q1", "H1", "1st", "P1"
  number: number;
  isOvertime: boolean;
  sport: Sport;
}

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

/**
 * Derive the current game phase from timestamps.
 *
 * Rules (evaluated in order):
 * 1. endedAt set and in the past → "final"
 * 2. startTime > now + 3_600_000 (1 hour) → "pregame"
 * 3. startTime <= now + 3_600_000 and startTime > now → "imminent"
 * 4. startTime <= now and !endedAt → "live"
 * 5. Default → "pregame"
 */
export function gamePhaseFromDates(
  startTime: Date | number,
  endedAt?: Date | number | null,
  now?: Date | number
): GamePhase {
  const nowMs = now instanceof Date ? now.getTime() : now ?? Date.now();
  const startMs =
    startTime instanceof Date ? startTime.getTime() : startTime;

  if (endedAt != null) {
    const endMs =
      endedAt instanceof Date ? endedAt.getTime() : (endedAt as number);
    if (endMs <= nowMs) return "final";
  }

  if (startMs > nowMs + 3_600_000) return "pregame";
  if (startMs <= nowMs + 3_600_000 && startMs > nowMs) return "imminent";
  if (startMs <= nowMs && !endedAt) return "live";

  return "pregame";
}

// ---------------------------------------------------------------------------
// Phase display
// ---------------------------------------------------------------------------

/** Human-readable label for a game phase. */
export function gamePhaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    pregame: "Upcoming",
    imminent: "Starting Soon",
    live: "Live",
    halftime: "Halftime",
    final: "Final",
    postponed: "Postponed",
    cancelled: "Cancelled",
  };
  return labels[phase];
}

/** Tailwind color class for a game phase badge/chip. */
export function gamePhaseColorClass(phase: GamePhase): string {
  switch (phase) {
    case "live":
      return "text-green-400";
    case "final":
      return "text-ink-400";
    case "postponed":
    case "cancelled":
      return "text-amber-400";
    case "imminent":
      return "text-blue-400";
    case "pregame":
      return "text-ink-500";
    case "halftime":
      return "text-amber-300";
  }
}

// ---------------------------------------------------------------------------
// Period / quarter / inning helpers
// ---------------------------------------------------------------------------

/** Ordinal suffix for a number (1→"st", 2→"nd", 3→"rd", 4+→"th"). */
function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Build a PeriodInfo for the given period number and sport.
 *
 * NFL/NCAAF : 1-4 → Q1-Q4; 5+ → OT
 * NBA       : 1-4 → Q1-Q4; 5+ → OT
 * NCAAB     : 1-2 → H1/H2; 3+ → OT
 * MLB       : 1-9 → "1st"-"9th"; 10+ → "10th" etc.
 * NHL       : 1-3 → P1-P3; 4+ → OT
 * Soccer    : 1-2 → 1H/2H; 3+ → ET1/ET2 …
 */
export function periodLabel(period: number, sport: Sport): PeriodInfo {
  const make = (label: string, isOvertime: boolean): PeriodInfo => ({
    label,
    number: period,
    isOvertime,
    sport,
  });

  switch (sport) {
    case "americanfootball_nfl":
    case "americanfootball_ncaaf":
      if (period <= 4) return make(`Q${period}`, false);
      return make("OT", true);

    case "basketball_nba":
      if (period <= 4) return make(`Q${period}`, false);
      return make("OT", true);

    case "basketball_ncaab":
      if (period === 1) return make("H1", false);
      if (period === 2) return make("H2", false);
      return make("OT", true);

    case "baseball_mlb": {
      const suffix = ordinalSuffix(period);
      return make(`${period}${suffix}`, period >= 10);
    }

    case "icehockey_nhl":
      if (period <= 3) return make(`P${period}`, false);
      return make("OT", true);

    case "soccer_epl":
      if (period === 1) return make("1H", false);
      if (period === 2) return make("2H", false);
      // Extra time periods: ET1, ET2, …
      return make(`ET${period - 2}`, true);
  }
}

// ---------------------------------------------------------------------------
// Clock utilities
// ---------------------------------------------------------------------------

/**
 * Format minutes + seconds as "MM:SS" (seconds always 2 digits).
 * e.g. formatClock(14, 32) → "14:32", formatClock(0, 9) → "0:09"
 */
export function formatClock(minutes: number, seconds: number): string {
  const secStr = seconds.toString().padStart(2, "0");
  return `${minutes}:${secStr}`;
}

/**
 * Parse a clock string "MM:SS" into a GameClock.
 * Returns null if the string is not in the expected format.
 */
export function parseClock(clockStr: string): GameClock | null {
  const match = /^(\d+):(\d{2})$/.exec(clockStr.trim());
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  return { minutes, seconds };
}

// ---------------------------------------------------------------------------
// Sport metadata
// ---------------------------------------------------------------------------

/** Total regulation periods/halves/innings for a sport. */
export function totalPeriods(sport: Sport): number {
  switch (sport) {
    case "americanfootball_nfl":
    case "americanfootball_ncaaf":
    case "basketball_nba":
      return 4;
    case "basketball_ncaab":
    case "soccer_epl":
      return 2;
    case "baseball_mlb":
      return 9;
    case "icehockey_nhl":
      return 3;
  }
}

/** The period number at which overtime begins for a sport. */
export function overtimePeriodNumber(sport: Sport): number {
  switch (sport) {
    case "americanfootball_nfl":
    case "americanfootball_ncaaf":
    case "basketball_nba":
      return 5;
    case "basketball_ncaab":
    case "soccer_epl":
      return 3;
    case "baseball_mlb":
      return 10;
    case "icehockey_nhl":
      return 4;
  }
}

/** True if the given period is an overtime period for that sport. */
export function isOvertimePeriod(period: number, sport: Sport): boolean {
  return period >= overtimePeriodNumber(sport);
}

/** Short display name for a sport key. */
export function sportDisplayName(sport: Sport): string {
  const names: Record<Sport, string> = {
    americanfootball_nfl: "NFL",
    basketball_nba: "NBA",
    baseball_mlb: "MLB",
    icehockey_nhl: "NHL",
    soccer_epl: "EPL",
    americanfootball_ncaaf: "CFB",
    basketball_ncaab: "NCAAB",
  };
  return names[sport];
}

/** Representative emoji for a sport. */
export function sportEmoji(sport: Sport): string {
  switch (sport) {
    case "americanfootball_nfl":
    case "americanfootball_ncaaf":
      return "🏈";
    case "basketball_nba":
    case "basketball_ncaab":
      return "🏀";
    case "baseball_mlb":
      return "⚾";
    case "icehockey_nhl":
      return "🏒";
    case "soccer_epl":
      return "⚽";
  }
}

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

/**
 * Format a score as "HomeName homeScore, AwayName awayScore".
 * e.g. formatScore(24, 17, "Chiefs", "Raiders") → "Chiefs 24, Raiders 17"
 */
export function formatScore(
  homeScore: number,
  awayScore: number,
  homeName: string,
  awayName: string
): string {
  return `${homeName} ${homeScore}, ${awayName} ${awayScore}`;
}

/**
 * Compact scoreboard "home-away" display.
 * e.g. scoreboardDisplay(24, 17) → "24-17"
 */
export function scoreboardDisplay(home: number, away: number): string {
  return `${home}-${away}`;
}

// ---------------------------------------------------------------------------
// Sport characteristics
// ---------------------------------------------------------------------------

/** True for sports that typically produce scores in the 100+ range (NBA, NCAAB). */
export function isHighScoring(sport: Sport): boolean {
  return sport === "basketball_nba" || sport === "basketball_ncaab";
}

/** Typical game duration in minutes (wall-clock, including stoppages). */
export function typicalGameDuration(sport: Sport): number {
  switch (sport) {
    case "americanfootball_nfl":
    case "americanfootball_ncaaf":
      return 210;
    case "basketball_nba":
      return 150;
    case "baseball_mlb":
      return 180;
    case "icehockey_nhl":
      return 150;
    case "soccer_epl":
      return 110;
    case "basketball_ncaab":
      return 130;
  }
}

// ---------------------------------------------------------------------------
// Time remaining estimate
// ---------------------------------------------------------------------------

/**
 * Estimate minutes remaining in the game based on current period and clock.
 *
 * NFL/NCAAF : each quarter = 15 min → (4 - period) * 15 + clockMinutes
 * NBA       : each quarter = 15 min → (4 - period) * 15 + clockMinutes
 * NHL       : each period = 20 min  → (3 - period) * 20 + clockMinutes
 * MLB       : inning estimate 18 min → (9 - period) * 18
 * Soccer    : each half = 45 min    → (2 - period) * 45 + clockMinutes
 * NCAAB     : each half = 20 min    → (2 - period) * 20 + clockMinutes
 *
 * Returns 0 when already in or past the last regulation period with no clock.
 */
export function estimatedMinutesRemaining(
  period: number,
  clockMinutes: number,
  sport: Sport
): number {
  const total = totalPeriods(sport);

  switch (sport) {
    case "americanfootball_nfl":
    case "americanfootball_ncaaf":
    case "basketball_nba": {
      // 4 quarters × 15 min each
      const remaining = (total - period) * 15 + clockMinutes;
      return Math.max(0, remaining);
    }

    case "icehockey_nhl": {
      // 3 periods × 20 min each
      const remaining = (total - period) * 20 + clockMinutes;
      return Math.max(0, remaining);
    }

    case "baseball_mlb": {
      // Innings-based estimate: 18 min per inning
      const remaining = (total - period) * 18;
      return Math.max(0, remaining);
    }

    case "soccer_epl": {
      // 2 halves × 45 min each
      const remaining = (total - period) * 45 + clockMinutes;
      return Math.max(0, remaining);
    }

    case "basketball_ncaab": {
      // 2 halves × 20 min each
      const remaining = (total - period) * 20 + clockMinutes;
      return Math.max(0, remaining);
    }
  }
}
