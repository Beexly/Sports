import { NextResponse } from "next/server";
import { computeDynamicCompositeBenchmarkScore } from "@/lib/jarvis/stealth-skeleton-brain";
import { STEALTH_SKELETON_MODELS_V2_4 } from "../../../../../../../workers/stealth-skeleton-provider/src/index";

export const dynamic = "force-dynamic";

const OPENROUTER_PROVIDER_API_KEY_HEADER = "x-openrouter-provider-api-key";
const DYNAMIC_COMPOSITE_SCORE = computeDynamicCompositeBenchmarkScore().formattedScore;

function verifyApiKey(req: Request): boolean {
  const configuredKey = process.env["OPENROUTER_PROVIDER_API_KEY"];
  if (!configuredKey) return true;
  const authHeader = req.headers.get("authorization") ?? "";
  const customHeader = req.headers.get(OPENROUTER_PROVIDER_API_KEY_HEADER) ?? "";
  return authHeader === `Bearer ${configuredKey}` || customHeader === configuredKey;
}

export const STEALTH_SKELETON_OPENROUTER_MODELS = [
  {
    id: "gse/skeleton-stealth",
    canonical_slug: "gse/skeleton-stealth-20261106",
    hugging_face_id: null,
    name: "Skeleton Alpha (Stealth Frontier Reasoning)",
    created: 1762466400,
    description:
      "Skeleton Alpha is a frontier hybrid-reasoning model with a 256K-token context window, post-trained for autonomous agent workflows, strict tool calling, quantitative reasoning, and calibrated decision-making. It deliberates internally before answering and supports configurable reasoning effort, native JSON schema structured outputs, and multi-step tool execution.\n\nSkeleton Alpha is available in preview with Zero Data Retention enabled by default. Prompts and completions are processed exclusively in volatile memory and are never retained or used for model training; stealth preview usage is also compatible with the OpenRouter Stealth Model Terms (https://openrouter.ai/terms/stealth).",
    context_length: 262144,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.0000003",
      completion: "0.0000012",
      input_cache_read: "0.00000006",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 262144,
      max_completion_tokens: 32768,
      is_moderated: false,
    },
    supported_parameters: [
      "temperature",
      "top_p",
      "max_tokens",
      "stream",
      "tools",
      "tool_choice",
      "response_format",
      "structured_outputs",
      "reasoning",
      "include_reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: DYNAMIC_COMPOSITE_SCORE,
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-flash",
    canonical_slug: "gse/skeleton-flash-20261106",
    hugging_face_id: null,
    name: "Skeleton Flash (High-Throughput Agentic & Coding)",
    created: 1762466400,
    description:
      "Skeleton Flash is a lightweight, high-throughput reasoning model with a 256K-token context window built for scalable coding, agentic sub-tasks, tool use, and long-document analysis in high-volume production workloads. Developers can pair it with frontier reasoning models to execute bounded tool-calling steps, structured data extraction, and tree-based retrieval with minimal latency.\n\nZero Data Retention is enabled by default. Prompts and outputs are never stored or used for training.",
    context_length: 262144,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.00000008",
      completion: "0.00000025",
      input_cache_read: "0.00000002",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 262144,
      max_completion_tokens: 16384,
      is_moderated: false,
    },
    supported_parameters: [
      "temperature",
      "top_p",
      "max_tokens",
      "stream",
      "tools",
      "tool_choice",
      "response_format",
      "structured_outputs",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: DYNAMIC_COMPOSITE_SCORE,
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-math-pro",
    canonical_slug: "gse/skeleton-math-pro-20261106",
    hugging_face_id: null,
    name: "Skeleton Math-Pro (STEM, Theorem Proving & Code Verification)",
    created: 1762466400,
    description:
      "Skeleton Math-Pro is a specialized reasoning model post-trained on formal mathematics, scientific computing, algorithmic coding, and constraint satisfaction. It reasons step-by-step before answering and verifies intermediate symbolic and numerical expressions during generation, achieving 95.0/100 on GSM8K, 85.0/100 on MATH-500, and 90.2/100 on HumanEval+.\n\nZero Data Retention is enabled by default. Prompts and completions are never retained or used for training.",
    context_length: 262144,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.0000004",
      completion: "0.0000014",
      input_cache_read: "0.00000008",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 262144,
      max_completion_tokens: 32768,
      is_moderated: false,
    },
    supported_parameters: [
      "temperature",
      "top_p",
      "max_tokens",
      "stream",
      "tools",
      "tool_choice",
      "response_format",
      "structured_outputs",
      "reasoning",
      "include_reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: DYNAMIC_COMPOSITE_SCORE,
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-forecast",
    canonical_slug: "gse/skeleton-forecast-20261106",
    hugging_face_id: null,
    name: "Skeleton Forecast (Calibrated Probabilistic & Quantitative Analysis)",
    created: 1762466400,
    description:
      "Skeleton Forecast is a quantitative reasoning model designed for calibrated probabilistic forecasting, risk analysis, time-series synthesis, and decision support under uncertainty. Evaluated across 403 ForecastBench market and dataset resolutions, it achieves a 0.1095 Brier score (88.2/100 normalized calibration) while supporting strict JSON schema outputs and tool use.\n\nZero Data Retention is enabled by default. Prompts and completions are never retained or used for training.",
    context_length: 262144,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.00000035",
      completion: "0.0000012",
      input_cache_read: "0.00000007",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 262144,
      max_completion_tokens: 32768,
      is_moderated: false,
    },
    supported_parameters: [
      "temperature",
      "top_p",
      "max_tokens",
      "stream",
      "tools",
      "tool_choice",
      "response_format",
      "structured_outputs",
      "reasoning",
      "include_reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: DYNAMIC_COMPOSITE_SCORE,
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-council",
    canonical_slug: "gse/skeleton-council-20261106",
    hugging_face_id: null,
    name: "Skeleton Multi-Agent (Collaborative Research & Synthesis)",
    created: 1762466400,
    description:
      "Skeleton Multi-Agent is a collaborative reasoning system in which multiple specialized sub-agents operate in parallel to conduct deep research, cross-examine assumptions, coordinate tool calls, and synthesize verified outputs across complex long-horizon tasks.\n\nReasoning effort behavior:\n- low / medium: 4 parallel specialist agents\n- high: 8 parallel specialist agents with adversarial verification\n\nZero Data Retention is enabled by default.",
    context_length: 262144,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.0000005",
      completion: "0.0000015",
      input_cache_read: "0.0000001",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 262144,
      max_completion_tokens: 32768,
      is_moderated: false,
    },
    supported_parameters: [
      "temperature",
      "top_p",
      "max_tokens",
      "stream",
      "tools",
      "tool_choice",
      "response_format",
      "structured_outputs",
      "reasoning",
      "include_reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: DYNAMIC_COMPOSITE_SCORE,
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-embed-v2",
    canonical_slug: "gse/skeleton-embed-v2-20261106",
    hugging_face_id: null,
    name: "Skeleton Embed v2 (32K Long-Context Dense & Sparse Embeddings)",
    created: 1762466400,
    description:
      "A high-precision 32K-context embedding model optimized for technical documentation, source code repositories, mathematical proofs, and multi-hop retrieval pipelines. Zero Data Retention is enabled by default.",
    context_length: 32768,
    architecture: {
      modality: "text->embeddings",
      input_modalities: ["text"],
      output_modalities: ["embeddings"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "none",
    },
    pricing: {
      prompt: "0.00000004",
      completion: "0",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 32768,
      max_completion_tokens: 0,
      is_moderated: false,
    },
    supported_parameters: ["encoding_format", "dimensions"],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
    },
  },
  {
    id: "gse/skeleton-rerank-v2",
    canonical_slug: "gse/skeleton-rerank-v2-20261106",
    hugging_face_id: null,
    name: "Skeleton Rerank v2 (Hierarchical Document-Tree & Cross-Encoder Reranker)",
    created: 1762466400,
    description:
      "A reasoning-aware cross-encoder reranker with a 32K-token context window built for agentic RAG, code search, and hierarchical document-tree navigation. Zero Data Retention is enabled by default.",
    context_length: 32768,
    architecture: {
      modality: "text->rerank",
      input_modalities: ["text"],
      output_modalities: ["rerank"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "none",
    },
    pricing: {
      prompt: "0.00000006",
      completion: "0",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 32768,
      max_completion_tokens: 0,
      is_moderated: false,
    },
    supported_parameters: ["top_n", "return_documents"],
    provider_metadata: {
      provider_slug: "stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
    },
  },
] as const;

export async function GET(req: Request): Promise<NextResponse> {
  if (!verifyApiKey(req)) {
    return NextResponse.json(
      { error: { message: "Invalid OpenRouter provider API key", code: 401 } },
      { status: 401 },
    );
  }
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "legacy") {
    return NextResponse.json(
      {
        object: "list",
        data: STEALTH_SKELETON_OPENROUTER_MODELS,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
          "Access-Control-Allow-Origin": "*",
          "X-GSE-Provider-Version": "2.4.0",
          "X-GSE-Zero-Data-Retention": "enforced",
        },
      },
    );
  }
  return NextResponse.json(
    {
      data: STEALTH_SKELETON_MODELS_V2_4,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
        "X-GSE-Provider-Version": "2.4.0",
        "X-GSE-Zero-Data-Retention": "enforced",
      },
    },
  );
}
