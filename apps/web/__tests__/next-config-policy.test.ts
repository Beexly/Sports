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

  it("forces HTTPS via a long-lived Strict-Transport-Security header", () => {
    expect(src).toMatch(/Strict-Transport-Security[\s\S]*max-age=63072000/);
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

  it("image remotePatterns are explicitly allow-listed (no hostname wildcards)", () => {
    // We allow GitHub avatars + Google profile photos via remotePatterns.
    // The deprecated `domains` array must not be present.
    expect(src).not.toMatch(/^\s*domains\s*:/m);
    expect(src).toMatch(/remotePatterns/);
    // No glob-style hostname wildcards in the pattern list.
    const block = src.match(/remotePatterns[\s\S]*?\]/);
    if (block) {
      expect(block[0]).not.toMatch(/"hostname"\s*:\s*"\*\*/);
    }
  });

  it("emits a Content-Security-Policy header on every route", () => {
    expect(src).toMatch(/Content-Security-Policy/);
    // Must include the restrictive object-src and base-uri directives.
    expect(src).toMatch(/object-src.*'none'/);
    expect(src).toMatch(/base-uri.*'self'/);
  });
});
