/**
 * Adversarial tests for the corroboration gate itself.
 *
 * The whole design rests on one property: the gate can only ever WITHHOLD.
 * A broken signal, a missing signal, a wrong signal — none of them may turn a
 * pick that should be held into a pick that publishes. These tests attack that
 * property from every direction rather than demonstrating the happy path.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_MIN_CORROBORATIONS,
  evaluateGate,
  type GateCandidate,
  type SignalFn,
  type SignalKey,
  type SignalRead,
  type SignalVerdict,
} from "./gate-contract";

const CANDIDATE: GateCandidate = {
  gameId: "game-1",
  sportKey: "americanfootball_nfl",
  homeTeamName: "Seattle Seahawks",
  awayTeamName: "New England Patriots",
  commenceTime: new Date("2026-09-14T17:00:00Z"),
  pickType: "SPREAD",
  selection: "Seattle Seahawks -3.5",
  side: "home",
  line: -3.5,
};

function read(
  key: SignalKey,
  verdict: SignalVerdict,
  reason = `${key} says ${verdict}`,
): SignalRead {
  return { key, verdict, reason, basis: "test fixture", completeness: 1 };
}

/** A signal that answers synchronously. */
function sync(key: SignalKey, verdict: SignalVerdict, reason?: string): SignalFn {
  return () => read(key, verdict, reason);
}

/** A signal that answers on a later tick. */
function async_(key: SignalKey, verdict: SignalVerdict, reason?: string): SignalFn {
  return async () => read(key, verdict, reason);
}

/** A signal with no data. */
const silentSignal: SignalFn = () => null;

/** A signal that blows up synchronously. */
const throwsSync: SignalFn = () => {
  throw new Error("signal exploded");
};

/** A signal whose promise rejects. */
const throwsAsync: SignalFn = async () => {
  throw new Error("signal rejected");
};

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) out.push([items[i] as T, ...tail]);
  }
  return out;
}

describe("evaluateGate — the veto is absolute", () => {
  it("one CONTRADICTS holds the pick even when three signals CONFIRM", async () => {
    const verdict = await evaluateGate(CANDIDATE, [
      sync("rest-travel", "CONFIRMS"),
      sync("market-movement", "CONFIRMS"),
      sync("book-agreement", "CONTRADICTS", "Eight of eleven books are on the other side."),
      sync("prop-alignment", "CONFIRMS"),
    ]);
    expect(verdict.publish).toBe(false);
    expect(verdict.confirmations).toBe(3);
    expect(verdict.contradictions).toBe(1);
  });

  it("no number of confirmations can outvote a single contradiction", async () => {
    const confirming: SignalFn[] = (
      [
        "rest-travel",
        "market-movement",
        "beat-report",
        "prop-alignment",
        "scheme-matchup",
        "narrative-incentive",
      ] as const
    ).map((key) => sync(key, "CONFIRMS"));
    const verdict = await evaluateGate(
      CANDIDATE,
      [...confirming, sync("book-agreement", "CONTRADICTS")],
      { minCorroborations: 1 },
    );
    expect(verdict.publish).toBe(false);
    expect(verdict.confirmations).toBe(6);
  });

  it("a contradiction still holds when minCorroborations is 0", async () => {
    const verdict = await evaluateGate(
      CANDIDATE,
      [sync("book-agreement", "CONTRADICTS")],
      { minCorroborations: 0 },
    );
    expect(verdict.publish).toBe(false);
  });
});

describe("evaluateGate — minCorroborations", () => {
  it("one confirmation does not publish when two are required", async () => {
    const verdict = await evaluateGate(
      CANDIDATE,
      [sync("rest-travel", "CONFIRMS"), sync("book-agreement", "NEUTRAL")],
      { minCorroborations: 2 },
    );
    expect(verdict.publish).toBe(false);
    expect(verdict.confirmations).toBe(1);
  });

  it("publishes when the requirement is met exactly", async () => {
    const verdict = await evaluateGate(
      CANDIDATE,
      [sync("rest-travel", "CONFIRMS"), sync("book-agreement", "CONFIRMS")],
      { minCorroborations: 2 },
    );
    expect(verdict.publish).toBe(true);
    expect(verdict.confirmations).toBe(2);
  });

  it("defaults to a single corroboration", async () => {
    expect(DEFAULT_MIN_CORROBORATIONS).toBe(1);
    const verdict = await evaluateGate(CANDIDATE, [sync("rest-travel", "CONFIRMS")]);
    expect(verdict.publish).toBe(true);
  });

  it("NEUTRAL is not confirmation — a neutral-only set does not publish at minimum 1", async () => {
    const verdict = await evaluateGate(CANDIDATE, [
      sync("rest-travel", "NEUTRAL"),
      sync("book-agreement", "NEUTRAL"),
      sync("beat-report", "NEUTRAL"),
    ]);
    expect(verdict.publish).toBe(false);
    expect(verdict.confirmations).toBe(0);
    expect(verdict.contradictions).toBe(0);
  });
});

