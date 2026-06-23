import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldBuild } from "./vercel-skip-build.mjs";

test("builds on a trunk branch regardless of changed files", () => {
  assert.equal(shouldBuild({ branch: "main", changedFiles: ["README.md"] }), true);
  assert.equal(shouldBuild({ branch: "claude/sweet-fermi-sk9gws", changedFiles: ["docs/x.md"] }), true);
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
