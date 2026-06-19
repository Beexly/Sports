import { describe, it, expect } from "vitest";

import {
  validateNoVigInput,
  runNoVigCalculation,
  NO_VIG_DISCLAIMER,
  NOVIG_MAX_BOOKS,
  type NoVigInput,
} from "@/lib/lab/no-vig-calculator";

// ── Validation ────────────────────────────────────────────────────────────────

describe("validateNoVigInput", () => {
  it("rejects non-objects", () => {
    expect(validateNoVigInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
    expect(validateNoVigInput("nope")).toHaveProperty("error");
    expect(validateNoVigInput(42)).toHaveProperty("error");
  });

  it("requires a non-empty books array", () => {
    expect(validateNoVigInput({})).toHaveProperty("error");
    expect(validateNoVigInput({ books: [] })).toHaveProperty("error");
    expect(validateNoVigInput({ books: "x" })).toHaveProperty("error");
  });

  it("requires at least two prices per book (a two-way market)", () => {
    expect(
      validateNoVigInput({ books: [{ americanOdds: [-110] }] }),
    ).toHaveProperty("error");
  });

  it("rejects prices that are not valid American odds", () => {
    // Magnitude below 100 is not valid American notation.
    expect(
      validateNoVigInput({ books: [{ americanOdds: [-110, 50] }] }),
    ).toHaveProperty("error");
    // Non-numeric entry.
    expect(
      validateNoVigInput({ books: [{ americanOdds: [-110, "nope"] }] }),
    ).toHaveProperty("error");
  });

  it("rejects books with mismatched side counts", () => {
    expect(
      validateNoVigInput({
        books: [
          { americanOdds: [-110, -110] },
          { americanOdds: [-110, -110, 250] },
        ],
      }),
    ).toHaveProperty("error");
  });

  it("rejects more books than the cap", () => {
    const books = Array.from({ length: NOVIG_MAX_BOOKS + 1 }, () => ({
      americanOdds: [-110, -110],
    }));
    expect(validateNoVigInput({ books })).toHaveProperty("error");
  });

  it("rejects sideLabels whose length disagrees with the market", () => {
    expect(
      validateNoVigInput({
        sideLabels: ["Only one"],
        books: [{ americanOdds: [-110, -110] }],
      }),
    ).toHaveProperty("error");
  });

  it("accepts numeric strings and rounds prices to integers", () => {
    const res = validateNoVigInput({
      books: [{ name: "DK", americanOdds: ["-110", "-110.4"] }],
    });
    expect(res).not.toHaveProperty("error");
    const v = res as NoVigInput;
    expect(v.books[0]!.americanOdds).toEqual([-110, -110]);
    expect(v.books[0]!.name).toBe("DK");
  });

  it("synthesizes positional side labels when none are supplied", () => {
    const v = validateNoVigInput({
      books: [{ americanOdds: [-110, -110, 250] }],
    }) as NoVigInput;
    expect(v.sideLabels).toEqual(["Side 1", "Side 2", "Side 3"]);
  });

  it("synthesizes a positional book name when none is supplied", () => {
    const v = validateNoVigInput({
      books: [{ americanOdds: [-110, -110] }],
    }) as NoVigInput;
    expect(v.books[0]!.name).toBe("Book 1");
  });
});

// ── Textbook case: -110/-110 ─────────────────────────────────────────────────

describe("runNoVigCalculation — textbook -110/-110 case", () => {
  const input = validateNoVigInput({
    sideLabels: ["Home", "Away"],
    books: [{ name: "Standard", americanOdds: [-110, -110] }],
  }) as NoVigInput;
  const out = runNoVigCalculation(input);
  const book = out.books[0]!;

  it("derives ~52.38% raw implied probability per side", () => {
    expect(book.sides[0]!.impliedProbability).toBeCloseTo(0.5238, 4);
    expect(book.sides[1]!.impliedProbability).toBeCloseTo(0.5238, 4);
  });

  it("computes a ~4.5% hold (margin as a fraction of the booked total)", () => {
    // overround = 2 * (110/210) = 1.047619...; hold = 0.047619/1.047619.
    expect(book.overround).toBeCloseTo(1.047619, 5);
    expect(book.hold).toBeCloseTo(0.045454, 5);
  });

  it("normalizes the vig-free fair probabilities to 50/50", () => {
    expect(book.sides[0]!.fairProbability).toBeCloseTo(0.5, 6);
    expect(book.sides[1]!.fairProbability).toBeCloseTo(0.5, 6);
    expect(
      book.sides[0]!.fairProbability + book.sides[1]!.fairProbability,
    ).toBeCloseTo(1, 6);
  });

  it("yields a +100 (pick'em) fair line on both sides", () => {
    expect(book.sides[0]!.fairAmericanOdds).toBe(100);
    expect(book.sides[1]!.fairAmericanOdds).toBe(100);
  });

  it("does not produce a consensus for a single book", () => {
    expect(out.consensus).toBeNull();
  });
});

// ── Asymmetric two-way market ─────────────────────────────────────────────────

describe("runNoVigCalculation — asymmetric favorite/underdog", () => {
  it("devigs a -150 / +130 market to fair probabilities summing to 1", () => {
    const input = validateNoVigInput({
      sideLabels: ["Fav", "Dog"],
      books: [{ americanOdds: [-150, 130] }],
    }) as NoVigInput;
    const out = runNoVigCalculation(input);
    const book = out.books[0]!;

    // -150 → 0.6 implied; +130 → 0.434783 implied; overround ≈ 1.034783.
    expect(book.sides[0]!.impliedProbability).toBeCloseTo(0.6, 5);
    expect(book.sides[1]!.impliedProbability).toBeCloseTo(0.434783, 5);
    expect(book.overround).toBeCloseTo(1.034783, 5);

    const sumFair =
      book.sides[0]!.fairProbability + book.sides[1]!.fairProbability;
    expect(sumFair).toBeCloseTo(1, 6);
    // Favorite's fair prob > its raw implied is impossible; it shrinks slightly.
    expect(book.sides[0]!.fairProbability).toBeLessThan(0.6);
    expect(book.sides[0]!.fairProbability).toBeGreaterThan(0.5);
  });
});

// ── Multi-book consensus ──────────────────────────────────────────────────────

describe("runNoVigCalculation — multi-book consensus", () => {
  it("returns a median consensus fair line that sums to 1", () => {
    const input = validateNoVigInput({
      sideLabels: ["A", "B"],
      books: [
        { name: "B1", americanOdds: [-110, -110] },
        { name: "B2", americanOdds: [-105, -115] },
        { name: "B3", americanOdds: [-120, 100] },
      ],
    }) as NoVigInput;
    const out = runNoVigCalculation(input);

    expect(out.consensus).not.toBeNull();
    const consensus = out.consensus!;
    expect(consensus).toHaveLength(2);
    const sum = consensus[0]!.fairProbability + consensus[1]!.fairProbability;
    expect(sum).toBeCloseTo(1, 6);

    // Average hold is the mean of the three books' holds (all positive).
    expect(out.averageHold).toBeGreaterThan(0);
    for (const b of out.books) {
      expect(b.hold).toBeGreaterThan(0);
    }
  });

  it("the consensus is the per-side median of the books' fair probabilities", () => {
    // Three symmetric books → median fair prob is 0.5 per side → +100 fair line.
    const input = validateNoVigInput({
      books: [
        { americanOdds: [-110, -110] },
        { americanOdds: [-110, -110] },
        { americanOdds: [-110, -110] },
      ],
    }) as NoVigInput;
    const out = runNoVigCalculation(input);
    const consensus = out.consensus!;
    expect(consensus[0]!.fairProbability).toBeCloseTo(0.5, 6);
    expect(consensus[0]!.fairAmericanOdds).toBe(100);
  });
});

// ── n-way market ──────────────────────────────────────────────────────────────

describe("runNoVigCalculation — n-way market", () => {
  it("devigs a three-way soccer market (1X2) to fair probs summing to 1", () => {
    const input = validateNoVigInput({
      sideLabels: ["Home", "Draw", "Away"],
      books: [{ name: "Soccer", americanOdds: [150, 230, 190] }],
    }) as NoVigInput;
    const out = runNoVigCalculation(input);
    const book = out.books[0]!;

    expect(book.sides).toHaveLength(3);
    const sumFair = book.sides.reduce((s, side) => s + side.fairProbability, 0);
    expect(sumFair).toBeCloseTo(1, 6);
    // A three-way market overrounds above 1 with vig present.
    expect(book.overround).toBeGreaterThan(1);
    expect(book.hold).toBeGreaterThan(0);
    // Every fair side is a valid probability.
    for (const side of book.sides) {
      expect(side.fairProbability).toBeGreaterThan(0);
      expect(side.fairProbability).toBeLessThan(1);
      expect(Number.isFinite(side.fairAmericanOdds)).toBe(true);
    }
  });
});

// ── Determinism & honesty ─────────────────────────────────────────────────────

describe("runNoVigCalculation — determinism & honesty", () => {
  const input = validateNoVigInput({
    sideLabels: ["A", "B"],
    books: [
      { name: "B1", americanOdds: [-110, -110] },
      { name: "B2", americanOdds: [-130, 110] },
    ],
  }) as NoVigInput;

  it("is deterministic — same input yields identical output", () => {
    const a = runNoVigCalculation(input);
    const b = runNoVigCalculation(input);
    expect(a).toEqual(b);
  });

  it("always carries the honesty disclaimer", () => {
    const out = runNoVigCalculation(input);
    expect(out.disclaimer).toBe(NO_VIG_DISCLAIMER);
    expect(out.disclaimer.toLowerCase()).toContain("not a published pick");
    expect(out.disclaimer.toLowerCase()).toContain(
      "not an independent read",
    );
    expect(out.disclaimer).toContain("1-800-GAMBLER");
  });

  it("produces plain-language notes about the book's margin", () => {
    const out = runNoVigCalculation(input);
    expect(out.notes.length).toBeGreaterThan(0);
    expect(
      out.notes.some((n) => n.toLowerCase().includes("margin")),
    ).toBe(true);
  });
});
