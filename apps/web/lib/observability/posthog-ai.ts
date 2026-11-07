import { randomUUID } from "node:crypto";

export interface AiGenerationCapture {
  readonly provider: string;
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly output: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly maxTokens: number;
  readonly temperature?: number;
}

export async function captureAiGeneration(generation: AiGenerationCapture): Promise<void> {
  const projectToken =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!projectToken) return;

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const traceId = randomUUID();

  try {
    await fetch(`${host.replace(/\/$/, "")}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: projectToken,
        distinct_id: traceId,
        event: "$ai_generation",
        properties: {
          $ai_trace_id: traceId,
          $ai_session_id: null,
          $ai_model: generation.model,
          $ai_provider: generation.provider,
          $ai_input: [
            { role: "system", content: generation.system },
            { role: "user", content: generation.user },
          ],
          $ai_input_tokens: generation.inputTokens,
          $ai_output_choices: [{ role: "assistant", content: generation.output }],
          $ai_output_tokens: generation.outputTokens,
          $ai_latency: generation.latencyMs / 1000,
          $ai_max_tokens: generation.maxTokens,
          ...(generation.temperature !== undefined
            ? { $ai_temperature: generation.temperature }
            : {}),
        },
      }),
    });
  } catch {
    // AI observability must not make an otherwise successful model response fail.
  }
}
