/**
 * Jarvis assessment ring buffer.
 *
 * Pure in-memory store with a fixed capacity. Use it to track the last N
 * assessments so the cockpit can render trend signals (e.g. "ingestion
 * was AMBER an hour ago, now GREEN").
 *
 * Not a substitute for durable persistence — process restarts wipe the
 * buffer. Pair with `serializeJarvisAudit` + a log file or DB table when
 * long-term history matters.
 *
 * Concurrency note: the buffer is intentionally single-threaded — each
 * Next.js Node process has its own copy. For a multi-process deploy,
 * either share via a Redis-backed buffer or persist via the audit-log
 * serializer.
 */

import type {
  JarvisAssessment,
  JarvisHealth,
  JarvisLaunchStatus,
} from "@/lib/cockpit/jarvis";

export interface JarvisHistorySnapshot {
  readonly assessedAt: string;
  readonly launchStatus: JarvisLaunchStatus;
  readonly publicSurfaceStatus: JarvisHealth;
  readonly ingestionStatus: JarvisHealth;
  readonly settlementStatus: JarvisHealth;
  readonly canonicalHistoryStatus: JarvisHealth;
  readonly signalCoverageStatus: JarvisHealth;
  readonly safetyWarningCount: number;
  readonly missingPhaseCount: number;
  readonly externalConfigCount: number;
  readonly recommendedActionCount: number;
}

export interface JarvisHistory {
  /** Read the most recent N snapshots (newest first). */
  recent(n?: number): readonly JarvisHistorySnapshot[];
  /** Append a new assessment to the buffer (drops oldest if at capacity). */
  push(assessment: JarvisAssessment): JarvisHistorySnapshot;
  /** Erase the buffer (for tests). */
  clear(): void;
  /** Current size. */
  size(): number;
}

// Converts a full Jarvis assessment into the compact history shape.
export function snapshotFromAssessment(
  a: JarvisAssessment
): JarvisHistorySnapshot {
  return {
    assessedAt: a.assessedAt,
    launchStatus: a.launchStatus,
    publicSurfaceStatus: a.publicSurfaceStatus,
    ingestionStatus: a.ingestionStatus,
    settlementStatus: a.settlementStatus,
    canonicalHistoryStatus: a.canonicalHistoryStatus,
    signalCoverageStatus: a.signalCoverageStatus,
    safetyWarningCount: a.safetyWarnings.length,
    missingPhaseCount: a.missingPhaseWarnings.length,
    externalConfigCount: a.externalConfigWarnings.length,
    recommendedActionCount: a.recommendedNextActions.length,
  };
}

// Creates a bounded in-memory Jarvis history ring buffer.
export function createJarvisHistory(capacity = 96): JarvisHistory {
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new Error(`jarvis-history capacity must be a positive integer, got ${capacity}`);
  }
  const buf: JarvisHistorySnapshot[] = [];
  const cap = Math.floor(capacity);

  return {
    recent(n?: number) {
      const take = typeof n === "number" && n > 0 ? Math.floor(n) : buf.length;
      // Newest first — we push to the end, so reverse.
      return buf.slice().reverse().slice(0, take);
    },
    push(assessment: JarvisAssessment) {
      const snap = snapshotFromAssessment(assessment);
      buf.push(snap);
      while (buf.length > cap) buf.shift();
      return snap;
    },
    clear() {
      buf.length = 0;
    },
    size() {
      return buf.length;
    },
  };
}

// A shared, process-local default buffer for callers that don't need
// their own. Tests should create their own via `createJarvisHistory`.
let _shared: JarvisHistory | null = null;
// Returns the process-local Jarvis history buffer.
export function sharedJarvisHistory(): JarvisHistory {
  if (_shared === null) _shared = createJarvisHistory(96);
  return _shared;
}
