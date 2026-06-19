/**
 * Content analytics utilities for a sports editorial platform.
 * Pure TypeScript — no npm dependencies. No `any`.
 *
 * All analytics are descriptive only. Banned phrases ("guaranteed",
 * "lock of the day", "tout", "beat the book", "can't-miss") are
 * never emitted and must not appear in generated recommendations.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentType =
  | "article"
  | "pick-analysis"
  | "game-preview"
  | "news"
  | "podcast-notes"
  | "social-post";

export type ReadabilityLevel =
  | "elementary"
  | "middle-school"
  | "high-school"
  | "college"
  | "graduate";

export interface ContentMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  uniqueWords: number;
  lexicalDiversity: number; // uniqueWords / wordCount (0-1)
  readingTimeSeconds: number; // 200 wpm = 3.33 words/sec
}

export interface ReadabilityScore {
  fleschKincaid: number; // FK reading ease (0-100); higher = easier
  fleschKincaidGrade: number; // grade level
  gunningFog: number; // Gunning Fog grade level
  smog: number; // SMOG grade level
  level: ReadabilityLevel;
}

export interface SeoAnalysis {
  titleLength: number;
  descriptionLength: number;
  titleOptimal: boolean; // 50-60 chars
  descriptionOptimal: boolean; // 120-160 chars
  keywordDensity: Record<string, number>; // keyword → density (0-1)
  hasH1: boolean;
  hasH2: boolean;
  internalLinkCount: number;
  externalLinkCount: number;
  imageCount: number;
  hasAltText: boolean; // true if all images have alt text
}

export interface ContentEngagementPrediction {
  estimatedShareability: number; // 0-100
  estimatedTimeOnPage: number; // seconds
  contentQualityScore: number; // 0-100
  clickbaitScore: number; // 0-100 (higher = more clickbait-y; we want LOW)
  recommendations: string[]; // 1-5 actionable improvements
}

export interface ContentPerformance {
  contentId: string;
  views: number;
  avgTimeOnPage: number; // seconds
  bounceRate: number; // 0-1
  socialShares: number;
  commentsCount: number;
  conversionCount: number; // subscription starts attributed to this content
  engagementRate: number; // (shares+comments)/(views) clamped 0-1
}

export interface ContentView {
  contentId: string;
  timestamp: Date;
  userId?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "this",
  "that",
  "it",
  "i",
  "we",
  "you",
  "he",
  "she",
  "they",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Text analysis
// ---------------------------------------------------------------------------

/**
 * Compute basic content metrics from a raw text string.
 */
export function analyzeContent(text: string): ContentMetrics {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Sentences: split on . ! ?
  const sentenceRaw = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentenceRaw.length);

  // Paragraphs: split on double newlines
  const paragraphRaw = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(1, paragraphRaw.length);

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSentencesPerParagraph = sentenceCount / paragraphCount;

  const uniqueWordsSet = new Set(words.map((w) => w.toLowerCase()));
  const uniqueWords = uniqueWordsSet.size;
  const lexicalDiversity = wordCount > 0 ? uniqueWords / wordCount : 0;

  // 200 wpm → seconds
  const readingTimeSeconds = (wordCount / 200) * 60;

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgWordsPerSentence,
    avgSentencesPerParagraph,
    uniqueWords,
    lexicalDiversity,
    readingTimeSeconds,
  };
}

/**
 * Count syllables in a single word using a simplified vowel-run algorithm.
 * Subtracts silent trailing 'e'. Minimum 1.
 */
export function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 1;

  // Count consecutive vowel runs
  const vowels = /[aeiouy]+/g;
  const runs = w.match(vowels);
  let count = runs ? runs.length : 0;

  // Subtract silent trailing 'e': word ends in 'e', not preceded by a vowel, and has >1 vowel group
  if (
    count > 1 &&
    w.endsWith("e") &&
    !["a", "e", "i", "o", "u", "y"].includes(w[w.length - 2] ?? "")
  ) {
    count -= 1;
  }

  return Math.max(1, count);
}

/**
 * Count words with 3+ syllables, excluding proper nouns (initial capital),
 * hyphenated words, and pure numbers.
 */
