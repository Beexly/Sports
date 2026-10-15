import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedOdds, OddsApiEvent } from "@sports/types";
import {
  classifyLineArchivePhase,
  createDbLineArchiveStore,
  createJsonlLineArchiveStore,
  runEspnLineArchiver,
  runEspnLineArchiverIfEnabled,
  selectEventsInWindow,
  serializeLineArchiveRow,
  ESPN_LINE_ARCHIVE_SOURCE,
  type EspnLineArchiverDeps,
  type JsonlFileSystem,
  type LineArchiveStoreDb,
} from "../line-archiver/espn-line-archive.js";

/**
 * espn-line-archive — the ESPN/DraftKings forward archiver. These tests pin:
 *   - the capture window: kickoff in (now, now+7d] only — a kicked-off game
 *     is NEVER captured here (its close is settle-time's job)
 *   - row shape: exactly the createMany object line-archive.ts writes
 *     (gameId, capturedAt, phase, book, market, side, price, line, source),
 *     source = "espn-public-dk", book carried from the normalized rows
 *   - phase per (gameId, market): OPEN on first ever capture, INTERIM after
 *     — classified against the store, so the DB and dry-run JSONL paths agree
 *   - the JSONL store: appends parseable lines, and a second store instance
 *     over the same file sees the first run's markets (phase continuity)
 *   - the DB store: existence check uses `{ in: [...] }` (the scalar-list
 *     shape whose absence silently zeroed the original archive) and append
 *     is a single createMany of the full row objects
 *   - hard gate: runEspnLineArchiverIfEnabled with the flag unset invokes
 *     NO dep at all (zero fetch, zero store)
 *   - failure isolation: fetch failure and per-game store failure surface in
 *     `errors` and never throw; unresolved games are counted, never silent
 *
 * The injected normalizeOdds fake mirrors DataNormalizer's contract for the
 * fixture events (American prices, outcome-name matching). The real
 * DataNormalizer + live ESPN fetch are exercised by the operator dry-run
 * (see line-archiver/README.md), not by unit tests.
 */

const NOW = new Date("2026-10-15T15:00:00.000Z");
const ORIGINAL_ENV = process.env["LINE_ARCHIVE_ENABLED"];

beforeEach(() => {
  delete process.env["LINE_ARCHIVE_ENABLED"];
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env["LINE_ARCHIVE_ENABLED"];
  else process.env["LINE_ARCHIVE_ENABLED"] = ORIGINAL_ENV;
});

function espnEvent(
  id: string,
  commence: string,
  home = "Denver Broncos",
  away = "Seattle Seahawks",
): OddsApiEvent {
  return {
    id: `espn:americanfootball_nfl:${id}`,
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: commence,
    home_team: home,
    away_team: away,
    bookmakers: [
      {
        key: "espn_public",
        title: "ESPN/DraftKings",
        last_update: "2026-10-15T14:59:00Z",
        markets: [
          {
            key: "h2h",
            last_update: "2026-10-15T14:59:00Z",
            outcomes: [
              { name: away, price: 130 },
              { name: home, price: -150 },
            ],
          },
          {
            key: "spreads",
            last_update: "2026-10-15T14:59:00Z",
            outcomes: [
              { name: home, price: -110, point: -3.5 },
              { name: away, price: -110, point: 3.5 },
            ],
          },
          {
            key: "totals",
            last_update: "2026-10-15T14:59:00Z",
            outcomes: [
              { name: "Over", price: -110, point: 44.5 },
              { name: "Under", price: -110, point: 44.5 },
            ],
          },
        ],
      },
    ],
  } as OddsApiEvent;
}

/** Mirrors DataNormalizer.normalizeOdds for the fixture shape above. */
function fakeNormalize(events: readonly OddsApiEvent[], fetchedAt: Date): NormalizedOdds[] {
  const out: NormalizedOdds[] = [];
  for (const event of events) {
    for (const book of event.bookmakers) {
      for (const market of book.markets) {
        const base = {
          gameExternalId: event.id,
          bookmaker: book.key,
          fetchedAt,
          bookmakerLastUpdate: fetchedAt,
        };
        if (market.key === "h2h") {
          out.push({
            ...base,
            market: "H2H",
            homePrice: market.outcomes.find((o) => o.name === event.home_team)?.price,
            awayPrice: market.outcomes.find((o) => o.name === event.away_team)?.price,
          });
        } else if (market.key === "spreads") {
          const home = market.outcomes.find((o) => o.name === event.home_team);
          out.push({
            ...base,
            market: "SPREADS",
            spread: home?.point,
            homeSpreadPrice: home?.price,
            awaySpreadPrice: market.outcomes.find((o) => o.name === event.away_team)?.price,
          });
        } else if (market.key === "totals") {
          out.push({
            ...base,
            market: "TOTALS",
            total: market.outcomes[0]?.point,
            overPrice: market.outcomes.find((o) => o.name === "Over")?.price,
            underPrice: market.outcomes.find((o) => o.name === "Under")?.price,
          });
        }
      }
    }
  }
  return out;
}

