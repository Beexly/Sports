/**
 * Fuzzy search and string matching utilities — pure, zero dependencies.
 *
 * Levenshtein distance, fuzzy match scoring, token overlap,
 * sports team search, pick search, and suggestion ranking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FuzzyMatch<T> {
  readonly item: T;
  readonly score: number; // [0, 1] — higher is better match
  readonly highlights: readonly string[]; // matching token segments
}

export interface SearchOptions {
  readonly maxResults?: number;
  readonly minScore?: number; // default 0.1
  readonly caseSensitive?: boolean;
}

// ---------------------------------------------------------------------------
// Levenshtein distance
// ---------------------------------------------------------------------------

/**
 * Classic dynamic programming Levenshtein edit distance.
 * Number of insertions, deletions, substitutions to transform a → b.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows to save memory
  let prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  let curr: number[] = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,        // deletion
        (curr[j - 1] ?? 0) + 1,    // insertion
        (prev[j - 1] ?? 0) + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n] ?? 0;
}

/**
 * Levenshtein(a, b) / max(a.length, b.length).
 * Returns 0 for identical strings, 1 for maximally different.
 * Returns 0 if both empty.
 */
export function normalizedLevenshtein(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshtein(a, b) / maxLen;
}

/**
 * 1 - normalizedLevenshtein(a, b).
 * Returns number in [0, 1]; 1 = identical.
 */
export function similarity(a: string, b: string): number {
  return 1 - normalizedLevenshtein(a, b);
}

// ---------------------------------------------------------------------------
// Token-level Jaccard similarity
// ---------------------------------------------------------------------------

/**
 * Token-level Jaccard similarity.
 * Tokenizes both strings, computes intersection / union.
 * Returns [0, 1].
 */
export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionSize++;
  }

  const unionSize = tokensA.size + tokensB.size - intersectionSize;
  return intersectionSize / unionSize;
}

// ---------------------------------------------------------------------------
// Longest Common Subsequence / Substring
// ---------------------------------------------------------------------------

/**
 * Length of longest common subsequence (not substring).
 */
export function longestCommonSubsequence(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0 || n === 0) return 0;

  // Build DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = (dp[i - 1]![j - 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
      }
    }
  }

  return dp[m]![n] ?? 0;
}

/**
 * Length of longest common contiguous substring.
 */
export function longestCommonSubstring(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0 || n === 0) return 0;

  let maxLen = 0;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = (dp[i - 1]![j - 1] ?? 0) + 1;
        if (dp[i]![j]! > maxLen) maxLen = dp[i]![j]!;
      } else {
        dp[i]![j] = 0;
      }
    }
  }

  return maxLen;
}

// ---------------------------------------------------------------------------
// Prefix scoring
// ---------------------------------------------------------------------------

/**
 * How strongly the target starts with the query.
 * - target.toLowerCase().startsWith(query.toLowerCase()) → 1.0
 * - If first word of target starts with query → 0.8
 * - Otherwise 0
 */
export function prefixScore(query: string, target: string): number {
  if (query.length === 0) return 0;

  const lQuery = query.toLowerCase();
  const lTarget = target.toLowerCase();

  if (lTarget.startsWith(lQuery)) return 1.0;

  const firstWord = lTarget.split(/\s+/)[0] ?? "";
  if (firstWord.startsWith(lQuery)) return 0.8;

  return 0;
}

// ---------------------------------------------------------------------------
// Initialism
// ---------------------------------------------------------------------------

/**
 * Build abbreviation from first letters: "New England Patriots" → "NEP".
 * Splits on whitespace, takes first char of each word, uppercase.
 */