export function complexWordCount(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  let count = 0;
  for (const raw of words) {
    // Exclude hyphenated words
    if (raw.includes("-")) continue;
    // Exclude numbers
    if (/^\d+$/.test(raw)) continue;
    // Exclude proper nouns (starts with uppercase and rest is word chars)
    if (/^[A-Z]/.test(raw)) continue;
    if (syllableCount(raw) >= 3) {
      count++;
    }
  }
  return count;
}

/**
 * Compute readability scores for the given text.
 *
 * FK Reading Ease = 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
 * FK Grade = 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59
 * Gunning Fog = 0.4 * (words/sentences + 100*complexWords/words)
 * SMOG = 3 + sqrt(complexWords * 30 / sentences)
 */
export function fleschKincaid(text: string): ReadabilityScore {
  const metrics = analyzeContent(text);
  const { wordCount, sentenceCount } = metrics;

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += syllableCount(w);
  }

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;
  const complexWords = complexWordCount(text);
  const complexRatio = wordCount > 0 ? complexWords / wordCount : 0;

  const fkEase =
    206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const fkGrade =
    0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
  const gunningFog = 0.4 * (wordsPerSentence + 100 * complexRatio);
  const smog = 3 + Math.sqrt(complexWords * (30 / sentenceCount));

  const grade = fkGrade;
  let level: ReadabilityLevel;
  if (grade <= 5) {
    level = "elementary";
  } else if (grade <= 8) {
    level = "middle-school";
  } else if (grade <= 12) {
    level = "high-school";
  } else if (grade <= 16) {
    level = "college";
  } else {
    level = "graduate";
  }

  return {
    fleschKincaid: clamp(fkEase, 0, 100),
    fleschKincaidGrade: fkGrade,
    gunningFog,
    smog,
    level,
  };
}

// ---------------------------------------------------------------------------
// SEO analysis
// ---------------------------------------------------------------------------

/**
 * Analyse a piece of content for basic SEO signals.
 */
export function analyzeSeo(
  content: string,
  title?: string,
  description?: string,
  keywords?: string[]
): SeoAnalysis {
  const titleLength = title ? title.length : 0;
  const descriptionLength = description ? description.length : 0;
  const titleOptimal = titleLength >= 50 && titleLength <= 60;
  const descriptionOptimal =
    descriptionLength >= 120 && descriptionLength <= 160;

  // H1 detection
  const lines = content.split("\n");
  const hasH1 = lines.some(
    (l) => /^# /.test(l) || /<h1[\s>]/i.test(l)
  );
  const hasH2 = lines.some(
    (l) => /^## /.test(l) || /<h2[\s>]/i.test(l)
  );

  // Link detection
  const internalMarkers = ["/picks/", "/board/", "/today/", "/track/"];

  let internalLinkCount = 0;
  let externalLinkCount = 0;

  // HTML links
  let m: RegExpExecArray | null;
  const hrefRe = /href="([^"]+)"/gi;
  while ((m = hrefRe.exec(content)) !== null) {
    const href = m[1] ?? "";
    const isInternal =
      href.startsWith("/") ||
      internalMarkers.some((marker) => href.includes(marker));
    if (isInternal) {
      internalLinkCount++;
    } else {
      externalLinkCount++;
    }
  }

  // Markdown links
  const mdRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  while ((m = mdRe.exec(content)) !== null) {
    const href = m[2] ?? "";
    const isInternal =
      href.startsWith("/") ||
      internalMarkers.some((marker) => href.includes(marker));
    if (isInternal) {
      internalLinkCount++;
    } else {
      externalLinkCount++;
    }
  }

  // Image detection
  const htmlImgRe = /<img[^>]*>/gi;
  const mdImgRe = /!\[([^\]]*)\]\([^)]+\)/g;
  const htmlImgs = content.match(htmlImgRe) ?? [];
  const mdImgs = content.match(mdImgRe) ?? [];
  const imageCount = htmlImgs.length + mdImgs.length;

  // hasAltText: all HTML imgs have non-empty alt; all markdown imgs have non-empty alt bracket
  let hasAltText = imageCount === 0 ? true : true;
  for (const img of htmlImgs) {
    const altMatch = /alt="([^"]*)"/i.exec(img);
    if (!altMatch || (altMatch[1] ?? "").trim() === "") {
      hasAltText = false;
      break;
    }
  }
  if (hasAltText) {
    for (const img of mdImgs) {
      const altMatch = /!\[([^\]]*)\]/.exec(img);
      if (!altMatch || (altMatch[1] ?? "").trim() === "") {
        hasAltText = false;
        break;
      }
    }
  }

  // Keyword density
  const allWords = tokenize(content);
  const totalWords = allWords.length;
  const keywordDensity: Record<string, number> = {};
  if (keywords) {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase();
      const occurrences = allWords.filter((w) => w === kwLower).length;
      keywordDensity[kw] = totalWords > 0 ? occurrences / totalWords : 0;
    }
  }

  return {
    titleLength,
    descriptionLength,
    titleOptimal,
    descriptionOptimal,
    keywordDensity,
    hasH1,
    hasH2,
    internalLinkCount,
    externalLinkCount,
    imageCount,
    hasAltText,
  };
}

