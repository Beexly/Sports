#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const payloadDir = resolve(root, "scripts/genesis-payload");
const parts = readdirSync(payloadDir)
  .filter((name) => /^part-\d+\.txt$/.test(name))
  .sort();
if (parts.length === 0) throw new Error("Galaxy Genesis payload parts are missing");
const payload = parts.map((name) => readFileSync(resolve(payloadDir, name), "utf8").trim()).join("");
const files = JSON.parse(gunzipSync(Buffer.from(payload, "base64")).toString("utf8"));
let created = 0;
let updated = 0;
for (const [relativePath, content] of Object.entries(files)) {
  const target = resolve(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) updated += 1;
  else created += 1;
  writeFileSync(target, content, "utf8");
}
console.log(`Galaxy Genesis package installed: ${created} created, ${updated} updated.`);
console.log("Next command: /genesis-next GX-000");
