/**
 * Corpus loader tests — fake SqlClient only, never the real database.
 *
 * Two grounding seams are mocked with vi.fn wrappers that delegate to the
 * real implementations by default:
 *  - Cache / failure / stats tests run the REAL groundGame against a fake
 *    SqlClient, so the SQL call counts prove the slate cache end to end.
 *  - The minSupport ruling and the zero-facet / all-layers-errored branches
 *    inject exact FacetGrounding values (support 0.9 / 0.8 / 0.6), which the
 *    real scoring pipeline cannot produce on demand. The loader's mapping
 *    and threshold logic is the unit under test there, not the scorer.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import { isMissing, isPresent } from "@sports/prediction-engine/src/evidence/types.js";
import {
  groundGame,
  type FacetGrounding,
  type GameGrounding,
  type GroundingEvidence,
  type GroundingFacet,
} from "@sports/prediction-engine/src/literature/corpus-grounding.js";
import {
  facetsForGame,
  type FacetGameContext,
} from "@sports/prediction-engine/src/literature/situational-facets.js";
import { createCorpusLoader } from "./corpus.js";

vi.mock("@sports/prediction-engine/src/literature/corpus-grounding.js", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@sports/prediction-engine/src/literature/corpus-grounding.js")
  >();
  return { ...actual, groundGame: vi.fn(actual.groundGame) };
});
vi.mock("@sports/prediction-engine/src/literature/situational-facets.js", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@sports/prediction-engine/src/literature/situational-facets.js")
  >();
  return { ...actual, facetsForGame: vi.fn(actual.facetsForGame) };
});

const NOW = new Date("2026-11-12T18:00:00.000Z");
const INDOOR_CTX: FacetGameContext = { isIndoor: true };

let realGroundGame: typeof groundGame;
let realFacetsForGame: typeof facetsForGame;

beforeAll(async () => {
  const cg = await vi.importActual<
    typeof import("@sports/prediction-engine/src/literature/corpus-grounding.js")
  >("@sports/prediction-engine/src/literature/corpus-grounding.js");
  const sf = await vi.importActual<
    typeof import("@sports/prediction-engine/src/literature/situational-facets.js")
  >("@sports/prediction-engine/src/literature/situational-facets.js");
  realGroundGame = cg.groundGame;
  realFacetsForGame = sf.facetsForGame;
});

beforeEach(() => {
  vi.mocked(groundGame).mockImplementation(realGroundGame);
  vi.mocked(facetsForGame).mockImplementation(realFacetsForGame);
});

afterEach(() => {
  vi.mocked(groundGame).mockReset();
  vi.mocked(facetsForGame).mockReset();
});

interface FakeDb {
  readonly db: SqlClient;
  readonly calls: { text: string; values: readonly unknown[] | undefined }[];
}

/** Empty rows everywhere: each facet issues exactly situation + statement
 *  queries (no situation hit means no seeded chunk query). "throw" simulates
 *  an unreachable database. */
function makeFakeDb(mode: "empty" | "throw"): FakeDb {
  const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
  const db: SqlClient = {
    query: async (text, values) => {
      calls.push({ text, values });
      if (mode === "throw") throw new Error("connection refused");
      return { rows: [], rowCount: 0 };
    },
  };
  return { db, calls };
}

function evidenceFixture(citation: string, title: string | null, weight: number): GroundingEvidence {
  return {
    layer: "situation",
    citation,
    title,
    text: "quoted passage",
    domain: null,
    relevance: 0.9,
    weight,
  };
}

function facetGroundingFixture(
  query: string,
  support: number,
  evidence: readonly GroundingEvidence[],
  layerErrors: readonly string[] = [],
): FacetGrounding {
  return { family: "weather", query, facetWeight: 1, support, evidence, chunkMode: "none", layerErrors };
}

function gameGroundingFixture(facets: readonly FacetGrounding[]): GameGrounding {
  return { gameId: "game-a", facets, overallSupport: 0, coverage: 0, latencyMs: 1 };
}

function facetFixture(query: string): GroundingFacet {
  return { family: "weather", query };
}

