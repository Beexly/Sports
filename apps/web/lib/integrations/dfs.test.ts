import { describe, it, expect, afterEach } from "vitest";
import {
  activeDfsSlate,
  isLiveDfs,
  registerDfsSlateProvider,
  resolveDfsSlateProvider,
  EMPTY_DFS,
  ILLUSTRATIVE_DFS,
} from "./dfs";
import { DFS_SLATE, type DfsPlayer } from "../fantasy/dfs-slate";

const fake: DfsPlayer = { id: "z", name: "Z", pos: "QB", team: "KC", opp: "MIA", salary: 7000, proj: 20, floor: 12, ceiling: 30, own: 0.1 };

afterEach(() => registerDfsSlateProvider(null));

describe("DFS slate provider (real-or-empty contract)", () => {
  it("defaults to an explicit EMPTY slate — never the fixture by default", () => {
    expect(resolveDfsSlateProvider({})).toBe(EMPTY_DFS);
    expect(activeDfsSlate({})).toEqual([]);
    expect(isLiveDfs({})).toBe(false);
  });

  it("the illustrative fixture survives only behind the explicit dev opt-in", () => {
    const env = { DFS_SAMPLE_SLATE: "1" };
    expect(resolveDfsSlateProvider(env)).toBe(ILLUSTRATIVE_DFS);
    expect(ILLUSTRATIVE_DFS.live).toBe(false);
    expect(ILLUSTRATIVE_DFS.slate()).toBe(DFS_SLATE);
    expect(activeDfsSlate(env)).toBe(DFS_SLATE);
    // …and the opt-in never masquerades as live.
    expect(isLiveDfs(env)).toBe(false);
  });

  it("requires a registered live provider AND the env flag to go live", () => {
    registerDfsSlateProvider({ name: "Acme DFS", live: true, slate: () => [fake] });
    expect(isLiveDfs({})).toBe(false);
    expect(activeDfsSlate({})).toEqual([]);
    const env = { DFS_PROVIDER: "acme" };
    expect(isLiveDfs(env)).toBe(true);
    expect(activeDfsSlate(env)).toEqual([fake]);
  });

  it("ignores a non-live provider even if keyed", () => {
    registerDfsSlateProvider({ name: "fake", live: false, slate: () => [fake] });
    expect(activeDfsSlate({ DFS_PROVIDER: "x" })).toEqual([]);
  });

  it("a registered live provider beats the sample opt-in", () => {
    registerDfsSlateProvider({ name: "Acme DFS", live: true, slate: () => [fake] });
    const env = { DFS_PROVIDER: "acme", DFS_SAMPLE_SLATE: "1" };
    expect(activeDfsSlate(env)).toEqual([fake]);
  });
});
