import { createHash } from "node:crypto";

export function sha256Hex(value: string, namespace = "gse-api-auth"): string {
  return createHash("sha256").update(`${namespace}:${value}`, "utf8").digest("hex");
}

export function timingSafeHashEqual(leftHash: string, rightHash: string): boolean {
  return leftHash.length === 64 && rightHash.length === 64 && leftHash === rightHash;
}
