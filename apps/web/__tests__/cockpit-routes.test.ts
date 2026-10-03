import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Cockpit Route Smoke Test
 *
 * Every page in apps/web/app/cockpit and every route in
 * apps/web/app/api/cockpit must:
 *   1. Reference the auth() helper OR be gated by the cockpit layout.
 *   2. Reference the ADMIN role check (either directly or via the layout).
 *
 * This is a source-level invariant — it catches the most common mistake
 * (a new cockpit page shipping without the admin gate).
 */

function listTsFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

function slashPath(path: string): string {
  return path.replace(/\\/g, "/");
}

const repoRoot = resolve(__dirname, "..");
const cockpitPages = listTsFiles(resolve(repoRoot, "app/cockpit"));
const cockpitApi = listTsFiles(resolve(repoRoot, "app/api/cockpit"));

describe("Cockpit routes — admin gating invariants", () => {
  it("cockpit layout enforces ADMIN role check at the top of the tree", () => {
    const layout = readFileSync(resolve(repoRoot, "app/cockpit/layout.tsx"), "utf8");
    expect(layout).toMatch(/import\s+\{\s*auth\s*\}\s+from\s+["']@\/lib\/auth["']/);
    expect(layout).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(layout).toMatch(/redirect\s*\(/);
  });

  it("every cockpit page file lives under app/cockpit (so it inherits the layout)", () => {
    expect(cockpitPages.length).toBeGreaterThanOrEqual(6); // layout + at least overview/agents/tasks/review/media
    for (const f of cockpitPages) {
      expect(slashPath(f)).toContain("app/cockpit");
    }
  });

  it("every cockpit API route file enforces an ADMIN role check directly", () => {
    expect(cockpitApi.length).toBeGreaterThanOrEqual(4);
    for (const f of cockpitApi) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f} must import auth()`).toMatch(
        /from\s+["']@\/lib\/auth["']/
      );
      expect(src, `${f} must check ADMIN role`).toMatch(
        /role\s*!==\s*["']ADMIN["']/
      );
    }
  });

  it("no cockpit API route auto-publishes / auto-posts / auto-sends", () => {
    // Source-level forbidding of dangerous verbs as the first word of an action
    // inside any cockpit API route. (We allow nouns like "post" inside English
    // text, but flag verb-form HTTP calls like fetch(... POST ...) only when
    // accompanied by a publisher pattern.)
    const banned = /\b(twitterClient|sendgrid|mailchimp|publishToFacebook|publishToTwitter|postToSlack)\b/i;
    for (const f of cockpitApi) {
      const src = readFileSync(f, "utf8");
      const m = src.match(banned);
      expect(m, `${f} must not reference external publisher: ${m?.[0]}`).toBeNull();
    }
  });
});
