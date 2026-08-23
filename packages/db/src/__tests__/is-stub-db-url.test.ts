import { describe, it, expect } from "vitest";
import { isStubDbUrl } from "../index.js";

// ============================================================
// isStubDbUrl — the prod-stub boundary predicate.
//
// This is the gate at index.ts:174 that decides between the real
// Prisma client and the silent-write-drop stub. A URL the predicate
// (wrongly) calls a stub in production would silently drop every write
// while jobs report success — so the exact boundary is pinned here.
//
// Behavior read from packages/db/src/index.ts:34-42:
//   if (!url) return true;                         // undefined / "" (empty)
//   const trimmed = url.trim();
//   if (trimmed === "") return true;               // whitespace-only
//   if (trimmed.startsWith("changeme")) return true;
//   if (trimmed.includes("dummy:dummy")) return true;
//   if (trimmed === "stub" || trimmed === "none") return true;
//   return false;                                  // anything else (real URL)
// ============================================================

describe("isStubDbUrl — treats stub/placeholder URLs as stub (true)", () => {
  it("undefined → true", () => {
    expect(isStubDbUrl(undefined)).toBe(true);
  });

  it("empty string → true", () => {
    expect(isStubDbUrl("")).toBe(true);
  });

  it("whitespace-only string → true (trimmed is empty)", () => {
    expect(isStubDbUrl("   ")).toBe(true);
  });

  it('exact sentinel "stub" → true', () => {
    expect(isStubDbUrl("stub")).toBe(true);
  });

  it('exact sentinel "none" → true', () => {
    expect(isStubDbUrl("none")).toBe(true);
  });

  it('"changeme" placeholder prefix → true', () => {
    expect(isStubDbUrl("changeme")).toBe(true);
  });

  it('"changeme..." longer placeholder → true (startsWith match)', () => {
    expect(isStubDbUrl("changeme-please-set-real-db-url")).toBe(true);
  });

  it('a connection string containing "dummy:dummy" → true', () => {
    expect(
      isStubDbUrl("postgresql://dummy:dummy@localhost:5432/db")
    ).toBe(true);
  });

  it("a sentinel surrounded by whitespace → true (trim then exact match)", () => {
    expect(isStubDbUrl("  stub  ")).toBe(true);
  });
});

describe("isStubDbUrl — treats real connection strings as live (false)", () => {
  it("a real postgres URL → false", () => {
    expect(
      isStubDbUrl("postgresql://user:pass@db.example.com:5432/sports")
    ).toBe(false);
  });

  it("a real neon URL → false", () => {
    expect(
      isStubDbUrl(
        "postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
      )
    ).toBe(false);
  });

  it('"none" as a substring of a real URL → false (only exact "none" is a stub)', () => {
    // host literally named "none" — exact-match guard means this is NOT a stub
    expect(isStubDbUrl("postgresql://u:p@none.example.com:5432/db")).toBe(false);
  });

  it('"dummy" without the ":dummy" pair → false (requires the exact "dummy:dummy")', () => {
    expect(isStubDbUrl("postgresql://dummy@localhost:5432/db")).toBe(false);
  });
});
