/**
 * C-364 Factor Foundry — pre-registration gate tests (node:test).
 *
 * DoD: index.mjs refuses status beyond UNTESTED/BLOCKED unless run_sha
 * postdates the kill_line commit. INDEX.md renders for the A1–A16 queue.
 *
 * Run: node --test scripts/factors/index.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FACTOR_STATUSES,
  FactorSpecSchema,
  buildIndex,
  loadSpecFromText,
  parseFactorYaml,
  renderIndexMarkdown,
  validatePreRegistration,
  validateRunOrder,
} from "./index.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FACTORS_DIR = path.join(REPO_ROOT, "docs", "factors");

function baseSpec(over = {}) {
  return {
    id: "A1",
    title: "t",
    hypothesis: "h",
    estimand: "e",
    unit: "u",
    data: ["d"],
    discover_era: "2017-2019",
    validate_era: "2020-2024",
    kill_line: "validate-era effect <= 0",
    mde_80pct_power: null,
    script: "scripts/factors/A1.mjs",
    status: "UNTESTED",
    number: null,
    ci: null,
    n: null,
    run_sha: null,
    run_at: null,
    blocked_on: null,
    notes: "",
    ...over,
  };
}

test("FactorSpecSchema accepts a pre-registered UNTESTED row", () => {
  const r = FactorSpecSchema.safeParse(baseSpec());
  assert.equal(r.success, true);
});

test("FactorSpecSchema rejects a missing kill_line", () => {
  const r = FactorSpecSchema.safeParse(baseSpec({ kill_line: "" }));
  assert.equal(r.success, false);
});

test("FactorSpecSchema rejects an unknown status", () => {
  const r = FactorSpecSchema.safeParse(baseSpec({ status: "MAYBE" }));
  assert.equal(r.success, false);
});

test("validatePreRegistration allows UNTESTED with kill_line only", () => {
  const check = validatePreRegistration(baseSpec());
  assert.equal(check.ok, true);
});

test("validatePreRegistration requires blocked_on for BLOCKED", () => {
  const check = validatePreRegistration(baseSpec({ status: "BLOCKED" }));
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /blocked_on/);
});

test("validatePreRegistration accepts BLOCKED with blocked_on", () => {
  const check = validatePreRegistration(
    baseSpec({ status: "BLOCKED", blocked_on: "nflverse.ftn_charting" }),
  );
  assert.equal(check.ok, true);
});

test("validatePreRegistration refuses CANDIDATE without run_sha / number / n", () => {
  const check = validatePreRegistration(baseSpec({ status: "CANDIDATE" }));
  assert.equal(check.ok, false);
  assert.match(check.errors.join(" "), /run_sha/);
  assert.match(check.errors.join(" "), /number/);
  assert.match(check.errors.join(" "), /n > 0/);
});

test("validateRunOrder refuses scored status when kill_line is uncommitted", () => {
  const order = validateRunOrder(
    baseSpec({
      status: "DEAD",
      run_sha: "deadbeef00",
      run_at: "2026-09-16T00:00:00.000Z",
      number: -0.02,
      n: 350,
    }),
    { killLineCommittedAt: null, runCommittedAt: "2026-09-16T00:00:00.000Z" },
  );
  assert.equal(order.ok, false);
  assert.match(order.errors.join(" "), /kill_line is not in any commit/);
});

test("validateRunOrder refuses when run_sha predates kill_line commit", () => {
  const order = validateRunOrder(
    baseSpec({
      status: "DEAD",
      run_sha: "deadbeef00",
      run_at: "2026-09-10T00:00:00.000Z",
      number: -0.02,
      n: 350,
    }),
    {
      killLineCommittedAt: "2026-09-12T00:00:00.000Z",
      runCommittedAt: "2026-09-10T00:00:00.000Z",
    },
  );
  assert.equal(order.ok, false);
  assert.match(order.errors.join(" "), /predates/);
});

test("validateRunOrder accepts when run_sha postdates kill_line commit", () => {
  const order = validateRunOrder(
    baseSpec({
      status: "CANDIDATE",
      run_sha: "abc1234def",
      run_at: "2026-09-13T00:00:00.000Z",
      number: 0.012,
      n: 400,
      ci: [-0.01, 0.03],
    }),
    {
      killLineCommittedAt: "2026-09-12T00:00:00.000Z",
      runCommittedAt: "2026-09-13T00:00:00.000Z",
    },
  );
  assert.equal(order.ok, true);
});

test("validateRunOrder is a no-op for UNTESTED and BLOCKED", () => {
  for (const status of ["UNTESTED", "BLOCKED"]) {
    const spec = baseSpec({ status, blocked_on: status === "BLOCKED" ? "d" : null });
    const order = validateRunOrder(spec, {
      killLineCommittedAt: null,
      runCommittedAt: null,
    });
    assert.equal(order.ok, true);
  }
});

test("buildIndex refuses CANDIDATE whose run_sha predates kill_line commit (git)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "factors-order-"));
  const gitEnv = (iso) => ({
    ...process.env,
    GIT_AUTHOR_DATE: iso,
    GIT_COMMITTER_DATE: iso,
  });
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "test"], { cwd: dir });
    execFileSync("git", ["config", "commit.gpgsign", "false"], { cwd: dir });

    // 1. "Run" commit first (no kill_line anywhere) — earlier timestamp.
    writeFileSync(path.join(dir, "run-artifact.txt"), "ran A1\n", "utf8");
    execFileSync("git", ["add", "run-artifact.txt"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "run artifact"], {
      cwd: dir,
      env: gitEnv("2026-09-01T12:00:00+00:00"),
    });
    const runSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();

    // 2. Pre-register kill_line AFTER the run — pre-registration violated.
    writeFileSync(
      path.join(dir, "A1.yaml"),
      `id: A1
title: t
hypothesis: h
estimand: e
unit: u
data: [d]
discover_era: 2017-2019
validate_era: 2020-2024
kill_line: "effect <= 0"
script: scripts/factors/A1.mjs
status: CANDIDATE
number: 0.01
ci: [0.0, 0.02]
n: 400
run_sha: ${runSha.slice(0, 10)}
run_at: 2026-09-01T00:00:00.000Z
`,
      "utf8",
    );
    execFileSync("git", ["add", "A1.yaml"], { cwd: dir });
    execFileSync("git", ["commit", "-q", "-m", "late kill_line"], {
      cwd: dir,
      env: gitEnv("2026-09-12T12:00:00+00:00"),
    });

    const result = buildIndex({ repoRoot: dir, factorsDir: dir, gitCheck: true });
    assert.equal(result.ok, false, "index must refuse a scored spec without pre-registration");
    assert.match(
      result.errors.join("\n"),
      /predates|pre-registration violated|kill_line is not in any commit/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildIndex accepts every committed docs/factors spec and renders INDEX.md", () => {
  // Reads the real, live docs/factors directory (not a fixture) — deliberately,
  // as a whole-repo smoke test that every committed spec still loads and
  // passes pre-registration. The spec count is NOT hardcoded: as of C-364 it
  // was 16 (A1-A16, all UNTESTED); by C-409 it is 28 (A1-A28, real results).
  // A prior version of this test hardcoded both "16" and "every status is
  // UNTESTED or BLOCKED" and broke the moment the very first real run (A1,
  // C-365) landed a DEAD status — asserting a transient state as if it were
  // permanent. Read the directory itself for ground truth instead.
  const expectedIds = readdirSync(FACTORS_DIR)
    .filter((f) => /^[A-Z][0-9]+\.yaml$/.test(f))
    .map((f) => f.replace(/\.yaml$/, ""));
  assert.ok(expectedIds.length > 0, "docs/factors must carry at least one spec");

  const result = buildIndex({ repoRoot: REPO_ROOT, factorsDir: FACTORS_DIR, gitCheck: true });
  assert.equal(
    result.ok,
    true,
    `index errors:\n${result.errors.join("\n")}`,
  );
  assert.equal(result.specs.length, expectedIds.length, "every docs/factors/*.yaml must load");
  for (const s of result.specs) {
    assert.ok(s.kill_line && s.kill_line.trim().length > 0, `${s.id} missing kill_line`);
    assert.ok(FACTOR_STATUSES.includes(s.status), `${s.id} has an invalid status: ${s.status}`);
  }
  const md = result.markdown;
  assert.match(md, /\| id \| hypothesis \| status \|/);
  for (const id of expectedIds) {
    assert.match(md, new RegExp(`\\| ${id} \\|`), `INDEX must render ${id}`);
  }
});

test("parseFactorYaml folds > blocks and handles inline arrays", () => {
  const parsed = parseFactorYaml(`
# comment
id: A9
status: UNTESTED
number: null
data: [nflverse.pbp, nflverse.games]
notes: >
  line one
  line two
`);
  assert.equal(parsed.id, "A9");
  assert.equal(parsed.number, null);
  assert.deepEqual(parsed.data, ["nflverse.pbp", "nflverse.games"]);
  assert.equal(parsed.notes, "line one line two");
});

test("loadSpecFromText surfaces zod issues with file-local messages", () => {
  const loaded = loadSpecFromText("id: A1\nstatus: UNTESTED\n", "A1");
  assert.equal(loaded.ok, false);
  assert.ok(loaded.errors.length > 0);
  assert.match(loaded.errors.join(" "), /kill_line|title|hypothesis/);
});

test("renderIndexMarkdown matches the §4.4 column set", () => {
  const md = renderIndexMarkdown([baseSpec({ id: "A1", hypothesis: "Birthday bump" })]);
  assert.match(md, /\| A1 \| Birthday bump \| UNTESTED \|/);
  assert.match(md, /\| id \| hypothesis \| status \| validate-era \| CI \| n \| kill line \| run \|/);
});