export function initialism(words: string): string {
  return words
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Returns true if query is a prefix of initialism(target), case-insensitive.
 * "ne" matches "New England Patriots" via "NEP".
 */
export function matchesInitialism(query: string, target: string): boolean {
  if (query.length === 0) return false;
  const abbr = initialism(target);
  return abbr.toLowerCase().startsWith(query.toLowerCase());
}

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

/**
 * Split on whitespace and punctuation, lowercase, remove empty strings.
 * "New England Patriots" → ["new", "england", "patriots"]
 */
export function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Composite fuzzy score
// ---------------------------------------------------------------------------

/**
 * Score a single query token against a single target token.
 * Boosts when the query token is a prefix of the target token.
 */
function scoreTokenPair(qt: string, tt: string): number {
  // Exact match
  if (qt === tt) return 1;
  // Query token is a prefix of target token (e.g. "kan" in "kansas")
  if (tt.startsWith(qt)) return 0.9;
  // Target token is a prefix of query token
  if (qt.startsWith(tt)) return 0.85;
  return similarity(qt, tt);
}

/**
 * Compute a "token coverage" score: how many query tokens match target tokens.
 * Each query token is matched against the best target token by similarity.
 * Also checks if a query token matches the initialism of a contiguous slice of
 * target words (handles "kc" matching "Kansas City").
 * Returns [0, 1].
 */
function tokenCoverageScore(q: string, t: string): number {
  const queryTokens = tokenize(q);
  const targetTokens = tokenize(t);

  if (queryTokens.length === 0) return 0;
  if (targetTokens.length === 0) return 0;

  // Build all initialism slices of target words for multi-word abbreviation matching
  // e.g., ["kansas","city","chiefs"] → "k","c","ch","kc","kcc","cc","cch" etc.
  const targetInitialismSlices = new Set<string>();
  for (let start = 0; start < targetTokens.length; start++) {
    let abbr = "";
    for (let end = start; end < targetTokens.length; end++) {
      abbr += (targetTokens[end]?.[0] ?? "");
      targetInitialismSlices.add(abbr);
    }
  }

  let totalScore = 0;
  for (const qt of queryTokens) {
    let best = 0;
    for (const tt of targetTokens) {
      const s = scoreTokenPair(qt, tt);
      if (s > best) best = s;
    }
    // Check if query token matches any initialism slice of target
    if (targetInitialismSlices.has(qt)) {
      best = Math.max(best, 0.88);
    }
    totalScore += best;
  }
  return totalScore / queryTokens.length;
}

/**
 * Check if any query token matches as a prefix of the target's initialism.
 * Also checks the full query.
 */
function initialismsBonus(query: string, target: string): number {
  if (matchesInitialism(query, target)) return 0.1;
  // Check individual query tokens too
  const tokens = tokenize(query);
  for (const tok of tokens) {
    if (matchesInitialism(tok, target)) return 0.05;
  }
  return 0;
}

/**
 * Composite score combining:
 *   - similarity (Levenshtein-based): weight 0.2
 *   - prefixScore: weight 0.15
 *   - jaccardSimilarity (token): weight 0.15
 *   - tokenCoverageScore: weight 0.4 — how many query tokens match target tokens
 *   - initialismsMatch bonus: +0.1 (full) or +0.05 (partial)
 *   - Clamped to [0, 1]
 * caseSensitive defaults to false.
 */
export function fuzzyScore(
  query: string,
  target: string,
  caseSensitive = false
): number {
  if (query.length === 0) return 0;

  const q = caseSensitive ? query : query.toLowerCase();
  const t = caseSensitive ? target : target.toLowerCase();

  const simScore = similarity(q, t);
  const pfxScore = prefixScore(q, t);
  const jaccScore = jaccardSimilarity(q, t);
  const initBonus = initialismsBonus(q, t);
  const tokenCoverage = tokenCoverageScore(q, t);

  const raw =
    simScore * 0.2 +
    pfxScore * 0.15 +
    jaccScore * 0.15 +
    tokenCoverage * 0.4 +
    initBonus;

  return Math.min(1, Math.max(0, raw));
}

// ---------------------------------------------------------------------------
// Generic fuzzy search
// ---------------------------------------------------------------------------

/**
 * Search items by fuzzy scoring each item's key against query.
 * - Filters by minScore (default 0.1)
 * - Sorts descending by score
 * - Limits to maxResults if specified
 * - highlights: matched tokens from getKey(item) that appear in query (case-insensitive)
 */
export function fuzzySearch<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
  opts?: SearchOptions
): FuzzyMatch<T>[] {
  const minScore = opts?.minScore ?? 0.1;
  const maxResults = opts?.maxResults;
  const caseSensitive = opts?.caseSensitive ?? false;

  const queryTokens = tokenize(query);

  const results: FuzzyMatch<T>[] = [];

  for (const item of items) {
    const key = getKey(item);
    const score = fuzzyScore(query, key, caseSensitive);

    if (score < minScore) continue;

    // highlights: tokens of the key that appear in query tokens
    const keyTokens = tokenize(key);
    const highlights = keyTokens.filter((kt) =>
      queryTokens.some(
        (qt) =>
          caseSensitive
            ? kt.includes(qt) || qt.includes(kt)
            : kt.toLowerCase().includes(qt.toLowerCase()) ||
              qt.toLowerCase().includes(kt.toLowerCase())
      )
    );

    results.push({ item, score, highlights });
  }

  results.sort((a, b) => b.score - a.score);

  if (maxResults !== undefined) {
    return results.slice(0, maxResults);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Domain-specific search helpers
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper: fuzzySearch with identity key function.
 */
export function searchTeams(
  query: string,
  teams: readonly string[],
  opts?: SearchOptions
): FuzzyMatch<string>[] {
  return fuzzySearch(query, [...teams], (t) => t, opts);
}

/**
 * Search picks by "pick + sport" combined key: `${pick} ${sport}`.
 */
export function searchPicks(
  query: string,
  picks: readonly { pick: string; sport: string; id: string }[],
  opts?: SearchOptions
): FuzzyMatch<{ pick: string; sport: string; id: string }>[] {
  return fuzzySearch(query, [...picks], (p) => `${p.pick} ${p.sport}`, opts);
}

// ---------------------------------------------------------------------------
// Highlighting
// ---------------------------------------------------------------------------

/**
 * Return text with matching segments wrapped in `**...**` markers.
 * Case-insensitive substring match.
 * "Chiefs" in "Kansas City Chiefs" → "Kansas City **Chiefs**"
 * If no match, return text unchanged.
 */
export function highlight(text: string, query: string): string {
  if (query.length === 0) return text;

  const lText = text.toLowerCase();
  const lQuery = query.toLowerCase();
  const idx = lText.indexOf(lQuery);

  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const matched = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  return `${before}**${matched}**${after}`;
}

// ---------------------------------------------------------------------------
// Team abbreviations
// ---------------------------------------------------------------------------

const TEAM_ABBREVIATIONS: Readonly<Record<string, string>> = {
  // NFL
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LV",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS",
  // NBA
  "Atlanta Hawks": "ATL",
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA",
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL",
  "Denver Nuggets": "DEN",
  "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW",
  "Houston Rockets": "HOU",
  "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC",
  "Los Angeles Lakers": "LAL",
  "Memphis Grizzlies": "MEM",
  "Miami Heat": "MIA",
  "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN",
  "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC",
  "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX",
  "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS",
  "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
  // MLB
  "Arizona Diamondbacks": "ARI",
  "Atlanta Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Boston Red Sox": "BOS",
  "Chicago Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "Cincinnati Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Detroit Tigers": "DET",
  "Houston Astros": "HOU",
  "Kansas City Royals": "KC",
  "Los Angeles Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "New York Mets": "NYM",
  "New York Yankees": "NYY",
  "Oakland Athletics": "OAK",
  "Philadelphia Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "San Diego Padres": "SD",
  "San Francisco Giants": "SF",
  "Seattle Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TB",
  "Texas Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WAS",
  // NHL
  "Anaheim Ducks": "ANA",
  "Boston Bruins": "BOS",
  "Buffalo Sabres": "BUF",
  "Calgary Flames": "CGY",
  "Carolina Hurricanes": "CAR",
  "Chicago Blackhawks": "CHI",
  "Colorado Avalanche": "COL",
  "Columbus Blue Jackets": "CBJ",
  "Dallas Stars": "DAL",
  "Edmonton Oilers": "EDM",
  "Florida Panthers": "FLA",
  "Los Angeles Kings": "LAK",
  "Minnesota Wild": "MIN",
  "Montreal Canadiens": "MTL",
  "Nashville Predators": "NSH",
  "New Jersey Devils": "NJD",
  "New York Islanders": "NYI",
  "New York Rangers": "NYR",
  "Ottawa Senators": "OTT",
  "Philadelphia Flyers": "PHI",
  "Pittsburgh Penguins": "PIT",
  "San Jose Sharks": "SJS",
  "Seattle Kraken": "SEA",
  "St. Louis Blues": "STL",
  "Tampa Bay Lightning": "TBL",
  "Toronto Maple Leafs": "TOR",
  "Vancouver Canucks": "VAN",
  "Vegas Golden Knights": "VGK",
  "Washington Capitals": "WSH",
  "Winnipeg Jets": "WPG",
};

/**
 * Return a short abbreviation for common NFL/NBA/MLB/NHL teams.
 * For unknown teams: take initialism first 3 chars if > 2 words, else first 3 letters.
 */
export function abbreviateTeam(teamName: string): string {
  const known = TEAM_ABBREVIATIONS[teamName];
  if (known !== undefined) return known;

  const words = teamName.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length > 2) {
    return initialism(teamName).slice(0, 3).toUpperCase();
  }

  return teamName.replace(/\s+/g, "").slice(0, 3).toUpperCase();
}

// ---------------------------------------------------------------------------
// Canonical team name lookup
// ---------------------------------------------------------------------------

/**
 * Given a fuzzy input, return the best matching known team name (if score >= 0.35).
 * Returns null if no good match.
 */
export function canonicalTeamName(
  name: string,
  knownTeams: readonly string[]
): string | null {
  const results = searchTeams(name, knownTeams, { minScore: 0.35 });
  if (results.length === 0 || results[0] === undefined) return null;
  return results[0].item;
}

// ---------------------------------------------------------------------------
// Rank suggestions (simplified interface)
// ---------------------------------------------------------------------------

/**
 * Simplified interface: returns just the items (not scores), top maxResults.
 */
export function rankSuggestions<T>(
  query: string,
  items: T[],
  getKey: (item: T) => string,
  maxResults = 5
): T[] {
  const results = fuzzySearch(query, items, getKey, { maxResults });
  return results.map((r) => r.item);
}
