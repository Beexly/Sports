"use strict";
/**
 * The send pipeline.
 *
 * Dedicated to Motif/Muse on @GalaxySportsHQ.
 * Everything between "the planner produced an outbox row" and "a tweet exists".
 *
 * Core Guarantees:
 *   1. MUTE_BOT IS CHECKED AT SEND TIME, not at schedule time.
 *   2. THE IDEMPOTENCY KEY IS RECORDED BEFORE THE SEND.
 *      Lost responses are classified UNKNOWN and NOT retried.
 *   3. A THREAD IS NOT ATOMIC AND CANNOT PRETEND TO BE (returns PARTIAL if broken).
 *   4. RATE LIMITS COME FROM THE API RESPONSE, not from a constant.
 *   5. BRANDING & METADATA: All posts, events, and records carry `agent: "motif-muse"`
 *      and `account: "@GalaxySportsHQ"` — NEVER grokbot.
 */

const { XApiError } = require("./x-client.js");
const { BotOutboxLedger, MemoryLedger, OutboxStatus } = require("./ledger.js");

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

function isMuted(env = process.env) {
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
   * @param {MemoryLedger|BotOutboxLedger} [config.ledger]
   * @param {() => boolean} [config.muted]  injected so tests need no env
   * @param {(event: object) => void} [config.onEvent]
   * @param {string} [config.agent] - default "motif-muse"
   * @param {string} [config.account] - default "@GalaxySportsHQ"
   */
  constructor({
    client,
    ledger,
    muted = () => isMuted(process.env),
    onEvent,
    agent = "motif-muse",
    account = "@GalaxySportsHQ",
  }) {
    this.client = client;
    this.ledger = ledger ?? new BotOutboxLedger({ agent, account });
    this.muted = muted;
    this.onEvent = onEvent;
    this.agent = agent;
    this.account = account;
  }

  #emit(event) {
    if (this.onEvent) {
      this.onEvent({
        agent: this.agent,
        account: this.account,
        ...event,
      });
    }
  }

  /**
   * Send a single post, quote tweet, reply, or media post.
   *
   * @param {{
   *   text: string,
   *   idempotencyKey: string,
   *   replyToTweetId?: string,
   *   quoteTweetId?: string,
   *   mediaIds?: string[]
   * }} input
   */
  async send({ text, idempotencyKey, replyToTweetId, quoteTweetId, mediaIds }) {
    if (!idempotencyKey) {
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
    await this.ledger.record(idempotencyKey, {
      startedAt: new Date().toISOString(),
      sent: false,
      text,
      replyToTweetId: replyToTweetId ?? null,
      quotedTweetId: quoteTweetId ?? null,
      mediaIds: mediaIds ?? [],
      agent: this.agent,
      account: this.account,
    });

    try {
      const result = await this.client.postTweet({
        text,
        replyToTweetId,
        quoteTweetId,
        mediaIds,
      });
      await this.ledger.complete(idempotencyKey, {
        sent: true,
        tweetId: result.id,
        sentAt: new Date().toISOString(),
      });
      this.#emit({ kind: "sent", idempotencyKey, tweetId: result.id });
      return { outcome: Outcome.SENT, tweetId: result.id };
    } catch (error) {
      if (error instanceof XApiError) {
        if (error.retryable) {
          await this.ledger.complete(idempotencyKey, {
            sent: false,
            retryable: true,
            status: OutboxStatus.RATE_LIMITED,
          });
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
          // incomplete (UNKNOWN), which is safe and prevents blind retry.
          await this.ledger.complete(idempotencyKey, {
            sent: false,
            unknown: true,
            status: OutboxStatus.UNKNOWN,
          });
          this.#emit({ kind: "unknown", idempotencyKey });
          return { outcome: Outcome.UNKNOWN, tweetId: null };
        }
      }
      await this.ledger.complete(idempotencyKey, {
        sent: false,
        error: true,
        status: OutboxStatus.FAILED,
        detail: error instanceof Error ? error.message : String(error),
      });
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
   * @param {{posts: string[], idempotencyKey: string}} input
   */
  async sendThread({ posts, idempotencyKey }) {
    if (!Array.isArray(posts) || posts.length === 0) {
      throw new Error("sendThread: posts must be a non-empty array");
    }

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
    await this.ledger.record(threadKey, {
      startedAt: new Date().toISOString(),
      total: posts.length,
      agent: this.agent,
      account: this.account,
    });

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
        return tweetIds.length > 0
          ? { outcome: Outcome.PARTIAL, tweetIds, failedAt: i }
          : { outcome: result.outcome, tweetIds: [] };
      }
      tweetIds.push(result.tweetId);
    }

    await this.ledger.complete(threadKey, {
      completed: true,
      posted: tweetIds.length,
      tweetIds,
    });
    return { outcome: Outcome.SENT, tweetIds };
  }
}

module.exports = {
  TwitterSender,
  MemoryLedger,
  BotOutboxLedger,
  Outcome,
  isMuted,
  validateThread,
};
