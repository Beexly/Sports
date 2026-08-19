/**
 * Agent-ledger guard tests.
 *
 * This file is also how the guard reaches CI. Wiring it as a new GitHub workflow
 * would mean editing `.github/**`, which is owner-gated; running it inside the
 * existing `Test, type-check, lint, Prisma` job needs no such change and gets the
 * same enforcement.
 *
 * Every rule is negative-tested. A guard nobody has watched fail is decoration —
 * it passes for whatever reason it happens to pass, and the first real violation
 * slips through. Each case below constructs the violation it claims to catch.
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error -- plain ESM .mjs guard, no type declarations by design
import { parseLedger, validate, checkLedgerFile } from "../../../scripts/ops/check-agent-ledger.mjs";

type Row = {
  id: string;
  title: string;
  owner: string;
  status: string;
  evidence: string;
  line: number;
};

/** Build a row with sane defaults so each test states only what it is testing. */
function row(over: Partial<Row> = {}): Row {
  return {
    id: "T-1",
    title: "a task",
    owner: "claude",
    status: "CLAIMED",
    evidence: "—",
    line: 1,
    ...over,
  };
}

/** Never touch git in unit tests — resolution is injected. */
const RESOLVES = { resolveSha: () => true };
const RESOLVES_NOT = { resolveSha: () => false };

describe("agent ledger — the real file", () => {
  it("is valid", () => {
    // Integration: parses the committed ledger and resolves its SHAs against
    // this actual repository.
    expect(checkLedgerFile()).toEqual([]);
  });

  it("parses into rows without picking up the header or separator", () => {
    const md = [
      "<!-- LEDGER:BEGIN -->",
      "| ID | Title | Owner | Status | Evidence |",
      "|---|---|---|---|---|",
      "| T-1 | a task | claude | OPEN | — |",
      "<!-- LEDGER:END -->",
    ].join("\n");
    const { rows, errors } = parseLedger(md);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "T-1", owner: "claude", status: "OPEN" });
  });
});

describe("agent ledger — duplicate work", () => {
  it("rejects two rows with the same title", () => {
    // The collision this whole mechanism exists for: copilot and hermes each
    // built the same signup-workflow feature without knowing about the other.
    const v = validate(
      [
        row({ id: "H-1", title: "Build signup workflow", owner: "hermes" }),
        row({ id: "C-9", title: "Build signup workflow", owner: "copilot", line: 2 }),
      ],
      RESOLVES,
    );
    expect(v.join("\n")).toMatch(/duplicate Title/i);
  });

  it("matches titles case- and whitespace-insensitively", () => {
    const v = validate(
      [
        row({ id: "H-1", title: "Build Signup   Workflow" }),
        row({ id: "C-9", title: "build signup workflow", line: 2 }),
      ],
      RESOLVES,
    );
    expect(v.join("\n")).toMatch(/duplicate Title/i);
  });

  it("rejects a duplicate ID", () => {
    const v = validate([row({ id: "H-1", title: "one" }), row({ id: "H-1", title: "two", line: 2 })], RESOLVES);
    expect(v.join("\n")).toMatch(/duplicate ID/i);
  });

  it("accepts two genuinely different rows", () => {
    expect(
      validate([row({ id: "H-1", title: "one" }), row({ id: "H-2", title: "two", line: 2 })], RESOLVES),
    ).toEqual([]);
  });
});

