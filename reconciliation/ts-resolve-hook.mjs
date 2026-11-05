/**
 * Resolve hook: map a "./*.js" specifier to the sibling "./*.ts" file
 * when the .ts exists, so raw Node can import the repo's TypeScript
 * modules without a build step.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";
import { createRequire } from "node:module";

let _ts = null;
function getTs() {
  if (_ts === null) {
    // The repo's own typescript package — not a new dependency.
    _ts = createRequire(import.meta.url)("typescript");
  }
  return _ts;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && (specifier.endsWith(".js") || !/\.[cm]?[jt]sx?$/.test(specifier))) {
    try {
      const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      // The ".js" -> ".ts" rewrite first, then the bare specifier, then
      // the specifier with ".ts" appended. A module may import a
      // sibling either way, and the hook should not care which.
      const candidates = [
        pathResolve(dirname(parentPath), specifier.replace(/\.js$/, ".ts")),
        pathResolve(dirname(parentPath), specifier),
        pathResolve(dirname(parentPath), `${specifier}.ts`),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return { url: new URL(`file://${candidate.replace(/\\/g, "/")}`).href, shortCircuit: true };
        }
      }
    } catch {
      // fall through to the default resolver
    }
  }
  return nextResolve(specifier, context);
}

/**
 * Load hook: transpile `.ts` sources with the repo's TypeScript compiler.
 *
 * Node 22.6+ strips types natively, but CI pins Node 20, where importing a
 * `.ts` file is ERR_UNKNOWN_FILE_EXTENSION. Transpiling here (instead of
 * relying on native type stripping) makes every reconciliation verifier
 * runnable on the CI-pinned Node. transpileModule (not strip-only) also
 * handles enums and other runtime TS constructs.
 */
export async function load(url, context, nextLoad) {
  if (url.startsWith("file://") && url.endsWith(".ts") && !url.endsWith(".d.ts")) {
    try {
      const ts = getTs();
      const source = readFileSync(fileURLToPath(url), "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
        },
        fileName: fileURLToPath(url),
      });
      return { format: "module", source: outputText, shortCircuit: true };
    } catch {
      // fall through to the default loader (e.g. Node >= 22.6 native stripping)
    }
  }
  return nextLoad(url, context);
}
