/**
 * D-8 (C12): age-attestation gate unit tests — surface classification and
 * the open-redirect guard on the ?next parameter.
 */
import { describe, expect, it } from "vitest";
import { isAgeGatedSurface, safeAgeRedirect } from "@/lib/age-verify/surface";

describe("isAgeGatedSurface", () => {
  it("gates the betting-analysis surfaces", () => {
    for (const p of [
      "/board", "/pricing", "/picks", "/performance", "/today",
      "/intelligence", "/ledger", "/stats", "/watchlist", "/vault",
    ]) {
      expect(isAgeGatedSurface(p)).toBe(true);
    }
  });

  it("leaves marketing, legal, account, and API paths open", () => {
    for (const p of [
      "/", "/about", "/methodology", "/responsible-play", "/account",
      "/api/picks/daily-slate", "/auth/signin", "/age-verify",
    ]) {
      expect(isAgeGatedSurface(p)).toBe(false);
    }
  });

  it("gates nested paths under a gated root", () => {
    expect(isAgeGatedSurface("/board/archive")).toBe(true);
    expect(isAgeGatedSurface("/pricing/pro")).toBe(true);
  });
});

describe("safeAgeRedirect", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeAgeRedirect("/board")).toBe("/board");
    expect(safeAgeRedirect("/stats/nfl")).toBe("/stats/nfl");
  });

  it("rejects protocol-relative and absolute URLs (open redirect)", () => {
    expect(safeAgeRedirect("//evil.example")).toBe("/");
    expect(safeAgeRedirect("https://evil.example")).toBe("/");
    expect(safeAgeRedirect("/\\evil")).toBe("/");
  });

  it("rejects the gate itself and non-paths", () => {
    expect(safeAgeRedirect("/age-verify")).toBe("/");
    expect(safeAgeRedirect("javascript:alert(1)")).toBe("/");
    expect(safeAgeRedirect("")).toBe("/");
    expect(safeAgeRedirect(null)).toBe("/");
  });
});
