import { getJarvisClaudeReviewItems, getJarvisOwnerDecisions } from "./jarvis-decision-queue";

export function buildJarvisOwnerSummary() {
  return {
    ownerDecisions: getJarvisOwnerDecisions().map((task) => task.title),
    claudeReview: getJarvisClaudeReviewItems().map((task) => task.title),
    publicGateStatus: "PUBLIC_PICKS_ENABLED remains owner-controlled and blocked from self-enabling.",
  };
}
