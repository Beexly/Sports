import { describe, expect, it, vi } from "vitest";
import {
  CACHEABLE_SURFACES,
  cacheBypassReason,
  createMemoryResponseCacheStore,
  createRedisResponseCacheStore,
  responseCacheKey,
  withResponseCache,
  type CacheableRequest,
  type CacheableResult,
  type ResponseCacheStore,
} from "../lib/claude-api/response-cache";

const baseRequest: CacheableRequest = {
  model: "claude-haiku-4-5-20251001",
  system: "You summarize.",
  user: "Summarize the slate.",
  maxTokens: 512,
  surface: "brief",
};

const result: CacheableResult = {
  text: "a summary",
  modelName: "claude-haiku-4-5-20251001",
  inputTokens: 100,
  outputTokens: 20,
};

function callerReturning(value: CacheableResult) {
  return vi.fn(async () => value);
}

describe("responseCacheKey", () => {
  it("is stable for identical requests", () => {
    expect(responseCacheKey(baseRequest)).toBe(responseCacheKey({ ...baseRequest }));
  });

  it("changes when any field changes", () => {
    const base = responseCacheKey(baseRequest);
    expect(responseCacheKey({ ...baseRequest, user: "different" })).not.toBe(base);
    expect(responseCacheKey({ ...baseRequest, system: "different" })).not.toBe(base);
    expect(responseCacheKey({ ...baseRequest, model: "claude-sonnet-4-6" })).not.toBe(base);
    expect(responseCacheKey({ ...baseRequest, maxTokens: 513 })).not.toBe(base);
  });

  it("does not collide when a value moves between fields", () => {
    const a = responseCacheKey({ ...baseRequest, system: "x", user: "y" });
    const b = responseCacheKey({ ...baseRequest, system: "y", user: "x" });
    expect(a).not.toBe(b);
  });

  it("treats an absent temperature as 0", () => {
    expect(responseCacheKey({ ...baseRequest, temperature: 0 })).toBe(
      responseCacheKey(baseRequest),
    );
  });
});

describe("cacheBypassReason", () => {
  it("bypasses when not opted in", () => {
    expect(cacheBypassReason(baseRequest, false)).toBe("not-opted-in");
  });

  it("bypasses surfaces that are not draft-shaped", () => {
    expect(cacheBypassReason({ ...baseRequest, surface: "model-court" }, true)).toBe(
      "surface-not-cacheable",
    );
    expect(cacheBypassReason({ ...baseRequest, surface: undefined }, true)).toBe(
      "surface-not-cacheable",
    );
  });

  it("bypasses nondeterministic sampling", () => {
    expect(cacheBypassReason({ ...baseRequest, temperature: 0.7 }, true)).toBe(
      "nondeterministic-temperature",
    );
  });

  it("allows an eligible request", () => {
    expect(cacheBypassReason(baseRequest, true)).toBeNull();
  });

  it("never lists a pick- or claim-bearing surface as cacheable", () => {
    for (const forbidden of ["studio", "journal", "calibration-insight", "model-court"] as const) {
      expect(CACHEABLE_SURFACES.has(forbidden)).toBe(false);
    }
  });
});

describe("withResponseCache", () => {
  it("misses, then hits, calling the model only once", async () => {
    const store = createMemoryResponseCacheStore();
    const call = callerReturning(result);

    const first = await withResponseCache({ store, request: baseRequest, call, enabled: true });
    expect(first.kind).toBe("miss");

    const second = await withResponseCache({ store, request: baseRequest, call, enabled: true });
    expect(second.kind).toBe("hit");
    expect(second.result.text).toBe("a summary");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("calls through every time when not opted in", async () => {
    const store = createMemoryResponseCacheStore();
    const call = callerReturning(result);
    for (let i = 0; i < 3; i++) {
      const out = await withResponseCache({ store, request: baseRequest, call });
      expect(out.kind).toBe("bypass");
    }
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("does not serve one prompt's answer for another", async () => {
    const store = createMemoryResponseCacheStore();
    await withResponseCache({
      store,
      request: baseRequest,
      call: callerReturning({ ...result, text: "FIRST" }),
      enabled: true,
    });
    const other = await withResponseCache({
      store,
      request: { ...baseRequest, user: "a completely different question" },
      call: callerReturning({ ...result, text: "SECOND" }),
      enabled: true,
    });
    expect(other.kind).toBe("miss");
    expect(other.result.text).toBe("SECOND");
  });

  it("expires entries after the TTL", async () => {
    let clock = 1_000_000;
    const now = () => clock;
    const store = createMemoryResponseCacheStore(now);
    const call = callerReturning(result);

    await withResponseCache({ store, request: baseRequest, call, enabled: true, ttlSeconds: 60, now });
    clock += 61_000;
    const after = await withResponseCache({
      store,
      request: baseRequest,
      call,
      enabled: true,
      ttlSeconds: 60,
      now,
    });
    expect(after.kind).toBe("miss");
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("reports age and honors maxAgeMs", async () => {
    let clock = 5_000_000;
    const now = () => clock;
    const store = createMemoryResponseCacheStore(now);
    const call = callerReturning(result);

    await withResponseCache({ store, request: baseRequest, call, enabled: true, now });
    clock += 30_000;

    const hit = await withResponseCache({ store, request: baseRequest, call, enabled: true, now });
    expect(hit.kind).toBe("hit");
    if (hit.kind === "hit") expect(hit.ageMs).toBe(30_000);

    const rejected = await withResponseCache({
      store,
      request: baseRequest,
      call,
      enabled: true,
      now,
      maxAgeMs: 10_000,
    });
    expect(rejected.kind).toBe("miss");
  });

  it("degrades to a live call when the store throws", async () => {
    const broken: ResponseCacheStore = {
      async get() {
        throw new Error("redis down");
      },
      async set() {
        throw new Error("redis down");
      },
    };
    const call = callerReturning(result);
    const out = await withResponseCache({ store: broken, request: baseRequest, call, enabled: true });
    expect(out.kind).toBe("bypass");
    if (out.kind === "bypass") expect(out.reason).toBe("store-error");
    expect(out.result.text).toBe("a summary");
  });

  it("still returns the result when only the write fails", async () => {
    const writeOnlyFailure: ResponseCacheStore = {
      async get() {
        return null;
      },
      async set() {
        throw new Error("write failed");
      },
    };
    const out = await withResponseCache({
      store: writeOnlyFailure,
      request: baseRequest,
      call: callerReturning(result),
      enabled: true,
    });
    expect(out.kind).toBe("miss");
    expect(out.result.text).toBe("a summary");
  });

  it("ignores corrupt cache entries instead of throwing", async () => {
    const store = createMemoryResponseCacheStore();
    await store.set(responseCacheKey(baseRequest), "{not json", 60);
    const out = await withResponseCache({
      store,
      request: baseRequest,
      call: callerReturning(result),
      enabled: true,
    });
    expect(out.kind).toBe("miss");
  });
});

describe("createRedisResponseCacheStore", () => {
  it("uses setex with the TTL in seconds", async () => {
    const setex = vi.fn(async () => "OK");
    const get = vi.fn(async () => null);
    const store = createRedisResponseCacheStore({ get, setex });

    await store.set("k", "v", 120);
    expect(setex).toHaveBeenCalledWith("k", 120, "v");

    await store.get("k");
    expect(get).toHaveBeenCalledWith("k");
  });
});
