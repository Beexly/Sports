import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDefaultRemoteModelConfigs,
  getRemoteModelPredictions,
  type RemoteModelConfig,
} from "../remote-model-client.js";

// The full set of env vars this module reads. Cleared before every test and
// restored after so a developer's real shell environment (or a previous
// test) never leaks into these assertions.
const REMOTE_MODEL_ENV_KEYS = [
  "TDA_SERVICE_URL",
  "REMOTE_MODEL_TDA_ENABLED",
  "IRL_SERVICE_URL",
  "REMOTE_MODEL_IRL_ENABLED",
  "ETKF_SERVICE_URL",
  "REMOTE_MODEL_ETKF_ENABLED",
  "FREE_ENERGY_SERVICE_URL",
  "REMOTE_MODEL_FREE_ENERGY_ENABLED",
  "MPS_SERVICE_URL",
  "REMOTE_MODEL_MPS_ENABLED",
] as const;

let savedEnv: Partial<Record<(typeof REMOTE_MODEL_ENV_KEYS)[number], string | undefined>>;

beforeEach(() => {
  savedEnv = {};
  for (const key of REMOTE_MODEL_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of REMOTE_MODEL_ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

function rejectingJsonResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error("malformed JSON body");
    },
  } as unknown as Response;
}

function mockAbortAware(init?: RequestInit): Promise<Response> {
  // Mirrors real fetch: the returned promise only settles when the caller's
  // AbortSignal fires, and it rejects with an AbortError — it never
  // resolves on its own, exactly like a hung/unreachable sidecar.
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      reject(error);
    });
  });
}

function config(overrides: Partial<RemoteModelConfig> & Pick<RemoteModelConfig, "name" | "url">): RemoteModelConfig {
  return { enabled: true, ...overrides };
}

