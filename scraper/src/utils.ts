import * as fs from "fs";
import * as path from "path";
import type { NormalizedPick } from "./types.js";

// ── Sleep ────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Jitter sleep: actual = base ± 30% ───────────────────────
export function sleepJitter(baseMs: number): Promise<void> {
  const jitter = baseMs * 0.3 * (Math.random() * 2 - 1);
  return sleep(Math.max(200, baseMs + jitter));
}

// ── Exponential retry ────────────────────────────────────────
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2000
): Promise<T> {
  let lastErr: Error = new Error("no attempts");
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const wait = baseDelayMs * 2 ** i;
      console.warn(`[retry] ${label} attempt ${i + 1}/${maxRetries} failed: ${lastErr.message} — waiting ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// ── Deduplication ────────────────────────────────────────────
export function deduplicatePicks(picks: NormalizedPick[]): NormalizedPick[] {
  const seen = new Set<string>();
  return picks.filter((p) => {
    // Key includes event + market + pick + event_time; odds/confidence may vary across sources
    const key = `${p.event}|${p.market}|${p.pick}|${p.event_time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── File I/O ─────────────────────────────────────────────────
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

// ── Anti-bot detection ───────────────────────────────────────
// Detect whether a response body looks like a bot-challenge page
// rather than the expected API/HTML response.
export function detectAntiBot(body: string, contentType: string, url: string): {
  blocked: boolean;
  reason: string | null;
} {
  const lower = body.toLowerCase();
  const isHtml = contentType.includes("text/html") || lower.startsWith("<!doctype") || lower.startsWith("<html");

  // Cloudflare challenge signatures
  if (lower.includes("cloudflare") && (lower.includes("ray id") || lower.includes("cf-ray"))) {
    return { blocked: true, reason: `Cloudflare challenge at ${url}` };
  }
  if (lower.includes("just a moment") && lower.includes("checking your browser")) {
    return { blocked: true, reason: `Cloudflare JS challenge at ${url}` };
  }
  // Generic bot detection
  if (lower.includes("access denied") && isHtml) {
    return { blocked: true, reason: `Access denied (HTML) at ${url}` };
  }
  if (lower.includes("captcha") && isHtml) {
    return { blocked: true, reason: `CAPTCHA challenge at ${url}` };
  }
  // JSON endpoint returning HTML = redirect to login/block page
  if (contentType.includes("application/json") && isHtml) {
    return { blocked: true, reason: `Expected JSON but got HTML at ${url} (likely auth redirect or block)` };
  }

  return { blocked: false, reason: null };
}

// ── Keyword scoring ──────────────────────────────────────────
const PREDICTION_KEYWORDS = [
  "prediction", "pick", "tip", "recommendation",
  "confidence", "probability", "percent",
  "spread", "moneyline", "total", "handicap", "bet",
  "odds", "line", "overunder", "over", "under",
];
const TEAM_KEYWORDS = ["home_team", "away_team", "hometeam", "awayteam", "home", "away", "team"];
const TIMESTAMP_KEYWORDS = ["start_time", "commence_time", "event_time", "match_time", "kickoff", "tipoff", "gametime", "date", "scheduled"];

export function scoreBodyRelevance(body: string): number {
  const lower = body.toLowerCase();
  let score = 0;

  const predCount = PREDICTION_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const teamCount = TEAM_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const timeCount = TIMESTAMP_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  score += Math.min(predCount, 5);       // up to 5 from prediction keywords
  score += Math.min(teamCount * 2, 4);   // up to 4 from team keywords (stronger signal)
  score += Math.min(timeCount, 1);       // up to 1 from timestamps

  return Math.min(score, 10);
}

export function bodyHasTeams(body: string): boolean {
  const lower = body.toLowerCase();
  return TEAM_KEYWORDS.some((kw) => lower.includes(kw));
}

export function bodyHasPredictions(body: string): boolean {
  const lower = body.toLowerCase();
  return PREDICTION_KEYWORDS.filter((kw) => lower.includes(kw)).length >= 2;
}

export function bodyHasOdds(body: string): boolean {
  return /\b(odds|spread|moneyline|total|handicap|-\d{3}|\+\d{3})\b/i.test(body);
}

// ── JSON snippet for preview ─────────────────────────────────
// Given a parsed JSON object, return a lightweight preview:
// top-level keys + the first element if it's an array.
export function jsonSnippet(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    return { _type: "array", _length: data.length, _first: data[0] ?? null };
  }
  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);
  const preview: Record<string, unknown> = { _type: "object", _keys: keys };
  // Include values for keys that might signal useful data
  for (const k of keys.slice(0, 6)) {
    const v = obj[k];
    if (Array.isArray(v)) {
      preview[k] = `[Array(${v.length})] first: ${JSON.stringify(v[0])?.slice(0, 200) ?? "empty"}`;
    } else if (typeof v === "object" && v !== null) {
      preview[k] = `{${Object.keys(v as object).join(", ")}}`;
    } else {
      preview[k] = v;
    }
  }
  return preview;
}

// ── Timestamp ────────────────────────────────────────────────
export function nowIso(): string {
  return new Date().toISOString();
}
