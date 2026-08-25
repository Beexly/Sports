import { enableCompileCache, findPackageJSON, stripTypeScriptTypes } from "node:module";
enableCompileCache();
export const pkg = findPackageJSON(import.meta.url);
export const js = stripTypeScriptTypes("const x: number = 1;");
