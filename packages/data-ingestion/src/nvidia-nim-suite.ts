/**
 * nvidia-nim-suite.ts — NVIDIA Serverless NIM Suite ($0 / 40 RPM).
 *
 * Verified live `/v1/models` inventory on NVIDIA_GSE_API_KEY:
 * - Multimodal / Parse fallback: nvidia/nemotron-3.5-super-vl-120b-a12b
 * - Fast structured reasoning:   nvidia/nemotron-3.5-lightning-30b-a3b
 * - Vector embeddings:           nvidia/nemotron-3.5-embed-8b
 * - Calibration / Ising:         nvidia/ising-calibration-1.5-31b
 * - Frontier ultra:              nvidia/nemotron-3-ultra-550b-a55b
 * - Compact fast alternates:     google/gemma-4-31b-it, z-ai/glm-5.3-flash
 *
 * Aliases map requested un-listed slugs (`nvidia/nemotron-3.5-parse`,
 * `deepseek-ai/deepseek-v4.1-flash`) onto verified live NIM models and enforce
 * the 40 RPM serverless rate ceiling via a sliding-window limiter.
 */

export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NIM_SERVERLESS_RPM_LIMIT = 40;

export const NIM_VERIFIED_MODELS = {
  multimodalParse: "nvidia/nemotron-3.5-super-vl-120b-a12b",
  fastLightning: "nvidia/nemotron-3.5-lightning-30b-a3b",
  embed8b: "nvidia/nemotron-3.5-embed-8b",
  isingCalibration: "nvidia/ising-calibration-1.5-31b",
  ultra550b: "nvidia/nemotron-3-ultra-550b-a55b",
  gemma4It: "google/gemma-4-31b-it",
  glm53Flash: "z-ai/glm-5.3-flash",
} as const;

export const NIM_MODEL_ALIASES: Readonly<Record<string, string>> = {
  "nvidia/nemotron-3.5-parse": NIM_VERIFIED_MODELS.multimodalParse,
  "deepseek-ai/deepseek-v4.1-flash": NIM_VERIFIED_MODELS.fastLightning,
};

export function resolveNimModelSlug(requested: string): string {
  const trimmed = requested.trim();
  return NIM_MODEL_ALIASES[trimmed] ?? trimmed;
}

export class SlidingWindowRpmLimiter {
  private readonly timestamps: number[] = [];
  constructor(
    private readonly maxRequestsPerMinute: number = NIM_SERVERLESS_RPM_LIMIT,
    private readonly nowFn: () => number = () => Date.now(),
  ) {}

  reserveDelayMs(now: number = this.nowFn()): number {
    const windowStart = now - 60_000;
    while (this.timestamps.length > 0 && this.timestamps[0] <= windowStart) {
      this.timestamps.shift();
    }
    if (this.timestamps.length < this.maxRequestsPerMinute) {
      this.timestamps.push(now);
      return 0;
    }
    return Math.max(1, this.timestamps[0] + 60_000 - now);
  }

  async waitTurn(): Promise<void> {
    const delay = this.reserveDelayMs();
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
      this.timestamps.push(this.nowFn());
    }
  }
}

export interface NimChatOptions {
  readonly model?: string;
  readonly system?: string;
  readonly user: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly env?: Record<string, string | undefined>;
  readonly fetchImpl?: typeof fetch;
  readonly limiter?: SlidingWindowRpmLimiter;
}

export interface NimChatResult {
  readonly requestedModel: string;
  readonly resolvedModel: string;
  readonly text: string;
  readonly latencyMs: number;
  readonly usage: { prompt_tokens?: number; completion_tokens?: number } | null;
}

export interface NimEmbedOptions {
  readonly input: string | readonly string[];
  readonly model?: string;
  readonly inputType?: "query" | "passage";
  readonly env?: Record<string, string | undefined>;
  readonly fetchImpl?: typeof fetch;
  readonly limiter?: SlidingWindowRpmLimiter;
}

const sharedNimLimiter = new SlidingWindowRpmLimiter(NIM_SERVERLESS_RPM_LIMIT);

function resolveNimKey(env: Record<string, string | undefined>): string {
  const key = (env["NVIDIA_GSE_API_KEY"] ?? env["NVIDIA_API_KEY"] ?? "").trim();
  if (!key) {
    throw new Error("NVIDIA_GSE_API_KEY (or NVIDIA_API_KEY) is required for NVIDIA NIM calls.");
  }
  return key;
}

export async function callNimChat(options: NimChatOptions): Promise<NimChatResult> {
  const env = options.env ?? process.env;
  const apiKey = resolveNimKey(env);
  const requestedModel = options.model ?? NIM_VERIFIED_MODELS.fastLightning;
  const resolvedModel = resolveNimModelSlug(requestedModel);
  const fetchImpl = options.fetchImpl ?? fetch;
  const limiter = options.limiter ?? sharedNimLimiter;
  await limiter.waitTurn();

  const messages = [
    ...(options.system ? [{ role: "system", content: options.system }] : []),
    { role: "user", content: options.user },
  ];
  const startedAt = Date.now();
  const res = await fetchImpl(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.2,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const latencyMs = Date.now() - startedAt;
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`NIM chat HTTP ${res.status} (${resolvedModel}): ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null; reasoning_content?: string | null } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const msg = data.choices?.[0]?.message;
  const text = (msg?.content ?? msg?.reasoning_content ?? "").trim();
  if (!text) {
    throw new Error(`NIM chat returned empty text for ${resolvedModel}.`);
  }
  return {
    requestedModel,
    resolvedModel,
    text,
    latencyMs,
    usage: data.usage ?? null,
  };
}

export async function callNimEmbed(options: NimEmbedOptions): Promise<{
  readonly model: string;
  readonly embeddings: readonly number[][];
  readonly latencyMs: number;
}> {
  const env = options.env ?? process.env;
  const apiKey = resolveNimKey(env);
  const model = resolveNimModelSlug(options.model ?? NIM_VERIFIED_MODELS.embed8b);
  const fetchImpl = options.fetchImpl ?? fetch;
  const limiter = options.limiter ?? sharedNimLimiter;
  await limiter.waitTurn();

  const inputs = Array.isArray(options.input) ? [...options.input] : [options.input];
  const startedAt = Date.now();
  const res = await fetchImpl(`${NIM_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: inputs,
      encoding_format: "float",
      ...(options.inputType ? { input_type: options.inputType } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const latencyMs = Date.now() - startedAt;
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`NIM embed HTTP ${res.status} (${model}): ${errText.slice(0, 200)}`);
  }
  const payload = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embeddings = (payload.data ?? [])
    .map((d) => d.embedding)
    .filter((vec): vec is number[] => Array.isArray(vec));
  return { model, embeddings, latencyMs };
}
