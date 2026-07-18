import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildH2hMarketRead } from "@/lib/market/game-market-read";

/**
 * Market Fair Board — market description (no-vig consensus), never a model
 * claim. Pins the builder's honesty rules and the surface's gating language.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function row(
  bookmaker: string,
  home: number | null,
  away: number | null,
  at: string,
  market = "H2H",
  draw: number | null = null,
) {
  return { bookmaker, market, fetchedAt: new Date(at), homePrice: home, awayPrice: away, drawPrice: draw };
}

describe("buildH2hMarketRead", () => {
  it("uses only each book's latest quote — stale rows never vote twice", () => {
    const result = buildH2hMarketRead([
      row("book-a", -500, +400, "2026-06-12T10:00:00Z"), // stale extreme
      row("book-a", -120, +100, "2026-06-12T12:00:00Z"), // latest
      row("book-b", -125, +105, "2026-06-12T12:00:00Z"),
    ]);
    expect(result).not.toBeNull();
    expect(result!.consensus.bookCount).toBe(2);
    // Latest quotes cluster near 54% home; the stale -500 must not drag it.
    expect(result!.consensus.fairHomeProb).toBeLessThan(0.6);
    expect(result!.freshestFetchedAt).toBe("2026-06-12T12:00:00.000Z");
  });

  it("refuses a one-book consensus — that's a costume, not a consensus", () => {
    expect(buildH2hMarketRead([row("book-a", -110, -110, "2026-06-12T12:00:00Z")])).toBeNull();
  });

  it("ignores non-H2H rows and one-sided quotes", () => {
    expect(
      buildH2hMarketRead([
        row("book-a", -110, -110, "2026-06-12T12:00:00Z", "SPREADS"),
        row("book-b", -110, null, "2026-06-12T12:00:00Z"),
      ]),
    ).toBeNull();
  });

  it("rejects decimal, cents-like, fractional, and extreme price units", () => {
    expect(buildH2hMarketRead([
      row("book-a", 1.91, 2.05, "2026-06-12T12:00:00Z"),
      row("book-b", -39, 105, "2026-06-12T12:00:00Z"),
      row("book-c", -110.5, 105, "2026-06-12T12:00:00Z"),
      row("book-d", -7750, 5000, "2026-06-12T12:00:00Z"),
    ])).toBeNull();
  });
});

describe("capture-window drift — the Line Death Clock heartbeat", () => {
  it("computes fair-price drift from each book's earliest vs latest quote", () => {
    const result = buildH2hMarketRead([
      row("book-a", -110, -110, "2026-06-12T08:00:00Z"),
      row("book-b", -110, -110, "2026-06-12T08:00:00Z"),
      row("book-a", -130, +110, "2026-06-12T12:00:00Z"),
      row("book-b", -135, +115, "2026-06-12T12:00:00Z"),
    ]);
    expect(result).not.toBeNull();
    expect(result!.homeDriftPp).not.toBeNull();
    // Market moved from a pick'em toward home — drift must be positive.
    expect(result!.homeDriftPp!).toBeGreaterThan(0);
  });

  it("reports null drift when no earlier capture exists — no invented history", () => {
    const result = buildH2hMarketRead([
      row("book-a", -120, +100, "2026-06-12T12:00:00Z"),
      row("book-b", -125, +105, "2026-06-12T12:00:00Z"),
    ]);
    expect(result).not.toBeNull();
    expect(result!.homeDriftPp).toBeNull();
    expect(result!.homeDriftPerHourPp).toBeNull();
  });

  it("expresses the death-clock rate in pp/hr across the real time span", () => {
    const result = buildH2hMarketRead([
      row("book-a", -110, -110, "2026-06-12T08:00:00Z"),
      row("book-b", -110, -110, "2026-06-12T08:00:00Z"),
      row("book-a", -130, +110, "2026-06-12T12:00:00Z"),
      row("book-b", -135, +115, "2026-06-12T12:00:00Z"),
    ]);
    expect(result!.homeDriftPerHourPp).not.toBeNull();
    // 4-hour span → rate is a fraction of the total drift, same sign.
    expect(Math.abs(result!.homeDriftPerHourPp!)).toBeLessThan(
      Math.abs(result!.homeDriftPp!),
    );
    expect(result!.homeDriftPerHourPp!).toBeGreaterThan(0);
  });
});

describe("the surface honors the gates", () => {
  const component = read("components/observatory/market-fair-board.tsx");

  it("frames itself as market description, never a model claim", () => {
    expect(component).toContain("never a model claim");
    expect(component).toMatch(/not\s+picks, projections, or advice/);
  });

  it("renders an honest empty state instead of inventing a market", () => {
    expect(component).toContain("stays empty rather than inventing a market");
  });

  it("never uses banned audit-contract terms", () => {
    const lower = component.toLowerCase();
    expect(lower).not.toMatch(/\bkelly\b/);
    expect(lower).not.toMatch(/\btrue\s*ev\b/);
    expect(lower).not.toMatch(/expected\s+value/);
    expect(lower).not.toMatch(/\block\b/);
  });

  it("mounts on the observatory and uses world tokens + numerals", () => {
    expect(read("app/observatory/page.tsx")).toContain("MarketFairBoard");
    expect(component).toContain("NUMERIC_TEXT_CLASS");
    const raw = component.match(/(?:text|bg|border)-(?:gray|green|red|yellow)-\d+/g);
    expect(raw ?? []).toEqual([]);
  });

  it("renders the Market Gravity badge and frames it as conviction, not correctness", () => {
    expect(component).toContain("GravityBadge");
    expect(component).toContain('data-testid="gravity-badge"');
    expect(component.toLowerCase()).toMatch(/not whether it'?s right/);
  });
});

describe("gravity flows through the builder", () => {
  it("attaches a Market Gravity Index to every built read", () => {
    const result = buildH2hMarketRead([
      row("book-a", -600, +450, "2026-06-12T12:00:00Z"),
      row("book-b", -610, +460, "2026-06-12T12:00:00Z"),
    ]);
    expect(result).not.toBeNull();
    expect(result!.gravity.side).toBe("home");
    expect(result!.gravity.index).toBeGreaterThan(0);
  });
});
