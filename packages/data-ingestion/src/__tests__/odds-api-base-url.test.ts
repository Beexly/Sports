import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ODDS_API_BASE_URL decides where every sportsbook quote in the system comes
 * from, and whatever it returns is persisted as a real, certifiable price.
 * The chaos override therefore must not be honorable in production.
 *
 * The value is resolved at module load, so each case re-imports the module
 * with a fresh registry rather than mutating an already-evaluated constant.
 */
const PROD_URL = "https://api.the-odds-api.com/v4";
const CHAOS_URL = "http://127.0.0.1:8475/odds-api/v4";

async function loadBaseUrl(): Promise<string> {
  vi.resetModules();
  const mod = await import("../config.js");
  return mod.ODDS_API_BASE_URL;
}

const saved = {
  base: process.env["ODDS_API_BASE_URL"],
  vercel: process.env["VERCEL_ENV"],
  node: process.env["NODE_ENV"],
};

beforeEach(() => {
  delete process.env["ODDS_API_BASE_URL"];
  delete process.env["VERCEL_ENV"];
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const [k, v] of [
    ["ODDS_API_BASE_URL", saved.base],
    ["VERCEL_ENV", saved.vercel],
    ["NODE_ENV", saved.node],
  ] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("ODDS_API_BASE_URL", () => {
  it("defaults to the real upstream when no override is set", async () => {
    await expect(loadBaseUrl()).resolves.toBe(PROD_URL);
  });

  it("honors the override outside production (the chaos stack's whole purpose)", async () => {
    process.env["ODDS_API_BASE_URL"] = CHAOS_URL;
    process.env["VERCEL_ENV"] = "preview";
    await expect(loadBaseUrl()).resolves.toBe(CHAOS_URL);
  });

  it("REFUSES the override when VERCEL_ENV=production", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env["ODDS_API_BASE_URL"] = CHAOS_URL;
    process.env["VERCEL_ENV"] = "production";

    await expect(loadBaseUrl()).resolves.toBe(PROD_URL);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/IGNORED in production/));
  });

  it("REFUSES the override when NODE_ENV=production and VERCEL_ENV is absent", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env["ODDS_API_BASE_URL"] = CHAOS_URL;
    process.env["NODE_ENV"] = "production";

    await expect(loadBaseUrl()).resolves.toBe(PROD_URL);
  });

  it("strips a trailing slash so callers never build a double-slashed path", async () => {
    process.env["ODDS_API_BASE_URL"] = `${CHAOS_URL}/`;
    process.env["VERCEL_ENV"] = "development";
    await expect(loadBaseUrl()).resolves.toBe(CHAOS_URL);
  });

  it("treats a whitespace-only override as unset rather than as a base URL", async () => {
    process.env["ODDS_API_BASE_URL"] = "   ";
    process.env["VERCEL_ENV"] = "development";
    await expect(loadBaseUrl()).resolves.toBe(PROD_URL);
  });
});
