// Fixture: zod present in file => validation heuristic records "present".
import { z } from "zod";
import { callClaude } from "@/lib/claude-api/provider-dispatch";

const OutputSchema = z.object({ text: z.string() });

export async function validatedInternalCall(apiKey: string): Promise<string> {
  const result = await callClaude({ apiKey, system: "s", user: "u", maxTokens: 64 });
  return OutputSchema.parse({ text: result.text }).text;
}
