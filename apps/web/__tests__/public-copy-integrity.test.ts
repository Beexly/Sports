import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN =
  /\b(guaranteed wins?|engines? accurate|verified ROI|PROVEN edge|beat the book guaranteed)\b/i;

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "cockpit" || name === "api") continue; // internal
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts|mdx)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("public copy integrity while RED-capable surfaces", () => {
  it("does not ship hard tout phrases in public app pages", () => {
    const root = join(process.cwd(), "app");
    const files = walk(root);
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      if (FORBIDDEN.test(text)) hits.push(f);
    }
    expect(hits).toEqual([]);
  });
});
