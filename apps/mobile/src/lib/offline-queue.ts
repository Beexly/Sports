import type { ApiResult } from "../api/contracts";

/**
 * Offline mutation queue.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE RULE THAT SHAPES THIS FILE
 * ══════════════════════════════════════════════════════════════════════════
 *
 * **A write may be queued optimistically only if it is a fact about the USER,
 * not a fact about the model.**
 *
 * That is the whole design. The watchlist qualifies: "I follow this pick" is a
 * statement about the reader, and the server has no opinion about it beyond
 * recording it. Almost nothing else in this product qualifies — a pick, a
 * confidence score, a settled result, a line. Those are the server's claims, and
 * a client that queues them optimistically can put a row on screen that the
 * engine declined to publish, which is `adverse-edge-suppression` defeated by a
 * network blip.
 *
 * So the queue is an ALLOWLIST, not a general mechanism. Adding a kind requires
 * an argument, and the argument is the one in bold above.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE THREE THINGS A QUEUE NEEDS, AND THE THIRD IS THE ONE PEOPLE SKIP
 * ══════════════════════════════════════════════════════════════════════════
 *
 * 1. **The intent is persisted BEFORE the request.** Same reasoning as the
 *    StoreKit transaction: a queue that records after the send cannot tell a
 *    success from a lost response, so a retry duplicates.
 *
 * 2. **An idempotency key the server understands.** Without one, draining the
 *    queue twice (two launches, or a race between a manual drain and a
 *    foreground drain) applies the same write twice.
 *
 * 3. **A defined resolution when local and server disagree.** Without it, a
 *    queue turns one bug into two: the user sees their own optimistic state, the
 *    server holds a different one, and nothing decides which is true. Here the
 *    answer is unambiguous and belongs to the product's own architecture: **the
 *    server is authoritative on everything.** A queued write is a REQUEST, never
 *    a claim, and the local state is re-derived from the server's answer.
 *
 * A write is never silently dropped. Transient failures back off; permanent
 * rejections and exhausted retries are PARKED with their reason attached, so the
 * worst case is a queue entry visible to a human rather than a user action that
 * quietly evaporated.
 */

/* ══════════════════════════════════════════════════════════════════════════
   ALLOWLIST
   ══════════════════════════════════════════════════════════════════════════ */

export type OptimisticWriteKind = "watchlist.follow" | "watchlist.unfollow";

/**
 * The only kinds that may be queued, each with the reason it qualifies.
 *
 * The record shape forces the argument to be written down. A future contributor
 * adding "picks.publish" has to fill in `whyUserFact` and will find that they
 * cannot.
 */