// ---------------------------------------------------------------------------
// Content quality prediction
// ---------------------------------------------------------------------------

/**
 * Predict engagement metrics for a piece of content.
 */
export function predictEngagement(
  text: string,
  contentType: ContentType,
  title?: string
): ContentEngagementPrediction {
  const metrics = analyzeContent(text);
  const readability = fleschKincaid(text);
  const { wordCount, readingTimeSeconds, lexicalDiversity, avgWordsPerSentence, paragraphCount } =
    metrics;

  // ---- Shareability ----
  let shareability = 0;
  if (wordCount >= 600 && wordCount <= 1500) shareability += 20;
  if (readability.level === "high-school" || readability.level === "college")
    shareability += 20;
  if (title && /\?/.test(title)) shareability += 10;
  if (contentType === "article" || contentType === "game-preview")
    shareability += 15;
  if (contentType === "social-post") shareability += 10;
  if (wordCount > 2000) shareability += 15;
  if (wordCount < 300) shareability -= 10;
  shareability = clamp(shareability, 0, 100);

  // ---- Time on page ----
  const estimatedTimeOnPage = readingTimeSeconds * 0.7;

  // ---- Content quality score ----
  let contentQualityScore = 10; // baseline
  if (lexicalDiversity > 0.5) contentQualityScore += 20;
  if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 25)
    contentQualityScore += 20;
  if (wordCount >= 500) contentQualityScore += 20;
  if (paragraphCount >= 5) contentQualityScore += 15;
  if (wordCount < 3000) contentQualityScore += 15;
  contentQualityScore = clamp(contentQualityScore, 0, 100);

  // ---- Clickbait score ----
  let clickbaitScore = 0;
  if (title) {
    const titleWords = title.split(/\s+/).filter((w) => w.length > 0);

    // ALL CAPS words: +10 each, max 30
    let capsCount = 0;
    for (const tw of titleWords) {
      if (tw.length > 1 && tw === tw.toUpperCase() && /[A-Z]/.test(tw)) {
        capsCount++;
      }
    }
    clickbaitScore += Math.min(capsCount * 10, 30);

    // Exclamation mark in title
    if (/!/.test(title)) clickbaitScore += 15;

    // Sensational words
    const sensational = ["SHOCKING", "UNBELIEVABLE", "INSANE", "WILD", "CRAZY"];
    let sensationalHits = 0;
    for (const word of sensational) {
      if (title.toUpperCase().includes(word)) {
        sensationalHits++;
      }
    }
    clickbaitScore += Math.min(sensationalHits * 15, 30);

    // Short title with question
    if (title.length < 50 && /\?/.test(title)) clickbaitScore += 10;
  }
  clickbaitScore = clamp(clickbaitScore, 0, 100);

  // ---- Recommendations ----
  const recommendations: string[] = [];
  if (paragraphCount < 5)
    recommendations.push("Add more paragraphs to improve structure.");
  if (wordCount < 500)
    recommendations.push(
      "Expand the content to at least 500 words for better depth."
    );
  if (lexicalDiversity <= 0.5)
    recommendations.push(
      "Increase vocabulary variety to improve lexical diversity."
    );
  if (avgWordsPerSentence < 15 || avgWordsPerSentence > 25)
    recommendations.push(
      "Aim for sentences between 15 and 25 words for optimal readability."
    );
  if (!title || title.length < 40)
    recommendations.push(
      "Write a descriptive title of at least 40 characters."
    );
  // Cap at 5
  const cappedRecs = recommendations.slice(0, 5);
  if (cappedRecs.length === 0) {
    cappedRecs.push("Content looks well-structured. Keep up the quality.");
  }

  return {
    estimatedShareability: shareability,
    estimatedTimeOnPage,
    contentQualityScore,
    clickbaitScore,
    recommendations: cappedRecs,
  };
}

