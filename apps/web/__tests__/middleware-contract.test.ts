import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * apps/web/middleware.ts + lib/auth.ts route-protection contract.
 *
 * The middleware does a cheap cookie check for /dashboard and /admin
 * routes; full auth + role check still happens at the page level. Pin
 * the contract so a refactor doesn't loosen the cookie check.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "middleware.ts"), "utf8");
const authSrc = readFileSync(resolve(repoRoot, "lib/auth.ts"), "utf8");

describe("middleware route protection", () => {
  it("protects /dashboard and /admin", () => {
    expect(src).toMatch(/PROTECTED_ROUTES/);
    expect(src).toMatch(/"\/dashboard"/);
    expect(src).toMatch(/"\/admin"/);
  });

  it("recognises the NextAuth.js v5 session cookies", () => {
    expect(src).toMatch(/authjs\.session-token/);
    expect(src).toMatch(/next-auth\.session-token/);
  });

  it("documents the DEV_FAKE_ADMIN bypass clearly", () => {
    expect(src).toMatch(/DEV_FAKE_ADMIN/);
    expect(src).toMatch(/dev-mode bypass|synthetic admin session/i);
  });

  it("guards the DEV_FAKE_ADMIN bypass with a NODE_ENV production check", () => {
    // The production guard must appear before the DEV_FAKE_ADMIN check so
    // that a mistakenly-set env var cannot bypass auth in production.
    expect(src).toMatch(/NODE_ENV.*!==.*production|NODE_ENV.*production.*!=/);
  });

  it("page-level role check is the source of truth (middleware is shallow)", () => {
    expect(src).toMatch(/role check|page level|page-level/i);
  });
});

describe("lib/auth.ts dev-bypass safety invariants", () => {
  it("guards the DEV_FAKE_ADMIN bypass with a NODE_ENV production check", () => {
    expect(authSrc).toMatch(/NODE_ENV.*!==.*production|NODE_ENV.*production.*!=/);
  });

  it("documents that the bypass is guarded against accidental production activation", () => {
    expect(authSrc).toMatch(/production.*guard|NODE_ENV.*guard|prevent.*accidental.*production|accidental.*production/i);
  });
});
