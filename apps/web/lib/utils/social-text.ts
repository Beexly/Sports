/**
 * Social text formatting utilities — pure, zero dependencies.
 *
 * Pick sharing text, hashtag generation, character counting,
 * and platform-specific text truncation for Twitter/X, Bluesky,
 * Threads, and Telegram.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SocialPlatform = "twitter" | "bluesky" | "threads" | "telegram";

export interface PlatformLimits {
  readonly maxChars: number;
  readonly urlLength: number; // how URLs are counted (Twitter counts all URLs as 23)
  readonly supportsHashtags: boolean;
}

export interface ShareText {
  readonly platform: SocialPlatform;
  readonly text: string;
  readonly charCount: number;
  readonly fits: boolean; // charCount <= maxChars
  readonly truncated: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLATFORM_LIMITS: Record<SocialPlatform, PlatformLimits> = {
  twitter: { maxChars: 280, urlLength: 23, supportsHashtags: true },
  bluesky: { maxChars: 300, urlLength: 23, supportsHashtags: true },
  threads: { maxChars: 500, urlLength: 0, supportsHashtags: true },
  telegram: { maxChars: 4096, urlLength: 0, supportsHashtags: true },
};

// ---------------------------------------------------------------------------
// URL regex
// ---------------------------------------------------------------------------

const URL_REGEX = /https?:\/\/\S+/g;

// ---------------------------------------------------------------------------
// Core character counting
// ---------------------------------------------------------------------------

/**
 * Count effective characters for a platform.
 * For twitter/bluesky, URLs are each counted as urlLength chars.
 * For others, just use text.length.
 */
export function countChars(text: string, platform: SocialPlatform): number {
  const limits = PLATFORM_LIMITS[platform];
  if (limits.urlLength === 0) {
    return text.length;
  }
  // Replace each URL with a placeholder of urlLength chars, then measure
  const replaced = text.replace(URL_REGEX, "_".repeat(limits.urlLength));
  return replaced.length;
}

/**
 * Returns true if the text fits within the platform's character limit.
 */
export function fitsPlatform(text: string, platform: SocialPlatform): boolean {
  return countChars(text, platform) <= PLATFORM_LIMITS[platform].maxChars;
}

/**
 * Truncate text to fit within a platform's character limit.
 * Appends suffix if truncated. Accounts for URL lengths when measuring.
 */
export function truncateForPlatform(
  text: string,
  platform: SocialPlatform,
  suffix = "…"
): string {
  if (fitsPlatform(text, platform)) return text;

  const limits = PLATFORM_LIMITS[platform];
  const maxChars = limits.maxChars;
  const suffixLen = suffix.length;

  // Binary search: find longest prefix (by character slice) that fits
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid) + suffix;
    if (countChars(candidate, platform) <= maxChars) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  // Edge case: even suffix alone doesn't fit
  if (lo === 0 && countChars(suffix, platform) > maxChars) {
    return suffix.slice(0, maxChars - suffixLen) + suffix;
  }

  return text.slice(0, lo) + suffix;
}

// ---------------------------------------------------------------------------
// Pick share text
// ---------------------------------------------------------------------------

/**
 * Build a pick share text for a given platform.
 * Format: "🎯 {pick} ({sport}) | Odds: {odds}{confidence part}\n{url}"
 */
