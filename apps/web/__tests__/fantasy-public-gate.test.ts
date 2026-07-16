import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  fantasyGateDestination,
  isPublicFantasyToolPath,
} from "@/lib/fantasy/public-gate";

describe("public fantasy data gate", () => {
  it.each([
    "/fantasy/draft",
    "/fantasy/bestball",
    "/fantasy/connect",
    "/fantasy/dfs",
    "/fantasy/baseline",
    "/fantasy/trade",
    "/fantasy/waivers",
    "/fantasy/new-future-tool",
    "/optimizer",
  ])("classifies %s as publicly gated", (pathname) => {
    expect(isPublicFantasyToolPath(pathname)).toBe(true);
  });

  it.each(["/fantasy", "/fantasy/studio", "/fantasy/studio/review", "/picks"])(
    "does not intercept %s",
    (pathname) => {
      expect(isPublicFantasyToolPath(pathname)).toBe(false);
    },
  );

  it("encodes the requested path without creating a legacy tool redirect loop", () => {
    expect(fantasyGateDestination("/fantasy/draft")).toBe(
      "/fantasy?from=%2Ffantasy%2Fdraft",
    );
  });

  it.each(["/fantasy/draft", "/fantasy/props", "/optimizer"])(
    "redirects %s before the tool page runs",
    (pathname) => {
      const response = middleware(new NextRequest(`https://gse.test${pathname}`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `https://gse.test${fantasyGateDestination(pathname)}`,
      );
    },
  );

  it("leaves the public gate page reachable", () => {
    const response = middleware(new NextRequest("https://gse.test/fantasy"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  // M2 (2026-07-16): social-card crawlers do not follow the 307 — metadata
  // image routes must pass the gate or every share card for gated paths breaks.
  it.each([
    "/fantasy/draft/opengraph-image",
    "/fantasy/draft/twitter-image",
    "/fantasy/bestball/opengraph-image-a1b2c3",
    "/optimizer/opengraph-image",
  ])("exempts the metadata image route %s from the 307 redirect", (pathname) => {
    expect(isPublicFantasyToolPath(pathname)).toBe(false);
    const response = middleware(new NextRequest(`https://gse.test${pathname}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
