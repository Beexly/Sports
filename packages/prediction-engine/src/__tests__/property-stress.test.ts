import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { calculatePickResult, type SettlementResult } from "../settlement.js";
import {
  americanToImpliedProbability,
  impliedProbabilityToAmerican,
  averageAmericanPrices,
} from "../scoring.js";
import {
  computeMoneylineClv,
  computeSpreadClv,
  computeTotalClv,
  summarizeClv,
} from "../clv.js";
import {
  buildSlateCommitment,
  provePickInSlate,
  planSlateCommitment,
  type SlateLeaf,
} from "../slate-commitment.js";
import { verifyInclusion } from "../proof-of-record.js";

/**
 * PROPERTY / STRESS SUITE for the money-truth core.
 *
 * Example-based tests pin the cases someone thought of; these pin the cases
 * nobody thought of. Every generator is driven by a SEEDED deterministic
 * PRNG — a failure prints the case that broke, and re-running reproduces it
 * exactly (no Math.random, no flakes). The Merkle properties run against the
 * PRODUCTION hash (node:crypto SHA-256), not a toy hash.
 *
 * Invariant families:
 *   A. Settlement — totality, two-sided zero-sum, push-boundary exactness,
 *      half-point no-push, soccer draw rule, prefix-collision side derivation.
 *   B. CLV math — American<->implied round-trip, antisymmetry, verdict
 *      consistency, probability-space averaging bounds, summary sanity.
 *   C. Commitment — determinism, tamper evidence (payload / order / drop),
 *      inclusion proofs fold for every index and fail against a foreign root,
 *      planner never fake-pre-registers.
 */

// ── deterministic PRNG (mulberry32) ────────────────────────────────────────
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function int(r: () => number, lo: number, hi: number): number {
  return lo + Math.floor(r() * (hi - lo + 1));
}
function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

const sha256 = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");

// ── A. settlement ───────────────────────────────────────────────────────────

const RESULTS: readonly SettlementResult[] = ["WIN", "LOSS", "PUSH"];
const HOME = "Home City Hawks";
const AWAY = "Away Town Owls";

