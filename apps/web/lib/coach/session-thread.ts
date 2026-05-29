/**
 * Coach Session Thread — short-lived per-session memory of recent prompts.
 *
 * Cookie-only. Stores last N prompt IDs and a coarse timestamp so the
 * coach can offer continuity hints ("You asked about correlation here
 * 2 minutes ago — what changed?") without server state.
 *
 * No live AI is invoked. No DB write. No telemetry escalation.
 */

import type { CoachSurface } from "./prompts";

export const SESSION_THREAD_COOKIE = "gse_coach_thread";
const MAX_THREAD_ENTRIES = 5;
const THREAD_WINDOW_MINUTES = 30;

export interface CoachThreadEntry {
  readonly promptId: string;
  readonly surface: CoachSurface;
  readonly at: string; // ISO
}

export interface ParsedCoachThread {
  readonly entries: ReadonlyArray<CoachThreadEntry>;
}

/** Parse the cookie value. Returns an empty thread if missing or malformed. */
export function parseCoachThread(raw: string | null | undefined): ParsedCoachThread {
  if (!raw) return { entries: [] };
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!Array.isArray(parsed)) return { entries: [] };
    const cleaned: CoachThreadEntry[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item.promptId === "string" &&
        typeof item.surface === "string" &&
        typeof item.at === "string"
      ) {
        cleaned.push({
          promptId: item.promptId,
          surface: item.surface as CoachSurface,
          at: item.at,
        });
      }
    }
    return { entries: cleaned.slice(0, MAX_THREAD_ENTRIES) };
  } catch {
    return { entries: [] };
  }
}

/** Append a new entry and return the serialized cookie value. */
export function appendToThread(
  thread: ParsedCoachThread,
  promptId: string,
  surface: CoachSurface,
  now = new Date(),
): { thread: ParsedCoachThread; cookieValue: string } {
  const fresh: CoachThreadEntry = { promptId, surface, at: now.toISOString() };
  const merged = [fresh, ...thread.entries].slice(0, MAX_THREAD_ENTRIES);
  const cookieValue = encodeURIComponent(JSON.stringify(merged));
  return { thread: { entries: merged }, cookieValue };
}

/**
 * Find a continuity hint: was this prompt asked on this same surface
 * within the active window?
 */
export function findContinuityHint(
  thread: ParsedCoachThread,
  promptId: string,
  surface: CoachSurface,
  now = new Date(),
): { recentAt: string; minutesAgo: number } | null {
  const cutoff = now.getTime() - THREAD_WINDOW_MINUTES * 60_000;
  for (const entry of thread.entries) {
    if (entry.promptId !== promptId) continue;
    if (entry.surface !== surface) continue;
    const at = new Date(entry.at).getTime();
    if (Number.isNaN(at)) continue;
    if (at < cutoff) continue;
    const minutesAgo = Math.max(1, Math.round((now.getTime() - at) / 60_000));
    return { recentAt: entry.at, minutesAgo };
  }
  return null;
}
