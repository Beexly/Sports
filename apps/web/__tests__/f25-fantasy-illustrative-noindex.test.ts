import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * F-25 (founder-delegated 2026-09-08, via orchestrator, narrow scope — see
 * docs/ops/AGENT_LEDGER.md C-225 for the broader question left open): the
 * /fantasy 21+ gate itself is unchanged. Its illustrative sub-tool pages
 * (fictional player pool, demo scenarios) are noindexed — they were already
 * absent from app/sitemap.ts (only /fantasy and /fantasy/contests are
 * listed), but carried no robots directive of their own.
 */
const FANTASY_TOOL_PAGES = [
  "academy",
  "autopilot",
  "bestball",
  "connect",
  "dfs",
  "draft",
  "gm-ledger",
  "league-twin",
  "lineup",
  "props",
  "scheme",
  "studio",
  "trade",
  "waivers",
];

describe("F-25: illustrative /fantasy sub-tool pages are noindexed", () => {
  for (const slug of FANTASY_TOOL_PAGES) {
    it(`/fantasy/${slug} sets robots noindex`, () => {
      const src = readFileSync(
        join(process.cwd(), `app/fantasy/${slug}/page.tsx`),
        "utf8",
      );
      expect(src).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/);
    });
  }
});
