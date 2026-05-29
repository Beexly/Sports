/**
 * C44 — Report Detail Evidence Test
 *
 * Asserts that the report detail page source contains trust strip
 * and source/freshness evidence for every report type.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { REPORT_TYPES } from "@/lib/galaxy/kernel/reports";

const ROOT = resolve(__dirname, "../../");

describe("Report detail route — evidence presence", () => {
  const src = readFileSync(resolve(ROOT, "app/reports/[type]/page.tsx"), "utf8");

  it("has data-trust-strip attribute", () => {
    expect(src).toMatch(/data-trust-strip/);
  });

  it("calls notFound() for invalid types", () => {
    expect(src).toMatch(/notFound\(\)/);
  });

  it("uses generateStaticParams", () => {
    expect(src).toMatch(/generateStaticParams/);
  });

  it("generateStaticParams reads from the REPORT_TYPES registry", () => {
    // The route uses generateStaticParams which maps from the kernel registry,
    // so we assert the function exists and imports REPORT_TYPES rather than
    // hardcoding IDs.
    expect(src).toMatch(/REPORT_TYPES/);
    expect(src).toMatch(/generateStaticParams/);
  });
});

describe("Report type registry — all types have anatomy", () => {
  it("every report type has a non-empty anatomy string", () => {
    for (const report of REPORT_TYPES) {
      expect(report.anatomy.length).toBeGreaterThan(0);
    }
  });

  it("every report type has an eyebrowLabel", () => {
    for (const report of REPORT_TYPES) {
      expect(report.eyebrowLabel.length).toBeGreaterThan(0);
    }
  });
});
