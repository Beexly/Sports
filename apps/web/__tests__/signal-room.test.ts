import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSignalRoomScene,
  MAX_FLOW,
  PUBLIC_CALIBRATION_FLOOR,
  type SignalRoomInput,
  type StationId,
} from "@/lib/signal-room/scene";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

const EMPTY: SignalRoomInput = {
  sources: 14,
  scoring: 0,
  published: 0,
  gated: 0,
  calibrationSample: 16,
  calibrationFloor: PUBLIC_CALIBRATION_FLOOR,
};

const BUSY: SignalRoomInput = {
  sources: 14,
  scoring: 6,
  published: 3,
  gated: 2,
  calibrationSample: 16,
  calibrationFloor: PUBLIC_CALIBRATION_FLOOR,
};

describe("buildSignalRoomScene — honest-by-construction", () => {
  it("is quiet with NO in-flight signals when there are no live rows", () => {
    const scene = buildSignalRoomScene(EMPTY);
    expect(scene.mode).toBe("quiet");
    // The room must not fabricate motion: every conduit is at rest.
    for (const conduit of scene.conduits) {
      expect(conduit.flow).toBe(0);
    }
    expect(scene.summary).toContain("standby");
    expect(scene.gate.holding).toBe(false);
    expect(scene.gate.holdCount).toBe(0);
  });

  it("goes active and carries flow only when real rows exist", () => {
    const scene = buildSignalRoomScene(BUSY);
    expect(scene.mode).toBe("active");
    const evidenceToCore = scene.conduits.find(
      (c) => c.from === "evidence" && c.to === "decision-core"
    );
    expect(evidenceToCore?.flow).toBeGreaterThan(0);
    expect(evidenceToCore?.load).toBe(6);
    const gateToBoard = scene.conduits.find(
      (c) => c.from === "no-bet-gate" && c.to === "board"
    );
    expect(gateToBoard?.flow).toBe(3); // published rows
    expect(scene.gate.holding).toBe(true);
    expect(scene.gate.holdCount).toBe(2);
    expect(scene.gate.clearedCount).toBe(3);
    expect(scene.summary).toContain("live");
  });

  it("caps visible flow at MAX_FLOW regardless of how many rows exist", () => {
    const scene = buildSignalRoomScene({ ...BUSY, scoring: 9999 });
    const c = scene.conduits.find((x) => x.from === "evidence");
    expect(c?.flow).toBe(MAX_FLOW);
    expect(c?.load).toBe(9999); // the real count is preserved for labels
  });

  it("clamps the calibration ring and reports readiness honestly", () => {
    const under = buildSignalRoomScene({ ...EMPTY, calibrationSample: 16, calibrationFloor: 30 });
    expect(under.calibration.fraction).toBeCloseTo(16 / 30, 5);
    expect(under.calibration.ready).toBe(false);

    const over = buildSignalRoomScene({ ...EMPTY, calibrationSample: 90, calibrationFloor: 30 });
    expect(over.calibration.fraction).toBe(1); // never exceeds 1
    expect(over.calibration.ready).toBe(true);
  });

  it("sanitises hostile input (negatives / NaN) to zero without throwing", () => {
    const scene = buildSignalRoomScene({
      sources: -5,
      scoring: Number.NaN,
      published: -1,
      gated: Number.POSITIVE_INFINITY,
      calibrationSample: -10,
      calibrationFloor: 0,
    });
    expect(scene.mode).toBe("quiet");
    for (const conduit of scene.conduits) expect(conduit.flow).toBe(0);
    expect(scene.calibration.sample).toBe(0);
    expect(scene.calibration.floor).toBeGreaterThanOrEqual(1); // floored to a safe divisor
    expect(scene.calibration.fraction).toBe(0);
    expect(scene.gate.holdCount).toBe(0);
  });

  it("is deterministic — identical input yields identical scene", () => {
    expect(buildSignalRoomScene(BUSY)).toEqual(buildSignalRoomScene(BUSY));
  });

  it("always exposes the seven pipeline stations", () => {
    const scene = buildSignalRoomScene(BUSY);
    const ids = scene.stations.map((s) => s.id);
    const expected: readonly StationId[] = [
      "source-mesh",
      "evidence",
      "decision-core",
      "market-gravity",
      "calibration",
      "no-bet-gate",
      "board",
    ];
    for (const id of expected) expect(ids).toContain(id);
    expect(scene.stations).toHaveLength(expected.length);
  });
});

describe("SignalRoom renderer — performance + a11y discipline (source scan)", () => {
  const component = readRepoFile("apps/web/components/home/signal-room.tsx");

  it("is a client component that respects reduced motion with a static frame", () => {
    expect(component).toContain('"use client"');
    expect(component).toMatch(/prefers-reduced-motion: reduce/);
  });

  it("animates only on screen and cleans every resource up", () => {
    expect(component).toMatch(/IntersectionObserver/);
    expect(component).toMatch(/ResizeObserver/);
    expect(component).toMatch(/cancelAnimationFrame/);
    expect(component).toMatch(/\.disconnect\(\)/);
    expect(component).toMatch(/devicePixelRatio/);
  });

  it("hides the decorative canvas from AT and exposes the honest summary as text", () => {
    expect(component).toMatch(/aria-hidden="true"/);
    expect(component).toMatch(/sr-only/);
    expect(component).toMatch(/scene\.summary/);
  });
});

describe("homepage wires the Signal Room to real telemetry", () => {
  const page = readRepoFile("apps/web/app/page.tsx");

  it("imports and renders the instrument", () => {
    expect(page).toMatch(/import \{ SignalRoom \}/);
    expect(page).toMatch(/buildSignalRoomScene/);
    expect(page).toMatch(/<SignalRoom scene=\{signalRoomScene\}/);
  });

  it("builds the scene from the same real loader values as the board card", () => {
    expect(page).toMatch(/scoring: state\.scoringNow\.length/);
    expect(page).toMatch(/published: state\.publishedToday\.length/);
    expect(page).toMatch(/gated: state\.gatedTodayRows\.length/);
    expect(page).toMatch(/calibrationSample: calibration\.sampleSize/);
  });
});
