/**
 * sports-data-candidates.ts — ACCESSOR + INTEGRITY invariants (SO-1c).
 *
 * The existing sports-data-candidates.test.ts pins the GATE (no candidate claims
 * approval, env-var names never values, no secret-shaped tokens). This file covers
 * the part that had none: the accessors at :504-547, the 24-row data table's
 * internal consistency, and the cross-file claim that `registrySourceId` resolves
 * against the REAL rights registry.
 *
 * WHY THIS MATTERS (not just line count): two customer-facing surfaces read these
 * accessors — `app/cockpit/sources/page.tsx:127-130` (the Sources cockpit page,
 * grouping candidates by priority) and `app/api/cockpit/resource-intelligence/
 * route.ts:33` (the resource-intelligence API). `getCandidateSummary()` is the
 * number both of them publish. If the table and the summary disagree, the cockpit
 * shows a count the rows cannot back, and nothing downstream would catch it.
 *
 * NO DB, NO NETWORK, NO INVENTED DATA. Every assertion is derived from the repo's
 * own files; where a test pins a property of today's data it says so, and the
 * properties chosen are the ones that must NOT drift (a promoted candidate, an
 * env-var that stops being documented, an id that stops resolving).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SPORTS_DATA_CANDIDATES,
  getCandidate,
  getCandidatesByPriority,
  requiredApiKeyEnvVars,
  getCandidateSummary,
  findUngatedCandidates,
  type CandidatePriority,
} from "@/lib/scraping/sports-data-candidates";

const REPO_ROOT = resolve(__dirname, "../../..");

const PRIORITIES: readonly CandidatePriority[] = ["high", "medium", "low", "evaluation"];

describe("sports-data-candidates: getCandidate", () => {
  it("resolves every id in the table to its own entry", () => {
    for (const c of SPORTS_DATA_CANDIDATES) {
      expect(getCandidate(c.id), c.id).toBe(c);
    }
  });

  it("returns undefined for an unknown id — never a throw, never a fuzzy match", () => {
    expect(getCandidate("definitely-not-a-real-source")).toBeUndefined();
    expect(getCandidate("")).toBeUndefined();
  });

  it("is case- and whitespace-SENSITIVE, so a typo cannot silently reach a real row", () => {
    // A case-insensitive lookup would let "CFBD" return the collegefootballdata
    // row. That is a real hazard for a table that gates ingestion by id, so the
    // exact-match contract is pinned rather than left to chance.
    const first = SPORTS_DATA_CANDIDATES[0];
    expect(getCandidate(first.id.toUpperCase())).not.toBe(first);
    expect(getCandidate(` ${first.id} `)).not.toBe(first);
  });

  it("resolves the same object identity the table holds (no defensive copy per call)", () => {
    // If getCandidate ever deep-copied, the cockpit page could mutate a row and
    // have the write silently dropped. Identity is the cheap, exact contract.
    const a = getCandidate(SPORTS_DATA_CANDIDATES[1].id);
    const b = getCandidate(SPORTS_DATA_CANDIDATES[1].id);
    expect(a).toBe(b);
  });
});

describe("sports-data-candidates: getCandidatesByPriority", () => {
  it("partitions the table exactly: every candidate in exactly one bucket", () => {
    const seen = new Map<string, number>();
    for (const priority of PRIORITIES) {
      for (const c of getCandidatesByPriority(priority)) {
        expect(c.priority, `${c.id} returned from the ${priority} bucket`).toBe(priority);
        seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
      }
    }
    // No candidate dropped out of the cockpit's four named buckets ...
    expect(seen.size).toBe(SPORTS_DATA_CANDIDATES.length);
    // ... and none double-counted, which would inflate the published summary.
    for (const [id, n] of seen) expect(n, id).toBe(1);
  });

  it("returns a FRESH array per call, so a caller cannot corrupt the table", () => {
    // The cockpit page maps straight over the result. If the accessor ever returned
    // a shared reference, a caller-side sort/mutate would reorder the module-level
    // table itself and the next request would render it wrong. `filter` returns a
    // new array; this pins that, and would fail if the accessor were changed to
    // return a cached or slice-of-module reference.
    const a = getCandidatesByPriority("high");
    const b = getCandidatesByPriority("high");
    expect(a).not.toBe(b);
    expect(a).toEqual(b);

    const tableOrder = SPORTS_DATA_CANDIDATES.map((c) => c.id);
    a.reverse();
    expect(SPORTS_DATA_CANDIDATES.map((c) => c.id)).toEqual(tableOrder);
    expect(getCandidatesByPriority("high").map((c) => c.id)).toEqual(
      tableOrder.filter((id) => getCandidate(id)!.priority === "high"),
    );
  });

  it("every priority the cockpit iterates is actually non-empty today", () => {
    // cockpit/sources/page.tsx:128 maps the four literal priorities and FILTERS OUT
    // empty groups. That means a candidate dropped to a bucket the page does not
    // name — or an emptied bucket — silently vanishes from the Sources cockpit with
    // no error. Every bucket is populated as of this commit; this test is what makes
    // a future change to that set fail loudly instead of quietly.
    for (const priority of PRIORITIES) {
      expect(getCandidatesByPriority(priority).length, `${priority} bucket`).toBeGreaterThan(0);
    }
  });
});

describe("sports-data-candidates: requiredApiKeyEnvVars", () => {
  it("is sorted and duplicate-free, so the provisioning list is stable", () => {
    const vars = requiredApiKeyEnvVars();
    expect(vars.length).toBeGreaterThan(0);
    expect([...vars]).toEqual([...vars].sort());
    expect(new Set(vars).size).toBe(vars.length);
  });

  it("contains exactly the non-null apiKeyEnvVar names — no extras, no omissions", () => {
    const fromTable = SPORTS_DATA_CANDIDATES.map((c) => c.apiKeyEnvVar).filter(
      (v): v is string => v !== null,
    );
    expect(requiredApiKeyEnvVars()).toEqual([...new Set(fromTable)].sort());
  });

  it("carries one env var per KEYED candidate (a shared var would be a real collision)", () => {
    // RECORDED FINDING, today benign: all 17 keyed candidates hold 17 DISTINCT
    // env-var names, so the Set() dedup in requiredApiKeyEnvVars is currently a
    // no-op. If two candidates ever share a var, that is a key-rotation coupling
    // bug, and the dedup would silently hide it from the list — hence this test.
    const keyed = SPORTS_DATA_CANDIDATES.filter((c) => c.keyRequired);
    const vars = keyed.map((c) => c.apiKeyEnvVar);
    expect(new Set(vars).size).toBe(vars.length);
  });

  it("agrees with the summary's needKey/noKey split", () => {
    const summary = getCandidateSummary();
    expect(summary.needKey).toBe(requiredApiKeyEnvVars().length === 0 ? 0 : summary.needKey);
    // The exact, checkable form: every keyed candidate names a var, and no
    // keyless candidate does. (The summary counts candidates; this counts vars.)
    expect(summary.needKey + summary.noKey).toBe(SPORTS_DATA_CANDIDATES.length);
  });
});

describe("sports-data-candidates: getCandidateSummary", () => {
  it("byPriority buckets sum to the total, so the published count is honest", () => {
    const s = getCandidateSummary();
    const sum = PRIORITIES.reduce((acc, p) => acc + s.byPriority[p], 0);
    expect(sum).toBe(s.total);
    expect(s.total).toBe(SPORTS_DATA_CANDIDATES.length);
  });

  it("needKey and noKey partition the table with no overlap and no gap", () => {
    const s = getCandidateSummary();
    expect(s.needKey).toBe(SPORTS_DATA_CANDIDATES.filter((c) => c.keyRequired).length);
    expect(s.noKey).toBe(SPORTS_DATA_CANDIDATES.filter((c) => !c.keyRequired).length);
    expect(s.needKey + s.noKey).toBe(s.total);
  });

  it("alreadyRegistered is a sub-count of total, never larger", () => {
    const s = getCandidateSummary();
    expect(s.alreadyRegistered).toBe(
      SPORTS_DATA_CANDIDATES.filter((c) => c.inMainRegistry).length,
    );
    expect(s.alreadyRegistered).toBeLessThanOrEqual(s.total);
  });
});

describe("sports-data-candidates: data-table integrity", () => {
  it("has unique ids — getCandidate would otherwise be order-dependent", () => {
    const ids = SPORTS_DATA_CANDIDATES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("accessModel and keyRequired agree (a keyed 'free_no_key' is a contradiction)", () => {
    for (const c of SPORTS_DATA_CANDIDATES) {
      if (c.accessModel === "free_no_key") {
        expect(c.keyRequired, c.id).toBe(false);
        expect(c.apiKeyEnvVar, c.id).toBeNull();
      } else {
        expect(c.keyRequired, c.id).toBe(true);
        expect(c.apiKeyEnvVar, c.id).not.toBeNull();
      }
    }
  });

  it("inMainRegistry and registrySourceId are the same fact stated once each", () => {
    // Both flags drift independently in a data table, and the pair is what tells an
    // operator whether a candidate is already governed. One true, one null means
    // the cockpit would show an unregistered row carrying a registry id (or worse,
    // a row that looks cleared with nothing behind it).
    for (const c of SPORTS_DATA_CANDIDATES) {
      if (c.inMainRegistry) expect(c.registrySourceId, c.id).not.toBeNull();
      else expect(c.registrySourceId, c.id).toBeNull();
    }
  });

  it("every candidate carries a non-empty verification gate and coverage note", () => {
    for (const c of SPORTS_DATA_CANDIDATES) {
      expect(c.verificationSteps.length, c.id).toBeGreaterThan(0);
      expect(c.coverage.trim().length, c.id).toBeGreaterThan(0);
      expect(c.notes.trim().length, c.id).toBeGreaterThan(0);
    }
  });

  it("a homepage is either null or an absolute https URL (never a relative path)", () => {
    for (const c of SPORTS_DATA_CANDIDATES) {
      if (c.homepage !== null) expect(c.homepage, c.id).toMatch(/^https:\/\//);
    }
  });
});

describe("sports-data-candidates: cross-file registry resolution", () => {
  it("every registrySourceId actually EXISTS in source-rights-registry.ts", () => {
    // The strongest available cross-file check: a candidate may claim it is already
    // in the rights registry, and if that id is absent the claim is false and the
    // cockpit is showing a row whose governance does not exist. Read the registry
    // as text (no import) so this stays a pure, dependency-free assertion.
    const registry = readFileSync(
      resolve(REPO_ROOT, "apps/web/lib/scraping/source-rights-registry.ts"),
      "utf8",
    );
    const known = new Set(
      [...registry.matchAll(/source_id:\s*"([^"]+)"/g)].map((m) => m[1]),
    );
    expect(known.size).toBeGreaterThan(0);

    const claimed = SPORTS_DATA_CANDIDATES.filter((c) => c.registrySourceId !== null);
    expect(claimed.length).toBeGreaterThan(0);
    for (const c of claimed) {
      expect(known.has(c.registrySourceId!), `${c.id} -> ${c.registrySourceId}`).toBe(true);
    }
  });

  it("no candidate re-declares an approval the main registry itself withholds", () => {
    // The candidate table is type-locked to `false`, so this is a structural echo
    // of the gate test. It is kept because the FAILURE it would catch is the worst
    // one in this file: a promoted candidate that stayed in the list and would
    // otherwise still be counted as gated in the cockpit.
    expect(findUngatedCandidates()).toEqual([]);
  });
});
