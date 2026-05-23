import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(repoRoot, "app/api/cockpit/brief/route.ts");

describe("/api/cockpit/brief — POST compose preview", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("exports both GET and POST", () => {
    expect(src).toMatch(/export\s+async\s+function\s+GET/);
    expect(src).toMatch(/export\s+async\s+function\s+POST/);
  });

  it("POST is admin-gated with a 401 on non-admin", () => {
    // both handlers admin-gate; assert the POST branch references role check + 401
    const postBlock = src.slice(src.indexOf("export async function POST"));
    expect(postBlock).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(postBlock).toMatch(/status:\s*401/);
  });

  it("delegates composition to composeBriefAsync (single source of truth)", () => {
    expect(src).toMatch(/composeBriefAsync/);
    expect(src).toMatch(/from\s+["']@\/lib\/brief\/compose["']/);
  });

  it("validates required body fields (date string + picks array)", () => {
    expect(src).toMatch(/typeof\s+body\.date\s*!==\s*["']string["']/);
    expect(src).toMatch(/Array\.isArray\(body\.picks\)/);
  });

  it("returns 400 with structured error envelopes for invalid input", () => {
    expect(src).toMatch(/status:\s*400/);
    expect(src).toMatch(/date is required/);
    expect(src).toMatch(/picks is required/);
  });

  it("wraps the composer call in try/catch and returns a 500 envelope on failure", () => {
    expect(src).toMatch(/try\s*\{[\s\S]*composeBriefAsync[\s\S]*\}\s*catch/);
    expect(src).toMatch(/composer-failed/);
    expect(src).toMatch(/status:\s*500/);
  });

  it("sets Cache-Control: no-store on the success response", () => {
    expect(src).toMatch(/Cache-Control[^"']*no-store/);
  });

  it("does not write to the database (read+compute only)", () => {
    expect(src).not.toMatch(/db\.\w+\.create\b/);
    expect(src).not.toMatch(/db\.\w+\.update\b/);
    expect(src).not.toMatch(/db\.\w+\.delete\b/);
    expect(src).not.toMatch(/db\.\w+\.upsert\b/);
  });

  it("never sets a publishedAt — composer returns DRAFT only", () => {
    expect(src).not.toMatch(/publishedAt\s*:\s*new\s+Date/);
    expect(src).not.toMatch(/publishedAt\s*=\s*new\s+Date/);
  });

  it("exports dynamic = 'force-dynamic'", () => {
    expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("emits no auto-publish / auto-bet hype words anywhere in the file", () => {
    expect(src).not.toMatch(/auto[- ]publish|auto[- ]bet|guaranteed/i);
  });
});
