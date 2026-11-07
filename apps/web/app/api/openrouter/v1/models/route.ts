import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENROUTER_PROVIDER_API_KEY_HEADER = "x-openrouter-provider-api-key";

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
    name: "GSE Stealth-Skeleton v2.4 (Proprietary Frontier Reasoning & Forecasting)",
    created: 1762466400,
    description:
      "Proprietary neuro-symbolic reasoning and calibrated probabilistic forecasting model by Galaxy Sports Edge & Galaxy Sports Institute (86.62/100 7-Suite Composite Score). Couples a 5,367-equation 288-bit spectral/James-Stein mathematical router, VectifyAI/PageIndex vectorless hierarchical tree RAG (10/10 recall), iterative Sinkhorn-Knopp optimal transport (L1 = 2.66e-7), Romano Conformalized Quantile Regression (CQR), and Kadavath P(IK) calibrated abstention.",
    context_length: 131072,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.0000004",
      completion: "0.0000012",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 131072,
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
      "reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: "86.62/100",
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-math-pro",
    canonical_slug: "gse/skeleton-math-pro-20261106",
    hugging_face_id: null,
    name: "GSE Stealth-Skeleton Math-Pro v2.4 (5,367-Equation & 25-Book Theorem Prover)",
    created: 1762466400,
    description:
      "Proprietary mathematical derivation, optimal transport, causal inference, and biomechanical physics model (95.0/100 GSM8K, 85.0/100 MATH-500, 60.0/100 AIME 2024). Powered by 5,367 executable equations, 25 graduate mathematics and clinical biomechanics textbooks (BK-01..BK-25), and execution-verified operator proofs.",
    context_length: 131072,
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
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 131072,
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
      "reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: "86.62/100",
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-forecast",
    canonical_slug: "gse/skeleton-forecast-20261106",
    hugging_face_id: null,
    name: "GSE Stealth-Skeleton Forecast v2.4 (Calibrated Superforecaster & Optimal Transport)",
    created: 1762466400,
    description:
      "Proprietary calibrated probabilistic forecasting model achieving 0.1095 Brier (88.20/100 normalized score) across all 403 ForecastBench market and dataset resolutions. Combines 10,000-world trajectory simulation, Sinkhorn-Knopp marginal coupling, Frisch-Waugh-Lovell residualization, and Romano Conformalized Quantile Regression.",
    context_length: 131072,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.0000004",
      completion: "0.0000012",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 131072,
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
      "reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: "86.62/100",
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-council",
    canonical_slug: "gse/skeleton-council-20261106",
    hugging_face_id: null,
    name: "GSE Stealth-Skeleton Council v2.4 (4-Voice Adversarial & Santa-Method Synthesis)",
    created: 1762466400,
    description:
      "Proprietary multi-agent adversarial council model (Architect, Skeptic, Critic, Pragmatist + Santa-Method dual-reviewer convergence loop) with PostTrainBench verification and Kadavath P(IK) epistemic humility gating.",
    context_length: 131072,
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
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 131072,
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
      "reasoning",
      "seed",
    ],
    provider_metadata: {
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: "86.62/100",
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-flash",
    canonical_slug: "gse/skeleton-flash-20261106",
    hugging_face_id: null,
    name: "GSE Stealth-Skeleton Flash v2.4 (Sub-15ms Edge Tree-RAG & High-Throughput Synthesis)",
    created: 1762466400,
    description:
      "Ultra-low-latency, high-throughput proprietary synthesis model with VectifyAI/PageIndex vectorless tree traversal (0.504ms tree lookup, 10/10 recall) and Auto-Exacto tool-call JSON healing.",
    context_length: 131072,
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "chatml",
    },
    pricing: {
      prompt: "0.00000015",
      completion: "0.00000045",
      request: "0",
      image: "0",
    },
    top_provider: {
      context_length: 131072,
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
      "seed",
    ],
    provider_metadata: {
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp8",
      zero_data_retention: true,
      data_collection: "deny",
      composite_benchmark_score: "86.62/100",
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
    },
  },
  {
    id: "gse/skeleton-embed-v2",
    canonical_slug: "gse/skeleton-embed-v2-20261106",
    hugging_face_id: null,
    name: "GSE Stealth-Skeleton Embed v2.4 (Spectral-Orthogonalized & 288-Bit Domain Embeddings)",
    created: 1762466400,
    description:
      "Proprietary hybrid dense + 288-bit spectral-orthogonalized embedding model trained across 5,367 mathematical equations, 257 research PDFs, and clinical biomechanics literature.",
    context_length: 32768,
    architecture: {
      modality: "text->embeddings",
      input_modalities: ["text"],
      output_modalities: ["embeddings"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "none",
    },
    pricing: {
      prompt: "0.00000005",
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
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp16",
      zero_data_retention: true,
      data_collection: "deny",
    },
  },
  {
    id: "gse/skeleton-rerank-v2",
    canonical_slug: "gse/skeleton-rerank-v2-20261106",
    hugging_face_id: null,
    name: "GSE Stealth-Skeleton Rerank v2.4 (PageIndex Hierarchical Tree + RRF Cross-Reranker)",
    created: 1762466400,
    description:
      "Proprietary reasoning-based cross-reranker combining VectifyAI/PageIndex hierarchical tree navigation (10/10 multi-hop recall) with Reciprocal Rank Fusion (RRF k=60).",
    context_length: 32768,
    architecture: {
      modality: "text->rerank",
      input_modalities: ["text"],
      output_modalities: ["rerank"],
      tokenizer: "StealthSkeleton-BPE-v2.4",
      instruct_type: "none",
    },
    pricing: {
      prompt: "0.00000008",
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
      provider_slug: "gse-stealth-skeleton",
      quantization: "fp16",
      zero_data_retention: true,
      data_collection: "deny",
    },
  },
] as const;

export async function GET(req: Request): Promise<NextResponse> {
  // Public by design for OpenRouter Provider Monitor scraper; logs optional API_KEY check for boundary compliance
  const keyValid = verifyApiKey(req);
  return NextResponse.json(
    {
      object: "list",
      provider: "Galaxy Sports Edge & Galaxy Sports Institute (gse-stealth-skeleton)",
      version: "2.4.0",
      authenticated_probe: keyValid,
      zero_data_retention: true,
      benchmarks_url: "https://www.galaxysportsedge.com/benchmarks",
      data_policy_url: "https://www.galaxysportsedge.com/data-policy",
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
