/**
 * Tests for the market loader. Fake SqlClient only — no network, no real
 * database. Market values verified against Neon: H2H / SPREADS / TOTALS.
 */
import { describe, expect, it } from "vitest";
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import { isMissing, isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import { loadMarket } from "./market.js";

const GAME_ID = "cmt4fewrc00jbeat5nq9eauqo";
const NOW = new Date("2026-11-12T21:00:00Z");

function fakeDb(rows: readonly unknown[]): SqlClient {
  return { query: async () => ({ rows: [...rows], rowCount: rows.length }) };
}

function recordingDb(rows: readonly unknown[]): {
  db: SqlClient;
  calls: { text: string; values: readonly unknown[] | undefined }[];
} {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  const db: SqlClient = {
    query: async (text, values) => {
      calls.push({ text, values });
      return { rows: [...rows], rowCount: rows.length };
    },
  };
  return { db, calls };
}

function oddsRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    bookmaker: "draftkings",
    market: "H2H",
    homePrice: -150,
    awayPrice: 130,
    drawPrice: null,
    spread: null,
    total: null,
    fetchedAt: "2026-11-12 20:00:00",
    ...overrides,
  };
}

/** Two books, two-sided h2h, plus spread and totals rows per book. */
function twoBookRows(): Record<string, unknown>[] {
  return [
    oddsRow(),
    oddsRow({
      bookmaker: "fanduel",
      homePrice: -140,
      awayPrice: 120,
      fetchedAt: "2026-11-12 20:52:35",
    }),
    oddsRow({ market: "SPREADS", homePrice: null, awayPrice: null, spread: -3.5 }),
    oddsRow({
      bookmaker: "fanduel",
      market: "SPREADS",
      homePrice: null,
      awayPrice: null,
      spread: -3,
      fetchedAt: "2026-11-12 20:52:35",
    }),
    oddsRow({ market: "TOTALS", homePrice: null, awayPrice: null, total: 44.5 }),
    oddsRow({
      bookmaker: "fanduel",
      market: "TOTALS",
      homePrice: null,
      awayPrice: null,
      total: 45,
      fetchedAt: "2026-11-12 20:52:35",
    }),
  ];
}

