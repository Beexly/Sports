import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_PREVIEW_CAP } from "@/app/sitemap";
import { buildGoogleNewsSitemap } from "@/lib/seo/news-sitemap";
import { listIssues } from "@/lib/newsletter/issues";
import {
  isWaitlistWelcomeEmailEnabled,
} from "@/lib/gse/waitlist-welcome-email";

const root = process.cwd();

describe("under-leveraged queue drain", () => {
  it("caps sitemap preview density", () => {
    expect(SITEMAP_PREVIEW_CAP).toBeLessThanOrEqual(150);
    const src = readFileSync(join(root, "app/sitemap.ts"), "utf8");
    expect(src).toMatch(/SCHEDULED.*LIVE|LIVE.*SCHEDULED/);
    expect(src).not.toMatch(/take:\s*2000/);
  });

  it("ships newsletter issue inside a plausible news window", () => {
    const issues = listIssues();
    expect(issues.some((i) => i.slug === "003-launch-autonomy")).toBe(true);
  });

  it("news sitemap can emit newsletter paths", () => {
    const xml = buildGoogleNewsSitemap({
      entries: [
        {
          slug: "003-launch-autonomy",
          title: "Launch autonomy",
          publishedAt: "2026-08-06T16:00:00.000Z",
          pathPrefix: "/newsletter",
        },
      ],
      now: new Date("2026-08-06T18:00:00.000Z"),
      siteUrl: "https://www.galaxysportsedge.com",
      publicationName: "GSE",
    });
    expect(xml).toContain("/newsletter/003-launch-autonomy");
  });

  it("waitlist welcome email is opt-in", () => {
    expect(isWaitlistWelcomeEmailEnabled({})).toBe(false);
    expect(
      isWaitlistWelcomeEmailEnabled({
        WAITLIST_WELCOME_EMAIL: "true",
        RESEND_API_KEY: "re_x",
        ALERTS_EMAIL_FROM: "alerts@example.com",
      }),
    ).toBe(true);
  });

  it("press kit no longer claims live odds every 30 minutes", () => {
    const press = readFileSync(join(root, "app/press/page.tsx"), "utf8");
    expect(press.toLowerCase()).not.toMatch(/every 30 minutes/);
    expect(press).toMatch(/gse-emblem/);
  });

  it("CSP baseline includes default-src in next config", () => {
    const cfg = readFileSync(join(root, "next.config.mjs"), "utf8");
    expect(cfg).toMatch(/default-src 'self'/);
  });
});
