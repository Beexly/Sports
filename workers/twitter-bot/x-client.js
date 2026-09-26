"use strict";
/**
 * X API v2 client.
 *
 * SCOPE, and it is deliberately narrow: this client can post a tweet and reply
 * to one, and it can do nothing else. There is no `follow`, no `like`, no
 * `retweet`, no `delete` — not because they are unimplemented, but because the
 * account hygiene rule in `docs/product/twitter-bot-voice-spec.md` says the bot
 * "follows zero accounts, likes zero posts, retweets zero posts", and the
 * cheapest way to keep that promise is for the capability not to exist in the
 * codebase. A test asserts the surface has no such methods.
 *
 * The credential is a user-context OAuth 1.0a set. An app-only bearer token
 * cannot create a tweet, which is why the four-part set is used.
 */

const { authorizationHeader } = require("./oauth1.js");

const DEFAULT_BASE = "https://api.x.com";

class XApiError extends Error {
  constructor({ status, code, detail, headers, retryAfterSec }) {
    super(`X API ${status}: ${detail ?? code ?? "unknown"}`);
    this.name = "XApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.headers = headers;
    this.retryAfterSec = retryAfterSec ?? null;
  }

  /** Whether a retry could plausibly succeed. */
  get retryable() {
    return this.status === 429 || this.status >= 500;
  }

  /** Whether the credential itself is the problem, which retrying cannot fix. */
  get authFailure() {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * Parse X's rate-limit headers.
 *
 * These are the authority. A hardcoded ceiling is wrong the moment the account's
 * tier changes, and being wrong in the optimistic direction is how an account
 * gets throttled by the platform rather than by us.
 */
function parseRateLimit(headers) {
  const get = (name) =>
    typeof headers?.get === "function" ? headers.get(name) : (headers?.[name] ?? null);
  const remaining = Number(get("x-rate-limit-remaining"));
  const reset = Number(get("x-rate-limit-reset"));
  return {
    remaining: Number.isFinite(remaining) ? remaining : null,
    // `x-rate-limit-reset` is Unix SECONDS, not milliseconds. Treating it as ms
    // produces a reset time in 1970 and an immediate retry loop.
    resetAt: Number.isFinite(reset) ? reset * 1000 : null,
  };
}

class XClient {
  /**
   * @param {object} config
   * @param {{consumerKey: string, consumerSecret: string, token: string, tokenSecret: string}} config.credentials
   * @param {string} [config.baseUrl]
   * @param {typeof fetch} [config.fetchImpl]  injected in tests
   * @param {(event: object) => void} [config.onAttempt]  structured attempt log
   */
  constructor({ credentials, baseUrl = DEFAULT_BASE, fetchImpl, onAttempt }) {
    if (!credentials?.consumerKey || !credentials?.consumerSecret || !credentials?.token || !credentials?.tokenSecret) {
      throw new Error(
        "XClient: all four OAuth 1.0a parts are required. A missing part produces a " +
          "401 with no explanation from the API, so it is refused here instead.",
      );
    }
    this.credentials = credentials;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    this.onAttempt = onAttempt;
  }

  /**
   * POST /2/tweets
   *
   * @param {{text: string, replyToTweetId?: string}} input
   */
  async postTweet({ text, replyToTweetId }) {
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error("postTweet: text is required");
    }
    // 280 is the platform limit. Refusing here rather than letting the API reject
    // keeps the failure local and loggable with the offending text attached.
    if (text.length > 280) {
      throw new Error(`postTweet: ${text.length} characters exceeds the 280 limit`);
    }
    if (replyToTweetId !== undefined && typeof replyToTweetId !== "string") {
      throw new Error("postTweet: replyToTweetId must be a string when present");
    }

    const url = `${this.baseUrl}/2/tweets`;
    const body = replyToTweetId
      ? { text, reply: { in_reply_to_tweet_id: replyToTweetId } }
      : { text };

    const { header } = authorizationHeader({
      method: "POST",
      url,
      ...this.credentials,
    });

    const startedAt = Date.now();
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: header,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.#log({
        url,
        status: null,
        ms: Date.now() - startedAt,
        outcome: "network_error",
        detail: error instanceof Error ? error.message : String(error),
      });
      throw new XApiError({
        status: 0,
        code: "network_error",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    const ms = Date.now() - startedAt;
    const rateLimit = parseRateLimit(response.headers);
    const raw = await response.text();

    if (!response.ok) {
      const parsed = safeJson(raw);
      const apiError = parsed?.errors?.[0];
      const retryAfterSec =
        Number(response.headers?.get?.("retry-after")) ||
        (rateLimit.resetAt ? Math.max(0, Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) : null);

      this.#log({
        url,
        status: response.status,
        ms,
        outcome: "api_error",
        detail: apiError?.detail ?? apiError?.title ?? raw.slice(0, 200),
        rateLimit,
      });
      throw new XApiError({
        status: response.status,
        code: apiError?.type ?? null,
        detail: apiError?.detail ?? apiError?.title ?? null,
        headers: response.headers,
        retryAfterSec,
      });
    }

    const parsed = safeJson(raw);
    const id = parsed?.data?.id;
    if (typeof id !== "string" || id.length === 0) {
      // A 200 without an id means the tweet may or may not exist, and we have no
      // handle to find out. This is the single most dangerous response the API
      // can give, because the caller cannot safely retry OR record success.
      this.#log({ url, status: response.status, ms, outcome: "no_id_in_response", rateLimit });
      throw new XApiError({
        status: response.status,
        code: "no_id_in_response",
        detail: "2xx response with no data.id; the send outcome is UNKNOWN",
      });
    }

    this.#log({ url, status: response.status, ms, outcome: "ok", tweetId: id, rateLimit });
    return { id, text, rateLimit };
  }

  #log(event) {
    if (this.onAttempt) this.onAttempt(event);
  }
}

function safeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

module.exports = { XClient, XApiError, parseRateLimit };
