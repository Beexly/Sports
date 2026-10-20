/**
 * Resolve hook: map a "./*.js" specifier to the sibling "./*.ts" file
 * when the .ts exists, so raw Node can import the repo's TypeScript
 * modules without a build step.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && specifier.endsWith(".js")) {
    try {
      const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      const candidate = pathResolve(dirname(parentPath), specifier.replace(/\.js$/, ".ts"));
      if (existsSync(candidate)) {
        return { url: new URL(`file://${candidate.replace(/\\/g, "/")}`).href, shortCircuit: true };
      }
    } catch {
      // fall through to the default resolver
    }
  }
  return nextResolve(specifier, context);
}
