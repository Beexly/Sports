import { describe, expect, it } from "vitest";
import { normalizeEntityName } from "./normalize";

describe("normalizeEntityName", () => {
  it("normalizes initials", () => {
    expect(normalizeEntityName("A.J. Brown")).toBe("aj brown");
  });

  it("normalizes adjacent initials", () => {
    expect(normalizeEntityName("AJ Brown")).toBe("aj brown");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeEntityName("  Patrick   Mahomes  ")).toBe("patrick mahomes");
  });

  it("folds combining accents", () => {
    expect(normalizeEntityName("Nikola Jokić")).toBe("nikola jokic");
  });

  it("removes apostrophes", () => {
    expect(normalizeEntityName("Shaquille O'Neal")).toBe("shaquille oneal");
  });

  it("removes a trailing generational suffix", () => {
    expect(normalizeEntityName("Odell Beckham Jr.")).toBe("odell beckham");
  });

  it("removes Sr only when it is a final token with two preceding tokens", () => {
    expect(normalizeEntityName("Ken Griffey Sr")).toBe("ken griffey");
  });

  it("removes III only when it is a final token with two preceding tokens", () => {
    expect(normalizeEntityName("Robert Griffin III")).toBe("robert griffin");
  });

  it("normalizes punctuation between words", () => {
    expect(normalizeEntityName("St. Louis Cardinals")).toBe("st louis cardinals");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeEntityName("")).toBe("");
  });

  it("returns an empty string for punctuation-only input", () => {
    expect(normalizeEntityName("---")).toBe("");
  });

  it("is idempotent for the fixture set", () => {
    const inputs = [
      "A.J. Brown",
      "AJ Brown",
      "  Patrick   Mahomes  ",
      "Nikola Jokić",
      "Shaquille O'Neal",
      "Odell Beckham Jr.",
      "Ken Griffey Sr",
      "Robert Griffin III",
      "St. Louis Cardinals",
      "",
      "---",
    ];

    for (const input of inputs) {
      const once = normalizeEntityName(input);
      expect(normalizeEntityName(once)).toBe(once);
    }
  });

  it("collides equivalent punctuation variants", () => {
    expect(normalizeEntityName("A.J. Brown")).toBe(normalizeEntityName("AJ Brown"));
  });
});
