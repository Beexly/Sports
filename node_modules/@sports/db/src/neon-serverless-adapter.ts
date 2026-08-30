/**
 * Optional Neon serverless driver adapter for Prisma.
 *
 * Off by default. Activated only when:
 *   NEON_SERVERLESS_DRIVER=true
 *   AND `@neondatabase/serverless` + `@prisma/adapter-neon` are installed
 *
 * Why optional:
 *   - The default `pg` driver works fine; the serverless driver is a
 *     cold-start latency optimization specific to Vercel/edge runtimes.
 *   - Adding the deps as required would force a `npm install` cycle
 *     before anything could even build.
 *
 * Activation steps (for the operator, when ready):
 *   1. `npm install @neondatabase/serverless @prisma/adapter-neon`
 *      in packages/db/package.json (or the root if hoisted).
 *   2. In `packages/db/prisma/schema.prisma`, add to the generator block:
 *        previewFeatures = ["driverAdapters"]
 *   3. `npm run db:generate`
 *   4. Set `NEON_SERVERLESS_DRIVER=true` in env.
 *   5. Re-run `npm run deploy:ready` to confirm the connection is green.
 *
 * Rollback:
 *   - Unset NEON_SERVERLESS_DRIVER. The default `pg` driver path resumes.
 *
 * This module uses dynamic `import()` so that, while the flag is off OR
 * the deps are not installed, the rest of `packages/db` still compiles
 * and runs identically to today. The function below resolves to `null`
 * if the imports fail, and the caller falls back to the default driver.
 */

import type { PrismaClient } from "@prisma/client";

type DynamicImport = (specifier: string) => Promise<unknown>;

const optionalImport = new Function(
  "specifier",
  "return import(specifier)"
) as DynamicImport;

// These two optional driver packages are dynamically import()-ed specifically so this
// file still compiles and runs identically even if the packages are not installed;
// importing their real types statically would break that guarantee at type-check time,
// so these interfaces describe only the exact shape this file actually uses.
interface NeonPoolCtor {
  new (config: { connectionString: string }): unknown;
}
interface PrismaNeonCtor {
  new (pool: unknown): unknown;
}

export interface NeonAdapterClient {
  client: PrismaClient;
  source: "neon-serverless";
}

/**
 * Build a Prisma client backed by the Neon serverless driver, or return
 * null if any precondition isn't met. Caller is responsible for the
 * fallback path.
 */
export async function tryBuildNeonServerlessClient(): Promise<NeonAdapterClient | null> {
  if (process.env["NEON_SERVERLESS_DRIVER"] !== "true") return null;
  const url = process.env["DATABASE_URL"];
  if (!url) return null;

  // Dynamic imports — fail closed if deps are not installed.
  let Pool: NeonPoolCtor | undefined;
  let PrismaNeon: PrismaNeonCtor | undefined;
  try {
    const neon = (await optionalImport("@neondatabase/serverless")) as { Pool: NeonPoolCtor };
    Pool = neon.Pool;
    const adapter = (await optionalImport("@prisma/adapter-neon")) as { PrismaNeon: PrismaNeonCtor };
    PrismaNeon = adapter.PrismaNeon;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[@sports/db] NEON_SERVERLESS_DRIVER=true but adapter deps are not installed: " +
        (err instanceof Error ? err.message : String(err)) +
        " — falling back to default driver."
    );
    return null;
  }

  if (!Pool || !PrismaNeon) return null;

  try {
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaNeon(pool);

    // Late-bind PrismaClient so we don't break tsc when the preview
    // feature isn't enabled (the `adapter` option only exists when
    // driverAdapters is on).
    const mod = await import("@prisma/client");
    const Ctor = mod.PrismaClient as unknown as new (
      args: Record<string, unknown>
    ) => PrismaClient;
    const client = new Ctor({
      adapter,
      log:
        process.env["NODE_ENV"] === "development"
          ? ["error", "warn"]
          : ["error"],
    });
    return { client, source: "neon-serverless" };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[@sports/db] Failed to build Neon serverless client: " +
        (err instanceof Error ? err.message : String(err)) +
        " — falling back to default driver."
    );
    return null;
  }
}
