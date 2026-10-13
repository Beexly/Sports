/**
 * Node customization hook (loader) for plain-Node ops scripts.
 *
 * Maps the apps/web `@/…` path alias to real files under apps/web so a
 * TypeScript module from the Next app can be loaded outside webpack/vitest.
 * Registered via `node:module.register()` (present since Node 20.6) by
 * scripts/lib/stripe-price-check.mjs — the register() API is the one the
 * pinned Node 20 runtime offers; the hook itself only uses fs/path/url.
 *
 * This file runs in the loader thread: keep it dependency-free.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const WEB_ROOT = fileURLToPath(new URL("../../apps/web/", import.meta.url));

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = join(WEB_ROOT, specifier.slice(2));
    for (const ext of [".ts", ".tsx", ".mjs", ".js", ""]) {
      if (existsSync(base + ext)) {
        return { url: pathToFileURL(base + ext).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}
