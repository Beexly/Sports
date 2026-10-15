/**
 * Characterization pins for the contest-shape guard (G-05) — gate-wiring
 * batch 2.
 *
 * The sweep row is `adviseMode` inside dfs-signals.ts. The existing suite
 * (dfs-signals.test.ts, 14 tests) covers the Week-2 regression and the
 * headline advice cases; these pins add the guard's boundary arithmetic,
 * its exact reason strings, and the dead `singleEntry` input. Nothing here
 * changes behavior. `adviseMode` has a production-lib caller
 * (dfs-solve.ts); these pins protect that caller's assumptions.
 */
import { describe, expect, it } from "vitest";
import type { DfsPlayer } from "./dfs-slate";
import { adviseMode, signalPenalty } from "./dfs-signals";
import { EMPTY_CONTEXT } from "@/lib/signals/spine";

describe("adviseMode characterization — payout-rate boundary", () => {
  it("a payout rate of exactly 0.05 is NOT the cash branch (the comparison is strict)", () => {
    const a = adviseMode({ fieldSize: 2000, placesPaid: 100, singleEntry: false }, "cash");
    expect(a.recommended).toBe("leverage"); // rate 0.05 falls through; field >= 1000
    expect(a.mismatch).toBe(true);
    const justAbove = adviseMode({ fieldSize: 2000, placesPaid: 101, singleEntry: false }, "cash");
    expect(justAbove.recommended).toBe("cash"); // rate 0.0505 > 0.05
    expect(justAbove.mismatch).toBe(false);
  });

  it("the leverage/gpp cutoff is fieldSize >= 1000 exactly", () => {
    expect(adviseMode({ fieldSize: 1000, placesPaid: 10, singleEntry: false }, "gpp").recommended).toBe("leverage");
    expect(adviseMode({ fieldSize: 999, placesPaid: 10, singleEntry: false }, "gpp").recommended).toBe("gpp");
  });

  it("pins the three branches' exact reason strings", () => {
    expect(adviseMode({ fieldSize: 100, placesPaid: 50, singleEntry: true }, "cash").reason).toBe(
      "50 of 100 paid (50%). A floor-maximising build is correct.",
    );
    expect(adviseMode({ fieldSize: 100, placesPaid: 2, singleEntry: false }, "gpp").reason).toBe(
      "2 of 100 paid. Won in the right tail, but a small field needs ceiling, not extreme contrarianism.",
    );
    expect(adviseMode({ fieldSize: 5000, placesPaid: 100, singleEntry: false }, "leverage").reason).toBe(
      "100 of 5000 paid in a large field. Extreme differentiation is required.",
    );
  });

  it("mismatch is exactly (chosen !== recommended) in every branch", () => {
    const cashContest = { fieldSize: 100, placesPaid: 50, singleEntry: true } as const;
    expect(adviseMode(cashContest, "cash").mismatch).toBe(false);
    expect(adviseMode(cashContest, "gpp").mismatch).toBe(true);
    expect(adviseMode(cashContest, "leverage").mismatch).toBe(true);
    const gppContest = { fieldSize: 100, placesPaid: 2, singleEntry: false } as const;
    expect(adviseMode(gppContest, "gpp").mismatch).toBe(false);
    expect(adviseMode(gppContest, "cash").mismatch).toBe(true);
  });
});

describe("adviseMode characterization — degenerate and dead inputs", () => {
  it("singleEntry is accepted but never read: flipping it changes nothing (pinned)", () => {
    const base = { fieldSize: 100, placesPaid: 5 };
    expect(adviseMode({ ...base, singleEntry: true }, "gpp")).toStrictEqual(
      adviseMode({ ...base, singleEntry: false }, "gpp"),
    );
    const big = { fieldSize: 5000, placesPaid: 100 };
    expect(adviseMode({ ...big, singleEntry: true }, "leverage")).toStrictEqual(
      adviseMode({ ...big, singleEntry: false }, "leverage"),
    );
  });

  it("a zero-size field is guarded by Math.max(1, fieldSize) and lands in the gpp branch", () => {
    const a = adviseMode({ fieldSize: 0, placesPaid: 0, singleEntry: false }, "gpp");
    expect(a.recommended).toBe("gpp");
    expect(a.reason).toMatch(/^0 of 0 paid\./);
  });

  it("placesPaid above fieldSize yields a >100% rate and the cash branch", () => {
    const a = adviseMode({ fieldSize: 100, placesPaid: 150, singleEntry: false }, "cash");
    expect(a.recommended).toBe("cash");
    expect(a.reason).toContain("(150%)");
  });
});

describe("signalPenalty characterization — adapter surface", () => {
  it("with an empty context the penalty is 0 for every mode, including leverage", () => {
    const p: DfsPlayer = {
      id: "p",
      name: "P",
      pos: "WR",
      team: "AAA",
      opp: "BBB",
      salary: 5000,
      proj: 10,
      floor: 5,
      ceiling: 16,
      own: 0.05,
    };
    for (const mode of ["cash", "gpp", "leverage"] as const) {
      expect(signalPenalty(EMPTY_CONTEXT, mode)(p)).toBe(0);
    }
  });
});
