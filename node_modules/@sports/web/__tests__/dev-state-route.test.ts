import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * /api/dev/state — source-level + behavioural tests.
 *
 * Verifies the route returns the right shape in dev and 404s in prod.
 */

async function callGet(): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  const mod = await import("@/app/api/dev/state/route");
  const res = (await mod.GET()) as unknown as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/dev/state", () => {
  beforeEach(() => {
    (process.env as { NODE_ENV?: string })["NODE_ENV"] = "development";
    process.env["DATABASE_URL"] = "stub";
    process.env["DEMO_PICKS_ENABLED"] = "true";
    process.env["DEV_FAKE_ADMIN"] = "true";
  });

  it("returns 200 in development with the right shape", async () => {
    const { status, body } = await callGet();
    expect(status).toBe(200);
    expect(body["nodeEnv"]).toBe("development");
    expect(body["stubMode"]).toBe(true);
    expect(body["demoPicksEnabled"]).toBe(true);
    expect(body["devFakeAdmin"]).toBe(true);
    expect(typeof body["samplePickCount"]).toBe("number");
    expect(body["gates"]).toBeDefined();
    expect(body["externalConfig"]).toBeDefined();
    expect(body["appVersion"]).toBeDefined();
    expect(typeof body["timestamp"]).toBe("string");
  });

  it("flips demoPicksEnabled with the env flag", async () => {
    process.env["DEMO_PICKS_ENABLED"] = "false";
    const { body } = await callGet();
    expect(body["demoPicksEnabled"]).toBe(false);
  });

  it("returns 404 in production", async () => {
    (process.env as { NODE_ENV?: string })["NODE_ENV"] = "production";
    const { status, body } = await callGet();
    expect(status).toBe(404);
    expect(body["error"]).toBe("not-found");
  });
});