describe("evaluateGate — no signals fired", () => {
  it("publishes by DEFAULT, so wiring the gate is a no-op until someone opts in", async () => {
    const verdict = await evaluateGate(CANDIDATE, []);
    expect(verdict.publish).toBe(true);
    expect(verdict.reads).toHaveLength(0);
  });

  it("publishes with an explicitly empty options object", async () => {
    const verdict = await evaluateGate(CANDIDATE, [silentSignal, silentSignal], {});
    expect(verdict.publish).toBe(true);
  });

  it("holds when requireEvidence is turned on", async () => {
    const verdict = await evaluateGate(CANDIDATE, [silentSignal], {
      requireEvidence: true,
    });
    expect(verdict.publish).toBe(false);
    expect(verdict.summary.length).toBeGreaterThan(0);
  });
});

describe("evaluateGate — a broken signal is silent, never evidence", () => {
  it("a throwing signal cannot publish a pick that would otherwise be held", async () => {
    const heldWithout = await evaluateGate(
      CANDIDATE,
      [sync("rest-travel", "CONFIRMS")],
      { minCorroborations: 2 },
    );
    const heldWith = await evaluateGate(
      CANDIDATE,
      [sync("rest-travel", "CONFIRMS"), throwsSync, throwsAsync],
      { minCorroborations: 2 },
    );
    expect(heldWithout.publish).toBe(false);
    expect(heldWith.publish).toBe(false);
    expect(heldWith.confirmations).toBe(1);
    expect(heldWith.reads).toHaveLength(1);
  });

  it("a throwing signal cannot hold a pick that would otherwise publish", async () => {
    const publishedWithout = await evaluateGate(CANDIDATE, [
      sync("rest-travel", "CONFIRMS"),
    ]);
    const publishedWith = await evaluateGate(CANDIDATE, [
      sync("rest-travel", "CONFIRMS"),
      throwsSync,
      throwsAsync,
    ]);
    expect(publishedWithout.publish).toBe(true);
    expect(publishedWith.publish).toBe(true);
    expect(publishedWith.contradictions).toBe(0);
  });

  it("a signal that throws under requireEvidence leaves the pick held, not published", async () => {
    const verdict = await evaluateGate(CANDIDATE, [throwsSync, throwsAsync], {
      requireEvidence: true,
    });
    expect(verdict.publish).toBe(false);
    expect(verdict.reads).toHaveLength(0);
  });
});

describe("evaluateGate — nulls", () => {
  it("a null read does not count toward confirmations and does not appear in reads", async () => {
    const verdict = await evaluateGate(CANDIDATE, [
      silentSignal,
      sync("rest-travel", "CONFIRMS"),
      silentSignal,
    ]);
    expect(verdict.reads).toHaveLength(1);
    expect(verdict.reads[0]?.key).toBe("rest-travel");
    expect(verdict.confirmations).toBe(1);
  });

  it("KNOWN GAP in gate-contract.ts: `silent` is documented as naming the null signals but is never populated", async () => {
    const verdict = await evaluateGate(CANDIDATE, [silentSignal, silentSignal]);
    // Pinned as observed, not as documented. The type comment says "Named, never
    // hidden"; the loop `continue`s without pushing to `silent`. Reported, not
    // fixed here — this file may not edit gate-contract.ts.
    expect(verdict.silent).toEqual([]);
  });
});

describe("evaluateGate — mechanics", () => {
  it("handles sync and async signals in the same set", async () => {
    const verdict = await evaluateGate(
      CANDIDATE,
      [sync("rest-travel", "CONFIRMS"), async_("book-agreement", "CONFIRMS")],
      { minCorroborations: 2 },
    );
    expect(verdict.publish).toBe(true);
    expect(verdict.reads.map((r) => r.key)).toEqual(["rest-travel", "book-agreement"]);
  });

  it("is order independent across every permutation of a mixed set", async () => {
    const signals: SignalFn[] = [
      sync("rest-travel", "CONFIRMS"),
      async_("book-agreement", "CONTRADICTS"),
      sync("beat-report", "NEUTRAL"),
      silentSignal,
    ];
    const results = await Promise.all(
      permutations(signals).map((ordering) => evaluateGate(CANDIDATE, ordering)),
    );
    for (const result of results) {
      expect(result.publish).toBe(false);
      expect(result.confirmations).toBe(1);
      expect(result.contradictions).toBe(1);
      expect(result.reads).toHaveLength(3);
    }
  });

  it("is order independent on a publishing set too", async () => {
    const signals: SignalFn[] = [
      sync("rest-travel", "CONFIRMS"),
      async_("book-agreement", "CONFIRMS"),
      sync("beat-report", "NEUTRAL"),
    ];
    for (const ordering of permutations(signals)) {
      const result = await evaluateGate(CANDIDATE, ordering, { minCorroborations: 2 });
      expect(result.publish).toBe(true);
      expect(result.confirmations).toBe(2);
    }
  });

  it("never mutates the candidate", async () => {
    const before = structuredClone(CANDIDATE);
    await evaluateGate(CANDIDATE, [
      sync("rest-travel", "CONFIRMS"),
      async_("book-agreement", "CONTRADICTS"),
      silentSignal,
      throwsSync,
    ]);
    expect(CANDIDATE).toEqual(before);
    expect(CANDIDATE.commenceTime.toISOString()).toBe(before.commenceTime.toISOString());
  });

  it("counts match the reads array in every branch", async () => {
    const sets: readonly SignalFn[][] = [
      [],
      [silentSignal],
      [sync("rest-travel", "CONFIRMS")],
      [sync("rest-travel", "CONFIRMS"), sync("book-agreement", "CONTRADICTS")],
      [sync("rest-travel", "NEUTRAL"), sync("book-agreement", "NEUTRAL")],
      [sync("rest-travel", "CONFIRMS"), throwsAsync, silentSignal],
    ];
    for (const set of sets) {
      const verdict = await evaluateGate(CANDIDATE, set);
      expect(verdict.confirmations).toBe(
        verdict.reads.filter((r) => r.verdict === "CONFIRMS").length,
      );
      expect(verdict.contradictions).toBe(
        verdict.reads.filter((r) => r.verdict === "CONTRADICTS").length,
      );
    }
  });
});

