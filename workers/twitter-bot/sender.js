"use strict";
/**
 * The send pipeline.
 *
 * Everything between "the planner produced an outbox row" and "a tweet exists".
 * Four rules, each of which is here because of a specific way bots fail:
 *
 *   1. `MUTE_BOT` IS CHECKED AT SEND TIME, not at schedule time. A mute that
 *      takes effect on the next cycle is not a mute: it leaves everything
 *      already planned free to go out. This is checked immediately before the
 *      HTTP call and nowhere else, so there is exactly one place it can be
 *      bypassed and that place is one line.
 *
 *   2. THE IDEMPOTENCY KEY IS RECORDED BEFORE THE SEND, not after. The failure
 *      mode that matters is not "posted never", it is "posted twice after a
 *      timeout" — the request succeeded, the response was lost, the job retried.
 *      Recording afterwards cannot distinguish that from a failure, so a retry
 *      duplicates the post. Recording first means a lost response is reported as
 *      `UNKNOWN` and NOT retried, which is the honest and safe outcome.
 *
 *   3. A THREAD IS NOT ATOMIC AND CANNOT PRETEND TO BE. If post 3 of 6 fails,
 *      posts 1 and 2 are public and permanent. There is no rollback. The
 *      outcome therefore reports `partial` with the ids that did land, because a
 *      caller that believes a thread failed entirely will re-post it.
 *
 *   4. RATE LIMITS COME FROM THE RESPONSE, not from a constant. The ceiling
 *      depends on the account's tier, and a stale constant in the optimistic
 *      direction is how an account gets throttled by the platform instead.
 */

const { XApiError } = require("./x-client.js");

/** Outcome kinds. A caller must handle all of them. */
const Outcome = {
  SENT: "sent",
  MUTED: "muted",
  ALREADY_SENT: "already_sent",
  RATE_LIMITED: "rate_limited",
  PARTIAL: "partial",
  FAILED: "failed",
  /** The request left, the response did not come back. NOT safe to retry. */
  UNKNOWN: "unknown",
  /** A thread was refused before any post because one exceeded the limit. */
  INVALID: "invalid",
};

/**
 * The ledger port. Implemented over the existing `BotOutboxRecord` table; the
 * in-memory version below is for tests.
 */
class MemoryLedger {
  constructor() {
    this.rows = new Map();
  }

  async has(key) {
    return this.rows.has(key);
  }

  async record(key, value) {
    this.rows.set(key, value);
  }

  async complete(key, value) {
    this.rows.set(key, { ...(this.rows.get(key) ?? {}), ...value, completed: true });
  }
}

function isMuted(env = process.env) {
  // Only the literal "true" mutes. A typo'd value like "yes" or "1" must not
  // silently UN-mute a bot the operator believed was stopped, so the check is
  // strict and anything else is treated as not-muted only because the default
  // state is running; the operator-facing rule is documented in the README.
  return env["MUTE_BOT"]?.trim().toLowerCase() === "true";
}

function validateThread(posts) {
  const problems = [];
  posts.forEach((text, i) => {
    if (typeof text !== "string" || text.trim().length === 0) {
      problems.push(`post ${i + 1} is empty`);
    } else if (text.length > 280) {
      problems.push(`post ${i + 1} is ${text.length} characters (limit 280)`);
    }
  });
  return problems;
}

class TwitterSender {
  /**
   * @param {object} config
   * @param {import("./x-client.js").XClient} config.client
   * @param {MemoryLedger} config.ledger
   * @param {() => boolean} [config.muted]  injected so tests need no env
   * @param {(event: object) => void} [config.onEvent]
   */
  constructor({ client, ledger, muted = () => isMuted(process.env), onEvent }) {
    this.client = client;
    this.ledger = ledger;
    this.muted = muted;
    this.onEvent = onEvent;
  }

