import { describe, it, expect } from "vitest";
import { glossaryEntries, glossaryEntry } from "@/lib/glossary";

describe("plain-language glossary", () => {
  it("every entry has an id, label, and a non-empty plain definition", () => {
    for (const e of glossaryEntries()) {
      expect(e.id).toMatch(/^[a-zA-Z]+$/);
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.plain.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps definitions short and readable (one sentence, jargon explained in place)", () => {
    for (const e of glossaryEntries()) {
      // A quick-read definition: not a paragraph.
      expect(e.plain.length).toBeLessThanOrEqual(240);
    }
  });

  it("has no duplicate ids", () => {
    const ids = glossaryEntries().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the terms customers most often hit unexplained", () => {
    for (const id of ["gpi", "confidence", "clv", "marketMap", "epa", "wopr"]) {
      expect(glossaryEntry(id)).toBeDefined();
    }
  });

  it("looks up by id and degrades safely on unknown ids", () => {
    expect(glossaryEntry("gpi")?.label).toBe("Galaxy Index");
    expect(glossaryEntry("not-a-real-term")).toBeUndefined();
  });
});
