// Fixture: control-plane executor usage (executeAiTask) must be inventoried
// so the scanner keeps working after the control-plane migration.
import { executeAiTask } from "@/lib/ai-control-plane";

export async function runGovernedTask(taskId: string): Promise<unknown> {
  return executeAiTask({ taskId });
}
