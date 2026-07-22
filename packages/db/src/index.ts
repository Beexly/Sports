import { PrismaClient } from "@prisma/client";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
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

export function isStubDbUrl(url: string | undefined): boolean {
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
  // Resilience against env-var scope confusion: the Vercel↔Neon integration
  // manages POSTGRES_PRISMA_URL / DATABASE_URL_UNPOOLED, which are always present,
  // whereas a manually-set DATABASE_URL/DIRECT_URL can end up scoped to the wrong
  // target and read empty at runtime. Fall back to the integration-managed vars
  // ONLY when ours are unset — never override a value we already have.
  if (!process.env["DATABASE_URL"] && process.env["POSTGRES_PRISMA_URL"]) {
    process.env["DATABASE_URL"] = process.env["POSTGRES_PRISMA_URL"];
  }
  if (!process.env["DIRECT_URL"]) {
    const directFallback =
      process.env["DATABASE_URL_UNPOOLED"] ??
      process.env["POSTGRES_URL_NON_POOLING"] ??
      process.env["DATABASE_URL"];
    if (directFallback) process.env["DIRECT_URL"] = directFallback;
  }

  const url = process.env["DATABASE_URL"];
  const force = process.env["FORCE_REAL_PRISMA"] === "true";

  if (!force && isStubDbUrl(url)) {
    if (!globalForPrisma.prismaStubMode) {
      const detail = isDemoPicksEnabled()
        ? "DEMO_PICKS_ENABLED=true — pick.findMany returns sample data."
        : "All reads return empty results.";
      if (process.env["NODE_ENV"] === "production") {
        // Never silent in prod: a stub client here means DATABASE_URL is
        // unset/sentinel and FORCE_REAL_PRISMA!=true, so every write is
        // dropped and every read is empty while jobs still report success.
        // eslint-disable-next-line no-console
        console.error(
          "[@sports/db] CRITICAL: stub Prisma client active in production. " +
            "DATABASE_URL is unset/sentinel and FORCE_REAL_PRISMA!=true — " +
            "writes are silently dropped. " +
            detail
        );
      } else {
        // eslint-disable-next-line no-console
        console.warn("[@sports/db] stub Prisma client active (DATABASE_URL not set). " + detail);
      }
      globalForPrisma.prismaStubMode = true;
    }
    return makeStubClient();
  }

  // Neon serverless HTTP/WebSocket driver (opt-in via NEON_SERVERLESS_DRIVER=true).
  // Raw TCP to Neon's pooler flakes on serverless cold starts (the recurring
  // "Can't reach database server at ...neon.tech:5432" cluster in prod). The
  // serverless driver speaks Neon's protocol over WebSockets, which tolerates
  // cold starts far better. Ships dark: default path below is byte-identical
  // until the flag is set, and any adapter failure falls back to the default
  // driver with a loud warning instead of taking the app down.
  if (process.env["NEON_SERVERLESS_DRIVER"] === "true") {
    try {
      if (!neonConfig.webSocketConstructor && typeof WebSocket === "undefined") {
        // Node runtimes without a global WebSocket need one for Neon's Pool.
        neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
      }
      const pool = new NeonPool({ connectionString: url });
      const adapter = new PrismaNeon(pool);
      return new PrismaClient({
        adapter,
        log: process.env["NODE_ENV"] === "development" ? ["error", "warn"] : ["error"],
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[@sports/db] NEON_SERVERLESS_DRIVER=true but the serverless adapter " +
          `failed to initialize (${err instanceof Error ? err.message : String(err)}); ` +
          "falling back to the default pg driver.",
      );
    }
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

// Durable-write capability gate (fail-closed guard for protected writes that
// precede external side effects — e.g. Stripe checkout). See
// durable-write-guard.ts for the contract.
export {
  DURABLE_WRITE_CAPABILITIES,
  DurableWriteStoreUnavailableError,
  evaluateDurableWriteStore,
  requireDurableWriteStore,
} from "./durable-write-guard.js";
export type {
  DurableWriteCapability,
  DurableWriteDenialReason,
  DurableWriteStoreEvaluation,
  DurableWriteStoreEvaluationInput,
} from "./durable-write-guard.js";

export * from "@prisma/client";
