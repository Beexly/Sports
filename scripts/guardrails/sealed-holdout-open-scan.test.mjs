import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { collectSealedHoldoutOpenViolations } from "./sealed-holdout-open-scan.mjs";

async function fixture(files) {
  const root = await mkdtemp(join(tmpdir(), "holdout-scan-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    await mkdir(join(abs, ".."), { recursive: true });
    await writeFile(abs, body);
  }
  return root;
}

test("a comment mentioning openHoldout( is not a call site", async () => {
  const root = await fixture({
    "packages/notes.ts": "// the seal is openHoldout(token) and must not be called here\nexport const x = 1;\n",
  });
  try {
    const hits = await collectSealedHoldoutOpenViolations(root);
    assert.equal(hits.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a real openHoldout( call outside edge-lab still fails", async () => {
  const root = await fixture({
    "packages/leak.ts": "export function leak(seal) {\n  return seal.openHoldout(token);\n}\n",
  });
  try {
    const hits = await collectSealedHoldoutOpenViolations(root);
    assert.equal(hits.length, 1);
    assert.match(hits[0].file, /packages\/leak\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
