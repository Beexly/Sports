// Fixture: aliased named import; the call must map back to callClaude.
import { callClaude as invoke } from "@/lib/claude-api/provider-dispatch";

export const runAliasedCall = async (apiKey: string): Promise<string> => {
  const result = await invoke({ apiKey, system: "s", user: "u", maxTokens: 64 });
  return result.text;
};
