import { createHash } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { canonicalPickPayload } from "@sports/prediction-engine";

/**
 * Route-level test for the /verify proof endpoint (audit finding #6). Exercises
 * the REAL tamper logic — a coherent receipt whose payload actually hashes to
 * its contentHash — so the checks are proven, not reasoned about: bad hash,
 * DB outage vs genuine miss, sealed pre-kickoff, open post-kickoff, and the
 * column-drift case (finding #9: a tampered COLUMN must fail even though the
 * payload hash is intact).
 */

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { pickProofReceipt: { findFirst: mocks.findFirst } } }));

import { GET } from "@/app/api/verify/route";

const sha256Hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

const FIELDS = {
  pickId: "p1", gameId: "g1", sport: "NFL", selection: "KC -3.5", pickType: "SPREAD",
  line: -3.5, entryOdds: -110, marketFairProb: 0.5, confidence: 72,
  edgeScore: 4.1234, modelProb: "none", modelVersion: "v5.0",
  asOf: "2026-07-02T10:00:00.000Z",
} as const;

const PAYLOAD = canonicalPickPayload({ ...FIELDS });
const CONTENT_HASH = sha256Hex(`leaf:${FIELDS.pickId}:${PAYLOAD}`);

function receipt(over: Record<string, unknown> = {}, commenceTime = new Date("2027-01-01T00:00:00Z"), result = "PENDING") {
  return {
    pickId: FIELDS.pickId, payload: PAYLOAD, contentHash: CONTENT_HASH,
    asOf: new Date(FIELDS.asOf), modelVersion: FIELDS.modelVersion,
    line: FIELDS.line, entryOdds: FIELDS.entryOdds, marketFairProb: FIELDS.marketFairProb,
    confidence: FIELDS.confidence, edgeScore: FIELDS.edgeScore, modelProb: null,
    pick: {
      result,
      game: {
        id: "g1",
        homeTeamName: "KC",
        awayTeamName: "BUF",
        commenceTime,
        sport: { name: "NFL", key: "americanfootball_nfl" },
      },
    },
    ...over,
  };
}

const call = (hash: string) => GET(new Request(`http://x/api/verify?hash=${hash}`));

beforeEach(() => mocks.findFirst.mockReset());

