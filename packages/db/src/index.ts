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
 * When DEMO_PICKS_ENABLED=true the pick model returns sample picks.
 * Sample picks are all result=PENDING — no fake win rates.
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

function pickStub() {
  const samplesActive = isDemoPicksEnabled();
  return {
    findMany: async (args?: AnyArgs) => {
      if (!samplesActive) return [];
      let picks = getSamplePicks();
      const where = (args?.["where"] ?? {}) as Record<string, unknown>;
      if (where["isBootstrap"] === true) return [];
      if (
        where["result"] === "VOID" ||
        where["result"] === "WIN" ||
        where["result"] === "LOSS" ||
        where["result"] === "PUSH"
      ) {
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
      const take =
        typeof args?.["take"] === "number" ? (args["take"] as number) : picks.length;
      return picks.slice(0, take);
    },
    findFirst: async (_a?: AnyArgs) => null,
    findUnique: async (_a?: AnyArgs) => null,
    count: async (args?: AnyArgs) => {
      if (!samplesActive) return 0;
      const where = (args?.["where"] ?? {}) as Record<string, unknown>;
      if (where["isBootstrap"] === true) return 0;
      if (typeof where["result"] === "string") {
        if (where["result"] === "PENDING") return SAMPLE_PICK_COUNT;
        return 0;
      }
      return SAMPLE_PICK_COUNT;
    },
    create: async () => ({ id: "stub" }),
    update: async () => ({ id: "stub" }),
    delete: async () => ({ id: "stub" }),
    deleteMany: async () => ({ count: 0 }),
    updateMany: async () => ({ count: 0 }),
    createMany: async () => ({ count: 0 }),
    aggregate: async () => ({ _count: 0 }),
    groupBy: async () => [],
  };
}

function makeStubClient(): PrismaClient {
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === "\$connect" || prop === "\$disconnect") return async () => {};
      if (prop === "\$transaction") {
        return async (fn: (tx: unknown) => unknown) => fn(makeStubClient());
      }
      if (prop === "\$queryRaw" || prop === "\$executeRaw") {
        return async () => {
          throw new Error("stub Prisma client: raw queries unavailable");
        };
      }
      if (prop === "pick") return pickStub();
      return {
        findMany: async () => [],
        findFirst: async () => null,
        findUnique: async () => null,
        count: async () => 0,
        create: async () => ({ id: "stub" }),
        update: async () => ({ id: "stub" }),
        delete: async () => ({ id: "stub" }),
        deleteMany: async () => ({ count: 0 }),
        updateMany: async () => ({ count: 0 }),
        createMany: async () => ({ count: 0 }),
        aggregate: async () => ({ _count: 0 }),
        groupBy: async () => [],
      };
    },
  };
  return new Proxy({}, handler) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaStubMode: boolean | undefined;
};

function buildClient(): PrismaClient {
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
        console.error(
          "[@sports/db] CRITICAL: stub Prisma client active in production. " +
            "DATABASE_URL is unset/sentinel and FORCE_REAL_PRISMA!=true — " +
            "writes are silently dropped. " +
            detail,
        );
      } else {
        console.warn(
          "[@sports/db] stub Prisma client active (DATABASE_URL not set). " + detail,
        );
      }
      globalForPrisma.prismaStubMode = true;
    }
    return makeStubClient();
  }

  if (process.env["NEON_SERVERLESS_DRIVER"] === "true") {
    try {
      if (!neonConfig.webSocketConstructor && typeof WebSocket === "undefined") {
        neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
      }
      const pool = new NeonPool({ connectionString: url });
      const adapter = new PrismaNeon(pool);
      return new PrismaClient({
        adapter,
        log:
          process.env["NODE_ENV"] === "development" ? ["error", "warn"] : ["error"],
      });
    } catch (err) {
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

export function isStubMode(): boolean {
  return Boolean(globalForPrisma.prismaStubMode);
}

export { isDemoPicksEnabled, getSamplePicks, SAMPLE_PICK_COUNT };
export type { SamplePick } from "./sample-picks.js";

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

export {
  probeNeonPool,
  getNeonPoolCounters,
  classifyLatency,
  resetNeonPoolCountersForTests,
} from "./neon-pool-monitor.js";
export type {
  NeonPoolProbeResult,
  NeonPoolProbeStatus,
  NeonPoolMonitorCounters,
  ProbeOptions,
} from "./neon-pool-monitor.js";