describe("agent ledger — DONE must be falsifiable", () => {
  it("rejects DONE with no evidence", () => {
    const v = validate([row({ status: "DONE", evidence: "—" })], RESOLVES);
    expect(v.join("\n")).toMatch(/DONE requires Evidence/);
  });

  it("rejects DONE whose evidence is only a claim of completion", () => {
    const v = validate([row({ status: "DONE", evidence: "all tests pass, work complete" })], RESOLVES);
    expect(v.join("\n")).toMatch(/no commit SHA/);
  });

  it("rejects DONE citing a commit that does not exist in the repo", () => {
    // The strongest check: a plausible-looking hash that resolves to nothing.
    const v = validate([row({ status: "DONE", evidence: "deadbeef" })], RESOLVES_NOT);
    expect(v.join("\n")).toMatch(/does not exist in this repository/);
  });

  it("accepts DONE citing a resolvable commit", () => {
    expect(validate([row({ status: "DONE", evidence: "b9ec799" })], RESOLVES)).toEqual([]);
  });

  it("accepts DONE citing a PR reference without resolving a SHA", () => {
    expect(validate([row({ status: "DONE", evidence: "#431" })], RESOLVES_NOT)).toEqual([]);
  });

  it("does not mistake a date stamp for a commit SHA", () => {
    // Regression: `20260818` is 8 valid hex characters. Reading it as a commit
    // produced a confident, wrong failure — the kind that teaches people to
    // ignore a guard. A SHA must contain at least one hex letter.
    const v = validate([row({ status: "UNPUSHED", evidence: "branch hermes-census-20260818, 1161 rows" })], RESOLVES_NOT);
    expect(v).toEqual([]);
  });
});

describe("agent ledger — UNPUSHED is not DONE", () => {
  it("accepts UNPUSHED with an unresolvable SHA, because that is the point", () => {
    // Hermes is told never to push; its SHAs cannot resolve from any other clone.
    // That is legitimate — but it must be visible, not recorded as DONE.
    expect(
      validate([row({ owner: "hermes", status: "UNPUSHED", evidence: "local branch, 62e32730" })], RESOLVES_NOT),
    ).toEqual([]);
  });

  it("still requires evidence naming where the work lives", () => {
    const v = validate([row({ owner: "hermes", status: "UNPUSHED", evidence: "—" })], RESOLVES);
    expect(v.join("\n")).toMatch(/UNPUSHED requires Evidence/);
  });

  it("requires an owner", () => {
    const v = validate([row({ owner: "—", status: "UNPUSHED", evidence: "local branch, 62e32730" })], RESOLVES);
    expect(v.join("\n")).toMatch(/UNPUSHED requires an Owner/);
  });
});

describe("agent ledger — ownership and vocabulary", () => {
  it("rejects a CLAIMED row with no owner", () => {
    const v = validate([row({ owner: "—", status: "CLAIMED" })], RESOLVES);
    expect(v.join("\n")).toMatch(/CLAIMED requires an Owner/);
  });

  it("rejects a BLOCKED row with no owner", () => {
    const v = validate([row({ owner: "—", status: "BLOCKED" })], RESOLVES);
    expect(v.join("\n")).toMatch(/BLOCKED requires an Owner/);
  });

  it("allows an OPEN row either owned (an assignment) or unowned", () => {
    expect(validate([row({ id: "A", title: "x", owner: "founder", status: "OPEN" })], RESOLVES)).toEqual([]);
    expect(validate([row({ id: "B", title: "y", owner: "—", status: "OPEN" })], RESOLVES)).toEqual([]);
  });

  it("rejects an unknown owner", () => {
    const v = validate([row({ owner: "gemini" })], RESOLVES);
    expect(v.join("\n")).toMatch(/unknown Owner/);
  });

  it("rejects an unknown status", () => {
    const v = validate([row({ status: "IN_PROGRESS" })], RESOLVES);
    expect(v.join("\n")).toMatch(/unknown Status/);
  });

  it("requires CANCELLED to carry a reason so it is not relitigated", () => {
    const v = validate([row({ status: "CANCELLED", evidence: "—" })], RESOLVES);
    expect(v.join("\n")).toMatch(/CANCELLED requires a reason/);
    expect(validate([row({ status: "CANCELLED", evidence: "fabricated feature" })], RESOLVES)).toEqual([]);
  });
});

describe("agent ledger — malformed input fails loudly", () => {
  it("reports a row with the wrong column count instead of silently dropping it", () => {
    const md = [
      "<!-- LEDGER:BEGIN -->",
      "| ID | Title | Owner | Status | Evidence |",
      "|---|---|---|---|---|",
      "| T-1 | missing cells |",
      "<!-- LEDGER:END -->",
    ].join("\n");
    const { errors } = parseLedger(md);
    expect(errors.join("\n")).toMatch(/expected 5 columns/);
  });

  it("reports missing ledger markers", () => {
    const { errors } = parseLedger("# no table here");
    expect(errors.join("\n")).toMatch(/markers/);
  });
});