/** In-memory JsonlFileSystem: one mutable string per path. */
function memoryFs(): JsonlFileSystem & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    readFile: async (path) => files.get(path) ?? "",
    appendFile: async (path, text) => {
      files.set(path, (files.get(path) ?? "") + text);
    },
  };
}

function makeDeps(overrides: Partial<EspnLineArchiverDeps> = {}): EspnLineArchiverDeps {
  return {
    fetchEvents: async () => ({ events: [] }),
    normalizeOdds: fakeNormalize,
    resolveGameId: async (event) => `game-for-${event.id}`,
    store: createJsonlLineArchiveStore("/tmp/test.jsonl", memoryFs()),
    now: () => NOW,
    ...overrides,
  };
}

const TNF = () => espnEvent("401772510", "2026-10-16T00:15:00.000Z"); // tonight
const SUNDAY = () =>
  espnEvent("401772511", "2026-10-18T17:00:00.000Z", "Kansas City Chiefs", "Buffalo Bills");

describe("selectEventsInWindow", () => {
  it("keeps kickoffs in (now, now+7d] and skips started + beyond-window", () => {
    const events = [
      espnEvent("past", "2026-10-15T14:59:59.000Z"), // kicked off 1s ago
      espnEvent("at-now", "2026-10-15T15:00:00.000Z"), // kickoff == now
      TNF(),
      espnEvent("edge", "2026-10-22T15:00:00.000Z"), // exactly now+7d
      espnEvent("beyond", "2026-10-22T15:00:00.001Z"), // 1ms past the window
      espnEvent("broken", "not-a-date"),
    ];
    const sel = selectEventsInWindow(events, NOW);
    expect(sel.selected.map((e) => e.id)).toEqual([
      "espn:americanfootball_nfl:401772510",
      "espn:americanfootball_nfl:edge",
    ]);
    expect(sel.skippedStartedOrInvalid).toBe(3);
    expect(sel.skippedBeyondWindow).toBe(1);
  });
});

describe("classifyLineArchivePhase", () => {
  it("is OPEN only when the market has no prior snapshot", () => {
    expect(classifyLineArchivePhase(new Set(), "SPREAD")).toBe("OPEN");
    expect(classifyLineArchivePhase(new Set(["SPREAD"]), "SPREAD")).toBe("INTERIM");
    expect(classifyLineArchivePhase(new Set(["SPREAD"]), "TOTAL")).toBe("OPEN");
  });
});

