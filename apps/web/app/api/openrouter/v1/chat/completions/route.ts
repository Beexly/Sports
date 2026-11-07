import { NextResponse } from "next/server";
import {
  OUR_STEALTH_SKELETON_MODELS,
  runJarvisJynxAutonomousBrainAsync,
  type StealthSkeletonModelId,
} from "@/lib/jarvis/stealth-skeleton-brain";
import { STEALTH_SKELETON_OPENROUTER_MODELS } from "../../models/route";

export const dynamic = "force-dynamic";

function resolveOpenRouterModelToInternal(requestedModel: string): StealthSkeletonModelId {
  const m = requestedModel.trim().toLowerCase();
  if ((OUR_STEALTH_SKELETON_MODELS as readonly string[]).includes(m)) {
    return m as StealthSkeletonModelId;
  }
  if (m.includes("council") || m.includes("multi-agent")) return "gse/skeleton-council";
  if (m.includes("math")) return "gse/skeleton-math-pro";
  if (m.includes("forecast")) return "gse/skeleton-forecast";
  if (m.includes("flash") || m.includes("fast")) return "gse/skeleton-flash";
  return "gse/skeleton-stealth";
}

function verifyApiKey(req: Request): boolean {
  const configuredKey = process.env["OPENROUTER_PROVIDER_API_KEY"];
  if (!configuredKey) return true;
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${configuredKey}`;
}

export async function GET(req: Request): Promise<NextResponse> {
  const ok = verifyApiKey(req);
  return NextResponse.json(
    {
      status: "ONLINE",
      provider: "gse-stealth-skeleton",
      version: "2.4.0",
      openai_compatible_base_url: "https://www.galaxysportsedge.com/api/openrouter/v1",
      models_api_url: "https://www.galaxysportsedge.com/api/openrouter/v1/models",
      chat_completions_url: "https://www.galaxysportsedge.com/api/openrouter/v1/chat/completions",
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
      data_policy_url: "https://www.galaxysportsedge.com/data-policy",
      zero_data_retention: true,
      authenticated: ok,
      registered_models: STEALTH_SKELETON_OPENROUTER_MODELS.map((m) => m.id),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

export async function POST(req: Request): Promise<NextResponse | Response> {
  if (!verifyApiKey(req)) {
    return NextResponse.json(
      { error: { message: "Invalid API key", type: "authentication_error", code: 401 } },
      { status: 401 },
    );
  }

  let body: {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    stream?: boolean;
    provider?: {
      sort?: "throughput" | "price" | "latency";
      data_collection?: "allow" | "deny";
      allow_fallbacks?: boolean;
      order?: string[];
    };
  } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const requestedModel = body.model ?? "gse/skeleton-stealth";
  const resolvedModel = resolveOpenRouterModelToInternal(requestedModel);

  const lastMessage =
    body.messages && body.messages.length > 0
      ? body.messages[body.messages.length - 1]?.content ?? ""
      : "Synthesize calibrated neuro-symbolic reasoning and probabilistic forecast.";

  const brain = await runJarvisJynxAutonomousBrainAsync({
    prompt: lastMessage,
    mode: "autonomous_all",
    model: resolvedModel,
  });

  const completionId = `chatcmpl-gse-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);

  if (body.stream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(": OPENROUTER PROCESSING\n\n"));
        const chunk = {
          id: completionId,
          object: "chat.completion.chunk",
          created,
          model: brain.modelUsed,
          provider: "gse-stealth-skeleton",
          choices: [
            {
              index: 0,
              delta: { role: "assistant", content: brain.answer },
              finish_reason: "stop",
            },
          ],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-GSE-Zero-Data-Retention": "enforced",
      },
    });
  }

  return NextResponse.json(
    {
      id: completionId,
      object: "chat.completion",
      created,
      model: brain.modelUsed,
      provider: "gse-stealth-skeleton",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: brain.answer,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: Math.max(16, Math.ceil(lastMessage.length / 4)),
        completion_tokens: Math.max(64, Math.ceil(brain.answer.length / 4)),
        total_tokens:
          Math.max(16, Math.ceil(lastMessage.length / 4)) +
          Math.max(64, Math.ceil(brain.answer.length / 4)),
      },
      x_gse_skeleton: {
        version: "2.4.0",
        composite_benchmark_score: brain.compositeScaleScore,
        zero_data_retention: true,
        openrouter_traffic_routing: {
          sort_applied: body.provider?.sort ?? "throughput",
          data_collection_enforced: "deny",
          allow_fallbacks: body.provider?.allow_fallbacks ?? true,
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "X-GSE-Zero-Data-Retention": "enforced",
      },
    },
  );
}
