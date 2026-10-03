
import { describe, expect, it } from "vitest";
import { checklistPassed, disclosureChecklist, respectsEmbargo, tsfmHoldoutSplit } from "./tsfm-holdout-protocol";

describe("tsfm-holdout-protocol", () => {
  it("split inserts the embargo between train and test", () => {
    const s = tsfmHoldoutSplit("2024-01-31", 14, 30);
    expect(s.trainEnd).toBe("2024-01-31");
    expect(s.embargoStart).toBe("2024-02-01");
    expect(s.embargoEnd).toBe("2024-02-14");
    expect(s.testStart).toBe("2024-02-15");
    expect(s.testEnd).toBe("2024-03-15");
  });
  it("respectsEmbargo rejects post-cutoff dates", () => {
    const s = tsfmHoldoutSplit("2024-01-31", 14, 30);
    expect(respectsEmbargo("2024-01-15", s)).toBe(true);
    expect(respectsEmbargo("2024-02-01", s)).toBe(false);
  });
  it("checklistPassed requires every item", () => {
    const full = disclosureChecklist();
    expect(checklistPassed(full)).toBe(true);
    expect(checklistPassed(full.slice(0, 3))).toBe(false);
  });
  it("edge cases throw", () => {
    expect(() => tsfmHoldoutSplit("not-a-date", 14, 30)).toThrow();
    expect(() => tsfmHoldoutSplit("2024-01-31", -1, 30)).toThrow();
  });
});
