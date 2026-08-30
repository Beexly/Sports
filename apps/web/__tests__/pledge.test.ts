import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AFFILIATE_FREE_PLEDGE,
  PLEDGE_STATEMENT,
  PLEDGE_VIOLATION,
  PLEDGE_WHY,
} from "@/lib/pledge/affiliate-free";
import { BANNED_ANALYST_PHRASES } from "@/lib/voice/analyst-standard";

const TRUST_GATE_BANNED_PHRASES = [
  "guaranteed",
  "sure thing",
  "risk-free",
  "risk free",
  "easy money",
  "free money",
  "can't lose",
  "beat the book",
  "lock of the day",
];

function readWeb(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("affiliate-free pledge contract", () => {
  it("pins the machine-readable payload", () => {
    expect(AFFILIATE_FREE_PLEDGE).toEqual({
      pledged: true,
      category: "sportsbook_dfs_affiliate",
      since: "2026-08-20",
      enforcement: "guardrail affiliate-structural-separation runs on every commit",
    });
  });

  it("pins the dated pledge sentence", () => {
    expect(PLEDGE_STATEMENT).toBe(
      "Galaxy Sports Edge does not carry sportsbook or DFS affiliate or commission links, and never will — published 2026-08-20",
    );
    expect(PLEDGE_WHY).toMatch(/company paid when its users lose/i);
    expect(PLEDGE_VIOLATION).toBe("any violation will be published on this page within 24 hours");
  });
});

describe("/pledge page", () => {
  const page = readWeb("app/pledge/page.tsx");

  it("renders the pledge, why, and violation clause", () => {
    expect(page).toContain("PLEDGE_STATEMENT");
    expect(page).toContain("PLEDGE_WHY");
    expect(page).toContain("PLEDGE_VIOLATION");
    expect(page).toContain('canonical: "/pledge"');
  });

  it("contains no banned words", () => {
    const lower = page.toLowerCase();
    for (const banned of [...BANNED_ANALYST_PHRASES, ...TRUST_GATE_BANNED_PHRASES]) {
      expect(lower, `banned phrase "${banned}"`).not.toContain(banned.toLowerCase());
    }
  });
});

describe("/api/pledge/affiliate-free", () => {
  it("returns the frozen posture object", async () => {
    const { GET } = await import("@/app/api/pledge/affiliate-free/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(AFFILIATE_FREE_PLEDGE);
  });

  it("does not modify the structural-separation guard", () => {
    const guard = readWeb("../../scripts/guardrails/affiliate-structural-separation.mjs");
    const route = readWeb("app/api/pledge/affiliate-free/route.ts");
    expect(route).toContain("AFFILIATE_FREE_PLEDGE");
    expect(route).not.toContain("affiliate-structural-separation.mjs");
    expect(guard).toContain("Affiliate structural-separation guardrail");
  });
});

describe("pledge is linked", () => {
  it("is in the sitemap and footer", () => {
    expect(readWeb("app/sitemap.ts")).toContain('path: "/pledge"');
    expect(readWeb("components/ui/footer.tsx")).toContain('href: "/pledge"');
  });
});