// ---------------------------------------------------------------------------
// Performance analytics
// ---------------------------------------------------------------------------

/**
 * Sort content performance items by a metric descending and return top n.
 */
export function topPerformingContent(
  items: ContentPerformance[],
  metric: keyof Pick<
    ContentPerformance,
    | "views"
    | "avgTimeOnPage"
    | "socialShares"
    | "engagementRate"
    | "conversionCount"
  >,
  n: number = 5
): ContentPerformance[] {
  return [...items]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, n);
}

/**
 * Compute a composite engagement score (0-100) for a ContentPerformance item.
 *
 * views        (log10(views+1)/log10(100000)) * 30    — max at 100k views
 * avgTimeOnPage / 300 * 20                            — 5 min baseline, max 20
 * (1 - bounceRate) * 20                               — lower bounce = better
 * socialShares / 100 * 20                             — max at 100 shares
 * commentsCount / 20 * 10                             — max at 20 comments
 */
export function contentEngagementScore(perf: ContentPerformance): number {
  const viewsScore =
    (Math.log10(perf.views + 1) / Math.log10(100000)) * 30;
  const timeScore = (perf.avgTimeOnPage / 300) * 20;
  const bounceScore = (1 - perf.bounceRate) * 20;
  const sharesScore = (perf.socialShares / 100) * 20;
  const commentsScore = (perf.commentsCount / 20) * 10;

  const total = viewsScore + timeScore + bounceScore + sharesScore + commentsScore;
  return clamp(total, 0, 100);
}

/**
 * Compute average engagement score per ContentType.
 * Content types with no matching items are omitted.
 */
export function avgEngagementByType(
  items: ContentPerformance[],
  typeMapping: Record<string, ContentType>
): Record<ContentType, number> {
  const buckets: Partial<Record<ContentType, number[]>> = {};

  for (const item of items) {
    const ct = typeMapping[item.contentId];
    if (!ct) continue;
    if (!buckets[ct]) buckets[ct] = [];
    (buckets[ct] as number[]).push(contentEngagementScore(item));
  }

  const result: Partial<Record<ContentType, number>> = {};
  for (const [ct, scores] of Object.entries(buckets) as [ContentType, number[]][]) {
    result[ct] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  return result as Record<ContentType, number>;
}

// ---------------------------------------------------------------------------
// Time-series aggregation
// ---------------------------------------------------------------------------

/**
 * Returns ISO week number (1-53).
 * First week is the week containing Thursday (ISO 8601).
 */
export function isoWeekNumber(date: Date): number {
  // Shift to Thursday of the current week (Thu = day 4)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay(); // 0=Sun
  // Shift to Thursday
  d.setUTCDate(d.getUTCDate() + 4 - (dayOfWeek === 0 ? 7 : dayOfWeek));
  // Jan 4 is always in week 1
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const yearStartThursday = new Date(yearStart);
  yearStartThursday.setUTCDate(
    yearStart.getUTCDate() + 4 - (yearStart.getUTCDay() === 0 ? 7 : yearStart.getUTCDay())
  );
  const weekNum =
    Math.round(
      (d.getTime() - yearStartThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
  return weekNum;
}

function periodKey(date: Date, granularity: "hour" | "day" | "week"): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");

  if (granularity === "hour") {
    return `${year}-${month}-${day}T${hour}`;
  } else if (granularity === "day") {
    return `${year}-${month}-${day}`;
  } else {
    // week
    const week = String(isoWeekNumber(date)).padStart(2, "0");
    return `${year}-W${week}`;
  }
}

/**
 * Group content views by time period.
 * uniqueUsers: distinct userIds; undefined userId is treated as a unique anonymous
 * user per timestamp (each undefined is its own entry).
 */
export function viewsByPeriod(
  views: ContentView[],
  granularity: "hour" | "day" | "week"
): Array<{ period: string; count: number; uniqueUsers: number }> {
  // period → { count, userIds }
  const periodMap = new Map<string, { count: number; userSet: Set<string> }>();

  let anonCounter = 0;
  for (const view of views) {
    const key = periodKey(view.timestamp, granularity);
    if (!periodMap.has(key)) {
      periodMap.set(key, { count: 0, userSet: new Set() });
    }
    const bucket = periodMap.get(key)!;
    bucket.count++;
    const userId =
      view.userId !== undefined
        ? view.userId
        : `__anon_${anonCounter++}`;
    bucket.userSet.add(userId);
  }

  return [...periodMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { count, userSet }]) => ({
      period,
      count,
      uniqueUsers: userSet.size,
    }));
}

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