describe("evaluateGate — summary", () => {
  it("is non-empty in every branch", async () => {
    const cases: readonly { signals: SignalFn[]; requireEvidence: boolean }[] = [
      { signals: [], requireEvidence: false },
      { signals: [], requireEvidence: true },
      { signals: [sync("rest-travel", "CONFIRMS")], requireEvidence: false },
      { signals: [sync("rest-travel", "NEUTRAL")], requireEvidence: false },
      { signals: [sync("book-agreement", "CONTRADICTS")], requireEvidence: false },
      { signals: [throwsSync], requireEvidence: true },
    ];
    for (const { signals, requireEvidence } of cases) {
      const verdict = await evaluateGate(CANDIDATE, signals, { requireEvidence });
      expect(verdict.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it("names the contradicting reason on a hold", async () => {
    const reason = "Eight of eleven books are on the other side.";
    const verdict = await evaluateGate(CANDIDATE, [
      sync("rest-travel", "CONFIRMS", "Six days of rest against a short week."),
      sync("book-agreement", "CONTRADICTS", reason),
    ]);
    expect(verdict.publish).toBe(false);
    expect(verdict.summary).toContain(reason);
    expect(verdict.summary).not.toContain("Six days of rest");
  });

  it("names every contradicting reason when more than one fires", async () => {
    const a = "Eight of eleven books are on the other side.";
    const b = "The starting quarterback is out.";
    const verdict = await evaluateGate(CANDIDATE, [
      sync("book-agreement", "CONTRADICTS", a),
      sync("beat-report", "CONTRADICTS", b),
    ]);
    expect(verdict.summary).toContain(a);
    expect(verdict.summary).toContain(b);
  });
});

describe("evaluateGate — property: publish implies no contradictions", () => {
  type Spec = "CONFIRMS" | "CONTRADICTS" | "NEUTRAL" | "NULL" | "THROW";
  const SPECS: readonly Spec[] = ["CONFIRMS", "CONTRADICTS", "NEUTRAL", "NULL", "THROW"];
  const KEYS: readonly SignalKey[] = [
    "rest-travel",
    "market-movement",
    "book-agreement",
    "beat-report",
    "prop-alignment",
    "scheme-matchup",
    "narrative-incentive",
  ];

  function build(spec: Spec, index: number): SignalFn {
    const key = KEYS[index % KEYS.length] as SignalKey;
    if (spec === "NULL") return silentSignal;
    if (spec === "THROW") return index % 2 === 0 ? throwsSync : throwsAsync;
    return index % 2 === 0 ? sync(key, spec) : async_(key, spec);
  }

  it("holds over randomly generated signal mixes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom(...SPECS), { maxLength: 7 }),
        fc.integer({ min: 0, max: 4 }),
        fc.boolean(),
        async (specs, minCorroborations, requireEvidence) => {
          const verdict = await evaluateGate(
            CANDIDATE,
            specs.map(build),
            { minCorroborations, requireEvidence },
          );
          if (verdict.publish) {
            expect(verdict.contradictions).toBe(0);
            expect(verdict.reads.some((r) => r.verdict === "CONTRADICTS")).toBe(false);
          }
          // A throwing or null signal never adds evidence.
          expect(verdict.reads.length).toBeLessThanOrEqual(
            specs.filter((s) => s !== "NULL" && s !== "THROW").length,
          );
        },
      ),
      { numRuns: 300 },
    );
  });

  it("holds exhaustively over every three-signal combination", async () => {
    for (const a of SPECS) {
      for (const b of SPECS) {
        for (const c of SPECS) {
          for (const min of [1, 2]) {
            const verdict = await evaluateGate(
              CANDIDATE,
              [a, b, c].map(build),
              { minCorroborations: min },
            );
            if (verdict.publish) expect(verdict.contradictions).toBe(0);
            if ([a, b, c].includes("CONTRADICTS")) expect(verdict.publish).toBe(false);
          }
        }
      }
    }
  });
});
