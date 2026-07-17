import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadSealedSlateView,
  renderableCommitmentOrNull,
} from "@/lib/sealed/sealed-slate-view";

/**
 * The Sealed Slate loader — pins the founder gate, the "no fabricated
 * commitment" guard, and the CI-enforced method-opacity guarantee: the loader
 * must select ONLY cryptographic commitment facts, never a field that would
 * reveal how a pick was made or leak its sealed contents.
 */

const VALID = {
  slateKey: "AMERICANFOOTBALL_NFL:2026-09-14",
  root: "a".repeat(64),
  count: 12,
  committedAt: new Date("2026-09-14T13:00:00.000Z"),
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadSealedSlateView — founder gate (SEALED_ENGINE_ENABLED, default off)", () => {
  it("returns the unpublished shape when the flag is unset", async () => {
    vi.unstubAllEnvs();
    const view = await loadSealedSlateView();
    expect(view.published).toBe(false);
    if (!view.published) {
      expect(view.reason).toContain("SEALED_ENGINE_ENABLED");
    }
  });

  it("returns the unpublished shape when the flag is any value other than the literal \"true\"", async () => {
    for (const val of ["false", "1", "TRUE", "yes", ""]) {
      vi.stubEnv("SEALED_ENGINE_ENABLED", val);
      const view = await loadSealedSlateView();
      expect(view.published, `flag="${val}" must not publish`).toBe(false);
    }
  });
});

describe("renderableCommitmentOrNull — the commitment display-guard (zero fabricated commitments)", () => {
  it("passes a well-formed, real commitment through with an ISO timestamp", () => {
    const c = renderableCommitmentOrNull(VALID);
    expect(c).not.toBeNull();
    expect(c).toEqual({
      slateKey: "AMERICANFOOTBALL_NFL:2026-09-14",
      root: "a".repeat(64),
      count: 12,
      committedAt: "2026-09-14T13:00:00.000Z",
    });
  });

  it("accepts a string committedAt and normalizes it to ISO", () => {
    const c = renderableCommitmentOrNull({ ...VALID, committedAt: "2026-09-14T13:00:00Z" });
    expect(c?.committedAt).toBe("2026-09-14T13:00:00.000Z");
  });

  it("rejects a root that is not a 64-hex digest (no fake-looking hash renders)", () => {
    expect(renderableCommitmentOrNull({ ...VALID, root: "not-a-hash" })).toBeNull();
    expect(renderableCommitmentOrNull({ ...VALID, root: "a".repeat(63) })).toBeNull();
    expect(renderableCommitmentOrNull({ ...VALID, root: "z".repeat(64) })).toBeNull();
  });

  it("rejects a non-positive or non-integer population count", () => {
    expect(renderableCommitmentOrNull({ ...VALID, count: 0 })).toBeNull();
    expect(renderableCommitmentOrNull({ ...VALID, count: -1 })).toBeNull();
    expect(renderableCommitmentOrNull({ ...VALID, count: 1.5 })).toBeNull();
  });

  it("rejects a malformed slate key", () => {
    expect(renderableCommitmentOrNull({ ...VALID, slateKey: "nfl-2026" })).toBeNull();
    expect(renderableCommitmentOrNull({ ...VALID, slateKey: "NFL:2026-9-1" })).toBeNull();
  });

  it("rejects an unparseable committedAt", () => {
    expect(renderableCommitmentOrNull({ ...VALID, committedAt: "not-a-date" })).toBeNull();
    expect(renderableCommitmentOrNull({ ...VALID, committedAt: new Date("nope") })).toBeNull();
  });
});

describe("loadSealedSlateView — method opacity (CI-enforced source contract)", () => {
  const src = readFileSync(join(__dirname, "..", "lib/sealed/sealed-slate-view.ts"), "utf8");

  it("never selects a method-bearing or content-bearing field", () => {
    for (const banned of [
      "payload",
      "edgeScore",
      "edgeIndex",
      "confidence",
      "modelVersion",
      "modelProb",
      "reason",
      "reasonCode",
      "factorBreakdown",
      "reasoningShort",
      "line",
      "entryOdds",
    ]) {
      expect(src, `loader must never select ${banned}`).not.toContain(`${banned}: true`);
    }
  });

  it("selects only the four public cryptographic commitment facts", () => {
    expect(src).toContain("slateKey: true");
    expect(src).toContain("root: true");
    expect(src).toContain("count: true");
    expect(src).toContain("committedAt: true");
  });
});
