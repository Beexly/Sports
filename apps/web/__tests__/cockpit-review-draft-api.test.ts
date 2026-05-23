import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/review-draft/route.ts");

describe("/api/cockpit/review-draft — admin gating + shape", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("exports dynamic = 'force-dynamic'", () => {
    expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("imports auth() and enforces ADMIN with 403", () => {
    expect(src).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(src).toMatch(/403/);
  });

  it("delegates to reviewDraft (single source of truth for review logic)", () => {
    expect(src).toMatch(/reviewDraft/);
    expect(src).toMatch(/from\s+["']@\/lib\/content\/draft-reviewer["']/);
  });

  it("sources the banned-phrase list from the trust-claims registry", () => {
    expect(src).toMatch(/getBannedPhraseList/);
    expect(src).toMatch(/from\s+["']@\/lib\/trust-claims["']/);
  });

  it("only exports POST — no GET / PUT / PATCH / DELETE", () => {
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
    expect(src).not.toMatch(/export\s+async\s+function\s+(GET|PUT|PATCH|DELETE)/);
  });

  it("validates body — content required, length-capped, context string-typed", () => {
    expect(src).toMatch(/typeof\s+body\.content\s*!==\s*["']string["']/);
    expect(src).toMatch(/content\.length\s*>\s*MAX_CONTENT_CHARS/);
    expect(src).toMatch(/typeof\s+body\.context/);
  });

  it("never writes to the database", () => {
    expect(src).not.toMatch(/db\.\w+\.create\b/);
    expect(src).not.toMatch(/db\.\w+\.update\b/);
    expect(src).not.toMatch(/db\.\w+\.delete\b/);
    expect(src).not.toMatch(/db\.\w+\.upsert\b/);
  });

  it("sets Cache-Control: no-store so reviews are always fresh", () => {
    expect(src).toMatch(/Cache-Control[^"']*no-store/);
  });

  it("emits no auto-bet, auto-publish, or hype words anywhere in the file", () => {
    expect(src).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });

  it("wraps the reviewer call in try/catch and returns a 500 envelope on failure (no internal leak)", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*reviewDraft[\s\S]*\}\s*catch/);
    expect(src).toMatch(/reviewer-failed/);
    expect(src).toMatch(/500/);
  });
});