describe("runEspnLineArchiver — row shape and phases", () => {
  it("persists exactly-shaped rows: 6 per full game, OPEN first run, INTERIM second", async () => {
    const fs = memoryFs();
    const store = createJsonlLineArchiveStore("/tmp/slate.jsonl", fs);
    const deps = makeDeps({
      store,
      fetchEvents: async () => ({ events: [TNF(), SUNDAY()] }),
    });

    const first = await runEspnLineArchiver(deps);
    expect(first.fetchedEvents).toBe(2);
    expect(first.windowEvents).toBe(2);
    expect(first.gamesArchived).toBe(2);
    expect(first.rowsPersisted).toBe(12); // 2 games × (2 ML + 2 spread + 2 total)
    expect(first.errors).toEqual([]);

    const lines = (fs.files.get("/tmp/slate.jsonl") ?? "")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines).toHaveLength(12);
    for (const row of lines) {
      expect(Object.keys(row)).toEqual([
        "gameId",
        "capturedAt",
        "phase",
        "book",
        "market",
        "side",
        "price",
        "line",
        "source",
      ]);
      expect(row.capturedAt).toBe(NOW.toISOString());
      expect(row.phase).toBe("OPEN");
      expect(row.book).toBe("espn_public");
      expect(row.source).toBe(ESPN_LINE_ARCHIVE_SOURCE);
    }
    const tnf = lines.filter((r) => String(r.gameId).includes("401772510"));
    const byMarketSide = new Map(tnf.map((r) => [`${r.market}:${r.side}`, r]));
    expect(byMarketSide.get("MONEYLINE:home")).toMatchObject({ price: -150, line: null });
    expect(byMarketSide.get("MONEYLINE:away")).toMatchObject({ price: 130, line: null });
    // Away spread line is the negation of the home point (toLineSnapshotRows).
    expect(byMarketSide.get("SPREAD:home")).toMatchObject({ price: -110, line: -3.5 });
    expect(byMarketSide.get("SPREAD:away")).toMatchObject({ price: -110, line: 3.5 });
    expect(byMarketSide.get("TOTAL:over")).toMatchObject({ price: -110, line: 44.5 });
    expect(byMarketSide.get("TOTAL:under")).toMatchObject({ price: -110, line: 44.5 });

    // Second run against the SAME store: every market already exists → INTERIM.
    const second = await runEspnLineArchiver(deps);
    expect(second.rowsPersisted).toBe(12);
    const all = (fs.files.get("/tmp/slate.jsonl") ?? "")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(all).toHaveLength(24);
    expect(all.slice(12).every((r) => r.phase === "INTERIM")).toBe(true);
  });

  it("classifies a late-appearing market OPEN while existing markets go INTERIM", async () => {
    const fs = memoryFs();
    const store = createJsonlLineArchiveStore("/tmp/late.jsonl", fs);
    const mlOnly = TNF();
    (mlOnly.bookmakers[0]!.markets as unknown[]).splice(1); // drop spreads+totals
    await runEspnLineArchiver(
      makeDeps({ store, fetchEvents: async () => ({ events: [mlOnly] }) }),
    );
    const second = await runEspnLineArchiver(
      makeDeps({ store, fetchEvents: async () => ({ events: [TNF()] }) }),
    );
    expect(second.rowsPersisted).toBe(6);
    const rows = (fs.files.get("/tmp/late.jsonl") ?? "")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    const secondRun = rows.slice(2);
    expect(secondRun.filter((r) => r.market === "MONEYLINE").every((r) => r.phase === "INTERIM")).toBe(true);
    expect(secondRun.filter((r) => r.market !== "MONEYLINE").every((r) => r.phase === "OPEN")).toBe(true);
  });

  it("skips out-of-window events before resolving or writing anything", async () => {
    const resolveGameId = vi.fn(async (e: OddsApiEvent) => `g-${e.id}`);
    const fs = memoryFs();
    const result = await runEspnLineArchiver(
      makeDeps({
        store: createJsonlLineArchiveStore("/tmp/w.jsonl", fs),
        resolveGameId,
        fetchEvents: async () => ({
          events: [
            espnEvent("old", "2026-10-12T17:00:00.000Z"),
            espnEvent("far", "2026-11-01T18:00:00.000Z"),
          ],
        }),
      }),
    );
    expect(result.windowEvents).toBe(0);
    expect(result.skippedStartedOrInvalid).toBe(1);
    expect(result.skippedBeyondWindow).toBe(1);
    expect(result.rowsPersisted).toBe(0);
    expect(resolveGameId).not.toHaveBeenCalled();
    expect(fs.files.get("/tmp/w.jsonl") ?? "").toBe("");
  });
});

describe("runEspnLineArchiver — resolution and failure isolation", () => {
  it("counts unresolved games and never writes rows for them", async () => {
    const fs = memoryFs();
    const result = await runEspnLineArchiver(
      makeDeps({
        store: createJsonlLineArchiveStore("/tmp/u.jsonl", fs),
        resolveGameId: async (e) => (e.id.endsWith("401772510") ? null : `g-${e.id}`),
        fetchEvents: async () => ({ events: [TNF(), SUNDAY()] }),
      }),
    );
    expect(result.unresolvedEventIds).toEqual(["espn:americanfootball_nfl:401772510"]);
    expect(result.gamesArchived).toBe(1);
    expect(result.rowsPersisted).toBe(6);
  });

  it("surfaces a fetch failure in errors without throwing or writing", async () => {
    const fs = memoryFs();
    const result = await runEspnLineArchiver(
      makeDeps({
        store: createJsonlLineArchiveStore("/tmp/f.jsonl", fs),
        fetchEvents: async () => {
          throw new Error("espn unreachable");
        },
      }),
    );
    expect(result.rowsPersisted).toBe(0);
    expect(result.errors).toEqual(["fetch failed: espn unreachable"]);
    expect(fs.files.get("/tmp/f.jsonl") ?? "").toBe("");
  });

  it("keeps archiving other games when one game's store write fails", async () => {
    const failingStore = {
      existingMarkets: async () => new Set<string>(),
      append: async (rows: readonly { gameId: string }[]) => {
        if (rows[0]?.gameId.includes("401772510")) throw new Error("db gone");
        return rows.length;
      },
    };
    const result = await runEspnLineArchiver(
      makeDeps({
        store: failingStore,
        fetchEvents: async () => ({ events: [TNF(), SUNDAY()] }),
      }),
    );
    expect(result.gamesArchived).toBe(1);
    expect(result.rowsPersisted).toBe(6);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("401772510");
  });

  it("reports games whose events carry no odds rows", async () => {
    const bare = TNF();
    bare.bookmakers = [];
    const result = await runEspnLineArchiver(
      makeDeps({ fetchEvents: async () => ({ events: [bare] }) }),
    );
    expect(result.gamesWithoutRows).toBe(1);
    expect(result.rowsPersisted).toBe(0);
  });
});

