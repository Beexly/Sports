/** Client shim for server-only node:* builtins (fs, fs/promises, crypto, url, child_process). */
export function existsSync() {
  return false;
}
export function readdirSync() {
  return [];
}
export function readFileSync() {
  return "";
}
export function writeFileSync() {}
export function mkdirSync() {}
export function statSync() {
  return { size: 0, mtimeMs: 0, isFile: () => false, isDirectory: () => false };
}
export async function readFile() {
  return "";
}
export async function writeFile() {}
export async function appendFile() {}
export async function mkdir() {}
export async function readdir() {
  return [];
}
export async function stat() {
  return { size: 0, mtimeMs: 0, isFile: () => false, isDirectory: () => false };
}
export function createHash() {
  return {
    update() {
      return this;
    },
    digest() {
      return "0000000000000000000000000000000000000000000000000000000000000000";
    },
  };
}
export function createHmac() {
  return createHash();
}
export function randomUUID() {
  return "00000000-0000-4000-8000-000000000000";
}
export function randomBytes(size = 16) {
  return new Uint8Array(size);
}
export function timingSafeEqual() {
  return false;
}
export function fileURLToPath(u) {
  return String(u || "");
}
export function spawnSync() {
  return { status: 0, stdout: "", stderr: "" };
}
export function execSync() {
  return "";
}
export const promises = {
  readFile,
  writeFile,
  appendFile,
  mkdir,
  readdir,
  stat,
};
const emptyFs = {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  statSync,
  readFile,
  writeFile,
  appendFile,
  mkdir,
  readdir,
  stat,
  createHash,
  createHmac,
  randomUUID,
  randomBytes,
  timingSafeEqual,
  fileURLToPath,
  spawnSync,
  execSync,
  promises,
};
export default emptyFs;
