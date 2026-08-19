/**
 * MODEL_CATALOG — data mirror of docs/reference/MODEL_LANDSCAPE.md §A/§B.
 *
 * Rules (enforced by recommend.test.ts):
 *   - Only "verified" (checked on Hugging Face / npm this session) or
 *     "known-real" (established pre-cutoff) entries. The ⚠️ unverified models
 *     from the DeepSeek thread are intentionally EXCLUDED — the recommender
 *     must never return a model whose existence we could not confirm.
 *   - reported* pricing is third-party-reported, never provider-confirmed.
 */
import type { ModelEntry } from "./types";

export const MODEL_CATALOG: readonly ModelEntry[] = [
  // ---------------------------------------------------------------- local ---
  {
    id: "muse-glimmer-30b",
    label: "Muse Glimmer 30B",
    provider: "Meta",
    hfRepo: "meta-models/Muse-Glimmer-30B",
    license: "Apache-2.0",
    verification: "verified",
    localRunnable: true,
    roles: ["local-primary", "multimodal"],
    contextTokens: 128_000,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes:
      "Dense ~29.6B + vision encoder; agentic/coding/multimodal. Official GGUF " +
      "(meta-models/Muse-Glimmer-30B-GGUF). Pull the tag from " +
      "dev.meta.ai/docs/muse-glimmer — NOT the fabricated ':30b-mlx' tag.",
  },
  {
    id: "qwen3-coder-30b-a3b",
    label: "Qwen3-Coder-30B-A3B-Instruct",
    provider: "Alibaba",
    hfRepo: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
    license: "Apache-2.0",
    verification: "verified",
    localRunnable: true,
    roles: ["local-coder"],
    contextTokens: null,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes: "MoE 30B total / 3B active — best practical local coder on modest hardware.",
  },
  {
    id: "nemotron-3-5-lightning",
    label: "NVIDIA Nemotron 3.5 Lightning 30B-A3B",
    provider: "NVIDIA",
    hfRepo: "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16",
    license: "NVIDIA Open Model License (license:other — read terms before commercial use)",
    verification: "verified",
    localRunnable: true,
    roles: ["agentic-executor", "local-coder"],
    contextTokens: null,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes:
      "Released 2026-08-11/12. MoE 30B total / 3B active — single consumer GPU. Built for " +
      "high-volume execution steps inside agent loops (larger models plan, this executes). " +
      "GGUF from unsloth/ggml-org/bartowski; also on OpenRouter + build.nvidia.com. " +
      "License is 'other', not Apache — verify terms for commercial use.",
  },
  {
    id: "qwen25-coder-32b",
    label: "Qwen2.5-Coder-32B-Instruct",
    provider: "Alibaba",
    hfRepo: "Qwen/Qwen2.5-Coder-32B-Instruct",
    license: "Apache-2.0",
    verification: "known-real",
    localRunnable: true,
    roles: ["local-coder"],
    contextTokens: 128_000,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes: "Reliable dense local coder; heavier than the A3B MoE.",
  },
  {
    id: "qwen25-coder-7b",
    label: "Qwen2.5-Coder-7B-Instruct",
    provider: "Alibaba",
    hfRepo: "Qwen/Qwen2.5-Coder-7B-Instruct",
    license: "Apache-2.0",
    verification: "known-real",
    localRunnable: true,
    roles: ["local-coder"],
    contextTokens: 128_000,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes: "Fast small coder for trivial edits/completions.",
  },
  {
    id: "deepseek-coder-v2",
    label: "DeepSeek-Coder-V2",
    provider: "DeepSeek",
    hfRepo: "deepseek-ai/DeepSeek-Coder-V2-Instruct",
    license: "DeepSeek license (permissive w/ use policy)",
    verification: "known-real",
    localRunnable: true,
    roles: ["local-coder", "reasoning"],
    contextTokens: 128_000,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes: "Strong MoE coder; also served cheaply via API providers.",
  },
  {
    id: "glm-5-2",
    label: "GLM-5.2",
    provider: "Z.ai (Zhipu)",
    hfRepo: "zai-org/GLM-5.2",
    license: "MIT",
    verification: "verified",
    localRunnable: true,
    roles: ["reasoning"],
    contextTokens: null,
    reportedInputUsdPerM: null,
    reportedOutputUsdPerM: null,
    notes:
      "Large MoE (GGUF/FP8 published) — technically local-runnable but realistically " +
      "an API/OpenRouter model unless you have serious VRAM.",
  },
  // ------------------------------------------------------------- frontier ---
  {
    id: "claude-fable-5",
    label: "Claude Fable 5",
    provider: "Anthropic",
    hfRepo: null,
    license: "proprietary",
    verification: "known-real",
    localRunnable: false,
    roles: ["frontier", "long-context", "multimodal"],
    contextTokens: 1_000_000,
    reportedInputUsdPerM: 10,
    reportedOutputUsdPerM: 50,
    notes: "Flagship ceiling; reserve for the hardest work. Cache reads ~10% of input.",
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "Anthropic",
    hfRepo: null,
    license: "proprietary",
    verification: "known-real",
    localRunnable: false,
    roles: ["frontier", "long-context", "multimodal"],
    contextTokens: 1_000_000,
    reportedInputUsdPerM: 5,
    reportedOutputUsdPerM: 25,
    notes: "Top-tier general/coding at half Fable's reported price.",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "Anthropic",
    hfRepo: null,
    license: "proprietary",
    verification: "known-real",
    localRunnable: false,
    roles: ["frontier", "cheap-frontier", "long-context"],
    contextTokens: 1_000_000,
    reportedInputUsdPerM: 3,
    reportedOutputUsdPerM: 15,
    notes: "Cost/quality workhorse; default hosted tier for tool-use tasks.",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "Anthropic",
    hfRepo: null,
    license: "proprietary",
    verification: "known-real",
    localRunnable: false,
    roles: ["cheap-frontier"],
    contextTokens: null,
    reportedInputUsdPerM: 1,
    reportedOutputUsdPerM: 5,
    notes: "Cheapest Claude; pair with the Batch API (−50%) for bulk jobs.",
  },
] as const;

export function findModel(id: string): ModelEntry {
  const entry = MODEL_CATALOG.find((m) => m.id === id);
  if (!entry) throw new Error(`model-advisor: unknown catalog id "${id}"`);
  return entry;
}