/**
 * Extract the most frequent non-stop-word tokens from text.
 */
export function extractKeywords(
  text: string,
  topN: number = 10,
  stopWords?: string[]
): Array<{ word: string; count: number; density: number }> {
  const tokens = tokenize(text);
  const totalWords = tokens.length;

  const extraStop = new Set(stopWords ?? []);
  const filtered = tokens.filter(
    (w) => !DEFAULT_STOP_WORDS.has(w) && !extraStop.has(w) && w.length > 0
  );

  const freq = new Map<string, number>();
  for (const w of filtered) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({
      word,
      count,
      density: totalWords > 0 ? count / totalWords : 0,
    }));
}

// ---------------------------------------------------------------------------
// Content similarity
// ---------------------------------------------------------------------------

/**
 * Jaccard similarity on word sets (after tokenization and stop word removal).
 * Returns value in [0, 1].
 */
export function contentSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA).filter((w) => !DEFAULT_STOP_WORDS.has(w));
  const tokensB = tokenize(textB).filter((w) => !DEFAULT_STOP_WORDS.has(w));

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Reading time display
// ---------------------------------------------------------------------------

/**
 * Return a human-readable reading time string.
 */
export function readingTimeDisplay(wordCount: number, wpm: number = 200): string {
  const totalSeconds = (wordCount / wpm) * 60;
  const totalMinutes = totalSeconds / 60;

  if (totalMinutes < 1) return "< 1 min read";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours === 0) return `${minutes} min read`;
  if (minutes === 0) return `${hours} hr read`;
  return `${hours} hr ${minutes} min read`;
}

// ---------------------------------------------------------------------------
// Content freshness
// ---------------------------------------------------------------------------

/**
 * Score content freshness (0-100) based on age in days.
 *
 * 0-7 days: 100; 7-14: 80; 14-30: 60; 30-90: 40; 90-180: 20; >180: 0
 */
export function freshnessScore(
  publishedAt: Date,
  updatedAt?: Date,
  referenceDate?: Date
): number {
  const ref = referenceDate ?? new Date();
  const mostRecent =
    updatedAt && updatedAt > publishedAt ? updatedAt : publishedAt;

  const ageDays =
    (ref.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) return 100;
  if (ageDays <= 14) return 80;
  if (ageDays <= 30) return 60;
  if (ageDays <= 90) return 40;
  if (ageDays <= 180) return 20;
  return 0;
}

// ---------------------------------------------------------------------------
// A/B headline scoring
// ---------------------------------------------------------------------------

const POWER_WORDS = new Set([
  "top",
  "best",
  "key",
  "major",
  "new",
  "breaking",
  "exclusive",
]);

/**
 * Score a headline 0-100 for quality.
 */
export function headlineScore(title: string): number {
  let score = 10; // baseline

  // Length 40-70 chars
  if (title.length >= 40 && title.length <= 70) score += 25;

  // Has a number
  if (/\d/.test(title)) score += 15;

  // Has power word (max 2 = +20)
  const words = title.toLowerCase().split(/\s+/);
  let powerCount = 0;
  for (const w of words) {
    if (POWER_WORDS.has(w)) powerCount++;
  }
  score += Math.min(powerCount, 2) * 10;

  // Ends with ? or has "how"/"why"/"what"
  if (/\?$/.test(title.trim()) || /\b(how|why|what)\b/i.test(title))
    score += 15;

  // NOT all caps
  if (title !== title.toUpperCase()) score += 10;

  // Word count 5-12
  const wordCount = title.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount >= 5 && wordCount <= 12) score += 15;

  return clamp(score, 0, 100);
}
