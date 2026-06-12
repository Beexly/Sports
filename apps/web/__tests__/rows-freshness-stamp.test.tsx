import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup } from "@testing-library/react";
import { RowsFreshnessStamp, freshnessLabel } from "@/components/players/rows-freshness-stamp";
import { buildRushingEfficiency } from "@/lib/intelligence/rushing-efficiency";
import type { NgsRushingLine } from "@/lib/nflverse/next-gen-stats";

/**
 * Player Lab "rows + freshness" stamp (POLISH_BACKLOG #2).
 *
 * Three layers:
 *   1. RENDER-LEVEL: the shared <RowsFreshnessStamp> renders the real row
 *      count and a freshness label derived from the loader's generatedAt —
 *      and shows rows ONLY when no timestamp exists (no fake data).
 *   2. SOURCE-LEVEL: every Player Lab view section wires `asOf` from its
 *      loader and the shared table renders one stamp per section.
 *   3. MATH: the stacked-box rounding bug fixed in rushing-efficiency stays
 *      fixed (0..1 share keeps 3 decimals; 0.225 must not collapse to 0.2).
 */

const NOW = new Date("2026-06-12T12:00:00.000Z");

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function stampText(): string {
  return screen.getByTestId("rows-freshness-stamp").textContent ?? "";
}

describe("RowsFreshnessStamp — render level", () => {
  it("renders rows + relative freshness from a real timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const asOf = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(); // 3h ago
    render(<RowsFreshnessStamp rows={142} asOf={asOf} />);
    expect(stampText()).toBe("142 rows · updated 3h ago");
  });

  it("appends the source label and exposes the exact ISO timestamp as title", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const asOf = new Date(NOW.getTime() - 12 * 60 * 1000); // 12m ago, Date input
    render(<RowsFreshnessStamp rows={1} asOf={asOf} source="nflverse" />);
    expect(stampText()).toBe("1 row · updated 12m ago · nflverse");
    expect(screen.getByTestId("rows-freshness-stamp").getAttribute("title")).toBe(asOf.toISOString());
  });

  it("shows rows ONLY when no timestamp exists — never invents a time", () => {
    render(<RowsFreshnessStamp rows={40} />);
    expect(stampText()).toBe("40 rows");
  });

  it("shows rows ONLY when the timestamp is unparseable — never invents a time", () => {
    render(<RowsFreshnessStamp rows={7} asOf="not-a-date" source="nflverse" />);
    expect(stampText()).toBe("7 rows · nflverse");
    expect(screen.getByTestId("rows-freshness-stamp").getAttribute("title")).toBeNull();
  });

  it("covers every freshness bucket honestly", () => {
    const minute = 60_000;
    expect(freshnessLabel(new Date(NOW.getTime() - 30_000), NOW)).toBe("updated just now");
    expect(freshnessLabel(new Date(NOW.getTime() - 45 * minute), NOW)).toBe("updated 45m ago");
    expect(freshnessLabel(new Date(NOW.getTime() - 23 * 60 * minute), NOW)).toBe("updated 23h ago");
    expect(freshnessLabel(new Date(NOW.getTime() - 5 * 24 * 60 * minute), NOW)).toBe("updated 5d ago");
    expect(freshnessLabel(new Date("2026-01-03T08:00:00.000Z"), NOW)).toBe("as of 2026-01-03");
    // Clock skew (asOf in the future) clamps to "just now" instead of negatives.
    expect(freshnessLabel(new Date(NOW.getTime() + minute), NOW)).toBe("updated just now");
  });
});

describe("Player Lab wiring — source level", () => {
  const viewsSource = readFileSync(resolve(__dirname, "..", "lib", "players", "views.tsx"), "utf8");
  const tableSource = readFileSync(
    resolve(__dirname, "..", "components", "players", "player-lab-table.tsx"),
    "utf8",
  );

  it("declares asOf on the serializable section shape", () => {
    expect(viewsSource).toMatch(/readonly asOf\?: string;/);
    expect(viewsSource).toMatch(/readonly sourceLabel\?: string;/);
  });

  it("wires asOf from the loader generatedAt on every table section (20 sections)", () => {
    const wired = viewsSource.match(/^\s*asOf: \w+\.generatedAt,$/gm) ?? [];
    expect(wired.length).toBeGreaterThanOrEqual(20);
    // Freshness must come from loaded data — never minted at render time.
    expect(viewsSource).not.toMatch(/asOf: new Date\(/);
  });

  it("renders one stamp per section in the shared client table", () => {
    expect(tableSource).toMatch(
      /<RowsFreshnessStamp rows=\{section\.rows\.length\} asOf=\{section\.asOf\} source=\{section\.sourceLabel\} \/>/,
    );
  });
});

describe("Rushing efficiency — stacked-box rounding (math spot-check)", () => {
  function line(overrides: Partial<NgsRushingLine>): NgsRushingLine {
    return {
      playerId: "00-rb0",
      playerName: "Test Back",
      team: "AAA",
      rushAttempts: 200,
      ryoePerAtt: 0.5,
      efficiency: 3.5,
      pctStackedBox: 0.2,
      avgTimeToLos: 2.8,
      ...overrides,
    };
  }

  it("keeps the 0..1 stacked-box share at 3 decimals (0.225 must not collapse to 0.2)", () => {
    const rows = buildRushingEfficiency([
      line({ playerId: "00-rb1", playerName: "Boxed Bo", pctStackedBox: 0.225 }),
      line({ playerId: "00-rb2", playerName: "Light Lou", rushAttempts: 150, pctStackedBox: 0.148 }),
    ]);
    const bo = rows.find((r) => r.playerId === "00-rb1");
    const lou = rows.find((r) => r.playerId === "00-rb2");
    expect(bo?.pctStackedBox).toBe(0.225); // was 0.2 under round(value, 1)
    expect(lou?.pctStackedBox).toBe(0.148); // was 0.1 under round(value, 1)
  });
});
