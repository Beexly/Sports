/**
 * URL slug utilities — pure, zero dependencies.
 *
 * Generate clean, SEO-friendly URL slugs for sports teams, games,
 * picks, players, and content. Includes deduplication, validation,
 * and sports-specific slug conventions.
 */

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SlugifyOptions {
  /** Character used to replace spaces/special chars. Default: "-" */
  separator?: string;
  /** Maximum length for the resulting slug. */
  maxLength?: number;
  /** Lowercase the result. Default: true */
  lowercase?: boolean;
}

// ---------------------------------------------------------------------------
// Sport normalization map
// ---------------------------------------------------------------------------

const SPORT_MAP: Record<string, string> = {
  nfl: "nfl",
  "national football league": "nfl",
  nba: "nba",
  "national basketball association": "nba",
  mlb: "mlb",
  "major league baseball": "mlb",
  nhl: "nhl",
  "national hockey league": "nhl",
  ncaaf: "cfb",
  cfb: "cfb",
  "college football": "cfb",
  ncaab: "ncaab",
  "college basketball": "ncaab",
  epl: "epl",
  "english premier league": "epl",
  "premier league": "epl",
  mls: "mls",
  "major league soccer": "mls",
};

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Strip combining diacritics from a unicode-normalized string.
 * We first decompose (NFD) so accented chars split into base + combining mark,
 * then strip everything in the combining diacritical marks block (U+0300–U+036F).
 */
function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert text to a URL-safe slug.
 *
 * Steps:
 *   1. Remove diacritics (é → e, ñ → n, etc.)
 *   2. Optionally lowercase (default: true)
 *   3. Replace spaces and non-alphanumeric chars with the separator
 *   4. Deduplicate consecutive separators
 *   5. Trim leading/trailing separators
 *   6. Apply maxLength (trim at last separator boundary before limit)
 */
export function slugify(text: string, opts: SlugifyOptions = {}): string {
  const separator = opts.separator ?? "-";
  const lower = opts.lowercase !== false;

  // 1. Remove diacritics
  let s = removeDiacritics(text);

  // 2. Optionally lowercase
  if (lower) s = s.toLowerCase();

  // 3. Replace non-alphanumeric characters (except separator) with separator
  //    We escape the separator char before using it in a regex class
  const sepEsc = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  s = s.replace(new RegExp(`[^a-zA-Z0-9${sepEsc}]+`, "g"), separator);

  // 4. Deduplicate consecutive separators
  s = s.replace(new RegExp(`${sepEsc}+`, "g"), separator);

  // 5. Trim separator from start/end
  s = s.replace(new RegExp(`^${sepEsc}+|${sepEsc}+$`, "g"), "");

  // 6. Apply maxLength
  if (opts.maxLength !== undefined && s.length > opts.maxLength) {
    s = truncateSlug(s, opts.maxLength);
  }

  return s;
}

/**
 * Sport-specific slug: optionally prefix with the slugified sport.
 *
 * slugifyTeam("Kansas City Chiefs", "NFL") → "nfl-kansas-city-chiefs"
 * slugifyTeam("Kansas City Chiefs")        → "kansas-city-chiefs"
 */
export function slugifyTeam(teamName: string, sport?: string): string {
  const teamSlug = slugify(teamName);
  if (!sport) return teamSlug;
  const sportPart = sportSlug(sport);
  return `${sportPart}-${teamSlug}`;
}

/**
 * Build a game slug: "{sport?}-{away-slug}-at-{home-slug}-{YYYY-MM-DD}"
 *
 * slugifyGame("Chiefs", "Raiders", "2024-01-07")        → "raiders-at-chiefs-2024-01-07"
 * slugifyGame("Chiefs", "Raiders", "2024-01-07", "NFL") → "nfl-raiders-at-chiefs-2024-01-07"
 *
 * The convention is away @ home, so away appears first.
 */
export function slugifyGame(
  homeTeam: string,
  awayTeam: string,
  gameDate: string | Date,
  sport?: string,
): string {
  const homeSlug = slugify(homeTeam);
  const awaySlug = slugify(awayTeam);

  let dateStr: string;
  if (gameDate instanceof Date) {
    const y = gameDate.getFullYear();
    const m = String(gameDate.getMonth() + 1).padStart(2, "0");
    const d = String(gameDate.getDate()).padStart(2, "0");
    dateStr = `${y}-${m}-${d}`;
  } else {
    // Accept "YYYY-MM-DD" or ISO string; extract the date portion
    dateStr = gameDate.slice(0, 10);
  }

  const core = `${awaySlug}-at-${homeSlug}-${dateStr}`;
  if (!sport) return core;
  return `${sportSlug(sport)}-${core}`;
}

/**
 * Build a pick page slug.
 *
 * slugifyPick("Chiefs -3.5", "chiefs-at-raiders-2024-01-07")
 *   → "chiefs-35-chiefs-at-raiders-2024-01-07"
 *
 * If id is provided, the first 8 chars are appended:
 *   → "chiefs-35-chiefs-at-raiders-2024-01-07-abc12345"
 */
