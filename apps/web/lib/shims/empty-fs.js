/** Client shim. corpus-evaluator's disk reads never run in the browser. */
export function existsSync() {
  return false;
}
export function readdirSync() {
  return [];
}
export function readFileSync() {
  return "";
}
