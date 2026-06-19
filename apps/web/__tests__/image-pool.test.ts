/**
 * Tests for lib/media/image-pool.ts
 *
 * Covers:
 *   - URL building: encoding, dimensions, seed
 *   - Provider ordering (Pollinations first, branded-fallback last)
 *   - listImageProviders: returns ids/labels, excludes sentinel
 *   - primaryImageUrl: returns first provider URL
 *   - Prompt sanitization: newlines stripped, length capped
 *   - Deterministic seed from prompt (same input → same seed)
 */

import { describe, it, expect } from "vitest";
import {
  imageSourcePool,
  primaryImageUrl,
  listImageProviders,
  BRANDED_FALLBACK_ID,
} from "@/lib/media/image-pool";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pollinationsUrl(pool: ReturnType<typeof imageSourcePool>) {
  return pool.find((p) => p.id === "pollinations")?.url ?? null;
}

// ── imageSourcePool ───────────────────────────────────────────────────────────

describe("imageSourcePool", () => {
  it("returns an array with at least 2 real providers and a branded-fallback sentinel", () => {
    const pool = imageSourcePool("test prompt");
    expect(pool.length).toBeGreaterThanOrEqual(2);
    const last = pool[pool.length - 1]!;
    expect(last.id).toBe(BRANDED_FALLBACK_ID);
  });

  it("puts Pollinations first", () => {
    const pool = imageSourcePool("NBA game signal");
    expect(pool[0]!.id).toBe("pollinations");
  });

  it("branded-fallback is always last", () => {
    const pool = imageSourcePool("some prompt");
    const last = pool[pool.length - 1]!;
    expect(last.id).toBe(BRANDED_FALLBACK_ID);
    expect(last.url).toBe("");
  });

  it("Pollinations URL encodes the prompt correctly", () => {
    const prompt = "abstract sports data galaxy";
    const pool = imageSourcePool(prompt);
    const url = pollinationsUrl(pool)!;
    expect(url).toContain(encodeURIComponent(prompt));
  });

  it("Pollinations URL includes nologo=true", () => {
    const pool = imageSourcePool("signal visualization");
    const url = pollinationsUrl(pool)!;
    expect(url).toContain("nologo=true");
  });

  it("respects custom width and height in Pollinations URL", () => {
    const pool = imageSourcePool("test", { width: 800, height: 400 });
    const url = pollinationsUrl(pool)!;
    expect(url).toContain("width=800");
    expect(url).toContain("height=400");
  });

  it("uses default 1200x630 when no dimensions provided", () => {
    const pool = imageSourcePool("test");
    const url = pollinationsUrl(pool)!;
    expect(url).toContain("width=1200");
    expect(url).toContain("height=630");
  });

  it("uses a custom seed when provided", () => {
    const pool = imageSourcePool("test prompt", { seed: 42 });
    const url = pollinationsUrl(pool)!;
    expect(url).toContain("seed=42");
  });

  it("produces a deterministic seed from the prompt (same prompt → same seed)", () => {
    const pool1 = imageSourcePool("deterministic prompt");
    const pool2 = imageSourcePool("deterministic prompt");
    const url1 = pollinationsUrl(pool1)!;
    const url2 = pollinationsUrl(pool2)!;
    expect(url1).toBe(url2);
  });

  it("produces different seeds for different prompts", () => {
    const pool1 = imageSourcePool("NBA playoff signal");
    const pool2 = imageSourcePool("NFL line movement data");
    const url1 = pollinationsUrl(pool1)!;
    const url2 = pollinationsUrl(pool2)!;
    expect(url1).not.toBe(url2);
  });

  it("strips newlines from prompts", () => {
    const pool = imageSourcePool("abstract\ncosmics\r\nsports");
    const url = pollinationsUrl(pool)!;
    // Newlines should not appear in the encoded URL as %0A or %0D
    expect(url).not.toContain("%0A");
    expect(url).not.toContain("%0D");
  });

  it("caps prompt at 200 characters at word boundary", () => {
    const longPrompt = "word ".repeat(50); // 250 chars
    const pool = imageSourcePool(longPrompt);
    const url = pollinationsUrl(pool)!;
    // The encoded prompt section should not exceed ~200 chars when decoded
    const promptMatch = url.match(/\/prompt\/([^?]+)/);
    expect(promptMatch).not.toBeNull();
    const decoded = decodeURIComponent(promptMatch![1]!);
    expect(decoded.length).toBeLessThanOrEqual(200);
  });

  it("each provider entry has id, label, and url fields", () => {
    const pool = imageSourcePool("galaxy sports edge signal");
    for (const provider of pool) {
      expect(typeof provider.id).toBe("string");
      expect(provider.id.length).toBeGreaterThan(0);
      expect(typeof provider.label).toBe("string");
      expect(provider.label.length).toBeGreaterThan(0);
      expect(typeof provider.url).toBe("string");
    }
  });

  it("only the branded-fallback sentinel has an empty URL", () => {
    const pool = imageSourcePool("test");
    const emptyUrls = pool.filter((p) => p.url === "");
    expect(emptyUrls).toHaveLength(1);
    expect(emptyUrls[0]!.id).toBe(BRANDED_FALLBACK_ID);
  });
});

// ── primaryImageUrl ───────────────────────────────────────────────────────────

describe("primaryImageUrl", () => {
  it("returns the URL of the first provider (Pollinations)", () => {
    const prompt = "cosmic sports galaxy";
    const primary = primaryImageUrl(prompt);
    const pool = imageSourcePool(prompt);
    expect(primary).toBe(pool[0]!.url);
  });

  it("returns a non-empty string", () => {
    const url = primaryImageUrl("test prompt");
    expect(url.length).toBeGreaterThan(0);
  });

  it("propagates opts to the pool", () => {
    const url = primaryImageUrl("test", { width: 600, height: 300, seed: 99 });
    expect(url).toContain("width=600");
    expect(url).toContain("height=300");
    expect(url).toContain("seed=99");
  });
});

// ── listImageProviders ────────────────────────────────────────────────────────

describe("listImageProviders", () => {
  it("returns at least one provider", () => {
    const providers = listImageProviders();
    expect(providers.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT include the branded-fallback sentinel", () => {
    const providers = listImageProviders();
    const ids = providers.map((p) => p.id);
    expect(ids).not.toContain(BRANDED_FALLBACK_ID);
  });

  it("includes pollinations", () => {
    const providers = listImageProviders();
    const ids = providers.map((p) => p.id);
    expect(ids).toContain("pollinations");
  });

  it("every entry has a non-empty id and label", () => {
    const providers = listImageProviders();
    for (const provider of providers) {
      expect(provider.id.length).toBeGreaterThan(0);
      expect(provider.label.length).toBeGreaterThan(0);
    }
  });

  it("returns stable results on repeated calls", () => {
    const first = listImageProviders();
    const second = listImageProviders();
    expect(first).toEqual(second);
  });
});