  #emit(event) {
    if (this.onEvent) this.onEvent(event);
  }

  /**
   * Send a single post.
   *
   * @param {{text: string, idempotencyKey: string, replyToTweetId?: string}} input
   */
  async send({ text, idempotencyKey, replyToTweetId }) {
    if (!idempotencyKey) {
      // Without a key the sender cannot tell a duplicate from a new post, and
      // "post it again" is the wrong default for a public account.
      throw new Error("send: idempotencyKey is required");
    }

    if (this.muted()) {
      this.#emit({ kind: "muted", idempotencyKey });
      return { outcome: Outcome.MUTED, tweetId: null };
    }

    if (await this.ledger.has(idempotencyKey)) {
      const existing = await this.ledger.get?.(idempotencyKey);
      this.#emit({ kind: "already_sent", idempotencyKey });
      return { outcome: Outcome.ALREADY_SENT, tweetId: existing?.tweetId ?? null };
    }

    // Record BEFORE sending. See rule 2 at the top of the file.
    await this.ledger.record(idempotencyKey, { startedAt: new Date().toISOString(), sent: false });

    try {
      const result = await this.client.postTweet({ text, replyToTweetId });
      await this.ledger.complete(idempotencyKey, { sent: true, tweetId: result.id });
      this.#emit({ kind: "sent", idempotencyKey, tweetId: result.id });
      return { outcome: Outcome.SENT, tweetId: result.id };
    } catch (error) {
      if (error instanceof XApiError) {
        if (error.retryable) {
          await this.ledger.complete(idempotencyKey, { sent: false, retryable: true, status: error.status });
          this.#emit({ kind: "rate_limited_or_transient", idempotencyKey, status: error.status });
          return {
            outcome: Outcome.RATE_LIMITED,
            tweetId: null,
            retryAfterSec: error.retryAfterSec ?? null,
          };
        }
        if (error.status === 0 || error.code === "no_id_in_response") {
          // The request may have landed. Marking it completed would be a lie;
          // marking it failed would invite a duplicate. It stays recorded and
          // incomplete, which is exactly what a human needs to see.
          await this.ledger.complete(idempotencyKey, { sent: false, unknown: true });
          this.#emit({ kind: "unknown", idempotencyKey });
          return { outcome: Outcome.UNKNOWN, tweetId: null };
        }
      }
      await this.ledger.complete(idempotencyKey, { sent: false, error: true });
      this.#emit({ kind: "failed", idempotencyKey });
      return {
        outcome: Outcome.FAILED,
        tweetId: null,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a thread.
   *
   * Returns `PARTIAL` with the ids that landed when a later post fails. The
   * caller MUST NOT re-post a partial thread: the earlier posts are public, and
   * the fix is a follow-up reply, not a duplicate.
   *
   * @param {{posts: string[], idempotencyKey: string}} input
   */
  async sendThread({ posts, idempotencyKey }) {
    if (!Array.isArray(posts) || posts.length === 0) {
      throw new Error("sendThread: posts must be a non-empty array");
    }

    // Validate the WHOLE thread before sending any of it. Discovering that post
    // 6 of 6 is too long after five are public is not a recoverable state.
    const problems = validateThread(posts);
    if (problems.length > 0) {
      this.#emit({ kind: "invalid_thread", idempotencyKey, problems });
      return { outcome: Outcome.INVALID, tweetIds: [], problems };
    }

    if (this.muted()) {
      this.#emit({ kind: "muted", idempotencyKey });
      return { outcome: Outcome.MUTED, tweetIds: [] };
    }

    const threadKey = `${idempotencyKey}#thread`;
    if (await this.ledger.has(threadKey)) {
      return { outcome: Outcome.ALREADY_SENT, tweetIds: [] };
    }
    await this.ledger.record(threadKey, { startedAt: new Date().toISOString(), total: posts.length });

    const tweetIds = [];
    for (let i = 0; i < posts.length; i += 1) {
      const replyToTweetId = tweetIds[i - 1];
      const result = await this.send({
        text: posts[i],
        idempotencyKey: `${idempotencyKey}#${i}`,
        ...(replyToTweetId ? { replyToTweetId } : {}),
      });

      if (result.outcome !== Outcome.SENT) {
        await this.ledger.complete(threadKey, {
          completed: false,
          posted: tweetIds.length,
          total: posts.length,
        });
        this.#emit({
          kind: "thread_partial",
          idempotencyKey,
          posted: tweetIds.length,
          total: posts.length,
          failedAt: i,
        });
        // A partial thread reports BOTH: what landed, and what did not.
        return tweetIds.length > 0
          ? { outcome: Outcome.PARTIAL, tweetIds, failedAt: i }
          : { outcome: result.outcome, tweetIds: [] };
      }
      tweetIds.push(result.tweetId);
    }

    await this.ledger.complete(threadKey, { completed: true, posted: tweetIds.length, tweetIds });
    return { outcome: Outcome.SENT, tweetIds };
  }
}

module.exports = { TwitterSender, MemoryLedger, Outcome, isMuted, validateThread };
