import { describe, it, expect, afterEach } from "vitest";
import { activeDfsSlate, isLiveDfs, registerDfsSlateProvider, ILLUSTRATIVE_DFS } from "./dfs";
import { DFS_SLATE, type DfsPlayer } from "../fantasy/dfs-slate";

const fake: DfsPlayer = { id: "z", name: "Z", pos: "QB", team: "KC", opp: "MIA", salary: 7000, proj: 20, floor: 12, ceiling: 30, own: 0.1 };

afterEach(() => registerDfsSlateProvider(null));

describe("DFS slate provider (founder-gated)", () => {
  it("defaults to the illustrative slate", () => {
    expect(activeDfsSlate({})).toBe(DFS_SLATE);
    expect(isLiveDfs({})).toBe(false);
    expect(ILLUSTRATIVE_DFS.slate()).toBe(DFS_SLATE);
  });

  it("requires a registered live provider AND the env flag to go live", () => {
    registerDfsSlateProvider({ name: "Acme DFS", live: true, slate: () => [fake] });
    expect(isLiveDfs({})).toBe(false);
    expect(activeDfsSlate({})).toBe(DFS_SLATE);
    const env = { DFS_PROVIDER: "acme" };
    expect(isLiveDfs(env)).toBe(true);
    expect(activeDfsSlate(env)).toEqual([fake]);
  });

  it("ignores a non-live provider even if keyed", () => {
    registerDfsSlateProvider({ name: "fake", live: false, slate: () => [fake] });
    expect(activeDfsSlate({ DFS_PROVIDER: "x" })).toBe(DFS_SLATE);
  });
});
