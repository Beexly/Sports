"use strict";
/**
 * Test suite for upgraded Motif/Muse X capabilities:
 * - Chunked media upload (INIT -> APPEND -> FINALIZE -> STATUS)
 * - Quote-tweet, reply-to, and media IDs in postTweet
 * - Persistent BotOutboxLedger with UNKNOWN status handling
 * - Settlement receipt quote tweets with single settlement glyph rule
 * - Sniper replies content lane under top NFL accounts with zero links in root
 * - Governed Dispatch Gate
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { XClient, XApiError } = require("./x-client.js");
const { TwitterSender, Outcome } = require("./sender.js");
const { BotOutboxLedger, MemoryLedger, OutboxStatus } = require("./ledger.js");
const { buildSettlementReceipt, buildSubReplyLink } = require("./receipts.js");
const {
  TARGET_ACCOUNTS,
  generateSamHoppenReply,
  generateFantasyPointsReply,
  generatePattonAnalyticsReply,
  dispatchSniperReply,
} = require("./content-lanes/sniper-replies.js");

const CREDENTIALS = {
  consumerKey: "test-ck",
  consumerSecret: "test-cs",
  token: "test-token",
  tokenSecret: "test-ts",
};

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function emptyResponse(status = 204) {
  return new Response(null, { status });
}

/* ══════════════════════════════════════════════════════════════════════════
   1. QUOTE TWEETS, REPLIES, AND MEDIA IN postTweet
   ══════════════════════════════════════════════════════════════════════════ */

test("postTweet includes quote_tweet_id when quoteTweetId is provided", async () => {
  let capturedBody = null;
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async (url, init) => {
      capturedBody = JSON.parse(init.body);
      return jsonResponse({ data: { id: "tweet-123" } });
    },
  });

  const result = await client.postTweet({
    text: "Settlement receipt quote",
    quoteTweetId: "orig-456",
  });

  assert.equal(result.id, "tweet-123");
  assert.equal(capturedBody.quote_tweet_id, "orig-456");
  assert.equal(capturedBody.reply, undefined);
  assert.equal(capturedBody.media, undefined);
});

test("postTweet includes reply.in_reply_to_tweet_id when replyToTweetId is provided", async () => {
  let capturedBody = null;
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async (url, init) => {
      capturedBody = JSON.parse(init.body);
      return jsonResponse({ data: { id: "reply-789" } });
    },
  });

  const result = await client.postTweet({
    text: "Analytical reply",
    replyToTweetId: "target-111",
  });

  assert.equal(result.id, "reply-789");
  assert.deepEqual(capturedBody.reply, { in_reply_to_tweet_id: "target-111" });
});

test("postTweet includes media.media_ids when mediaIds is provided", async () => {
  let capturedBody = null;
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async (url, init) => {
      capturedBody = JSON.parse(init.body);
      return jsonResponse({ data: { id: "media-tweet-999" } });
    },
  });

  const result = await client.postTweet({
    text: "Chart visual breakdown",
    mediaIds: ["media-1", "media-2"],
  });

  assert.equal(result.id, "media-tweet-999");
  assert.deepEqual(capturedBody.media, { media_ids: ["media-1", "media-2"] });
});

/* ══════════════════════════════════════════════════════════════════════════
   2. CHUNKED MEDIA UPLOAD (INIT -> APPEND -> FINALIZE -> STATUS)
   ══════════════════════════════════════════════════════════════════════════ */

test("uploadMedia executes INIT -> APPEND -> FINALIZE for PNG image", async () => {
  const calls = [];
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init.method });
      if (calls.length === 1) {
        // Step 1: INIT
        return jsonResponse({ media_id_string: "media-img-101", size: 1000 });
      }
      if (calls.length === 2) {
        // Step 2: APPEND
        return emptyResponse(204);
      }
      if (calls.length === 3) {
        // Step 3: FINALIZE
        return jsonResponse({ media_id_string: "media-img-101", size: 1000 });
      }
      throw new Error(`Unexpected call #${calls.length}`);
    },
  });

  const sampleBuffer = Buffer.alloc(1000, "a");
  const result = await client.uploadMedia(sampleBuffer, "image/png", "tweet_image", {
    chunkSize: 2000,
  });

  assert.equal(result.mediaId, "media-img-101");
  assert.equal(result.size, 1000);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "https://upload.twitter.com/1.1/media/upload.json");
  assert.equal(calls[1].url, "https://upload.twitter.com/1.1/media/upload.json");
  assert.equal(calls[2].url, "https://upload.twitter.com/1.1/media/upload.json");
});

