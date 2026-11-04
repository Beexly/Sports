"use strict";
/**
 * X API v2 client with chunked media upload & quote/reply capabilities.
 *
 * Dedicated to Motif/Muse on @GalaxySportsHQ.
 *
 * SCOPE:
 * - Tweet creation (`postTweet`): supports root posts, quote tweets (`quote_tweet_id`),
 *   replies (`reply_to_tweet_id`), and attached media (`media_ids`).
 * - Media upload (`uploadMedia`): chunked upload protocol (INIT -> APPEND -> FINALIZE)
 *   supporting PNG, JPEG, GIF, and MP4 video under OAuth 1.0a.
 * - Account hygiene rule: Bot follows zero accounts, likes zero posts, retweets zero posts.
 *   `XClient` exposes no `follow`, `like`, `retweet`, `unfollow`, `unlike`, `delete`.
 */

const { authorizationHeader } = require("./oauth1.js");

const DEFAULT_BASE = "https://api.x.com";
const DEFAULT_UPLOAD_BASE = "https://upload.twitter.com";

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
 */
function parseRateLimit(headers) {
  const get = (name) =>
    typeof headers?.get === "function" ? headers.get(name) : (headers?.[name] ?? null);
  const remaining = Number(get("x-rate-limit-remaining"));
  const reset = Number(get("x-rate-limit-reset"));
  return {
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt: Number.isFinite(reset) ? reset * 1000 : null,
  };
}

class XClient {
  /**
   * @param {object} config
   * @param {{consumerKey: string, consumerSecret: string, token: string, tokenSecret: string}} config.credentials
   * @param {string} [config.baseUrl]
   * @param {string} [config.uploadBaseUrl]
   * @param {typeof fetch} [config.fetchImpl]  injected in tests
   * @param {(event: object) => void} [config.onAttempt]  structured attempt log
   */
  constructor({
    credentials,
    baseUrl = DEFAULT_BASE,
    uploadBaseUrl = DEFAULT_UPLOAD_BASE,
    fetchImpl,
    onAttempt,
  }) {
    if (
      !credentials?.consumerKey ||
      !credentials?.consumerSecret ||
      !credentials?.token ||
      !credentials?.tokenSecret
    ) {
      throw new Error(
        "XClient: all four OAuth 1.0a parts are required. A missing part produces a " +
          "401 with no explanation from the API, so it is refused here instead.",
      );
    }
    this.credentials = credentials;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.uploadBaseUrl = uploadBaseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    this.onAttempt = onAttempt;
  }

  /**
   * POST /2/tweets
   *
   * @param {{
   *   text: string,
   *   replyToTweetId?: string,
   *   reply_to_tweet_id?: string,
   *   quoteTweetId?: string,
   *   quote_tweet_id?: string,
   *   mediaIds?: string[],
   *   media_ids?: string[]
   * }} input
   */
  async postTweet({
    text,
    replyToTweetId,
    reply_to_tweet_id,
    quoteTweetId,
    quote_tweet_id,
    mediaIds,
    media_ids,
  }) {
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error("postTweet: text is required");
    }
    if (text.length > 280) {
      throw new Error(`postTweet: ${text.length} characters exceeds the 280 limit`);
    }

    const replyId = replyToTweetId ?? reply_to_tweet_id;
    if (replyId !== undefined) {
      if (typeof replyId !== "string" || replyId.trim().length === 0) {
        throw new Error("postTweet: replyToTweetId must be a string when present");
      }
    }

    const quoteId = quoteTweetId ?? quote_tweet_id;
    if (quoteId !== undefined) {
      if (typeof quoteId !== "string" || quoteId.trim().length === 0) {
        throw new Error("postTweet: quoteTweetId must be a string when present");
      }
    }

    const media = mediaIds ?? media_ids;
    if (media !== undefined) {
      if (
        !Array.isArray(media) ||
        media.length === 0 ||
        media.some((m) => typeof m !== "string" || !m.trim())
      ) {
        throw new Error("postTweet: mediaIds must be an array of strings when present");
      }
    }

