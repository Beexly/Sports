#!/usr/bin/env node

import { pollSource } from "./source-doctor.mjs";

function decodePayload(value) {
  if (!value) throw new Error("Missing base64url source-worker payload.");
  const json = Buffer.from(value, "base64url").toString("utf8");
  const payload = JSON.parse(json);
  if (!payload || typeof payload !== "object" || !payload.source) {
    throw new Error("Source-worker payload must contain source.");
  }
  return payload;
}

async function main() {
  const payload = decodePayload(process.argv[2]);
  const result = await pollSource(payload.source, {
    timeoutMs: payload.timeoutMs,
    maxBytes: payload.maxBytes,
    maxRedirects: payload.maxRedirects,
    userAgent: payload.userAgent,
    conditional: payload.conditional,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({
    outcome: "FAILED_CLOSED",
    error: error instanceof Error ? error.message : String(error),
    installAttempted: false,
    executeAttempted: false,
  })}\n`);
  process.exitCode = 1;
});
