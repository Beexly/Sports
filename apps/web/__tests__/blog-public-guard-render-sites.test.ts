import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { guardPublicContent, guardPublicExcerpt } from "@/lib/blog/public-guard";
import { scanForBannedPhrases } from "@/lib/trust-claims";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const blogIndex = fs.readFileSync(path.join(repoRoot, "apps/web/app/blog/page.tsx"), "utf8");
const blogDetail = fs.readFileSync(path.join(repoRoot, "apps/web/app/blog/[slug]/page.tsx"), "utf8");
const blogApi = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/blog/route.ts"), "utf8");

describe("public blog read sites route through the no-claim guard", () => {
  it("guards the excerpt on the public blog index", () => {
    expect(blogIndex).toContain('from "@/lib/blog/public-guard"');
    expect(blogIndex).toContain("guardPublicExcerpt(post.excerpt)");
  });

  it("guards the card title (h2) on the public blog index", () => {
    // Regression guard for D2: the public <h2> card heading must run the raw
    // title through guardPublicTitle, not render post.title raw.
    expect(blogIndex).toContain("guardPublicTitle(post.title)");
  });

  it("guards BOTH excerpt and content on the public blog detail page", () => {
    expect(blogDetail).toContain('from "@/lib/blog/public-guard"');
    expect(blogDetail).toContain("guardPublicExcerpt(post.excerpt)");
    expect(blogDetail).toContain("guardPublicContent(post.content)");
  });

  it("guards the visible title (h1) on the public blog detail page", () => {
    // Regression guard for D1: the public <h1> must run the raw title through
    // guardPublicTitle — this is the exact path the no-claim leak slipped on.
    expect(blogDetail).toContain("guardPublicTitle(post.title)");
  });

  it("guards the title/SEO paths in the blog detail generateMetadata (OG/<title>/meta)", () => {
    // Regression guard for D1: generateMetadata must not emit a raw seoTitle/title
    // or raw seoDescription/excerpt into the metadata that becomes OG/<title>/meta.
    expect(blogDetail).toContain("generateMetadata");
    expect(blogDetail).toContain("guardPublicTitle(post.seoTitle ?? post.title)");
    // The description path is guarded too (seoDescription via guardPublicTitle,
    // excerpt fallback via guardPublicExcerpt) — assert no raw seoTitle/title leaks.
    expect(blogDetail).not.toContain("title: post.seoTitle ?? post.title");
  });

  it("guards excerpt and content on the public blog API route", () => {
    expect(blogApi).toContain('from "@/lib/blog/public-guard"');
    expect(blogApi).toContain("guardPublicExcerpt");
    expect(blogApi).toContain("guardPublicContent");
  });
});

describe("blog guard behavior (no banned phrase reaches a public surface)", () => {
  // Confirmed banned language shared with journal-public-guard.test.ts.
  const dirty = "This one is a guaranteed profit — basically a sure thing, you can't lose.";

  const EXCERPT_PLACEHOLDER = "This post is being re-reviewed before publication.";
  const CONTENT_PLACEHOLDER = "This analysis is temporarily unavailable while it is re-reviewed.";

  it("the fixture really trips the banned-phrase scanner", () => {
    expect(scanForBannedPhrases(dirty).length).toBeGreaterThan(0);
  });

  it("guardPublicExcerpt replaces banned input with the calm placeholder", () => {
    const out = guardPublicExcerpt(dirty);
    expect(out).toBe(EXCERPT_PLACEHOLDER);
    expect(out).not.toContain("guaranteed profit");
    expect(scanForBannedPhrases(out)).toHaveLength(0);
  });

  it("guardPublicContent replaces banned input with the calm placeholder", () => {
    const out = guardPublicContent(dirty);
    expect(out).toBe(CONTENT_PLACEHOLDER);
    expect(out).not.toContain("guaranteed profit");
    expect(scanForBannedPhrases(out)).toHaveLength(0);
  });

  it("passes clean copy through unchanged", () => {
    const clean = "Line moved on Thursday; we weight recent form and score every matchup.";
    expect(scanForBannedPhrases(clean)).toHaveLength(0);
    expect(guardPublicExcerpt(clean)).toBe(clean);
    expect(guardPublicContent(clean)).toBe(clean);
  });
});
