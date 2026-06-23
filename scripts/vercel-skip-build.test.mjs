import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldBuild, resolveTrunks, isMergeCommit } from "./vercel-skip-build.mjs";

test("builds on a trunk branch regardless of changed files", () => {
  assert.equal(shouldBuild({ branch: "main", changedFiles: ["README.md"] }), true);
  assert.equal(
    shouldBuild({ branch: "claude/x", changedFiles: ["docs/x.md"], trunkBranches: ["main", "claude/x"] }),
    true,
  );
});

test("resolveTrunks is env-driven: main always, active trunk from ACTIVE_TRUNK", () => {
  assert.deepEqual(resolveTrunks({}), ["main"]);
  assert.deepEqual(resolveTrunks({ ACTIVE_TRUNK: "claude/foo" }), ["main", "claude/foo"]);
  assert.deepEqual(resolveTrunks({ ACTIVE_TRUNK: "a, b ,c" }), ["main", "a", "b", "c"]);
});

test("isMergeCommit detects 2+ parents from rev-list output", () => {
  assert.equal(isMergeCommit("sha p1"), false); // normal commit
  assert.equal(isMergeCommit("sha p1 p2"), true); // merge
  assert.equal(isMergeCommit("sha"), false); // root commit
  assert.equal(isMergeCommit(null), false);
  assert.equal(isMergeCommit(""), false);
});

test("builds when a deploy-relevant path changed (non-trunk branch)", () => {
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: ["apps/web/app/page.tsx"] }), true);
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: ["packages/db/prisma/schema.prisma"] }), true);
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: ["workers/data-refresh/src/index.ts"] }), true);
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: ["vercel.json"] }), true);
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: ["package-lock.json"] }), true);
});

test("skips docs-only / unrelated changes on a non-trunk branch", () => {
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: ["docs/a.md", "README.md"] }), false);
  assert.equal(shouldBuild({ branch: "claude/other-agent", changedFiles: ["docs/a.md"] }), false);
  assert.equal(shouldBuild({ branch: "feature/x", changedFiles: [] }), false);
});

test("custom trunk list is honored", () => {
  assert.equal(shouldBuild({ branch: "release", changedFiles: ["docs/a.md"], trunkBranches: ["release"] }), true);
});
