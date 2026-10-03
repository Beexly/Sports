import { sha256Hex } from "./hash";

export function idempotencyKeyFor(input: {
  readonly method: string;
  readonly path: string;
  readonly bodyHash?: string;
  readonly externalKey?: string;
}): string {
  const bodyHash = input.bodyHash ?? "empty";
  const externalKey = input.externalKey ?? "none";
  return sha256Hex(`${input.method.toUpperCase()} ${input.path} ${bodyHash} ${externalKey}`, "gse-idempotency").slice(0, 32);
}
