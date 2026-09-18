import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Em dashes in PUBLIC copy, enforced across the whole public surface.
 *
 * WHY THIS EXISTS BESIDE scripts/guardrails/em-dash-scan.mjs. That guard scans
 * NINE hardcoded files. Two real violations were found on 2026-09-18 in files
 * it does not cover, both in customer-facing strings:
 *   apps/web/lib/board/gate-consumer.ts  - a board pass reason
 *   apps/web/app/fantasy/nba/page.tsx    - the "fictional slate" banner
 * Neither could ever have been caught. AGENTS.md bans the em dash in ALL public
 * copy, so a nine-file guard enforces a fraction of the rule it is named for.
 *
 * Widening the .mjs guard itself is blocked for agent sessions, so the rule is
 * enforced here instead: a vitest file runs in the same CI job and lives in a
 * path this session may edit. If that guard is later widened, delete this file
 * rather than running both.
 *
 * HOW IT AVOIDS THE TRAP AGENTS.md WARNS ABOUT. The .mjs guard is a raw line
 * scan, so a COMMENT explaining an em-dash fix trips it - AGENTS.md records
 * exactly that happening and costing a red PR. This strips block and line
 * comments before scanning, so a note about the rule never violates the rule.
 *
 * SCOPE IS "PUBLIC", NOT "EVERYTHING". Measured 2026-09-18: 1,202 non-comment
 * em-dash lines exist across app + components + lib. Most are operator-only
 * surfaces (cockpit, admin, api routes, internal libs), which are NOT public
 * copy and are deliberately out of scope. The public .tsx surface is 267 lines
 * across 98 files.
 *
 * WHY A BASELINE RATHER THAN ZERO. 267 violations cannot be rewritten in one
 * pass, and a guard that is red on arrival gets ignored or disabled, which is
 * worse than no guard. So this ratchets: a file not in the baseline must have
 * ZERO, and a file in it may never exceed its recorded count. The debt is
 * visible on every run and can only shrink. Lower an entry when you clean a
 * file; delete it at zero. NEVER raise one - that is the one edit that turns
 * this from a ratchet into a rubber stamp.
 */

const webRoot = resolve(__dirname, "..");
const repoRoot = resolve(webRoot, "../..");

/** Operator-only surfaces. Not public copy, deliberately out of scope. */
const INTERNAL = /\/(cockpit|admin|api|sealed|glass-ledger|studio|academy)\//;

/**
 * Known debt, recorded 2026-09-18 when this guard was introduced.
 * Counts may only DECREASE. A file absent from this map must have zero.
 */