test("uploadMedia handles multiple APPEND segments when buffer exceeds chunkSize", async () => {
  const segments = [];
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async (url, init) => {
      if (init.body instanceof FormData) {
        segments.push(init.body.get("segment_index"));
        return emptyResponse(204);
      }
      const params = new URLSearchParams(init.body);
      if (params.get("command") === "INIT") {
        return jsonResponse({ media_id_string: "multi-seg-media" });
      }
      if (params.get("command") === "FINALIZE") {
        return jsonResponse({ media_id_string: "multi-seg-media" });
      }
      return jsonResponse({});
    },
  });

  // 3500 bytes with 1000 byte chunks => 4 segments (0, 1, 2, 3)
  const sampleBuffer = Buffer.alloc(3500, "x");
  await client.uploadMedia(sampleBuffer, "image/jpeg", "tweet_image", {
    chunkSize: 1000,
  });

  assert.deepEqual(segments, ["0", "1", "2", "3"]);
});

test("uploadMedia polls STATUS when video processing_info is returned", async () => {
  let callCount = 0;
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async (url, init) => {
      callCount++;
      if (callCount === 1) {
        // INIT
        return jsonResponse({ media_id_string: "video-media-202" });
      }
      if (callCount === 2) {
        // APPEND
        return emptyResponse(204);
      }
      if (callCount === 3) {
        // FINALIZE with pending processing_info
        return jsonResponse({
          media_id_string: "video-media-202",
          processing_info: { state: "in_progress", check_after_secs: 1 },
        });
      }
      if (callCount === 4) {
        // STATUS check -> succeeded
        assert.ok(url.includes("command=STATUS"));
        return jsonResponse({
          media_id_string: "video-media-202",
          processing_info: { state: "succeeded" },
        });
      }
      throw new Error(`Unexpected call #${callCount}`);
    },
  });

  const videoBuffer = Buffer.alloc(500, "v");
  let sleptMs = 0;
  const result = await client.uploadMedia(videoBuffer, "video/mp4", "tweet_video", {
    chunkSize: 1000,
    sleepImpl: async (ms) => {
      sleptMs += ms;
    },
  });

  assert.equal(result.mediaId, "video-media-202");
  assert.equal(callCount, 4);
  assert.equal(sleptMs, 1000);
});

/* ══════════════════════════════════════════════════════════════════════════
   3. BotOutboxLedger PERSISTENCE & UNKNOWN HANDLING
   ══════════════════════════════════════════════════════════════════════════ */

