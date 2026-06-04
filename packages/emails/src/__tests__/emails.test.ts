import { describe, expect, it } from "vitest";
import {
  passwordResetEmail,
  receiptEmail,
  weeklyRecapEmail,
  welcomeEmail,
} from "../index";

describe("@sports/emails", () => {
  it("opens welcome with the position statement", () => {
    expect(welcomeEmail("Garrett")).toMatch(/I do not publish what I cannot explain/);
  });

  it("renders receipt with legal sender of record", () => {
    expect(receiptEmail({ plan: "Pro", amount: "$19.00" })).toMatch(/Sender of record: Galaxy Sports Edge/);
  });

  it("keeps losses visible in weekly recap", () => {
    const html = weeklyRecapEmail({
      record: "2-3-0",
      biggestMiss: "A line moved against us late.",
      lossRoomUrl: "https://galaxysportsedge.com/performance/losses",
    });
    expect(html).toMatch(/2-3-0/);
    expect(html).toMatch(/Losses stay visible/);
  });

  it("keeps password reset single purpose", () => {
    const html = passwordResetEmail("https://example.com/reset");
    expect(html).not.toMatch(/upgrade|subscribe|plan/i);
  });
});
