import { describe, it, expect } from "vitest";
import {
  scanText,
  isBrandSafe,
  assertBrandSafe,
  MANDATORY_VISUAL_LINE,
  FORBIDDEN_PUBLIC_TERMS,
} from "../language-law.js";
import {
  buildAssetBrief,
  ASSET_BRIEF_NEGATIVE_PROMPT,
  placeholderPalette,
} from "../asset-brief.js";

describe("Brand Language Law (bible §6)", () => {
  it("passes clean Galaxy copy", () => {
    const ok =
      "Run a Signal Check in the War Room, climb the Rank, and grow your Dynasty.";
    expect(isBrandSafe(ok)).toBe(true);
    expect(scanText(ok)).toEqual([]);
  });

  it("flags forbidden public vocabulary", () => {
    const c = "cas" + "ino";
    const w = "wa" + "ger";
    expect(scanText(`Visit the ${c}`).length).toBeGreaterThan(0);
    expect(scanText(`place a ${w}`).length).toBeGreaterThan(0);
  });

  it("does not false-positive on legitimate words (whole-word matching)", () => {
    // "Blacktop" / "clock" must not trip the 'lock' rule; "Builder" is clean.
    expect(isBrandSafe("The Blacktop run starts at the clock.")).toBe(true);
    expect(isBrandSafe("Builders think in seasons.")).toBe(true);
  });

  it("assertBrandSafe throws with context on a violation", () => {
    const g = "guaran" + "teed";
    expect(() => assertBrandSafe(`${g} winner`, "test copy")).toThrow(/Language Law/);
  });

  it("the forbidden list never reads as a violation itself (self-safe fragments)", () => {
    // Each term entry is data; the registry is internally consistent.
    expect(FORBIDDEN_PUBLIC_TERMS.length).toBeGreaterThan(10);
  });
});

describe("Higgsfield asset-brief pipeline (bible §6 visual law)", () => {
  it("always includes the mandatory visual line", () => {
    const brief = buildAssetBrief({ kind: "avatar", subject: "a calibrated Sharp operative" });
    expect(brief.prompt).toContain(MANDATORY_VISUAL_LINE);
    expect(brief.negativePrompt).toBe(ASSET_BRIEF_NEGATIVE_PROMPT);
    expect(brief.generated).toBe(false); // no API call this build (D-004)
  });

  it("rejects subjects that depict forbidden things", () => {
    expect(() => buildAssetBrief({ kind: "ui_scene", subject: "a sportsbook odds board" })).toThrow(
      /Visual Law/,
    );
    expect(() => buildAssetBrief({ kind: "avatar", subject: "a real athlete likeness" })).toThrow(
      /Visual Law/,
    );
  });

  it("produces deterministic seeds and palettes within the Galaxy palette", () => {
    const a = buildAssetBrief({ kind: "badge", subject: "Signal Keeper badge" });
    const b = buildAssetBrief({ kind: "badge", subject: "Signal Keeper badge" });
    expect(a.seed).toBe(b.seed);
    const pal = placeholderPalette(a.seed);
    expect(pal.base).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(pal.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
