import { describe, it, expect } from "vitest";
import {
  SIGNAL_GOOD_CLASS,
  SIGNAL_BAD_CLASS,
  SIGNAL_NEUTRAL_CLASS,
  toneClass,
  toneRowClass,
  buySellTone,
  buySellClass,
  agreementSignal,
  consensusTone,
  consensusClass,
  confidenceTone,
  confidenceClass,
  liftTone,
  liftClass,
  hitRateTone,
  hitRateClass,
  signedTone,
  signedClass,
  formatSigned,
} from "./colors";

// Guard: NONE of the paper-surface helpers may emit the dark failing grays
// (text-ion-2 / text-ion-3) — that's the whole reason this module exists.
const FORBIDDEN = ["text-ion-2", "text-ion-3"];

function assertPaperSafe(cls: string): void {
  for (const bad of FORBIDDEN) {
    expect(cls.includes(bad)).toBe(false);
  }
}

describe("toneClass", () => {
  it("maps tones to the paper-safe classes", () => {
    expect(toneClass("good")).toBe(SIGNAL_GOOD_CLASS);
    expect(toneClass("bad")).toBe(SIGNAL_BAD_CLASS);
    expect(toneClass("neutral")).toBe(SIGNAL_NEUTRAL_CLASS);
  });

  it("never emits the dark failing grays", () => {
    (["good", "bad", "neutral"] as const).forEach((t) => assertPaperSafe(toneClass(t)));
  });
});

describe("toneRowClass", () => {
  it("tints good/bad and leaves neutral untinted", () => {
    expect(toneRowClass("good")).toBe("bg-emerald-50");
    expect(toneRowClass("bad")).toBe("bg-rose-50");
    expect(toneRowClass("neutral")).toBe("");
  });
});

describe("buy / sell / in-line", () => {
  it("buy is good, sell is bad, in-line is neutral", () => {
    expect(buySellTone("buy")).toBe("good");
    expect(buySellTone("sell")).toBe("bad");
    expect(buySellTone("in-line")).toBe("neutral");
  });
  it("classes are paper-safe", () => {
    (["buy", "sell", "in-line"] as const).forEach((s) => assertPaperSafe(buySellClass(s)));
  });
});

describe("agreement / consensus", () => {
  it("classifies by threshold (default 0.8)", () => {
    expect(agreementSignal(0.85)).toBe("agree");
    expect(agreementSignal(0.8)).toBe("agree"); // inclusive
    expect(agreementSignal(0.79)).toBe("diverge");
    expect(agreementSignal(0.7, 0.6)).toBe("agree"); // custom threshold
  });
  it("agree is good, diverge is neutral (we surface, not punish)", () => {
    expect(consensusTone("agree")).toBe("good");
    expect(consensusTone("diverge")).toBe("neutral");
    assertPaperSafe(consensusClass("diverge"));
  });
});

describe("confidence", () => {
  it("high good, low bad, medium neutral", () => {
    expect(confidenceTone("high")).toBe("good");
    expect(confidenceTone("low")).toBe("bad");
    expect(confidenceTone("medium")).toBe("neutral");
    assertPaperSafe(confidenceClass("medium"));
  });
});

describe("lift vs baseline", () => {
  it("respects the deadband and null", () => {
    expect(liftTone(0.05)).toBe("good");
    expect(liftTone(-0.05)).toBe("bad");
    expect(liftTone(0.01)).toBe("neutral"); // inside default deadband
    expect(liftTone(null)).toBe("neutral");
  });
  it("honors a custom deadband", () => {
    expect(liftTone(0.05, 0.1)).toBe("neutral");
    assertPaperSafe(liftClass(0.05));
  });
});

describe("hit-rate vs coin flip", () => {
  it("above upper good, below lower bad, between neutral", () => {
    expect(hitRateTone(0.6)).toBe("good");
    expect(hitRateTone(0.4)).toBe("bad");
    expect(hitRateTone(0.5)).toBe("neutral");
    expect(hitRateTone(null)).toBe("neutral");
    assertPaperSafe(hitRateClass(0.5));
  });
});

describe("signed value", () => {
  it("positive good / negative bad / zero & null neutral", () => {
    expect(signedTone(1.2)).toBe("good");
    expect(signedTone(-1.2)).toBe("bad");
    expect(signedTone(0)).toBe("neutral");
    expect(signedTone(null)).toBe("neutral");
  });
  it("invert flips the meaning (lower-is-better metrics)", () => {
    expect(signedTone(1.2, true)).toBe("bad");
    expect(signedTone(-1.2, true)).toBe("good");
    assertPaperSafe(signedClass(-1.2, true));
  });
});

describe("formatSigned", () => {
  it("prefixes a + on positives and renders an em dash for null", () => {
    expect(formatSigned(1.234, 2)).toBe("+1.23");
    expect(formatSigned(-1.234, 2)).toBe("-1.23");
    expect(formatSigned(0, 1)).toBe("0.0"); // zero has no sign
    expect(formatSigned(null)).toBe("—");
  });
});
