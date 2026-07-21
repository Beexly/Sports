import { createHash, timingSafeEqual } from "node:crypto";

export function sha256Hex(value: string, namespace = "gse-api-auth"): string {
  return createHash("sha256").update(`${namespace}:${value}`, "utf8").digest("hex");
}

export function timingSafeHashEqual(leftHash: string, rightHash: string): boolean {
  if (leftHash.length !== 64 || rightHash.length !== 64) return false;
  return timingSafeEqual(Buffer.from(leftHash, "hex"), Buffer.from(rightHash, "hex"));
}
