// Fixture: dynamic import of the dispatch module + namespace-access call.
export async function lazyCall(apiKey: string): Promise<string> {
  const dispatch = await import("@/lib/claude-api/provider-dispatch");
  const result = await dispatch.callClaude({ apiKey, system: "s", user: "u", maxTokens: 64 });
  return result.text;
}