    const url = `${this.baseUrl}/2/tweets`;
    const body = { text };
    if (replyId) {
      body.reply = { in_reply_to_tweet_id: replyId };
    }
    if (quoteId) {
      body.quote_tweet_id = quoteId;
    }
    if (media && media.length > 0) {
      body.media = { media_ids: media };
    }

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
      this.#log({ url, status: response.status, ms, outcome: "no_id_in_response", rateLimit });
      throw new XApiError({
        status: response.status,
        code: "no_id_in_response",
        detail: "2xx response with no data.id; the send outcome is UNKNOWN",
      });
    }

    this.#log({
      url,
      status: response.status,
      ms,
      outcome: "ok",
      tweetId: id,
      quoteTweetId: quoteId ?? null,
      replyToTweetId: replyId ?? null,
      mediaIds: media ?? [],
      rateLimit,
    });

    return {
      id,
      text,
      quoteTweetId: quoteId ?? null,
      replyToTweetId: replyId ?? null,
      mediaIds: media ?? [],
      rateLimit,
    };
  }

  /**
   * Upload media using Twitter chunked media upload (INIT -> APPEND -> FINALIZE).
   *
   * @param {Buffer|Uint8Array} buffer - Media buffer
   * @param {string} mimeType - e.g. "image/png", "image/jpeg", "video/mp4"
   * @param {string} [mediaCategory] - e.g. "tweet_image", "tweet_video"
   * @param {object} [options]
   * @param {number} [options.chunkSize] - Chunk size in bytes (default 1MB)
   * @param {number} [options.maxStatusChecks] - Maximum STATUS checks for async processing
   * @param {(ms: number) => Promise<void>} [options.sleepImpl] - Custom sleeper for testing
   * @returns {Promise<{ mediaId: string, media_id_string: string, size: number }>}
   */
  async uploadMedia(buffer, mimeType, mediaCategory, options = {}) {
    if (!buffer || (typeof buffer.length !== "number" && typeof buffer.byteLength !== "number")) {
      throw new Error("uploadMedia: buffer is required and must have a valid length");
    }
    if (!mimeType || typeof mimeType !== "string") {
      throw new Error("uploadMedia: mimeType is required");
    }

    const totalBytes = buffer.length ?? buffer.byteLength;
    const category =
      mediaCategory ||
      (mimeType.startsWith("video/")
        ? "tweet_video"
        : mimeType === "image/gif"
          ? "tweet_gif"
          : "tweet_image");

    const uploadUrl = `${this.uploadBaseUrl}/1.1/media/upload.json`;
    const startedAt = Date.now();

    // 1. INIT
    const initBodyParams = {
      command: "INIT",
      total_bytes: String(totalBytes),
      media_type: mimeType,
      media_category: category,
    };

    const { header: initAuthHeader } = authorizationHeader({
      method: "POST",
      url: uploadUrl,
      bodyParams: initBodyParams,
      signatureMethod: "HMAC-SHA1",
      ...this.credentials,
    });

    let initRes;
    try {
      initRes = await this.fetchImpl(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: initAuthHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams(initBodyParams).toString(),
      });
    } catch (err) {
      this.#log({
        url: uploadUrl,
        step: "INIT",
        status: null,
        ms: Date.now() - startedAt,
        outcome: "network_error",
        detail: err instanceof Error ? err.message : String(err),
      });
      throw new XApiError({
        status: 0,
        code: "media_init_network_error",
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    if (!initRes.ok) {
      const raw = await initRes.text();
      const parsed = safeJson(raw);
      throw new XApiError({
        status: initRes.status,
        code: "media_init_error",
        detail: parsed?.errors?.[0]?.message ?? raw.slice(0, 200),
        headers: initRes.headers,
      });
    }

    const initData = safeJson(await initRes.text());
    const mediaId =
      initData?.media_id_string || (initData?.media_id ? String(initData.media_id) : null);
    if (!mediaId) {
      throw new XApiError({
        status: initRes.status,
        code: "no_media_id_in_response",
        detail: "Media INIT succeeded but returned no media_id_string",
      });
    }

    // 2. APPEND chunks
    const chunkSize = options.chunkSize ?? 1024 * 1024;
    let segmentIndex = 0;
    for (let offset = 0; offset < totalBytes; offset += chunkSize) {
      const chunk = buffer.subarray
        ? buffer.subarray(offset, offset + chunkSize)
        : buffer.slice(offset, offset + chunkSize);

      const formData = new FormData();
      formData.append("command", "APPEND");
      formData.append("media_id", mediaId);
      formData.append("segment_index", String(segmentIndex));

      const blob = new Blob([chunk], { type: mimeType });
      formData.append("media", blob, `media.${mimeType.split("/")[1] || "bin"}`);

      // Multipart entity-body does not participate in signature base string (RFC 5849 §3.4.1.3)
      const { header: appendAuthHeader } = authorizationHeader({
        method: "POST",
        url: uploadUrl,
        signatureMethod: "HMAC-SHA1",
        ...this.credentials,
      });

      let appendRes;
      try {
        appendRes = await this.fetchImpl(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: appendAuthHeader,
          },
          body: formData,
        });
      } catch (err) {
        throw new XApiError({
          status: 0,
          code: "media_append_network_error",
          detail: `APPEND segment ${segmentIndex} failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }

      if (!appendRes.ok && appendRes.status !== 204) {
        const raw = await appendRes.text();
        throw new XApiError({
          status: appendRes.status,
          code: "media_append_error",
          detail: `APPEND segment ${segmentIndex} failed: ${raw.slice(0, 200)}`,
          headers: appendRes.headers,
        });
      }

      segmentIndex++;
    }

    // 3. FINALIZE
    const finalizeBodyParams = {
      command: "FINALIZE",
      media_id: mediaId,
    };

    const { header: finalizeAuthHeader } = authorizationHeader({
      method: "POST",
      url: uploadUrl,
      bodyParams: finalizeBodyParams,
      signatureMethod: "HMAC-SHA1",
      ...this.credentials,
    });

    let finalizeRes;
    try {
      finalizeRes = await this.fetchImpl(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: finalizeAuthHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams(finalizeBodyParams).toString(),
      });
    } catch (err) {
      throw new XApiError({
        status: 0,
        code: "media_finalize_network_error",
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    if (!finalizeRes.ok) {
      const raw = await finalizeRes.text();
      const parsed = safeJson(raw);
      throw new XApiError({
        status: finalizeRes.status,
        code: "media_finalize_error",
        detail: parsed?.errors?.[0]?.message ?? raw.slice(0, 200),
        headers: finalizeRes.headers,
      });
    }

    const finalizeData = safeJson(await finalizeRes.text());

    // 4. STATUS check (if async processing required, e.g. for video)
    if (finalizeData?.processing_info) {
      let state = finalizeData.processing_info.state;
      let checkAfterSecs = finalizeData.processing_info.check_after_secs || 1;
      let checkCount = 0;
      const maxChecks = options.maxStatusChecks ?? 30;

      while ((state === "pending" || state === "in_progress") && checkCount < maxChecks) {
        checkCount++;
        if (options.sleepImpl) {
          await options.sleepImpl(checkAfterSecs * 1000);
        } else {
          await new Promise((r) => setTimeout(r, Math.min(checkAfterSecs * 1000, 5000)));
        }

        const statusUrl = `${uploadUrl}?command=STATUS&media_id=${encodeURIComponent(mediaId)}`;
        const { header: statusAuthHeader } = authorizationHeader({
          method: "GET",
          url: statusUrl,
          signatureMethod: "HMAC-SHA1",
          ...this.credentials,
        });

        const statusRes = await this.fetchImpl(statusUrl, {
          method: "GET",
          headers: {
            Authorization: statusAuthHeader,
            Accept: "application/json",
          },
        });

        if (statusRes.ok) {
          const statusData = safeJson(await statusRes.text());
          if (statusData?.processing_info) {
            state = statusData.processing_info.state;
            checkAfterSecs = statusData.processing_info.check_after_secs || 1;
            if (state === "failed") {
              throw new XApiError({
                status: 400,
                code: "media_processing_failed",
                detail: statusData.processing_info.error?.message || "Media processing failed",
              });
            }
          } else {
            state = "succeeded";
          }
        }
      }
    }

    this.#log({
      url: uploadUrl,
      ms: Date.now() - startedAt,
      outcome: "media_uploaded",
      mediaId,
    });

    return {
      mediaId,
      media_id_string: mediaId,
      size: totalBytes,
    };
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
