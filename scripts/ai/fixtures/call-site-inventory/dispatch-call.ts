// Fixture: canonical dispatch call with a static surface literal.
// Analyzed by the test under a SIMULATED repo path (analyzeFile takes relPath).
import { callClaude } from "@/lib/claude-api/provider-dispatch";

export async function draftJournalEntry(apiKey: string, user: string): Promise<string> {
  const result = await callClaude({
    apiKey,
    system: "system prompt",
    user,
    maxTokens: 512,
    surface: "journal",
  });
  return result.text;
}