test("BotOutboxLedger records SENDING before send and SENT after success", async () => {
  const tmpFile = path.resolve(process.cwd(), "test_tmp_ledger.jsonl");
  try {
    const ledger = new BotOutboxLedger({
      filePath: tmpFile,
      agent: "motif-muse",
      account: "@GalaxySportsHQ",
    });

    assert.equal(await ledger.has("key-1"), false);
    await ledger.record("key-1", {
      text: "Testing outbox ledger",
      quotedTweetId: "orig-1",
    });

    assert.equal(await ledger.has("key-1"), true);
    const beforeSend = await ledger.get("key-1");
    assert.equal(beforeSend.status, OutboxStatus.SENDING);
    assert.equal(beforeSend.agent, "motif-muse");
    assert.equal(beforeSend.account, "@GalaxySportsHQ");
    assert.equal(beforeSend.quotedTweetId, "orig-1");

    await ledger.complete("key-1", { sent: true, tweetId: "tw-555" });
    const afterSend = await ledger.get("key-1");
    assert.equal(afterSend.status, OutboxStatus.SENT);
    assert.equal(afterSend.tweetId, "tw-555");
    assert.ok(afterSend.sentAt);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test("BotOutboxLedger marks network loss as UNKNOWN and prevents re-sending", async () => {
  const tmpFile = path.resolve(process.cwd(), "test_tmp_ledger_unknown.jsonl");
  try {
    const ledger = new BotOutboxLedger({
      filePath: tmpFile,
      agent: "motif-muse",
      account: "@GalaxySportsHQ",
    });

    await ledger.record("lost-key", { text: "Network might drop" });
    await ledger.complete("lost-key", { sent: false, unknown: true });

    const entry = await ledger.get("lost-key");
    assert.equal(entry.status, OutboxStatus.UNKNOWN);
    assert.equal(entry.sent, false);
    assert.equal(entry.unknown, true);

    // Because it is in the ledger, has() returns true, preventing blind retries
    assert.equal(await ledger.has("lost-key"), true);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test("TwitterSender emits agent: 'motif-muse' and account: '@GalaxySportsHQ'", async () => {
  const events = [];
  const client = new XClient({
    credentials: CREDENTIALS,
    fetchImpl: async () => jsonResponse({ data: { id: "t-100" } }),
  });
  const sender = new TwitterSender({
    client,
    ledger: new MemoryLedger(),
    onEvent: (e) => events.push(e),
    agent: "motif-muse",
    account: "@GalaxySportsHQ",
  });

  const res = await sender.send({
    text: "Branded post",
    idempotencyKey: "k-brand",
    quoteTweetId: "orig-123",
  });

  assert.equal(res.outcome, Outcome.SENT);
  const sentEvt = events.find((e) => e.kind === "sent");
  assert.equal(sentEvt.agent, "motif-muse");
  assert.equal(sentEvt.account, "@GalaxySportsHQ");
  assert.equal(sentEvt.tweetId, "t-100");
});

/* ══════════════════════════════════════════════════════════════════════════
   4. SETTLEMENT RECEIPTS WITH QUOTE TWEETS & SINGLE GLYPH RULE
   ══════════════════════════════════════════════════════════════════════════ */

test("buildSettlementReceipt quotes original tweet and respects single glyph rule", () => {
  const receipt = buildSettlementReceipt({
    originalTweetId: "pregame-tweet-999",
    matchup: "DET @ GB",
    pickLine: "GB -3.5",
    outcome: "WIN",
    finalScore: "GB 27, DET 20",
    clvDelta: "+1.5 pts",
    keyFactor: "Trench pressure differential 34% vs 21% verified.",
  });

  assert.equal(receipt.quoteTweetId, "pregame-tweet-999");
  assert.equal(receipt.agent, "motif-muse");
  assert.equal(receipt.account, "@GalaxySportsHQ");
  assert.ok(receipt.text.includes("SETTLEMENT RECEIPT ⚖️"));
  assert.ok(receipt.text.includes("GB -3.5 (W) | Final: GB 27, DET 20"));
  assert.ok(receipt.text.includes("CLV: +1.5 pts"));
  assert.ok(receipt.text.includes("Timestamped pre-kickoff call below ⬇️"));
  // Root tweet must contain NO external link
  assert.equal(/https?:\/\//i.test(receipt.text), false);
  assert.ok(receipt.text.length <= 280);

  // Voice spec: Settlement glyph count
  const glyphs = (receipt.text.match(/⚖️|✅|❌/g) || []).length;
  assert.equal(glyphs, 1, "Must contain exactly one settlement glyph (⚖️)");
});

test("buildSubReplyLink contains the room dossier link", () => {
  const sub = buildSubReplyLink({
    roomSlug: "det-gb-2026-w9",
    summary: "Full snap-by-snap trajectory:",
  });

  assert.ok(sub.text.includes("https://galaxyedge.ai/room/det-gb-2026-w9"));
  assert.ok(sub.text.length <= 280);
});

/* ══════════════════════════════════════════════════════════════════════════
   5. SNIPER REPLIES CONTENT LANE & GOVERNED DISPATCH GATE
   ══════════════════════════════════════════════════════════════════════════ */

test("generateSamHoppenReply generates high-signal reply with zero links in root", () => {
  const plan = generateSamHoppenReply({
    targetTweetId: "sam-chart-12345",
    team: "Lions",
    metricName: "Motion at snap rate",
    samValue: "68.4%",
    situationalContext: "Ben Johnson leveraging motion to crack 2-high shells into single-high rotations.",
    dossierSlug: "det-gb-2026-w9",
  });

  assert.equal(plan.rootTweet.replyToTweetId, "sam-chart-12345");
  assert.equal(plan.rootTweet.agent, "motif-muse");
  assert.equal(plan.rootTweet.account, "@GalaxySportsHQ");
  assert.ok(plan.rootTweet.text.includes("@SamHoppen"));
  assert.ok(plan.rootTweet.text.includes("Lions Motion at snap rate (68.4%)"));
  // Strictly NO external links in root tweet (avoids 50-80% link suppression)
  assert.equal(/https?:\/\//i.test(plan.rootTweet.text), false);
  assert.ok(plan.rootTweet.text.length <= 280);

  // Sub-reply carries link
  assert.ok(plan.subReply.text.includes("galaxyedge.ai/room/det-gb-2026-w9"));
});

test("generateFantasyPointsReply generates separation context with zero links in root", () => {
  const plan = generateFantasyPointsReply({
    targetTweetId: "fp-tweet-456",
    player: "Amon-Ra St. Brown",
    sepScore: "0.245",
    readShare: "34.2%",
    coverageInsight: "Primary zone-beater against Cover-3 match; 2.89 YPRR vs zone.",
    dossierSlug: "det-gb-2026-w9",
  });

  assert.equal(plan.rootTweet.replyToTweetId, "fp-tweet-456");
  assert.ok(plan.rootTweet.text.includes("@FantasyPtsData"));
  assert.equal(/https?:\/\//i.test(plan.rootTweet.text), false);
  assert.ok(plan.rootTweet.text.length <= 280);
});

test("generatePattonAnalyticsReply generates trench context with zero links in root", () => {
  const plan = generatePattonAnalyticsReply({
    targetTweetId: "patton-tweet-789",
    qb: "Jared Goff",
    poeRate: "-8.4%",
    trenchInsight: "Lions interior line absorbing blitz pressure; pressure-to-sack rate suppressed to 11%.",
  });

  assert.equal(plan.rootTweet.replyToTweetId, "patton-tweet-789");
  assert.ok(plan.rootTweet.text.includes("@PattonAnalytics"));
  assert.equal(/https?:\/\//i.test(plan.rootTweet.text), false);
  assert.ok(plan.rootTweet.text.length <= 280);
});

test("dispatchSniperReply enforces Governed Dispatch Gate (blocks unapproved live dispatch)", async () => {
  const oldEnv = process.env.MUSE_X_PUBLISH_APPROVED;
  try {
    delete process.env.MUSE_X_PUBLISH_APPROVED;

    const plan = generateSamHoppenReply({
      targetTweetId: "sam-chart-12345",
      team: "Lions",
      metricName: "Motion at snap rate",
      samValue: "68.4%",
      situationalContext: "Ben Johnson scheme breakdown.",
    });

    // 1. Dry run preview succeeds without network call
    const preview = await dispatchSniperReply({
      sender: null,
      plan,
      idempotencyKey: "dry-1",
      dryRun: true,
    });
    assert.equal(preview.status, "DRAFT_PREPARED");
    assert.equal(preview.dryRun, true);
    assert.equal(preview.governedGateApproved, false);

    // 2. Live dispatch attempt without MUSE_X_PUBLISH_APPROVED is blocked by gate
    const blocked = await dispatchSniperReply({
      sender: null,
      plan,
      idempotencyKey: "live-attempt-1",
      dryRun: false,
    });
    assert.equal(blocked.status, "DRAFT_PREPARED");
    assert.equal(blocked.governedGateApproved, false);
    assert.ok(blocked.diagnostic.includes("BLOCKED"));
  } finally {
    if (oldEnv !== undefined) {
      process.env.MUSE_X_PUBLISH_APPROVED = oldEnv;
    }
  }
});

test("dispatchSniperReply dispatches root reply and sub-reply when governed approval is set", async () => {
  const oldEnv = process.env.MUSE_X_PUBLISH_APPROVED;
  try {
    process.env.MUSE_X_PUBLISH_APPROVED = "true";

    const sentPosts = [];
    const client = new XClient({
      credentials: CREDENTIALS,
      fetchImpl: async (url, init) => {
        const body = JSON.parse(init.body);
        const id = `tweet-${sentPosts.length + 1}`;
        sentPosts.push({ id, ...body });
        return jsonResponse({ data: { id } });
      },
    });

    const sender = new TwitterSender({
      client,
      ledger: new MemoryLedger(),
      agent: "motif-muse",
      account: "@GalaxySportsHQ",
    });

    const plan = generateSamHoppenReply({
      targetTweetId: "sam-tweet-99",
      team: "Packers",
      metricName: "PROE+",
      samValue: "+4.2%",
      situationalContext: "Matt LaFleur aggressive script on early downs.",
      dossierSlug: "det-gb-2026-w9",
    });

    const dispatched = await dispatchSniperReply({
      sender,
      plan,
      idempotencyKey: "gov-disp-1",
      dryRun: false,
    });

    assert.equal(dispatched.status, "DISPATCHED");
    assert.equal(dispatched.rootTweetId, "tweet-1");
    assert.equal(dispatched.subReplyTweetId, "tweet-2");
    assert.equal(dispatched.agent, "motif-muse");
    assert.equal(dispatched.account, "@GalaxySportsHQ");

    assert.equal(sentPosts.length, 2);
    // Root post replies to Sam Hoppen's tweet
    assert.deepEqual(sentPosts[0].reply, { in_reply_to_tweet_id: "sam-tweet-99" });
    // Sub-reply replies to root post
    assert.deepEqual(sentPosts[1].reply, { in_reply_to_tweet_id: "tweet-1" });
    assert.ok(sentPosts[1].text.includes("galaxyedge.ai/room/det-gb-2026-w9"));
  } finally {
    if (oldEnv !== undefined) {
      process.env.MUSE_X_PUBLISH_APPROVED = oldEnv;
    } else {
      delete process.env.MUSE_X_PUBLISH_APPROVED;
    }
  }
});
