import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_EXPLAIN_REGISTER,
  EXPLAIN_REGISTERS,
  EXPLAIN_REGISTER_LABELS,
} from "@/lib/pick-explainer/prompts";
import { getAcademyCopy } from "@/lib/academy/register-copy";
import { BANNED_ANALYST_PHRASES } from "@/lib/voice/analyst-standard";

/**
 * Academy register copy — "same data, different doorway" (NFL House doctrine).
 *
 * Pins three invariants:
 *  1. Each register renders distinct copy.
 *  2. The default register (plain) works without localStorage.
 *  3. No copy variant uses banned analyst phrases.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("academy register copy — distinct per register", () => {
  it("each register returns a non-empty AcademyCopy object", () => {
    for (const r of EXPLAIN_REGISTERS) {
      const copy = getAcademyCopy(r);
      expect(copy.heroParagraph.length).toBeGreaterThan(10);
      expect(copy.courseSectionBody.length).toBeGreaterThan(10);
      expect(copy.liveFireBody.length).toBeGreaterThan(10);
      expect(copy.beatTheCloseBody.length).toBeGreaterThan(10);
    }
  });

  it("teach and plain hero paragraphs are distinct", () => {
    expect(getAcademyCopy("teach").heroParagraph).not.toBe(
      getAcademyCopy("plain").heroParagraph,
    );
  });

  it("plain and math hero paragraphs are distinct", () => {
    expect(getAcademyCopy("plain").heroParagraph).not.toBe(
      getAcademyCopy("math").heroParagraph,
    );
  });

  it("all four copy fields differ across the three registers", () => {
    const fields = [
      "heroParagraph",
      "courseSectionBody",
      "liveFireBody",
      "beatTheCloseBody",
    ] as const;

    for (const field of fields) {
      const values = EXPLAIN_REGISTERS.map((r) => getAcademyCopy(r)[field]);
      const unique = new Set(values);
      expect(unique.size).toBe(3);
    }
  });

  it("teach register uses inline definitions (expected hallmarks)", () => {
    const copy = getAcademyCopy("teach");
    // Teach register should define terms inline — at least one parenthetical
    // definition or plain-language explanation present.
    const allCopy = Object.values(copy).join(" ");
    expect(allCopy).toMatch(/\(.*?\)/); // parenthetical inline definition
  });

  it("math register uses quantitative framing (numbers / metrics present)", () => {
    const copy = getAcademyCopy("math");
    const allCopy = Object.values(copy).join(" ");
    // Should contain actual numbers and metric names
    expect(allCopy).toMatch(/\d+/); // at least one number
    expect(allCopy).toMatch(/CLV|52\.4|−110|break-even/); // known metrics
  });
});

describe("academy register copy — default register without localStorage", () => {
  it("getAcademyCopy(DEFAULT_EXPLAIN_REGISTER) matches plain register", () => {
    const defaultCopy = getAcademyCopy(DEFAULT_EXPLAIN_REGISTER);
    const plainCopy = getAcademyCopy("plain");
    expect(defaultCopy).toEqual(plainCopy);
  });

  it("DEFAULT_EXPLAIN_REGISTER is 'plain'", () => {
    expect(DEFAULT_EXPLAIN_REGISTER).toBe("plain");
  });

  it("plain copy includes the canonical Academy description", () => {
    // The plain register is the existing copy — pin it doesn't go blank.
    expect(getAcademyCopy("plain").heroParagraph).toContain("CLV");
    expect(getAcademyCopy("plain").heroParagraph).toContain("Restraint");
  });
});

describe("academy register copy — banned phrase guardrails", () => {
  it("no register uses banned analyst phrases (case-insensitive)", () => {
    for (const r of EXPLAIN_REGISTERS) {
      const allCopy = Object.values(getAcademyCopy(r)).join(" ").toLowerCase();
      for (const phrase of BANNED_ANALYST_PHRASES) {
        expect(allCopy).not.toContain(phrase.toLowerCase());
      }
    }
  });

  it("no copy uses lock / guarantee / free money language", () => {
    for (const r of EXPLAIN_REGISTERS) {
      const allCopy = Object.values(getAcademyCopy(r)).join(" ").toLowerCase();
      expect(allCopy).not.toMatch(/\block\b/);
      expect(allCopy).not.toContain("guaranteed");
      expect(allCopy).not.toContain("free money");
    }
  });
});

describe("academy component wiring", () => {
  const toggle = read("components/academy/academy-register-toggle.tsx");

  it("uses the shared reader-register hook", () => {
    expect(toggle).toContain("useReaderRegister");
  });

  it("reads from gse-reader-register (via the hook import)", () => {
    // The hook owns the storage key; the toggle component imports the hook.
    expect(toggle).toContain(
      "lib/reader-register/use-reader-register",
    );
  });

  it("renders the register toggle with pressed-state accessibility", () => {
    expect(toggle).toContain("aria-pressed");
    expect(toggle).toContain('aria-label="Explanation depth"');
    expect(toggle).toContain("EXPLAIN_REGISTER_LABELS");
  });

  it("exports the expected section body components", () => {
    expect(toggle).toContain("AcademyHeroBody");
    expect(toggle).toContain("AcademyCourseSectionBody");
    expect(toggle).toContain("AcademyLiveFireBody");
    expect(toggle).toContain("AcademyBeatTheCloseBody");
    expect(toggle).toContain("AcademyRegisterToggle");
  });

  it("uses data-testid and data-register attributes for test targeting", () => {
    expect(toggle).toContain("data-testid");
    expect(toggle).toContain("data-register");
  });

  it("uses world tokens, not raw palette classes", () => {
    const raw = toggle.match(
      /(?:text|bg|border)-(?:gray|green|red|yellow|cyan|blue|slate|zinc)-\d+/g,
    );
    expect(raw ?? []).toEqual([]);
  });

  const page = read("app/academy/page.tsx");

  it("Academy page imports the register components", () => {
    expect(page).toContain("AcademyRegisterToggle");
    expect(page).toContain("AcademyHeroBody");
    expect(page).toContain("AcademyCourseSectionBody");
    expect(page).toContain("AcademyLiveFireBody");
    expect(page).toContain("AcademyBeatTheCloseBody");
  });

  it("register labels match the shared EXPLAIN_REGISTER_LABELS", () => {
    for (const r of EXPLAIN_REGISTERS) {
      expect(EXPLAIN_REGISTER_LABELS[r]).toBeTruthy();
    }
  });
});
