import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { displaySelection, NO_BOOK_PRICE_LABEL } from "@/lib/picks/display-selection";

/**
 * FE-05: the signal slate's "(model signal)" selection marker is an internal
 * flag, stripped at display time on every public surface. The DB string is
 * untouched; only the rendered text changes.
 */
describe("displaySelection", () => {
  it("strips the trailing signal-slate marker", () => {
    expect(displaySelection("Kansas City Chiefs ML (model signal)")).toBe("Kansas City Chiefs ML");
    expect(displaySelection("Kansas City Chiefs ML (Model Signal) ")).toBe("Kansas City Chiefs ML");
  });

  it("leaves book-priced selections untouched", () => {
    expect(displaySelection("Away Favs -6.0")).toBe("Away Favs -6.0");
    expect(displaySelection("OVER 48.5")).toBe("OVER 48.5");
  });

  it("only strips the marker at the end of the string", () => {
    expect(displaySelection("(model signal) is not a suffix here")).toBe("(model signal) is not a suffix here");
  });

  it("names the empty line slot in plain words", () => {
    expect(NO_BOOK_PRICE_LABEL).toBe("No book price attached");
  });
});

describe("public surfaces render the selection through displaySelection", () => {
  const root = resolve(__dirname, "..");
  it("/api/picks", () => {
    const src = readFileSync(resolve(root, "app/api/picks/route.ts"), "utf8");
    expect(src).toContain('from "@/lib/picks/display-selection"');
    expect(src).toMatch(/selection:\s*displaySelection\(pick\.selection\)/);
    // One book count for the pill and the market-implied percentage: the
    // mint-time snapshot when the pick has one, else the live column
    // (market-implied-display.test.ts covers the payload).
    expect(src).toMatch(/const bookmakerCount = pick\.signalSnapshot\?\.bookmakerCount \?\? pick\.bookmakerCount;/);
    expect(src).toMatch(/hasBookPrice:\s*bookmakerCount > 0/);
  });
  it("pick card", () => {
    const src = readFileSync(resolve(root, "components/picks/pick-card.tsx"), "utf8");
    expect(src).toMatch(/\{displaySelection\(pick\.selection\)\}/);
    expect(src).toContain("NO_BOOK_PRICE_LABEL");
    expect(src).toMatch(/pick\.hasBookPrice === false/);
  });
});
