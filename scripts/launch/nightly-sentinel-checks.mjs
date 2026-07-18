// GSE Nightly Sentinel v2 — pure, testable check functions.
//
// Each check is a fetch-and-assert against one live surface. Checks never
// log in, never mutate anything on the target site, and never send a
// request body. Every check returns a structured result rather than
// throwing, so one bad check can never take down the whole run.
//
// category distinguishes WHY a check failed, so a human (or the sentinel's
// own summary) can tell a real regression apart from a flaky network blip
// or a bug in the sentinel itself:
//   - "assertion"  the response arrived, but its content/shape is wrong
//   - "transport"  the request itself failed (timeout, DNS, non-2xx we
//                  didn't expect, connection reset)
//   - "runner"     the check function itself threw for a reason unrelated
//                  to the network response (a bug in this file)

import { createHash } from "node:crypto";

export const SEVERITY = { PASS: "PASS", WARN: "WARN", FAIL: "FAIL" };
export const CATEGORY = { ASSERTION: "assertion", TRANSPORT: "transport", RUNNER: "runner" };

/** @typedef {{id: string, severity: "PASS"|"WARN"|"FAIL", category?: string, detail: string}} CheckResult */

/**
 * Fetch with a timeout and one controlled retry on transport failure only
 * (never retries an assertion failure — a wrong answer twice is still wrong).
 */
async function fetchWithRetry(fetchImpl, url, { timeoutMs, retries = 1 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal, redirect: "manual" });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
    }
  }
  throw lastErr;
}

function transportFail(id, url, err) {
  return { id, severity: SEVERITY.FAIL, category: CATEGORY.TRANSPORT, detail: `${url} unreachable: ${err?.message ?? String(err)}` };
}

function runnerFail(id, err) {
  return { id, severity: SEVERITY.FAIL, category: CATEGORY.RUNNER, detail: `check threw unexpectedly: ${err?.message ?? String(err)}` };
}

/** Redacts anything that looks like a credential/secret before it ever reaches a log line or the JSON artifact. */
export function redactSensitive(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/sk_live_[A-Za-z0-9]+/g, "sk_live_[REDACTED]")
    .replace(/sk_test_[A-Za-z0-9]+/g, "sk_test_[REDACTED]")
    .replace(/whsec_[A-Za-z0-9]+/g, "whsec_[REDACTED]")
    .replace(/ghp_[A-Za-z0-9]+/g, "ghp_[REDACTED]")
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._-]{16,}/g, "$1 [REDACTED]")
    .replace(/(["']?(?:api[_-]?key|secret|token|password)["']?\s*[:=]\s*["']?)[A-Za-z0-9._-]{12,}/gi, "$1[REDACTED]");
}

async function simpleStatusCheck(id, fetchImpl, url, { timeoutMs, expectStatus = [200] }) {
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (!expectStatus.includes(res.status)) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}, expected one of [${expectStatus.join(", ")}]` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> ${res.status}` };
}

export async function checkLlmsTxt(fetchImpl, baseUrl, timeoutMs) {
  const id = "llms-txt";
  const url = `${baseUrl}/llms.txt`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  const body = await res.text();
  if (body.trim().length === 0) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned an empty body` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, ${body.length} bytes` };
}

export async function checkHealth(fetchImpl, baseUrl, timeoutMs) {
  const id = "api-health";
  const url = `${baseUrl}/api/health`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  let json;
  try {
    json = JSON.parse(await res.text());
  } catch (err) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} did not return valid JSON: ${err.message}` };
  }
  if (json.ok !== true) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} reported ok=${JSON.stringify(json.ok)}` };
  }
  if (json.checks?.database?.status !== "ok") {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} database check: ${JSON.stringify(json.checks?.database)}` };
  }
  if (json.checks?.ingestion?.status !== "ok") {
    return { id, severity: SEVERITY.WARN, detail: `${url} ingestion check not ok: ${JSON.stringify(json.checks?.ingestion)}` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> ok, db ok, ingestion ${json.checks.ingestion.ageMinutes}min old` };
}

export async function checkProofLedger(fetchImpl, baseUrl, timeoutMs) {
  const id = "proof-ledger";
  const url = `${baseUrl}/api/proof/ledger`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  let json;
  try {
    json = JSON.parse(await res.text());
  } catch (err) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} did not return valid JSON: ${err.message}` };
  }
  if (typeof json.ledger?.published !== "boolean") {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} missing boolean 'ledger.published' field` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, ledger.published=${json.ledger.published}` };
}

export async function checkProofReceipts(fetchImpl, baseUrl, timeoutMs) {
  const id = "proof-receipts";
  const url = `${baseUrl}/api/proof/receipts`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  let json;
  try {
    json = JSON.parse(await res.text());
  } catch (err) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} did not return valid JSON: ${err.message}` };
  }
  if (json === null || typeof json !== "object") {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} did not return a JSON object/array` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, valid JSON` };
}

