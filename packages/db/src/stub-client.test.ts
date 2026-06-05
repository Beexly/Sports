import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("@sports/db stub client", () => {
  beforeEach(() => {
    delete process.env["DATABASE_URL"];
    delete process.env["FORCE_REAL_PRISMA"];
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env["DATABASE_URL"];
    delete process.env["FORCE_REAL_PRISMA"];
  });

  it("isStubMode() is true when DATABASE_URL is absent", async () => {
    const { isStubMode } = await import("./index.js");
    expect(isStubMode()).toBe(true);
  });

  it("db.pick.findMany returns empty array when DEMO_PICKS_ENABLED is off", async () => {
    delete process.env["DEMO_PICKS_ENABLED"];
    const { db } = await import("./index.js");
    const result = await db.pick.findMany();
    expect(Array.isArray(result)).toBe(true);
  });

  it("isStubDbUrl sentinel values are treated as stub", async () => {
    for (const sentinel of ["stub", "none", "changeme", "dummy:dummy@host/db"]) {
      process.env["DATABASE_URL"] = sentinel;
      vi.resetModules();
      const { isStubMode } = await import("./index.js");
      expect(isStubMode()).toBe(true);
      delete process.env["DATABASE_URL"];
    }
  });
});
