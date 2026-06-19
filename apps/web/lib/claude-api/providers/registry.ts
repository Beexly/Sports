/**
 * Free LLM provider registry — the "King of Data" pool.
 *
 * A single, auditable list of OpenAI-compatible free providers. The pool
 * (provider-pool.ts) rotates and fails over across whatever is available so no
 * single provider is exhausted, and the platform's AI surfaces (Jarvis,
 * content drafting) run with ZERO paid key by default: the keyless Pollinations
 * entry is always available.
 *
 * Each keyed provider is OPTIONAL — supplying its env var simply adds capacity
 * (and a different model's perspective) to the rotation. No secret is required
 * for the platform to answer.
 *
 * Ordering matters only as a tie-break for the initial pass; the pool spreads
 * load with a rotating start index. Keyless-first means the default install
 * leans on the no-secret provider, and keyed providers (when configured) widen
 * the pool.
 */

export interface Provider {
  /** Stable id used in the ledger and health map. */
  readonly id: string;
  /** Human label for the cockpit pool-status panel. */
  readonly label: string;
  /** Base URL WITHOUT /chat/completions (the adapter appends it). */
  readonly baseUrl: string;
  /** Model id to request. */
  readonly model: string;
  /** Env var holding this provider's API key. Omitted for keyless providers. */
  readonly apiKeyEnv?: string;
  /** True when the provider needs no key at all (always available). */
  readonly keyless?: boolean;
}

type Env = Record<string, string | undefined>;

/**
 * The seeded pool. All OpenAI-compatible. Keyless first so the zero-secret
 * default works; keyed-free providers follow and only activate when their key
 * is present. Best-effort model ids chosen from each provider's free tier as of
 * 2026-06; they can be overridden per-provider later without touching the pool
 * logic.
 */
export const FREE_PROVIDERS: readonly Provider[] = [
  // Keyless — no secret required. This is what makes the platform answerable
  // with ZERO paid key.
  {
    id: "pollinations",
    label: "Pollinations (keyless)",
    baseUrl: "https://text.pollinations.ai/openai",
    model: "openai",
    keyless: true,
  },
  // Keyed-free providers. Each adds capacity + a model perspective when its key
  // is configured; all optional.
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "gpt-oss-120b",
    apiKeyEnv: "CEREBRAS_API_KEY",
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    apiKeyEnv: "GROQ_API_KEY",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    apiKeyEnv: "DEEPSEEK_API_KEY",
  },
  {
    id: "openrouter",
    label: "OpenRouter (free)",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    apiKeyEnv: "OPENROUTER_API_KEY",
  },
  {
    id: "together",
    label: "Together (free)",
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    apiKeyEnv: "TOGETHER_API_KEY",
  },
  {
    id: "gemini",
    label: "Gemini (OpenAI-compat)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    apiKeyEnv: "GEMINI_API_KEY",
  },
  // ── Additional free-tier OpenAI-compatible providers (leverage catalog,
  //    reports/leverage/FREE_APIS.md). Each is keyed-free and INERT until its key
  //    env is set — adding them only widens the pool + perspective diversity at $0;
  //    none activates or spends without the owner provisioning a free key.
  //    (Cloudflare Workers AI is parked: its base URL needs a per-account ACCOUNT_ID,
  //    which doesn't fit this static baseUrl shape — see the catalog.)
  {
    id: "mistral",
    label: "Mistral (free tier)",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    apiKeyEnv: "MISTRAL_API_KEY",
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM (free)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "meta/llama-3.1-70b-instruct",
    apiKeyEnv: "NVIDIA_API_KEY",
  },
  {
    id: "github-models",
    label: "GitHub Models (free)",
    baseUrl: "https://models.inference.ai.azure.com",
    model: "gpt-4o-mini",
    apiKeyEnv: "GITHUB_MODELS_API_KEY",
  },
  {
    id: "cohere",
    label: "Cohere (OpenAI-compat, free tier)",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    model: "command-r-08-2024",
    apiKeyEnv: "COHERE_API_KEY",
  },
];

/** Resolve a provider's API key from env (undefined for keyless providers). */
export function providerApiKey(provider: Provider, env: Env = process.env): string | undefined {
  if (provider.keyless) return undefined;
  if (!provider.apiKeyEnv) return undefined;
  const value = env[provider.apiKeyEnv];
  return value && value.trim() !== "" ? value : undefined;
}

/** True when a provider can be called right now (keyless OR its key is present). */
export function isProviderAvailable(provider: Provider, env: Env = process.env): boolean {
  if (provider.keyless) return true;
  return providerApiKey(provider, env) !== undefined;
}

/** The providers currently usable: keyless, plus any whose key env is set. */
export function availableProviders(env: Env = process.env): Provider[] {
  return FREE_PROVIDERS.filter((p) => isProviderAvailable(p, env));
}

export interface ProviderPoolStatusEntry {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  readonly keyless: boolean;
}

/** Cockpit-facing pool status: every provider with its availability + keyless flag. */
export function listProviderPoolStatus(env: Env = process.env): ProviderPoolStatusEntry[] {
  return FREE_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    available: isProviderAvailable(p, env),
    keyless: Boolean(p.keyless),
  }));
}
