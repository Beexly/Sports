"use strict";
/**
 * Settlement Receipts & Quote-Tweet Receipt Generator.
 *
 * Dedicated to Motif/Muse on @GalaxySportsHQ.
 *
 * Rules:
 * 1. Zero external links in root tweet (avoids 50–80% platform link suppression).
 * 2. Single settlement glyph per voice spec: exactly ONE of W, L, PUSH, or ⚖️ on lead post.
 * 3. Quotes original pre-kickoff call tweet (proving timestamp and 0 hindsight).
 * 4. Strictly adheres to <= 280 characters.
 */

const OutcomeGlyph = {
  WIN: "W",
  LOSS: "L",
  PUSH: "PUSH",
  VOID: "PUSH",
};

/**
 * Format settlement receipt post quoting the pre-kickoff call.
 *
 * @param {object} input
 * @param {string} input.originalTweetId - Tweet ID of the pre-game call
 * @param {string} input.matchup - e.g. "DET @ GB"
 * @param {string} input.pickLine - e.g. "GB -3.5"
 * @param {"WIN"|"LOSS"|"PUSH"|"VOID"|"W"|"L"} input.outcome
 * @param {string} [input.finalScore] - e.g. "GB 27, DET 20"
 * @param {string|number} [input.clvDelta] - e.g. "+1.5 pts" or 1.5
 * @param {string} [input.keyFactor] - e.g. "Trench pressure differential 34% vs 21%"
 * @param {string} [input.agent] - default "motif-muse"
 * @param {string} [input.account] - default "@GalaxySportsHQ"
 * @returns {{ text: string, quoteTweetId: string, agent: string, account: string }}
 */
function buildSettlementReceipt({
  originalTweetId,
  matchup,
  pickLine,
  outcome,
  finalScore,
  clvDelta,
  keyFactor,
  agent = "motif-muse",
  account = "@GalaxySportsHQ",
}) {
  if (!originalTweetId || typeof originalTweetId !== "string") {
    throw new Error("buildSettlementReceipt: originalTweetId is required to quote pre-game call");
  }

  const normalizedOutcome =
    outcome === "W" || outcome === "WIN"
      ? "W"
      : outcome === "L" || outcome === "LOSS"
        ? "L"
        : "PUSH";

  // Voice spec compliance: Single settlement glyph (W, L, PUSH, or ⚖️)
  const lines = [`SETTLEMENT RECEIPT ⚖️`];
  
  let scoreLine = `${pickLine} (${normalizedOutcome})`;
  if (finalScore) {
    scoreLine += ` | Final: ${finalScore}`;
  }
  lines.push(scoreLine);

  if (clvDelta !== undefined && clvDelta !== null) {
    const clvStr = typeof clvDelta === "number" ? (clvDelta > 0 ? `+${clvDelta}` : `${clvDelta}`) : String(clvDelta);
    lines.push(`CLV: ${clvStr}`);
  }

  if (keyFactor) {
    lines.push(keyFactor);
  }

  lines.push("Timestamped pre-kickoff call below ⬇️");

  const text = lines.join("\n");
  if (text.length > 280) {
    throw new Error(`buildSettlementReceipt: text exceeds 280 limit (${text.length} chars)`);
  }

  return {
    text,
    quoteTweetId: originalTweetId,
    agent,
    account,
  };
}

/**
 * Build sub-reply tweet carrying the dossier/room link (never in the root tweet).
 *
 * @param {object} input
 * @param {string} input.roomSlug - e.g. "det-gb-2026-w9"
 * @param {string} [input.summary] - optional brief note
 * @returns {{ text: string }}
 */
function buildSubReplyLink({ roomSlug, summary }) {
  const lines = [];
  if (summary) {
    lines.push(summary);
  }
  lines.push(`Full snap-by-snap trajectory & post-game forensic dossier:`);
  lines.push(`https://galaxyedge.ai/room/${roomSlug}`);
  
  const text = lines.join("\n");
  if (text.length > 280) {
    throw new Error(`buildSubReplyLink: text exceeds 280 chars (${text.length})`);
  }

  return { text };
}

module.exports = {
  buildSettlementReceipt,
  buildSubReplyLink,
  OutcomeGlyph,
};