describe("createCorpusLoader — slate-level cache", () => {
  it("two games with the same facet context cost one query set", async () => {
    const { db, calls } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const nFacets = facetsForGame(INDOOR_CTX).length;
    const perGame = nFacets * 2; // situation + statement per facet, empty rows

    const first = await loader.load("game-a", INDOOR_CTX);
    expect(calls.length).toBe(perGame);

    const second = await loader.load("game-b", INDOOR_CTX);
    expect(calls.length).toBe(perGame); // no new SQL for the second game

    expect(isPresent(first)).toBe(true);
    expect(isPresent(second)).toBe(true);
    if (isPresent(first) && isPresent(second)) {
      expect(second.value).toEqual(first.value);
      expect(second.asOf).toBe(NOW.toISOString());
    }
    expect(loader.stats().cacheHits).toBe(nFacets);
    expect(loader.stats().queries).toBe(perGame);
  });

  it("a different context only queries the facets it adds", async () => {
    const { db, calls } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const perGame = facetsForGame(INDOOR_CTX).length * 2;

    await loader.load("game-a", INDOOR_CTX);
    // Outdoor mild game: same base facets plus one weather facet.
    const outdoor = await loader.load("game-c", { isIndoor: false, windMph: 5, tempF: 70 });

    expect(calls.length).toBe(perGame + 2);
    expect(isPresent(outdoor)).toBe(true);
    expect(loader.stats().cacheHits).toBe(facetsForGame(INDOOR_CTX).length);
  });

  it("concurrent loads of the same context share one query set", async () => {
    const { db, calls } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const perGame = facetsForGame(INDOOR_CTX).length * 2;

    const [a, b] = await Promise.all([
      loader.load("game-a", INDOOR_CTX),
      loader.load("game-b", INDOOR_CTX),
    ]);

    expect(calls.length).toBe(perGame);
    expect(isPresent(a)).toBe(true);
    expect(isPresent(b)).toBe(true);
  });
});

describe("createCorpusLoader — minSupport ruling", () => {
  it("keeps support >= 0.8, zeroes support below it and drops its citations", async () => {
    const high = facetGroundingFixture("high facet", 0.9, [
      evidenceFixture("lit.situation:abc#0", null, 0.6),
      evidenceFixture("lit.corpus_statement:book#1", "Some Book", 0.5),
    ]);
    const boundary = facetGroundingFixture("boundary facet", 0.8, [
      evidenceFixture("lit.situation:def#0", "Title", 0.6),
    ]);
    const low = facetGroundingFixture("low facet", 0.6, [
      evidenceFixture("lit.situation:ghi#0", "Dropped", 0.6),
    ]);
    vi.mocked(facetsForGame).mockReturnValueOnce([
      facetFixture("high facet"),
      facetFixture("boundary facet"),
      facetFixture("low facet"),
    ]);
    vi.mocked(groundGame).mockResolvedValueOnce(gameGroundingFixture([high, boundary, low]));

    const { db, calls } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const e = await loader.load("game-a", INDOOR_CTX);

    expect(calls.length).toBe(0); // groundGame injected — no SQL needed
    expect(isPresent(e)).toBe(true);
    if (isPresent(e)) {
      expect(e.value).toHaveLength(3);
      expect(e.value[0]?.facet).toBe("high facet");
      expect(e.value[0]?.support).toBe(0.9);
      expect(e.value[0]?.citations).toEqual([
        { uri: "lit.situation:abc#0", title: "", score: 0.6 },
        { uri: "lit.corpus_statement:book#1", title: "Some Book", score: 0.5 },
      ]);
      expect(e.value[1]?.support).toBe(0.8); // boundary is kept
      expect(e.value[1]?.citations).toHaveLength(1);
      expect(e.value[2]?.facet).toBe("low facet");
      expect(e.value[2]?.support).toBe(0); // topical match is not agreement
      expect(e.value[2]?.citations).toEqual([]);
      expect(e.asOf).toBe(NOW.toISOString());
    }
  });

  it("honours a custom minSupport", async () => {
    const low = facetGroundingFixture("low facet", 0.6, [
      evidenceFixture("lit.situation:ghi#0", "Kept", 0.6),
    ]);
    vi.mocked(facetsForGame).mockReturnValueOnce([facetFixture("low facet")]);
    vi.mocked(groundGame).mockResolvedValueOnce(gameGroundingFixture([low]));

    const { db } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW, minSupport: 0.5 });
    const e = await loader.load("game-a", INDOOR_CTX);

    expect(isPresent(e)).toBe(true);
    if (isPresent(e)) {
      expect(e.value[0]?.support).toBe(0.6);
      expect(e.value[0]?.citations).toEqual([
        { uri: "lit.situation:ghi#0", title: "Kept", score: 0.6 },
      ]);
    }
  });
});

