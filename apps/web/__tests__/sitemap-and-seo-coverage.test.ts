import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PUBLIC_RECORD_LINE,
  PUBLIC_RECORD_NORMALIZED_BANNER,
  PUBLIC_RECORD_POLICY,
  SUPERSEDED_RECORD_NOTE,
} from "@/lib/ledger/public-record";
import { SITE_URL } from "@/lib/seo/site-url";

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn<() => Promise<unknown[]>>(async () => []),
  blogFindMany: vi.fn<() => Promise<unknown[]>>(async () => []),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findMany: mocks.gameFindMany },
    blogPost: { findMany: mocks.blogFindMany },
  },
  isStubMode: () => true,
}));

vi.mock("@/lib/journal/load", () => ({
  loadPublicJournalEntries: async () => [],
}));

const WEB_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..", "..");

function isPureAscii(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
}

describe("Task 5: Sitemap, llms.txt, OG images, and revenue operating ledger", () => {
  it("emits all core conversion, tool, and Week 11/12 NFL preview routes without /tools/parlay-mri", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    const requiredRoutes = [
      "/packages",
      "/record",
      "/props",
      "/dfs",
      "/partners",
      "/media-kit",
      "/parlay-mri",
      "/optimizer",
      "/tools",
      "/tools/clv-calculator",
      "/tools/ev-calculator",
      "/tools/no-vig-calculator",
      "/tools/odds-converter",
      "/tools/parlay-calculator",
      "/tools/line-movement",
      "/preview/nfl/indianapolis-colts-vs-houston-texans",
      "/preview/nfl/miami-dolphins-vs-buffalo-bills",
      "/preview/nfl/new-york-jets-vs-los-angeles-chargers",
      "/preview/nfl/new-orleans-saints-vs-chicago-bears",
      "/preview/nfl/carolina-panthers-vs-tampa-bay-buccaneers",
      "/preview/nfl/minnesota-vikings-vs-san-francisco-49ers",
    ];

    for (const route of requiredRoutes) {
      expect(urls, `sitemap missing ${route}`).toContain(`${SITE_URL}${route}`);
    }
    expect(urls).not.toContain(`${SITE_URL}/tools/parlay-mri`);
  });

  it("renders /llms.txt from public-record constants including +25.82u normalized banner and clean ASCII", async () => {
    const llmsRoutePath = path.join(WEB_ROOT, "app", "llms.txt", "route.ts");
    const llmsSource = fs.readFileSync(llmsRoutePath, "utf-8");
    expect(llmsSource).toContain("@/lib/ledger/public-record");
    expect(llmsSource).toContain("PUBLIC_RECORD_LINE");
    expect(llmsSource).toContain("PUBLIC_RECORD_NORMALIZED_BANNER");

    const { GET } = await import("@/app/llms.txt/route");
    const res = await GET();
    const body = await res.text();

    expect(body.startsWith("# Galaxy Sports Edge")).toBe(true);
    expect(body).toContain(PUBLIC_RECORD_LINE);
    expect(body).toContain(PUBLIC_RECORD_NORMALIZED_BANNER);
    expect(body).toContain("+25.82u");
    expect(body).toContain(PUBLIC_RECORD_POLICY);
    expect(body).toContain(SUPERSEDED_RECORD_NOTE);
    expect(body).toContain("/packages");
    expect(body).toContain("/record");
    expect(body).toContain("/props");
    expect(body).toContain("/parlay-mri");
    expect(body).toContain("/tools");
    expect(body).not.toContain("62-23-1");
    expect(body).not.toMatch(/%/);
    expect(isPureAscii(body)).toBe(true);
  });

  it("renders /llms-full.txt and /.well-known/ai-plugin.json with normalized +25.82u banner, Week 11 storefront, and zero stale Week 10 APIs", async () => {
    const { GET: getLlmsFull } = await import("@/app/llms-full.txt/route");
    const fullBody = await (await getLlmsFull()).text();
    expect(fullBody).toContain(PUBLIC_RECORD_LINE);
    expect(fullBody).toContain(PUBLIC_RECORD_NORMALIZED_BANNER);
    expect(fullBody).toContain("+25.82u");
    expect(fullBody).toContain("/record");
    expect(fullBody).toContain("/props");
    expect(fullBody).toContain("/dfs");
    expect(fullBody).toContain("/parlay-mri");
    expect(fullBody).toContain("/tools");
    expect(fullBody).not.toMatch(/%/);
    expect(fullBody).not.toContain("62-23-1");
    expect(isPureAscii(fullBody)).toBe(true);

    const { GET: getAiPlugin } = await import("@/app/.well-known/ai-plugin.json/route");
    const pluginJson = await (await getAiPlugin()).json();
    const serializedPlugin = JSON.stringify(pluginJson);
    expect(serializedPlugin).toContain(PUBLIC_RECORD_LINE);
    expect(serializedPlugin).toContain(PUBLIC_RECORD_NORMALIZED_BANNER);
    expect(serializedPlugin).toContain("+25.82u");
    expect(serializedPlugin).not.toMatch(/%/);
    expect(serializedPlugin).not.toContain("62-23-1");
    expect(isPureAscii(serializedPlugin)).toBe(true);

    for (const rel of [
      "app/packages/page.tsx",
      "app/pricing/page.tsx",
      "app/api/storefront/thursday-conversion-pack/route.ts",
      "app/api/ask-edge/route.ts",
    ]) {
      const src = fs.readFileSync(path.join(WEB_ROOT, rel), "utf-8");
      expect(src, `${rel} must target Week 11`).toContain("Week 11");
      expect(src, `${rel} must not cite Week 10`).not.toContain("Week 10");
      expect(src, `${rel} must not cite stale WSH @ NYG`).not.toContain("WSH @ NYG");
      expect(src, `${rel} must not cite stale Mark Andrews`).not.toContain("Mark Andrews");
    }
  });

  it("provides OpenGraph images at /packages/opengraph-image.tsx and /record/opengraph-image.tsx", async () => {
    const pkgOgPath = path.join(WEB_ROOT, "app", "packages", "opengraph-image.tsx");
    const recOgPath = path.join(WEB_ROOT, "app", "record", "opengraph-image.tsx");

    expect(fs.existsSync(pkgOgPath)).toBe(true);
    expect(fs.existsSync(recOgPath)).toBe(true);

    for (const filePath of [pkgOgPath, recOgPath]) {
      const src = fs.readFileSync(filePath, "utf-8");
      expect(isPureAscii(src)).toBe(true);
      expect(src).not.toMatch(new RegExp("Users/" + "Garrett", "i"));
      expect(src).not.toMatch(/\b(calibrated|brier-scored|proven)\b/i);
      expect(src).not.toMatch(/\bverified\s+(?:public\s+|track\s+)?record\b/i);
      expect(src).not.toContain("62-23-1");
      expect(src).not.toMatch(/%/);
    }

    const pkgMod = await import("@/app/packages/opengraph-image");
    const recMod = await import("@/app/record/opengraph-image");
    for (const mod of [pkgMod, recMod]) {
      expect(mod.runtime).toBe("edge");
      expect(mod.size).toEqual({ width: 1200, height: 630 });
      expect(mod.contentType).toBe("image/png");
      expect(typeof mod.default).toBe("function");
    }
  });

  it("updates REVENUE_OPERATING_LEDGER.md to 2026-11-18 with Whop, SKUs, and sponsor policy", () => {
    const ledgerPath = path.join(REPO_ROOT, "docs", "revenue", "REVENUE_OPERATING_LEDGER.md");
    const content = fs.readFileSync(ledgerPath, "utf-8");

    expect(isPureAscii(content)).toBe(true);
    expect(content).not.toMatch(new RegExp("Users/" + "Garrett", "i"));
    expect(content).toContain("2026-11-18");
    expect(content).toContain("biz_jzvuDvevsatKWi");
    expect(content).toContain("hook_IfoCqkZf54X6N");
    expect(content).toContain("30%");
    expect(content).toContain("40%");
    expect(content).toContain("GALAXY15");
    expect(content).toContain("SHARP20");
    expect(content).toContain("REDZONE10");
    expect(content).toContain("CREATOR25");
    expect(content).toContain("$9");
    expect(content).toContain("IND @ HOU");
    expect(content).toContain("$14");
    expect(content).toContain("Thanksgiving");
    expect(content).toMatch(/non-gambling/i);
    expect(content).toMatch(/hard-refuse.*sportsbook\s+CPA|sportsbook\s+CPA.*hard[- ]refuse/i);
  });

  it("keeps pure 7-bit ASCII and clean paths across Task 5 web files", () => {
    for (const rel of [
      "app/sitemap.ts",
      "app/llms.txt/route.ts",
      "app/packages/opengraph-image.tsx",
      "app/record/opengraph-image.tsx",
    ]) {
      const content = fs.readFileSync(path.join(WEB_ROOT, rel), "utf-8");
      expect(isPureAscii(content), `${rel} must be pure 7-bit ASCII`).toBe(true);
      expect(content).not.toMatch(new RegExp("Users/" + "Garrett", "i"));
      expect(content).not.toContain("62-23-1");
    }
  });
});
