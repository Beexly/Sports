"use strict";
/**
 * Sniper Replies Content Lane Generator.
 *
 * Dedicated to Motif/Muse on @GalaxySportsHQ (NEVER grokbot).
 *
 * Prepares high-signal, chart-specific replies to top NFL analytics accounts:
 * - @SamHoppen: EPA/play tiers, neutral pace, motion-at-snap, personnel distribution.
 * - @FantasyPtsData: Separation score, 1st-read target share, route win rate vs man/zone.
 * - @PattonAnalytics: Pressure Over Expectation, pressure-to-sack survival curves.
 *
 * Platform Mechanics & Strategic Doctrine:
 * 1. ROOT TWEETS CONTAIN ZERO EXTERNAL LINKS:
 *    External links in root tweets trigger X's 50–80% algorithmic distribution penalty.
 *    Any links (to /room/* or dossiers) live exclusively in sub-replies or bio.
 * 2. SINGLE SETTLEMENT GLYPH:
 *    Any post-game receipt quotes use strictly one settlement glyph (W, L, PUSH, or ⚖️).
 * 3. GOVERNED DISPATCH GATE:
 *    Live execution requires explicit environment approval (`MUSE_X_PUBLISH_APPROVED=true`).
 *    Default mode is governed dry-run preview (`dryRun: true`).
 */

const { buildSettlementReceipt, buildSubReplyLink } = require("../receipts.js");

const TARGET_ACCOUNTS = {
  SAM_HOPPEN: "@SamHoppen",
  FANTASY_POINTS: "@FantasyPtsData",
  PATTON_ANALYTICS: "@PattonAnalytics",
};

/**
 * Generate a high-signal sniper reply to a @SamHoppen chart.
 *
 * @param {object} input
 * @param {string} input.targetTweetId - Tweet ID of @SamHoppen's chart
 * @param {string} input.team - e.g. "Lions" or "Packers"
 * @param {string} input.metricName - e.g. "Motion at snap" or "Neutral pace"
 * @param {string|number} input.samValue - Observed value from Sam's chart
 * @param {string} input.situationalContext - Film / coaching / scheme insight
 * @param {string} [input.dossierSlug] - Optional room slug for sub-reply link
 * @returns {{ rootTweet: { text: string, replyToTweetId: string, agent: string, account: string }, subReply: { text: string } | null }}
 */
function generateSamHoppenReply({
  targetTweetId,
  team,
  metricName,
  samValue,
  situationalContext,
  dossierSlug,
}) {
  if (!targetTweetId) {
    throw new Error("generateSamHoppenReply: targetTweetId is required");
  }

  const lines = [
    `Sharp chart from ${TARGET_ACCOUNTS.SAM_HOPPEN}.`,
    `${team} ${metricName} (${samValue}) maps directly to their script elasticity.`,
    situationalContext,
    `Full coaching tendency film study in bio.`,
  ];

  const rootText = lines.join("\n\n");
  if (rootText.length > 280) {
    throw new Error(`generateSamHoppenReply: root text exceeds 280 chars (${rootText.length})`);
  }

  // Ensure ZERO external links in root tweet
  if (/https?:\/\//i.test(rootText)) {
    throw new Error("generateSamHoppenReply: root tweet must NOT contain external links");
  }

  const subReply = dossierSlug
    ? buildSubReplyLink({
        roomSlug: dossierSlug,
        summary: `Snap-by-snap JEV simulation & tendency breakdowns:`,
      })
    : null;

  return {
    rootTweet: {
      text: rootText,
      replyToTweetId: targetTweetId,
      agent: "motif-muse",
      account: "@GalaxySportsHQ",
    },
    subReply,
  };
}

/**
 * Generate a high-signal sniper reply to a @FantasyPtsData chart/table.
 *
 * @param {object} input
 * @param {string} input.targetTweetId
 * @param {string} input.player - Player name
 * @param {string|number} input.sepScore - Separation score
 * @param {string|number} input.readShare - 1st-read target share %
 * @param {string} input.coverageInsight - Scheme/coverage breakdown
 * @param {string} [input.dossierSlug]
 */
function generateFantasyPointsReply({
  targetTweetId,
  player,
  sepScore,
  readShare,
  coverageInsight,
  dossierSlug,
}) {
  if (!targetTweetId) {
    throw new Error("generateFantasyPointsReply: targetTweetId is required");
  }

  const lines = [
    `Crucial separation context via ${TARGET_ACCOUNTS.FANTASY_POINTS}:`,
    `${player} SEP score ${sepScore} with ${readShare} 1st-read share.`,
    coverageInsight,
  ];

  const rootText = lines.join("\n\n");
  if (rootText.length > 280) {
    throw new Error(`generateFantasyPointsReply: root text exceeds 280 chars (${rootText.length})`);
  }

  if (/https?:\/\//i.test(rootText)) {
    throw new Error("generateFantasyPointsReply: root tweet must NOT contain external links");
  }

  const subReply = dossierSlug
    ? buildSubReplyLink({
        roomSlug: dossierSlug,
        summary: `Full WR/CB match-up charting & expected metrics:`,
      })
    : null;

  return {
    rootTweet: {
      text: rootText,
      replyToTweetId: targetTweetId,
      agent: "motif-muse",
      account: "@GalaxySportsHQ",
    },
    subReply,
  };
}