describe("getRemoteModelPredictions — enable/disable gating", () => {
  it("returns an empty array and calls fetch zero times when every config is disabled", async () => {
    const mockFetch = vi.fn();
    const configs: RemoteModelConfig[] = [
      config({ name: "tda", url: "https://tda.internal/predict", enabled: false }),
      config({ name: "irl", url: "https://irl.internal/predict", enabled: false }),
    ];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("getRemoteModelPredictions — successful single-source fetches", () => {
  it("includes a config whose body has a valid home_win_probability field", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ home_win_probability: 0.62 }));
    const configs: RemoteModelConfig[] = [config({ name: "tda", url: "https://tda.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([{ name: "tda", probability: 0.62 }]);
  });

  it("includes a config whose body has a valid probability field instead", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ probability: 0.55 }));
    const configs: RemoteModelConfig[] = [config({ name: "irl", url: "https://irl.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([{ name: "irl", probability: 0.55 }]);
  });

  it("prefers home_win_probability over probability when both are present", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ home_win_probability: 0.7, probability: 0.1 }));
    const configs: RemoteModelConfig[] = [config({ name: "etkf", url: "https://etkf.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([{ name: "etkf", probability: 0.7 }]);
  });
});

describe("getRemoteModelPredictions — failure modes are excluded, never thrown", () => {
  it("excludes a config that returns a non-200 response", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ probability: 0.5 }, { ok: false, status: 500 }));
    const configs: RemoteModelConfig[] = [config({ name: "mps", url: "https://mps.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
  });

  it("excludes a config that rejects while parsing the JSON body", async () => {
    const mockFetch = vi.fn(async () => rejectingJsonResponse());
    const configs: RemoteModelConfig[] = [config({ name: "mps", url: "https://mps.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
  });

  it("excludes a config whose fetchImpl rejects with a network error", async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const configs: RemoteModelConfig[] = [config({ name: "free_energy", url: "https://free-energy.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
  });

  it("excludes a config that times out, while other enabled configs still succeed", async () => {
    const configs: RemoteModelConfig[] = [
      config({ name: "slow", url: "https://slow.internal/predict", timeoutMs: 25 }),
      config({ name: "fast", url: "https://fast.internal/predict" }),
    ];
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://slow.internal/predict") return mockAbortAware(init);
      return jsonResponse({ probability: 0.72 });
    });

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([{ name: "fast", probability: 0.72 }]);
  });

  it.each([
    ["above 1", 1.5],
    ["below 0", -0.2],
    ["NaN", Number.NaN],
    ["a string, not a number", "0.5"],
  ])("excludes a config whose probability is invalid: %s", async (_label, badProbability) => {
    const mockFetch = vi.fn(async () => jsonResponse({ probability: badProbability }));
    const configs: RemoteModelConfig[] = [config({ name: "bad", url: "https://bad.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
  });

  it("excludes a config whose body is missing both probability fields", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ some_other_field: 1 }));
    const configs: RemoteModelConfig[] = [config({ name: "missing", url: "https://missing.internal/predict" })];

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
  });
});

describe("getRemoteModelPredictions — mixed success/failure across multiple sources", () => {
  it("returns only the successful predictions, ordered to match the input config order", async () => {
    const configs: RemoteModelConfig[] = [
      config({ name: "a-network-error", url: "https://a.internal/predict" }),
      config({ name: "b-success-slow", url: "https://b.internal/predict" }),
      config({ name: "c-success-fast", url: "https://c.internal/predict" }),
      config({ name: "d-non-200", url: "https://d.internal/predict" }),
    ];

    const mockFetch = vi.fn(async (url: string) => {
      switch (url) {
        case "https://a.internal/predict":
          throw new Error("network down");
        case "https://b.internal/predict":
          // Resolves after "c" to prove the result order follows the input
          // config order, not settlement/completion order.
          await new Promise((resolve) => setTimeout(resolve, 15));
          return jsonResponse({ probability: 0.4 });
        case "https://c.internal/predict":
          return jsonResponse({ probability: 0.6 });
        case "https://d.internal/predict":
          return jsonResponse({ probability: 0.9 }, { ok: false, status: 503 });
        default:
          throw new Error(`unexpected url: ${url}`);
      }
    });

    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([
      { name: "b-success-slow", probability: 0.4 },
      { name: "c-success-fast", probability: 0.6 },
    ]);
  });

  it("is deterministic across repeated runs with the same inputs", async () => {
    const configs: RemoteModelConfig[] = [
      config({ name: "one", url: "https://one.internal/predict" }),
      config({ name: "two", url: "https://two.internal/predict" }),
      config({ name: "three", url: "https://three.internal/predict" }),
    ];
    const mockFetch = vi.fn(async (url: string) => {
      if (url === "https://two.internal/predict") return jsonResponse({}, { ok: false, status: 500 });
      return jsonResponse({ probability: url.includes("one") ? 0.3 : 0.8 });
    });

    const first = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    const second = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(first).toEqual([
      { name: "one", probability: 0.3 },
      { name: "three", probability: 0.8 },
    ]);
    expect(second).toEqual(first);
  });
});

describe("getRemoteModelPredictions — AbortController wiring", () => {
  it("passes fetch a real AbortSignal and aborts around the configured timeout, not the 2000ms default", async () => {
    let observedSignal: AbortSignal | null | undefined;
    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      observedSignal = init?.signal;
      return mockAbortAware(init);
    });
    const configs: RemoteModelConfig[] = [
      config({ name: "solo", url: "https://solo.internal/predict", timeoutMs: 30 }),
    ];

    const start = Date.now();
    const result = await getRemoteModelPredictions(undefined, {
      configs,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    const elapsedMs = Date.now() - start;

    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(observedSignal).toBeInstanceOf(AbortSignal);
    // Comfortably below the 2000ms default confirms the per-config override
    // actually drove the abort, not the fallback timeout.
    expect(elapsedMs).toBeLessThan(1000);
  });

  it("honors defaultTimeoutMs when a config doesn't set its own timeoutMs", async () => {
    let observedSignal: AbortSignal | null | undefined;
    const mockFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      observedSignal = init?.signal;
      return mockAbortAware(init);
    });
    const configs: RemoteModelConfig[] = [config({ name: "solo", url: "https://solo.internal/predict" })];

    const start = Date.now();
    const result = await getRemoteModelPredictions(undefined, {
      configs,
      defaultTimeoutMs: 30,
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    const elapsedMs = Date.now() - start;

    expect(result).toEqual([]);
    expect(observedSignal).toBeInstanceOf(AbortSignal);
    expect(elapsedMs).toBeLessThan(1000);
  });
});

describe("buildDefaultRemoteModelConfigs — safe-by-default env wiring", () => {
  it("returns an empty list when no *_SERVICE_URL env vars are set", () => {
    expect(buildDefaultRemoteModelConfigs()).toEqual([]);
  });

  it("includes a source once its URL env var is set, but every entry stays disabled without opt-in", () => {
    process.env["TDA_SERVICE_URL"] = "http://localhost:8000/tda";
    process.env["IRL_SERVICE_URL"] = "http://localhost:8001/irl";
    process.env["ETKF_SERVICE_URL"] = "http://localhost:8002/etkf";
    process.env["FREE_ENERGY_SERVICE_URL"] = "http://localhost:8003/free-energy";
    process.env["MPS_SERVICE_URL"] = "http://localhost:8004/mps";

    const configs = buildDefaultRemoteModelConfigs();

    expect(configs).toHaveLength(5);
    expect(configs.every((c) => c.enabled === false)).toBe(true);
  });

  it("enables a source only when its REMOTE_MODEL_<NAME>_ENABLED env var is exactly the string 'true'", () => {
    process.env["TDA_SERVICE_URL"] = "http://localhost:8000/tda";
    process.env["REMOTE_MODEL_TDA_ENABLED"] = "true";
    process.env["IRL_SERVICE_URL"] = "http://localhost:8001/irl";
    process.env["REMOTE_MODEL_IRL_ENABLED"] = "yes"; // truthy-looking, but not the literal "true" -> stays disabled

    const configs = buildDefaultRemoteModelConfigs();
    const tda = configs.find((c) => c.name === "tda");
    const irl = configs.find((c) => c.name === "irl");

    expect(tda?.enabled).toBe(true);
    expect(irl?.enabled).toBe(false);
  });
});

describe("getRemoteModelPredictions — default config wiring end-to-end", () => {
  it("makes zero network calls and returns [] when called with no configs override and no relevant env vars set", async () => {
    const mockFetch = vi.fn();

    const result = await getRemoteModelPredictions(undefined, {
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("still makes zero network calls even when URL env vars are set, because none opted in via ENABLED", async () => {
    process.env["TDA_SERVICE_URL"] = "http://localhost:8000/tda";
    process.env["IRL_SERVICE_URL"] = "http://localhost:8001/irl";
    const mockFetch = vi.fn();

    const result = await getRemoteModelPredictions(undefined, {
      fetchImpl: mockFetch as unknown as typeof fetch,
    });

    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
