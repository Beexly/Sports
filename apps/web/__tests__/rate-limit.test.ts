import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Redis } from "ioredis";

import {
  __setRedisForTests,
  checkRateLimit,
  type RateLimitConfig,
} from "@/lib/rate-limit";

function makeFakeRedis(opts: {
  zcardValues?: number[]; // sequence — one entry per call
  throws?: boolean;
} = {}): { client: Redis; calls: { multi: number } } {
  const calls = { multi: 0 };
  const zcardValues = [...(opts.zcardValues ?? [1])];
  const pipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    pexpire: vi.fn().mockReturnThis(),
    exec: vi.fn(async () => {
      if (opts.throws) throw new Error("simulated pipeline failure");
      const count = zcardValues.shift() ?? 0;
      return [
        [null, 0],   // zremrangebyscore
        [null, 1],   // zadd
        [null, count], // zcard
        [null, 1],   // pexpire
      ];
    }),
  };
  const client = {
    multi: () => {
      calls.multi++;
      return pipeline;
    },
  } as unknown as Redis;
  return { client, calls };
}

const DEFAULT_CFG: RateLimitConfig = {
  route: "test-route",
  windowMs: 60_000,
  maxRequests: 3,
  failureMode: "fail-closed",
};

describe("checkRateLimit", () => {
  beforeEach(() => {
    delete process.env["REDIS_URL"];
    __setRedisForTests(undefined);
  });

  afterEach(() => {
    __setRedisForTests(undefined);
    delete process.env["REDIS_URL"];
  });

  it("allows when post-add count is at or under the limit", async () => {
    const { client } = makeFakeRedis({ zcardValues: [1, 2, 3] });

    const r1 = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => client,
    });
    const r2 = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => client,
    });
    const r3 = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => client,
    });

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r1.source).toBe("redis");
  });

  it("denies when post-add count exceeds the limit", async () => {
    const { client } = makeFakeRedis({ zcardValues: [4] });

    const r = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => client,
    });

    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.source).toBe("redis");
  });

  it("fails closed when Redis client is null (e.g. REDIS_URL unset)", async () => {
    const r = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => null,
    });
    expect(r.allowed).toBe(false);
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toBe("no-client");
  });

  it("fails closed when the Redis pipeline throws", async () => {
    const { client } = makeFakeRedis({ throws: true });
    const r = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => client,
    });
    expect(r.allowed).toBe(false);
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toContain("pipeline");
  });

  it("fails closed on missing userId", async () => {
    const { client } = makeFakeRedis();
    const r = await checkRateLimit("", DEFAULT_CFG, {
      getClient: async () => client,
    });
    expect(r.allowed).toBe(false);
    expect(r.fallbackReason).toBe("missing-user-id");
  });

  it("respects failureMode: fail-open when configured", async () => {
    const r = await checkRateLimit(
      "user-1",
      { ...DEFAULT_CFG, failureMode: "fail-open" },
      { getClient: async () => null }
    );
    expect(r.allowed).toBe(true);
    expect(r.source).toBe("fallback");
  });

  it("fails closed when getClient itself throws", async () => {
    const r = await checkRateLimit("user-1", DEFAULT_CFG, {
      getClient: async () => {
        throw new Error("connect refused");
      },
    });
    expect(r.allowed).toBe(false);
    expect(r.source).toBe("fallback");
    expect(r.fallbackReason).toContain("client-init");
  });
});