describe("loadMarket", () => {
  it("two-book set de-vigs to a probability strictly between 0 and 1", async () => {
    const ev = await loadMarket(fakeDb(twoBookRows()), GAME_ID, NOW);
    expect(isPresent(ev.consensusNoVigHome)).toBe(true);
    if (!isPresent(ev.consensusNoVigHome)) return;
    expect(ev.consensusNoVigHome.status).toBe("DERIVED");
    expect(ev.consensusNoVigHome.source).toBe("consensusNoVig");
    expect(ev.consensusNoVigHome.value).toBeGreaterThan(0);
    expect(ev.consensusNoVigHome.value).toBeLessThan(1);
    // Home is the favourite at both books, so the fair prob must lean home.
    expect(ev.consensusNoVigHome.value).toBeGreaterThan(0.5);
    expect(ev.consensusNoVigHome.asOf).toBe("2026-11-12T20:52:35.000Z");
  });

  it("bookmakerCount equals the number of (distinct) h2h book rows", async () => {
    const rows = twoBookRows();
    const ev = await loadMarket(fakeDb(rows), GAME_ID, NOW);
    expect(isPresent(ev.bookmakerCount)).toBe(true);
    if (!isPresent(ev.bookmakerCount)) return;
    expect(ev.bookmakerCount.status).toBe("REAL");
    const h2hRowCount = rows.filter((r) => r["market"] === "H2H").length;
    expect(ev.bookmakerCount.value).toBe(h2hRowCount);
    expect(ev.bookmakerCount.value).toBe(2);
  });

  it("best prices are the max American price per side; lines are medians", async () => {
    const ev = await loadMarket(fakeDb(twoBookRows()), GAME_ID, NOW);
    expect(isPresent(ev.bestHomePrice)).toBe(true);
    expect(isPresent(ev.bestAwayPrice)).toBe(true);
    expect(isPresent(ev.spread)).toBe(true);
    expect(isPresent(ev.total)).toBe(true);
    expect(isPresent(ev.homeMoneyline)).toBe(true);
    expect(isPresent(ev.awayMoneyline)).toBe(true);
    if (!isPresent(ev.bestHomePrice) || !isPresent(ev.bestAwayPrice)) return;
    if (!isPresent(ev.spread) || !isPresent(ev.total)) return;
    if (!isPresent(ev.homeMoneyline) || !isPresent(ev.awayMoneyline)) return;
    // max(-150, -140) = -140 ; max(130, 120) = 130 (higher American = better).
    expect(ev.bestHomePrice.value).toBe(-140);
    expect(ev.bestAwayPrice.value).toBe(130);
    expect(ev.spread.value).toBe(-3.25);
    expect(ev.total.value).toBe(44.75);
    expect(ev.spread.source).toBe("the-odds-api");
    expect(ev.total.source).toBe("the-odds-api");
    expect(ev.spread.asOf).toBe("2026-11-12T20:52:35.000Z");
    // Representative moneylines are the median across books, not the best.
    expect(ev.homeMoneyline.value).toBe(-145);
    expect(ev.awayMoneyline.value).toBe(125);
    expect(ev.homeMoneyline.source).toBe("the-odds-api");
    expect(ev.awayMoneyline.source).toBe("the-odds-api");
  });

  it("zero odds rows: EVERY field is MISSING with the no-rows reason", async () => {
    const ev = await loadMarket(fakeDb([]), GAME_ID, NOW);
    for (const field of [
      ev.consensusNoVigHome,
      ev.spread,
      ev.total,
      ev.homeMoneyline,
      ev.awayMoneyline,
      ev.bookmakerCount,
      ev.bestHomePrice,
      ev.bestAwayPrice,
    ]) {
      expect(isMissing(field)).toBe(true);
      if (isMissing(field)) expect(field.reason).toBe("no odds rows for game");
    }
  });

  it("NULL homePrice: MISSING, never 0 and never a fabricated consensus", async () => {
    const ev = await loadMarket(
      fakeDb([oddsRow({ homePrice: null })]),
      GAME_ID,
      NOW,
    );
    expect(isMissing(ev.consensusNoVigHome)).toBe(true);
    expect(isMissing(ev.bookmakerCount)).toBe(true);
    expect(isMissing(ev.bestHomePrice)).toBe(true);
    expect(isMissing(ev.bestAwayPrice)).toBe(true);
    expect(isMissing(ev.spread)).toBe(true);
    expect(isMissing(ev.total)).toBe(true);
    expect(isMissing(ev.homeMoneyline)).toBe(true);
    expect(isMissing(ev.awayMoneyline)).toBe(true);
    if (isMissing(ev.homeMoneyline)) {
      expect(ev.homeMoneyline.reason).toBe("no moneyline rows for game");
    }
    if (isMissing(ev.awayMoneyline)) {
      expect(ev.awayMoneyline.reason).toBe("no moneyline rows for game");
    }
  });

  it("NULL awayPrice on every book also yields MISSING consensus", async () => {
    const ev = await loadMarket(
      fakeDb([oddsRow({ awayPrice: null }), oddsRow({ bookmaker: "fanduel", awayPrice: null })]),
      GAME_ID,
      NOW,
    );
    expect(isMissing(ev.consensusNoVigHome)).toBe(true);
    expect(isMissing(ev.bestAwayPrice)).toBe(true);
  });

  it("repeat fetches of one book count once, using the latest row", async () => {
    const ev = await loadMarket(
      fakeDb([
        oddsRow({ homePrice: -110, awayPrice: -110, fetchedAt: "2026-11-12 18:00:00" }),
        oddsRow({ homePrice: 100, awayPrice: -120, fetchedAt: "2026-11-12 20:52:35" }),
      ]),
      GAME_ID,
      NOW,
    );
    expect(isPresent(ev.bookmakerCount)).toBe(true);
    expect(isPresent(ev.bestHomePrice)).toBe(true);
    if (!isPresent(ev.bookmakerCount) || !isPresent(ev.bestHomePrice)) return;
    expect(ev.bookmakerCount.value).toBe(1);
    expect(ev.bestHomePrice.value).toBe(100);
  });

  it("spread-only rows: spread REAL, h2h fields MISSING", async () => {
    const ev = await loadMarket(
      fakeDb([oddsRow({ market: "SPREADS", homePrice: null, awayPrice: null, spread: -2.5 })]),
      GAME_ID,
      NOW,
    );
    expect(isPresent(ev.spread)).toBe(true);
    if (isPresent(ev.spread)) expect(ev.spread.value).toBe(-2.5);
    expect(isMissing(ev.consensusNoVigHome)).toBe(true);
    expect(isMissing(ev.bookmakerCount)).toBe(true);
    expect(isMissing(ev.bestHomePrice)).toBe(true);
    expect(isMissing(ev.bestAwayPrice)).toBe(true);
    expect(isMissing(ev.total)).toBe(true);
    expect(isMissing(ev.homeMoneyline)).toBe(true);
    expect(isMissing(ev.awayMoneyline)).toBe(true);
  });

  it("queries by parameterised gameId, SELECT only, real market enum values", async () => {
    const { db, calls } = recordingDb(twoBookRows());
    await loadMarket(db, GAME_ID, NOW);
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.values).toEqual([GAME_ID]);
    expect(call?.text.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    expect(call?.text).toContain("'H2H'");
    expect(call?.text).not.toContain("'h2h'");
  });
});
