import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level smoke test for every route the launch-night brief calls
 * out as critical. We do NOT spin up the Next.js dev server here; we
 * only assert the file exists and exports a default React component
 * (or an HTTP-method handler for API routes). That catches a regression
 * where one of the page files gets truncated or accidentally removed,
 * which has happened twice in this branch already.
 */

const repoRoot = resolve(__dirname, "..");

const CRITICAL_PAGES = [
  "app/page.tsx",
  "app/fantasy/baseline/page.tsx",
  "app/dashboard/page.tsx",
  "app/performance/page.tsx",
  "app/picks/page.tsx",
  "app/board/page.tsx",
  "app/ledger/page.tsx",
  "app/blog/page.tsx",
  "app/pricing/page.tsx",
  "app/brief/page.tsx",
  "app/cockpit/page.tsx",
  "app/cockpit/layout.tsx",
  "app/cockpit/history/page.tsx",
  "app/cockpit/brief/page.tsx",
  "app/cockpit/calibration/page.tsx",
  "app/cockpit/sources/page.tsx",
  "app/admin/dashboard/page.tsx",
  "app/admin/dashboard/dashboard-view.tsx",
];

const CRITICAL_API_ROUTES = [
  "app/api/picks/route.ts",
  "app/api/picks/daily-slate/route.ts",
  "app/api/board/state/route.ts",
  "app/api/board/passes/route.ts",
  "app/api/calibration/route.ts",
  "app/api/performance/route.ts",
  "app/api/brief/route.ts",
  "app/api/cockpit/brief/route.ts",
  "app/api/cockpit/calibration/route.ts",
  "app/api/admin/dashboard/route.ts",
  "app/api/admin/trigger-refresh/route.ts",
  "app/api/dev/state/route.ts",
];

const ERROR_BOUNDARIES = [
  "app/error.tsx",
  "app/cockpit/error.tsx",
];

describe("critical pages — exist and look complete", () => {
  for (const f of CRITICAL_PAGES) {
    it(`${f} exists, exports default, is not truncated`, () => {
      const full = resolve(repoRoot, f);
      expect(existsSync(full), `${f} must exist`).toBe(true);
      const src = readFileSync(full, "utf8");
      expect(src.length, `${f} must have non-trivial content`).toBeGreaterThan(80);
      expect(src, `${f} must export default`).toMatch(/export\s+default\s+/);
      // A truncated TSX file rarely ends with one of these; this is a
      // weak signal that catches the slow-disk-truncation bug.
      const trimmed = src.replace(/\s+$/, "");
      const lastChar = trimmed[trimmed.length - 1];
      expect(
        ["}", ")", ";", ">"].includes(lastChar!),
        `${f} appears truncated — ends with "${lastChar}"`
      ).toBe(true);
    });
  }
});

describe("critical API routes — exist with at least one HTTP method", () => {
  for (const f of CRITICAL_API_ROUTES) {
    it(`${f} exports a request handler`, () => {
      const full = resolve(repoRoot, f);
      expect(existsSync(full), `${f} must exist`).toBe(true);
      const src = readFileSync(full, "utf8");
      expect(
        src,
        `${f} must export GET, POST, PUT, DELETE, or PATCH`
      ).toMatch(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/);
    });
  }
});

describe("error boundaries — present so runtime crashes render cleanly", () => {
  for (const f of ERROR_BOUNDARIES) {
    it(`${f} exists and is a client component`, () => {
      const full = resolve(repoRoot, f);
      expect(existsSync(full), `${f} must exist`).toBe(true);
      const src = readFileSync(full, "utf8");
      expect(src, `${f} must be a client component`).toMatch(/^"use client";/);
      expect(src, `${f} must accept (error, reset)`).toMatch(/reset:\s*\(\)\s*=>\s*void/);
    });
  }
});
