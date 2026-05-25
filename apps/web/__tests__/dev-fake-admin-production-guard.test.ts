import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level contract: every DEV_FAKE_ADMIN bypass must be gated on
 * NODE_ENV !== "production" so that accidentally setting this env var on
 * a real deployment can never grant synthetic ADMIN sessions or ELITE
 * entitlements.
 *
 * This test intentionally walks the source text rather than importing
 * the modules, so it catches the guard even when the module is not
 * executed at test time.
 */

const root = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("DEV_FAKE_ADMIN production guard", () => {
  it('auth.ts auth() bypass is gated on NODE_ENV !== "production"', () => {
    const src = read("lib/auth.ts");
    // The bypass block that returns the synthetic ADMIN session must sit
    // behind the NODE_ENV check on the same conditional line.
    expect(src).toMatch(
      /NODE_ENV.*!==.*"production".*&&.*DEV_FAKE_ADMIN.*===.*"true"|DEV_FAKE_ADMIN.*===.*"true".*&&.*NODE_ENV.*!==.*"production"/
    );
  });

  it('auth.ts DEV_FAKE_ADMIN constant export is gated on NODE_ENV !== "production"', () => {
    const src = read("lib/auth.ts");
    // The exported constant used by dashboard banners must also be false in production.
    expect(src).toMatch(
      /export const DEV_FAKE_ADMIN\s*=\s*process\.env\["NODE_ENV"\]\s*!==\s*"production"/
    );
  });

  it('middleware.ts bypass is gated on NODE_ENV !== "production"', () => {
    const src = read("middleware.ts");
    expect(src).toMatch(
      /NODE_ENV.*!==.*"production".*&&.*DEV_FAKE_ADMIN.*===.*"true"|DEV_FAKE_ADMIN.*===.*"true".*&&.*NODE_ENV.*!==.*"production"/
    );
  });

  it('entitlements.ts shortcut is gated on NODE_ENV !== "production"', () => {
    const src = read("lib/entitlements.ts");
    expect(src).toMatch(
      /NODE_ENV.*!==.*"production".*&&.*DEV_FAKE_ADMIN.*===.*"true"|DEV_FAKE_ADMIN.*===.*"true".*&&.*NODE_ENV.*!==.*"production"/
    );
  });

  it("no DEV_FAKE_ADMIN check anywhere in auth/entitlements/middleware is missing the NODE_ENV guard", () => {
    const files = [
      { rel: "lib/auth.ts", label: "auth.ts" },
      { rel: "lib/entitlements.ts", label: "entitlements.ts" },
      { rel: "middleware.ts", label: "middleware.ts" },
    ];
    for (const { rel, label } of files) {
      const src = read(rel);
      // Find lines that check DEV_FAKE_ADMIN but do NOT also check NODE_ENV
      const lines = src.split("\n");
      const violations = lines.filter((line) => {
        const hasFakeAdminCheck = /process\.env\[["']DEV_FAKE_ADMIN["']\]\s*===\s*["']true["']/.test(line);
        const hasNodeEnvGuard = /NODE_ENV/.test(line);
        return hasFakeAdminCheck && !hasNodeEnvGuard;
      });
      expect(
        violations,
        `${label} has DEV_FAKE_ADMIN check without NODE_ENV guard:\n${violations.join("\n")}`
      ).toHaveLength(0);
    }
  });
});
