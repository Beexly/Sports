import { describe, it, expect, afterEach } from "vitest";
import {
  adpByNormName,
  ffcAdpUrl,
  loadFfcAdp,
  parseFfcAdp,
  resetFfcAdpCacheForTests,
  FFC_ATTRIBUTION,
  FFC_CACHE_TTL_MS,
} from "./adp-source";

// Fixture pinned from the LIVE endpoint (2026-07-16):
// GET https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026
const FIXTURE = {
  status: "Success",
  meta: { type: "PPR", teams: 12, rounds: 15, total_drafts: 1999, start_date: "2026-07-08", end_date: "2026-07-15" },
  players: [
    { player_id: 5670, name: "Bijan Robinson", position: "RB", team: "ATL", adp: 1.6, adp_formatted: "1.02", times_drafted: 224, high: 1, low: 4, stdev: 0.7, bye: 11 },
    { player_id: 5672, name: "Jahmyr Gibbs", position: "RB", team: "DET", adp: 1.9, adp_formatted: "1.02", times_drafted: 185, high: 1, low: 3, stdev: 0.8, bye: 6 },
    { player_id: 5714, name: "Puka Nacua", position: "WR", team: "LAR", adp: 2.7, adp_formatted: "1.03", times_drafted: 53, high: 1, low: 4, stdev: 0.7, bye: 11 },
    { player_id: 5177, name: "Ja'Marr Chase", position: "WR", team: "CIN", adp: 4.0, adp_formatted: "1.04", times_drafted: 345, high: 1, low: 7, stdev: 0.9, bye: 6 },
  ],
} as const;

afterEach(() => resetFfcAdpCacheForTests());

describe("ffcAdpUrl", () => {
  it("builds the documented endpoint per format/season/teams", () => {
    expect(ffcAdpUrl("ppr", 2026)).toBe("https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026");
    expect(ffcAdpUrl("half-ppr", 2026, 10)).toBe("https://fantasyfootballcalculator.com/api/v1/adp/half-ppr?teams=10&year=2026");
    expect(ffcAdpUrl("2qb", 2027)).toContain("/adp/2qb?teams=12&year=2027");
  });
});

describe("parseFfcAdp (pure)", () => {
  it("parses the live-verified Success shape into typed rows + meta", () => {
    const parsed = parseFfcAdp(FIXTURE)!;
    expect(parsed).not.toBeNull();
    expect(parsed.meta).toEqual({ teams: 12, rounds: 15, totalDrafts: 1999, startDate: "2026-07-08", endDate: "2026-07-15" });
    expect(parsed.rows).toHaveLength(4);
    expect(parsed.rows[0]).toEqual({
      player: "Bijan Robinson", pos: "RB", team: "ATL",
      adp: 1.6, high: 1, low: 4, stdev: 0.7, timesDrafted: 224, bye: 11,
    });
  });

  it("sorts rows ascending by ADP", () => {
    const shuffled = { ...FIXTURE, players: [...FIXTURE.players].reverse() };
    const parsed = parseFfcAdp(shuffled)!;
    expect(parsed.rows.map((r) => r.adp)).toEqual([1.6, 1.9, 2.7, 4.0]);
  });

  it("drops rows without a name or a positive adp — never invents", () => {
    const parsed = parseFfcAdp({
      status: "Success",
      players: [
        { name: "", position: "RB", team: "ATL", adp: 5 },
        { name: "No Adp Guy", position: "WR", team: "DET", adp: 0 },
        { name: "Kept Guy", position: "WR", team: "CIN", adp: 3.2, bye: 6 },
        "not-an-object",
      ],
    })!;
    expect(parsed.rows.map((r) => r.player)).toEqual(["Kept Guy"]);
    expect(parsed.rows[0]!.high).toBe(0); // missing numerics default 0, not NaN
  });

  it("returns null for non-Success / malformed payloads", () => {
    expect(parseFfcAdp({ status: "Error", players: [] })).toBeNull();
    expect(parseFfcAdp({ status: "Success", players: "nope" })).toBeNull();
    expect(parseFfcAdp(null)).toBeNull();
    expect(parseFfcAdp("Success")).toBeNull();
  });
});

describe("adpByNormName", () => {
  it("keys rows by the shared normName convention (suffix/punctuation folded)", () => {
    const { rows } = parseFfcAdp(FIXTURE)!;
    const map = adpByNormName(rows);
    expect(map.get("jamarr chase")!.adp).toBe(4.0); // apostrophe folded
    expect(map.get("bijan robinson")!.bye).toBe(11);
    expect(map.size).toBe(4);
  });
});

describe("loadFfcAdp (clearance-gated, daily-cached IO)", () => {
  const okFetcher = async () => new Response(JSON.stringify(FIXTURE), { status: 200 });

  it("returns live rows wrapped in the rights envelope with the FFC attribution", async () => {
    const r = await loadFfcAdp({ fetcher: okFetcher, season: 2026 });
    expect(r.status).toBe("live");
    expect(r.rows).toHaveLength(4);
    expect(r.attribution).toBe(FFC_ATTRIBUTION);
    expect(r.meta!.totalDrafts).toBe(1999);
    // ExtractedRecord envelope: RightsSnapshot captured at extraction time.
    expect(r.record).not.toBeNull();
    expect(r.record!.source_id).toBe("ffc-adp");
    expect(r.record!.rights_snapshot.status).toBe("approved_api");
    expect(r.record!.rights_snapshot.commercial_display_allowed).toBe(true);
    expect(r.record!.rights_snapshot.attribution_text).toBe(FFC_ATTRIBUTION);
  });

  it("caches a live result for 24h (the once/day API term) and expires after", async () => {
    let calls = 0;
    const counting = async () => { calls += 1; return new Response(JSON.stringify(FIXTURE)); };
    let t = 1_000_000;
    const now = () => t;
    await loadFfcAdp({ fetcher: counting, season: 2026, now });
    await loadFfcAdp({ fetcher: counting, season: 2026, now });
    expect(calls).toBe(1); // second call served from the daily cache
    t += FFC_CACHE_TTL_MS + 1;
    await loadFfcAdp({ fetcher: counting, season: 2026, now });
    expect(calls).toBe(2); // expired -> one fresh call
  });

  it("caches per format/teams/season key", async () => {
    let calls = 0;
    const counting = async () => { calls += 1; return new Response(JSON.stringify(FIXTURE)); };
    await loadFfcAdp({ fetcher: counting, season: 2026, format: "ppr" });
    await loadFfcAdp({ fetcher: counting, season: 2026, format: "half-ppr" });
    expect(calls).toBe(2);
  });

  it("degrades to source-error on HTTP failure / malformed payload — and does not cache it", async () => {
    let calls = 0;
    const failing = async () => { calls += 1; return new Response("nope", { status: 503 }); };
    const r1 = await loadFfcAdp({ fetcher: failing, season: 2026 });
    expect(r1.status).toBe("source-error");
    expect(r1.rows).toEqual([]);
    expect(r1.record).toBeNull();
    const r2 = await loadFfcAdp({ fetcher: failing, season: 2026 });
    expect(r2.status).toBe("source-error");
    expect(calls).toBe(2); // errors stay retryable, never cached

    const malformed = await loadFfcAdp({ fetcher: async () => new Response(JSON.stringify({ status: "Error" })), season: 2026, format: "standard" });
    expect(malformed.status).toBe("source-error");
  });
});