describe("createCorpusLoader — failure handling", () => {
  it("a throwing SqlClient yields MISSING, never full support", async () => {
    const { db, calls } = makeFakeDb("throw");
    const loader = createCorpusLoader({ db, now: NOW });
    const e = await loader.load("game-a", INDOOR_CTX);

    expect(isMissing(e)).toBe(true);
    if (isMissing(e)) {
      expect(e.reason).toMatch(/^corpus grounding failed: /);
    }
    expect(calls.length).toBeGreaterThan(0); // queries were attempted
    expect(loader.stats().queries).toBe(calls.length);
  });

  it("every facet erroring on all attempted layers yields MISSING", async () => {
    const errored = (query: string): FacetGrounding =>
      facetGroundingFixture(query, 0, [], ["situation: boom", "statement: boom"]);
    vi.mocked(facetsForGame).mockReturnValueOnce([facetFixture("f1"), facetFixture("f2")]);
    vi.mocked(groundGame).mockResolvedValueOnce(
      gameGroundingFixture([errored("f1"), errored("f2")]),
    );

    const { db } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const e = await loader.load("game-a", INDOOR_CTX);

    expect(isMissing(e)).toBe(true);
    if (isMissing(e)) {
      expect(e.reason).toMatch(/^corpus grounding failed: /);
      expect(e.reason).toContain("situation: boom");
    }
  });

  it("a partially failed load keeps healthy facets and drops the failed one", async () => {
    const healthy = facetGroundingFixture("healthy facet", 0.9, [
      evidenceFixture("lit.situation:ok#0", "OK", 0.6),
    ]);
    const failed = facetGroundingFixture("failed facet", 0, [], ["situation: boom"]);
    vi.mocked(facetsForGame).mockReturnValueOnce([facetFixture("healthy facet"), facetFixture("failed facet")]);
    vi.mocked(groundGame).mockResolvedValueOnce(gameGroundingFixture([healthy, failed]));

    const { db } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const e = await loader.load("game-a", INDOOR_CTX);

    expect(isPresent(e)).toBe(true);
    if (isPresent(e)) {
      expect(e.value).toHaveLength(1);
      expect(e.value[0]?.facet).toBe("healthy facet");
      expect(e.note).toContain("1/2 facets failed lookup");
    }
  });

  it("zero facets yields MISSING with the exact reason", async () => {
    vi.mocked(facetsForGame).mockReturnValueOnce([]);
    const { db, calls } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    const e = await loader.load("game-a", INDOOR_CTX);

    expect(isMissing(e)).toBe(true);
    if (isMissing(e)) {
      expect(e.reason).toBe("no facets for this game context");
    }
    expect(calls.length).toBe(0);
  });

  it("a failed batch is evicted so a later load can retry", async () => {
    const { db, calls } = makeFakeDb("throw");
    const loader = createCorpusLoader({ db, now: NOW });
    const first = await loader.load("game-a", INDOOR_CTX);
    expect(isMissing(first)).toBe(true);
    const attemptsAfterFirst = calls.length;

    const second = await loader.load("game-b", INDOOR_CTX);
    expect(isMissing(second)).toBe(true);
    expect(calls.length).toBeGreaterThan(attemptsAfterFirst); // retried, not cached failure
  });
});

describe("createCorpusLoader — stats", () => {
  it("reports queries, cacheHits and elapsedMs", async () => {
    const { db } = makeFakeDb("empty");
    const loader = createCorpusLoader({ db, now: NOW });
    expect(loader.stats()).toEqual({ queries: 0, cacheHits: 0, elapsedMs: 0 });

    const nFacets = facetsForGame(INDOOR_CTX).length;
    await loader.load("game-a", INDOOR_CTX);
    await loader.load("game-b", INDOOR_CTX);

    const s = loader.stats();
    expect(s.queries).toBe(nFacets * 2);
    expect(s.cacheHits).toBe(nFacets);
    expect(Number.isFinite(s.elapsedMs)).toBe(true);
    expect(s.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
