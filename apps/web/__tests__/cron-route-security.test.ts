import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Cron route security contract.
 *
 * Every route under /api/cron/* must:
 *   1. Read the Authorization header and compare to CRON_SECRET.
 *   2. Return 401 or 500 if the secret is missing or wrong.
 *
 * This test prevents a regression where a new cron route is added
 * without the CRON_SECRET guard, leaving it open to unauthenticated
 * invocation from any HTTP client.
 */

const cronDir = resolve(
  __dirname,
  "..",
  "app",
  "api",
  "cron"
);

function readRoute(dir: string): string {
  return readFileSync(join(dir, "route.ts"), "utf8");
}

function listCronRoutes(): string[] {
  const entries = readdirSync(cronDir);
  return entries.filter((e) => {
    const p = join(cronDir, e);
    return statSync(p).isDirectory();
  });
}

describe("cron route security", () => {
  const routes = listCronRoutes();

  it("finds at least one cron route to audit", () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(routes)("route %s checks CRON_SECRET before acting", (name) => {
    const src = readRoute(join(cronDir, name));

    expect(
      src,
      `${name}/route.ts must read the Authorization header`
    ).toMatch(/authorization/i);

    expect(
      src,
      `${name}/route.ts must reference CRON_SECRET`
    ).toMatch(/CRON_SECRET/);

    expect(
      src,
      `${name}/route.ts must return 401 or 500 when secret is invalid`
    ).toMatch(/status:\s*(401|500)/);
  });
});
