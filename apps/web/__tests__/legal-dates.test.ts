import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRIVACY_LAST_UPDATED,
  TERMS_LAST_UPDATED,
  formatLegalDate,
} from "@/lib/legal-dates";

/**
 * Legal "Last updated" honesty guard.
 *
 * The legal pages must render a STATIC revision date — one that reflects when
 * each document's TEXT was last revised, and that only changes when the text
 * changes. The original bug computed the date with `new Date()` at render
 * time, so every page load claimed the document was "updated today",
 * silently defeating the material-change / change-notice clauses inside the
 * documents. These tests prove the date can never drift with the clock.
 */

const termsSource = readFileSync(
  resolve(__dirname, "..", "app", "terms", "page.tsx"),
  "utf8"
);
const privacySource = readFileSync(
  resolve(__dirname, "..", "app", "privacy", "page.tsx"),
  "utf8"
);

afterEach(() => {
  vi.useRealTimers();
});

describe("legal-dates constants", () => {
  it("exposes static ISO calendar dates", () => {
    expect(TERMS_LAST_UPDATED).toBe("2026-06-20");
    expect(PRIVACY_LAST_UPDATED).toBe("2026-07-01");
  });

  it("formats a fixed date into the page's human-readable style", () => {
    expect(formatLegalDate(TERMS_LAST_UPDATED)).toBe("June 20, 2026");
    expect(formatLegalDate(PRIVACY_LAST_UPDATED)).toBe("July 1, 2026");
  });

  it("does NOT drift when the system clock advances to a different day", () => {
    // Mock "now" to a day far from either revision date.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-03-15T12:00:00Z"));

    // What the OLD buggy render-time code would have produced today:
    const todayRendered = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // The static values stay pinned to their true revision dates...
    expect(formatLegalDate(TERMS_LAST_UPDATED)).toBe("June 20, 2026");
    expect(formatLegalDate(PRIVACY_LAST_UPDATED)).toBe("July 1, 2026");

    // ...and crucially do NOT equal a freshly-computed "today".
    expect(formatLegalDate(TERMS_LAST_UPDATED)).not.toBe(todayRendered);
    expect(formatLegalDate(PRIVACY_LAST_UPDATED)).not.toBe(todayRendered);
  });

  it("is deterministic regardless of the current time (idempotent across clocks)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const atFuture = formatLegalDate(TERMS_LAST_UPDATED);
    vi.setSystemTime(new Date("2020-12-31T23:59:59Z"));
    const atPast = formatLegalDate(TERMS_LAST_UPDATED);
    expect(atFuture).toBe(atPast);
    expect(atFuture).toBe("June 20, 2026");
  });
});

describe("legal pages render a static last-updated date (regression guard)", () => {
  it("terms page does not compute its date with new Date()", () => {
    expect(termsSource).not.toMatch(/new Date\(\)/);
    expect(termsSource).toMatch(
      /formatLegalDate\(\s*TERMS_LAST_UPDATED\s*\)/
    );
    expect(termsSource).toMatch(
      /from\s+["']@\/lib\/legal-dates["']/
    );
  });

  it("privacy page does not compute its date with new Date()", () => {
    expect(privacySource).not.toMatch(/new Date\(\)/);
    expect(privacySource).toMatch(
      /formatLegalDate\(\s*PRIVACY_LAST_UPDATED\s*\)/
    );
    expect(privacySource).toMatch(
      /from\s+["']@\/lib\/legal-dates["']/
    );
  });
});
