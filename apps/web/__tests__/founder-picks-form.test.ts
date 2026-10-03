import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * The founder picks form must not become a SECOND write path.
 *
 * The whole point of UI-1 is that the write path already existed and only lacked
 * a door. The failure mode this file blocks is the dangerous one: someone later
 * "simplifies" by letting the client write directly, or by widening what the
 * client accepts past what the server enforces. Both would turn an admin-only,
 * server-validated record into something a browser can shape.
 */

const REPO = resolve(__dirname, "..");
const FORM = resolve(REPO, "components/cockpit/founder-picks-form.tsx");
const PAGE = resolve(REPO, "app/cockpit/founder-picks/page.tsx");
const LAYOUT = resolve(REPO, "app/cockpit/layout.tsx");
const ADMIN_ROUTE = resolve(REPO, "app/api/admin/founder-picks/route.ts");

const form = readFileSync(FORM, "utf8");
const page = readFileSync(PAGE, "utf8");
const layout = readFileSync(LAYOUT, "utf8");
const adminRoute = readFileSync(ADMIN_ROUTE, "utf8");

describe("founder picks form — posts to the EXISTING admin route", () => {
  it("targets the admin route, not a new endpoint", () => {
    expect(form).toContain('"/api/admin/founder-picks"');
  });

  it("does not invent a second write endpoint", () => {
    // Any POST target other than the admin route is a new write path.
    const targets = [...form.matchAll(/fetch\(\s*"([^"]+)"/g)].map((m) => m?.[1]);
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) {
      expect(t).toBe("/api/admin/founder-picks");
    }
  });

  it("the page itself performs no write — it renders a form and reads", () => {
    expect(page).not.toMatch(/createFounderPick|db\.pick\.(create|update|delete|upsert)/);
  });

  it("the admin route still re-authorizes on the server", () => {
    // The client gate is UX. This is the one that actually holds.
    expect(adminRoute).toMatch(/session\.user\.role\s*!==\s*"ADMIN"/);
    expect(adminRoute).toContain("unauthorized");
  });
});

describe("founder picks form — honesty copy the code already enforces", () => {
  it("says confidence is the owner's conviction, not a win probability", () => {
    expect(form).toMatch(/conviction/i);
    expect(form).toMatch(/not a win probability/i);
  });

  it("states the kickoff freeze, which validateFounderPick enforces", () => {
    expect(form).toMatch(/freeze at kickoff/i);
  });

  it("states the one-call-per-market-per-game override rule", () => {
    // Pick is @@unique([gameId, pickType]); create.ts UPDATEs on collision.
    expect(form).toMatch(/REPLACES it|replaces it/i);
  });
});

describe("founder picks form — degrade honestly, never fabricate", () => {
  it("says plainly when no games are loaded instead of rendering a broken form", () => {
    expect(form).toMatch(/No upcoming games/);
  });

  it("a failed POST claims nothing was saved", () => {
    // "Retry is safe" is load-bearing: the owner must not re-enter a pick they
    // believe may already be sealed.
    expect(form).toMatch(/Nothing was saved/i);
  });
});

describe("discoverability — the thing that was actually missing", () => {
  it("the cockpit nav links the new page", () => {
    // cockpit-nav-coverage.test.ts walks app/cockpit and fails any route with
    // no NAV entry, so this is pinned explicitly for the clearer failure text.
    expect(layout).toMatch(/href:\s*"\/cockpit\/founder-picks"/);
  });

  it("the page exists on disk at the route the nav advertises", () => {
    expect(existsSync(PAGE)).toBe(true);
    expect(join(REPO, "app", "cockpit", "founder-picks", "page.tsx")).toBe(PAGE);
  });

  it("the public record page still exists and stays public", () => {
    // The record is the founder's accountable number. Gating it behind login
    // would be the wrong instinct, so its absence would be a regression.
    expect(existsSync(resolve(REPO, "app/founder-picks/page.tsx"))).toBe(true);
  });
});
