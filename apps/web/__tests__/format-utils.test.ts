/**
 * Tests for format-utils.ts
 * Run: cd /home/user/Sports/apps/web && npx vitest run __tests__/format-utils.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  // Number formatting
  formatOdds,
  formatProbability,
  formatConfidence,
  formatCurrency,
  formatLargeNumber,
  formatDecimalOdds,
  formatFractionalOdds,
  ordinalSuffix,
  formatPercentChange,
  formatDuration,
  // Sports score formatting
  formatScore,
  formatRecord,
  formatSpread,
  formatTotal,
  formatPickLine,
  formatTimeAgo,
  formatGameTime,
  formatQuarter,
  formatInning,
  formatPeriod,
  // Text formatting
  capitalize,
  titleCase,
  truncate,
  slugify,
  formatList,
  pluralize,
  formatInitials,
  maskEmail,
  maskCreditCard,
  wrapText,
  // Date/time formatting
  formatDateShort,
  formatDateLong,
  formatDateISO,
  formatTime12,
  formatTime24,
  daysBetween,
  isToday,
  isTomorrow,
  startOfDay,
  endOfDay,
  addDays,
  // Table / standings
  formatStandingsRow,
  formatLeaderboard,
  formatStatLine,
  rightPad,
  leftPad,
} from "@/lib/utils/format-utils";

// ─────────────────────────────────────────────────────────────────────────────
// 1. NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("formatOdds", () => {
  it("formats positive odds with + sign", () => {
    expect(formatOdds(150)).toBe("+150");
  });
  it("formats negative odds without extra sign", () => {
    expect(formatOdds(-110)).toBe("-110");
  });
  it("formats +0 with plus sign", () => {
    expect(formatOdds(0)).toBe("+0");
  });
  it("formats large positive odds", () => {
    expect(formatOdds(2500)).toBe("+2500");
  });
  it("formats large negative odds", () => {
    expect(formatOdds(-2500)).toBe("-2500");
  });
  it("formats -100 (even money from underdog perspective)", () => {
    expect(formatOdds(-100)).toBe("-100");
  });
  it("formats +100", () => {
    expect(formatOdds(100)).toBe("+100");
  });
});

describe("formatProbability", () => {
  it("formats with 1 decimal by default", () => {
    expect(formatProbability(52.4)).toBe("52.4%");
  });
  it("formats with 0 decimals", () => {
    expect(formatProbability(52.4, 0)).toBe("52%");
  });
  it("formats with 2 decimals", () => {
    expect(formatProbability(52.43, 2)).toBe("52.43%");
  });
  it("handles 0%", () => {
    expect(formatProbability(0)).toBe("0.0%");
  });
  it("handles 100%", () => {
    expect(formatProbability(100)).toBe("100.0%");
  });
  it("handles decimal input (not 0-1 scale)", () => {
    expect(formatProbability(33.3, 1)).toBe("33.3%");
  });
});

describe("formatConfidence", () => {
  it("≥70 returns High", () => {
    expect(formatConfidence(87)).toBe("High (87%)");
  });
  it("exactly 70 returns High", () => {
    expect(formatConfidence(70)).toBe("High (70%)");
  });
  it("≥50 and <70 returns Medium", () => {
    expect(formatConfidence(65)).toBe("Medium (65%)");
  });
  it("exactly 50 returns Medium", () => {
    expect(formatConfidence(50)).toBe("Medium (50%)");
  });
  it("<50 returns Low", () => {
    expect(formatConfidence(42)).toBe("Low (42%)");
  });
  it("0 returns Low", () => {
    expect(formatConfidence(0)).toBe("Low (0%)");
  });
  it("100 returns High", () => {
    expect(formatConfidence(100)).toBe("High (100%)");
  });
  it("rounds to nearest integer", () => {
    expect(formatConfidence(69.6)).toBe("High (70%)");
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(14.99)).toMatch(/\$14\.99/);
  });
  it("formats zero", () => {
    expect(formatCurrency(0)).toMatch(/\$0\.00/);
  });
  it("formats negative amount", () => {
    expect(formatCurrency(-5.5)).toMatch(/-?\$5\.50|\(.\$5\.50\)/);
  });
  it("formats large amount", () => {
    expect(formatCurrency(1000)).toMatch(/\$1,000\.00/);
  });
  it("supports EUR", () => {
    const result = formatCurrency(10, "EUR", "en-US");
    expect(result).toMatch(/€/);
  });
});

describe("formatLargeNumber", () => {
  it("formats thousands with K", () => {
    expect(formatLargeNumber(1234)).toBe("1.2K");
  });
  it("formats exact 1K", () => {
    expect(formatLargeNumber(1000)).toBe("1K");
  });
  it("formats millions with M", () => {
    expect(formatLargeNumber(1234567)).toBe("1.2M");
  });
  it("formats billions with B", () => {
    expect(formatLargeNumber(1234567890)).toBe("1.2B");
  });
  it("formats small numbers without suffix", () => {
    expect(formatLargeNumber(999)).toBe("999");
  });
  it("formats negative thousands", () => {
    expect(formatLargeNumber(-1500)).toBe("-1.5K");
  });
  it("strips trailing .0 in suffix", () => {
    expect(formatLargeNumber(2000)).toBe("2K");
    expect(formatLargeNumber(3000000)).toBe("3M");
  });
});

describe("formatDecimalOdds", () => {
  it("converts +100 → 2.00", () => {
    expect(formatDecimalOdds(100)).toBe("2.00");
  });
  it("converts +150 → 2.50", () => {
    expect(formatDecimalOdds(150)).toBe("2.50");
  });
  it("converts -110 → 1.91", () => {
    // 100/110 + 1 = 0.9090... + 1 = 1.9090...
    expect(formatDecimalOdds(-110)).toBe("1.91");
  });
  it("converts -200 → 1.50", () => {
    expect(formatDecimalOdds(-200)).toBe("1.50");
  });
  it("converts +200 → 3.00", () => {
    expect(formatDecimalOdds(200)).toBe("3.00");
  });
  it("converts +0 → 1.00", () => {
    expect(formatDecimalOdds(0)).toBe("1.00");
  });
});

describe("formatFractionalOdds", () => {
  it("+150 → 3/2", () => {
    expect(formatFractionalOdds(150)).toBe("3/2");
  });
  it("-110 → 10/11", () => {
    expect(formatFractionalOdds(-110)).toBe("10/11");
  });
  it("+100 → 1/1 (evens)", () => {
    expect(formatFractionalOdds(100)).toBe("1/1");
  });
  it("-200 → 1/2", () => {
    expect(formatFractionalOdds(-200)).toBe("1/2");
  });
  it("+200 → 2/1", () => {
    expect(formatFractionalOdds(200)).toBe("2/1");
  });
  it("+250 → 5/2", () => {
    expect(formatFractionalOdds(250)).toBe("5/2");
  });
  it("-300 → 1/3", () => {
    expect(formatFractionalOdds(-300)).toBe("1/3");
  });
});

describe("ordinalSuffix", () => {
  it("1 → 1st", () => expect(ordinalSuffix(1)).toBe("1st"));
  it("2 → 2nd", () => expect(ordinalSuffix(2)).toBe("2nd"));
  it("3 → 3rd", () => expect(ordinalSuffix(3)).toBe("3rd"));
  it("4 → 4th", () => expect(ordinalSuffix(4)).toBe("4th"));
  it("11 → 11th (teen exception)", () => expect(ordinalSuffix(11)).toBe("11th"));
  it("12 → 12th (teen exception)", () => expect(ordinalSuffix(12)).toBe("12th"));
  it("13 → 13th (teen exception)", () => expect(ordinalSuffix(13)).toBe("13th"));
  it("21 → 21st", () => expect(ordinalSuffix(21)).toBe("21st"));
  it("22 → 22nd", () => expect(ordinalSuffix(22)).toBe("22nd"));
  it("23 → 23rd", () => expect(ordinalSuffix(23)).toBe("23rd"));
  it("100 → 100th", () => expect(ordinalSuffix(100)).toBe("100th"));
  it("101 → 101st", () => expect(ordinalSuffix(101)).toBe("101st"));
  it("111 → 111th (teen exception)", () => expect(ordinalSuffix(111)).toBe("111th"));
});

describe("formatPercentChange", () => {
  it("positive change", () => {
    expect(formatPercentChange(100, 112.5)).toBe("+12.5%");
  });
  it("negative change", () => {
    expect(formatPercentChange(100, 96.8)).toBe("-3.2%");
  });
  it("from=0, to>0 → +∞%", () => {
    expect(formatPercentChange(0, 100)).toBe("+∞%");
  });
  it("from=0, to<0 → -∞%", () => {
    expect(formatPercentChange(0, -1)).toBe("-∞%");
  });
  it("from=0, to=0 → N/A", () => {
    expect(formatPercentChange(0, 0)).toBe("N/A");
  });
  it("no change → +0.0%", () => {
    expect(formatPercentChange(50, 50)).toBe("+0.0%");
  });
  it("handles negative from", () => {
    expect(formatPercentChange(-100, -50)).toBe("+50.0%");
  });
});

describe("formatDuration", () => {
  it("formats hours minutes seconds", () => {
    expect(formatDuration(2 * 3600000 + 34 * 60000 + 15000)).toBe("2h 34m 15s");
  });
  it("omits zero hours", () => {
    expect(formatDuration(5 * 60000 + 3000)).toBe("5m 3s");
  });
  it("omits zero minutes", () => {
    expect(formatDuration(45000)).toBe("45s");
  });
  it("all zeros → 0s", () => {
    expect(formatDuration(0)).toBe("0s");
  });
  it("exactly 1 hour", () => {
    expect(formatDuration(3600000)).toBe("1h");
  });
  it("fractional ms are floored", () => {
    expect(formatDuration(1500)).toBe("1s");
  });
  it("large duration", () => {
    expect(formatDuration(10 * 3600000)).toBe("10h");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPORTS SCORE FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("formatScore", () => {
  it("with team names", () => {
    expect(formatScore(28, 24, "Chiefs", "Bills")).toBe("Chiefs 28 - 24 Bills");
  });
  it("without team names", () => {
    expect(formatScore(28, 24)).toBe("28-24");
  });
  it("with only home name falls back to no-name format", () => {
    // Only homeName supplied, awayName absent — treated as no-names
    expect(formatScore(3, 1, "Lakers")).toBe("3-1");
  });
  it("zero-zero score", () => {
    expect(formatScore(0, 0)).toBe("0-0");
  });
  it("with team names zero-zero", () => {
    expect(formatScore(0, 0, "Team A", "Team B")).toBe("Team A 0 - 0 Team B");
  });
});

describe("formatRecord", () => {
  it("win-loss without draws", () => {
    expect(formatRecord(12, 4)).toBe("12-4");
  });
  it("win-loss-draw", () => {
    expect(formatRecord(12, 4, 2)).toBe("12-4-2");
  });
  it("0-0 record", () => {
    expect(formatRecord(0, 0)).toBe("0-0");
  });
  it("0 draws explicitly", () => {
    expect(formatRecord(10, 5, 0)).toBe("10-5-0");
  });
});

describe("formatSpread", () => {
  it("positive spread", () => {
    expect(formatSpread(3.5)).toBe("+3.5");
  });
  it("negative spread", () => {
    expect(formatSpread(-7)).toBe("-7");
  });
  it("zero spread", () => {
    expect(formatSpread(0)).toBe("+0");
  });
  it("strips trailing .0", () => {
    expect(formatSpread(-7.0)).toBe("-7");
    expect(formatSpread(3.0)).toBe("+3");
  });
  it("preserves half-point", () => {
    expect(formatSpread(-3.5)).toBe("-3.5");
  });
});

describe("formatTotal", () => {
  it("over format", () => {
    expect(formatTotal(47.5, "over")).toBe("O 47.5");
  });
  it("under format", () => {
    expect(formatTotal(47.5, "under")).toBe("U 47.5");
  });
  it("whole number total", () => {
    expect(formatTotal(48, "over")).toBe("O 48");
  });
});

describe("formatPickLine", () => {
  it("spread pick", () => {
    expect(formatPickLine("spread", -3.5, -110)).toBe("Spread: -3.5 (-110)");
  });
  it("moneyline pick", () => {
    expect(formatPickLine("moneyline", 0, 145)).toBe("Moneyline: +145");
  });
  it("total pick", () => {
    expect(formatPickLine("total", 47.5, -110)).toBe("Total: O 47.5 (-110)");
  });
  it("spread with positive odds", () => {
    expect(formatPickLine("spread", 3.5, 110)).toBe("Spread: +3.5 (+110)");
  });
  it("spread zero line", () => {
    expect(formatPickLine("spread", 0, -110)).toBe("Spread: +0 (-110)");
  });
});

describe("formatTimeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-06T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("just now (< 60s)", () => {
    const date = new Date(Date.now() - 30000);
    expect(formatTimeAgo(date)).toBe("just now");
  });
  it("just now (exactly 59s)", () => {
    const date = new Date(Date.now() - 59000);
    expect(formatTimeAgo(date)).toBe("just now");
  });
  it("5 minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("5m ago");
  });
  it("59 minutes ago", () => {
    const date = new Date(Date.now() - 59 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("59m ago");
  });
  it("2 hours ago", () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("2h ago");
  });
  it("23 hours ago", () => {
    const date = new Date(Date.now() - 23 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("23h ago");
  });
  it("3 days ago", () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("3d ago");
  });
  it("6 days ago (still days)", () => {
    const date = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("6d ago");
  });
  it("2 weeks ago", () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("2w ago");
  });
  it("1 month ago", () => {
    const date = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("1mo ago");
  });
  it("2 years ago", () => {
    const date = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(date)).toBe("2yr ago");
  });
});

describe("formatGameTime", () => {
  it("returns Today for today's date", () => {
    // Use a fixed time in EST (non-DST period)
    const now = new Date("2025-01-06T18:00:00Z"); // 1pm ET (UTC-5)
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const gameDate = new Date("2025-01-07T00:30:00Z"); // 7:30pm ET same day
    const result = formatGameTime(gameDate);
    expect(result).toMatch(/Today/);
    vi.useRealTimers();
  });

  it("returns Tomorrow for next day", () => {
    const now = new Date("2025-01-06T18:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const gameDate = new Date("2025-01-08T00:30:00Z"); // Jan 7 in ET (next day)
    const result = formatGameTime(gameDate);
    expect(result).toMatch(/Tomorrow/);
    vi.useRealTimers();
  });

  it("includes ET in output", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-06T18:00:00Z"));
    const gameDate = new Date("2025-01-10T18:30:00Z");
    const result = formatGameTime(gameDate);
    expect(result).toMatch(/ET/);
    vi.useRealTimers();
  });

  it("non-today non-tomorrow includes abbreviated day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-06T18:00:00Z"));
    const gameDate = new Date("2025-01-10T00:00:00Z"); // Jan 9 ET
    const result = formatGameTime(gameDate);
    expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    vi.useRealTimers();
  });
});

describe("formatQuarter", () => {
  it("Q3 with time remaining", () => {
    expect(formatQuarter(3, "4:32")).toBe("Q3 4:32");
  });
  it("Q1 start", () => {
    expect(formatQuarter(1, "15:00")).toBe("Q1 15:00");
  });
  it("Q4 final seconds", () => {
    expect(formatQuarter(4, "0:05")).toBe("Q4 0:05");
  });
});

describe("formatInning", () => {
  it("Top 7th", () => {
    expect(formatInning(7, true)).toBe("Top 7th");
  });
  it("Bot 3rd", () => {
    expect(formatInning(3, false)).toBe("Bot 3rd");
  });
  it("Top 1st", () => {
    expect(formatInning(1, true)).toBe("Top 1st");
  });
  it("Bot 9th", () => {
    expect(formatInning(9, false)).toBe("Bot 9th");
  });
  it("Top 11th", () => {
    expect(formatInning(11, true)).toBe("Top 11th");
  });
});

describe("formatPeriod", () => {
  it("NHL 1st Period", () => {
    expect(formatPeriod(1, "nhl")).toBe("1st Period");
  });
  it("NHL 2nd Period", () => {
    expect(formatPeriod(2, "nhl")).toBe("2nd Period");
  });
  it("NHL 3rd Period", () => {
    expect(formatPeriod(3, "nhl")).toBe("3rd Period");
  });
  it("NHL OT (period 4)", () => {
    expect(formatPeriod(4, "nhl")).toBe("OT");
  });
  it("NBA 1st Quarter", () => {
    expect(formatPeriod(1, "nba")).toBe("1st Quarter");
  });
  it("NBA 4th Quarter", () => {
    expect(formatPeriod(4, "nba")).toBe("4th Quarter");
  });
  it("NBA OT (period 5)", () => {
    expect(formatPeriod(5, "nba")).toBe("OT");
  });
  it("NFL 1st Quarter", () => {
    expect(formatPeriod(1, "nfl")).toBe("1st Quarter");
  });
  it("NFL OT (period 5)", () => {
    expect(formatPeriod(5, "nfl")).toBe("OT");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEXT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
  });
  it("leaves rest unchanged", () => {
    expect(capitalize("hELLO")).toBe("HELLO");
  });
  it("empty string", () => {
    expect(capitalize("")).toBe("");
  });
  it("single char", () => {
    expect(capitalize("a")).toBe("A");
  });
  it("already capitalized", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });
});

describe("titleCase", () => {
  it("capitalizes each word", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });
  it("handles single word", () => {
    expect(titleCase("hello")).toBe("Hello");
  });
  it("handles multiple spaces", () => {
    expect(titleCase("the quick brown fox")).toBe("The Quick Brown Fox");
  });
  it("already title case", () => {
    expect(titleCase("Hello World")).toBe("Hello World");
  });
  it("empty string", () => {
    expect(titleCase("")).toBe("");
  });
});

describe("truncate", () => {
  it("truncates long string", () => {
    expect(truncate("Hello, World!", 8)).toBe("Hello...");
  });
  it("no truncation needed", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });
  it("exact length no truncation", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });
  it("custom suffix", () => {
    expect(truncate("Hello World", 8, "…")).toBe("Hello W…");
  });
  it("empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
  it("maxLen equals suffix length", () => {
    expect(truncate("Hello", 3)).toBe("...");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("removes non-alphanumeric except hyphens", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });
  it("handles multiple spaces (collapsed to single hyphens)", () => {
    // Each space sequence → one hyphen; leading/trailing spaces → leading/trailing hyphens
    expect(slugify("  hello   world  ")).toBe("-hello-world-");
  });
  it("empty string", () => {
    expect(slugify("")).toBe("");
  });
  it("already slugified", () => {
    expect(slugify("hello-world")).toBe("hello-world");
  });
  it("removes special characters", () => {
    expect(slugify("Super Bowl LVII")).toBe("super-bowl-lvii");
  });
});

describe("formatList", () => {
  it("empty array", () => {
    expect(formatList([])).toBe("");
  });
  it("single item", () => {
    expect(formatList(["A"])).toBe("A");
  });
  it("two items with and", () => {
    expect(formatList(["A", "B"])).toBe("A and B");
  });
  it("three items with Oxford comma", () => {
    expect(formatList(["A", "B", "C"])).toBe("A, B, and C");
  });
  it("four items", () => {
    expect(formatList(["A", "B", "C", "D"])).toBe("A, B, C, and D");
  });
  it("two items with or", () => {
    expect(formatList(["A", "B"], "or")).toBe("A or B");
  });
  it("three items with or", () => {
    expect(formatList(["A", "B", "C"], "or")).toBe("A, B, or C");
  });
});

describe("pluralize", () => {
  it("singular form for 1", () => {
    expect(pluralize(1, "pick")).toBe("1 pick");
  });
  it("plural form for 0", () => {
    expect(pluralize(0, "pick")).toBe("0 picks");
  });
  it("plural form for 2", () => {
    expect(pluralize(2, "pick")).toBe("2 picks");
  });
  it("custom plural", () => {
    expect(pluralize(2, "ox", "oxen")).toBe("2 oxen");
  });
  it("custom plural for 1", () => {
    expect(pluralize(1, "ox", "oxen")).toBe("1 ox");
  });
  it("large number", () => {
    expect(pluralize(100, "game")).toBe("100 games");
  });
});

describe("formatInitials", () => {
  it("two word name", () => {
    expect(formatInitials("John Smith")).toBe("JS");
  });
  it("three word name", () => {
    expect(formatInitials("LeBron James")).toBe("LJ");
  });
  it("single name", () => {
    expect(formatInitials("Prince")).toBe("P");
  });
  it("extra spaces trimmed", () => {
    expect(formatInitials("  John  Smith  ")).toBe("JS");
  });
  it("lowercase input", () => {
    expect(formatInitials("john smith")).toBe("JS");
  });
});

describe("maskEmail", () => {
  it("shows first 2 chars + ***", () => {
    expect(maskEmail("john@example.com")).toBe("jo***@example.com");
  });
  it("short local part", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
  });
  it("no at sign returns as-is", () => {
    expect(maskEmail("notanemail")).toBe("notanemail");
  });
  it("shows full domain", () => {
    expect(maskEmail("user@sub.domain.com")).toBe("us***@sub.domain.com");
  });
});

describe("maskCreditCard", () => {
  it("shows last 4 digits in groups", () => {
    expect(maskCreditCard("4111111111111234")).toBe("**** **** **** 1234");
  });
  it("handles spaced input", () => {
    expect(maskCreditCard("4111 1111 1111 1234")).toBe("**** **** **** 1234");
  });
  it("handles short card", () => {
    const result = maskCreditCard("12341234");
    expect(result).toContain("1234");
    expect(result).toMatch(/\*/);
  });
});