describe("A. settlement properties (5,000 random games per family)", () => {
  it("totality: every valid input settles to WIN/LOSS/PUSH — nothing else, no throw", () => {
    const r = rng(101);
    for (let i = 0; i < 5000; i++) {
      const homeScore = int(r, 0, 99);
      const awayScore = int(r, 0, 99);
      const half = r() < 0.5 ? 0.5 : 0;
      const line = int(r, -60, 60) + half;
      const kind = pick(r, ["SPREAD", "MONEYLINE", "TOTAL"] as const);
      const selection =
        kind === "TOTAL"
          ? pick(r, [`OVER ${line}`, `UNDER ${line}`])
          : pick(r, [HOME, AWAY, `${HOME} ${line}`, `${AWAY} +${line}`]);
      const sport = pick(r, ["basketball_nba", "soccer_usa_mls", "americanfootball_nfl"]);
      const res = calculatePickResult(kind, selection, line, HOME, homeScore, awayScore, sport, AWAY);
      expect(RESULTS, `case ${i}: ${kind} ${selection} line=${line} ${homeScore}-${awayScore} ${sport}`).toContain(res);
    }
  });

  it("zero-sum: opposite sides of the SAME game+line mirror WIN/LOSS or share a PUSH", () => {
    const r = rng(202);
    const mirror: Record<SettlementResult, SettlementResult> = { WIN: "LOSS", LOSS: "WIN", PUSH: "PUSH" };
    for (let i = 0; i < 5000; i++) {
      const homeScore = int(r, 0, 60);
      const awayScore = int(r, 0, 60);
      const line = int(r, -30, 30) + (r() < 0.5 ? 0.5 : 0);
      const sport = pick(r, ["basketball_nba", "americanfootball_nfl", "icehockey_nhl"]);

      const ctx = `case ${i}: line=${line} ${homeScore}-${awayScore} ${sport}`;
      const sHome = calculatePickResult("SPREAD", HOME, line, HOME, homeScore, awayScore, sport, AWAY);
      const sAway = calculatePickResult("SPREAD", AWAY, line, HOME, homeScore, awayScore, sport, AWAY);
      expect(sAway, `SPREAD ${ctx}`).toBe(mirror[sHome]);

      const tOver = calculatePickResult("TOTAL", "OVER", Math.abs(line), HOME, homeScore, awayScore, sport, AWAY);
      const tUnder = calculatePickResult("TOTAL", "UNDER", Math.abs(line), HOME, homeScore, awayScore, sport, AWAY);
      expect(tUnder, `TOTAL ${ctx}`).toBe(mirror[tOver]);

      // Non-soccer moneyline: ties push both ways, decided games mirror.
      const mHome = calculatePickResult("MONEYLINE", HOME, 0, HOME, homeScore, awayScore, sport, AWAY);
      const mAway = calculatePickResult("MONEYLINE", AWAY, 0, HOME, homeScore, awayScore, sport, AWAY);
      expect(mAway, `ML ${ctx}`).toBe(mirror[mHome]);
    }
  });

  it("half-point lines can NEVER push; integer lines push exactly on the boundary", () => {
    const r = rng(303);
    for (let i = 0; i < 5000; i++) {
      const homeScore = int(r, 0, 60);
      const awayScore = int(r, 0, 60);
      const intLine = int(r, -30, 30);

      const halfRes = calculatePickResult("SPREAD", HOME, intLine + 0.5, HOME, homeScore, awayScore, "basketball_nba", AWAY);
      expect(halfRes, `half-point spread must decide (case ${i})`).not.toBe("PUSH");
      const halfTotal = calculatePickResult("TOTAL", "OVER", Math.abs(intLine) + 0.5, HOME, homeScore, awayScore, "basketball_nba", AWAY);
      expect(halfTotal, `half-point total must decide (case ${i})`).not.toBe("PUSH");

      const spreadRes = calculatePickResult("SPREAD", HOME, intLine, HOME, homeScore, awayScore, "basketball_nba", AWAY);
      const isBoundary = homeScore - awayScore + intLine === 0;
      expect(spreadRes === "PUSH", `spread push iff boundary (case ${i}: ${homeScore}-${awayScore} line=${intLine})`).toBe(isBoundary);

      const total = int(r, 0, 120);
      const totalRes = calculatePickResult("TOTAL", "OVER", total, HOME, homeScore, awayScore, "basketball_nba", AWAY);
      expect(totalRes === "PUSH", `total push iff boundary (case ${i})`).toBe(homeScore + awayScore === total);
    }
  });

  it("soccer draws settle ML as LOSS for both sides; all other sports push", () => {
    const r = rng(404);
    for (let i = 0; i < 2000; i++) {
      const score = int(r, 0, 6);
      const soccerHome = calculatePickResult("MONEYLINE", HOME, 0, HOME, score, score, "soccer_epl", AWAY);
      const soccerAway = calculatePickResult("MONEYLINE", AWAY, 0, HOME, score, score, "soccer_epl", AWAY);
      expect([soccerHome, soccerAway], `soccer draw case ${i}`).toEqual(["LOSS", "LOSS"]);
      const nbaTie = calculatePickResult("MONEYLINE", HOME, 0, HOME, score, score, "basketball_nba", AWAY);
      expect(nbaTie, `non-soccer tie case ${i}`).toBe("PUSH");
    }
  });

  it("prefix-collision fuzz: a home name that is a prefix of the away name never inverts the side (fixed by most-specific match)", () => {
    // FOUND BY THIS SUITE on first run: with home "Jets" and away "Jets Metro",
    // the away selection matched `homeTeam + " "` and settled as a HOME pick —
    // inverting WIN/LOSS. The fix passes awayTeam and lets the most specific
    // name win. Both the no-boundary case (LA/LAC) and the spaced-prefix case
    // (Jets / Jets Metro) are fuzzed here.
    const r = rng(505);
    const stems = ["LA", "NY", "Jets", "Sox", "United", "City"];
    for (let i = 0; i < 2000; i++) {
      const home = pick(r, stems);
      const away = `${home}${pick(r, ["C", "R", " Metro", " United FC", "X"])}`;
      const homeScore = int(r, 0, 50);
      const awayScore = int(r, 0, 50);
      if (homeScore === awayScore) continue;
      const res = calculatePickResult("MONEYLINE", away, 0, home, homeScore, awayScore, "basketball_nba", away);
      const awayWon = awayScore > homeScore;
      expect(res, `case ${i}: home="${home}" away="${away}" ${homeScore}-${awayScore}`).toBe(awayWon ? "WIN" : "LOSS");
      // And the home selection still resolves home with both names supplied.
      const resHome = calculatePickResult("MONEYLINE", home, 0, home, homeScore, awayScore, "basketball_nba", away);
      expect(resHome, `home side, case ${i}`).toBe(homeScore > awayScore ? "WIN" : "LOSS");
    }
  });

  it("COMPILE PIN: the away team can never be omitted again (Codex, PR #83)", () => {
    // An OPTIONAL safety parameter is itself a fail-open: two production
    // callers (free-settlement, historical replay) had the away name in hand
    // and omitted it, keeping the inversion alive on their paths. The 8th
    // argument is now REQUIRED — the 7-arg legacy form must not compile.
    const sevenArgForm = () =>
      // @ts-expect-error — omitting awayTeam is a type error by design
      calculatePickResult("MONEYLINE", "Jets Metro", 0, "Jets", 9, 25, "basketball_nba");
    expect(typeof sevenArgForm).toBe("function");
  });
});