describe("runEspnLineArchiverIfEnabled — hard gate", () => {
  it("invokes no dep at all when LINE_ARCHIVE_ENABLED is unset", async () => {
    const fetchEvents = vi.fn(async () => ({ events: [TNF()] }));
    const store = {
      existingMarkets: vi.fn(async () => new Set<string>()),
      append: vi.fn(async (rows: readonly unknown[]) => rows.length),
    };
    const result = await runEspnLineArchiverIfEnabled(
      makeDeps({ fetchEvents, store }),
      {},
    );
    expect(result.enabled).toBe(false);
    expect(result.rowsPersisted).toBe(0);
    expect(fetchEvents).not.toHaveBeenCalled();
    expect(store.existingMarkets).not.toHaveBeenCalled();
    expect(store.append).not.toHaveBeenCalled();
  });

  it("runs when LINE_ARCHIVE_ENABLED === 'true' and only then", async () => {
    const fs = memoryFs();
    const deps = makeDeps({
      store: createJsonlLineArchiveStore("/tmp/g.jsonl", fs),
      fetchEvents: async () => ({ events: [TNF()] }),
    });
    const off = await runEspnLineArchiverIfEnabled(deps, { LINE_ARCHIVE_ENABLED: "1" });
    expect(off.enabled).toBe(false);
    const on = await runEspnLineArchiverIfEnabled(deps, { LINE_ARCHIVE_ENABLED: "true" });
    expect(on.enabled).toBe(true);
    expect(on.rowsPersisted).toBe(6);
  });
});

describe("createDbLineArchiveStore", () => {
  function mockDb(existing: { market: string }[] = []) {
    return {
      oddsLineSnapshot: {
        findMany: vi.fn(async () => existing),
        createMany: vi.fn(async (args: { data: unknown[] }) => ({ count: args.data.length })),
        update: vi.fn(),
      },
    } as unknown as LineArchiveStoreDb & {
      oddsLineSnapshot: {
        findMany: ReturnType<typeof vi.fn>;
        createMany: ReturnType<typeof vi.fn>;
      };
    };
  }

  it("checks existence with { in: [...] } on the scalar market column", async () => {
    const db = mockDb([{ market: "SPREAD" }]);
    const store = createDbLineArchiveStore(db);
    const found = await store.existingMarkets("game_1", ["SPREAD", "TOTAL"]);
    expect(found).toEqual(new Set(["SPREAD"]));
    expect(db.oddsLineSnapshot.findMany).toHaveBeenCalledWith({
      where: { gameId: "game_1", market: { in: ["SPREAD", "TOTAL"] } },
      select: { market: true },
    });
  });

  it("appends via one createMany carrying the full row objects", async () => {
    const db = mockDb();
    const store = createDbLineArchiveStore(db);
    const row = {
      gameId: "game_1",
      capturedAt: NOW,
      phase: "OPEN" as const,
      book: "espn_public",
      market: "SPREAD",
      side: "home",
      price: -110,
      line: -3.5,
      source: ESPN_LINE_ARCHIVE_SOURCE,
    };
    await expect(store.append([row])).resolves.toBe(1);
    expect(db.oddsLineSnapshot.createMany).toHaveBeenCalledWith({ data: [row] });
  });

  it("skips the existence query entirely for an empty market list", async () => {
    const db = mockDb();
    const store = createDbLineArchiveStore(db);
    await expect(store.existingMarkets("game_1", [])).resolves.toEqual(new Set());
    expect(db.oddsLineSnapshot.findMany).not.toHaveBeenCalled();
  });
});

describe("serializeLineArchiveRow", () => {
  it("emits the createMany shape with an ISO capturedAt and stable key order", () => {
    const line = serializeLineArchiveRow({
      gameId: "game_1",
      capturedAt: NOW,
      phase: "OPEN",
      book: "espn_public",
      market: "TOTAL",
      side: "over",
      price: -110,
      line: 44.5,
      source: ESPN_LINE_ARCHIVE_SOURCE,
    });
    expect(line).toBe(
      '{"gameId":"game_1","capturedAt":"2026-10-15T15:00:00.000Z","phase":"OPEN","book":"espn_public","market":"TOTAL","side":"over","price":-110,"line":44.5,"source":"espn-public-dk"}',
    );
  });
});
