import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * apps/web/lib/brief/compose.ts produces the daily brief output that
 * surfaces at /brief and /cockpit/brief. Source-level brand-safety
 * scan: no literal banned phrase should appear in the compose source.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "lib/brief/compose.ts"), "utf8");

describe("brief composer — brand-safety scan", () => {
  it("scanForBannedPhrases returns no hits over the compose source", () => {
    const hits = scanForBannedPhrases(src);
    expect(hits, `compose.ts emits banned phrase(s): ${hits.map((h) => h.phrase).join(", ")}`).toEqual([]);
  });
});
