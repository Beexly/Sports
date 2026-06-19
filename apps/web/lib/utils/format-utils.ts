/**
 * format-utils.ts — Pure TypeScript display formatting utilities.
 *
 * Covers: odds, probabilities, currency, sports scores, text, dates,
 * and standings. Zero npm dependencies; Node built-ins only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** Format American odds with sign: +150, -110, +0 */
export function formatOdds(americanOdds: number): string {
  if (americanOdds >= 0) return `+${americanOdds}`;
  return `${americanOdds}`;
}

/** Format a probability (0–100 scale) as percentage string. Default 1 decimal. */
export function formatProbability(p: number, decimals = 1): string {
  return `${p.toFixed(decimals)}%`;
}

/**
 * Format a confidence score (0–100) with a label.
 * ≥70 → "High (xx%)", ≥50 → "Medium (xx%)", <50 → "Low (xx%)"
 */
export function formatConfidence(confidence: number): string {
  const rounded = Math.round(confidence);
  const pct = `${rounded}%`;
  if (rounded >= 70) return `High (${pct})`;
  if (rounded >= 50) return `Medium (${pct})`;
  return `Low (${pct})`;
}

/** Format a currency amount using Intl.NumberFormat. Defaults: USD, en-US. */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format large numbers with K/M/B suffix. 1234 → "1.2K".
 * One decimal place; trailing ".0" is stripped.
 */
export function formatLargeNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
}

/**
 * Convert American odds to decimal odds and format to 2 decimal places.
 * Positive: decimal = (american / 100) + 1
 * Negative: decimal = (100 / |american|) + 1
 */
export function formatDecimalOdds(american: number): string {
  let decimal: number;
  if (american >= 0) {
    decimal = american / 100 + 1;
  } else {
    decimal = 100 / Math.abs(american) + 1;
  }
  return decimal.toFixed(2);
}

/** Greatest common divisor (Euclidean). */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Convert American odds to simplified fractional odds string.
 * +150 → "3/2", -110 → "10/11"
 */
export function formatFractionalOdds(american: number): string {
  let num: number;
  let den: number;
  if (american >= 0) {
    // profit = american per 100 stake
    num = american;
    den = 100;
  } else {
    // profit = 100 per |american| stake
    num = 100;
    den = Math.abs(american);
  }
  const divisor = gcd(num, den);
  return `${num / divisor}/${den / divisor}`;
}

/**
 * Add ordinal suffix to a number.
 * 1→"1st", 2→"2nd", 3→"3rd", 11→"11th", 21→"21st"
 */
