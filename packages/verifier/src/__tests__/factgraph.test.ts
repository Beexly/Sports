import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  parseFactorYaml,
  toFactorSpec,
  validatePreRegistration,
  renderIndexMarkdown,
  buildFactGraph,
  buildMintLog,
  writeMintLog,
} from "../factgraph";
import type { FactorSpec, HoldoutPickRow } from "../types";

function spec(over: Partial<FactorSpec>): FactorSpec {
  return {
    id: "A1",
    title: "t",
    hypothesis: "h",
    estimand: "e",
    unit: "u",
    data: ["d"],
    discover_era: "2017-2020",
    validate_era: "2021-2024",
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

describe("YAML subset parser", () => {
  it("parses flat keys, null, numbers, booleans, and inline arrays", () => {
    const parsed = parseFactorYaml(`
# comment
id: A1
title: "Birthday bump"
status: UNTESTED
number: null
n: 42
flag: true
data: [rosters, player_stats]
`);
    expect(parsed["id"]).toBe("A1");
    expect(parsed["title"]).toBe("Birthday bump");
    expect(parsed["status"]).toBe("UNTESTED");
    expect(parsed["number"]).toBeNull();
    expect(parsed["n"]).toBe(42);
    expect(parsed["flag"]).toBe(true);
    expect(parsed["data"]).toEqual(["rosters", "player_stats"]);
  });

  it("folds a > block into one line", () => {
    const parsed = parseFactorYaml(`
notes: >
  Components already measured
  separately on YARDS.
`);
    expect(parsed["notes"]).toBe("Components already measured separately on YARDS.");
  });

  it("toFactorSpec defaults unknown status to UNTESTED", () => {
    const s = toFactorSpec({ id: "A9", status: "WEIRD" }, "A9");
    expect(s.status).toBe("UNTESTED");
  });
});

describe("pre-registration validation", () => {
  it("requires a non-empty kill_line always — hand: empty string fails", () => {
    const check = validatePreRegistration(spec({ kill_line: "  " }));
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("kill_line");
  });

  it("allows UNTESTED with kill_line and nothing else", () => {
    const check = validatePreRegistration(spec({}));
    expect(check.ok).toBe(true);
    expect(check.errors).toEqual([]);
  });

  it("refuses CANDIDATE without run_sha / run_at / number / n", () => {
    const check = validatePreRegistration(spec({ status: "CANDIDATE" }));
    expect(check.ok).toBe(false);
    expect(check.errors.some((e) => e.includes("run_sha"))).toBe(true);
    expect(check.errors.some((e) => e.includes("run_at"))).toBe(true);
    expect(check.errors.some((e) => e.includes("number"))).toBe(true);
    expect(check.errors.some((e) => e.includes("n > 0"))).toBe(true);
  });

  it("accepts a fully scored CANDIDATE", () => {
    const check = validatePreRegistration(
      spec({
        status: "CANDIDATE",
        run_sha: "abc1234def",
        run_at: "2026-09-16T00:00:00.000Z",
        number: 0.012,
        n: 400,
        ci: [-0.01, 0.03],
      }),
    );
    expect(check.ok).toBe(true);
  });

  it("enforces kill_line commit before run commit when both dates are supplied", () => {
    const bad = validatePreRegistration(
      spec({
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
    expect(bad.ok).toBe(false);
    expect(bad.errors.join(" ")).toContain("predates");

    const good = validatePreRegistration(
      spec({
        status: "DEAD",
        run_sha: "deadbeef00",
        run_at: "2026-09-13T00:00:00.000Z",
        number: -0.02,
        n: 350,
      }),
      {
        killLineCommittedAt: "2026-09-12T00:00:00.000Z",
        runCommittedAt: "2026-09-13T00:00:00.000Z",
      },
    );
    expect(good.ok).toBe(true);
  });

  it("BLOCKED requires blocked_on", () => {
    const check = validatePreRegistration(spec({ status: "BLOCKED" }));
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("blocked_on");
  });

  it("id must look like A1 / P1", () => {
    expect(validatePreRegistration(spec({ id: "nope" })).ok).toBe(false);
    expect(validatePreRegistration(spec({ id: "P1" })).ok).toBe(true);
  });
});

describe("INDEX.md rendering", () => {
  it("carries id, status, number, CI, n, kill line, run date (§4.4)", () => {
    const md = renderIndexMarkdown([
      spec({
        id: "A1",
        hypothesis: "Birthday or former-team",
        status: "CANDIDATE",
        number: 0.011,
        ci: [-0.005, 0.027],
        n: 400,
        run_at: "2026-09-16T00:00:00.000Z",
      }),
      spec({ id: "A2", hypothesis: "Shrinkage weight", status: "DEAD", number: -0.02, n: 200 }),
    ]);
    expect(md).toContain("| A1 |");
    expect(md).toContain("CANDIDATE");
    expect(md).toContain("0.0110");
    expect(md).toContain("[-0.0050, 0.0270]");
    expect(md).toContain("| A2 |");
    expect(md).toContain("DEAD");
  });

  it("renders an honest empty row when there are no specs", () => {
    const md = renderIndexMarkdown([]);
    expect(md).toContain("no factor specs yet");
  });
});

describe("buildFactGraph", () => {
  it("writes INDEX.md when every spec passes; refuses when one fails", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "factors-"));
    try {
      writeFileSync(
        path.join(dir, "A1.yaml"),
        `id: A1
title: t
hypothesis: h
estimand: e
unit: u
data: [d]
discover_era: 2017-2020
validate_era: 2021-2024
kill_line: "effect <= 0"
script: scripts/factors/A1.mjs
status: UNTESTED
`,
        "utf8",
      );
      const ok = buildFactGraph(dir, { write: true });
      expect(ok.ok).toBe(true);
      expect(existsSync(path.join(dir, "INDEX.md"))).toBe(true);

      writeFileSync(
        path.join(dir, "A2.yaml"),
        `id: A2
hypothesis: h
kill_line: ""
status: UNTESTED
`,
        "utf8",
      );
      const bad = buildFactGraph(dir, { write: false });
      expect(bad.ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("mint log", () => {
  const rows: HoldoutPickRow[] = [
    {
      id: "held-1",
      sport: "NFL",
      market: "SPREAD",
      outcome: 0,
      marketFairProb: 0.55,
      modelProb: null,
      confidence: 70,
      modelVersion: "v5.2.7",
      generatedAt: "2026-09-09T00:00:00.000Z",
      isFounder: false,
      isPublished: true,
      isSettled: true,
      season: 2026,
    },
    {
      id: "pub-1",
      sport: "NFL",
      market: "MONEYLINE",
      outcome: 1,
      marketFairProb: 0.6,
      modelProb: 0.65,
      confidence: 65,
      modelVersion: "v5.2.7",
      generatedAt: "2026-09-09T00:00:00.000Z",
      isFounder: false,
      isPublished: true,
      isSettled: true,
      season: 2026,
    },
  ];

  it("marks a null-modelProb pick held and a scored pick published — hand 1/1", () => {
    const entries = buildMintLog(rows, { loggedAt: "2026-09-15T12:00:00.000Z" });
    expect(entries.length).toBe(2);
    expect(entries[0]!.decision).toBe("held");
    expect(entries[0]!.reason).toContain("no finite modelProb");
    expect(entries[1]!.decision).toBe("published");
    expect(entries[0]!.holdoutId).toBe("PICKS-H1");
  });

  it("writeMintLog lands a JSON file with entries[]", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "mint-"));
    try {
      const p = path.join(dir, "mint-log.json");
      writeMintLog(p, buildMintLog(rows));
      const doc = JSON.parse(readFileSync(p, "utf8"));
      expect(Array.isArray(doc.entries)).toBe(true);
      expect(doc.entries.length).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
