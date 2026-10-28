import { describe, expect, it } from "vitest";

import {
  PFR_ADAPTERS,
  PFR_ATTRIBUTION,
  PFR_KERNEL_WIRED,
  PFR_REGISTRY,
  loadPfrAdvstatsDef,
  loadPfrAdvstatsPass,
  loadPfrAdvstatsRec,
  loadPfrAdvstatsRush,
} from "./pfr-advstats.js";

describe("PFR advstats loaders", () => {
  it("declares four tables with real row counts and full sha256s", () => {
    expect(Object.keys(PFR_REGISTRY).sort()).toEqual(["def", "pass", "rec", "rush"]);
    for (const meta of Object.values(PFR_REGISTRY)) {
      expect(meta.rows).toBeGreaterThan(0);
      expect(meta.sha256).toHaveLength(64);
      expect(meta.columns.length).toBe(meta.cols);
    }
  });

  it("loads each table and stamps the attribution", async () => {
    for (const load of [loadPfrAdvstatsDef, loadPfrAdvstatsRec, loadPfrAdvstatsRush, loadPfrAdvstatsPass]) {
      const rows = await load();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].attribution).toBe(PFR_ATTRIBUTION);
    }
  }, 120_000);

  it("carries every source column through raw", async () => {
    const rows = await loadPfrAdvstatsDef();
    const meta = PFR_REGISTRY.def;
    for (const col of meta.columns) expect(col in rows[0].raw).toBe(true);
  }, 60_000);

  it("adapters read only columns that exist", () => {
    for (const a of PFR_ADAPTERS) {
      expect(PFR_REGISTRY[a.table].columns).toContain(a.column);
    }
  });

  it("every adapter column is adapter-only, not double-claimed as kernel-wired", () => {
    for (const a of PFR_ADAPTERS) {
      expect(PFR_KERNEL_WIRED[a.table]).not.toContain(a.column);
    }
  });
});
