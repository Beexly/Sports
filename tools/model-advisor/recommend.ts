/**
 * Deterministic task→model recommender.
 *
 * Rule order is fixed and documented in NEXT_LEVEL_BUILD_SPEC.md §1.4:
 *   1. privacy local-only  → local candidates only
 *   2. bulk                → batch tier (Batch API −50%)
 *   3. multimodal          → Muse Glimmer locally, frontier at complexity ≥ 9
 *   4. long context        → 1M-context frontier
 *   5. complexity ladder   → local → openrouter → frontier
 * A "free" budget downgrades any paid tier to the best local candidate.
 */
import { MODEL_CATALOG } from "./catalog";
import type { ModelEntry, Recommendation, TaskProfile, Tier } from "./types";

const LONG_CONTEXT_THRESHOLD = 200_000;

function clampComplexity(value: number): number {
  if (Number.isNaN(value)) return 5;
  return Math.min(10, Math.max(1, Math.round(value)));
}

function requireCatalog(catalog: readonly ModelEntry[]): void {
  if (catalog.length === 0) {
    throw new Error(
      "model-advisor: catalog is empty; pass at least one ModelEntry or omit the catalog argument to use MODEL_CATALOG",
    );
  }
}

function requireModel(catalog: readonly ModelEntry[], id: string): ModelEntry {
  const entry = catalog.find((m) => m.id === id);
  if (!entry) {
    throw new Error(
      `model-advisor: catalog id "${id}" is not in the provided catalog; add that entry or omit the catalog argument to use MODEL_CATALOG`,
    );
  }
  return entry;
}

function locals(catalog: readonly ModelEntry[]): ModelEntry[] {
  return catalog.filter((m) => m.localRunnable);
}

function pick(
  catalog: readonly ModelEntry[],
  id: string,
  fallbackIds: readonly string[],
  tier: Tier,
  rationale: string,
): Recommendation {
  return {
    tier,
    primary: requireModel(catalog, id),
    fallbacks: fallbackIds.map((fallbackId) => requireModel(catalog, fallbackId)),
    rationale,
  };
}

function bestLocal(task: TaskProfile, catalog: readonly ModelEntry[]): Recommendation {
  const candidates = locals(catalog);
  const complexity = clampComplexity(task.complexity);
  let primary: ModelEntry;
  if (task.kind === "multimodal") {
    primary = requireModel(catalog, "muse-glimmer-30b");
  } else if (task.kind === "agentic") {
    // Nemotron 3.5 Lightning is purpose-built for the execution steps of an
    // agent loop at 3B active params — the cheapest capable local option here.
    primary = requireModel(catalog, "nemotron-3-5-lightning");
  } else if (complexity <= 2) {
    primary = requireModel(catalog, "qwen25-coder-7b");
  } else {
    primary = requireModel(catalog, "qwen3-coder-30b-a3b");
  }
  const fallbacks = candidates.filter((m) => m.id !== primary.id).slice(0, 2);
  return {
    tier: "local",
    primary,
    fallbacks,
    rationale:
      task.privacy === "local-only"
        ? "Privacy is local-only: routed to on-device models (prompt never leaves your machine)."
        : "Budget/complexity fits the free local tier: zero marginal cost, no rate limits.",
  };
}

export function recommendModel(
  task: TaskProfile,
  catalog: readonly ModelEntry[] = MODEL_CATALOG,
): Recommendation {
  requireCatalog(catalog);
  const complexity = clampComplexity(task.complexity);
  const privacy = task.privacy ?? "any";
  const budget = task.budget ?? "any";
  const toolUse = task.toolUse ?? task.kind === "agentic";
  const contextTokens = task.contextTokens ?? 0;

  // Rule 1 — privacy wall: never leave the machine.
  if (privacy === "local-only") return bestLocal(task, catalog);

  const freeify = (rec: Recommendation): Recommendation =>
    budget === "free" && rec.tier !== "local"
      ? {
          ...bestLocal(task, catalog),
          rationale:
            "Budget is 'free': downgraded to the local tier. " +
            "Original suggestion: " +
            `${rec.primary.label} (${rec.tier}).`,
        }
      : rec;

  // Rule 2 — bulk, non-interactive work: Batch API at −50%.
  if (task.kind === "bulk") {
    return freeify(
      pick(
        catalog,
        "claude-haiku-4-5",
        ["claude-sonnet-5"],
        "batch",
        "Non-interactive bulk job: cheapest frontier via the Batch API (−50% reported).",
      ),
    );
  }

  // Rule 3 — multimodal.
  if (task.kind === "multimodal") {
    if (complexity >= 9) {
      return freeify(
        pick(
          catalog,
          "claude-opus-5",
          ["claude-fable-5", "claude-sonnet-5"],
          "frontier",
          "Hardest multimodal reasoning: frontier multimodal model.",
        ),
      );
    }
    return bestLocal(task, catalog);
  }

  // Rule 4 — long context.
  if (task.kind === "long-context" || contextTokens > LONG_CONTEXT_THRESHOLD) {
    return freeify(
      pick(
        catalog,
        "claude-sonnet-5",
        ["claude-opus-5", "claude-fable-5"],
        "frontier",
        `Context ${contextTokens || ">200k"} tokens exceeds local windows: 1M-context frontier, cheapest first.`,
      ),
    );
  }

  // Rule 5 — complexity ladder.
  if (complexity <= 3) return freeify(bestLocal(task, catalog));

  if (complexity <= 6) {
    return freeify(
      pick(
        catalog,
        "glm-5-2",
        ["deepseek-coder-v2", "qwen3-coder-30b-a3b"],
        "openrouter",
        "Mid-tier reasoning: open frontier-class model via one pay-per-token key.",
      ),
    );
  }

  if (complexity <= 8) {
    if (toolUse) {
      return freeify(
        pick(
          catalog,
          "claude-sonnet-5",
          ["claude-opus-5", "glm-5-2"],
          "frontier",
          "Hard agentic/tool-use task: hosted workhorse with strong tool calling.",
        ),
      );
    }
    return freeify(
      pick(
        catalog,
        "glm-5-2",
        ["claude-sonnet-5", "deepseek-coder-v2"],
        "openrouter",
        "Hard but routable: open frontier-class first, hosted workhorse on failure.",
      ),
    );
  }

  return freeify(
    pick(
      catalog,
      "claude-opus-5",
      ["claude-fable-5", "claude-sonnet-5"],
      "frontier",
      "Top-complexity work: reserve the frontier ceiling (cache the stable prefix; /compact often).",
    ),
  );
}
