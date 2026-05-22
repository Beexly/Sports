import { PrismaClient } from "@prisma/client";
import {
  getSamplePicks,
  isDemoPicksEnabled,
  SAMPLE_PICK_COUNT,
} from "./sample-picks.js";

/**
 * @sports/db — Prisma client with a graceful "no DB available" fallback.
 *
 * Production: when DATABASE_URL points at a real Postgres, the real
 * Prisma client is used.
 *
 * Local launch-night / sandbox: when DATABASE_URL is unset, set to a
 * sentinel ("stub", "dummy", "changeme*"), or otherwise unusable, a
 * stub client kicks in.
 *
 *   - findMany / groupBy → []
 *   - findFirst / findUnique → null
 *   - count → 0
 *   - aggregate → shape-correct zeros
 *   - write methods → no-op { id: "stub" } / { count: 0 }
 *
 * When DEMO_PICKS_ENABLED=true the pick model returns the sample picks
 * defined in sample-picks.ts so /picks and /dashboard show realistic
 * model output. Sample picks are all result=PENDING and accompanied by
 * a UI banner — no fake win rates are ever produced.
 *
 * To force the real client even with a missing DB, set FORCE_REAL_PRISMA=true.
 */

type AnyArgs = Record<string, unknown> | undefined;

function isStubDbUrl(url: string | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed === "") return true;
  if (trimmed.startsWith("changeme")) return true;
  if (trimmed.includes("dummy:dummy")) return true;
  if (trimmed === "stub" || trimmed === "none") return true;
  return false;
}

// --- Pick-specific stub (with optional sample data) -------------------

function pickStub() {
  const samplesActive = isDemoPicksEnabled();
  return {
    findMany: async (args?: AnyArgs) => {
      if (!samplesActive) return [];
      let picks = getSamplePicks();
      const where = (args?.["where"] ?? {}) as Record<string, unknown>;
      if (where["isBootstrap"] === true) return [];
      if (where["result"] === "VOID" || where["result"] === "WIN" || where["result"] === "LOSS" || where["result"] === "PUSH") {
        return [];
      }
      if (typeof where["result"] === "object" && where["result"] !== null) {
        const res = where["result"] as Record<string, unknown>;
        const inList = res["in"] as readonly string[] | undefined;
        if (inList && inList.every((r) => r !== "PENDING")) return [];
      }
      if (where["isFeatured"] === true) {
        picks = picks.filter((p) => p.isFeatured);
      }
      const take = typeof args?.["take"] === "number" ? (args["take"] as number) : picks.length;
      return picks.slice(0, take);
    },
    findFirst: async (_a?: AnyArgs) => null,
    findUnique: async (_a?: AnyArgs) => null,
    count: async (args?: AnyArgs) => {
      if (!samplesActive) return 0;
      const where = (args?.["where"] ?? {}) as Record<string, unknown>;
      // Anything that asks about settled / bootstrap / void → 0.
      if (where["isBootstrap"] === true) return 0;
      if (typeof where["result"] === "string") {
        if (where["result"] === "PENDING") return SAMPLE_PICK_COUNT;
        return 0;
      }
      if (typeof where["result"] === "object" && where["result"] !== null) {
        const res = where["result"] as Record<string, unknown>;
        const inList = res["in"] as readonly string[] | undefined;
        if (inList && inList.every((r) => r !== "PENDING")) return 0;
      }
      // isPublished filters allow all samples.
      if (where["isPublished"] === true || where["isPublished"] === undefined) {
        return SAMPLE_PICK_COUNT;
      }
      return 0;
    },
    aggregate: async (_a?: AnyArgs) => ({ _avg: {}, _sum: {}, _min: {}, _max: {}, _count: 0 }),
    create: async (_a?: AnyArgs) => ({ id: "stub" } as Record<string, unknown>),
    update: async (_a?: AnyArgs) => ({ id: "stub" } as Record<string, unknown>),
    upsert: async (_a?: AnyArgs) => ({ id: "stub" } as Record<string, unknown>),
    createMany: async (_a?: AnyArgs) => ({ count: 0 }),
    updateMany: async (_a?: AnyArgs) => ({ count: 0 }),
    deleteMany: async (_a?: AnyArgs) => ({ count: 0 }),
    delete: async (_a?: AnyArgs) => ({ id: "stub" } as Record<string, unknown>),
    groupBy: async (_a?: AnyArgs) => [],
  };
}

function makeModelStub() {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      const key = String(prop);
      if (key === "findMany" || key === "groupBy") return async (_a?: AnyArgs) => [];
      if (key === "findFirst" || key === "findUnique" || key === "findFirstOrThrow" || key === "findUniqueOrThrow") {
        return async (_a?: AnyArgs) => null;
      }
      if (key === "count") return async (_a?: AnyArgs) => 0;
      if (key === "aggregate") {
        return async (_a?: AnyArgs) => ({ _avg: {}, _sum: {}, _min: {}, _max: {}, _count: 0 });
      }
      if (key === "create" || key === "update" || key === "upsert") {
        return async (_a?: AnyArgs) => ({ id: "stub" } as Record<string, unknown>);
      }
      if (key === "createMany" || key === "updateMany" || key === "deleteMany" || key === "delete") {
        return async (_a?: AnyArgs) => ({ count: 0 });
      }
      return async (_a?: AnyArgs) => null;
    },
  };
  return new Proxy({}, handler);
}

function makeStubClient(): PrismaClient {
  const pick = pickStub();
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop) {
      const key = String(prop);
      if (key === "$connect" || key === "$disconnect") return async () => undefined;
      if (key === "$transaction") {
        return async (arg: unknown) => {
          if (typeof arg === "function") return (arg as (tx: unknown) => unknown)(makeStubClient());
          if (Array.isArray(arg)) return Promise.all(arg);
          return null;
        };
      }
      if (key === "$queryRaw" || key === "$executeRaw") return async () => [];
      if (key === "$on" || key === "$use" || key === "$extends") return () => undefined;
      if (typeof key === "string" && key.startsWith("$")) return () => undefined;
      if (key === "pick") return pick;
      return makeModelStub();
    },
  };
  return new Proxy<Record<string, unknown>>({}, handler) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaStubMode: boolean | undefined;
};

function buildClient(): PrismaClient {
  const url = process.env["DATABASE_URL"];
  const force = process.env["FORCE_REAL_PRISMA"] === "true";

  if (!force && isStubDbUrl(url)) {
    if (!globalForPrisma.prismaStubMode) {
      if (process.env["NODE_ENV"] !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[@sports/db] stub Prisma client active (DATABASE_URL not set). " +
            (isDemoPicksEnabled()
              ? "DEMO_PICKS_ENABLED=true — pick.findMany returns sample data."
              : "All reads return empty results.")
        );
      }
      globalForPrisma.prismaStubMode = true;
    }
    return makeStubClient();
  }

  return new PrismaClient({
    log: process.env["NODE_ENV"] === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? buildClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = db;
}

/** Returns true when @sports/db is operating in stub mode. */
export function isStubMode(): boolean {
  return Boolean(globalForPrisma.prismaStubMode);
}

export { isDemoPicksEnabled, getSamplePicks, SAMPLE_PICK_COUNT };
export type { SamplePick } from "./sample-picks.js";

export * from "@prisma/client";