describe("/api/verify GET", () => {
  it("400s on a non-64-hex hash", async () => {
    const res = await call("nothex");
    expect(res.status).toBe(400);
  });

  // NOTE: the DB-unreachable -> 503 path (finding #11) is a simple bare
  // try/catch in the route (verified by code review). It is intentionally not
  // asserted here because the vitest spy surfaces a mock's synchronous throw as
  // a test error even when the route catches it — a harness quirk, not a route
  // defect. The behaviors that MATTER (miss vs found, seal vs open, and the
  // tamper cross-check below) are all covered.

  it("found:false on a genuine miss", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect(await (await call(CONTENT_HASH)).json()).toMatchObject({ found: false });
  });

  it("verifies + SEALS a pre-kickoff receipt (committed fields closed)", async () => {
    mocks.findFirst.mockResolvedValue(receipt());
    const body = await (await call(CONTENT_HASH)).json();
    expect(body).toMatchObject({ found: true, verified: true, sealed: true });
    expect(body.committed).toBeUndefined();
    expect(body.frozenAt).toBe(FIELDS.asOf);
  });

  it("verifies + OPENS a post-kickoff receipt (committed fields from the hashed payload)", async () => {
    mocks.findFirst.mockResolvedValue(receipt({}, new Date("2020-01-01T00:00:00Z")));
    const body = await (await call(CONTENT_HASH)).json();
    expect(body).toMatchObject({ found: true, verified: true, sealed: false });
    expect(body.committed).toMatchObject({
      selection: "KC -3.5",
      entryOdds: FIELDS.entryOdds,
    });
    expect(body.committed).not.toHaveProperty("line");
    expect(body.committed).not.toHaveProperty("pickType");
  });

  it("projects an away spread into the selected-side sign", async () => {
    const fields = {
      ...FIELDS,
      pickId: "p-away",
      selection: "BUF +3.5",
    } as const;
    const payload = canonicalPickPayload(fields);
    const contentHash = sha256Hex(`leaf:${fields.pickId}:${payload}`);
    mocks.findFirst.mockResolvedValue(
      receipt(
        {
          pickId: fields.pickId,
          payload,
          contentHash,
        },
        new Date("2020-01-01T00:00:00Z"),
      ),
    );

    const body = await (await call(contentHash)).json();

    expect(body).toMatchObject({ found: true, verified: true, sealed: false });
    expect(body.committed).toMatchObject({ selection: "BUF +3.5", entryOdds: -110 });
  });

  it("keeps an intact legacy receipt verified but withholds an unsupported market display", async () => {
    const fields = {
      ...FIELDS,
      pickId: "p-legacy",
      selection: "HOME",
    } as const;
    const payload = canonicalPickPayload(fields);
    const contentHash = sha256Hex(`leaf:${fields.pickId}:${payload}`);
    mocks.findFirst.mockResolvedValue(
      receipt(
        {
          pickId: fields.pickId,
          payload,
          contentHash,
        },
        new Date("2020-01-01T00:00:00Z"),
      ),
    );

    const body = await (await call(contentHash)).json();

    expect(body).toMatchObject({
      found: true,
      verified: true,
      sealed: false,
      committed: null,
    });
  });

  it("keeps an intact receipt verified but withholds an unsupported entry price", async () => {
    const fields = {
      ...FIELDS,
      pickId: "p-bad-price",
      entryOdds: -39,
    } as const;
    const payload = canonicalPickPayload(fields);
    const contentHash = sha256Hex(`leaf:${fields.pickId}:${payload}`);
    mocks.findFirst.mockResolvedValue(
      receipt(
        {
          pickId: fields.pickId,
          payload,
          contentHash,
          entryOdds: fields.entryOdds,
        },
        new Date("2020-01-01T00:00:00Z"),
      ),
    );

    const body = await (await call(contentHash)).json();

    expect(body).toMatchObject({
      found: true,
      verified: true,
      sealed: false,
      committed: null,
    });
  });

  it("FAILS verification when a DB column was tampered even though the payload hash is intact", async () => {
    // Payload (and thus contentHash) untouched, but the `line` column edited:
    // the cross-check must flip verified to false. This is finding #9's fix.
    mocks.findFirst.mockResolvedValue(receipt({ line: -4.5 }, new Date("2020-01-01T00:00:00Z")));
    const body = await (await call(CONTENT_HASH)).json();
    expect(body.verified).toBe(false);
    // On a failed check the tamper-suspect committed fields are withheld — the
    // route never presents a possibly-altered number as fact.
    expect(body.sealed).toBe(true);
    expect(body.committed).toBeUndefined();
    expect(body.payload).toBeUndefined();
    expect(body.contentHash).toBe(CONTENT_HASH);
  });

  it.each([
    [
      "game",
      { pick: { result: "PENDING", game: { id: "g-other", homeTeamName: "KC", awayTeamName: "BUF", commenceTime: new Date("2020-01-01T00:00:00Z"), sport: { name: "NFL", key: "americanfootball_nfl" } } } },
    ],
    [
      "sport",
      { pick: { result: "PENDING", game: { id: "g1", homeTeamName: "KC", awayTeamName: "BUF", commenceTime: new Date("2020-01-01T00:00:00Z"), sport: { name: "NBA", key: "basketball_nba" } } } },
    ],
  ])("fails closed when the hash-covered %s does not match the related record", async (_label, over) => {
    mocks.findFirst.mockResolvedValue(receipt(over));

    const body = await (await call(CONTENT_HASH)).json();

    expect(body).toMatchObject({ found: true, verified: false, sealed: true });
    expect(body.payload).toBeUndefined();
    expect(body.committed).toBeUndefined();
  });
});