/**
 * Generate a high-signal sniper reply to a @PattonAnalytics pressure chart.
 *
 * @param {object} input
 * @param {string} input.targetTweetId
 * @param {string} input.qb - QB name
 * @param {string|number} input.poeRate - Pressure Over Expectation %
 * @param {string} input.trenchInsight - Backfield disruption & sack conversion analysis
 * @param {string} [input.dossierSlug]
 */
function generatePattonAnalyticsReply({
  targetTweetId,
  qb,
  poeRate,
  trenchInsight,
  dossierSlug,
}) {
  if (!targetTweetId) {
    throw new Error("generatePattonAnalyticsReply: targetTweetId is required");
  }

  const lines = [
    `Key trench signal from ${TARGET_ACCOUNTS.PATTON_ANALYTICS}:`,
    `${qb} POE differential sitting at ${poeRate}.`,
    trenchInsight,
  ];

  const rootText = lines.join("\n\n");
  if (rootText.length > 280) {
    throw new Error(`generatePattonAnalyticsReply: root text exceeds 280 chars (${rootText.length})`);
  }

  if (/https?:\/\//i.test(rootText)) {
    throw new Error("generatePattonAnalyticsReply: root tweet must NOT contain external links");
  }

  const subReply = dossierSlug
    ? buildSubReplyLink({
        roomSlug: dossierSlug,
        summary: `Trench matchup rankings & pressure survival curves:`,
      })
    : null;

  return {
    rootTweet: {
      text: rootText,
      replyToTweetId: targetTweetId,
      agent: "motif-muse",
      account: "@GalaxySportsHQ",
    },
    subReply,
  };
}

/**
 * Governed Dispatch Gate for Sniper Replies.
 *
 * Safely executes or previews a sniper reply:
 * - If dryRun is true: outputs structured preview without network send.
 * - If dryRun is false: requires MUSE_X_PUBLISH_APPROVED=true in env.
 *
 * @param {object} input
 * @param {import("../sender.js").TwitterSender} input.sender
 * @param {object} input.plan - Output from generate*Reply
 * @param {string} input.idempotencyKey
 * @param {boolean} [input.dryRun] - default true
 */
async function dispatchSniperReply({
  sender,
  plan,
  idempotencyKey,
  dryRun = true,
}) {
  const isApproved = process.env.MUSE_X_PUBLISH_APPROVED?.trim().toLowerCase() === "true";

  if (dryRun || !isApproved) {
    return {
      status: "DRAFT_PREPARED",
      dryRun: true,
      governedGateApproved: isApproved,
      idempotencyKey,
      agent: plan.rootTweet.agent,
      account: plan.rootTweet.account,
      rootTweet: plan.rootTweet,
      subReply: plan.subReply,
      diagnostic: !isApproved && !dryRun
        ? "BLOCKED: MUSE_X_PUBLISH_APPROVED environment variable is not 'true'"
        : "PREVIEW_OK: Dry run mode active",
    };
  }

  if (!sender) {
    throw new Error("dispatchSniperReply: TwitterSender is required for live dispatch");
  }

  // 1. Post root reply
  const rootResult = await sender.send({
    text: plan.rootTweet.text,
    replyToTweetId: plan.rootTweet.replyToTweetId,
    idempotencyKey: `${idempotencyKey}#root`,
  });

  if (rootResult.outcome !== "sent" || !rootResult.tweetId) {
    return {
      status: "ROOT_FAILED",
      outcome: rootResult.outcome,
      rootTweetId: null,
      subReplyTweetId: null,
    };
  }

  // 2. Post sub-reply if plan has one
  let subReplyTweetId = null;
  if (plan.subReply) {
    const subResult = await sender.send({
      text: plan.subReply.text,
      replyToTweetId: rootResult.tweetId,
      idempotencyKey: `${idempotencyKey}#sub`,
    });
    subReplyTweetId = subResult.tweetId ?? null;
  }

  return {
    status: "DISPATCHED",
    dryRun: false,
    rootTweetId: rootResult.tweetId,
    subReplyTweetId,
    agent: plan.rootTweet.agent,
    account: plan.rootTweet.account,
  };
}

module.exports = {
  TARGET_ACCOUNTS,
  generateSamHoppenReply,
  generateFantasyPointsReply,
  generatePattonAnalyticsReply,
  dispatchSniperReply,
  buildSettlementReceipt,
};
