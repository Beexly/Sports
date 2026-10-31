/** Client shim for node:path. Not used to read the corpus. */
export function resolve(...parts) {
  return parts.filter(Boolean).join("/");
}
export function join(...parts) {
  return parts.filter(Boolean).join("/");
}
export function dirname(p = "") {
  return String(p).split("/").slice(0, -1).join("/") || ".";
}
export function basename(p = "") {
  return String(p).split("/").pop() || "";
}
export function extname(p = "") {
  const b = basename(p);
  const idx = b.lastIndexOf(".");
  return idx > 0 ? b.slice(idx) : "";
}
const emptyPath = {
  resolve,
  join,
  dirname,
  basename,
  extname,
};
export default emptyPath;
