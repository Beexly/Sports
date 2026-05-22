import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Brand-safety + integrity pin for the Evidence Audit drawer.
 *
 * The audit surface is by design the most data-dense public surface
 * on the site. That makes it the most likely place to accidentally
 * leak something forbidden. This test pins the invariants:
 *
 *  1. The drawer component must never reference Kelly, stake recommendations,
 *     true EV, fair probability, or win-rate math directly. Those are
 *     server-side-only computations gated by separate policy modules.
 *
 *  2. The API route must never include raw payload data in its response —
 *     only the hash prefix and byte count. The literal string `payload:`
 *     (which would indicate selecting the raw payload field) must NOT
 *     appear in the API route.
 *
 *  3. The FREE-tier branch of the API must not surface confidence,
 *     line movement, model version (full), or signal flags. The Summary
 *     type fields are the allow-list.
 *
 *  4. The drawer component must be a client component (uses "use client")
 *     and must not import server-only modules.
 */

const repoRoot = resolve(__dirname, "..");
const drawerPath = resolve(
  repoRoot,
  "components/picks/evidence-audit-drawer.tsx"
);
const apiRoutePath = resolve(
  repoRoot,
  "app/api/picks/[id]/audit/route.ts"
);

describe("evidence audit drawer — brand safety", () => {
  it("drawer file exists", () => {
    expect(existsSync(drawerPath)).toBe(true);
  });

  it("API route file exists", () => {
    expect(existsSync(apiRoutePath)).toBe(true);
  });

  it("drawer never references Kelly / stake / true EV / fair-prob terms", () => {
    const src = readFileSync(drawerPath, "utf8").toLowerCase();
    expect(src).not.toMatch(/\bkelly\b/);
    expect(src).not.toMatch(/\bstake\s*(rec|recommendation|size|amount)/);
    expect(src).not.toMatch(/\btrue\s*ev\b/);
    expect(src).not.toMatch(/\bfair\s*probability\b/);
    // "expected value" specifically as a customer-facing label is also off
    expect(src).not.toMatch(/expected\s+value/);
  });

  it("drawer never computes win-rate math itself", () => {
    const src = readFileSync(drawerPath, "utf8");
    expect(src).not.toMatch(/wins\s*\/\s*\(\s*wins\s*\+\s*losses/);
    expect(src).not.toMatch(/winRate\s*=/);
  });

  it("drawer is a client component", () => {
    const src = readFileSync(drawerPath, "utf8");
    expect(src.split(/\r?\n/)[0]).toContain("use client");
  });

  it("drawer does not import server-only auth or DB", () => {
    const src = readFileSync(drawerPath, "utf8");
    expect(src).not.toMatch(/from\s+["']@sports\/db["']/);
    expect(src).not.toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(src).not.toMatch(/from\s+["']@\/lib\/entitlements["']/);
  });

  it("API route does not select the raw payload field from SourceSnapshot", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    // Prisma `select: { payload: true }` would leak raw payload bytes.
    // The hash + byte count are sufficient for a forensic chain.
    expect(src).not.toMatch(/payload:\s*true/);
  });

  it("API route uses tier-aware branching (FREE summary vs PRO/ELITE detail)", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    expect(src).toMatch(/canSeeDetail/);
    expect(src).toMatch(/AuditPayloadSummary/);
    expect(src).toMatch(/AuditPayloadDetailed/);
  });

  it("API route includes the deterministic pre-mortem note", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    expect(src).toMatch(/buildPickPremortemNote/);
    expect(src).toMatch(/preMortem/);
  });

  it("API route fails closed: 503 when canExposePublicPicks is off", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    expect(src).toMatch(/canExposePublicPicks/);
    expect(src).toMatch(/bootstrapGateResponse/);
    expect(src).toMatch(/status:\s*503/);
  });

  it("API route hides bootstrap-era picks (404)", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    expect(src).toMatch(/isBootstrap/);
    expect(src).toMatch(/status:\s*404/);
  });

  it("API route bounds SourceSnapshot result count", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    // Defensive: an unbounded findMany could DOS the audit endpoint.
    expect(src).toMatch(/take:\s*\d+/);
  });

  it("API route hashes are truncated, never returned in full", () => {
    const src = readFileSync(apiRoutePath, "utf8");
    expect(src).toMatch(/payloadHashPrefix/);
    // The full hash field on the row is `payloadHash`; ensure it's
    // sliced and re-named before going on the wire.
    expect(src).toMatch(/payloadHash\.slice/);
  });
});
