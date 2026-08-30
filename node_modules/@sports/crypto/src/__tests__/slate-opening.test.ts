import { describe, it, expect } from "vitest";
import { planSlateOpening, type SlateOpeningInput } from "../slate-opening.js";
import { commitLedger, encodeFixedPoint, CURVE_ORDER } from "../pedersen-ledger.js";

/**
 * The planner is the entire security boundary for Phase 0.5b: it decides
 * whether a slate's Pedersen opener may be disclosed. Every test below is
 * therefore written as "what must it REFUSE", with a single happy path.
 */

/** Build a real, self-consistent slate opener the way the mint path does. */
function realSlate(edgeScores: readonly number[]) {
  const values = edgeScores.map((e) => {
    const v = encodeFixedPoint(e, 0, 100);
    if (v === null) throw new Error("fixture edge score out of range");
    return v;
  });
  // Deterministic blindings — a fixture must not depend on CSPRNG draws.
  const blindings = values.map((_, i) => BigInt(1_000_003 + i * 7919) % CURVE_ORDER);
  const ledger = commitLedger(values, blindings);
  if (ledger === null) throw new Error("fixture ledger failed to commit");
  return {
    aggregateHex: ledger.aggregateCommitment,
    aggregateValue: ledger.aggregateValue.toString(),
    blindingSum: ledger.aggregateBlinding.toString(),
    count: edgeScores.length,
  };
}

function input(over: Partial<SlateOpeningInput> = {}): SlateOpeningInput {
  const s = realSlate([12.5, 40, 7.25]);
  return {
    slateKey: "AMERICANFOOTBALL_NFL:2026-09-14",
    aggregateHex: s.aggregateHex,
    aggregateValue: s.aggregateValue,
    blindingSum: s.blindingSum,
    coveredPickCount: s.count,
    pendingPickCount: 0,
    ...over,
  };
}

describe("planSlateOpening — the happy path", () => {
  it("reveals a settled slate whose opener reproduces the published hex", () => {
    const plan = planSlateOpening(input());
    expect(plan.action).toBe("REVEAL");
    if (plan.action !== "REVEAL") return;
    expect(plan.opening.slateKey).toBe("AMERICANFOOTBALL_NFL:2026-09-14");
    // The disclosed strings are exactly what was stored — the planner discloses,
    // it does not re-encode.
    const fixture = realSlate([12.5, 40, 7.25]);
    expect(plan.opening.value).toBe(fixture.aggregateValue);
    expect(plan.opening.blindingSum).toBe(fixture.blindingSum);
    expect(plan.opening.aggregateHex).toBe(fixture.aggregateHex);
    expect(BigInt(plan.opening.value)).toBeGreaterThan(0n);
    expect(BigInt(plan.opening.blindingSum)).toBeGreaterThanOrEqual(0n);
  });

  it("a single-pick slate opens too — there is no minimum population to open", () => {
    const s = realSlate([55]);
    const plan = planSlateOpening(
      input({
        aggregateHex: s.aggregateHex,
        aggregateValue: s.aggregateValue,
        blindingSum: s.blindingSum,
        coveredPickCount: 1,
        pendingPickCount: 0,
      }),
    );
    expect(plan.action).toBe("REVEAL");
  });
});

