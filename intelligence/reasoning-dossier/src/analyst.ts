// Analyst client abstraction. The dossier generator depends on this
// interface only, so tests run against a mock and no test ever calls a model.
//
// The live implementation for repo-side use is NousPortalAnalystClient: it
// posts to the same OpenAI-compatible endpoint the fleet's Nous connector
// wraps (inference-api.nousresearch.com/v1). The API key is read from the
// environment (NOUS_API_KEY) at call time and never stored in the repo or in
// any dossier. In Motif's own runs the call goes through the connector
// helper (custom.nous-portal/bin/nous-api), and run.ts --ingest accepts that
// helper's response envelope so the two paths produce identical dossiers.

import type { Usage } from "./types.ts";

export interface AnalystRequest {
  system: string;
  user: string;
}

export interface AnalystResponse {
  /** Raw model output text (expected: the sections JSON object). */
  text: string;
  model_id: string;
  usage: Usage | null;
}

export interface AnalystClient {
  complete(req: AnalystRequest): Promise<AnalystResponse>;
}

export class NousPortalAnalystClient implements AnalystClient {
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(model: string, baseUrl = "https://inference-api.nousresearch.com/v1") {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async complete(req: AnalystRequest): Promise<AnalystResponse> {
    const apiKey = process.env.NOUS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "NOUS_API_KEY is not set. The live analyst call needs the Nous Portal key in the environment; it is never read from the repo.",
      );
    }
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`Nous Portal chat call failed: HTTP ${res.status}`);
    const body = (await res.json()) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number };
    };
    const text = body.choices?.[0]?.message?.content;
    if (!text) throw new Error("Nous Portal chat call returned no message content");
    return {
      text,
      model_id: body.model ?? this.model,
      usage: body.usage
        ? {
            prompt_tokens: body.usage.prompt_tokens,
            completion_tokens: body.usage.completion_tokens,
            total_tokens: body.usage.total_tokens,
            cost_usd: body.usage.cost,
          }
        : null,
    };
  }
}
