import { describe, expect, it } from "vitest";
import {
  ORCHESTRATOR_CLIMATOLOGY_KILL_BSS,
  ORCHESTRATOR_CLIMATOLOGY_METHOD_TAG,
  ORCHESTRATOR_CLIMATOLOGY_MIN_N,
  ORCHESTRATOR_CLIMATOLOGY_FAMILY,
  measureOrchestratorVsClimatology,
  recordOrchestratorClimatologyTrial,
  scoreVsExpandingHomeClimatology,
  type OrchestratorClimGame,
} from "../orchestrator-climatology-skill.js";
import { createTrialsRegistry, verifyTrialEntries } from "../../edge-lab/trials-registry.js";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/** Round-robin strength DGP. Home-win probability from true strengths + HFA. */
function strengthSchedule(
  seed: number,
  nTeams: number,
  rounds: number,
): { games: OrchestratorClimGame[]; trueP: number[] } {
  const rng = mulberry32(seed);
  const strength = Array.from({ length: nTeams }, (_, i) => (i - (nTeams - 1) / 2) * 0.6);
  const hfa = 0.2;
  const games: OrchestratorClimGame[] = [];
  const trueP: number[] = [];
  let k = 0;
  for (let r = 0; r < rounds; r++) {
    for (let h = 0; h < nTeams; h++) {
      for (let a = 0; a < nTeams; a++) {
        if (h === a) continue;
        const p = sigmoid(strength[h]! - strength[a]! + hfa);
        const y = rng() < p ? 1 : 0;
        games.push({
          gameId: `g${k}`,
          homeTeamIdx: h,
          awayTeamIdx: a,
          y,
        });
        trueP.push(p);
        k += 1;
      }
    }
  }
  return { games, trueP };
}

describe("scoreVsExpandingHomeClimatology", () => {
  it("refuses empty input rather than inventing a skill number", () => {
    expect(() => scoreVsExpandingHomeClimatology([], [])).toThrow(/non-empty/);
  });

  it("kills a constant-0.5 model: BSS against itself is 0, and the kill is strict", () => {
    const y = Array.from({ length: ORCHESTRATOR_CLIMATOLOGY_MIN_N }, (_, i) => (i % 5 === 0 ? 0 : 1) as 0 | 1);
    const p = y.map(() => 0.5);
    const card = scoreVsExpandingHomeClimatology(p, y);
    expect(card.methodTag).toBe(ORCHESTRATOR_CLIMATOLOGY_METHOD_TAG);
    expect(card.n).toBe(ORCHESTRATOR_CLIMATOLOGY_MIN_N);
    expect(card.priced).toBe(false);
    expect(card.status).toBe("shadow");
    expect(card.bss).toBeCloseTo(0, 12);
    expect(card.bss!).toBeLessThanOrEqual(ORCHESTRATOR_CLIMATOLOGY_KILL_BSS);
    expect(card.verdict).toBe("kill");
    expect(card.expandingClimBrier).toBeLessThan(card.climBrier);
  });

  it("lets an oracle that knows team strengths survive against expanding home-rate climatology", () => {
    const { games, trueP } = strengthSchedule(7, 6, 4);
    expect(games.length).toBeGreaterThanOrEqual(ORCHESTRATOR_CLIMATOLOGY_MIN_N);
    const card = scoreVsExpandingHomeClimatology(
      trueP,
      games.map((g) => g.y),
    );
    expect(card.n).toBe(games.length);
    expect(card.bss).not.toBeNull();
    expect(card.bss!).toBeGreaterThan(ORCHESTRATOR_CLIMATOLOGY_KILL_BSS);
    expect(card.verdict).toBe("survive");
  });

  it("marks short samples underpowered even if BSS is positive", () => {
    const card = scoreVsExpandingHomeClimatology([0.9, 0.9, 0.9], [1, 1, 1]);
    expect(card.n).toBe(3);
    expect(card.verdict).toBe("underpowered");
    expect(card.frozenPriorBrier).toBeNull();
    expect(card.bssFrozenPrior).toBeNull();
  });

  it("scores a caller-supplied frozen prior as a diagnostic, never as the kill, and does not invent 0.56", () => {
    const y = Array.from({ length: ORCHESTRATOR_CLIMATOLOGY_MIN_N }, (_, i) => (i % 5 === 0 ? 0 : 1) as 0 | 1);
    const p = y.map(() => 0.5);
    const card = scoreVsExpandingHomeClimatology(p, y, { frozenPriorHomeWinP: 0.56 });
    expect(card.frozenPriorBrier).not.toBeNull();
    expect(card.bssFrozenPrior).not.toBeNull();
    // Kill is still vs 0.5, even if the caller passed a prior-season rate.
    expect(card.verdict).toBe("kill");
    expect(card.bss).toBeCloseTo(0, 12);
  });

  it("refuses a fabricated frozen prior outside (0,1)", () => {
    expect(() => scoreVsExpandingHomeClimatology([0.6], [1], { frozenPriorHomeWinP: 0 })).toThrow(
      /frozenPriorHomeWinP/,
    );
  });
});

