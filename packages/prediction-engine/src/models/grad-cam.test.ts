import { describe, expect, it } from "vitest";
import { gradCamMap } from "./grad-cam.js";

describe("grad-cam", () => {
  it("keeps a positive location and zeros a negative one", () => {
    expect(gradCamMap([[1, -2]], [[1, 1]])).toEqual([1, 0]);
  });
});
