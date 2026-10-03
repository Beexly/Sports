import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isPacketMissingForWeek, packetFilePath } from "./weekly-gravity-packet";

describe("isPacketMissingForWeek", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gravity-packet-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("is true when no packet file exists for the week", () => {
    expect(isPacketMissingForWeek("2026-W30", dir)).toBe(true);
  });

  it("is false once a packet file exists for the week", () => {
    writeFileSync(packetFilePath(dir, "2026-W30"), "{}", "utf8");
    expect(isPacketMissingForWeek("2026-W30", dir)).toBe(false);
  });

  it("does not confuse different weeks in the same dir", () => {
    writeFileSync(packetFilePath(dir, "2026-W30"), "{}", "utf8");
    expect(isPacketMissingForWeek("2026-W31", dir)).toBe(true);
  });
});