export function buildPickShareText(params: {
  pick: string;
  sport: string;
  odds: string;
  confidence?: number;
  platform: SocialPlatform;
  url?: string;
}): ShareText {
  const { pick, sport, odds, confidence, platform, url } = params;

  const confidencePart =
    confidence !== undefined && confidence >= 80 ? " | High confidence" : "";

  let text = `🎯 ${pick} (${sport}) | Odds: ${odds}${confidencePart}`;

  if (url) {
    text += `\n${url}`;
  }

  const truncated = !fitsPlatform(text, platform);
  const finalText = truncated ? truncateForPlatform(text, platform) : text;
  const charCount = countChars(finalText, platform);

  return {
    platform,
    text: finalText,
    charCount,
    fits: charCount <= PLATFORM_LIMITS[platform].maxChars,
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Hashtag generation
// ---------------------------------------------------------------------------

const SPORT_HASHTAGS: Record<string, string[]> = {
  NFL: ["#NFL", "#NFLPicks", "#SportsBetting"],
  NBA: ["#NBA", "#NBAPicks", "#SportsBetting"],
  MLB: ["#MLB", "#MLBPicks", "#SportsBetting"],
  NHL: ["#NHL", "#NHLPicks", "#SportsBetting"],
  EPL: ["#EPL", "#Soccer", "#FootballPicks"],
  Soccer: ["#EPL", "#Soccer", "#FootballPicks"],
  CFB: ["#CFB", "#CollegeFootball", "#CFBPicks"],
  NCAAF: ["#CFB", "#CollegeFootball", "#CFBPicks"],
  NCAAB: ["#NCAAB", "#CollegeBasketball", "#MarchMadness"],
};

const GENERAL_HASHTAG = "#GalaxySportsEdge";

/**
 * Generate sport-relevant hashtags.
 * @param sport - Sport identifier (e.g. "NFL", "NBA", "MLB")
 * @param opts.maxTags - Limit the number of hashtags returned
 * @param opts.includeGeneral - Include "#GalaxySportsEdge" (default false)
 */
export function generateHashtags(
  sport: string,
  opts: { maxTags?: number; includeGeneral?: boolean } = {}
): string[] {
  const { maxTags, includeGeneral = false } = opts;

  const base = SPORT_HASHTAGS[sport] ?? [`#${sport}`, "#SportsBetting"];
  const tags = includeGeneral ? [...base, GENERAL_HASHTAG] : [...base];

  if (maxTags !== undefined) {
    return tags.slice(0, maxTags);
  }
  return tags;
}

/**
 * Append hashtags to text, respecting the platform's character limit.
 * Adds hashtags one by one until adding the next would exceed the limit.
 */
export function appendHashtags(
  text: string,
  hashtags: string[],
  platform: SocialPlatform,
  maxChars?: number
): string {
  const limit = maxChars ?? PLATFORM_LIMITS[platform].maxChars;
  let result = text;

  for (const tag of hashtags) {
    const candidate = result + "\n" + tag;
    if (countChars(candidate, platform) <= limit) {
      result = candidate;
    } else {
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Alert and preview text builders
// ---------------------------------------------------------------------------

/**
 * Build an odds change alert string.
 * "⚡ Line move: {team} {line} moved {oldOdds}→{newOdds} ({direction emoji})"
 */
export function buildOddsChangeAlert(params: {
  team: string;
  line: string;
  oldOdds: string;
  newOdds: string;
  direction: "up" | "down";
}): string {
  const { team, line, oldOdds, newOdds, direction } = params;
  const emoji = direction === "up" ? "📈" : "📉";
  return `⚡ Line move: ${team} ${line} moved ${oldOdds}→${newOdds} (${emoji})`;
}

/**
 * Build a game preview text string.
 * "{awayTeam} @ {homeTeam} | {sport} | {gameTime}{spread part}"
 */
export function buildGamePreviewText(params: {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  gameTime: string;
  spread?: string;
}): string {
  const { homeTeam, awayTeam, sport, gameTime, spread } = params;
  const spreadPart = spread !== undefined ? ` | ${spread}` : "";
  return `${awayTeam} @ ${homeTeam} | ${sport} | ${gameTime}${spreadPart}`;
}

// ---------------------------------------------------------------------------
// Text analysis utilities
// ---------------------------------------------------------------------------

/**
 * Estimate reading time in seconds.
 * @param wordsPerMinute - Default 200 WPM
 */
export function estimateReadingTime(
  text: string,
  wordsPerMinute = 200
): number {
  const words = wordCount(text);
  return Math.round((words / wordsPerMinute) * 60);
}

/**
 * Count words in a string (split on whitespace, filter empty).
 */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Remove emoji characters from text.
 * Covers common Unicode emoji ranges.
 */
export function stripEmoji(text: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return text.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}-\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}-\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu,
    ""
  );
}

// ---------------------------------------------------------------------------
// Platform URL builder
// ---------------------------------------------------------------------------

/**
 * Build a social profile URL for a given platform and handle.
 */
export function platformUrl(platform: SocialPlatform, handle: string): string {
  switch (platform) {
    case "twitter":
      return `https://twitter.com/${handle}`;
    case "bluesky":
      return `https://bsky.app/profile/${handle}`;
    case "threads":
      return `https://threads.net/@${handle}`;
    case "telegram":
      return `https://t.me/${handle}`;
  }
}
