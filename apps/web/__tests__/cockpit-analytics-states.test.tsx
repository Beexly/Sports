import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup } from "@testing-library/react";

import PickAnalyticsLoading from "@/app/cockpit/pick-analytics/loading";
import MarketAnalysisLoading from "@/app/cockpit/market-analysis/loading";
import SportsDiagnosticsLoading from "@/app/cockpit/sports-diagnostics/loading";
import CalibrationLearningLoading from "@/app/cockpit/calibration-learning/loading";

/**
 * Wave C — states & resilience for the four NEW cockpit analytics workbenches.
 *
 * Two layers:
 *   1. RENDER-LEVEL: each route-level loading.tsx renders without throwing and
 *      exposes an accessible busy status (role="status" + aria-busy) so the
 *      Suspense fallback is announced, never a silent or infinite spinner.
 *   2. SOURCE-LEVEL: each route-level error.tsx exists, is a client component,
 *      and accepts the Next.js ({ error, reset }) signature — mirroring the
 *      cockpit error.tsx convention asserted in critical-routes-shape.test.ts.
 */

const repoRoot = resolve(__dirname, "..");

const LOADERS = [
  { name: "pick-analytics", Component: PickAnalyticsLoading },
  { name: "market-analysis", Component: MarketAnalysisLoading },
  { name: "sports-diagnostics", Component: SportsDiagnosticsLoading },
  { name: "calibration-learning", Component: CalibrationLearningLoading },
] as const;

describe("cockpit analytics workbenches — loading fallbacks render accessibly", () => {
  for (const { name, Component } of LOADERS) {
    it(`${name}/loading.tsx renders with an accessible busy status`, () => {
      render(<Component />);
      const status = screen.getByRole("status");
      expect(status).toBeTruthy();
      expect(status.getAttribute("aria-busy")).toBe("true");
      cleanup();
    });
  }
});

const ERROR_BOUNDARIES = [
  "app/cockpit/pick-analytics/error.tsx",
  "app/cockpit/market-analysis/error.tsx",
  "app/cockpit/sports-diagnostics/error.tsx",
  "app/cockpit/calibration-learning/error.tsx",
];

describe("cockpit analytics workbenches — route-level error boundaries present", () => {
  for (const f of ERROR_BOUNDARIES) {
    it(`${f} exists, is a client component, accepts (error, reset)`, () => {
      const full = resolve(repoRoot, f);
      expect(existsSync(full), `${f} must exist`).toBe(true);
      const src = readFileSync(full, "utf8");
      expect(src, `${f} must be a client component`).toMatch(/^"use client";/);
      expect(src, `${f} must accept (error, reset)`).toMatch(/reset:\s*\(\)\s*=>\s*void/);
      expect(src, `${f} must offer a retry`).toMatch(/reset\(\)/);
    });
  }
});
