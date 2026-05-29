/**
 * C44 — Kernel Binding Test
 *
 * Asserts that key consumer files import from lib/galaxy/kernel/* rather
 * than defining inline data arrays. Guards against regression of the C35
 * migration.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../");

function readSource(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("kernel binding — pricing.tsx", () => {
  const src = readSource("app/pricing/page.tsx");

  it("imports from lib/galaxy/kernel/pricing", () => {
    expect(src).toMatch(/from ["']@\/lib\/galaxy\/kernel\/pricing["']/);
  });

  it("does not define inline PLANS array", () => {
    expect(src).not.toMatch(/const PLANS\s*[:=]/);
  });

  it("does not define inline FEATURE_MATRIX array", () => {
    expect(src).not.toMatch(/const FEATURE_MATRIX\s*[:=]/);
  });
});

describe("kernel binding — reports/page.tsx", () => {
  const src = readSource("app/reports/page.tsx");

  it("imports from lib/galaxy/kernel/reports", () => {
    expect(src).toMatch(/from ["']@\/lib\/galaxy\/kernel\/reports["']/);
  });

  it("does not define inline REPORT_TYPES array", () => {
    expect(src).not.toMatch(/const REPORT_TYPES\s*[:=]/);
  });
});

describe("kernel binding — nav.tsx", () => {
  const src = readSource("components/ui/nav.tsx");

  it("imports from lib/routes-catalog", () => {
    expect(src).toMatch(/from ["']@\/lib\/routes-catalog["']/);
  });
});

describe("kernel binding — app/page.tsx", () => {
  const src = readSource("app/page.tsx");

  it("homepage compiles without inline route arrays", () => {
    expect(src).not.toMatch(/const ROUTES\s*[:=]/);
  });
});
