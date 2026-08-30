// Fixture: internal-LLM tier call site (non-user-facing lane).
import { callInternalLlm } from "@/lib/claude-api/internal-llm";

export async function normalizeRecord(payload: string): Promise<string> {
  const result = await callInternalLlm({ system: "s", user: payload, maxTokens: 128 });
  return result.text;
}
