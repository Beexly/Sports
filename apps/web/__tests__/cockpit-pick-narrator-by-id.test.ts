import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const ROUTE = resolve(
  repoRoot,
  "app/api/cockpit/pick-narrator/[id]/route.ts"
);
const HISTORY_PAGE = resolve(repoRoot, "app/cockpit/history/page.tsx");

describe("GET /api/cockpit/pick-narrator/[id]", () => {
  const src = readFileSync(ROUTE, "utf8");

  it("exports dynamic = force-dynamic", () => {
    expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("imports auth() and rejects non-admins with 403", () => {
    expect(src).toMatch(/auth\(\)/);
    expect(src).toMatch(/403/);
    expect(src).toMatch(/Admin role required/);
  });

  it("applies rate-limit (same route key as the POST narrator)", () => {
    expect(src).toMatch(/checkRateLimit/);
    expect(src).toMatch(/cockpit-pick-narrator/);
    expect(src).toMatch(/fail-closed/);
    expect(src).toMatch(/429/);
  });

  it("fetches the pick from DB (db.pick.findUnique)", () => {
    expect(src).toMatch(/db\.pick\.findUnique/);
    expect(src).toMatch(/where:\s*\{\s*id/);
  });

  it("returns 404 when the pick is not found", () => {
    expect(src).toMatch(/404/);
    expect(src).toMatch(/not found/i);
  });

  it("includes game relation (for sport + team names in response)", () => {
    expect(src).toMatch(/include:\s*\{\s*game/);
    expect(src).toMatch(/sport:\s*true/);
  });

  it("delegates to narratePick", () => {
    expect(src).toMatch(/narratePick/);
    expect(src).toMatch(/from "@\/lib\/cockpit\/pick-narrator"/);
  });

  it("constructs ScoredPick from DB pick fields (no fabrication)", () => {
    expect(src).toMatch(/pick\.gameId/);
    expect(src).toMatch(/pick\.confidence/);
    expect(src).toMatch(/pick\.factorBreakdown/);
    expect(src).toMatch(/pick\.pickGrade/);
    expect(src).toMatch(/pick\.riskLevel/);
    expect(src).toMatch(/pick\.modelVersion/);
  });

  it("includes sport + game names in the response envelope", () => {
    expect(src).toMatch(/sport:/);
    expect(src).toMatch(/game:/);
    expect(src).toMatch(/pickId/);
  });

  it("returns Cache-Control: no-store on every response", () => {
    expect(src).toMatch(/Cache-Control/);
    expect(src).toMatch(/no-store/);
  });

  it("never writes to the DB (narrator is read-only)", () => {
    expect(src).not.toMatch(/db\.\w+\.(create|update|upsert|delete)/);
  });

  it("never sets publishedAt in code (comments excluded)", () => {
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    expect(codeOnly).not.toMatch(/publishedAt/);
  });

  it("imports FactorBreakdown type for the factorBreakdown cast", () => {
    expect(src).toMatch(/FactorBreakdown/);
  });
});

describe("cockpit/history/page.tsx — Narrate link", () => {
  const src = readFileSync(HISTORY_PAGE, "utf8");

  it("history page exists", () => {
    expect(existsSync(HISTORY_PAGE)).toBe(true);
  });

  it("renders a Narrate link pointing to the by-id narrator endpoint", () => {
    expect(src).toMatch(/\/api\/cockpit\/pick-narrator\//);
    expect(src).toMatch(/Narrate/);
  });

  it("uses encodeURIComponent on the pick id", () => {
    expect(src).toMatch(/encodeURIComponent\(p\.id\)/);
  });
});
