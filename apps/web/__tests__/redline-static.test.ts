import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { GET } from "../app/redline/route";

describe("REDLINE production route", () => {
  it("serves the standalone experience with production social metadata", async () => {
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("GSE — Redline Ledger");
    expect(html).toContain('property="og:url" content="https://www.galaxysportsedge.com/redline"');
    expect(html).toContain('property="og:image" content="https://www.galaxysportsedge.com/assets/og/gse-redline-og.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('/redline/assets/');
  });

  it("publishes every downloadable asset", () => {
    const required = [
      "assets/higgsfield/hero-sideline.webp",
      "assets/og/gse-redline-og.png",
      "assets/social/gse-dfs-portrait.png",
      "assets/social/gse-redline-story.mp4",
      "assets/cards/gse-dfs-card.png",
    ];
    for (const relative of required) {
      expect(existsSync(resolve(process.cwd(), "apps", "web", "public", relative)), relative).toBe(true);
    }
  });
});