export function slugifyPick(pick: string, gameSlug: string, id?: string): string {
  const pickSlug = slugify(pick);
  const base = `${pickSlug}-${gameSlug}`;
  if (!id) return base;
  return `${base}-${id.slice(0, 8)}`;
}

/**
 * Build a player page slug.
 *
 * slugifyPlayer("Patrick Mahomes", "Chiefs", "NFL") → "nfl-chiefs-patrick-mahomes"
 * slugifyPlayer("Patrick Mahomes")                  → "patrick-mahomes"
 */
export function slugifyPlayer(
  playerName: string,
  team?: string,
  sport?: string,
): string {
  const playerPart = slugify(playerName);
  const parts: string[] = [];
  if (sport) parts.push(sportSlug(sport));
  if (team) parts.push(slugify(team));
  parts.push(playerPart);
  return parts.join("-");
}

/**
 * Blog/content slug: slugify title and optionally append a date.
 *
 * slugifyContent("Week 15 NFL Preview", "2024-12-12")
 *   → "week-15-nfl-preview-2024-12-12"
 */
export function slugifyContent(title: string, date?: string | Date): string {
  const titleSlug = slugify(title);
  if (!date) return titleSlug;

  let dateStr: string;
  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    dateStr = `${y}-${m}-${d}`;
  } else {
    dateStr = date.slice(0, 10);
  }

  return `${titleSlug}-${dateStr}`;
}

/**
 * Return true if the slug contains only valid characters:
 *   [a-z0-9-], non-empty, no leading/trailing dash, no consecutive dashes.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Normalize an already-partially-slugified string:
 * lowercase, remove invalid chars, deduplicate dashes, trim edges.
 */
export function normalizeSlug(slug: string): string {
  return slugify(slug);
}

/**
 * Deduplicate an array of slugs. Collisions get "-2", "-3", etc. appended.
 *
 * uniqueSlugs(["a", "a", "a"]) → ["a", "a-2", "a-3"]
 */
export function uniqueSlugs(slugs: string[]): string[] {
  const seen = new Map<string, number>();
  return slugs.map((slug) => {
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    if (count === 0) return slug;
    // Find the next available suffix
    let suffix = count + 1;
    // Ensure the suffixed version is itself not already in seen
    while (seen.has(`${slug}-${suffix}`)) {
      suffix++;
    }
    const result = `${slug}-${suffix}`;
    seen.set(result, 1);
    return result;
  });
}

/**
 * Convert a slug back to title case.
 *
 * slugToTitle("kansas-city-chiefs") → "Kansas City Chiefs"
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Extract a YYYY-MM-DD date from a slug if one is present.
 *
 * extractDateFromSlug("nfl-chiefs-at-raiders-2024-01-07") → "2024-01-07"
 * extractDateFromSlug("no-date-here")                     → null
 */
export function extractDateFromSlug(slug: string): string | null {
  const match = slug.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Build a full pick URL.
 *
 * buildPickUrl("https://galaxysportsedge.com", "nfl-chiefs-35")
 *   → "https://galaxysportsedge.com/picks/nfl-chiefs-35"
 */
export function buildPickUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/$/, "")}/picks/${slug}`;
}

/**
 * Build a team URL.
 *
 * buildTeamUrl("https://example.com", "NFL", "chiefs")
 *   → "https://example.com/nfl/chiefs"
 */
export function buildTeamUrl(
  baseUrl: string,
  sport: string,
  teamSlug: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/${sport.toLowerCase()}/${teamSlug}`;
}

/**
 * Build a player URL.
 *
 * buildPlayerUrl("https://example.com", "NFL", "mahomes")
 *   → "https://example.com/players/nfl/mahomes"
 */
export function buildPlayerUrl(
  baseUrl: string,
  sport: string,
  playerSlug: string,
): string {
  return `${baseUrl.replace(/\/$/, "")}/players/${sport.toLowerCase()}/${playerSlug}`;
}

/**
 * Truncate a slug to at most maxLength characters, without cutting mid-word.
 * Trailing dashes are removed.
 *
 * truncateSlug("a-very-long-slug", 10) → "a-very"  (no trailing dash)
 */
export function truncateSlug(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) return slug;
  let truncated = slug.slice(0, maxLength);
  // If we cut in the middle of a word segment, back up to the last dash
  const lastDash = truncated.lastIndexOf("-");
  if (lastDash > 0 && truncated.length === maxLength && slug[maxLength] !== "-") {
    // Only trim at the dash if we're not already on a boundary
    truncated = truncated.slice(0, lastDash);
  }
  // Remove trailing dash
  return truncated.replace(/-+$/, "");
}

/**
 * Normalize a sport abbreviation or full name to a consistent slug.
 *
 * sportSlug("NFL")                     → "nfl"
 * sportSlug("National Football League") → "nfl"
 * sportSlug("NCAAF")                   → "cfb"
 * sportSlug("unknown-sport")           → "unknown-sport"
 */
export function sportSlug(sport: string): string {
  const key = sport.toLowerCase().trim();
  return SPORT_MAP[key] ?? slugify(sport);
}
