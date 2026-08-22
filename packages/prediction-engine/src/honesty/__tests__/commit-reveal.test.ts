import { describe, expect, it } from "vitest";
import {
  commitPick,
  isPublicPicksEnabled,
  publicCommitPick,
  revealPick,
  type PickCommitmentBody,
} from "../commit-reveal.js";

const body: PickCommitmentBody = {
  pickId: "p1",
  sport: "NFL",
  market: "SPREAD",
  selection: "KC -3",
  modelVersion: "v5.2.2",
  committedAt: "2026-08-21T18:00:00.000Z",
  line: "-3",
  edgeIndex: "12",
};

describe("commit-reveal — first-party ledger (PUBLIC_PICKS dark)", () => {
  it("commit is deterministic for a given salt and reveals true", () => {
    const a = commitPick(body, "salt-a");
    const b = commitPick(body, "salt-a");
    expect(a.commitment).toBe(b.commitment);
    expect(revealPick(a.commitment, body, "salt-a")).toBe(true);
  });

  it("a different salt or mutated selection fails reveal", () => {
    const c = commitPick(body, "salt-a");
    expect(revealPick(c.commitment, body, "salt-b")).toBe(false);
    expect(revealPick(c.commitment, { ...body, selection: "BUF +3" }, "salt-a")).toBe(false);
  });

  it("refuses to invent a salt", () => {
    expect(() => commitPick(body, "")).toThrow(/salt required/);
  });

  it("publicCommitPick is null while PUBLIC_PICKS_ENABLED is off (default)", () => {
    expect(isPublicPicksEnabled({})).toBe(false);
    expect(publicCommitPick(body, "salt-a", {})).toBeNull();
    expect(publicCommitPick(body, "salt-a", { PUBLIC_PICKS_ENABLED: "false" })).toBeNull();
  });

  it("publicCommitPick returns a commitment only when the flag is exactly true", () => {
    const published = publicCommitPick(body, "salt-a", { PUBLIC_PICKS_ENABLED: "true" });
    expect(published).not.toBeNull();
    expect(revealPick(published!.commitment, body, "salt-a")).toBe(true);
  });
});
