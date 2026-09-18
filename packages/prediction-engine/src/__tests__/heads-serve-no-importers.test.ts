import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(__dirname, "../../../..");

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("composition: heads/serve has zero production importers", () => {
  it("enumerates importers (empty — serve path does not exist yet)", () => {
    const heads = join(REPO, "packages/prediction-engine/src/heads");
    expect(existsSync(heads)).toBe(false);
    const app = join(REPO, "apps/web/app");
    const files = walkFiles(app);
    const importers: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (src.includes("heads/serve") || src.includes("heads/serve.js")) {
        importers.push(f);
      }
    }
    expect(importers).toEqual([]);
  });
});
