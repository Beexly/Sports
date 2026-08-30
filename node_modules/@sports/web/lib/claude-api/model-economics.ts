/**
 * Model economics — turns live model pricing (models.dev) into the numbers that make
 * the model-router's deliberate flips data-driven, and prices the internal-LLM tier.
 *
 * This does NOT change routing. It answers: "what does each surface cost at its ACTIVE
 * tier, what would it cost at its RECOMMENDED tier, and how much do we save by flipping
 * it (once validated via promptfoo)?" — so the one-line flip in `model-router` is an
 * informed decision, and the savings are auditable.
 *
 * Pricing source: models.dev `api.json` (open, machine-readable, ~145 providers). A
 * trimmed snapshot is vendored as the deterministic fallback; `fetchModelCosts()` can
 * refresh it live. Pure parser — fully testable against the snapshot.
 */

import { MODELS, ALL_SURFACES, SURFACE_RECOMMENDED, activeTierForSurface, type ModelTier, type ClaudeSurface } from "./model-router";
import snapshot from "@/__tests__/fixtures/models-dev-snapshot.json";

/** $/million tokens. cache_* are Anthropic prompt-cache prices when present. */
export type TokenCost = { input: number; output: number; cacheRead?: number; cacheWrite?: number };

type ModelsDevModel = { id: string; name?: string; cost?: { input?: number; output?: number; cache_read?: number; cache_write?: number } };
type ModelsDevCatalog = Record<string, { models?: Record<string, ModelsDevModel> }>;

/** Find a model id's cost anywhere in the catalog (ids can appear under multiple providers). */
export function costForModelId(catalog: ModelsDevCatalog, modelId: string): TokenCost | null {
  for (const provider of Object.values(catalog)) {
    const m = provider.models?.[modelId];
    if (m?.cost && typeof m.cost.input === "number" && typeof m.cost.output === "number") {
      return {
        input: m.cost.input,
        output: m.cost.output,
        ...(typeof m.cost.cache_read === "number" ? { cacheRead: m.cost.cache_read } : {}),
        ...(typeof m.cost.cache_write === "number" ? { cacheWrite: m.cost.cache_write } : {}),
      };
    }
  }
  return null;
}

/** Costs for the three Claude tiers we route between. Throws if a tier is unpriced. */
export function tierCosts(catalog: ModelsDevCatalog = snapshot as ModelsDevCatalog): Record<ModelTier, TokenCost> {
  const out = {} as Record<ModelTier, TokenCost>;
  for (const tier of Object.keys(MODELS) as ModelTier[]) {
    const cost = costForModelId(catalog, MODELS[tier]);
    if (!cost) throw new Error(`No models.dev price for tier ${tier} (${MODELS[tier]})`);
    out[tier] = cost;
  }
  return out;
}

/**
 * Blended $/Mtok for a tier at an assumed input:output ratio (default 3:1 — long
 * grounded prompts, shorter completions). Lets us compare tiers with one number.
 */
export function blendedCost(cost: TokenCost, inputShare = 0.75): number {
  return cost.input * inputShare + cost.output * (1 - inputShare);
}

export type SurfaceEconomics = {
  readonly surface: ClaudeSurface;
  readonly activeTier: ModelTier;
  readonly recommendedTier: ModelTier;
  readonly activeBlended: number;
  readonly recommendedBlended: number;
  /** Fraction saved by flipping active→recommended (0 when same tier; negative if upgrade). */
  readonly savingsFraction: number;
};

/** Per-surface cost picture: what flipping each surface to its validated tier saves. */
export function surfaceEconomics(catalog: ModelsDevCatalog = snapshot as ModelsDevCatalog, inputShare = 0.75): SurfaceEconomics[] {
  const costs = tierCosts(catalog);
  return ALL_SURFACES.map((surface) => {
    const activeTier = activeTierForSurface(surface);
    const recommendedTier = SURFACE_RECOMMENDED[surface];
    const activeBlended = blendedCost(costs[activeTier], inputShare);
    const recommendedBlended = blendedCost(costs[recommendedTier], inputShare);
    return {
      surface,
      activeTier,
      recommendedTier,
      activeBlended,
      recommendedBlended,
      savingsFraction: activeBlended === 0 ? 0 : (activeBlended - recommendedBlended) / activeBlended,
    };
  });
}

/**
 * Savings from moving an internal/non-user-facing workload off Claude (Sonnet) onto an
 * OpenAI-compatible internal model priced in the catalog (e.g. Groq Llama-3.x). Returns
 * the fraction saved on blended cost; null if the internal model isn't priced.
 * (Groq also has a free tier — so real savings can be 100% within its limits.)
 */
export function internalTierSavings(internalModelId: string, catalog: ModelsDevCatalog = snapshot as ModelsDevCatalog, inputShare = 0.75): number | null {
  const internal = costForModelId(catalog, internalModelId);
  if (!internal) return null;
  const sonnet = blendedCost(tierCosts(catalog).sonnet, inputShare);
  const internalBlended = blendedCost(internal, inputShare);
  return sonnet === 0 ? 0 : (sonnet - internalBlended) / sonnet;
}

const MODELS_DEV_URL = "https://models.dev/api.json";

/** Live-refresh the catalog from models.dev; falls back to the vendored snapshot on failure. */
export async function fetchModelCosts(opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {}): Promise<ModelsDevCatalog> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const res = await doFetch(MODELS_DEV_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`models.dev HTTP ${res.status}`);
    return (await res.json()) as ModelsDevCatalog;
  } catch {
    return snapshot as ModelsDevCatalog;
  } finally {
    clearTimeout(timer);
  }
}
