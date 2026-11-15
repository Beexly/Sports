/**
 * Resolve hook for free-auto-settle, loaded via module.register() from
 * free-auto-settle.mjs.
 *
 * Kept as its own module on purpose: module.register() (Node >= 20.6) loads
 * hooks from a separate file, while the inline registerHooks API (Node >= 22)
 * is banned under scripts/ by the node-version-parity guardrail because CI
 * pins Node 20.
 *
 * Resolves the web app's "@/*" alias and extensionless/.js-suffixed relative
 * imports to their real .ts files, so the daemon can import the app's own
 * ingest module under plain node.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

const REPO_ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const WEB_ROOT = pathResolve(REPO_ROOT, "apps", "web");
const EXTS = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.js"];

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith("@/")) {
    base = pathResolve(WEB_ROOT, specifier.slice(2));
  } else if (specifier.startsWith("@sports/")) {
    // Package subpath imports (e.g. @sports/prediction-engine/src/foo.js)
    // point at TS sources under the workspace packages; the .js suffix is
    // the TS emit convention, so map to the real file like relative imports.
    const rest = specifier.slice("@sports/".length);
    const slash = rest.indexOf("/");
    if (slash === -1) return nextResolve(specifier, context);
    base = pathResolve(REPO_ROOT, "packages", rest.slice(0, slash), rest.slice(slash + 1));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    if (!context.parentURL || !context.parentURL.startsWith("file:")) {
      return nextResolve(specifier, context);
    }
    base = pathResolve(dirname(fileURLToPath(context.parentURL)), specifier);
  } else {
    return nextResolve(specifier, context);
  }
  const candidates = EXTS.map((e) => base + e);
  if (base.endsWith(".js")) candidates.unshift(base.slice(0, -3) + ".ts");
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}
