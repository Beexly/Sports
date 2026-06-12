import { describe, it, expect } from "vitest";
import {
  classifyMemoryCandidate,
  shouldRemember,
  redactMemory,
  buildJarvisMemoryStatus,
  summarizeMemoryForOwner,
} from "../memory-protocol";
import type { JarvisMemoryRecord, MemoryCandidate } from "../memory-types";

const NOW = "2026-06-12T10:00:00.000Z";

function makeCandidate(overrides: Partial<MemoryCandidate> = {}): MemoryCandidate {
  return {
    type: "PROJECT_FACT",
    content: "GSE picks are versioned and auditable.",
    source: "owner",
    createdAt: NOW,
    tags: ["gse"],
    sensitive: false,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<JarvisMemoryRecord> = {}): JarvisMemoryRecord {
  return {
    id: "mem-1",
    type: "SYSTEM_STATE",
    content: "Ingestion healthy.",
    source: "jarvis",
    createdAt: NOW,
    backingStatus: "FILE_BACKED",
    tags: [],
    redacted: false,
    ...overrides,
  };
}

describe("buildJarvisMemoryStatus", () => {
  it("returns isWired: false — honest, not wired yet", () => {
    const status = buildJarvisMemoryStatus();
    expect(status.isWired).toBe(false);
    expect(status.backingStatus).toBe("DESIGNED");
    expect(status.truth).toMatch(/no queryable store|not wired/i);
    expect(status.limitations.length).toBeGreaterThan(0);
    expect(status.nextWiringStep.length).toBeGreaterThan(0);
  });
});

describe("shouldRemember", () => {
  it("returns true for DESIGN_DOCTRINE — always worth storing", () => {
    expect(shouldRemember(makeCandidate({ type: "DESIGN_DOCTRINE" }))).toBe(true);
  });

  it("returns true for PROMPT_PATTERN — always worth storing", () => {
    expect(shouldRemember(makeCandidate({ type: "PROMPT_PATTERN" }))).toBe(true);
  });

  it("returns false for empty content", () => {
    expect(shouldRemember(makeCandidate({ content: "   " }))).toBe(false);
  });
});

describe("classifyMemoryCandidate", () => {
  it("classifies SYSTEM_STATE as storable when captured fresh", () => {
    const result = classifyMemoryCandidate(makeCandidate({ type: "SYSTEM_STATE" }));
    expect(result.shouldRemember).toBe(true);
    expect(result.type).toBe("SYSTEM_STATE");
    expect(result.reason).toMatch(/fresh|expiry|stale/i);
  });

  it("classifies durable facts as storable with a reason", () => {
    const result = classifyMemoryCandidate(makeCandidate({ type: "RISK_RULE" }));
    expect(result.shouldRemember).toBe(true);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("rejects empty content regardless of type", () => {
    const result = classifyMemoryCandidate(
      makeCandidate({ type: "DECISION", content: "" })
    );
    expect(result.shouldRemember).toBe(false);
  });
});

describe("redactMemory", () => {
  it("redacts sensitive records and marks them redacted", () => {
    const record = makeRecord({
      content: "DB password=topsecret99 must rotate",
    });
    const redacted = redactMemory(record);
    expect(redacted.content).not.toContain("topsecret99");
    expect(redacted.content).toContain("[REDACTED]");
    expect(redacted.redacted).toBe(true);
  });
});

describe("summarizeMemoryForOwner", () => {
  it("is honest about an empty store", () => {
    expect(summarizeMemoryForOwner([])).toMatch(/not wired|nothing/i);
  });

  it("counts records by type", () => {
    const summary = summarizeMemoryForOwner([
      makeRecord(),
      makeRecord({ id: "mem-2", type: "DECISION", redacted: true }),
    ]);
    expect(summary).toContain("2 memory records");
    expect(summary).toContain("1 SYSTEM_STATE");
    expect(summary).toContain("1 DECISION");
    expect(summary).toContain("1 redacted");
  });
});
