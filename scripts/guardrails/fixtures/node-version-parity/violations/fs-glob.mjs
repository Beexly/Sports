import { glob } from "node:fs/promises";
export async function findPicks() {
  const out = [];
  for await (const entry of glob("**/*.json")) out.push(entry);
  return out;
}