export async function checkProofOpenApi(fetchImpl, baseUrl, timeoutMs) {
  const id = "proof-openapi";
  const url = `${baseUrl}/api/proof/openapi.json`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  let json;
  try {
    json = JSON.parse(await res.text());
  } catch (err) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} did not return valid JSON: ${err.message}` };
  }
  if (!json.openapi && !json.swagger) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} missing an 'openapi' or 'swagger' version field` };
  }
  if (!json.paths || typeof json.paths !== "object") {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} missing a 'paths' object` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, valid OpenAPI shape, ${Object.keys(json.paths).length} path(s)` };
}

// --- The known-answer-vector recomputation -----------------------------

/** Pure: mirrors the published GSE-PickCommit-v1 algorithm exactly. */
export function computeLeafHash(pickId, canonicalPayload) {
  return createHash("sha256").update(`leaf:${pickId}:${canonicalPayload}`, "utf8").digest("hex");
}

/** Pure: sha256('node:' + left + ':' + right); odd layers duplicate the last node. */
export function computeMerkleRoot(leaves) {
  if (leaves.length === 0) throw new Error("computeMerkleRoot: empty leaf set");
  let layer = leaves;
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] !== undefined ? layer[i + 1] : layer[i];
      next.push(createHash("sha256").update(`node:${left}:${right}`, "utf8").digest("hex"));
    }
    layer = next;
  }
  return layer[0];
}

export async function checkProofVerificationSpec(fetchImpl, baseUrl, timeoutMs) {
  const id = "proof-verification-spec";
  const url = `${baseUrl}/api/proof/verification-spec.json`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  let spec;
  try {
    spec = JSON.parse(await res.text());
  } catch (err) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} did not return valid JSON: ${err.message}` };
  }
  if (!Array.isArray(spec.vectors) || spec.vectors.length === 0) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} published zero known-answer vectors` };
  }
  const mismatches = [];
  for (const vector of spec.vectors) {
    const computed = computeLeafHash(vector.pickId, vector.canonicalPayload);
    if (computed !== vector.leafHash) {
      mismatches.push(`${vector.pickId}: computed ${computed} != published ${vector.leafHash}`);
    }
  }
  if (mismatches.length > 0) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `Leaf-hash recomputation mismatch: ${mismatches.join("; ")}` };
  }
  if (!spec.merkle?.root) {
    // A missing Merkle root is itself a spec-conformance defect, not something
    // to silently skip -- never let the PASS branch below claim Merkle
    // verification happened when it didn't run.
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} published leaf hashes but no 'merkle.root' field -- Merkle-root verification could not run` };
  }
  const computedRoot = computeMerkleRoot(spec.vectors.map((v) => v.leafHash));
  if (computedRoot !== spec.merkle.root) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `Merkle root recomputation mismatch: computed ${computedRoot} != published ${spec.merkle.root}` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, ${spec.vectors.length} known-answer leaf hash(es) + Merkle root all independently recomputed and matched` };
}

// -------------------------------------------------------------------------

export async function checkNewsSitemap(fetchImpl, baseUrl, timeoutMs) {
  const id = "news-sitemap";
  const url = `${baseUrl}/news-sitemap.xml`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  const body = await res.text();
  if (!body.includes("<urlset")) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} does not look like a sitemap (no <urlset>)` };
  }
  const urlCount = (body.match(/<url>/g) ?? []).length;
  if (urlCount === 0) {
    // Documented, pre-existing gap (PROD-004 / LB-006): ambiguous, not
    // necessarily wrong, so this is a WARN, not a FAIL.
    return { id, severity: SEVERITY.WARN, detail: `${url} is well-formed but has zero <url> entries (see LB-006)` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, ${urlCount} url entries` };
}

