import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, join } from "node:path";

/**
 * ONE day boundary, defined in ONE place — a drift guard.
 *
 * "Today" is an entitlement boundary here (the FREE tier is sold as
 * "2 picks/day"), so every consumer must read the SAME definition:
 * `utcDayWindow` / `utcDayKey` from lib/time/day-boundary.ts.
 *
 * Before this guard the app layer re-derived "today" in thirteen places using
 * two idiom families that only coincide while the process timezone is UTC:
 *
 *   - runtime-LOCAL: date-fns `startOfDay()`/`endOfDay()`, `setHours(0,0,0,0)`
 *   - explicit UTC:  `setUTCHours(0,0,0,0)`, `toISOString().slice(0, 10)`
 *
 * Several payloads mixed both — a UTC `date` LABEL over a runtime-local
 * COUNT window, in one response body. This test fails the moment a new
 * consumer hand-rolls a day boundary instead of importing the shared one.
 *
 * It is a source scan on purpose: the failure mode being prevented is a NEW
 * call site, which no behavioural test on the existing call sites can see.
 */

const WEB_ROOT = resolve(__dirname, "..");
const SCAN_DIRS = ["app", "lib", "components"];

/**
 * The runtime-local and hand-rolled day-boundary idioms. Any of these in a
 * data-layer file means that file decided for itself what a day is.
 */
const BANNED: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /\bstartOfDay\s*\(/, why: "date-fns startOfDay() anchors on the AMBIENT process timezone" },
  { pattern: /\bendOfDay\s*\(/, why: "date-fns endOfDay() anchors on the AMBIENT process timezone" },
  { pattern: /\.setHours\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/, why: "setHours(0,0,0,0) is local midnight, not the platform day" },
  { pattern: /\.setUTCHours\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/, why: "hand-rolled UTC midnight — use utcDayWindow()" },
];

/**
 * Files allowed to keep their own boundary maths, each for a stated reason.
 * Adding to this list is a deliberate act that has to be justified in review.
 */
const ALLOWED: ReadonlyMap<string, string> = new Map([
  [
    "lib/journal/week-data.ts",
    "ISO-WEEK bounds, not a day boundary: builds a Monday..Monday range for the model journal. Already UTC-anchored throughout (setUTCDate/setUTCHours).",
  ],
  [
    "lib/time/day-boundary.ts",
    "THE definition itself.",
  ],
]);

/** Strip line and block comments so prose about the old idioms doesn't trip the scan. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

describe("one day boundary, one definition", () => {
  it("no app-layer file hand-rolls a day boundary", () => {
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of walk(resolve(WEB_ROOT, dir))) {
        const rel = relative(WEB_ROOT, file);
        if (ALLOWED.has(rel)) continue;
        const src = stripComments(readFileSync(file, "utf8"));
        for (const { pattern, why } of BANNED) {
          if (pattern.test(src)) offenders.push(`${rel} — ${why}`);
        }
      }
    }

    expect(
      offenders,
      `These files decide for themselves what "today" means. Import utcDayWindow/utcDayKey from "@/lib/time/day-boundary" instead:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("every named day-boundary consumer reads the shared definition", () => {
    // The five things the product's day boundary actually decides, plus the
    // operator surfaces that report on them. Each must import the one module.
    const consumers = [
      "app/api/picks/route.ts", // FREE tier "2 picks/day" teaser window
      "app/api/picks/daily-slate/route.ts", // today's slate counts + date label
      "lib/board/state.ts", // /board "published today" / "gated today"
      "lib/board/passes.ts", // /board public No-Bet pass list
      "app/api/cron/generate-drafts/route.ts", // settled-day grouping + slug keys
      "app/performance/page.tsx", // track record "published today"
      "app/dashboard/page.tsx",
      "app/cockpit/page.tsx",
      "app/cockpit/brief/page.tsx",
      "app/admin/page.tsx",
      "lib/command-center/feed.ts",
      "lib/engine/load-engine-story.ts",
    ];

    const missing = consumers.filter((rel) => {
      const src = readFileSync(resolve(WEB_ROOT, rel), "utf8");
      return !/from\s+"@\/lib\/time\/day-boundary"/.test(src);
    });

    expect(
      missing,
      `These consumers stopped reading the shared day boundary:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("the definition states its convention and is not env-configurable", () => {
    const src = readFileSync(resolve(WEB_ROOT, "lib/time/day-boundary.ts"), "utf8");
    // The convention must be written down at the definition site so a reader
    // does not have to infer it from the arithmetic.
    expect(src).toMatch(/UTC calendar day/);
    expect(src).toMatch(/export const PLATFORM_DAY_ZONE = "UTC"/);
    // A boundary an env var can move is a boundary that can silently move a
    // live entitlement.
    expect(src).not.toMatch(/process\.env/);
  });
});
