import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  diffCrons,
  renderMatrix,
  run,
  stripGeneratedTimestamp,
} from "./cron-matrix-from-vercel.mjs";

function writeVercel(dir, rel, crons) {
  const full = join(dir, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(
    full,
    JSON.stringify({ crons }, null, 2),
    "utf8",
  );
}

function fixtureRoot(sotCrons, otherCrons) {
  const root = mkdtempSync(join(tmpdir(), "cron-matrix-"));
  mkdirSync(join(root, "apps/web"), { recursive: true });
  mkdirSync(join(root, "docs/ops"), { recursive: true });
  writeVercel(root, "apps/web/vercel.json", sotCrons);
  writeVercel(root, "vercel.json", otherCrons);
  return root;
}

test("two-copy fixture with one extra cron reports DRIFT and names the extra path", () => {
  const sot = [
    { path: "/api/cron/settle-picks", schedule: "20 * * * *" },
    { path: "/api/cron/only-in-sot", schedule: "0 * * * *" },
  ];
  const other = [{ path: "/api/cron/settle-picks", schedule: "20 * * * *" }];
  const drift = diffCrons(sot, other);
  assert.equal(drift.length, 1);
  assert.equal(drift[0].path, "/api/cron/only-in-sot");
  assert.equal(drift[0].sot, "0 * * * *");
  assert.equal(drift[0].other, null);

  const md = renderMatrix({
    sotRel: "apps/web/vercel.json",
    otherRel: "vercel.json",
    sotCrons: sot,
    otherCrons: other,
    generatedAt: "2026-08-18T00:00:00.000Z",
  });
  assert.match(md, /\*\*DRIFT:\*\* copies disagree/);
  assert.match(md, /\/api\/cron\/only-in-sot/);
});

test("--check against a stale generated file exits 1", () => {
  const root = fixtureRoot(
    [{ path: "/api/cron/a", schedule: "0 * * * *" }],
    [{ path: "/api/cron/a", schedule: "0 * * * *" }],
  );
  writeFileSync(
    join(root, "docs/ops/CRON_MATRIX.generated.md"),
    "# stale leftover\n",
    "utf8",
  );
  const result = run(["--check"], { CRON_MATRIX_ROOT: root });
  assert.equal(result.code, 1);
  assert.match(result.stdout, /stale/);
});

test("--check against a freshly generated file exits 0", () => {
  const root = fixtureRoot(
    [
      { path: "/api/cron/a", schedule: "0 * * * *" },
      { path: "/api/cron/b", schedule: "*/15 * * * *" },
    ],
    [
      { path: "/api/cron/a", schedule: "0 * * * *" },
      { path: "/api/cron/b", schedule: "*/15 * * * *" },
    ],
  );
  const written = run([], { CRON_MATRIX_ROOT: root });
  assert.equal(written.code, 0);
  const checked = run(["--check"], { CRON_MATRIX_ROOT: root });
  assert.equal(checked.code, 0);
  const disk = readFileSync(join(root, "docs/ops/CRON_MATRIX.generated.md"), "utf8");
  assert.equal(stripGeneratedTimestamp(disk), stripGeneratedTimestamp(written.written));
});