// ── B. CLV math ─────────────────────────────────────────────────────────────

describe("B. CLV math properties", () => {
  it("round-trip: every integer American price in ±[101, 5000] survives implied()→american() exactly", () => {
    for (let p = 101; p <= 5000; p++) {
      for (const price of [p, -p]) {
        const back = impliedProbabilityToAmerican(americanToImpliedProbability(price));
        expect(back, `price ${price}`).toBe(price);
      }
    }
    // The single degeneracy: ±100 both encode 0.5 and canonicalize to -100.
    expect(impliedProbabilityToAmerican(americanToImpliedProbability(100))).toBe(-100);
    expect(impliedProbabilityToAmerican(americanToImpliedProbability(-100))).toBe(-100);
  });

  it("implied probability is finite, in (0,1), and strictly monotone in price meaning", () => {
    const r = rng(606);
    for (let i = 0; i < 5000; i++) {
      const price = pick(r, [1, -1]) * int(r, 100, 100000);
      const q = americanToImpliedProbability(price);
      expect(Number.isFinite(q), `price ${price}`).toBe(true);
      expect(q).toBeGreaterThan(0);
      expect(q).toBeLessThan(1);
      // Bigger favorite ⇒ strictly higher implied probability.
      if (price <= -101) {
        expect(americanToImpliedProbability(price - 50)).toBeGreaterThan(q);
      }
      // Longer dog ⇒ strictly lower implied probability.
      if (price >= 100) {
        expect(americanToImpliedProbability(price + 50)).toBeLessThan(q);
      }
    }
  });

  it("moneyline CLV is antisymmetric and verdict-consistent (5,000 random price pairs)", () => {
    const r = rng(707);
    for (let i = 0; i < 5000; i++) {
      const a = pick(r, [1, -1]) * int(r, 100, 2000);
      const b = pick(r, [1, -1]) * int(r, 100, 2000);
      const ab = computeMoneylineClv(a, b);
      const ba = computeMoneylineClv(b, a);
      const ctx = `case ${i}: a=${a} b=${b}`;
      expect(Math.abs(ab.clvProbability + ba.clvProbability), ctx).toBeLessThan(1e-9);
      if (ab.verdict === "BEAT_CLOSE") expect(ba.verdict, ctx).toBe("LOST_TO_CLOSE");
      if (ab.verdict === "LOST_TO_CLOSE") expect(ba.verdict, ctx).toBe("BEAT_CLOSE");
      if (ab.verdict === "MATCHED_CLOSE") expect(ba.verdict, ctx).toBe("MATCHED_CLOSE");
      // Verdict must agree with the number it is derived from.
      if (ab.clvProbability > 0.005) expect(ab.verdict, ctx).toBe("BEAT_CLOSE");
      if (ab.clvProbability < -0.005) expect(ab.verdict, ctx).toBe("LOST_TO_CLOSE");
    }
  });

  it("spread/total CLV: opposite sides are exact mirrors; values always finite", () => {
    const r = rng(808);
    for (let i = 0; i < 5000; i++) {
      const lock = int(r, -60, 60) + (r() < 0.5 ? 0.5 : 0);
      const close = int(r, -60, 60) + (r() < 0.5 ? 0.5 : 0);
      const sh = computeSpreadClv(lock, close, "HOME");
      const sa = computeSpreadClv(lock, close, "AWAY");
      expect(sh.clvPoints + sa.clvPoints, `spread case ${i}`).toBeCloseTo(0, 9);
      const to = computeTotalClv(Math.abs(lock), Math.abs(close), "OVER");
      const tu = computeTotalClv(Math.abs(lock), Math.abs(close), "UNDER");
      expect(to.clvPoints + tu.clvPoints, `total case ${i}`).toBeCloseTo(0, 9);
      for (const v of [sh.clvPoints, sa.clvPoints, to.clvPoints, tu.clvPoints]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("probability-space averaging: implied(avg) always sits inside [min, max] implied of the books (straddles included)", () => {
    const r = rng(909);
    for (let i = 0; i < 3000; i++) {
      const n = int(r, 1, 12);
      const prices = Array.from({ length: n }, () => pick(r, [1, -1]) * int(r, 100, 3000));
      const avg = averageAmericanPrices(prices);
      expect(avg, `case ${i}: [${prices.join(",")}]`).not.toBeNull();
      const implieds = prices.map(americanToImpliedProbability);
      const got = americanToImpliedProbability(avg!);
      // Integer-American rounding wiggles the implied by <0.006 anywhere on the scale.
      expect(got, `case ${i}: [${prices.join(",")}] → ${avg}`).toBeGreaterThanOrEqual(Math.min(...implieds) - 0.006);
      expect(got, `case ${i}`).toBeLessThanOrEqual(Math.max(...implieds) + 0.006);
      // And it can never be the discontinuity artifact: far outside the book range.
      const mean = implieds.reduce((s, x) => s + x, 0) / n;
      expect(Math.abs(got - mean), `case ${i}: drift from true mean`).toBeLessThan(0.006);
    }
  });

  it("summarizeClv: rates are in [0,1], counts partition the sample, average is the true mean", () => {
    const r = rng(1010);
    for (let i = 0; i < 1000; i++) {
      const n = int(r, 1, 50);
      const items = Array.from({ length: n }, () => {
        const value = (r() - 0.5) * 4;
        const verdict = value > 0.005 ? ("BEAT_CLOSE" as const) : value < -0.005 ? ("LOST_TO_CLOSE" as const) : ("MATCHED_CLOSE" as const);
        return { value, verdict };
      });
      const s = summarizeClv(items);
      expect(s.sampleSize).toBe(n);
      expect(s.beatCloseRate).toBeGreaterThanOrEqual(0);
      expect(s.beatCloseRate).toBeLessThanOrEqual(1);
      expect(s.lostToCloseRate).toBeGreaterThanOrEqual(0);
      // The two rates are each independently rounded to 4dp by the source, so
      // their sum can legitimately reach 1.0001 (display rounding, not a bug).
      expect(s.beatCloseRate + s.lostToCloseRate).toBeLessThanOrEqual(1.0001 + 1e-9);
      const trueMean = items.reduce((sum, x) => sum + x.value, 0) / n;
      expect(s.averageClv!).toBeCloseTo(trueMean, 3);
    }
  });
});

// ── C. slate commitment (production SHA-256) ────────────────────────────────

function randomSlate(r: () => number, minLeaves = 1, maxLeaves = 32): SlateLeaf[] {
  const n = int(r, minLeaves, maxLeaves);
  return Array.from({ length: n }, (_, i) => ({
    pickId: `pick-${i}-${int(r, 0, 1e9)}`,
    payload: `payload:${int(r, 0, 1e9)}:${int(r, 0, 1e9)}`,
  }));
}

describe("C. commitment tamper-evidence properties (production SHA-256)", () => {
  const COMMITTED_AT = "2026-07-11T10:00:00.000Z";

  it("determinism: rebuilding the same slate always yields the same root (300 slates)", () => {
    const r = rng(1111);
    for (let i = 0; i < 300; i++) {
      const leaves = randomSlate(r);
      const a = buildSlateCommitment("K", COMMITTED_AT, leaves, sha256);
      const b = buildSlateCommitment("K", COMMITTED_AT, leaves.map((l) => ({ ...l })), sha256);
      expect(a.root, `slate ${i}`).toBe(b.root);
      expect(a.count).toBe(leaves.length);
    }
  });

  it("tamper: mutating ANY single payload character changes the root (300 slates)", () => {
    const r = rng(1212);
    for (let i = 0; i < 300; i++) {
      const leaves = randomSlate(r);
      const root = buildSlateCommitment("K", COMMITTED_AT, leaves, sha256).root;
      const idx = int(r, 0, leaves.length - 1);
      const tampered = leaves.map((l, j) => (j === idx ? { ...l, payload: l.payload + "!" } : l));
      const tamperedRoot = buildSlateCommitment("K", COMMITTED_AT, tampered, sha256).root;
      expect(tamperedRoot, `slate ${i}, leaf ${idx}`).not.toBe(root);
    }
  });

  it("tamper: swapping two distinct leaves or dropping one changes the root (300 slates)", () => {
    const r = rng(1313);
    for (let i = 0; i < 300; i++) {
      const leaves = randomSlate(r, 2, 32);
      const root = buildSlateCommitment("K", COMMITTED_AT, leaves, sha256).root;

      const a = int(r, 0, leaves.length - 1);
      let b = int(r, 0, leaves.length - 1);
      if (a === b) b = (b + 1) % leaves.length;
      const swapped = [...leaves];
      [swapped[a], swapped[b]] = [swapped[b]!, swapped[a]!];
      expect(buildSlateCommitment("K", COMMITTED_AT, swapped, sha256).root, `swap slate ${i}`).not.toBe(root);

      const dropped = leaves.filter((_, j) => j !== a);
      expect(buildSlateCommitment("K", COMMITTED_AT, dropped, sha256).root, `drop slate ${i}`).not.toBe(root);
    }
  });

  it("KNOWN BOUNDARY (M-F12, documented): duplicating the final leaf of an odd slate can collide roots — the COUNT is the guard", () => {
    // Odd-node promotion duplicates the last hash internally, so [A,B,C] and
    // [A,B,C,C] can share a root. Verification is count-checked (the published
    // commitment pins count), which is exactly what makes this safe. Pin both
    // facts so a refactor cannot silently change either half of the contract.
    const leaves: SlateLeaf[] = [
      { pickId: "a", payload: "pa" },
      { pickId: "b", payload: "pb" },
      { pickId: "c", payload: "pc" },
    ];
    const base = buildSlateCommitment("K", COMMITTED_AT, leaves, sha256);
    const dup = buildSlateCommitment("K", COMMITTED_AT, [...leaves, leaves[2]!], sha256);
    expect(dup.root).toBe(base.root); // the documented collision…
    expect(dup.count).not.toBe(base.count); // …defeated by the pinned count.
  });

  it("inclusion proofs: EVERY index of EVERY slate folds to the root, and fails against a tampered root (150 slates)", () => {
    const r = rng(1414);
    for (let i = 0; i < 150; i++) {
      const leaves = randomSlate(r, 1, 24);
      const root = buildSlateCommitment("K", COMMITTED_AT, leaves, sha256).root;
      for (let idx = 0; idx < leaves.length; idx++) {
        const proof = provePickInSlate(leaves, idx, sha256);
        expect(verifyInclusion(proof, root, sha256), `slate ${i} idx ${idx}`).toBe(true);
        const wrongRoot = root.slice(0, -1) + (root.endsWith("0") ? "1" : "0");
        expect(verifyInclusion(proof, wrongRoot, sha256), `slate ${i} idx ${idx} vs foreign root`).toBe(false);
      }
    }
  });

  it("planner: never commits post-kickoff, never empty, never twice — commits carry the exact population (2,000 random plans)", () => {
    const r = rng(1515);
    for (let i = 0; i < 2000; i++) {
      const kickoffMs = Date.UTC(2026, 6, 11, int(r, 0, 23), int(r, 0, 59));
      const nowMs = kickoffMs + int(r, -36, 36) * 3600_000;
      const receipts = r() < 0.15 ? [] : randomSlate(r, 1, 8).map((l) => ({ pickId: l.pickId, payload: l.payload }));
      const alreadyCommitted = r() < 0.2;
      const plan = planSlateCommitment(
        {
          slateKey: "NBA:2026-07-11",
          receipts,
          earliestKickoff: new Date(kickoffMs).toISOString(),
          now: new Date(nowMs).toISOString(),
          alreadyCommitted,
        },
        sha256,
      );
      const ctx = `case ${i}: now-kick=${(nowMs - kickoffMs) / 3600_000}h n=${receipts.length} dup=${alreadyCommitted}`;
      if (plan.action === "COMMIT") {
        expect(nowMs, `${ctx} — committed post-kickoff!`).toBeLessThan(kickoffMs);
        expect(receipts.length, `${ctx} — committed empty!`).toBeGreaterThan(0);
        expect(alreadyCommitted, `${ctx} — committed twice!`).toBe(false);
        expect(plan.commitment.count).toBe(receipts.length);
      } else {
        // A skip must be justified by at least one hard reason.
        const justified = nowMs >= kickoffMs || receipts.length === 0 || alreadyCommitted;
        expect(justified, `${ctx} — unjustified SKIP`).toBe(true);
      }
    }
  });
});
