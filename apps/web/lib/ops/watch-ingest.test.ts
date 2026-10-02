import { describe, expect, it, vi } from "vitest";
import {
  persistFrameOutput,
  validateSpaceOutput,
  type SpaceFrameOutput,
  type WatchDb,
} from "./watch-ingest.js";

function sampleOutput(): SpaceFrameOutput {
  return {
    game_id: "401872964",
    t: 1759367700,
    fps: 5,
    burst: true,
    width: 1280,
    height: 720,
    detections: [
      { bbox: { x: 10, y: 20, width: 30, height: 60 }, confidence: 0.9, classId: "player" },
    ],
    active_tracklets: [{ id: "trk-0001", team_hint: "UNK", role: "player", n_points: 4 }],
    finished_tracklets: [],
    metrics: {
      positions: [
        { tracklet_id: "trk-0001", t: 1759367700, x_px: 25, y_px: 80, x_yd: 30.5, y_yd: 26.6 },
      ],
      separations: [{ tracklet_id: "trk-0001", nearest_other_yd: 4.2 }],
      break_angles: [{ tracklet_id: "trk-0001", max_heading_change_deg: 12.5 }],
    },
  };
}

function mockDb(): WatchDb & { calls: Array<{ q: string; params: unknown[] }> } {
  const calls: Array<{ q: string; params: unknown[] }> = [];
  return {
    calls,
    $executeRawUnsafe: vi.fn(async (q: string, ...params: unknown[]) => {
      calls.push({ q, params });
      return 1;
    }),
    $queryRawUnsafe: vi.fn(async <T,>(q: string): Promise<T> => {
      calls.push({ q, params: [] });
      return [{ next_idx: 7 }] as unknown as T;
    }),
  };
}

describe("validateSpaceOutput", () => {
  it("accepts a well-formed Space output", () => {
    expect(validateSpaceOutput(sampleOutput()).game_id).toBe("401872964");
  });

  it("rejects a missing game_id", () => {
    expect(() => validateSpaceOutput({ ...sampleOutput(), game_id: "" })).toThrow(
      /game_id/,
    );
  });

  it("rejects non-object bodies", () => {
    expect(() => validateSpaceOutput(null)).toThrow();
    expect(() => validateSpaceOutput("nope")).toThrow();
  });

  it("rejects a missing detections array", () => {
    const bad = { ...sampleOutput(), detections: undefined };
    expect(() => validateSpaceOutput(bad)).toThrow(/detections/);
  });
});

describe("persistFrameOutput", () => {
  it("dry-run validates and counts without writing", async () => {
    const db = mockDb();
    const res = await persistFrameOutput(db, sampleOutput(), { dryRun: true });
    expect(res.dryRun).toBe(true);
    expect(res.frameIdx).toBe(-1);
    expect(res.detections).toBe(1);
    expect(res.positions).toBe(1);
    expect(db.calls).toEqual([]);
  });

  it("writes frames, positions, and derived metrics", async () => {
    const db = mockDb();
    const res = await persistFrameOutput(db, sampleOutput());
    expect(res.dryRun).toBe(false);
    expect(res.frameIdx).toBe(7);
    const queries = db.calls.map((c) => c.q);
    expect(queries.some((q) => q.includes("INSERT INTO watch.frames"))).toBe(true);
    expect(queries.some((q) => q.includes("INSERT INTO watch.field_positions"))).toBe(true);
    expect(queries.some((q) => q.includes("sep_nearest_other_yd"))).toBe(true);
    expect(queries.some((q) => q.includes("break_angle_max_deg"))).toBe(true);
  });

  it("skips positions without field coordinates", async () => {
    const db = mockDb();
    const out = sampleOutput();
    out.metrics.positions = [
      { tracklet_id: "trk-0001", t: 1759367700, x_px: 25, y_px: 80, x_yd: null, y_yd: null },
    ];
    const res = await persistFrameOutput(db, out);
    expect(res.positions).toBe(0);
    const queries = db.calls.map((c) => c.q);
    expect(queries.some((q) => q.includes("INSERT INTO watch.field_positions"))).toBe(false);
  });

  it("never references raw frame storage", async () => {
    const db = mockDb();
    await persistFrameOutput(db, sampleOutput());
    const all = db.calls.map((c) => c.q).join("\n").toLowerCase();
    expect(all).not.toMatch(/bytea|jpeg|frame_bytes/);
  });
});
