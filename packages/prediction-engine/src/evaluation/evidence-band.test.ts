import { describe, expect, it } from "vitest";
import { automaticAdequacyVerdict, classifyUpper } from "./evidence-band.js";

describe("evidence band", () => {
  it("bands a finite value and refuses an automatic adequacy verdict", () => {
    expect(classifyUpper(0.1, 0.2, 0.5)).toBe("pass");
    expect(classifyUpper(0.3, 0.2, 0.5)).toBe("review");
    expect(classifyUpper(0.9, 0.2, 0.5)).toBe("fail");
    expect(classifyUpper(Number.NaN, 0.2, 0.5)).toBe("review");
    expect(automaticAdequacyVerdict()).toBe(false);
  });
});
