import { describe, expect, it } from "vitest";
import {
  getProofSurfaceFreshness,
  listProofSurfaceFreshness,
} from "./proof-freshness";

describe("proof surface freshness", () => {
  it("marks a surface fresh inside its stale window", () => {
    const result = getProofSurfaceFreshness(
      "loss-room",
      new Date("2026-05-29T00:00:00.000Z"),
    );

    expect(result.ageDays).toBe(6);
    expect(result.status).toBe("fresh");
  });

  it("marks a surface stale after its stale window", () => {
    const result = getProofSurfaceFreshness(
      "loss-room",
      new Date("2026-06-01T00:00:00.000Z"),
    );

    expect(result.ageDays).toBe(9);
    expect(result.status).toBe("stale");
  });

  it("lists all public proof surfaces", () => {
    expect(listProofSurfaceFreshness()).toHaveLength(4);
  });
});
