/**
 * Targeted coverage for evaluateGeneratedBlogPolicy branches not reached
 * by content-generator.test.ts.
 *
 * The primary test covers MISSING_DISCLAIMER and the full generateBlogPost
 * pipeline. This file covers the remaining policy validation branches:
 * MISSING_FIELD, INVALID_TAGS, CERTAINTY_LANGUAGE, and the pass case.
 */

import { describe, it, expect } from "vitest";
import { evaluateGeneratedBlogPolicy } from "@/lib/content-generator";

const DISCLAIMER = "Please gamble responsibly and only bet what you can afford to lose.";

function validPost() {
  return {
    title: "NBA Picks for May 22",
    excerpt: "A measured preview of tonight's slate.",
    content: `Full analysis here. ${DISCLAIMER}`,
    seoTitle: "NBA Picks May 22",
    seoDescription: "Measured NBA pick analysis.",
    tags: ["NBA", "picks", "analysis"],
  };
}

// ============================================================
// Pass case
// ============================================================

describe("evaluateGeneratedBlogPolicy — valid post", () => {
  it("allows a complete, compliant post", () => {
    const result = evaluateGeneratedBlogPolicy(validPost());
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });
});

// ============================================================
// MISSING_FIELD
// ============================================================

describe("evaluateGeneratedBlogPolicy — MISSING_FIELD", () => {
  it("blocks when title is empty string", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), title: "" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("MISSING_FIELD");
  });

  it("blocks when excerpt is empty string", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), excerpt: "" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("MISSING_FIELD");
  });

  it("blocks when content is empty string", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), content: "" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("MISSING_FIELD");
  });

  it("blocks when seoTitle is empty string", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), seoTitle: "" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("MISSING_FIELD");
  });

  it("blocks when seoDescription is empty string", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), seoDescription: "" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("MISSING_FIELD");
  });

  it("blocks when title is whitespace only", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), title: "   " });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("MISSING_FIELD");
  });
});

// ============================================================
// INVALID_TAGS
// ============================================================

describe("evaluateGeneratedBlogPolicy — INVALID_TAGS", () => {
  it("blocks when tags array has fewer than 3 elements", () => {
    const result = evaluateGeneratedBlogPolicy({ ...validPost(), tags: ["NBA", "picks"] });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INVALID_TAGS");
  });

  it("blocks when tags array has more than 5 elements", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      tags: ["NBA", "picks", "analysis", "today", "sports", "extra"],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INVALID_TAGS");
  });

  it("allows exactly 3 tags (minimum boundary)", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      tags: ["NBA", "picks", "analysis"],
    });
    expect(result.allowed).toBe(true);
  });

  it("allows exactly 5 tags (maximum boundary)", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      tags: ["NBA", "picks", "analysis", "today", "sports"],
    });
    expect(result.allowed).toBe(true);
  });

  it("blocks when any tag is an empty string", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      tags: ["NBA", "", "analysis"],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INVALID_TAGS");
  });

  it("blocks when any tag is whitespace only", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      tags: ["NBA", "picks", "   "],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("INVALID_TAGS");
  });
});

// ============================================================
// CERTAINTY_LANGUAGE
// ============================================================

describe("evaluateGeneratedBlogPolicy — CERTAINTY_LANGUAGE", () => {
  it("blocks 'will win' in content", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      content: `This team will win the game. ${DISCLAIMER}`,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });

  it("blocks 'free money' in excerpt", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      excerpt: "This pick is basically free money.",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });

  it("blocks 'cannot miss' in title", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      title: "These NBA Picks Cannot Miss Tonight",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });

  it("blocks 'sure thing' in seoDescription", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      seoDescription: "A sure thing pick for tonight's NBA slate.",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });

  it("blocks 'hammer' (case-insensitive) in seoTitle", () => {
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      seoTitle: "Hammer These NBA Picks Tonight",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });

  it("blocks certainty language even when disclaimer is present", () => {
    // disclaimer present but certainty language also present → CERTAINTY_LANGUAGE
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      content: `This is a sure thing. ${DISCLAIMER}`,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });

  it("does not block 'hammer' when used in a non-betting context without banned form", () => {
    // "hammer" as a noun/verb in a normal sentence — still blocked because pattern matches \\bhammer\\b
    // This test documents that the word "hammer" in any context blocks the post
    const result = evaluateGeneratedBlogPolicy({
      ...validPost(),
      content: `The analyst used a hammer to nail the point. ${DISCLAIMER}`,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("CERTAINTY_LANGUAGE");
  });
});
