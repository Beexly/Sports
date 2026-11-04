"use strict";
/**
 * Outbox persistence ledger for Motif/Muse on @GalaxySportsHQ.
 *
 * Implements persistent outbox tracking over the database / file storage:
 * - Records all tweet attempts BEFORE the HTTP call leaves (status: SENDING)
 * - Records successful sends (status: SENT, tweetId, sentAt)
 * - CRITICAL: Marks network loss / missing data.id as UNKNOWN (never blindly retried)
 * - Records rate-limited and failed attempts
 * - Stores full metadata: mediaIds, quotedTweetId, replyToTweetId, idempotencyKey, text, agent, account
 */

const fs = require("node:fs");
const path = require("node:path");

const OutboxStatus = {
  PENDING: "PENDING",
  SENDING: "SENDING",
  SENT: "SENT",
  RATE_LIMITED: "RATE_LIMITED",
  UNKNOWN: "UNKNOWN",
  FAILED: "FAILED",
  MUTED: "MUTED",
};

/**
 * In-memory ledger port (for unit testing without disk I/O).
 */
class MemoryLedger {
  constructor() {
    this.rows = new Map();
  }

  async has(key) {
    return this.rows.has(key);
  }

  async get(key) {
    return this.rows.get(key) ?? null;
  }

  async record(key, value) {
    this.rows.set(key, { ...value });
  }

  async complete(key, value) {
    const existing = this.rows.get(key) ?? {};
    this.rows.set(key, { ...existing, ...value, completed: true });
  }
}

/**
 * Persistent BotOutboxLedger.
 * Persists to JSONL audit log and optional Prisma database instance.
 */
class BotOutboxLedger {
  /**
   * @param {object} [options]
   * @param {any} [options.prisma] - Prisma client instance
   * @param {string} [options.filePath] - JSONL ledger file path
   * @param {string} [options.agent] - default "motif-muse"
   * @param {string} [options.account] - default "@GalaxySportsHQ"
   */
  constructor(options = {}) {
    this.prisma = options.prisma ?? globalThis.prisma ?? null;
    this.agent = options.agent ?? "motif-muse";
    this.account = options.account ?? "@GalaxySportsHQ";
    this.memory = new Map();

    const root = options.rootDir ?? process.cwd();
    this.filePath =
      options.filePath ??
      path.resolve(root, "brain", "agent-bus", "x-outbox-ledger.jsonl");

    this.#initFromDisk();
  }

  #initFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const lines = fs.readFileSync(this.filePath, "utf8").split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (entry.idempotencyKey) {
              this.memory.set(entry.idempotencyKey, entry);
            }
          } catch {
            // Ignore malformed line
          }
        }
      }
    } catch {
      // Best effort disk read
    }
  }

  #appendDisk(record) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
    } catch {
      // Disk write failure must not break execution
    }
  }

  async has(key) {
    if (this.memory.has(key)) return true;
    if (this.prisma?.botOutboxRecord?.findUnique) {
      try {
        const row = await this.prisma.botOutboxRecord.findUnique({
          where: { idempotencyKey: key },
        });
        if (row) {
          this.memory.set(key, row);
          return true;
        }
      } catch {
        // Fall back to memory
      }
    }
    return false;
  }

  async get(key) {
    if (this.memory.has(key)) return this.memory.get(key);
    if (this.prisma?.botOutboxRecord?.findUnique) {
      try {
        const row = await this.prisma.botOutboxRecord.findUnique({
          where: { idempotencyKey: key },
        });
        if (row) {
          this.memory.set(key, row);
          return row;
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  /**
   * Record attempt BEFORE sending.
   *
   * @param {string} key - Idempotency key
   * @param {object} payload
   */
  async record(key, payload = {}) {
    const record = {
      idempotencyKey: key,
      status: OutboxStatus.SENDING,
      sent: false,
      startedAt: payload.startedAt ?? new Date().toISOString(),
      agent: payload.agent ?? this.agent,
      account: payload.account ?? this.account,
      text: payload.text ?? null,
      mediaIds: payload.mediaIds ?? [],
      quotedTweetId: payload.quotedTweetId ?? payload.quoteTweetId ?? null,
      replyToTweetId: payload.replyToTweetId ?? null,
      tweetId: null,
      sentAt: null,
      unknown: false,
      retryable: false,
      error: null,
      ...payload,
    };

    this.memory.set(key, record);
    this.#appendDisk(record);

    if (this.prisma?.botOutboxRecord?.upsert) {
      try {
        await this.prisma.botOutboxRecord.upsert({
          where: { idempotencyKey: key },
          update: {
            status: record.status,
            agent: record.agent,
            account: record.account,
            text: record.text,
            mediaIds: record.mediaIds,
            quotedTweetId: record.quotedTweetId,
            replyToTweetId: record.replyToTweetId,
          },
          create: {
            idempotencyKey: key,
            status: record.status,
            agent: record.agent,
            account: record.account,
            text: record.text,
            mediaIds: record.mediaIds,
            quotedTweetId: record.quotedTweetId,
            replyToTweetId: record.replyToTweetId,
            startedAt: new Date(record.startedAt),
          },
        });
      } catch {
        // Non-blocking fallback
      }
    }
  }

  /**
   * Complete record AFTER sending attempt.
   *
   * @param {string} key
   * @param {object} update
   */
  async complete(key, update = {}) {
    const existing = this.memory.get(key) ?? { idempotencyKey: key };
    let status = existing.status;

    if (update.sent === true) {
      status = OutboxStatus.SENT;
    } else if (update.unknown === true) {
      // CRITICAL: Request was dispatched but response was lost or lacked tweet ID.
      // Must NOT be retried automatically.
      status = OutboxStatus.UNKNOWN;
    } else if (update.retryable === true) {
      status = OutboxStatus.RATE_LIMITED;
    } else if (update.error === true) {
      status = OutboxStatus.FAILED;
    }

    const completedRecord = {
      ...existing,
      ...update,
      status,
      completed: true,
      updatedAt: new Date().toISOString(),
      sentAt: update.sent ? (update.sentAt ?? new Date().toISOString()) : null,
    };

    this.memory.set(key, completedRecord);
    this.#appendDisk(completedRecord);

    if (this.prisma?.botOutboxRecord?.update) {
      try {
        await this.prisma.botOutboxRecord.update({
          where: { idempotencyKey: key },
          data: {
            status: completedRecord.status,
            tweetId: completedRecord.tweetId ?? null,
            sentAt: completedRecord.sentAt ? new Date(completedRecord.sentAt) : null,
            updatedAt: new Date(),
          },
        });
      } catch {
        // Non-blocking
      }
    }
  }
}

module.exports = {
  BotOutboxLedger,
  MemoryLedger,
  OutboxStatus,
};
