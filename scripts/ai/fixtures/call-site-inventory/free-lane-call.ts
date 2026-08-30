// Fixture: free-lane dispatcher call site.
import { generateContentMessages } from "@/lib/claude-api/free-lane";

export async function draftBrief(apiKey: string): Promise<string> {
  const result = await generateContentMessages({
    apiKey,
    system: "s",
    user: "u",
    maxTokens: 256,
    surface: "brief",
  });
  return result.text;
}
