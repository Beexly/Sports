import { describe, expect, it, vi } from "vitest";
import { persistResearchArtifact, researchArtifactDigest } from "../research-artifact.js";

const RAW = new TextEncoder().encode("# Muse research artifact\n\nVerified body.\n");
const INPUT = {
  provider: "muse",
  sourceKind: "RESEARCH_ARTIFACT" as const,
  externalId: "nfl-analytics-reverse-engineering-2026-09-24",
  repoPath: "docs/research/2026-09-24-muse/nfl-analytics-reverse-engineering.md",
  title: "NFL analytics reverse engineering — Muse",
  summary: "Checksum-verified research artifact; not a live signal.",
  fetchedAt: new Date("2026-09-24T12:00:00.000Z"),
  raw: RAW,
  tags: ["research", "muse", "internal"],
};

describe("research artifact durable ingestion", () => {
  it("hashes exact bytes and writes a reference record", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "snap-1" });
    const result = await persistResearchArtifact(INPUT, {
      sourceSnapshot: { findFirst, create },
    });
    expect(result).toMatchObject({ status: "ok", id: "snap-1", deduped: false });
    expect(result.status === "ok" && result.sha256).toBe(researchArtifactDigest(RAW));
    expect(result.status === "ok" && result.bytes).toBe(RAW.byteLength);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "muse",
        externalId: INPUT.externalId,
        payloadHash: result.status === "ok" ? result.sha256 : expect.any(String),
        payloadBytes: RAW.byteLength,
      }),
    });
  });

  it("deduplicates the same logical artifact before creating a second row", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "snap-existing",
      payloadHash: researchArtifactDigest(RAW),
      payloadBytes: RAW.byteLength,
    });
    const create = vi.fn();
    const result = await persistResearchArtifact(INPUT, {
      sourceSnapshot: { findFirst, create },
    });
    expect(result).toMatchObject({ status: "ok", id: "snap-existing", deduped: true });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a checksum conflict for the same logical artifact", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "snap-existing",
      payloadHash: "different-hash",
      payloadBytes: RAW.byteLength,
    });
    const create = vi.fn();
    const result = await persistResearchArtifact(INPUT, {
      sourceSnapshot: { findFirst, create },
    });
    expect(result).toEqual({ status: "error", error: "research artifact checksum conflict" });
    expect(create).not.toHaveBeenCalled();
  });

  it("refetches a concurrent unique-constraint winner and returns its stored hash", async () => {
    const existing = {
      id: "snap-race",
      payloadHash: researchArtifactDigest(RAW),
      payloadBytes: RAW.byteLength,
    };
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    const conflict = Object.assign(new Error("unique constraint failed"), { code: "P2002" });
    const create = vi.fn().mockRejectedValue(conflict);
    const result = await persistResearchArtifact(INPUT, {
      sourceSnapshot: { findFirst, create },
    });
    expect(result).toMatchObject({ status: "ok", id: "snap-race", deduped: true, sha256: existing.payloadHash });
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty artifact without touching the store", async () => {
    const findFirst = vi.fn();
    const create = vi.fn();
    const result = await persistResearchArtifact({ ...INPUT, raw: new Uint8Array() }, {
      sourceSnapshot: { findFirst, create },
    });
    expect(result).toEqual({ status: "error", error: "artifact is empty" });
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