describe("REFUSAL 1 — an unsettled slate is never opened", () => {
  it("refuses while any covered pick is still pending", () => {
    const plan = planSlateOpening(input({ pendingPickCount: 1 }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("not_settled");
  });

  it("refuses a MOSTLY settled slate — the aggregate is one number over the whole population", () => {
    // 99 of 100 done is still not openable: the aggregate covers the pending
    // pick too, so disclosing it discloses a live position.
    const plan = planSlateOpening(input({ coveredPickCount: 100, pendingPickCount: 1 }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("not_settled");
    expect(plan.detail).toMatch(/whole slate|pending/i);
  });

  it("checks settlement BEFORE the opener, so a live slate with a broken opener still reads as not_settled", () => {
    // Ordering matters: no code path that touches the secret may run while the
    // slate is live, so the settlement refusal must win over every other fault.
    const plan = planSlateOpening(
      input({ pendingPickCount: 2, aggregateValue: "not-a-number", blindingSum: null }),
    );
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("not_settled");
  });
});

describe("REFUSAL 2 — a slate with no opener is history, not an error", () => {
  it.each([
    ["hex", { aggregateHex: null }],
    ["value", { aggregateValue: null }],
    ["blindingSum", { blindingSum: null }],
    ["all three", { aggregateHex: null, aggregateValue: null, blindingSum: null }],
  ])("refuses with no_opener when %s is null", (_label, over) => {
    const plan = planSlateOpening(input(over));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("no_opener");
  });

  it("does not throw on a pre-Phase-0.5 slate", () => {
    expect(() =>
      planSlateOpening(input({ aggregateHex: null, aggregateValue: null, blindingSum: null })),
    ).not.toThrow();
  });
});

describe("REFUSAL 3 — an opener that does not open is withheld", () => {
  it("refuses when a wrong but IN-BAND value does not reproduce the hex", () => {
    // In-band (below the covered-count ceiling) so it clears the mint-contract
    // bound and genuinely exercises the self-check, not the value bound.
    const s = realSlate([12.5, 40, 7.25]);
    const wrongInBand = (BigInt(s.aggregateValue) + 1n).toString();
    const plan = planSlateOpening(input({ aggregateValue: wrongInBand }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("self_check_failed");
  });

  it("refuses when the stored blinding does not reproduce the hex", () => {
    const plan = planSlateOpening(input({ blindingSum: "424242" }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("self_check_failed");
  });

  it("refuses when the hex belongs to a DIFFERENT slate", () => {
    const other = realSlate([1, 2, 3, 4]);
    const plan = planSlateOpening(input({ aggregateHex: other.aggregateHex }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("self_check_failed");
  });

  it("says WHY it withheld — a silent empty result would read as an outage", () => {
    const plan = planSlateOpening(input({ aggregateValue: "1" }));
    if (plan.action !== "REFUSE") throw new Error("expected REFUSE");
    expect(plan.detail).toMatch(/does NOT reproduce/i);
  });

  it("refuses malformed hex rather than throwing", () => {
    const plan = planSlateOpening(input({ aggregateHex: "zzzz-not-hex" }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("self_check_failed");
  });
});

describe("the mint-contract value bound closes the mod-n alias (adversarial review)", () => {
  // Pedersen binding is only mod n: commit(v, r) is reproduced by every
  // v + k·CURVE_ORDER. Without an upper bound, a corrupted opener holding v + n
  // passes the self-check and gets disclosed. The bound refuses it.
  it("refuses value = v + CURVE_ORDER even though it reproduces the hex mod n", () => {
    const s = realSlate([12.5, 40, 7.25]);
    const alias = (BigInt(s.aggregateValue) + CURVE_ORDER).toString();
    const plan = planSlateOpening(input({ aggregateValue: alias }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("malformed_opener");
    expect(plan.detail).toMatch(/mint-contract range/i);
  });

  it("refuses value = v + 2·CURVE_ORDER as well", () => {
    const s = realSlate([12.5, 40, 7.25]);
    const alias = (BigInt(s.aggregateValue) + 2n * CURVE_ORDER).toString();
    const plan = planSlateOpening(input({ aggregateValue: alias }));
    expect(plan.action).toBe("REFUSE");
  });

  it("refuses a value one past the covered-count ceiling", () => {
    // 3 picks * 100 * 1e6 = 3e8 is the max legitimate sum; one over is refused.
    const plan = planSlateOpening(
      input({ aggregateValue: (3n * 100n * 1_000_000n + 1n).toString() }),
    );
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("malformed_opener");
  });

  it("still reveals a legitimate in-band value — the bound does not break the happy path", () => {
    expect(planSlateOpening(input()).action).toBe("REVEAL");
  });
});

describe("malformed opener columns", () => {
  it.each(["", "  ", "0x1f", "1e6", "+5", "1.5", "abc"])(
    "refuses a non-decimal value column: %j",
    (bad) => {
      const plan = planSlateOpening(input({ aggregateValue: bad }));
      expect(plan.action).toBe("REFUSE");
      if (plan.action !== "REFUSE") return;
      expect(plan.reason).toBe("malformed_opener");
    },
  );

  it("refuses a non-decimal blinding column", () => {
    const plan = planSlateOpening(input({ blindingSum: "0xdeadbeef" }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("malformed_opener");
  });
});

describe("malformed counts are refused, never coerced", () => {
  it.each([
    ["negative pending", { pendingPickCount: -1 }],
    ["negative covered", { coveredPickCount: -3 }],
    ["fractional pending", { pendingPickCount: 1.5 }],
    ["NaN pending", { pendingPickCount: Number.NaN }],
    ["Infinity covered", { coveredPickCount: Number.POSITIVE_INFINITY }],
  ])("refuses %s", (_label, over) => {
    const plan = planSlateOpening(input(over));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("malformed_input");
  });

  it("refuses when the pending set is not a subset of the covered set", () => {
    // Guessing which side is wrong is how a live slate gets opened early.
    const plan = planSlateOpening(input({ coveredPickCount: 3, pendingPickCount: 4 }));
    expect(plan.action).toBe("REFUSE");
    if (plan.action !== "REFUSE") return;
    expect(plan.reason).toBe("malformed_input");
  });
});

describe("totality — the planner never throws", () => {
  it("survives every degenerate combination without throwing", () => {
    const nasties: Partial<SlateOpeningInput>[] = [
      { aggregateHex: "" },
      { aggregateValue: "-1" },
      { blindingSum: "-1" },
      { coveredPickCount: 0, pendingPickCount: 0 },
      { slateKey: "" },
      { aggregateHex: "02".repeat(100) },
      { aggregateValue: "9".repeat(400) },
    ];
    for (const over of nasties) {
      expect(() => planSlateOpening(input(over))).not.toThrow();
    }
  });

  it("an empty covered slate with an opener still self-checks rather than crashing", () => {
    const plan = planSlateOpening(input({ coveredPickCount: 0, pendingPickCount: 0 }));
    expect(["REVEAL", "REFUSE"]).toContain(plan.action);
  });
});
