import type { AgentTask } from "@/lib/tasks/agent-task-types";
import { enqueueSafeAgentTask } from "./agent-queue";

export function dispatchAgentWorkerTask(task: AgentTask, redisAvailable = false) {
  return enqueueSafeAgentTask(task, redisAvailable);
}
