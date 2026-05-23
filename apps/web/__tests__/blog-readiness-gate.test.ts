import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "..", "..", "..");
const blogIndex = readFileSync(resolve(repoRoot, "apps/web/app/blog/page.tsx"), "utf8");
const blogDetail = readFileSync(resolve(repoRoot, "apps/web/app/blog/[slug]/page.tsx"), "utf8");
const blogApi = readFileSync(resolve(repoRoot, "apps/web/app/api/blog/route.ts"), "utf8");

describe("public blog readiness gate", () => {
  it("keeps the blog index from querying published posts while the content gate is closed", () => {
    expect(blogIndex).toContain("getReadinessGates");
    expect(blogIndex).toContain("gates.canPublishContent");
    expect(blogIndex).toMatch(/if\s*\(\s*gates\.canPublishContent\s*\)\s*\{[\s\S]*db\.blogPost\.findMany/);
  });

  it("hides public detail pages and metadata while the content gate is closed", () => {
    expect(blogDetail).toContain("getReadinessGates");
    expect(blogDetail).toMatch(/if\s*\(\s*!gates\.canPublishContent\s*\)\s*return\s*\{\s*title:\s*"Not Found"\s*\}/);
    expect(blogDetail).toMatch(/if\s*\(\s*!gates\.canPublishContent\s*\)\s*notFound\(\)/);
  });

  it("short-circuits the blog API with a bootstrap gate response", () => {
    expect(blogApi).toContain("getReadinessGates");
    expect(blogApi).toContain("bootstrapGateResponse");
    expect(blogApi).toMatch(/if\s*\(\s*!gates\.canPublishContent\s*\)/);
    expect(blogApi).toMatch(/bootstrapGateResponse\("Public blog"\)[\s\S]*status:\s*503/);
  });
});