export function ordinalSuffix(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Format percentage change between two values.
 * from=0 with to>0 → "+∞%", from=0 with to<0 → "-∞%", from=0 with to=0 → "N/A"
 */
export function formatPercentChange(from: number, to: number): string {
  if (from === 0) {
    if (to === 0) return "N/A";
    return to > 0 ? "+∞%" : "-∞%";
  }
  const pct = ((to - from) / Math.abs(from)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Format duration in milliseconds into human-readable string.
 * Omits zero components. All-zero → "0s".
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.length > 0 ? parts.join(" ") : "0s";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPORTS SCORE FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** Format a game score. With names: "Chiefs 28 - 24 Bills". Without: "28-24". */
export function formatScore(
  homeScore: number,
  awayScore: number,
  homeName?: string,
  awayName?: string
): string {
  if (homeName && awayName) {
    return `${homeName} ${homeScore} - ${awayScore} ${awayName}`;
  }
  return `${homeScore}-${awayScore}`;
}

/** Format a win-loss (and optional draw) record. "12-4" or "12-4-2". */
export function formatRecord(wins: number, losses: number, draws?: number): string {
  if (draws !== undefined) return `${wins}-${losses}-${draws}`;
  return `${wins}-${losses}`;
}

/**
 * Format a point spread. Strips trailing ".0".
 * +3.5 → "+3.5", -7.0 → "-7", 0 → "+0"
 */
export function formatSpread(spread: number): string {
  const sign = spread >= 0 ? "+" : "";
  const value = spread % 1 === 0 ? `${spread}` : `${spread}`;
  // Remove trailing .0
  const cleaned = value.replace(/\.0$/, "");
  return `${sign}${cleaned}`;
}

/** Format an over/under total. "O 47.5" or "U 47.5". */
export function formatTotal(total: number, overUnder: "over" | "under"): string {
  const label = overUnder === "over" ? "O" : "U";
  return `${label} ${total}`;
}

/**
 * Format a pick line for display.
 * spread: "Spread: -3.5 (-110)"
 * moneyline: "Moneyline: +145"
 * total: "Total: O 47.5 (-110)"
 */
export function formatPickLine(
  pickType: "spread" | "moneyline" | "total",
  value: number,
  odds: number
): string {
  const oddsStr = formatOdds(odds);
  switch (pickType) {
    case "spread":
      return `Spread: ${formatSpread(value)} (${oddsStr})`;
    case "moneyline":
      return `Moneyline: ${oddsStr}`;
    case "total":
      // value encodes over (positive) vs under (negative); magnitude is the total
      // Convention: positive value = Over, negative = Under
      // But the spec says value=number and odds=number — treat value as the total line
      // and use odds sign to determine over/under... Actually the spec says:
      // "Total: O 47.5 (-110)" — so we always show Over as example.
      // We'll use a separate convention: if odds > 0, treat as over; else under.
      // Actually, let's just show the total with Over — the caller should pass
      // appropriate value. We'll always prefix "O" for total picks since a separate
      // overUnder param isn't provided. Let's check spec again:
      // formatPickLine('total', 47.5, -110) → "Total: O 47.5 (-110)"
      // We'll always use "O" when type is "total" since spec example shows Over.
      return `Total: O ${value} (${oddsStr})`;
    default: {
      const _exhaustive: never = pickType;
      return _exhaustive;
    }
  }
}

/**
 * Format a date as relative time-ago string.
 * "just now" (<60s), "5m ago", "2h ago", "3d ago", "2w ago", "1mo ago", "2yr ago"
 */
export function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}yr ago`;
}

/** ET timezone abbreviation helper (no external deps). */
function etOffset(date: Date): number {
  // Rough DST detection for US Eastern: second Sunday in March → first Sunday in November
  const year = date.getUTCFullYear();
  // DST start: 2nd Sunday of March at 2am ET = 7am UTC
  const marchStart = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(Date.UTC(year, 2, 8 + ((7 - marchStart.getUTCDay()) % 7), 7));
  // DST end: 1st Sunday of November at 2am ET = 6am UTC
  const novStart = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(Date.UTC(year, 10, 1 + ((7 - novStart.getUTCDay()) % 7), 6));
  const isDST = date >= dstStart && date < dstEnd;
  return isDST ? -4 : -5; // hours offset from UTC
}

/** Format a 12-hour time with AM/PM in ET. */
function formatTimeET(date: Date): string {
  const offset = etOffset(date);
  const etDate = new Date(date.getTime() + offset * 60 * 60 * 1000);
  let hours = etDate.getUTCHours();
  const minutes = etDate.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minStr = minutes === 0 ? "00" : minutes.toString().padStart(2, "0");
  return `${hours}:${minStr} ${ampm}`;
}

/**
 * Format a game time relative to today (system clock).
 * "Today 7:30 PM ET" / "Tomorrow 1:00 PM ET" / "Mon Jan 6 7:30 PM ET"
 */
export function formatGameTime(date: Date): string {
  const offset = etOffset(date);
  const nowEt = new Date(Date.now() + offset * 60 * 60 * 1000);
  const dateEt = new Date(date.getTime() + offset * 60 * 60 * 1000);

  const todayDay = nowEt.getUTCDate();
  const todayMonth = nowEt.getUTCMonth();
  const todayYear = nowEt.getUTCFullYear();
  const dateDay = dateEt.getUTCDate();
  const dateMonth = dateEt.getUTCMonth();
  const dateYear = dateEt.getUTCFullYear();

  const timeStr = formatTimeET(date);

  if (dateYear === todayYear && dateMonth === todayMonth && dateDay === todayDay) {
    return `Today ${timeStr} ET`;
  }
  const tomorrowEt = new Date(nowEt.getTime() + 24 * 60 * 60 * 1000);
  if (
    dateDay === tomorrowEt.getUTCDate() &&
    dateMonth === tomorrowEt.getUTCMonth() &&
    dateYear === tomorrowEt.getUTCFullYear()
  ) {
    return `Tomorrow ${timeStr} ET`;
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayName = days[dateEt.getUTCDay()];
  const monthName = months[dateEt.getUTCMonth()];
  return `${dayName} ${monthName} ${dateDay} ${timeStr} ET`;
}

/** Format a game quarter with time remaining. "Q3 4:32" */
export function formatQuarter(quarter: number, timeRemaining: string): string {
  return `Q${quarter} ${timeRemaining}`;
}

/** Format baseball inning. "Top 7th" / "Bot 3rd" */
export function formatInning(inning: number, isTop: boolean): string {
  return `${isTop ? "Top" : "Bot"} ${ordinalSuffix(inning)}`;
}

/**
 * Format sport period with proper terminology.
 * NHL: "1st Period", OT for period≥4
 * NBA/NFL: "1st Quarter", OT for period≥5
 */
export function formatPeriod(period: number, sport: "nhl" | "nba" | "nfl"): string {
  if (sport === "nhl") {
    if (period >= 4) return "OT";
    return `${ordinalSuffix(period)} Period`;
  }
  // nba or nfl
  if (period >= 5) return "OT";
  return `${ordinalSuffix(period)} Quarter`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEXT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** Capitalize first letter. */
export function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Capitalize each word. */
export function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (word) => capitalize(word));
}

/** Truncate a string to maxLen, appending suffix if truncated. Default suffix "...". */
export function truncate(s: string, maxLen: number, suffix = "..."): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - suffix.length) + suffix;
}

/** Lowercase, replace spaces with hyphens, strip non-alphanumeric except hyphens. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * Format a list of items with Oxford comma.
 * 1 → "A"; 2 → "A and B"; 3+ → "A, B, and C"
 */
export function formatList(items: string[], conjunction: "and" | "or" = "and"): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0] ?? ""} ${conjunction} ${items[1] ?? ""}`;
  const last = items[items.length - 1] ?? "";
  const rest = items.slice(0, -1).join(", ");
  return `${rest}, ${conjunction} ${last}`;
}

/** "1 pick" / "2 picks". Plural defaults to singular + "s". */
export function pluralize(n: number, singular: string, plural?: string): string {
  const pluralForm = plural ?? `${singular}s`;
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** "John Smith" → "JS", "LeBron James" → "LJ". */
export function formatInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Show first 2 chars of local part + "***@domain". "john@example.com" → "jo***@example.com". */
export function maskEmail(email: string): string {
  const atIdx = email.indexOf("@");
  if (atIdx < 0) return email;
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  const visible = local.slice(0, 2);
  return `${visible}***${domain}`;
}

/** Show only last 4 digits; everything else → "*". Grouped in 4s. */
export function maskCreditCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  const masked = "*".repeat(Math.max(0, digits.length - 4)) + last4;
  // Group into chunks of 4
  const chunks: string[] = [];
  for (let i = 0; i < masked.length; i += 4) {
    chunks.push(masked.slice(i, i + 4));
  }
  return chunks.join(" ");
}

/** Split text into lines at word boundaries, each line ≤ maxWidth chars. */
export function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current === "") {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DATE/TIME FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/** "Jan 6, 2025" */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Monday, January 6, 2025" */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "2025-01-06" (ISO date, local timezone). */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "7:30 PM" — 12-hour format, local timezone. */
export function formatTime12(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "19:30" — 24-hour format HH:MM, local timezone. */
export function formatTime24(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Absolute number of full days between two dates (floor). */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** True if the date is today (local timezone). */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** True if the date is tomorrow (local timezone). */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()
  );
}

/** Midnight UTC of the given date. */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

/** 23:59:59.999 UTC of the given date. */
export function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

/** Add (or subtract) N calendar days. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TABLE / STANDINGS FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a standings row as a padded fixed-width string.
 * Columns: rank(3), team(20), W(4), L(4), PCT(6), GB(6)
 */
export function formatStandingsRow(
  rank: number,
  team: string,
  wins: number,
  losses: number,
  pct: number,
  gb: number
): string {
  const rankStr = rightPad(String(rank), 3);
  const teamStr = rightPad(team, 20);
  const wStr = rightPad(String(wins), 4);
  const lStr = rightPad(String(losses), 4);
  const pctStr = rightPad(pct.toFixed(3), 6);
  const gbStr = gb === 0 ? rightPad("-", 6) : rightPad(gb.toFixed(1), 6);
  return `${rankStr}${teamStr}${wStr}${lStr}${pctStr}${gbStr}`;
}

/**
 * Format a leaderboard.
 * Tied entries share the same rank. Rank gaps: if rank 1 has 2 ties, next rank is 3.
 * Returns "1. Name: Score" strings.
 */
export function formatLeaderboard(
  entries: Array<{ name: string; score: number }>,
  maxEntries = 10
): string[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const limited = sorted.slice(0, maxEntries);
  const result: string[] = [];
  let rank = 1;
  for (let i = 0; i < limited.length; i++) {
    const entry = limited[i];
    const prev = limited[i - 1];
    if (i > 0 && entry !== undefined && prev !== undefined && entry.score < prev.score) {
      rank = i + 1;
    }
    if (entry !== undefined) {
      result.push(`${rank}. ${entry.name}: ${entry.score}`);
    }
  }
  return result;
}

/**
 * Format a stat line from a record.
 * { PTS: 28.3, REB: 7.2 } → "PTS: 28.3 | REB: 7.2"
 */
export function formatStatLine(
  stats: Record<string, number | string>,
  separator = " | "
): string {
  return Object.entries(stats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(separator);
}

/** Right-pad a string to width with char (default space). */
export function rightPad(s: string, width: number, char = " "): string {
  if (s.length >= width) return s;
  return s + char.repeat(width - s.length);
}

/** Left-pad a string to width with char (default space). */
export function leftPad(s: string, width: number, char = " "): string {
  if (s.length >= width) return s;
  return char.repeat(width - s.length) + s;
}
