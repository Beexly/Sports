import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-pin test for the three segment error boundaries shipped this
 * run (stats / fantasy / intelligence). Mirrors critical-routes-shape's
 * readFileSync + regex idiom — NOT render-based — so it never depends on
 * Nav / next-navigation mounting in a test environment.
 *
 * Each boundary must keep the shape Next.js requires (a "use client"
 * component taking { error, reset }) AND the observability + recovery
 * wiring the run added, so a future refactor that drops captureError or
 * the retry button fails loudly here.
 */

const repoRoot = resolve(__dirname, "..");

const SEGMENT_BOUNDARIES = [
  { file: "app/stats/error.tsx", segment: "stats", recoveryHref: "/stats" },
  { file: "app/fantasy/error.tsx", segment: "fantasy", recoveryHref: "/fantasy" },
  { file: "app/intelligence/error.tsx", segment: "intelligence", recoveryHref: "/intelligence" },
] as const;

describe("segment error boundaries — shape and observability wiring", () => {
  for (const { file, segment, recoveryHref } of SEGMENT_BOUNDARIES) {
    const full = resolve(repoRoot, file);

    it(`${file} exists`, () => {
      expect(existsSync(full), `${file} must exist`).toBe(true);
    });

    it(`${file} is a client component taking { error, reset }`, () => {
      const src = readFileSync(full, "utf8");
      // (1) first non-empty content is the "use client" directive
      expect(src.replace(/^\s+/, ""), `${file} must start with "use client"`).toMatch(
        /^"use client";/,
      );
      // (2) accepts ({ error, reset }) with reset typed () => void
      expect(src, `${file} must destructure error`).toMatch(/\berror\b/);
      expect(src, `${file} must accept reset`).toMatch(/\breset\b/);
      expect(src, `${file} must type reset as () => void`).toMatch(/reset:\s*\(\)\s*=>\s*void/);
    });

    it(`${file} imports captureError and calls it with the digest in an effect`, () => {
      const src = readFileSync(full, "utf8");
      // (3) imports captureError from the observability/sentry module
      expect(src, `${file} must import captureError from the observability module`).toMatch(
        /import\s+\{[^}]*\bcaptureError\b[^}]*\}\s+from\s+["'][^"']*observability\/sentry["']/,
      );
      expect(src, `${file} must call captureError with the error digest`).toMatch(
        /captureError\(\s*error\s*,\s*\{\s*digest:\s*error\.digest\s*\}\s*\)/,
      );
    });

    it(`${file} wires the retry button to reset()`, () => {
      const src = readFileSync(full, "utf8");
      // (4) onClick={() => reset()}
      expect(src, `${file} must wire onClick to reset()`).toMatch(
        /onClick=\{\(\)\s*=>\s*reset\(\)\}/,
      );
    });

    it(`${file} offers a same-segment recovery link to ${recoveryHref}`, () => {
      const src = readFileSync(full, "utf8");
      // (5) recovery href back into the same segment
      expect(src, `${file} must link back to ${recoveryHref}`).toMatch(
        new RegExp(`href=["']${recoveryHref}["']`),
      );
    });

    it(`${file} tags its console.error with [${segment}]`, () => {
      const src = readFileSync(full, "utf8");
      // (6) console.error tag matches the segment
      expect(src, `${file} must tag console.error with [${segment}]`).toMatch(
        new RegExp(`console\\.error\\(\\s*["']\\[${segment}\\]`),
      );
    });
  }
});
