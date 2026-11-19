/**
 * Free-lane policy (pure) -- shared by free-lane dispatcher, internal-llm, and Jynx planner.
 *
 * Includes fail-closed Nous Portal billing protection: Nous Portal API keys
 * (`sk-nous-...`) normally bill pay-as-you-go credits, NOT included $20/mo Plus
 * Hermes Agent usage. Only explicitly free-promo `:free` models (such as
 * `qwen/qwen4-max:free`) may be dispatched without `NOUS_ALLOW_PAYG="true"`.
 */
import type { ClaudeSurface } from "./model-router";

type Env = Record<string, string | undefined>;

export const FREE_LANE_SURFACES: ReadonlySet<ClaudeSurface> = new Set<ClaudeSurface>([
  "brief",
  "content",
]);

export const DEFAULT_NOUS_BASE_URL = "https://inference-api.nousresearch.com/v1";
export const DEFAULT_NOUS_FREE_MODEL = "qwen/qwen4-max:free";

export const DEFAULT_NOUS_FREE_FAILOVER_CHAIN: readonly string[] = [
  "qwen/qwen4-max:free",
  "meituan/longcat-2.5:free",
  "stepfun/step-3.7-flash:free",
] as const;

export const NOUS_FREE_PROMO_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  "qwen/qwen4-max:free",
  "upstage/solar-mini4:free",
  "tencent/hy4-flash:free",
  "stepfun/step-3.7-flash:free",
  "meituan/longcat-2.5:free",
]);

export interface NousPromoLaneConfig {
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly ledgerPrefix: "nous-free/";
  readonly extraBody: { readonly reasoning: { readonly effort: "none" } };
}

/** True when an Alibaba Cloud Model Studio / DashScope API key is configured. */
export function hasAlibabaDashScopeKey(env: Env = process.env): boolean {
  return Boolean(env["ALIBABA_API_KEY"]?.trim() || env["DASHSCOPE_API_KEY"]?.trim());
}

/**
 * Resolve Nous Portal free-promo model safely.
 * Bare shorthand `qwen4-max` normalizes to `qwen/qwen4-max:free` ($0 tier).
 * Any paid / non-`:free` model is blocked (returns null) unless NOUS_ALLOW_PAYG === "true".
 */
export function resolveNousPromoModel(
  rawModel: string | undefined,
  env: Env = process.env,
): string | null {
  const trimmed = (rawModel ?? "").trim();
  const normalized =
    trimmed === "" || trimmed.toLowerCase() === "qwen4-max"
      ? DEFAULT_NOUS_FREE_MODEL
      : trimmed;
  if (NOUS_FREE_PROMO_ALLOWLIST.has(normalized) || /:free$/i.test(normalized)) {
    return normalized;
  }
  if (env["NOUS_ALLOW_PAYG"] === "true") {
    return normalized;
  }
  return null;
}

/**
 * Resolve the Nous Portal temporary $0 frontier promo config when active and non-PAYG-safe.
 * Returns null (fail-closed) when key is missing, promo is disabled/expired, or model is PAYG.
 */
export function resolveNousPromoFreeLaneConfig(
  env: Env = process.env,
  nowMs: number = Date.now(),
): NousPromoLaneConfig | null {
  if (env["CONTENT_FREE_LANE_ENABLED"] !== "true") return null;
  if (env["NOUS_QWEN4_MAX_FREE_PROMO_ENABLED"] === "false") return null;

  const expiresRaw = env["NOUS_PROMO_EXPIRES_AT"]?.trim();
  if (expiresRaw) {
    const expiresMs = Date.parse(expiresRaw);
    if (!Number.isFinite(expiresMs) || nowMs >= expiresMs) return null;
  }

  const apiKey = env["NOUS_API_KEY"]?.trim() || env["NOUS_PORTAL_API_KEY"]?.trim();
  if (!apiKey) return null;

  const model = resolveNousPromoModel(env["NOUS_MODEL"], env);
  if (!model) return null;

  const baseUrl = (env["NOUS_BASE_URL"]?.trim() || DEFAULT_NOUS_BASE_URL).replace(/\/+$/, "");
  return {
    baseUrl,
    model,
    apiKey,
    ledgerPrefix: "nous-free/",
    extraBody: { reasoning: { effort: "none" } },
  };
}

/**
 * Resolve the multi-model zero-cost Nous `:free` failover cascade:
 * primary (e.g. `qwen/qwen4-max:free`) -> `meituan/longcat-2.5:free` -> `stepfun/step-3.7-flash:free`.
 * Returns `[]` whenever `resolveNousPromoFreeLaneConfig` fail-closes to null.
 */
export function resolveNousPromoFreeLaneChain(
  env: Env = process.env,
  nowMs: number = Date.now(),
): readonly NousPromoLaneConfig[] {
  const primary = resolveNousPromoFreeLaneConfig(env, nowMs);
  if (primary === null) return [];
  if (env["NOUS_FREE_CHAIN_DISABLED"] === "true") return [primary];
  const seen = new Set<string>([primary.model]);
  const chain: NousPromoLaneConfig[] = [primary];
  for (const fallbackModel of DEFAULT_NOUS_FREE_FAILOVER_CHAIN) {
    if (seen.has(fallbackModel)) continue;
    seen.add(fallbackModel);
    chain.push({
      ...primary,
      model: fallbackModel,
    });
  }
  return chain;
}

/** True when free content lane can attempt at least one $0 or credit-covered host. */
export function isFreeLaneEnabled(env: Env = process.env): boolean {
  if (env["CONTENT_FREE_LANE_ENABLED"] !== "true") return false;
  if (resolveNousPromoFreeLaneConfig(env) !== null) return true;
  if (env["CEREBRAS_API_KEY"]?.trim()) return true;
  if (hasAlibabaDashScopeKey(env)) return true;
  if (env["FREE_LANE_SECONDARY_BASE_URL"]?.trim() && env["FREE_LANE_SECONDARY_MODEL"]?.trim()) {
    return true;
  }
  return false;
}

export function shouldUseFreeLane(surface: ClaudeSurface | undefined, env: Env = process.env): boolean {
  if (surface === undefined || !FREE_LANE_SURFACES.has(surface)) return false;
  return isFreeLaneEnabled(env);
}
