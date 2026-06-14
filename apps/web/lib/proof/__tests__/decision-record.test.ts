/**
 * DecisionRecord — unit tests (Pillar C.2)
 *
 * Tests for:
 *   - canonicalDecisionPayload: determinism across link orderings
 *   - replayDecision: tamper detection (mocked DB)
 *   - commitDecisionRecord: idempotent upsert (mocked DB)
 *
 * DB is fully mocked — no real database connection required.
 * All imports use @/ aliases (resolved by the apps/web vitest config).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { hashLeaf } from "@sports/prediction-engine";
import type { ProvenanceChain, ProvenanceLink } from "@/lib/provenance/trace-claim";
import type { RightsSnapshot } from "@/lib/scraping/source-rights-registry";

// ─── Inline sha256 (mirrors the one in decision-record.ts) ───────────────────
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

// ─── Mock @sports/db ─────────────────────────────────────────────────────────
const mockDecisionRecord = {
  findUnique: vi.fn(),
  upsert: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
};

vi.mock("@sports/db", () => ({
  db: {
    decisionRecord: mockDecisionRecord,
  },
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

const approvedRights: RightsSnapshot = {
  source_id: "the-odds-api",
  source_url: "https://the-odds-api.com",
  status: "approved_api",
  automation_allowed: true,
  public_logged_off_allowed: true,
  commercial_display_allowed: true,
  storage_allowed: true,
  derived_analytics_allowed: true,
  model_training_allowed: false,
  attribution_required: false,
  attribution_text: null,
  reviewed_at: "2026-06-01",
  snapshotted_at: "2026-06-14T00:00:00.000Z",
};

function makeLink(key: string, kind: "CLAIM" | "CONTEXT" = "CLAIM"): ProvenanceLink {
  return {
    kind,
    signalKey: key,
    signalValue: 1.0,
    sourceName: "the-odds-api",
    trustLevel: 1.0,
    knownAt: "2026-06-14T10:00:00.000Z",
    payloadHash: "abc12345",
    rights: approvedRights,
    freshness: "FRESH",
    expiresAt: null,
  };
}

function makeChain(
  links: readonly ProvenanceLink[],
  overrides?: Partial<Omit<ProvenanceChain, "links">>
): ProvenanceChain {
  return {
    pickId: "pick-test-001",
    generatedAt: "2026-06-14T09:00:00.000Z",
    modelVersion: "v6.0.0",
    links,
    broadcastAllowed: true,
    attribution: [],
    unresolved: [],
    ...overrides,
  };
}

// ─── canonicalDecisionPayload tests ──────────────────────────────────────────

describe("canonicalDecisionPayload", () => {
  it("is deterministic — same chain produces same output", async () => {
    const { canonicalDecisionPayload } = await import("@/lib/proof/decision-record");
    const chain = makeChain([makeLink("a"), makeLink("b"), makeLink("c")]);
    const p1 = canonicalDecisionPayload(chain);
    const p2 = canonicalDecisionPayload(chain);
    expect(p1).toBe(p2);
  });

  it("is order-independent — shuffled links produce same output", async () => {
    const { canonicalDecisionPayload } = await import("@/lib/proof/decision-record");
    const chain1 = makeChain([makeLink("a"), makeLink("b"), makeLink("c")]);
    const chain2 = makeChain([makeLink("c"), makeLink("a"), makeLink("b")]);
    expect(canonicalDecisionPayload(chain1)).toBe(canonicalDecisionPayload(chain2));
  });

  it("produces different output for different chains", async () => {
    const { canonicalDecisionPayload } = await import("@/lib/proof/decision-record");
    const chain1 = makeChain([makeLink("alpha")]);
    const chain2 = makeChain([makeLink("beta")]);
    expect(canonicalDecisionPayload(chain1)).not.toBe(canonicalDecisionPayload(chain2));
  });

  it("encodes broadcastAllowed into the payload", async () => {
    const { canonicalDecisionPayload } = await import("@/lib/proof/decision-record");
    const chainTrue = makeChain([makeLink("a")], { broadcastAllowed: true });
    const chainFalse = makeChain([makeLink("a")], { broadcastAllowed: false });
    expect(canonicalDecisionPayload(chainTrue)).not.toBe(canonicalDecisionPayload(chainFalse));
  });
});

// ─── replayDecision tests ─────────────────────────────────────────────────────

describe("replayDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid: true when chainPayload has not been tampered with", async () => {
    const { canonicalDecisionPayload, replayDecision } = await import(
      "@/lib/proof/decision-record"
    );
    const chain = makeChain([makeLink("spread")]);
    const payload = canonicalDecisionPayload(chain);
    const pickRecord = { id: chain.pickId, payload };
    const leafHash = hashLeaf(sha256, pickRecord);

    mockDecisionRecord.findUnique.mockResolvedValue({
      id: chain.pickId,
      pickId: chain.pickId,
      chainPayload: payload,
      leafHash,
    });

    const result = await replayDecision(chain.pickId);
    expect(result.valid).toBe(true);
    expect(result.storedHash).toBe(leafHash);
    expect(result.recomputedHash).toBe(leafHash);
  });

  it("returns valid: false when chainPayload has been tampered with", async () => {
    const { canonicalDecisionPayload, replayDecision } = await import(
      "@/lib/proof/decision-record"
    );
    const chain = makeChain([makeLink("spread")]);
    const payload = canonicalDecisionPayload(chain);
    const pickRecord = { id: chain.pickId, payload };
    const originalLeafHash = hashLeaf(sha256, pickRecord);

    // Simulate a tampered payload
    const tamperedPayload = payload + "_TAMPERED";

    mockDecisionRecord.findUnique.mockResolvedValue({
      id: chain.pickId,
      pickId: chain.pickId,
      chainPayload: tamperedPayload,
      leafHash: originalLeafHash,
    });

    const result = await replayDecision(chain.pickId);
    expect(result.valid).toBe(false);
    expect(result.storedHash).toBe(originalLeafHash);
    expect(result.recomputedHash).not.toBe(originalLeafHash);
  });

  it("throws when no DecisionRecord exists for the given pickId", async () => {
    const { replayDecision } = await import("@/lib/proof/decision-record");
    mockDecisionRecord.findUnique.mockResolvedValue(null);
    await expect(replayDecision("non-existent-pick")).rejects.toThrow(
      "No DecisionRecord for pick non-existent-pick"
    );
  });
});

// ─── commitDecisionRecord tests ───────────────────────────────────────────────

describe("commitDecisionRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls upsert with correct pickId, leafHash, and empty update (immutable)", async () => {
    const { commitDecisionRecord } = await import("@/lib/proof/decision-record");
    mockDecisionRecord.upsert.mockResolvedValue({});

    const chain = makeChain([makeLink("home_spread")]);
    await commitDecisionRecord(chain);

    expect(mockDecisionRecord.upsert).toHaveBeenCalledTimes(1);
    const call = mockDecisionRecord.upsert.mock.calls[0]![0];
    expect(call.where.pickId).toBe(chain.pickId);
    expect(call.create.pickId).toBe(chain.pickId);
    expect(call.create.modelVersion).toBe(chain.modelVersion);
    expect(typeof call.create.leafHash).toBe("string");
    expect(call.create.leafHash.length).toBe(64); // sha256 hex
    // CRITICAL: update must be empty object — ensures IMMUTABILITY
    expect(call.update).toEqual({});
  });

  it("is idempotent — calling twice results in update:{} on second call (no-op at DB level)", async () => {
    const { commitDecisionRecord } = await import("@/lib/proof/decision-record");
    mockDecisionRecord.upsert.mockResolvedValue({});

    const chain = makeChain([makeLink("home_spread")]);
    await commitDecisionRecord(chain);
    await commitDecisionRecord(chain);

    const calls = mockDecisionRecord.upsert.mock.calls;
    expect(calls).toHaveLength(2);
    // Both calls use update:{} — second is a no-op if record already exists
    expect(calls[0]![0].update).toEqual({});
    expect(calls[1]![0].update).toEqual({});
  });

  it("uses the latest knownAt from all links", async () => {
    const { commitDecisionRecord } = await import("@/lib/proof/decision-record");
    mockDecisionRecord.upsert.mockResolvedValue({});

    const older = { ...makeLink("a"), knownAt: "2026-06-14T08:00:00.000Z" } as ProvenanceLink;
    const newer = { ...makeLink("b"), knownAt: "2026-06-14T11:00:00.000Z" } as ProvenanceLink;
    const chain = makeChain([older, newer]);

    await commitDecisionRecord(chain);

    const call = mockDecisionRecord.upsert.mock.calls[0]![0];
    const knownAt: Date = call.create.knownAt;
    expect(knownAt.toISOString()).toBe("2026-06-14T11:00:00.000Z");
  });
});
