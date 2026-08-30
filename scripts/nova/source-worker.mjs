#!/usr/bin/env node

/**
 * NOVA S3 per-source worker. Runs one bounded, read-only poll in a child
 * process so the parent cycle can enforce hard timeouts and output ceilings.
 * The worker emits exactly one JSON result on stdout using the exact
 * outcome vocabulary (FETCHED / NOT_MODIFIED / HELD / FAILED). Any worker
 * failure — including a crash of this process — is FAILED, never a
 * fabricated success. Extracted from the frozen #146 reference (fbc3cfe)
 * and hardened for S3.
 */

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
    redirectPolicy: payload.redirectPolicy,
    userAgent: payload.userAgent,
    conditional: payload.conditional,
    defaultFreshnessHorizonMinutes: payload.defaultFreshnessHorizonMinutes,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify({
      outcome: "FAILED",
      holdReason: null,
      receipt: null,
      error: error instanceof Error ? error.message : String(error),
      installAttempted: false,
      executeAttempted: false,
    })}\n`,
  );
  process.exitCode = 1;
});