export async function checkRobotsTxt(fetchImpl, baseUrl, timeoutMs) {
  const id = "robots-txt";
  const url = `${baseUrl}/robots.txt`;
  let res;
  try {
    res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
  } catch (err) {
    return transportFail(id, url, err);
  }
  if (res.status !== 200) return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
  const body = await res.text();
  if (!/sitemap/i.test(body)) {
    return { id, severity: SEVERITY.WARN, detail: `${url} does not mention a sitemap` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${url} -> 200, advertises a sitemap` };
}

export async function checkPage(fetchImpl, baseUrl, path, timeoutMs) {
  return simpleStatusCheck(`page:${path}`, fetchImpl, `${baseUrl}${path}`, { timeoutMs });
}

/** Reuses the same banned-vocabulary doctrine as scripts/guardrails/commercial-copy-scan.mjs and trust-gate.mjs, applied to LIVE production HTML instead of repo source -- proves the guardrail's intent actually reached the deployed site, not just the code that was supposed to produce it. */
const BANNED_PHRASES = [
  /\bguaranteed\b/i,
  /\brisk[\s-]?free\b/i,
  /\bcan'?t\s+lose\b/i,
  /\block\s+of\s+the\s+(day|week|year)\b/i,
  /\b100%\s+win/i,
  /\bsure\s+thing\b/i,
];

export async function checkPublicClaimHygiene(fetchImpl, baseUrl, timeoutMs) {
  const id = "public-claim-hygiene";
  const paths = ["/", "/pricing"];
  const hits = [];
  for (const path of paths) {
    const url = `${baseUrl}${path}`;
    let res;
    try {
      res = await fetchWithRetry(fetchImpl, url, { timeoutMs });
    } catch (err) {
      return transportFail(id, url, err);
    }
    if (res.status !== 200) {
      return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `${url} returned ${res.status}` };
    }
    const body = await res.text();
    for (const pattern of BANNED_PHRASES) {
      if (pattern.test(body)) hits.push(`${path}: matched ${pattern}`);
    }
  }
  if (hits.length > 0) {
    return { id, severity: SEVERITY.FAIL, category: CATEGORY.ASSERTION, detail: `Banned public-claim vocabulary found live: ${hits.join("; ")}` };
  }
  return { id, severity: SEVERITY.PASS, detail: `${paths.join(", ")} -> no banned public-claim vocabulary` };
}

/**
 * The full check registry. Kept as a single ordered array (not scattered
 * across the file) so a run that silently drops a check is easy to
 * detect -- the runner asserts results.length === CHECKS.length.
 */
export const CHECKS = [
  { id: "llms-txt", run: (fetchImpl, baseUrl, timeoutMs) => checkLlmsTxt(fetchImpl, baseUrl, timeoutMs) },
  { id: "api-health", run: (fetchImpl, baseUrl, timeoutMs) => checkHealth(fetchImpl, baseUrl, timeoutMs) },
  { id: "proof-ledger", run: (fetchImpl, baseUrl, timeoutMs) => checkProofLedger(fetchImpl, baseUrl, timeoutMs) },
  { id: "proof-receipts", run: (fetchImpl, baseUrl, timeoutMs) => checkProofReceipts(fetchImpl, baseUrl, timeoutMs) },
  { id: "proof-verification-spec", run: (fetchImpl, baseUrl, timeoutMs) => checkProofVerificationSpec(fetchImpl, baseUrl, timeoutMs) },
  { id: "proof-openapi", run: (fetchImpl, baseUrl, timeoutMs) => checkProofOpenApi(fetchImpl, baseUrl, timeoutMs) },
  { id: "news-sitemap", run: (fetchImpl, baseUrl, timeoutMs) => checkNewsSitemap(fetchImpl, baseUrl, timeoutMs) },
  { id: "robots-txt", run: (fetchImpl, baseUrl, timeoutMs) => checkRobotsTxt(fetchImpl, baseUrl, timeoutMs) },
  { id: "page:/", run: (fetchImpl, baseUrl, timeoutMs) => checkPage(fetchImpl, baseUrl, "/", timeoutMs) },
  { id: "page:/tools", run: (fetchImpl, baseUrl, timeoutMs) => checkPage(fetchImpl, baseUrl, "/tools", timeoutMs) },
  { id: "page:/sealed", run: (fetchImpl, baseUrl, timeoutMs) => checkPage(fetchImpl, baseUrl, "/sealed", timeoutMs) },
  { id: "page:/how-we-make-money", run: (fetchImpl, baseUrl, timeoutMs) => checkPage(fetchImpl, baseUrl, "/how-we-make-money", timeoutMs) },
  { id: "page:/watchlist", run: (fetchImpl, baseUrl, timeoutMs) => checkPage(fetchImpl, baseUrl, "/watchlist", timeoutMs) },
  { id: "public-claim-hygiene", run: (fetchImpl, baseUrl, timeoutMs) => checkPublicClaimHygiene(fetchImpl, baseUrl, timeoutMs) },
];

/** Runs every registered check, converting an unexpected throw into a RUNNER-category failure instead of crashing the whole run. */
export async function runAllChecks({ fetchImpl = fetch, baseUrl, timeoutMs = 8000 }) {
  const results = [];
  for (const check of CHECKS) {
    try {
      const result = await check.run(fetchImpl, baseUrl, timeoutMs);
      results.push(result);
    } catch (err) {
      results.push(runnerFail(check.id, err));
    }
  }
  if (results.length !== CHECKS.length) {
    // Should be unreachable given the try/catch above, but fail loudly
    // rather than silently reporting partial coverage if it ever happens.
    results.push({
      id: "coverage-guard",
      severity: SEVERITY.FAIL,
      category: CATEGORY.RUNNER,
      detail: `Expected ${CHECKS.length} results, got ${results.length} -- coverage gap`,
    });
  }
  return results;
}
