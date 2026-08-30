import { AGENT_TASK_SEED } from "./agent-task-seed";
import { createPrismaAgentTaskStore, type AgentTaskStore } from "./agent-task-store";
import { persistRoutedTask } from "./agent-task-runtime";

export async function persistAgentOSTaskSeed(store: AgentTaskStore = createPrismaAgentTaskStore()) {
  const results = [];
  for (const task of AGENT_TASK_SEED) results.push(await persistRoutedTask(store, task));
  return results;
}