export const QUEUEABLE_KINDS: Readonly<Record<OptimisticWriteKind, { whyUserFact: string }>> = {
  "watchlist.follow": {
    whyUserFact:
      "Following a pick is a statement about the reader. The server records it; it does not " +
      "evaluate it. Nothing about the model's claims changes if it is applied late.",
  },
  "watchlist.unfollow": {
    whyUserFact: "The inverse of follow, for the same reason.",
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════════ */

export interface QueuedWrite {
  /** Local id, stable across restarts. Not the idempotency key. */
  id: string;
  kind: OptimisticWriteKind;
  payload: Record<string, unknown>;
  /**
   * Sent to the server so a re-drain cannot apply the same write twice. The key
   * is generated ONCE at enqueue, never per attempt.
   */
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt: number | null;
  lastError: string | null;
  /** Set when the write cannot be retried again. Never silently discarded. */
  parked: { reason: string; at: number } | null;
}

export type WriteOutcome =
  | { kind: "applied" }
  | { kind: "already_applied" }
  /** Transient: keep it and try later. */
  | { kind: "retry"; reason: string; retryAfterSec?: number | null }
  /** Permanent: the server will never accept it. Parked with the reason. */
  | { kind: "rejected"; reason: string };

export interface QueueStorage {
  read(): Promise<QueuedWrite[]>;
  write(entries: QueuedWrite[]): Promise<void>;
}

/** In-memory implementation for tests and for a first launch with no storage. */
export class MemoryQueueStorage implements QueueStorage {
  private entries: QueuedWrite[] = [];
  constructor(seed: QueuedWrite[] = []) {
    this.entries = seed;
  }
  async read(): Promise<QueuedWrite[]> {
    return this.entries.map((e) => ({ ...e }));
  }
  async write(entries: QueuedWrite[]): Promise<void> {
    this.entries = entries.map((e) => ({ ...e }));
  }
}

export interface QueueOptions {
  /** Attempts before a transient failure parks the write. Default 5. */
  maxAttempts?: number;
  /** Base delay in ms; doubles per attempt. Default 2s. */
  baseBackoffMs?: number;
  now?: () => number;
  /** Stable id generator. Injected so tests are deterministic. */
  idFactory?: () => string;
}

/* ══════════════════════════════════════════════════════════════════════════
   QUEUE
   ══════════════════════════════════════════════════════════════════════════ */

export class OfflineQueue {
  private readonly storage: QueueStorage;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly now: () => number;
  private readonly idFactory: () => string;
  /** Prevents two concurrent drains applying the same entry twice. */
  private draining = false;

  constructor(storage: QueueStorage, options: QueueOptions = {}) {
    this.storage = storage;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 2_000;
    this.now = options.now ?? (() => Date.now());
    this.idFactory = options.idFactory ?? (() => `w_${Math.random().toString(36).slice(2, 12)}`);
  }

  /**
   * Persist an intent.
   *
   * Throws for a non-allowlisted kind rather than silently accepting it. A queue
   * that accepts anything is a queue that will eventually hold a model fact.
   */
  async enqueue(kind: OptimisticWriteKind, payload: Record<string, unknown>): Promise<QueuedWrite> {
    if (!(kind in QUEUEABLE_KINDS)) {
      throw new Error(
        `OfflineQueue.enqueue: "${kind}" is not queueable. Only writes that are facts about ` +
          "the USER may be queued optimistically; model facts must wait for the server. " +
          "See QUEUEABLE_KINDS for the argument a new kind has to make.",
      );
    }

    const entry: QueuedWrite = {
      id: this.idFactory(),
      kind,
      payload,
      // Generated ONCE, here, so every retry of this intent carries the same key.
      idempotencyKey: `${kind}:${this.idFactory()}`,
      createdAt: this.now(),
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
      parked: null,
    };

    const entries = await this.storage.read();
    // Recorded BEFORE any request leaves, for the reason in the header.
    await this.storage.write([...entries, entry]);
    return entry;
  }

  /** Everything still owed to the server, oldest first. */
  async pending(): Promise<QueuedWrite[]> {
    const entries = await this.storage.read();
    return entries.filter((e) => e.parked === null).sort((a, b) => a.createdAt - b.createdAt);
  }

  /** Parked entries, so a surface can show the user something did not go through. */
  async parked(): Promise<QueuedWrite[]> {
    return (await this.storage.read()).filter((e) => e.parked !== null);
  }

  /** Whether an entry is due for another attempt, given its backoff. */
  isDue(entry: QueuedWrite): boolean {
    if (entry.lastAttemptAt === null) return true;
    const delay = this.baseBackoffMs * 2 ** Math.max(0, entry.attempts - 1);
    return this.now() - entry.lastAttemptAt >= delay;
  }

  /**
   * Drain the queue.
   *
   * `send` receives the full entry so the caller can build a server request that
   * carries the idempotency key. Draining is concurrency-guarded: a second drain
   * while one is in flight returns immediately rather than applying the same
   * writes twice.
   *
   * Stops at the first transient failure rather than continuing past it. Applying
   * write 5 while write 2 is still pending can reorder two operations that are
   * ordered for a reason (follow then unfollow, most obviously).
   */
  async drain(send: (entry: QueuedWrite) => Promise<WriteOutcome>): Promise<DrainReport> {
    if (this.draining) {
      return { applied: 0, alreadyApplied: 0, retried: 0, parked: 0, skipped: true };
    }
    this.draining = true;

    const report: DrainReport = { applied: 0, alreadyApplied: 0, retried: 0, parked: 0, skipped: false };

    try {
      const entries = (await this.storage.read()).sort((a, b) => a.createdAt - b.createdAt);
      const next: QueuedWrite[] = [];
      /**
       * Set when a transient failure stops the drain. Everything after that
       * point is carried forward UNCHANGED: not re-attempted, not reordered.
       * Applying write 5 while write 2 is unresolved can invert an ordered pair
       * (follow then unfollow, most obviously), so the queue drains in order and
       * stops at the first thing it cannot finish.
       */
      let stopped = false;

      for (const entry of entries) {
        if (stopped || entry.parked !== null || !this.isDue(entry)) {
          next.push(entry);
          continue;
        }

        let outcome: WriteOutcome;
        try {
          outcome = await send(entry);
        } catch (error) {
          outcome = { kind: "retry", reason: error instanceof Error ? error.message : String(error) };
        }

        // Satisfied: the server holds the truth now, so the entry is dropped.
        if (outcome.kind === "applied" || outcome.kind === "already_applied") {
          if (outcome.kind === "applied") report.applied += 1;
          else report.alreadyApplied += 1;
          continue;
        }

        if (outcome.kind === "rejected") {
          report.parked += 1;
          next.push({
            ...entry,
            attempts: entry.attempts + 1,
            lastAttemptAt: this.now(),
            lastError: outcome.reason,
            parked: { reason: outcome.reason, at: this.now() },
          });
          continue;
        }

        // Transient. The backoff clock resets from NOW, not from the entry's
        // creation, or a write that failed three days ago would be retried
        // instantly on every launch forever.
        const attempts = entry.attempts + 1;
        const exhausted = attempts >= this.maxAttempts;
        report.retried += 1;
        if (exhausted) report.parked += 1;

        next.push({
          ...entry,
          attempts,
          lastAttemptAt: this.now(),
          lastError: outcome.reason,
          parked: exhausted
            ? {
                // Parked rather than dropped. A user action that silently
                // evaporated is worse than one the UI admits it could not send.
                reason: `Gave up after ${attempts} attempts: ${outcome.reason}`,
                at: this.now(),
              }
            : null,
        });

        stopped = true;
      }

      await this.storage.write(next);
      return report;
    } finally {
      this.draining = false;
    }
  }

  /**
   * Reconcile local state against the server's.
   *
   * The server is authoritative. A queued follow that the server already shows
   * as followed is SATISFIED, and the queue entry is removed rather than retried
   * — that is the whole conflict-resolution rule, and it is one line because the
   * architecture already decided it: local state is a cache of the server's
   * state, never a competing claim.
   */
  async reconcile(serverFollowedIds: readonly string[]): Promise<{ satisfied: number }> {
    const followed = new Set(serverFollowedIds);
    const entries = await this.storage.read();
    let satisfied = 0;

    const next = entries.filter((entry) => {
      const entityId = typeof entry.payload["entityId"] === "string" ? entry.payload["entityId"] : null;
      if (entityId === null || entry.parked !== null) return true;

      const serverSaysFollowed = followed.has(entityId);
      const wantsFollow = entry.kind === "watchlist.follow";
      if (serverSaysFollowed === wantsFollow) {
        satisfied += 1;
        return false;
      }
      return true;
    });

    await this.storage.write(next);
    return { satisfied };
  }
}

export interface DrainReport {
  applied: number;
  alreadyApplied: number;
  retried: number;
  parked: number;
  /** True when a drain was already running and this call did nothing. */
  skipped: boolean;
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVER OUTCOME → QUEUE OUTCOME
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Map an API result onto a queue outcome.
 *
 * The classification mirrors the HTTP client's own kinds, so a change to how the
 * client classifies a failure propagates here rather than being re-derived.
 *
 * `already_applied` is important and easy to miss: the server may have applied
 * the write and lost the response. A 409 (conflict) therefore means SATISFIED,
 * not failed — retrying a follow the server already recorded is how a queue
 * creates duplicates.
 */
export function classifyWriteResult(result: ApiResult<unknown>): WriteOutcome {
  if (result.ok) return { kind: "applied" };

  switch (result.kind) {
    case "network":
    case "timeout":
    case "server":
    case "rate_limited":
    case "gated":
    case "stale":
      return { kind: "retry", reason: result.message, retryAfterSec: result.retryAfterSec };
    case "auth":
      // The credential is the problem, and retrying will not fix it. Parking is
      // right: the user needs to sign in, and the UI can say so.
      return { kind: "retry", reason: "Sign in required." };
    case "not_found":
      // The entity is gone. A follow for a deleted pick can never succeed.
      return { kind: "rejected", reason: result.message };
    case "malformed":
      return { kind: "retry", reason: result.message };
  }
}
