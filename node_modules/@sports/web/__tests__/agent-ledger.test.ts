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

/**
 * Never touch git or the network in unit tests — resolution AND the shallow
 * fetch-by-sha fallback are injected, and `shallow` is pinned.
 *
 * Pinning matters: left to default, the guard probes the host repo (and, when
 * shallow, fetches from its origin), so these assertions would flip depending on
 * the environment running them. A test whose verdict depends on its environment
 * is worse than no test. RESOLVES_NOT therefore means "full history, and the
 * commit genuinely is not there" — the case where a missing SHA is real
 * evidence. `fetchSha: null` models a repo with no origin remote.
 */
const RESOLVES = { resolveSha: () => true, shallow: false, fetchSha: null };
const RESOLVES_NOT = { resolveSha: () => false, shallow: false, fetchSha: null };

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
    expect(v.join("\n")).toMatch(/none resolve to a commit/);
  });

  it("accepts DONE citing a resolvable commit", () => {
    expect(validate([row({ status: "DONE", evidence: "b9ec799" })], RESOLVES)).toEqual([]);
  });

  it("accepts DONE citing a PR reference without resolving a SHA", () => {
    expect(validate([row({ status: "DONE", evidence: "#431" })], RESOLVES_NOT)).toEqual([]);
  });

  it("accepts an all-digit SHA that resolves — spelling is not the judge, git is", () => {
    // Regression, round two. The first date-stamp fix required a hex letter in
    // the SHA — and then commit 9627379, a REAL seven-digit SHA, was rejected
    // within hours (about 1 in 27 abbreviated SHAs contain no letter). The guard
    // now resolves every hex-run candidate and accepts the row if ANY names a
    // real commit.
    const isReal = { resolveSha: (s: string) => s === "9627379", shallow: false, fetchSha: null };
    expect(validate([row({ status: "DONE", evidence: "9627379" })], isReal)).toEqual([]);
  });

  it("a date stamp next to a real SHA neither fails nor shadows it", () => {
    // First-match parsing would have picked 20260818, failed to resolve it, and
    // failed the row despite the genuine SHA sitting right there.
    const isReal = { resolveSha: (s: string) => s === "abc1234", shallow: false, fetchSha: null };
    expect(
      validate([row({ status: "DONE", evidence: "released 20260818, commit abc1234" })], isReal),
    ).toEqual([]);
  });

  it("a date stamp ALONE is still not DONE evidence on a full clone", () => {
    // A date does not resolve, so it is not evidence — the original complaint
    // stands, it just gets adjudicated by git instead of by spelling.
    const v = validate([row({ status: "DONE", evidence: "shipped 20260818" })], RESOLVES_NOT);
    expect(v.join("\n")).toMatch(/none resolve/);
  });

  it("UNPUSHED prose with a date stamp stays clean (no resolution requirement)", () => {
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

describe("agent ledger — shallow clones fetch by SHA instead of shrugging", () => {
  // CI's `test` job uses a bare actions/checkout@v4, which defaults to
  // fetch-depth: 1 — exactly one commit. A local miss there proves nothing, but
  // origin can still adjudicate: GitHub serves fetch-by-sha, so the guard pulls
  // the cited commit (`git fetch --depth=1 origin <sha>`) and retries. Routing
  // every shallow miss to "unverified" instead — the old behavior — made the
  // SHA check DEAD in the only environment that enforces the ledger: a
  // fabricated DONE SHA sailed through CI. .github/** is owner-gated, so the
  // guard adapts rather than the workflow.
  const doneRow = [row({ id: "C-1", title: "shipped thing", status: "DONE", evidence: "657a7f1" })];

  it("FAILS a fabricated SHA in a shallow clone when origin cannot serve it", () => {
    // The CI reproduction, encoded forever: shallow checkout, SHA does not
    // resolve locally, and the fetch-by-sha comes back empty because origin
    // never had the commit. That is a fabricated DONE — a violation, not an
    // "unverified" shrug.
    const v = validate(doneRow, {
      resolveSha: () => false,
      shallow: true,
      fetchSha: () => false,
    });
    expect(v.join("\n")).toMatch(/origin does not serve/);
  });

  it("passes when the fetch-by-sha recovers the commit and it then resolves", () => {
    // Genuine historical evidence in a shallow clone: the first resolve misses
    // (truncated history), the fetch pulls the commit, the retry resolves.
    let fetched = false;
    const v = validate(doneRow, {
      resolveSha: () => fetched,
      shallow: true,
      fetchSha: () => {
        fetched = true;
        return true;
      },
    });
    expect(v).toEqual([]);
  });

  it("a successful fetch alone is not enough — the retry must resolve too", () => {
    // fetchSha returning true only says the transfer succeeded; the verdict
    // still belongs to `git cat-file`.
    const v = validate(doneRow, { resolveSha: () => false, shallow: true, fetchSha: () => true });
    expect(v.join("\n")).toMatch(/origin does not serve/);
  });

  it("degrades to unverified ONLY with no origin remote (true offline)", () => {
    // fetchSha: null models a repo with no origin — absence genuinely cannot
    // be tested there, so the SHA is reported as unverified, never silently
    // dropped.
    const unverified: Array<{ id: string; sha: string }> = [];
    const v = validate(doneRow, { resolveSha: () => false, shallow: true, fetchSha: null, unverified });
    expect(v).toEqual([]);
    expect(unverified).toEqual([{ id: "C-1", sha: "657a7f1" }]);
  });

  it("DOES fail the same row when the clone has full history", () => {
    // The strict check must survive: on a complete clone, a missing commit is
    // real evidence that the work was never committed.
    const v = validate(doneRow, { resolveSha: () => false, shallow: false, fetchSha: null });
    expect(v.join("\n")).toMatch(/none resolve to a commit/);
  });

  it("still enforces every non-SHA rule while shallow", () => {
    // Degrading SHA resolution must not degrade anything else, or a shallow CI
    // run silently becomes a much weaker gate than it appears.
    const v = validate(
      [
        row({ id: "A", title: "same work", status: "DONE", evidence: "657a7f1" }),
        row({ id: "B", title: "same work", status: "DONE", evidence: "—", line: 2 }),
        row({ id: "C", title: "third", owner: "gemini", line: 3 }),
      ],
      { resolveSha: () => false, shallow: true, fetchSha: null },
    );
    expect(v.join("\n")).toMatch(/duplicate Title/);
    expect(v.join("\n")).toMatch(/DONE requires Evidence/);
    expect(v.join("\n")).toMatch(/unknown Owner/);
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
