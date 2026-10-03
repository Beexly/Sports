/**
 * Jarvis memory write-gate — apps/web/lib/jarvis/memory/write-gate.ts
 *
 * write-gate.ts is INERT by default (JARVIS_MEMORY_WRITE_ENABLED unset).
 * These tests pin the same contract as
 * packages/ingestion-pipeline/src/__tests__/line-archive.test.ts pins for
 * captureLineSnapshotsIfEnabled:
 *   - flag unset (or not exactly "true"): recordMemoryEvent never touches
 *     the db and returns { enabled: false, recorded: false }
 *   - flag on + mocked db: a candidate JarvisMemoryEvent row is created with
 *     the correct shape
 *   - flag on + invalid input: validation fails before any db call
 *   - flag on + idempotencyKey match: dedupes instead of creating a 2nd row
 *   - flag on + db rejection: caught and returned as `{ error }`, never thrown
 *   - getMemoryWritePathStatus / getMemoryWritePathTruth never overstate
 *     activation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  recordMemoryEvent,
  isMemoryWriteEnabled,
  getMemoryWritePathStatus,
  getMemoryWritePathTruth,
  type MemoryEventDb,
} from "@/lib/jarvis/memory/write-gate";

const ORIGINAL_ENV = process.env["JARVIS_MEMORY_WRITE_ENABLED"];

beforeEach(() => {
  delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env["JARVIS_MEMORY_WRITE_ENABLED"];
  } else {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = ORIGINAL_ENV;
  }
});

function mockDb(): MemoryEventDb & {
  jarvisMemoryEvent: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
} {
  return {
    jarvisMemoryEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
}

const VALID_INPUT = {
  memory_type: "decision" as const,
  scope: "picks.gate",
  title: "Opened public picks gate",
  summary: "Owner opened PUBLIC_PICKS_ENABLED on 2026-07-16.",
  source_type: "owner_decision",
  actor: "garrett",
  owner: "garrett",
  confidence: 90,
};

// ─── Env gate ───────────────────────────────────────────────────────────────

function fakeEnv(value: string | undefined): NodeJS.ProcessEnv {
  return { JARVIS_MEMORY_WRITE_ENABLED: value } as unknown as NodeJS.ProcessEnv;
}

describe("isMemoryWriteEnabled", () => {
  it("is false when JARVIS_MEMORY_WRITE_ENABLED is unset", () => {
    expect(isMemoryWriteEnabled()).toBe(false);
  });

  it("is false for any non-'true' value", () => {
    expect(isMemoryWriteEnabled(fakeEnv("1"))).toBe(false);
    expect(isMemoryWriteEnabled(fakeEnv("TRUE"))).toBe(false);
  });

  it("is true only for the exact string 'true'", () => {
    expect(isMemoryWriteEnabled(fakeEnv("true"))).toBe(true);
  });
});

describe("getMemoryWritePathStatus / getMemoryWritePathTruth — never overstate activation", () => {
  it("reports WIRED_GATED_OFF by default", () => {
    expect(getMemoryWritePathStatus()).toBe("WIRED_GATED_OFF");
    expect(getMemoryWritePathTruth()).toMatch(/gated OFF/i);
    expect(getMemoryWritePathTruth()).toMatch(/zero DB writes/i);
  });

  it("reports WIRED_ACTIVE only when the flag is exactly 'true'", () => {
    const env = fakeEnv("true");
    expect(getMemoryWritePathStatus(env)).toBe("WIRED_ACTIVE");
    expect(getMemoryWritePathTruth(env)).toMatch(/ACTIVE/);
  });
});

// ─── recordMemoryEvent — hard gate ────────────────────────────────────────────

describe("recordMemoryEvent — hard gate", () => {
  it("no-ops with zero db calls when JARVIS_MEMORY_WRITE_ENABLED is unset", async () => {
    const db = mockDb();
    const result = await recordMemoryEvent({ db, ...VALID_INPUT });

    expect(result).toEqual({ enabled: false, recorded: false });
    expect(db.jarvisMemoryEvent.findFirst).not.toHaveBeenCalled();
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });

  it("no-ops when JARVIS_MEMORY_WRITE_ENABLED is set to a non-'true' value", async () => {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = "1";
    const db = mockDb();
    const result = await recordMemoryEvent({ db, ...VALID_INPUT });

    expect(result).toEqual({ enabled: false, recorded: false });
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });

  it("never touches db even if the caller passes a db that would throw on any access", async () => {
    const angryDb = {
      jarvisMemoryEvent: {
        get findFirst(): never {
          throw new Error("db should never be touched while disabled");
        },
        get create(): never {
          throw new Error("db should never be touched while disabled");
        },
      },
    };
    await expect(
      recordMemoryEvent({ db: angryDb, ...VALID_INPUT })
    ).resolves.toEqual({ enabled: false, recorded: false });
  });
});

describe("recordMemoryEvent — enabled, valid input", () => {
  beforeEach(() => {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = "true";
  });

  it("creates a candidate JarvisMemoryEvent with the correct shape", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.create.mockResolvedValue({ id: "mem_abc123" });

    const result = await recordMemoryEvent({ db, ...VALID_INPUT });

    expect(result).toEqual({ enabled: true, recorded: true, id: "mem_abc123" });
    expect(db.jarvisMemoryEvent.create).toHaveBeenCalledTimes(1);
    const data = db.jarvisMemoryEvent.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      memory_type: "decision",
      memory_state: "candidate",
      scope: "picks.gate",
      title: "Opened public picks gate",
      summary: VALID_INPUT.summary,
      source_type: "owner_decision",
      actor: "garrett",
      owner: "garrett",
      confidence: 90,
      sensitivity: "normal",
      tags: [],
      owner_approval: false,
    });
  });

  it("does not query findFirst when no idempotencyKey is given", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.create.mockResolvedValue({ id: "mem_1" });

    await recordMemoryEvent({ db, ...VALID_INPUT });

    expect(db.jarvisMemoryEvent.findFirst).not.toHaveBeenCalled();
  });

  it("carries sensitivity, tags, and optional fields through to the write", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.create.mockResolvedValue({ id: "mem_2" });

    await recordMemoryEvent({
      db,
      ...VALID_INPUT,
      sensitivity: "high",
      tags: ["decision", "gate"],
      source_ref: "https://internal/decisions/42",
      full_text: "Full rationale here.",
      related_decision_id: "dec_1",
      related_agent_id: "agent_1",
    });

    const data = db.jarvisMemoryEvent.create.mock.calls[0]?.[0].data;
    expect(data.sensitivity).toBe("high");
    expect(data.tags).toEqual(["decision", "gate"]);
    expect(data.source_ref).toBe("https://internal/decisions/42");
    expect(data.full_text).toBe("Full rationale here.");
    expect(data.related_decision_id).toBe("dec_1");
    expect(data.related_agent_id).toBe("agent_1");
  });
});

describe("recordMemoryEvent — enabled, idempotency", () => {
  beforeEach(() => {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = "true";
  });

  it("dedupes when a matching idempotencyKey already exists", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.findFirst.mockResolvedValue({ id: "mem_existing" });

    const result = await recordMemoryEvent({
      db,
      ...VALID_INPUT,
      idempotencyKey: "gate-open-2026-07-16",
    });

    expect(result).toEqual({
      enabled: true,
      recorded: false,
      deduped: true,
      id: "mem_existing",
    });
    expect(db.jarvisMemoryEvent.findFirst).toHaveBeenCalledWith({
      where: { metadata: { path: ["idempotencyKey"], equals: "gate-open-2026-07-16" } },
    });
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });

  it("creates and stamps metadata.idempotencyKey when no existing match is found", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.findFirst.mockResolvedValue(null);
    db.jarvisMemoryEvent.create.mockResolvedValue({ id: "mem_new" });

    const result = await recordMemoryEvent({
      db,
      ...VALID_INPUT,
      idempotencyKey: "gate-open-2026-07-16",
      metadata: { source: "gate-worker" },
    });

    expect(result).toEqual({ enabled: true, recorded: true, id: "mem_new" });
    const data = db.jarvisMemoryEvent.create.mock.calls[0]?.[0].data;
    expect(data.metadata).toEqual({
      source: "gate-worker",
      idempotencyKey: "gate-open-2026-07-16",
    });
  });
});

describe("recordMemoryEvent — enabled, validation", () => {
  beforeEach(() => {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = "true";
  });

  it("rejects missing required fields without touching the db", async () => {
    const db = mockDb();
    const result = await recordMemoryEvent({
      db,
      ...VALID_INPUT,
      title: "",
    });

    expect(result.enabled).toBe(true);
    expect(result.recorded).toBe(false);
    expect(result.error).toMatch(/title/);
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });

  it("rejects confidence out of [0, 100] range", async () => {
    const db = mockDb();
    const result = await recordMemoryEvent({ db, ...VALID_INPUT, confidence: 150 });

    expect(result.recorded).toBe(false);
    expect(result.error).toMatch(/confidence/i);
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });

  it("rejects non-finite confidence", async () => {
    const db = mockDb();
    const result = await recordMemoryEvent({ db, ...VALID_INPUT, confidence: NaN });

    expect(result.recorded).toBe(false);
    expect(db.jarvisMemoryEvent.create).not.toHaveBeenCalled();
  });
});

describe("recordMemoryEvent — enabled, failure isolation", () => {
  beforeEach(() => {
    process.env["JARVIS_MEMORY_WRITE_ENABLED"] = "true";
  });

  it("returns { error } instead of throwing when create() rejects", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.create.mockRejectedValue(new Error("connection reset"));

    const result = await recordMemoryEvent({ db, ...VALID_INPUT });

    expect(result.enabled).toBe(true);
    expect(result.recorded).toBe(false);
    expect(result.error).toBe("connection reset");
  });

  it("returns { error } instead of throwing when the idempotency lookup rejects", async () => {
    const db = mockDb();
    db.jarvisMemoryEvent.findFirst.mockRejectedValue(new Error("pool exhausted"));

    const result = await recordMemoryEvent({
      db,
      ...VALID_INPUT,
      idempotencyKey: "k1",
    });

    expect(result.enabled).toBe(true);
    expect(result.recorded).toBe(false);
    expect(result.error).toBe("pool exhausted");
  });

  it("never throws, even for a db that synchronously throws inside create()", async () => {
    const db = {
      jarvisMemoryEvent: {
        findFirst: vi.fn(),
        create: vi.fn(() => {
          throw new Error("synchronous boom");
        }),
      },
    };

    await expect(recordMemoryEvent({ db, ...VALID_INPUT })).resolves.toMatchObject({
      enabled: true,
      recorded: false,
      error: "synchronous boom",
    });
  });
});
