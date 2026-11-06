import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

let mockedPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

import { GET } from "../app/ads.txt/route";
import {
  ADSENSE_SCRIPT_SRC,
  AdSenseLoader,
  isEmbedPathname,
} from "../components/observability/AdSenseLoader";

const root = process.cwd();

describe("web standards trust surfaces (outside-the-box)", () => {
  it("ships security.txt route", () => {
    expect(
      existsSync(join(root, "app/.well-known/security.txt/route.ts")),
    ).toBe(true);
    const src = readFileSync(join(root, "app/.well-known/security.txt/route.ts"), "utf8");
    expect(src).toMatch(/hq@galaxysportsedge\.com/);
    expect(src).toMatch(/Expires:/);
  });

  it("ships ads.txt authorizing only the AdSense publisher line", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(
      "google.com, pub-8151105906877749, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("layout includes google-adsense-account meta and adsbygoogle loader URL", () => {
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    expect(layout).toContain(
      '<meta name="google-adsense-account" content="ca-pub-8151105906877749" />',
    );
    expect(layout).toContain(
      "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8151105906877749",
    );
  });

  it("suppresses AdSense loader script on /embed/* and renders it on non-embed routes", () => {
    for (const embedPath of ["/embed", "/embed/edge-index/abc123", "/embed/widget"]) {
      mockedPathname = embedPath;
      expect(isEmbedPathname(embedPath)).toBe(true);
      const html = renderToStaticMarkup(React.createElement(AdSenseLoader));
      expect(html, `${embedPath} must not render AdSense loader`).toBe("");
    }

    for (const publicPath of ["/", "/board", "/pricing", "/record"]) {
      mockedPathname = publicPath;
      expect(isEmbedPathname(publicPath)).toBe(false);
      const html = renderToStaticMarkup(React.createElement(AdSenseLoader));
      expect(html, `${publicPath} must render AdSense loader`).toContain(ADSENSE_SCRIPT_SRC);
      expect(html).toContain('crossorigin="anonymous"');
    }
  });

  it("manifest does not claim live odds cadence while board may be dark", () => {
    const manifest = readFileSync(join(root, "public/site.webmanifest"), "utf8");
    expect(manifest.toLowerCase()).not.toMatch(/every 30 minutes/);
    expect(manifest.toLowerCase()).not.toMatch(/live odds/);
  });

  it("layout advertises podcast + journal RSS", () => {
    const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/podcast\/feed\.xml/);
    expect(layout).toMatch(/journal\/rss\.xml/);
  });

  it("favicon.ico and apple-touch defaults redirect to brand marks", () => {
    expect(existsSync(join(root, "app/favicon.ico/route.ts"))).toBe(true);
    expect(existsSync(join(root, "app/apple-touch-icon.png/route.ts"))).toBe(true);
  });
});
