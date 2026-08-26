import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  freeTierFeatures,
  CONTEST_BAY_FEATURE_LABEL,
} from "@/lib/pricing/free-tier-features";

/**
 * The pricing page may not sell a surface the app is serving as a 404.
 *
 * Contest Bay (`/fantasy/contests`, aliased from `/contests`) is opt-in behind
 * `CONTESTS_PUBLIC` (apps/web/lib/launch/public-surface-gate.ts), which
 * defaults OFF. With it unset both routes call `notFound()` and
 * `/api/contests/week` refuses. `components/ui/footer.tsx` already hides the
 * link behind that gate. The pricing page shipped the same surface as a Free
 * bullet with `included: true` and a checkmark, unconditionally.
 *
 * These assertions run at RUNTIME (apps/web/tsconfig.json excludes
 * `__tests__/**` from typecheck, so a type-level assertion here would never
 * execute): the first two call the real function with the env toggled, and the
 * third reads the shipped page source to pin the coupling so the bullet cannot
 * be re-hardcoded past the gate.
 */

const PRICING_PAGE = join(__dirname, "..", "app", "pricing", "page.tsx");
const ORIGINAL = process.env["CONTESTS_PUBLIC"];

function restore(): void {
  if (ORIGINAL === undefined) delete process.env["CONTESTS_PUBLIC"];
  else process.env["CONTESTS_PUBLIC"] = ORIGINAL;
}

beforeEach(restore);
afterEach(restore);

describe("Free-tier bullets track their public-surface gates", () => {
  it("omits the Contest Bay bullet entirely while CONTESTS_PUBLIC is unset", () => {
    delete process.env["CONTESTS_PUBLIC"];
    const labels = freeTierFeatures().map((f) => f.label);
    expect(labels).not.toContain(CONTEST_BAY_FEATURE_LABEL);
  });

  it("omits it for any non-truthy value too (fail-closed, like the gate)", () => {
    for (const value of ["", "false", "0", "no", "off", "maybe"]) {
      process.env["CONTESTS_PUBLIC"] = value;
      const labels = freeTierFeatures().map((f) => f.label);
      expect(labels, `CONTESTS_PUBLIC=${JSON.stringify(value)}`).not.toContain(
        CONTEST_BAY_FEATURE_LABEL,
      );
    }
  });

  it("restores the bullet as an included feature once the founder opens the gate", () => {
    process.env["CONTESTS_PUBLIC"] = "true";
    const contestBay = freeTierFeatures().find((f) => f.label === CONTEST_BAY_FEATURE_LABEL);
    expect(contestBay).toBeDefined();
    expect(contestBay?.included).toBe(true);
  });

  it("never drops the bullets that are true for a Free visitor regardless of any gate", () => {
    delete process.env["CONTESTS_PUBLIC"];
    const labels = freeTierFeatures().map((f) => f.label);
    expect(labels).toContain("The Academy: full training floor");
    expect(labels).toContain("Free calculators & intelligence tools (no account wall)");
    // The lock list must survive too — Free's honesty depends on showing what
    // it does NOT get, not only what it does.
    const locked = freeTierFeatures().filter((f) => !f.included).map((f) => f.label);
    expect(locked).toContain("The full daily board, every signal (Pro)");
    expect(locked).toContain("Graded-pick alerts (Elite)");
  });

  it("the pricing page renders the gated list instead of hardcoding the bullet", () => {
    const src = readFileSync(PRICING_PAGE, "utf8");
    // The bullet STRING itself, not the words "Contest Bay" — the page's
    // comments legitimately explain why the bullet moved behind the gate.
    expect(
      src.includes(CONTEST_BAY_FEATURE_LABEL),
      "apps/web/app/pricing/page.tsx must not hardcode the Contest Bay bullet — it is gated behind CONTESTS_PUBLIC and 404s while that is off",
    ).toBe(false);
    expect(
      src.includes("freeTierFeatures"),
      "apps/web/app/pricing/page.tsx must build its Free bullets from freeTierFeatures() so they cannot outrun their gate",
    ).toBe(true);
  });
});

/**
 * The same rule, generalised so it cannot be re-broken on a different page.
 *
 * A route may name Contest Bay in copy a visitor reads only if that same file
 * consults `isContestsPublic()` — which is exactly what the two contest routes
 * do (they `notFound()` when the gate is closed). Any other page naming it is
 * advertising a 404. This is an invariant, not an allowlist: a new page that
 * wants to mention Contest Bay passes by gating on it, and nothing can be
 * waved through by adding an entry here.
 *
 * Comments are stripped first — a file's own docstring explaining WHY the copy
 * moved behind the gate is not a claim to a visitor.
 */
const APP_DIR = join(__dirname, "..", "app");
const CONTEST_BAY_MENTIONS = [/contest bay/i, /paper contests?\b/i];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
}

function allPageFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__" || entry === "api") continue;
      allPageFiles(full, out);
    } else if (entry === "page.tsx" || entry === "layout.tsx" || entry === "opengraph-image.tsx") {
      out.push(full);
    }
  }
  return out;
}

describe("no public route advertises a gated surface it does not gate on", () => {
  it("Contest Bay is named only by files that consult isContestsPublic()", () => {
    const offenders: string[] = [];
    for (const file of allPageFiles(APP_DIR)) {
      const raw = readFileSync(file, "utf8");
      const viewerText = stripComments(raw);
      const named = CONTEST_BAY_MENTIONS.find((re) => re.test(viewerText));
      if (!named) continue;
      if (raw.includes("isContestsPublic")) continue; // the gated route itself
      const rel = relative(join(__dirname, ".."), file).split("\\").join("/");
      offenders.push(`${rel} (matched ${named})`);
    }
    expect(
      offenders,
      "These routes advertise Contest Bay in viewer-facing copy but never gate on CONTESTS_PUBLIC, " +
        "so they promise a surface that 404s while the flag is off. Reword the copy or gate the page — " +
        "do not exempt the file.",
    ).toEqual([]);
  });
});
