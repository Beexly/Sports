// Everything here was verified present on v20.20.2, so the guard must stay quiet.
import { readdir } from "node:fs/promises";
import { parseArgs, styleText } from "node:util";
import { hash } from "node:crypto";
import { register } from "node:module";
import { dirname } from "node:path";

export const here = import.meta.dirname;      // 20.11+, present on v20.20.2
export const self = import.meta.filename;     // 20.11+, present on v20.20.2
export const parent = dirname(here);
export const cloned = structuredClone({ a: 1 });
export const signal = AbortSignal.any([new AbortController().signal]);
export const wellFormed = "abc".toWellFormed();
export const last = [1, 2, 3].findLast((n) => n < 3);
export const digest = hash("sha256", "picks");
export const painted = styleText("green", "ok");
export const args = parseArgs({ args: [], options: {} });
export { register, readdir };

export async function walk(dir) {
  return readdir(dir, { withFileTypes: true });
}