describe("wrapText", () => {
  it("wraps at word boundary", () => {
    const result = wrapText("Hello World how are you", 10);
    expect(result.every((line) => line.length <= 10)).toBe(true);
  });
  it("single long word", () => {
    const result = wrapText("Superlongword", 5);
    expect(result).toEqual(["Superlongword"]);
  });
  it("short text fits on one line", () => {
    expect(wrapText("Hello", 10)).toEqual(["Hello"]);
  });
  it("empty string returns empty array (no words to wrap)", () => {
    expect(wrapText("", 10)).toEqual([]);
  });
  it("multiple lines", () => {
    const result = wrapText("one two three four five", 9);
    expect(result.length).toBeGreaterThan(1);
    result.forEach((line) => expect(line.length).toBeLessThanOrEqual(9));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DATE/TIME FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("formatDateShort", () => {
  it("formats Jan 6, 2025", () => {
    // Use local date to avoid timezone offset issues in test
    const date = new Date(2025, 0, 6); // Jan 6, 2025 local
    expect(formatDateShort(date)).toBe("Jan 6, 2025");
  });
  it("formats Dec 31", () => {
    const date = new Date(2024, 11, 31);
    expect(formatDateShort(date)).toBe("Dec 31, 2024");
  });
});

describe("formatDateLong", () => {
  it("includes weekday, month, day, year", () => {
    const date = new Date(2025, 0, 6); // Monday, January 6, 2025
    const result = formatDateLong(date);
    expect(result).toMatch(/Monday/);
    expect(result).toMatch(/January/);
    expect(result).toMatch(/2025/);
  });
});

describe("formatDateISO", () => {
  it("formats YYYY-MM-DD", () => {
    const date = new Date(2025, 0, 6); // Jan 6, 2025 local
    expect(formatDateISO(date)).toBe("2025-01-06");
  });
  it("zero-pads month and day", () => {
    const date = new Date(2025, 2, 5); // Mar 5
    expect(formatDateISO(date)).toBe("2025-03-05");
  });
});

describe("formatTime12", () => {
  it("formats time with AM/PM", () => {
    const date = new Date(2025, 0, 6, 19, 30, 0); // 7:30 PM local
    const result = formatTime12(date);
    expect(result).toMatch(/7:30 PM|7:30pm/i);
  });
  it("formats midnight", () => {
    const date = new Date(2025, 0, 6, 0, 0, 0);
    const result = formatTime12(date);
    expect(result).toMatch(/12:00 AM|12:00am/i);
  });
  it("formats noon", () => {
    const date = new Date(2025, 0, 6, 12, 0, 0);
    const result = formatTime12(date);
    expect(result).toMatch(/12:00 PM|12:00pm/i);
  });
});

describe("formatTime24", () => {
  it("formats 19:30", () => {
    const date = new Date(2025, 0, 6, 19, 30, 0);
    expect(formatTime24(date)).toBe("19:30");
  });
  it("formats midnight 00:00", () => {
    const date = new Date(2025, 0, 6, 0, 0, 0);
    expect(formatTime24(date)).toBe("00:00");
  });
  it("pads single digit hour", () => {
    const date = new Date(2025, 0, 6, 9, 5, 0);
    expect(formatTime24(date)).toBe("09:05");
  });
});

describe("daysBetween", () => {
  it("same day → 0", () => {
    const a = new Date("2025-01-06");
    const b = new Date("2025-01-06");
    expect(daysBetween(a, b)).toBe(0);
  });
  it("one day apart", () => {
    const a = new Date("2025-01-06");
    const b = new Date("2025-01-07");
    expect(daysBetween(a, b)).toBe(1);
  });
  it("order does not matter", () => {
    const a = new Date("2025-01-01");
    const b = new Date("2025-01-10");
    expect(daysBetween(a, b)).toBe(9);
    expect(daysBetween(b, a)).toBe(9);
  });
  it("one year apart", () => {
    const a = new Date("2024-01-06");
    const b = new Date("2025-01-06");
    expect(daysBetween(a, b)).toBe(366); // 2024 is leap year
  });
});

describe("isToday", () => {
  it("returns true for today", () => {
    expect(isToday(new Date())).toBe(true);
  });
  it("returns false for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
  it("returns false for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });
});

describe("isTomorrow", () => {
  it("returns true for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isTomorrow(tomorrow)).toBe(true);
  });
  it("returns false for today", () => {
    expect(isTomorrow(new Date())).toBe(false);
  });
  it("returns false for day after tomorrow", () => {
    const day = new Date();
    day.setDate(day.getDate() + 2);
    expect(isTomorrow(day)).toBe(false);
  });
});

describe("startOfDay", () => {
  it("returns midnight UTC", () => {
    const date = new Date("2025-01-06T15:30:00Z");
    const start = startOfDay(date);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
    expect(start.getUTCMilliseconds()).toBe(0);
  });
  it("preserves the same UTC date", () => {
    const date = new Date("2025-01-06T23:59:59Z");
    const start = startOfDay(date);
    expect(start.getUTCFullYear()).toBe(2025);
    expect(start.getUTCMonth()).toBe(0);
    expect(start.getUTCDate()).toBe(6);
  });
});

describe("endOfDay", () => {
  it("returns 23:59:59.999 UTC", () => {
    const date = new Date("2025-01-06T00:00:00Z");
    const end = endOfDay(date);
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
    expect(end.getUTCSeconds()).toBe(59);
    expect(end.getUTCMilliseconds()).toBe(999);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const date = new Date(2025, 0, 6);
    const result = addDays(date, 5);
    expect(result.getDate()).toBe(11);
    expect(result.getMonth()).toBe(0);
  });
  it("adds negative days (subtracts)", () => {
    const date = new Date(2025, 0, 6);
    const result = addDays(date, -3);
    expect(result.getDate()).toBe(3);
  });
  it("adds zero days returns same date", () => {
    const date = new Date(2025, 0, 6);
    const result = addDays(date, 0);
    expect(result.getDate()).toBe(6);
  });
  it("does not mutate original", () => {
    const date = new Date(2025, 0, 6);
    addDays(date, 5);
    expect(date.getDate()).toBe(6);
  });
  it("crosses month boundary", () => {
    const date = new Date(2025, 0, 28);
    const result = addDays(date, 5);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. TABLE / STANDINGS FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

describe("formatStandingsRow", () => {
  it("produces a padded string", () => {
    const row = formatStandingsRow(1, "Chiefs", 12, 4, 0.75, 0);
    expect(row).toContain("Chiefs");
    expect(row).toContain("12");
    expect(row).toContain("0.750");
  });

  it("shows dash for GB=0", () => {
    const row = formatStandingsRow(1, "Chiefs", 12, 4, 0.75, 0);
    expect(row).toContain("-");
  });

  it("shows GB value when > 0", () => {
    const row = formatStandingsRow(2, "Bills", 10, 6, 0.625, 2);
    expect(row).toContain("2.0");
  });

  it("rank is included", () => {
    const row = formatStandingsRow(3, "Dolphins", 8, 8, 0.5, 4);
    expect(row).toMatch(/^3/);
  });
});

describe("formatLeaderboard", () => {
  const entries = [
    { name: "Alice", score: 95 },
    { name: "Bob", score: 80 },
    { name: "Carol", score: 80 },
    { name: "Dave", score: 70 },
  ];

  it("sorts by score descending", () => {
    const result = formatLeaderboard(entries);
    expect(result[0]).toContain("Alice");
  });

  it("assigns same rank to ties", () => {
    const result = formatLeaderboard(entries);
    expect(result[1]).toMatch(/^2\./);
    expect(result[2]).toMatch(/^2\./); // tie
  });

  it("rank gap after tie", () => {
    const result = formatLeaderboard(entries);
    expect(result[3]).toMatch(/^4\./); // gap after 2-way tie at rank 2
  });

  it("respects maxEntries", () => {
    const result = formatLeaderboard(entries, 2);
    expect(result).toHaveLength(2);
  });

  it("includes name and score", () => {
    const result = formatLeaderboard([{ name: "Alice", score: 100 }]);
    expect(result[0]).toBe("1. Alice: 100");
  });

  it("default maxEntries is 10", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      name: `Player${i}`,
      score: 100 - i,
    }));
    const result = formatLeaderboard(many);
    expect(result).toHaveLength(10);
  });
});

describe("formatStatLine", () => {
  it("formats key-value pairs with default separator", () => {
    const result = formatStatLine({ PTS: 28.3, REB: 7.2, AST: 5.1 });
    expect(result).toBe("PTS: 28.3 | REB: 7.2 | AST: 5.1");
  });

  it("supports custom separator", () => {
    const result = formatStatLine({ PTS: 28, REB: 7 }, " / ");
    expect(result).toBe("PTS: 28 / REB: 7");
  });

  it("handles single stat", () => {
    expect(formatStatLine({ PTS: 30 })).toBe("PTS: 30");
  });

  it("handles string values", () => {
    const result = formatStatLine({ NAME: "LeBron", TEAM: "Lakers" });
    expect(result).toBe("NAME: LeBron | TEAM: Lakers");
  });
});

describe("rightPad", () => {
  it("pads with spaces", () => {
    expect(rightPad("hi", 5)).toBe("hi   ");
  });
  it("exact width returns as-is", () => {
    expect(rightPad("hello", 5)).toBe("hello");
  });
  it("longer than width returns as-is", () => {
    expect(rightPad("hello world", 5)).toBe("hello world");
  });
  it("custom char", () => {
    expect(rightPad("hi", 5, "-")).toBe("hi---");
  });
  it("empty string padded", () => {
    expect(rightPad("", 3)).toBe("   ");
  });
});

describe("leftPad", () => {
  it("pads with spaces on left", () => {
    expect(leftPad("hi", 5)).toBe("   hi");
  });
  it("exact width returns as-is", () => {
    expect(leftPad("hello", 5)).toBe("hello");
  });
  it("longer than width returns as-is", () => {
    expect(leftPad("hello world", 5)).toBe("hello world");
  });
  it("custom char", () => {
    expect(leftPad("42", 5, "0")).toBe("00042");
  });
  it("empty string padded", () => {
    expect(leftPad("", 3)).toBe("   ");
  });
});
