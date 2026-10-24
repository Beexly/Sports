/**
 * Register the TypeScript resolve hook so Node's test runner can import
 * the repo's `.ts` modules by their `.js` specifiers.
 *
 * The repo's TypeScript sources import each other as `"./foo.js"`
 * (the NodeNext convention), but the sources on disk are `.ts`. Node
 * 22.6+ strips types natively, so the ONLY thing missing is the
 * specifier mapping -- which is what ts-resolve-hook.mjs does.
 *
 * Usage:
 *   node --test --experimental-strip-types \
 *        --import ../../reconciliation/ts-resolve-hook-register.mjs \
 *        src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts
 */
import { register } from "node:module";

register(new URL("./ts-resolve-hook.mjs", import.meta.url));
