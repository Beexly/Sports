#!/usr/bin/env node
/**
 * Path shim for the trust gate.
 *
 * The gate has always lived at `scripts/guardrails/trust-gate.mjs`, but
 * AGENTS.md line 101 and 13 other docs/workflows invoke it as
 * `node scripts/trust-gate.mjs`. Rather than edit every reference, this
 * shim forwards to the real implementation, which runs on import.
 *
 * Do not add logic here. Change scripts/guardrails/trust-gate.mjs.
 */

import "./guardrails/trust-gate.mjs";
