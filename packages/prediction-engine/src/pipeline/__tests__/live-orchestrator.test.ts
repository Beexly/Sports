import { describe, it, expect } from "vitest";
import { LiveOrchestrator } from "../live-orchestrator.js";
import { TeamStrengthFilter } from "../../team-strength-filter.js";

function makeOrchestrator(seed = 1): LiveOrchestrator {
  return new LiveOrchestrator({
    filter: { nTeams: 3, seed, nParticles: 200 },
  });
}

describe("LiveOrchestrator construction around a restored filter", () => {
  it("accepts an already-hydrated TeamStrengthFilter instance, not just options", async () => {
    const warm = new TeamStrengthFilter({ nTeams: 4, seed: 5, nParticles: 200 });
    for (let i = 0; i < 20; i++) {
      warm.predictStates();
      warm.update(0, 1, 1); // team 0 always wins
    }
    const warmProb = warm.predictHomeWinProbability(0, 1);

    const orch = new LiveOrchestrator({ filter: warm });
    expect(orch.diagnostics().observations).toBe(20);

    const obs = await orch.evaluateGame({
      gameId: "g-restored",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.5,
      decimalOddsHome: 2.0,
    });
    expect(obs.particleFilterProb).toBe(warmProb);
    expect(obs.particleFilterProb).toBeGreaterThan(0.5);
  });

  it("exportFilter() returns the SAME instance construction was given (identity, not a copy)", () => {
    const warm = new TeamStrengthFilter({ nTeams: 3, seed: 9, nParticles: 100 });
    const orch = new LiveOrchestrator({ filter: warm });
    expect(orch.exportFilter()).toBe(warm);
  });

  it("exportFilter() reflects state mutated by settleGame — the persistence write path", () => {
    const orch = makeOrchestrator(2);
    orch.settleGame("g1", 0, 1, 1);
    expect(orch.exportFilter().diagnostics().observations).toBe(1);
  });
});

