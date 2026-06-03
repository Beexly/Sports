import { describe, it, expect } from "vitest";
import { computePickClv } from "../pick-clv.js";

describe("computePickClv", () => {
  it("SPREAD home pick beats the close on a more generous line", () => {
    // Picked 'Chiefs -3' (home -3), market closed -4 → laid fewer points → +1.
    const r = computePickClv("SPREAD", "Chiefs -3", -3, -4, "Chiefs");
    expect(r?.metric).toBe("POINTS");
    expect(r?.value).toBe(1);
    expect(r?.verdict).toBe("BEAT_CLOSE");
  });

  it("SPREAD away pick is the mirror of the home line", () => {
    // Picked the away team; home line +2 at lock, closed +4 → away laid fewer → +2.
    const r = computePickClv("SPREAD", "Bills +2", 2, 4, "Chiefs");
    expect(r?.value).toBe(2);
    expect(r?.verdict).toBe("BEAT_CLOSE");
  });

  it("TOTAL over beats the close on a lower number", () => {
    // OVER 48 at lock, closed 49 → over needed fewer points → +1.
    const r = computePickClv("TOTAL", "OVER 48.5", 48, 49, "Chiefs");
    expect(r?.metric).toBe("POINTS");
    expect(r?.value).toBe(1);
    expect(r?.verdict).toBe("BEAT_CLOSE");
  });

  it("TOTAL under beats the close on a higher number", () => {
    const r = computePickClv("TOTAL", "UNDER 50", 50, 49, "Chiefs");
    expect(r?.value).toBe(1);
    expect(r?.verdict).toBe("BEAT_CLOSE");
  });

  it("MONEYLINE beats the close when locked at a longer price", () => {
    // +150 at lock, closed +120 → longer price than the close → positive CLV.
    const r = computePickClv("MONEYLINE", "Chiefs ML", 150, 120, "Chiefs");
    expect(r?.metric).toBe("PROBABILITY");
    expect((r?.value ?? 0) > 0).toBe(true);
    expect(r?.verdict).toBe("BEAT_CLOSE");
  });

  it("matches the close when nothing moved", () => {
    const r = computePickClv("SPREAD", "Chiefs -3", -3, -3, "Chiefs");
    expect(r?.value).toBe(0);
    expect(r?.verdict).toBe("MATCHED_CLOSE");
  });
});
