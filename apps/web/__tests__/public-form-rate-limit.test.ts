import { describe, expect, it } from "vitest";
import { fingerprintClientKey } from "@/lib/api/public-form-rate-limit";

describe("fingerprintClientKey", () => {
  it("is stable for the same input", () => {
    expect(fingerprintClientKey("1.2.3.4")).toBe(fingerprintClientKey("1.2.3.4"));
  });

  it("differs across clients and never equals the raw IP", () => {
    const a = fingerprintClientKey("1.2.3.4");
    const b = fingerprintClientKey("5.6.7.8");
    expect(a).not.toBe(b);
    expect(a).not.toContain("1.2.3.4");
    expect(a).toHaveLength(40);
  });
});
