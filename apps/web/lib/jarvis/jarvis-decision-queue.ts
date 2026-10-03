import { listSeedAgentTasks } from "@/lib/tasks/agent-task-router";

export function getJarvisOwnerDecisions() {
  return listSeedAgentTasks().filter((task) => task.ownerApprovalRequired || task.status === "NEEDS_OWNER_APPROVAL");
}

export function getJarvisClaudeReviewItems() {
  return listSeedAgentTasks().filter((task) => task.claudeReviewRequired || task.status === "NEEDS_CLAUDE_REVIEW");
}
