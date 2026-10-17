/** Client shim for node:path. Not used to read the corpus. */
export function resolve(...parts) {
  return parts.filter(Boolean).join("/");
}
export function join(...parts) {
  return parts.join("/");
}
