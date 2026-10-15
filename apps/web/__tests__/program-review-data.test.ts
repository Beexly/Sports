import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROGRAM_REVIEW as R } from "@/lib/program-review/program-data";

/**
 * /ops/program renders the committed fleet record — and nothing else.
 * These pins keep the record internally consistent (the census arithmetic
 * must close) and keep the page an internal, non-emitting surface: if a
 * future edit adds a pick/probability-shaped field to the record, or drops
 * the auth gate / noindex from the page, this suite goes red.
 */

function allKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, acc);
  } else if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      acc.push(key);
      allKeys(nested, acc);
    }
  }
  return acc;
}

describe("program review record — census arithmetic closes", () => {
  it("ingestion homes sum to the with-home total, and home + queue = catalog", () => {
    const homes = R.ingestion.homes.reduce((sum, h) => sum + h.count, 0);
    expect(homes).toBe(R.ingestion.withHome);
    expect(R.ingestion.withHome + R.ingestion.queue).toBe(R.ingestion.total);
    expect(R.ingestion.total).toBe(279);
    expect(R.ingestion.withHome).toBe(116);
    expect(R.ingestion.queue).toBe(163);
  });

  it("reasoning availability rows sum to the same catalog total", () => {
    const rows = R.layer2.reasoningAvailability.rows.reduce(
      (sum, r) => sum + r.count,
      0,
    );
    expect(rows).toBe(R.layer2.reasoningAvailability.total);
    expect(R.layer2.reasoningAvailability.total).toBe(R.ingestion.total);
    const byLabel = new Map(
      R.layer2.reasoningAvailability.rows.map((r) => [r.label, r.count]),
    );
    expect([...byLabel.values()]).toEqual([2, 18, 9, 21, 229]);
  });

  it("the situational graph registry carries exactly 14 edge types", () => {
    expect(R.layer2.situationalGraph.edgeTypes.rows).toHaveLength(14);
    const types = R.layer2.situationalGraph.edgeTypes.rows.map((e) => e.type);
    expect(new Set(types).size).toBe(14);
    expect(types).toContain("altitude_short_week");
  });

  it("exactly 9 stamped reasoning templates are on record, each with a census id", () => {
    expect(R.layer2.templates.rows).toHaveLength(9);
    for (const t of R.layer2.templates.rows) {
      expect(t.id).toMatch(/^C-\d{3}$/);
      expect(t.name.length).toBeGreaterThan(0);
    }
  });
});

describe("program review record — frozen book states", () => {
  it("carries the verified book and the uncleared bar, exactly", () => {
    expect(R.frozenBook.baseline.crps).toBe("7.154021");
    expect(R.frozenBook.bestVerified.crps).toBe("7.133199");
    expect(R.frozenBook.bar.crps).toBe("7.099");
    expect(R.frozenBook.bar.status).toBe("NOT CLEARED");
  });

  it("emission state is ZERO_OBJECT with RVC NOT_CLEARED", () => {
    expect(R.emission.state).toBe("ZERO_OBJECT");
    expect(R.emission.rvc).toBe("NOT_CLEARED");
  });

  it("the record contains no pick/probability-shaped field anywhere", () => {
    const keys = allKeys(R).join(" ");
    expect(keys).not.toMatch(/pick|probab|isPick|winProb/i);
  });
});

describe("/ops/program page — internal surface invariants", () => {
  const page = readFileSync(
    join(process.cwd(), "app/ops/program/page.tsx"),
    "utf8",
  );
  const layout = readFileSync(join(process.cwd(), "app/ops/layout.tsx"), "utf8");

  it("page checks auth() and the ADMIN role before rendering", () => {
    expect(page).toContain("auth()");
    expect(page).toContain('role !== "ADMIN"');
  });

  it("page and layout both carry robots noindex metadata", () => {
    expect(page).toContain("index: false");
    expect(layout).toContain("index: false");
  });

  it("layout gates the whole /ops segment for non-admins", () => {
    expect(layout).toContain("auth()");
    expect(layout).toContain('role !== "ADMIN"');
    expect(layout).toContain("redirect(");
  });
});
