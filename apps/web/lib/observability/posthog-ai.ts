import { randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";

interface AiGenerationCapture {
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

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!projectToken) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    client = null;
    return client;
  }

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!host) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
      );
    }
    client = null;
    return client;
  }

  client = new PostHog(projectToken, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
    privacyMode: false,
  });
  return client;
}

export async function captureAiGeneration(generation: AiGenerationCapture): Promise<void> {
  const posthog = getClient();
  if (!posthog) return;

  const traceId = randomUUID();
  try {
    posthog.capture({
      distinctId: traceId,
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
        ...(generation.temperature !== undefined ? { $ai_temperature: generation.temperature } : {}),
      },
    });
    await posthog.flush();
  } catch {
    // AI observability must not make an otherwise successful model response fail.
  }
}
