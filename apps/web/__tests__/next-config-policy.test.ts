import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * next.config.mjs policy.
 *
 * Pins the security-relevant configuration that lives in the Next.js
 * build config. The goal: catch a future refactor that silently
 * relaxes a header or exposes a secret env at build time.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "next.config.mjs"), "utf8");

describe("next.config.mjs — security policy", () => {
  it("does not explicitly disable React strict mode", () => {
    // Allowed: not setting reactStrictMode at all (Next.js defaults to true on dev).
    // Disallowed: `reactStrictMode: false`.
    expect(src).not.toMatch(/reactStrictMode\s*:\s*false/);
  });

  it("emits the X-Frame-Options DENY header on every route", () => {
    expect(src).toMatch(/X-Frame-Options/);
    expect(src).toMatch(/DENY/);
  });

  it("emits the X-Content-Type-Options nosniff header on every route", () => {
    expect(src).toMatch(/X-Content-Type-Options[\s\S]*nosniff/);
  });

  it("emits the Referrer-Policy strict-origin-when-cross-origin header", () => {
    expect(src).toMatch(/Referrer-Policy[\s\S]*strict-origin-when-cross-origin/);
  });

  it("locks down camera/microphone/geolocation via Permissions-Policy", () => {
    expect(src).toMatch(/Permissions-Policy/);
    expect(src).toMatch(/camera=\(\)/);
    expect(src).toMatch(/microphone=\(\)/);
    expect(src).toMatch(/geolocation=\(\)/);
  });

  it("does not expose secrets via the `env` config object", () => {
    // Next.js inlines anything under the top-level `env: {...}` into the
    // browser bundle. Any secret key (STRIPE_SECRET_*, *_SECRET, etc.)
    // appearing under env: would leak. Look for explicit risky names.
    const envBlock = src.match(/\benv\s*:\s*\{([^}]+)\}/);
    if (envBlock) {
      expect(envBlock[1]).not.toMatch(/STRIPE_SECRET|_SECRET|_PASSWORD|API_KEY/);
    }
    // Independent check: no `publicRuntimeConfig` exposing secrets.
    const pubRuntime = src.match(/publicRuntimeConfig\s*:\s*\{([^}]+)\}/);
    if (pubRuntime) {
      expect(pubRuntime[1]).not.toMatch(/STRIPE_SECRET|_SECRET|_PASSWORD|API_KEY/);
    }
  });

  it("image domains are explicitly allow-listed (not wildcarded)", () => {
    // We allow GitHub avatars + Google profile photos. Any unrelated
    // wildcard or non-https domain would be a leak vector.
    const m = src.match(/domains:\s*\[([^\]]+)\]/);
    if (m) {
      expect(m[1]).not.toMatch(/\*/);
    }
  });
});
