import { describe, expect, it } from "vitest";
import { isAsciiEmail, canonicalEmail } from "@/lib/auth/email-guard";

/**
 * email-guard — pins the fail-closed ASCII gate on the ADMIN allow-list path.
 * The homoglyph class (GHSA-7rqj-j65f-68wh) must never match, in either
 * direction: a Unicode lookalike email can neither be accepted as admin nor
 * normalized into the allow-list.
 */

describe("isAsciiEmail", () => {
  it("accepts a normal admin email", () => {
    expect(isAsciiEmail("founder@example.com")).toBe(true);
    expect(isAsciiEmail("  Founder+tag@Example.COM  ")).toBe(true);
  });

  it("rejects null, empty, and whitespace", () => {
    expect(isAsciiEmail(null)).toBe(false);
    expect(isAsciiEmail(undefined)).toBe(false);
    expect(isAsciiEmail("")).toBe(false);
    expect(isAsciiEmail("   ")).toBe(false);
  });

  it("rejects Unicode homoglyph emails (fullwidth @, non-ASCII domains)", () => {
    // U+FF20 FULLWIDTH COMMERCIAL AT — the homoglyph class from the advisory.
    expect(isAsciiEmail("founder＠example.com")).toBe(false);
    expect(isAsciiEmail("founder@exämple.com")).toBe(false);
    expect(isAsciiEmail("fóunder@example.com")).toBe(false);
  });

  it("rejects malformed shapes", () => {
    expect(isAsciiEmail("not-an-email")).toBe(false);
    expect(isAsciiEmail("a@b")).toBe(false); // no dotted TLD
    expect(isAsciiEmail("a@b.c")).toBe(false);
    expect(isAsciiEmail("@example.com")).toBe(false);
    expect(isAsciiEmail("a@.com")).toBe(false);
  });
});

describe("canonicalEmail", () => {
  it("trims and lowercases without changing the address", () => {
    expect(canonicalEmail("  Founder@Example.COM  ")).toBe("founder@example.com");
    expect(canonicalEmail(null)).toBe("");
  });
});
