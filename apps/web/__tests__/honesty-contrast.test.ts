import { describe, expect, it } from "vitest";

/**
 * The honesty contrast — tested for the things that would make it a liability.
 *
 * This module is public-facing marketing copy about other people's failure
 * modes, which is the most legally and reputationally exposed text in the
 * product. Three properties must hold, and none of them is checkable by
 * reading the rendered page casually:
 *
 *   1. No company is named. A structural claim is arguable; an accusation
 *      about a named third party is a different kind of risk entirely.
 *   2. No performance figure appears. A contrast that ends in a win rate
 *      commits the failure it is describing.
 *   3. Every remedy is locatable. `verifyHref` must point somewhere real, or
 *      "you can check this" is itself an unfalsifiable claim.
 */

import {
  HONESTY_CONTRAST,
  honestyContrastStrip,
  WHY_PAY_FOR_HONESTY_LEAD,
} from "@/lib/competitive/honesty-contrast";

/** Every text field a reader could see, as one lowercased corpus. */
function corpus(): string {
  return [
    ...HONESTY_CONTRAST.flatMap((i) => [i.title, i.failureMode, i.weDo, i.verifyLabel]),
    WHY_PAY_FOR_HONESTY_LEAD,
  ]
    .join("\n")
    .toLowerCase();
}

describe("honesty contrast — shape", () => {
  it("has exactly seven failure modes", () => {
    expect(HONESTY_CONTRAST).toHaveLength(7);
  });

  it("has unique, stable ids", () => {
    const ids = HONESTY_CONTRAST.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Pinned: these ids are referenced by the pricing strip and are the join
    // key between the two surfaces. Renaming one silently shortens the strip.
    expect(ids).toContain("retroactive-record");
    expect(ids).toContain("confidence-as-edge");
    expect(ids).toContain("thin-sample-as-signal");
    expect(ids).toContain("silent-disappearance");
  });

  it("states both a mechanism and a remedy for every item", () => {
    for (const item of HONESTY_CONTRAST) {
      // Length floors, not exact copy: a one-line failureMode is a slogan, and
      // the whole value of this list is that each entry is specific enough to
      // be argued with.
      expect(item.failureMode.length, item.id).toBeGreaterThan(120);
      expect(item.weDo.length, item.id).toBeGreaterThan(80);
      expect(item.title.length, item.id).toBeGreaterThan(10);
    }
  });
});

describe("honesty contrast — names no competitor", () => {
  it("contains no company or brand name", () => {
    const text = corpus();
    // Real competitor and adjacent-brand names, plus the generic slurs that
    // would turn this from analysis into an attack.
    const forbidden = [
      "fantasypros",
      "scores24",
      "rotowire",
      "fantasyguru",
      "linestar",
      "bettingpros",
      "actionnetwork",
      "action network",
      "oddsjam",
      "oddsshark",
      "vegasinsider",
      "wagertalk",
      "covers.com",
      "pff",
      "nfelo",
      "draftkings",
      "fanduel",
      "pinnacle",
      "underdog",
      "espn",
    ];
    for (const name of forbidden) {
      expect(text, `must not name "${name}"`).not.toContain(name);
    }
  });

  it("attributes the failure modes to nobody — no accusatory framing", () => {
    const text = corpus();
    // The mechanisms are described impersonally on purpose. "Competitors do X"
    // is a factual claim about third parties we cannot substantiate; "X is
    // possible when a row is mutable" is one we can.
    //
    // Word-BOUNDED, not substring: "lying" is inside "underlying", and
    // "no route to the underlying records" is exactly the kind of precise
    // sentence this list exists to protect. A substring ban would force the
    // copy to get vaguer in order to pass its own honesty test.
    for (const phrase of [
      "competitors?",
      "other sites",
      "rivals?",
      "scams?",
      "fraud",
      "lying",
      "liars?",
      "dishonest",
      "shady",
    ]) {
      expect(text, `must not use "${phrase}"`).not.toMatch(
        new RegExp(`\\b${phrase}\\b`),
      );
    }
  });
});

describe("honesty contrast — asserts no performance number", () => {
  it("contains no digit-percent anywhere", () => {
    // The actual fabrication signal: a rate presented as fact.
    expect(corpus()).not.toMatch(/\d+(\.\d+)?\s?%/);
  });

  it("makes no claim of being verified, proven, or profitable", () => {
    const text = corpus();
    // These words have no honest use in this module. Unlike the gate page —
    // which legitimately says "no win rate is asserted" — nothing here needs to
    // name them even to disclaim them, so a flat ban is the right rule and any
    // hit is a real regression.
    for (const word of ["proven", "guaranteed", "profitable", "risk-free", "beats the market"]) {
      expect(text, `must not claim "${word}"`).not.toContain(word);
    }
  });

  it("does not promise results in the paid-tier lead line", () => {
    const lead = WHY_PAY_FOR_HONESTY_LEAD.toLowerCase();
    // The single most tempting sentence in the product to overstate.
    expect(lead).toContain("does not buy a promise");
    expect(lead).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(lead).not.toContain("win");
  });
});

describe("honesty contrast — every remedy is locatable", () => {
  it("points every item at an internal route", () => {
    for (const item of HONESTY_CONTRAST) {
      expect(item.verifyHref, item.id).toMatch(/^\//);
      expect(item.verifyLabel.length, item.id).toBeGreaterThan(4);
    }
  });

  it("only points at routes that exist in this app", () => {
    // Hard-coded rather than globbed: the point is that a copy edit cannot
    // introduce a link to a page nobody built. If a route is legitimately
    // added, this list is the deliberate place to say so.
    const known = new Set(["/board/gate", "/glass-ledger", "/how-to-verify-a-record"]);
    for (const item of HONESTY_CONTRAST) {
      expect(known, `unknown verifyHref for ${item.id}: ${item.verifyHref}`).toContain(
        item.verifyHref,
      );
    }
  });
});

describe("honesty contrast — the pricing strip is a projection, not a copy", () => {
  it("returns four items drawn from the same source list", () => {
    const strip = honestyContrastStrip();
    expect(strip).toHaveLength(4);
    for (const s of strip) {
      const source = HONESTY_CONTRAST.find((i) => i.id === s.id);
      expect(source, s.id).toBeDefined();
      // Identical wording, by construction. Two hand-maintained lists would
      // drift, and the pricing page is the one most likely to be edited by
      // someone selling rather than someone verifying.
      expect(s.weDo).toBe(source?.weDo);
      expect(s.title).toBe(source?.title);
      expect(s.verifyHref).toBe(source?.verifyHref);
    }
  });

  it("is a strict subset — the pricing page never invents an eighth mode", () => {
    const ids = new Set(HONESTY_CONTRAST.map((i) => i.id));
    for (const s of honestyContrastStrip()) expect(ids).toContain(s.id);
  });
});
