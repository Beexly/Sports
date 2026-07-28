import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The opening route is a thin caller: the disclosure DECISION lives in
 * planSlateOpening (@sports/crypto, tested exhaustively there). What must be
 * proven HERE is the surface: the gate is off unless deliberately switched on,
 * an outage never reads as a refusal, and no refusal path leaks an opener.
 */

const planSlateOpeningFromDb = vi.hoisted(() => vi.fn());
vi.mock("@sports/ingestion-pipeline", () => ({ planSlateOpeningFromDb }));

const KEY = "AMERICANFOOTBALL_NFL:2026-09-14";
const url = (k = KEY) => `https://x.test/api/verify/slate/opening?slateKey=${encodeURIComponent(k)}`;

async function get(reqUrl = url()) {
  const { GET } = await import("../app/api/verify/slate/opening/route");
  return GET(new Request(reqUrl));
}

beforeEach(() => {
  vi.resetModules();
  planSlateOpeningFromDb.mockReset();
  delete process.env["SLATE_OPENING_REVEAL_ENABLED"];
});

afterEach(() => {
  delete process.env["SLATE_OPENING_REVEAL_ENABLED"];
});

describe("the founder gate is closed by default", () => {
  it("returns 404 and discloses nothing when the flag is unset", async () => {
    const res = await get();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    // The prose legitimately uses the word "opening"; what must be absent is
    // opener MATERIAL — the blinding, the value, and the opening object itself.
    expect(body.opening).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/blindingSum|aggregateValue/i);
    // The gate must short-circuit BEFORE any opener read is attempted.
    expect(planSlateOpeningFromDb).not.toHaveBeenCalled();
  });

  it.each(["", "false", "1", "TRUE", "yes"])(
    "stays closed for the near-miss flag value %j — only the exact string opens it",
    async (v) => {
      process.env["SLATE_OPENING_REVEAL_ENABLED"] = v;
      const res = await get();
      expect(res.status).toBe(404);
      expect(planSlateOpeningFromDb).not.toHaveBeenCalled();
    },
  );
});

describe("with the gate open", () => {
  beforeEach(() => {
    process.env["SLATE_OPENING_REVEAL_ENABLED"] = "true";
  });

  it("rejects a malformed slate key without touching the database", async () => {
    const res = await get("https://x.test/api/verify/slate/opening?slateKey=nonsense");
    expect(res.status).toBe(400);
    expect(planSlateOpeningFromDb).not.toHaveBeenCalled();
  });

  it("discloses the opening when the planner allows it", async () => {
    planSlateOpeningFromDb.mockResolvedValue({
      action: "REVEAL",
      opening: {
        slateKey: KEY,
        aggregateHex: "02abc",
        value: "12345",
        blindingSum: "67890",
      },
    });

    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opened).toBe(true);
    expect(body.commitment).toBe("02abc");
    expect(body.opening).toEqual({ value: "12345", blindingSum: "67890" });
    expect(body.howToCheck).toMatch(/recompute/i);
    // The claim must stay a binding claim, never a performance claim.
    expect(body.whatThisProves).toMatch(/not a claim about whether the picks won/i);
  });

  it.each([
    "not_settled",
    "no_opener",
    "self_check_failed",
    "malformed_opener",
    "malformed_input",
  ])("refuses with an explanation and NO opener for reason %s", async (reason) => {
    planSlateOpeningFromDb.mockResolvedValue({ action: "REFUSE", reason, detail: "d" });

    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opened).toBe(false);
    expect(body.reason).toBe(reason);
    // Every refusal is explained — a bare code on an honesty surface is silence.
    expect(typeof body.explanation).toBe("string");
    expect(body.explanation.length).toBeGreaterThan(20);
    // No refusal path may carry opener material.
    expect(body.opening).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/blindingSum/);
  });

  it("an unsettled slate says so in customer language, not just a code", async () => {
    planSlateOpeningFromDb.mockResolvedValue({
      action: "REFUSE",
      reason: "not_settled",
      detail: "3 of 10 pending",
    });
    const body = await (await get()).json();
    expect(body.explanation).toMatch(/has not fully settled/i);
  });

  it("a self-check failure keeps the Merkle root authoritative in the copy", async () => {
    planSlateOpeningFromDb.mockResolvedValue({
      action: "REFUSE",
      reason: "self_check_failed",
      detail: "mismatch",
    });
    const body = await (await get()).json();
    expect(body.explanation).toMatch(/withheld/i);
    expect(body.explanation).toMatch(/Merkle root/i);
  });

  it("a database outage is 503, never a refusal — an outage is not a verdict", async () => {
    planSlateOpeningFromDb.mockRejectedValue(new Error("connection refused"));

    const res = await get();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/temporarily unavailable/i);
    expect(body.error).toMatch(/not a verdict/i);
    expect(body.opened).toBeUndefined();
  });
});