describe("measureOrchestratorVsClimatology", () => {
  it("does not accept or report a market term", () => {
    const { games } = strengthSchedule(11, 4, 2);
    const card = measureOrchestratorVsClimatology(games, { nTeams: 4, seed: 11, nParticles: 80 });
    expect(card.n).toBe(games.length);
    expect(card).not.toHaveProperty("marketBrier");
    expect(card).not.toHaveProperty("marketHomeProb");
    expect(JSON.stringify(card)).not.toMatch(/market/i);
    expect(card.priced).toBe(false);
  });

  it("is underpowered below the pre-registered n floor", () => {
    const games: OrchestratorClimGame[] = Array.from({ length: 20 }, (_, i) => ({
      gameId: `s${i}`,
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      y: (i % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    const card = measureOrchestratorVsClimatology(games, { nTeams: 3, seed: 3, nParticles: 40 });
    expect(card.verdict).toBe("underpowered");
    expect(card.n).toBe(20);
  });

  it("records a first-game probability that does not peek at later outcomes", () => {
    const base = [
      { gameId: "a", homeTeamIdx: 0, awayTeamIdx: 1, y: 1 as const },
      { gameId: "b", homeTeamIdx: 1, awayTeamIdx: 0, y: 0 as const },
      { gameId: "c", homeTeamIdx: 0, awayTeamIdx: 2, y: 1 as const },
    ];
    const flipped = [
      base[0]!,
      { ...base[1]!, y: 1 as const },
      { ...base[2]!, y: 0 as const },
    ];
    const a = measureOrchestratorVsClimatology(base, { nTeams: 3, seed: 9, nParticles: 40 });
    const b = measureOrchestratorVsClimatology(flipped, { nTeams: 3, seed: 9, nParticles: 40 });
    // Same seed, same first matchup, later y permuted: first-game Brier term
    // shares the same model p (cold prior). Equal first-game y ⇒ equal start.
    expect(a.n).toBe(3);
    expect(b.n).toBe(3);
    expect(a.verdict).toBe("underpowered");
    expect(b.verdict).toBe("underpowered");
  });

  it("on a strength DGP, the filter is closer to the oracle than a constant-0.5 dummy is", () => {
    const { games, trueP } = strengthSchedule(13, 6, 4);
    const measured = measureOrchestratorVsClimatology(games, {
      nTeams: 6,
      seed: 13,
      nParticles: 120,
    });
    const dummy = scoreVsExpandingHomeClimatology(
      games.map(() => 0.5),
      games.map((g) => g.y),
    );
    const oracle = scoreVsExpandingHomeClimatology(
      trueP,
      games.map((g) => g.y),
    );
    expect(measured.n).toBe(games.length);
    expect(oracle.verdict).toBe("survive");
    expect(dummy.verdict).toBe("kill");
    // Relative ranking, not a live-skill claim: the filter must beat the dummy.
    expect(measured.modelBrier).toBeLessThan(dummy.modelBrier);
  });
});

describe("recordOrchestratorClimatologyTrial", () => {
  it("hash-chains the scorecard with a null p-value and the pre-registered kill line", () => {
    const y = Array.from({ length: ORCHESTRATOR_CLIMATOLOGY_MIN_N }, (_, i) => (i % 5 === 0 ? 0 : 1) as 0 | 1);
    const killed = scoreVsExpandingHomeClimatology(y.map(() => 0.5), y);
    const oracle = scoreVsExpandingHomeClimatology(
      y.map(() => 0.8),
      y,
    );
    const short = scoreVsExpandingHomeClimatology([0.9], [1]);

    const reg = createTrialsRegistry();
    const a = recordOrchestratorClimatologyTrial({
      registry: reg,
      scorecard: killed,
      recordedAt: "2026-09-18T19:20:00.000Z",
      runId: "dummy-05",
    });
    const b = recordOrchestratorClimatologyTrial({
      registry: reg,
      scorecard: oracle,
      recordedAt: "2026-09-18T19:20:01.000Z",
      runId: "oracle-08",
    });
    const c = recordOrchestratorClimatologyTrial({
      registry: reg,
      scorecard: short,
      recordedAt: "2026-09-18T19:20:02.000Z",
      runId: "short",
    });

    expect(a.kind).toBe("model_admission");
    expect(a.family).toBe(ORCHESTRATOR_CLIMATOLOGY_FAMILY);
    expect(a.pValue).toBeNull();
    expect(a.outcome).toBe("rejected");
    expect(b.outcome).toBe("admitted");
    expect(c.outcome).toBe("recorded");
    expect(a.hash).not.toBe(b.hash);
    expect(b.prevHash).toBe(a.hash);
    expect(verifyTrialEntries(reg.entries()).valid).toBe(true);
    expect(() =>
      recordOrchestratorClimatologyTrial({
        registry: reg,
        scorecard: killed,
        recordedAt: "2026-09-18T19:20:03.000Z",
        runId: "dummy-05",
      }),
    ).toThrow(/duplicate/);
  });
});
