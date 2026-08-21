/**
 * Jynx — unified intelligence + credit routing OS for GSE.
 *
 * One brain. Every lane feeds the same plan:
 *   1) Surface → model tier (Haiku / Sonnet / Opus) via model-router
 *   2) Free-lane (Cerebras) when surface allow-listed + env on
 *   3) Cloud Claude credits in preference order (AWS → Azure → Google)
 *   4) Anthropic cash only as last resort
 *
 * Design laws:
 * - Lanes never fight: free-lane is orthogonal and first for eligible surfaces.
 * - Clouds cooperate: primary preference + failover across configured providers
 *   before cash (JYNX_CLOUD_FAILOVER, default on).
 * - Explicit CLAUDE_PROVIDER still forces primary; `auto` uses configured order.
 * - Unset CLAUDE_PROVIDER stays Anthropic-only (inert legacy) unless JYNX_MODE=auto
 *   or CLAUDE_PROVIDER=auto.
 * - No secrets in plans; plans are pure and unit-testable.
 */

import {
  activeTierForSurface,
  pickModelForSurface,
  type ClaudeSurface,
  type ModelTier,
} from "./model-router";
import {
  FREE_LANE_SURFACES,
  isFreeLaneEnabled,
  shouldUseFreeLane,
} from "./free-lane-policy";
// Pure env-shape checks — no transport, no provider client, no vendor SDK.
// See ./provider-config.ts for why these live outside `providers/`.
import {
  isBedrockConfigured,
  isVertexConfigured,
  isAzureFoundryConfigured,
} from "./provider-config";

export type JynxCloud = "bedrock" | "azure" | "vertex";
export type JynxLane = "cerebras_free" | JynxCloud | "anthropic_direct";

export type JynxProviderMode = "anthropic" | "auto" | JynxCloud | "unknown";

type Env = Record<string, string | undefined>;

const DEFAULT_CLOUD_ORDER: readonly JynxCloud[] = ["bedrock", "azure", "vertex"] as const;

