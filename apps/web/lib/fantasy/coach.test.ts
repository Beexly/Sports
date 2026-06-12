import { describe, expect, it } from "vitest";
import { ALL_COACHES, FANTASY_COACH } from "./coach";
import { LESSONS } from "@/lib/academy/curriculum";

describe("fantasy coach", () => {
  it("covers all five tools", () => {
    expect(Object.keys(FANTASY_COACH).sort()).toEqual(
      ["dfs", "draft", "lineup", "trade", "waivers"].sort()
    );
    expect(ALL_COACHES).toHaveLength(5);
  });

  it("every tool has a concise quickStart and at least 3 terms", () => {
    for (const coach of ALL_COACHES) {
      expect(coach.quickStart.length).toBeGreaterThan(0);
      expect(coach.quickStart.length).toBeLessThanOrEqual(90);
      expect(coach.terms.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every term teaches concisely: meaning ≤ 200 chars, move ≤ 140 chars", () => {
    for (const coach of ALL_COACHES) {
      for (const t of coach.terms) {
        expect(t.meaning.length).toBeLessThanOrEqual(200);
        expect(t.move.length).toBeLessThanOrEqual(140);
        expect(t.meaning.endsWith(".")).toBe(true);
        expect(t.move.endsWith(".")).toBe(true);
      }
    }
  });

  it("terms are unique within each tool", () => {
    for (const coach of ALL_COACHES) {
      const names = coach.terms.map((t) => t.term);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("every lessonId points at a real Academy lesson", () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const coach of ALL_COACHES) {
      expect(ids.has(coach.lessonId)).toBe(true);
    }
  });
});

describe("fantasy academy lessons", () => {
  it("the Fantasy & DFS track exists with quizzes", () => {
    const fantasy = LESSONS.filter((l) => l.track === "Fantasy & DFS");
    expect(fantasy.length).toBeGreaterThanOrEqual(3);
    for (const lesson of fantasy) {
      expect(lesson.quiz.length).toBeGreaterThanOrEqual(1);
      for (const q of lesson.quiz) {
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      }
    }
  });
});
