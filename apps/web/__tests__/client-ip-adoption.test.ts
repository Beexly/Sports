import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, sep } from "node:path";

/**
 * Every rate limiter must key on `clientIp()`, not on a hand-rolled header read.
 *
 * `lib/api/rate-limit.ts` exports a hardened `clientIp()`: it prefers the
 * platform-set `x-vercel-forwarded-for` / `x-real-ip`, reads `x-forwarded-for`
 * from the RIGHT by `TRUSTED_PROXY_HOPS`, validates the shape, and falls back
 * to the shared `"anon"` bucket. Its own doc says why: "Anything further left
 * may be attacker-supplied." `lib/api/client-ip.test.ts` pins that behaviour,
 * including a case named for the bypass it closes.
 *
 * That was all true, and five routes still hand-rolled
 * `x-forwarded-for.split(",")[0]` anyway:
 *
 *   api/contests/enter            8 per 60s
 *   api/waitlist                  5 per 60s
 *   api/human/roster-availability 20 per 5min
 *   api/intelligence/roster-advice 30 per 5min
 *   api/cipher/verify             8 per 10min
 *
 * The leftmost entry is whatever the caller sent, so on all five a client could
 * put a fresh value in the header and get a fresh bucket for every request —
 * the limit was decorative. `cipher/verify` was the worst of them: it declared
 * a LOCAL `clientIp()` with the same name as the safe one, so the call site
 * read as though the hardened helper was already in use.
 *
 * This is a source-level invariant rather than a behavioural one on purpose.
 * The behaviour is already covered by `client-ip.test.ts`; what failed here was
 * ADOPTION, which no amount of testing the helper can catch. It also drifted
 * twice — once when the migration shipped half-applied, once when the branch
 * carrying the repair was abandoned unmerged for eight days — so the guard is
 * on the pattern, where a new route written by copy-paste will meet it.
 */

const webRoot = resolve(__dirname, "..");

/**
 * Every route handler in the app.
 *
 * Hand-rolled rather than `fs.globSync`, which is Node 22+. The first version
 * used it, passed locally on Node 22, and failed CI on Node 20 with
 * "globSync is not a function" -- a collection-time throw, so the whole file
 * reported as a failed SUITE and ran none of its four tests. A guard that
 * cannot load is a guard that is not guarding, so the walk below uses only
 * `readdirSync`, which every supported Node has.
 */
function findRoutes(dir: string, acc: string[] = [], base = ""): string[] {
  for (const entry of readdirSync(resolve(webRoot, dir), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) findRoutes(`${dir}${sep}${entry.name}`, acc, rel);
    else if (entry.name === "route.ts") acc.push(`app/${rel}`);
  }
  return acc;
}

const ROUTES = findRoutes("app").sort();

/** Reading the client address straight off a header, in any of its spellings. */
const RAW_READ = /headers\s*\.\s*get\s*\(\s*["'`]x-(?:forwarded-for|real-ip|vercel-forwarded-for)["'`]\s*\)/;

/** Declaring a second function under the canonical name — the shadow case. */
const SHADOW = /\b(?:function|const)\s+clientIp\b/;

/** Strip comments so the explanatory notes naming the header do not self-trip. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("no route hand-rolls the client IP", () => {
  it("finds route files to check (the glob still resolves)", () => {
    // A guard that silently matches nothing passes forever. This is the
    // failure mode that let three other assertions in this repo go vacuous.
    expect(ROUTES.length).toBeGreaterThan(50);
  });

  it("no route reads an address header directly — they all use clientIp()", () => {
    const offenders = ROUTES.filter((rel) =>
      RAW_READ.test(code(readFileSync(resolve(webRoot, rel), "utf8"))),
    );
    expect(
      offenders,
      `these routes read an address header directly instead of calling clientIp() ` +
        `from lib/api/rate-limit (see this file's header for why that is a ` +
        `rate-limit bypass): ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("no route declares its own clientIp(), shadowing the hardened one", () => {
    const shadows = ROUTES.filter((rel) =>
      SHADOW.test(code(readFileSync(resolve(webRoot, rel), "utf8"))),
    );
    expect(
      shadows,
      `these routes declare a local clientIp(), which reads as the safe helper ` +
        `at the call site while doing something else: ${shadows.join(", ")}`,
    ).toEqual([]);
  });

  it("the five routes that carried the bypass now import the shared helper", () => {
    // Named explicitly so a future edit that reverts one of them fails HERE,
    // with the route named, rather than only in the aggregate assertion.
    const FIXED = [
      "app/api/contests/enter/route.ts",
      "app/api/waitlist/route.ts",
      "app/api/human/roster-availability/route.ts",
      "app/api/intelligence/roster-advice/route.ts",
      "app/api/cipher/verify/route.ts",
    ];
    for (const rel of FIXED) {
      const src = readFileSync(resolve(webRoot, rel), "utf8");
      expect(src, `${rel} must import clientIp`).toMatch(
        /import\s*\{[^}]*\bclientIp\b[^}]*\}\s*from\s*["']@\/lib\/api\/rate-limit["']/,
      );
      expect(src, `${rel} must call clientIp`).toMatch(/\bclientIp\s*\(/);
    }
  });
});