/** Prefer AWS Activate, then Azure Foundry, then Vertex — override via JYNX_CLOUD_ORDER. */
export function parseCloudOrder(env: Env = process.env): readonly JynxCloud[] {
  const raw = env["JYNX_CLOUD_ORDER"]?.trim();
  if (!raw) return DEFAULT_CLOUD_ORDER;
  const parts = raw
    .split(/[,\s]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const out: JynxCloud[] = [];
  for (const p of parts) {
    if (p === "bedrock" || p === "aws") out.push("bedrock");
    else if (p === "azure" || p === "azure-foundry" || p === "foundry") out.push("azure");
    else if (p === "vertex" || p === "google" || p === "gcp") out.push("vertex");
  }
  const seen = new Set<JynxCloud>();
  const unique: JynxCloud[] = [];
  for (const c of [...out, ...DEFAULT_CLOUD_ORDER]) {
    if (seen.has(c)) continue;
    seen.add(c);
    unique.push(c);
  }
  return unique;
}

export function isCloudFailoverEnabled(env: Env = process.env): boolean {
  const raw = env["JYNX_CLOUD_FAILOVER"]?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function isJynxAutoMode(env: Env = process.env): boolean {
  const provider = env["CLAUDE_PROVIDER"]?.trim().toLowerCase() ?? "";
  const mode = env["JYNX_MODE"]?.trim().toLowerCase() ?? "";
  return provider === "auto" || mode === "auto";
}

export function parseProviderMode(env: Env = process.env): JynxProviderMode {
  const raw = env["CLAUDE_PROVIDER"]?.trim().toLowerCase() ?? "";
  if (raw === "auto" || (raw === "" && isJynxAutoMode(env))) return "auto";
  if (isJynxAutoMode(env) && (raw === "" || raw === "auto")) return "auto";
  if (raw === "bedrock") return "bedrock";
  if (raw === "vertex") return "vertex";
  if (raw === "azure" || raw === "azure-foundry") return "azure";
  if (raw === "" || raw === "anthropic") return "anthropic";
  return "unknown";
}

export function listConfiguredClouds(env: Env = process.env): readonly JynxCloud[] {
  const out: JynxCloud[] = [];
  if (isBedrockConfigured(env)) out.push("bedrock");
  if (isAzureFoundryConfigured(env)) out.push("azure");
  if (isVertexConfigured(env)) out.push("vertex");
  return out;
}

/**
 * Ordered cloud attempts for this env.
 *
 * @example
 * ```ts
 * import { cloudAttemptOrder } from "@/lib/claude-api/jynx";
 * // auto + Bedrock+Azure configured → ["bedrock","azure"]
 * cloudAttemptOrder({ CLAUDE_PROVIDER: "auto", ...bedrockEnv, ...azureEnv });
 * // See jynx-examples.ts for full fixtures.
 * ```
 */
export function cloudAttemptOrder(env: Env = process.env): readonly JynxCloud[] {
  const mode = parseProviderMode(env);
  const configured = new Set(listConfiguredClouds(env));
  const pref = parseCloudOrder(env).filter((c) => configured.has(c));
  const failover = isCloudFailoverEnabled(env);

  if (mode === "auto") {
    return pref;
  }

  if (mode === "bedrock" || mode === "azure" || mode === "vertex") {
    if (!configured.has(mode)) {
      return failover ? pref : [];
    }
    if (!failover) return [mode];
    return [mode, ...pref.filter((c) => c !== mode)];
  }

  return [];
}

export interface JynxPlan {
  readonly surface: ClaudeSurface | null;
  readonly tier: ModelTier | null;
  readonly anthropicModelId: string;
  readonly primaryLane: JynxLane;
  readonly cloudAttempts: readonly JynxCloud[];
  readonly freeLaneEligible: boolean;
  readonly freeLaneWillTry: boolean;
  readonly providerMode: JynxProviderMode;
  readonly reason: string;
}

export interface PlanJynxInput {
  readonly surface?: ClaudeSurface;
  readonly model?: string;
  readonly maxTokens?: number;
}

export function planJynx(input: PlanJynxInput = {}, env: Env = process.env): JynxPlan {
  const surface = input.surface ?? null;
  const tier = surface ? activeTierForSurface(surface) : null;
  const anthropicModelId =
    input.model?.trim() ||
    (surface ? pickModelForSurface(surface) : "claude-sonnet-4-6");

  const freeLaneEligible = surface ? FREE_LANE_SURFACES.has(surface) : false;
  const freeLaneWillTry = shouldUseFreeLane(surface ?? undefined, env);
  const clouds = cloudAttemptOrder(env);
  const providerMode = parseProviderMode(env);

  let primaryLane: JynxLane;
  let reason: string;

  if (freeLaneWillTry) {
    primaryLane = "cerebras_free";
    reason = `Free-lane first for surface=${surface} (Cerebras $0). Clouds [${clouds.join(",") || "none"}] then Anthropic if free-lane fails.`;
  } else if (clouds.length > 0) {
    primaryLane = clouds[0]!;
    reason = `Claude credits via ${clouds.join("→")} (mode=${providerMode}, failover=${isCloudFailoverEnabled(env)}). Cash Anthropic last.`;
  } else {
    primaryLane = "anthropic_direct";
    reason =
      providerMode === "auto"
        ? "Auto mode but no cloud fully configured — Anthropic cash until Bedrock/Azure/Vertex env complete."
        : "Claude cash path (set CLAUDE_PROVIDER=auto or bedrock|azure|vertex + maps to burn credits).";
  }

  return {
    surface,
    tier,
    anthropicModelId,
    primaryLane,
    cloudAttempts: clouds,
    freeLaneEligible,
    freeLaneWillTry,
    providerMode,
    reason,
  };
}

export interface JynxPublicSnapshot {
  readonly mode: JynxProviderMode;
  readonly auto: boolean;
  readonly cloudOrder: readonly string[];
  readonly configuredClouds: readonly string[];
  readonly attemptOrder: readonly string[];
  readonly failover: boolean;
  readonly freeLaneEnabled: boolean;
  readonly freeLaneSurfaces: readonly string[];
  readonly contentPlanPrimary: JynxLane;
  readonly contentPlanReason: string;
}

export function loadJynxPublicSnapshot(env: Env = process.env): JynxPublicSnapshot {
  const plan = planJynx({ surface: "content" }, env);
  return {
    mode: parseProviderMode(env),
    auto: isJynxAutoMode(env),
    cloudOrder: [...parseCloudOrder(env)],
    configuredClouds: [...listConfiguredClouds(env)],
    attemptOrder: [...plan.cloudAttempts],
    failover: isCloudFailoverEnabled(env),
    freeLaneEnabled: isFreeLaneEnabled(env),
    freeLaneSurfaces: [...FREE_LANE_SURFACES],
    contentPlanPrimary: plan.primaryLane,
    contentPlanReason: plan.reason,
  };
}
