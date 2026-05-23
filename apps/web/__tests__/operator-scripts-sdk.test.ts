import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const READINESS = resolve(repoRoot, "scripts/check-deploy-readiness.mjs");
const ROTATE = resolve(repoRoot, "scripts/rotate-anthropic-key.mjs");

describe("operator scripts — Anthropic SDK migration", () => {
  describe("scripts/check-deploy-readiness.mjs", () => {
    const src = readFileSync(READINESS, "utf8");

    it("uses the @anthropic-ai/sdk client for the verify-ping", () => {
      expect(src).toMatch(/import\(["']@anthropic-ai\/sdk["']\)/);
      expect(src).toMatch(/new\s+Anthropic\s*\(/);
      expect(src).toMatch(/client\.messages\.create/);
    });

    it("no longer hand-rolls a fetch against api.anthropic.com/v1/messages", () => {
      expect(src).not.toMatch(/fetch\(["']https:\/\/api\.anthropic\.com\/v1\/messages/);
    });

    it("uses the canonical Haiku alias (no date suffix)", () => {
      expect(src).toMatch(/claude-haiku-4-5["']/);
      expect(src).not.toMatch(/claude-haiku-4-5-20\d{6}/);
    });
  });

  describe("scripts/rotate-anthropic-key.mjs", () => {
    const src = readFileSync(ROTATE, "utf8");

    it("uses the @anthropic-ai/sdk client inside verifyKey", () => {
      expect(src).toMatch(/import\(["']@anthropic-ai\/sdk["']\)/);
      expect(src).toMatch(/new\s+Anthropic\s*\(/);
      expect(src).toMatch(/client\.messages\.create/);
    });

    it("no longer fetches /v1/messages directly (Admin API fetches stay — SDK does not surface them)", () => {
      expect(src).not.toMatch(/fetch\(["']https:\/\/api\.anthropic\.com\/v1\/messages/);
      // Admin API URLs are still allowed (no SDK binding).
      expect(src).toMatch(/api\.anthropic\.com\/v1\/organizations\/api_keys/);
    });

    it("uses the canonical Haiku alias (no date suffix) in verifyKey", () => {
      expect(src).toMatch(/claude-haiku-4-5["']/);
      expect(src).not.toMatch(/claude-haiku-4-5-20\d{6}/);
    });
  });
});
