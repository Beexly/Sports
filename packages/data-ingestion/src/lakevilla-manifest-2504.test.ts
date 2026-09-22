import { describe, expect, it } from "vitest";
import {
  abortManifest,
  beginCommit,
  commitManifest,
  currentCommitted,
  killMidWriteTest,
  orphanSweep,
  stageTable,
  type ManifestTable,
} from "./lakevilla-manifest-2504.js";

const t = (table: string): ManifestTable => ({ table, path: `/lake/${table}`, checksum: "abc", rowCount: 10 });

describe("lakevilla manifest", () => {
  it("commits atomically: readers see all tables at once", () => {
    let m = beginCommit("m1", 1000);
    m = stageTable(m, t("games"));
    m = stageTable(m, t("pbp"));
    expect(currentCommitted({ manifests: [m] })).toBeUndefined();
    m = commitManifest(m, 2000);
    const visible = currentCommitted({ manifests: [m] });
    expect(visible?.tables.map((x) => x.table)).toEqual(["games", "pbp"]);
  });

  it("kill-mid-write passes 10/10 with no partial commit visible", () => {
    const sets = [[t("a"), t("b"), t("c")], [t("d")]];
    const res = killMidWriteTest(sets, 10);
    expect(res.passed).toBe(10);
    expect(res.clean).toBe(true);
  });

  it("orphan sweep flags stale staged manifests only", () => {
    const old = beginCommit("old", 0);
    const fresh = beginCommit("fresh", 9500);
    let done = beginCommit("done", 0);
    done = stageTable(done, t("x"));
    done = commitManifest(done, 100);
    const res = orphanSweep({ manifests: [old, fresh, done] }, 10000, 5000);
    expect(res.orphans.map((m) => m.id)).toEqual(["old"]);
    expect(res.pending.map((m) => m.id)).toEqual(["fresh"]);
  });

  it("aborted manifests never become visible", () => {
    let m = beginCommit("m2", 0);
    m = stageTable(m, t("z"));
    m = abortManifest(m);
    expect(m.state).toBe("aborted");
    expect(currentCommitted({ manifests: [m] })).toBeUndefined();
  });

  it("rejects illegal transitions", () => {
    let m = beginCommit("m3", 0);
    expect(() => commitManifest(m)).toThrow(); // empty
    m = stageTable(m, t("q"));
    expect(() => stageTable(m, t("q"))).toThrow(); // duplicate
    m = commitManifest(m, 1);
    expect(() => stageTable(m, t("w"))).toThrow(); // committed
    expect(() => abortManifest(m)).toThrow();
  });

  it("handles empty logs and empty table sets", () => {
    expect(currentCommitted({ manifests: [] })).toBeUndefined();
    expect(orphanSweep({ manifests: [] }, 0, 1)).toEqual({ orphans: [], pending: [] });
    const res = killMidWriteTest([], 5);
    expect(res.clean).toBe(true);
  });
});