const BASELINE: Readonly<Record<string, number>> = {
  "apps/web/app/about/page.tsx": 1,
  "apps/web/app/age-verify/page.tsx": 1,
  "apps/web/app/airwave/page.tsx": 1,
  "apps/web/app/bankroll/page.tsx": 2,
  "apps/web/app/board/gate/page.tsx": 10,
  "apps/web/app/board/page.tsx": 4,
  "apps/web/app/calibration/market/page.tsx": 6,
  "apps/web/app/dashboard/page.tsx": 4,
  "apps/web/app/data/page.tsx": 3,
  "apps/web/app/deck/page.tsx": 2,
  "apps/web/app/edge-index/page.tsx": 4,
  "apps/web/app/embed/edge-index/[gameId]/page.tsx": 1,
  "apps/web/app/engine/page.tsx": 1,
  "apps/web/app/fable/proof-dashboard.tsx": 4,
  "apps/web/app/fantasy/contests/page.tsx": 3,
  "apps/web/app/fantasy/nba/page.tsx": 4,
  "apps/web/app/fantasy/page.tsx": 4,
  "apps/web/app/fantasy/showdown/page.tsx": 1,
  "apps/web/app/fantasy/touchdowns/page.tsx": 2,
  "apps/web/app/faq/page.tsx": 3,
  "apps/web/app/founder-picks/page.tsx": 3,
  "apps/web/app/games/[gameId]/page.tsx": 1,
  "apps/web/app/house/page.tsx": 4,
  "apps/web/app/how-we-make-money/page.tsx": 3,
  "apps/web/app/integrity/page.tsx": 20,
  "apps/web/app/intelligence/engines/registry.tsx": 3,
  "apps/web/app/kill-ledger/page.tsx": 2,
  "apps/web/app/launch/page.tsx": 2,
  "apps/web/app/live/page.tsx": 1,
  "apps/web/app/methodology/page.tsx": 6,
  "apps/web/app/newsletter/page.tsx": 1,
  "apps/web/app/observatory/page.tsx": 1,
  "apps/web/app/optimizer/page.tsx": 2,
  "apps/web/app/picks/page.tsx": 4,
  "apps/web/app/pricing/page.tsx": 4,
  "apps/web/app/proof/page.tsx": 2,
  "apps/web/app/room/[gameId]/page.tsx": 2,
  "apps/web/app/stats/_components.tsx": 5,
  "apps/web/app/stats/compare/page.tsx": 1,
  "apps/web/app/stats/comps/page.tsx": 2,
  "apps/web/app/stats/depth/page.tsx": 2,
  "apps/web/app/stats/media/signals/page.tsx": 1,
  "apps/web/app/stats/media/trending/page.tsx": 1,
  "apps/web/app/stats/page.tsx": 2,
  "apps/web/app/stats/player/[id]/page.tsx": 3,
  "apps/web/app/stats/proof/page.tsx": 4,
  "apps/web/app/stats/sources/page.tsx": 1,
  "apps/web/app/stats/teams/page.tsx": 2,
  "apps/web/app/stats/watchlist/page.tsx": 1,
  "apps/web/app/tools/clv-calculator/page.tsx": 2,
  "apps/web/app/tools/ev-calculator/ev-calculator-client.tsx": 1,
  "apps/web/app/tools/ev-calculator/page.tsx": 3,
  "apps/web/app/tools/line-movement/page.tsx": 2,
  "apps/web/app/tools/no-vig-calculator/no-vig-calculator-client.tsx": 1,
  "apps/web/app/tools/no-vig-calculator/page.tsx": 2,
  "apps/web/app/tools/odds-converter/odds-converter-client.tsx": 1,
  "apps/web/app/tools/page.tsx": 7,
  "apps/web/app/tools/parlay-calculator/page.tsx": 1,
  "apps/web/app/tools/parlay-calculator/parlay-calculator-client.tsx": 1,
  "apps/web/app/track/page.tsx": 1,
  "apps/web/app/track/platform/page.tsx": 5,
  "apps/web/app/verify/page.tsx": 1,
  "apps/web/app/verify/slate/opening/page.tsx": 7,
  "apps/web/app/watchlist/page.tsx": 7,
  "apps/web/app/weather/page.tsx": 3,
  "apps/web/components/airwave/expert-board.tsx": 3,
  "apps/web/components/airwave/pundit-ledger.tsx": 2,
  "apps/web/components/board/board-surface-chip.tsx": 1,
  "apps/web/components/calibration/reliability-chart.tsx": 1,
  "apps/web/components/contests/contest-entry-form.tsx": 2,
  "apps/web/components/fantasy/dfs-optimizer.tsx": 1,
  "apps/web/components/fantasy/draft-assistant.tsx": 1,
  "apps/web/components/fantasy/pickem-ranker.tsx": 2,
  "apps/web/components/fantasy/portfolio-sim.tsx": 2,
  "apps/web/components/fantasy/postlock-panel.tsx": 2,
  "apps/web/components/fantasy/stack-exposure-panel.tsx": 4,
  "apps/web/components/fantasy/td-board.tsx": 4,
  "apps/web/components/fantasy/tournament-lab.tsx": 1,
  "apps/web/components/fantasy/trade-analyzer.tsx": 3,
  "apps/web/components/fantasy/waiver-board.tsx": 1,
  "apps/web/components/gsn/waitlist-form.tsx": 1,
  "apps/web/components/human/human-performance-panel.tsx": 2,
  "apps/web/components/intelligence/engine-view.tsx": 9,
  "apps/web/components/observatory/line-shop-board.tsx": 1,
  "apps/web/components/observatory/scoring-reliability-panel.tsx": 1,
  "apps/web/components/parlay/parlay-genome.tsx": 1,
  "apps/web/components/performance/verdict-line.tsx": 2,
  "apps/web/components/picks/devig-method-disclosure.tsx": 1,
  "apps/web/components/picks/evidence-audit-drawer.tsx": 2,
  "apps/web/components/picks/pick-card.tsx": 3,
  "apps/web/components/picks/value-gap.tsx": 1,
  "apps/web/components/players/player-lab-table.tsx": 9,
  "apps/web/components/reconstruction/separation-panel.tsx": 2,
  "apps/web/components/tracker/bankroll-ledger.tsx": 6,
  "apps/web/components/tracker/staking-calculator.tsx": 1,
  "apps/web/components/ui/billing-notice-banner.tsx": 1,
  "apps/web/components/ui/data-table.tsx": 1,
  "apps/web/components/ui/partner-link-disclosure.tsx": 1
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(p);
  }
  return out;
}

/** Blank out dashes inside comments so a note about the rule never breaks it. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[\u2014\u2013]/g, ""))
    .split("\n")
    .map((line) => {
      const i = line.indexOf("//");
      return i === -1 ? line : line.slice(0, i) + line.slice(i).replace(/[\u2014\u2013]/g, "");
    })
    .join("\n");
}

function countDashLines(file: string): number {
  return stripComments(readFileSync(file, "utf8"))
    .split("\n")
    .filter((l) => /[\u2014\u2013]/.test(l)).length;
}

describe("em dashes are banned in public copy (AGENTS.md brand rules)", () => {
  const files = ["apps/web/app", "apps/web/components"]
    .flatMap((d) => walk(join(repoRoot, d)))
    .map((f) => relative(repoRoot, f).split("\\").join("/"))
    .filter((rel) => !INTERNAL.test("/" + rel));

  it("scans the whole public surface, not a hardcoded handful", () => {
    // The defect this guard was built for: the old scan covered 9 files.
    expect(files.length).toBeGreaterThan(200);
  });

  it("no public file exceeds its recorded em-dash debt, and new files carry none", () => {
    const regressions: string[] = [];
    for (const rel of files) {
      const found = countDashLines(join(repoRoot, rel));
      const allowed = BASELINE[rel] ?? 0;
      if (found > allowed) {
        regressions.push(`${rel}: ${found} em/en-dash line(s), baseline allows ${allowed}`);
      }
    }
    expect(regressions, regressions.join("\n")).toEqual([]);
  });

  it("the baseline never grows: every entry still names a real file with real debt", () => {
    // A stale entry is a silent licence. If a file was cleaned or deleted, its
    // entry must go, otherwise the ratchet quietly loosens over time.
    const stale: string[] = [];
    for (const [rel, allowed] of Object.entries(BASELINE)) {
      let found = 0;
      try {
        found = countDashLines(join(repoRoot, rel));
      } catch {
        stale.push(`${rel}: listed in baseline but the file no longer exists`);
        continue;
      }
      if (found < allowed) stale.push(`${rel}: now ${found}, baseline still says ${allowed} - lower it`);
    }
    expect(stale, stale.join("\n")).toEqual([]);
  });
});