describe("LiveOrchestrator", () => {
  it("evaluates a game with no odds events and no remote endpoints (fully cold-start)", async () => {
    const orch = makeOrchestrator();
    const obs = await orch.evaluateGame({
      gameId: "g1",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.55,
      decimalOddsHome: 1.9,
    });
    expect(obs.status).toBe("shadow");
    expect(obs.priced).toBe(false);
    expect(obs.blendedProb).toBeGreaterThanOrEqual(0);
    expect(obs.blendedProb).toBeLessThanOrEqual(1);
    expect(obs.remoteProbabilities.succeeded).toHaveLength(0);
    expect(obs.remoteProbabilities.failed).toHaveLength(0);
    expect(obs.steamSignal.side).toBeNull();
    // Cold start: zero settled observations anywhere in the filter yet.
    expect(obs.kelly.effectiveSampleSize).toBe(0);
    expect(obs.kelly.robustFraction).toBe(0);
  });

  it("processes a sequence of settled games and the filter's posterior shifts for the winning team", async () => {
    const orch = makeOrchestrator(7);
    const before = orch.diagnostics();
    expect(before.observations).toBe(0);

    for (let i = 0; i < 10; i++) {
      await orch.evaluateGame({
        gameId: `game-${i}`,
        homeTeamIdx: 0,
        awayTeamIdx: 1,
        marketHomeProb: 0.5,
        decimalOddsHome: 2.0,
      });
      // Team 0 (home) wins every single game — a strong, unambiguous signal.
      orch.settleGame(`game-${i}`, 0, 1, 1);
    }

    const after = orch.diagnostics();
    expect(after.observations).toBe(10);

    const finalProb = await orch.evaluateGame({
      gameId: "final-check",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.5,
      decimalOddsHome: 2.0,
    });
    // After 10 consecutive home wins the filter should now favor team 0 over
    // a coin flip by a meaningful margin.
    expect(finalProb.particleFilterProb).toBeGreaterThan(0.5);
  });

  it("the forecast-skill E-process accumulates evidence as settled picks are folded", async () => {
    const orch = makeOrchestrator(3);
    // `initForecastSkillFold` returns a valid empty state at construction (n=0), not
    // null — null is reserved for REFUSED options (see forecast-skill-eprocess.ts).
    expect(orch.currentForecastSkill()?.n).toBe(0);

    for (let i = 0; i < 40; i++) {
      // Our probability (via the cold particle filter, ~0.5-ish) vs a market that is
      // confidently and CORRECTLY wrong every time — an adversarial market lets a
      // short synthetic run still move logM, unlike a market that already tracks
      // the true probability.
      await orch.evaluateGame({
        gameId: `skill-${i}`,
        homeTeamIdx: 0,
        awayTeamIdx: 1,
        marketHomeProb: 0.5,
        decimalOddsHome: 2.0,
      });
      orch.settleGame(`skill-${i}`, 0, 1, 1);
    }

    const skill = orch.currentForecastSkill();
    expect(skill).not.toBeNull();
    expect(skill!.n).toBe(40);
  });

  it("settleGame is a no-op for forecast-skill when the gameId was never evaluated", () => {
    const orch = makeOrchestrator(9);
    const result = orch.settleGame("never-evaluated", 0, 1, 1);
    expect(result.forecastSkill).toBeNull();
    // The filter update itself still happens — that does not depend on evaluateGame.
    expect(result.filterUpdate.homeIdx).toBe(0);
  });

  it("does not double-fold the same gameId settled twice", async () => {
    const orch = makeOrchestrator(4);
    await orch.evaluateGame({
      gameId: "dup",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.5,
      decimalOddsHome: 2.0,
    });
    const first = orch.settleGame("dup", 0, 1, 1);
    const second = orch.settleGame("dup", 0, 1, 1);
    expect(first.forecastSkill).not.toBeNull();
    expect(second.forecastSkill).toBeNull();
  });

  it("advanceTimeStep does not throw and is independent of per-game evaluation", () => {
    const orch = makeOrchestrator(2);
    expect(() => orch.advanceTimeStep()).not.toThrow();
    expect(() => orch.advanceTimeStep([{ team: 0, delta: 0.1 }])).not.toThrow();
  });

  it("a steaming home side nudges blendedProb upward relative to no steam", async () => {
    // The module's default prior sets priorAlpha=0 ("no evidence of self-excitation
    // yet"), so with the bare default this detector can never report steam by
    // construction (intensity = mu + 0·anything = mu, always). Exercising the
    // mechanism requires a caller-supplied priorAlpha, exactly as live-orchestrator.ts
    // documents.
    const hawkesOptions = { priorAlpha: 0.05 };
    const noSteam = makeOrchestrator(5);
    const withSteam = new LiveOrchestrator({ filter: { nTeams: 3, seed: 5, nParticles: 200 }, hawkesOptions });

    const flat = await noSteam.evaluateGame({
      gameId: "flat",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.5,
      decimalOddsHome: 2.0,
    });

    // A burst of home-side line moves in a short window — well past the
    // default 3x-mu steam threshold.
    const oddsEvents = Array.from({ length: 8 }, (_, i) => ({
      time: i * 0.01,
      impliedProbDelta: 0.01,
      side: "home" as const,
    }));
    const steamed = await withSteam.evaluateGame({
      gameId: "steamed",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.5,
      decimalOddsHome: 2.0,
      oddsEvents,
      evaluatedAt: 0.08,
    });

    expect(steamed.steamSignal.side).toBe("home");
    expect(steamed.blendedProb).toBeGreaterThan(flat.blendedProb);
  });

  it("with the bare default prior (priorAlpha=0), even a sharp burst never reports steam", async () => {
    const orch = makeOrchestrator(5);
    const oddsEvents = Array.from({ length: 8 }, (_, i) => ({
      time: i * 0.01,
      impliedProbDelta: 0.01,
      side: "home" as const,
    }));
    const obs = await orch.evaluateGame({
      gameId: "burst-no-alpha",
      homeTeamIdx: 0,
      awayTeamIdx: 1,
      marketHomeProb: 0.5,
      decimalOddsHome: 2.0,
      oddsEvents,
      evaluatedAt: 0.08,
    });
    expect(obs.steamSignal.side).toBeNull();
  });
});
