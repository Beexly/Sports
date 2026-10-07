import { describe, expect, it } from "vitest";
import {
  REDACTED_MARKET,
  boardMarketLabel,
  heldTickerLine,
  publishedTickerLine,
} from "@/lib/board/market-label";

/**
 * SO-1g. Display-layer invariants for the tier-redaction sentinel.
 *
 * The loader redacts `BoardStateRow.market` to the literal "ALL_MARKETS" for
 * viewers below PREMIUM (lib/board/state.ts); this module is the only thing
 * that keeps that token away from customers. Measured on production
 * 2026-09-13, the homepage ticker printed "we're on ALL_MARKETS" before this
 * module existed. The sentinel on the WIRE is pinned elsewhere
 * (e2e/journey-anonymous.spec.ts, board-fixture-dedupe, board-gate-decisions)
 * — here we pin the three label functions that decide what a person sees.
 *
 * All strings below are labelled fixtures or the module's own doc examples,
 * not product data.
 */

describe("REDACTED_MARKET sentinel constant", () => {
  it("is the exact wire literal the loader emits", () => {
    // The loader (lib/board/state.ts) and this labeler must agree on one
    // byte-exact literal. Renaming either side without the other re-prints
    // the sentinel on three customer surfaces.
    expect(REDACTED_MARKET).toBe("ALL_MARKETS");
  });
});

describe("boardMarketLabel", () => {
  it("returns empty string for null", () => {
    expect(boardMarketLabel(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(boardMarketLabel(undefined)).toBe("");
  });

  it("returns empty string for the empty string", () => {
    expect(boardMarketLabel("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(boardMarketLabel("   ")).toBe("");
  });

  it("redacts the bare sentinel", () => {
    expect(boardMarketLabel("ALL_MARKETS")).toBe("");
  });

  it("redacts the padded sentinel", () => {
    expect(boardMarketLabel("  ALL_MARKETS  ")).toBe("");
  });

  it("redacts the sentinel with tab/newline padding", () => {
    expect(boardMarketLabel("\tALL_MARKETS\n")).toBe("");
  });

  it("passes a real selection through verbatim", () => {
    expect(boardMarketLabel("Chicago Bears -3.0")).toBe("Chicago Bears -3.0");
  });

  it("trims a padded real selection", () => {
    expect(boardMarketLabel("  Chicago Bears -3.0  ")).toBe("Chicago Bears -3.0");
  });

  it("is case-sensitive: a lowercase lookalike is treated as real selection text (pinned as-is)", () => {
    // The loader emits the exact uppercase literal, so anything not byte-equal
    // is by construction real selection text. PINNED AS-IS, not endorsed: if a
    // caller ever emits a differently-cased sentinel, this test will catch the
    // disagreement at the seam rather than print the token.
    expect(boardMarketLabel("all_markets")).toBe("all_markets");
  });

  it("treats a space-separated lookalike as real selection text (exact match only)", () => {
    expect(boardMarketLabel("ALL MARKETS")).toBe("ALL MARKETS");
  });

  it("never returns the sentinel for any tested input class", () => {
    const inputs = [
      null,
      undefined,
      "",
      "   ",
      "ALL_MARKETS",
      "  ALL_MARKETS  ",
      "\tALL_MARKETS\n",
      "all_markets",
      "ALL MARKETS",
      "Chicago Bears -3.0",
    ];
    for (const input of inputs) {
      expect(boardMarketLabel(input)).not.toBe(REDACTED_MARKET);
    }
  });
});

describe("publishedTickerLine", () => {
  const matchup = "Texas Rangers @ Arizona Diamondbacks";

  it("names the selection when the viewer is entitled to it", () => {
    expect(publishedTickerLine(matchup, "Chicago Bears -3.0")).toBe(
      `${matchup}: we're on Chicago Bears -3.0`,
    );
  });

  it("falls back to plain copy when the market is the sentinel", () => {
    expect(publishedTickerLine(matchup, REDACTED_MARKET)).toBe(
      `${matchup}: we're on this one`,
    );
  });

  it("falls back to plain copy when the market is null", () => {
    expect(publishedTickerLine(matchup, null)).toBe(`${matchup}: we're on this one`);
  });

  it("falls back to plain copy when the market is undefined", () => {
    expect(publishedTickerLine(matchup, undefined)).toBe(`${matchup}: we're on this one`);
  });

  it("falls back to plain copy when the market is empty", () => {
    expect(publishedTickerLine(matchup, "")).toBe(`${matchup}: we're on this one`);
  });

  it("carries the selection verbatim, no case or punctuation change", () => {
    expect(publishedTickerLine(matchup, "Rangers -1.5 (+100)")).toBe(
      `${matchup}: we're on Rangers -1.5 (+100)`,
    );
  });

  it("never prints the sentinel token in the fallback", () => {
    expect(publishedTickerLine(matchup, REDACTED_MARKET)).not.toContain(
      REDACTED_MARKET,
    );
  });
});

describe("heldTickerLine", () => {
  const matchup = "Chicago Bears @ Minnesota Vikings";

  it("shows a real gate reason verbatim after the held verdict", () => {
    expect(
      heldTickerLine(matchup, "Not enough sportsbooks are pricing this game yet."),
    ).toBe(`${matchup}: held. Not enough sportsbooks are pricing this game yet.`);
  });

  it("drops the reason sentence entirely for null", () => {
    expect(heldTickerLine(matchup, null)).toBe(`${matchup}: held`);
  });

  it("drops the reason sentence entirely for undefined", () => {
    expect(heldTickerLine(matchup, undefined)).toBe(`${matchup}: held`);
  });

  it("drops the reason sentence entirely for an empty reason", () => {
    expect(heldTickerLine(matchup, "")).toBe(`${matchup}: held`);
  });

  it("drops the reason sentence entirely for a whitespace-only reason", () => {
    expect(heldTickerLine(matchup, "   ")).toBe(`${matchup}: held`);
  });

  it("shows a whitespace-padded reason trimmed, not raw", () => {
    expect(heldTickerLine(matchup, "  reason text  ")).toBe(`${matchup}: held. reason text`);
  });

  it("preserves internal punctuation of the reason verbatim", () => {
    expect(heldTickerLine(matchup, "GATE: reason A, B; C.")).toBe(
      `${matchup}: held. GATE: reason A, B; C.`,
    );
  });

  it("says held, not passed, on the fallback path (deliberate, pass-reason.ts)", () => {
    // pass-reason.ts: fallback rows were never evaluated, so calling that a
    // pass asserts a judgement nobody made. The FIELD copy doctrine's
    // "passed" rule yields to that doc here. Pinning the deliberate wording
    // so a copy sweep cannot flip it silently.
    const line = heldTickerLine(matchup, null);
    expect(line).toBe(`${matchup}: held`);
    expect(line).not.toContain("passed");
  });
});

describe("cross-function contract", () => {
  it("a row that is sayable under boardMarketLabel names the selection in the ticker; a redacted row never does", () => {
    const sayable = boardMarketLabel("Chicago Bears -3.0");
    expect(publishedTickerLine("A @ B", sayable)).toBe("A @ B: we're on Chicago Bears -3.0");

    const redacted = boardMarketLabel(REDACTED_MARKET);
    const line = publishedTickerLine("A @ B", redacted);
    expect(line).toBe("A @ B: we're on this one");
    expect(line).not.toContain("ALL_MARKETS");
  });
});
