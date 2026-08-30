#!/usr/bin/env node

/**
 * NOVA S3 source doctor — registry validation and failed-closed polling.
 *
 * Extracted from the frozen #146 reference branch (fbc3cfe) and hardened for
 * the S3 split unit:
 *
 * - registry schema v2: same-origin redirect policy, failure-alert
 *   threshold, and per-source freshness horizons are mandatory policy;
 * - every successful poll yields a schema-valid source receipt (see
 *   `source-runtime-core.mjs`); a poll without a receipt is HELD or FAILED
 *   and is never promoted;
 * - policy refusals (off-origin redirect, disallowed content type, size
 *   ceiling) are HELD — deliberately withheld — and carry a holdReason;
 * - network/HTTP/parse failures are FAILED.
 *
 * Historical NOVA source-validation receipts remain FAILED_CLOSED — see
 * HISTORICAL_SOURCE_VALIDATION_DOCTRINE in `source-runtime-core.mjs`.
 *
 * Scraping posture: read-only conditional HTTPS GET of allowlisted official
 * metadata sources with one declared user agent. No CAPTCHA, login, or
 * paywall bypass; no proxy rotation; no cookies; no credentials. Extraction
 * beyond registry-authorized metadata requires `checkClearance()`
 * (`apps/web/lib/scraping/clearance-engine.ts`) — this runtime never
 * performs such extraction.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTENT_TYPES_BY_PARSER,
  RECEIPT_SCHEMA_VERSION,
  canonicalHost,
  checkSizePolicy,
  contentTypeBase,
  evaluateRedirectHop,
  validateSourceReceipt,
} from "./source-runtime-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const DEFAULT_REGISTRY_PATH = resolve(REPO_ROOT, "data/nova/official-source-registry.json");

export const REGISTRY_SCHEMA_VERSION = 2;

const VALID_KINDS = new Set([
  "official_changelog",
  "official_repository_releases",
  "official_specification_releases",
  "official_registry_releases",
  "official_rss",
  "official_security_catalog",
  "official_pricing",
  "official_credit_program",
]);

const VALID_PARSERS = new Set(Object.keys(CONTENT_TYPES_BY_PARSER));

/** Parser implementation versions recorded on every receipt. Bump on any
 * change to a parser's summarization so downstream diffing can distinguish
 * a source change from a parser change. */
export const PARSER_VERSIONS = Object.freeze({
  structured_page_delta: 2,
  github_releases_json: 2,
  rss_atom_metadata: 2,
  cisa_kev_json: 2,
});

const VALID_REDIRECT_POLICIES = new Set(["same_origin", "allowlisted_hosts"]);

function asNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Policy refusal — becomes a HELD outcome, never a promotion. Carries the
 * bytes already received before the refusal so budget accounting can charge
 * them: a refused fetch still consumed the network budget. */
class PolicyHoldError extends Error {
  constructor(holdReason, message, receivedBytes = 0) {
    super(message ?? holdReason);
    this.name = "PolicyHoldError";
    this.holdReason = holdReason;
    this.receivedBytes = receivedBytes;
  }
}

export function validateRegistry(registry) {
  const errors = [];
  const warnings = [];

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return { valid: false, errors: ["Registry must be a JSON object."], warnings };
  }
  if (registry.schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${REGISTRY_SCHEMA_VERSION}.`);
  }
  const policy = registry.policy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    errors.push("policy object is required.");
  } else {
    if (policy.httpsOnly !== true) errors.push("policy.httpsOnly must be true.");
    if (!VALID_REDIRECT_POLICIES.has(policy.redirectPolicy)) {
      errors.push("policy.redirectPolicy must be same_origin or allowlisted_hosts.");
    }
    if (!Number.isInteger(policy.maxRedirects) || policy.maxRedirects < 0 || policy.maxRedirects > 5) {
      errors.push("policy.maxRedirects must be an integer between 0 and 5.");
    }
    if (!Number.isInteger(policy.defaultTimeoutMs) || policy.defaultTimeoutMs < 1000) {
      errors.push("policy.defaultTimeoutMs must be an integer >= 1000.");
    }
    if (!Number.isInteger(policy.defaultMaxBytes) || policy.defaultMaxBytes < 1024) {
      errors.push("policy.defaultMaxBytes must be an integer >= 1024.");
    }
    if (!asNonEmptyString(policy.userAgent)) errors.push("policy.userAgent is required.");
    if (!Number.isInteger(policy.failureAlertThreshold) || policy.failureAlertThreshold < 1) {
      errors.push("policy.failureAlertThreshold must be an integer >= 1.");
    }
    if (!Number.isInteger(policy.defaultFreshnessHorizonMinutes) || policy.defaultFreshnessHorizonMinutes < 60) {
      errors.push("policy.defaultFreshnessHorizonMinutes must be an integer >= 60.");
    }
    if (policy.autoInstallAllowed !== false) errors.push("policy.autoInstallAllowed must be false.");
    if (policy.autoExecuteAllowed !== false) errors.push("policy.autoExecuteAllowed must be false.");
  }
  if (!Array.isArray(registry.sources)) {
    errors.push("sources must be an array.");
    return { valid: false, errors, warnings };
  }

  const ids = new Set();
  for (const [index, source] of registry.sources.entries()) {
    const prefix = `sources[${index}]`;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      errors.push(`${prefix} must be an object.`);
      continue;
    }

    const id = asNonEmptyString(source.id);
    if (!id) errors.push(`${prefix}.id is required.`);
    else if (ids.has(id)) errors.push(`${prefix}.id duplicates ${id}.`);
    else ids.add(id);

    if (!asNonEmptyString(source.organization)) errors.push(`${prefix}.organization is required.`);
    if (!asNonEmptyString(source.name)) errors.push(`${prefix}.name is required.`);
    if (!VALID_KINDS.has(source.kind)) errors.push(`${prefix}.kind is unsupported: ${String(source.kind)}.`);
    if (!VALID_PARSERS.has(source.parser)) errors.push(`${prefix}.parser is unsupported: ${String(source.parser)}.`);
    if (source.authority !== "primary") errors.push(`${prefix}.authority must be primary in the official registry.`);
    if (!Number.isInteger(source.cadenceMinutes) || source.cadenceMinutes < 60) {
      errors.push(`${prefix}.cadenceMinutes must be an integer >= 60.`);
    }
    if (source.freshnessHorizonMinutes !== undefined) {
      if (!Number.isInteger(source.freshnessHorizonMinutes) || source.freshnessHorizonMinutes < 60) {
        errors.push(`${prefix}.freshnessHorizonMinutes must be an integer >= 60 when present.`);
      } else if (
        Number.isInteger(source.cadenceMinutes) &&
        source.freshnessHorizonMinutes < source.cadenceMinutes
      ) {
        errors.push(`${prefix}.freshnessHorizonMinutes must be >= cadenceMinutes.`);
      }
    }
    if (typeof source.enabled !== "boolean") errors.push(`${prefix}.enabled must be boolean.`);
    if (!["candidate", "live_validated", "disabled", "retired"].includes(source.validationState)) {
      errors.push(`${prefix}.validationState is unsupported.`);
    }
    if (!Array.isArray(source.allowedHosts) || source.allowedHosts.length === 0) {
      errors.push(`${prefix}.allowedHosts must contain at least one hostname.`);
    }
    if (!Array.isArray(source.eventClasses) || source.eventClasses.length === 0) {
      errors.push(`${prefix}.eventClasses must be non-empty.`);
    }
    if (!Array.isArray(source.projectScopes) || source.projectScopes.length === 0) {
      errors.push(`${prefix}.projectScopes must be non-empty.`);
    }

    try {
      const parsed = new URL(source.url);
      if (parsed.protocol !== "https:") errors.push(`${prefix}.url must use HTTPS.`);
      const allowed = new Set((source.allowedHosts ?? []).map(canonicalHost));
      if (!allowed.has(canonicalHost(parsed.hostname))) {
        errors.push(`${prefix}.url hostname is not present in allowedHosts.`);
      }
      if (parsed.username || parsed.password) errors.push(`${prefix}.url must not contain credentials.`);
      if (parsed.hash) warnings.push(`${prefix}.url contains a fragment that will not be sent to the server.`);
    } catch {
      errors.push(`${prefix}.url is not a valid absolute URL.`);
    }

    if (source.enabled && source.validationState !== "live_validated") {
      errors.push(`${prefix} is enabled without validationState=live_validated.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function assertAllowedUrl(url, allowedHosts) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new PolicyHoldError("url_unparseable", `Source URL is not a valid absolute URL.`);
  }
  if (parsed.protocol !== "https:") throw new PolicyHoldError("url_not_https", "Only HTTPS URLs are allowed.");
  if (parsed.username || parsed.password) {
    throw new PolicyHoldError("url_has_credentials", "Credentials in source URLs are forbidden.");
  }
  const hosts = new Set(allowedHosts.map(canonicalHost));
  if (!hosts.has(canonicalHost(parsed.hostname))) {
    throw new PolicyHoldError("host_not_allowlisted", `Host ${parsed.hostname} is not allowlisted.`);
  }
  return parsed;
}

async function readBoundedBody(response, maxBytes) {
  const declaredHeader = response.headers.get("content-length");
  const declared = declaredHeader === null ? null : Number(declaredHeader);
  const declaredCheck = checkSizePolicy({ declaredLength: declared, maxBytes });
  if (!declaredCheck.allowed) {
    throw new PolicyHoldError(declaredCheck.reason, `Declared response size ${declared} exceeds ${maxBytes} bytes.`);
  }
  if (!response.body) return Buffer.alloc(0);

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      const receivedCheck = checkSizePolicy({ receivedBytes: total, maxBytes });
      if (!receivedCheck.allowed) {
        await reader.cancel("NOVA byte ceiling exceeded");
        throw new PolicyHoldError(receivedCheck.reason, `Response exceeded ${maxBytes} bytes.`, total);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

/**
 * Bounded, redirect-policed, conditional GET. Records the full redirect
 * chain. Redirects are same-origin only unless the registry policy widens
 * to allowlisted_hosts (and even then the target must be allowlisted).
 */
export async function fetchBounded(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is unavailable.");

  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 1_048_576;
  const maxRedirects = options.maxRedirects ?? 2;
  const redirectPolicy = options.redirectPolicy ?? "same_origin";
  const userAgent = options.userAgent ?? "GSE-NOVA/0.2 read-only opportunity intelligence";
  const conditional = options.conditional ?? {};

  let current = assertAllowedUrl(source.url, source.allowedHosts);
  const redirectChain = [];

  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept:
            "application/json, application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, text/plain;q=0.8",
          "user-agent": userAgent,
          ...(conditional.etag ? { "if-none-match": conditional.etag } : {}),
          ...(conditional.lastModified ? { "if-modified-since": conditional.lastModified } : {}),
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectChain.length >= maxRedirects) {
        throw new PolicyHoldError("redirect_ceiling_exceeded", `Redirect ceiling ${maxRedirects} exceeded.`);
      }
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect ${response.status} omitted Location.`);
      const target = new URL(location, current).toString();
      const hop = evaluateRedirectHop({
        fromUrl: current.toString(),
        toUrl: target,
        redirectPolicy,
        allowedHosts: source.allowedHosts,
      });
      if (!hop.allowed) {
        throw new PolicyHoldError(hop.reason, `Redirect to ${target} refused by policy (${hop.reason}).`);
      }
      redirectChain.push({ url: current.toString(), httpStatus: response.status });
      current = new URL(target);
      continue;
    }

    const baseType = contentTypeBase(response.headers.get("content-type"));
    const allowedTypes = CONTENT_TYPES_BY_PARSER[source.parser] ?? [];
    if (response.status !== 304 && !allowedTypes.includes(baseType)) {
      throw new PolicyHoldError(
        "content_type_not_allowed",
        `Content type ${baseType || "missing"} is not allowed for ${source.parser}.`,
      );
    }

    if (response.status === 304) {
      return {
        status: 304,
        finalUrl: current.toString(),
        redirectChain,
        unchanged: true,
        contentType: baseType || "not-applicable/304",
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        bytes: 0,
        sha256: null,
        body: null,
      };
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);

    const body = await readBoundedBody(response, maxBytes);
    return {
      status: response.status,
      finalUrl: current.toString(),
      redirectChain,
      unchanged: false,
      contentType: baseType,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      bytes: body.byteLength,
      sha256: createHash("sha256").update(body).digest("hex"),
      body: body.toString("utf8"),
    };
  }
}

function summarizeGithubReleases(value) {
  if (!Array.isArray(value)) throw new Error("GitHub releases payload must be an array.");
  return value
    .slice(0, 20)
    .map((release) => ({
      id: String(release?.id ?? release?.tag_name ?? ""),
      tag: String(release?.tag_name ?? ""),
      name: String(release?.name ?? release?.tag_name ?? ""),
      publishedAt: release?.published_at ?? null,
      prerelease: Boolean(release?.prerelease),
      draft: Boolean(release?.draft),
      url: release?.html_url ?? null,
    }))
    .filter((release) => release.id && release.tag);
}

function summarizeCisaKev(value) {
  const vulnerabilities = Array.isArray(value?.vulnerabilities) ? value.vulnerabilities : [];
  return vulnerabilities
    .slice(0, 100)
    .map((item) => ({
      id: String(item?.cveID ?? ""),
      vendor: String(item?.vendorProject ?? ""),
      product: String(item?.product ?? ""),
      addedAt: item?.dateAdded ?? null,
      dueAt: item?.dueDate ?? null,
    }))
    .filter((item) => item.id);
}

function decodeXml(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeRssAtom(xml) {
  const blocks = xml.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks
    .slice(0, 100)
    .map((block) => {
      const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
      const id = block.match(/<(?:guid|id)[^>]*>([\s\S]*?)<\/(?:guid|id)>/i)?.[1] ?? "";
      const date = block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] ?? "";
      const link =
        block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ??
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ??
        "";
      return {
        id: decodeXml(id || link || title),
        title: decodeXml(title),
        publishedAt: decodeXml(date) || null,
        url: decodeXml(link) || null,
      };
    })
    .filter((item) => item.id && item.title);
}

function summarizeStructuredPage(html) {
  const withoutNoise = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  const headings = [];
  for (const match of withoutNoise.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = decodeXml(match[2]);
    if (text) headings.push(text);
    if (headings.length >= 100) break;
  }
  const canonicalText = decodeXml(withoutNoise).slice(0, 200_000);
  return {
    title: decodeXml(withoutNoise.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null,
    headings,
    textSha256: createHash("sha256").update(canonicalText).digest("hex"),
    textPreview: canonicalText.slice(0, 1000),
  };
}

export function summarizeSourceBody(source, body) {
  if (typeof body !== "string") throw new Error("Source body must be a string.");
  switch (source.parser) {
    case "github_releases_json":
      return summarizeGithubReleases(JSON.parse(body));
    case "cisa_kev_json":
      return summarizeCisaKev(JSON.parse(body));
    case "rss_atom_metadata":
      return summarizeRssAtom(body);
    case "structured_page_delta":
      return summarizeStructuredPage(body);
    default:
      throw new Error(`Unsupported parser: ${String(source.parser)}.`);
  }
}

/**
 * Source-declared effective time: the newest parseable published/added
 * timestamp in the summary. Null when the source declares none (e.g. a
 * structured page). Distinct from recordedTime by design.
 */
export function deriveEffectiveTime(summary) {
  if (!Array.isArray(summary)) return null;
  let newest = null;
  for (const item of summary) {
    const raw = item?.publishedAt ?? item?.addedAt ?? null;
    if (!raw) continue;
    const parsed = Date.parse(String(raw));
    if (Number.isFinite(parsed) && (newest === null || parsed > newest)) newest = parsed;
  }
  return newest === null ? null : new Date(newest).toISOString();
}

/**
 * Poll one source. The result always uses the exact outcome vocabulary:
 * FETCHED / NOT_MODIFIED with a schema-valid receipt, HELD with a
 * holdReason, FAILED with an error. No receipt is ever fabricated.
 */
export async function pollSource(source, options = {}) {
  const startedAt = new Date();
  const parserVersion = PARSER_VERSIONS[source.parser] ?? 0;
  const freshnessHorizonMinutes =
    Number.isInteger(source.freshnessHorizonMinutes) && source.freshnessHorizonMinutes >= 60
      ? source.freshnessHorizonMinutes
      : options.defaultFreshnessHorizonMinutes ?? 1440;
  const base = {
    sourceId: source.id,
    startedAt: startedAt.toISOString(),
    parser: source.parser,
    parserVersion,
    externalActions: "READ_ONLY_GET",
    installAttempted: false,
    executeAttempted: false,
  };

  try {
    const fetched = await fetchBounded(source, options);
    const completedAt = new Date().toISOString();
    const summary = fetched.body === null ? null : summarizeSourceBody(source, fetched.body);
    const receipt = {
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      sourceId: source.id,
      url: fetched.finalUrl,
      fetchedAt: base.startedAt,
      httpStatus: fetched.status,
      contentType: fetched.contentType,
      contentLength: fetched.bytes,
      contentHash: fetched.sha256 === null ? null : `sha256:${fetched.sha256}`,
      parserVersion,
      redirectChain: fetched.redirectChain,
      effectiveTime: deriveEffectiveTime(summary),
      recordedTime: completedAt,
      freshnessHorizonMinutes,
    };
    const receiptValidation = validateSourceReceipt(receipt);
    if (!receiptValidation.valid) {
      // A malformed receipt must never ride a success outcome. Fail closed.
      return {
        ...base,
        completedAt,
        outcome: "FAILED",
        holdReason: null,
        receivedBytes: fetched.bytes,
        receipt: null,
        http: null,
        summary: null,
        error: `Receipt failed schema validation: ${receiptValidation.errors.join("; ")}`,
      };
    }
    return {
      ...base,
      completedAt,
      outcome: fetched.unchanged ? "NOT_MODIFIED" : "FETCHED",
      holdReason: null,
      receivedBytes: fetched.bytes,
      receipt,
      http: {
        status: fetched.status,
        finalUrl: fetched.finalUrl,
        redirectChain: fetched.redirectChain,
        contentType: fetched.contentType,
        etag: fetched.etag,
        lastModified: fetched.lastModified,
        bytes: fetched.bytes,
        sha256: fetched.sha256,
      },
      summary,
      error: null,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    if (error instanceof PolicyHoldError) {
      return {
        ...base,
        completedAt,
        outcome: "HELD",
        holdReason: error.holdReason,
        receivedBytes: Number(error.receivedBytes) || 0,
        receipt: null,
        http: null,
        summary: null,
        error: error.message,
      };
    }
    return {
      ...base,
      completedAt,
      outcome: "FAILED",
      holdReason: null,
      receivedBytes: Number(error?.receivedBytes) || 0,
      receipt: null,
      http: null,
      summary: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runSourceDoctor({
  registryPath = DEFAULT_REGISTRY_PATH,
  live = false,
  includeDisabled = false,
  fetchImpl,
} = {}) {
  const raw = await readFile(registryPath, "utf8");
  const registry = JSON.parse(raw);
  const validation = validateRegistry(registry);
  const receipt = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    registryPath,
    registrySha256: createHash("sha256").update(raw).digest("hex"),
    validation,
    liveRequested: live,
    sourcesConsidered: 0,
    results: [],
  };

  if (!validation.valid || !live) return receipt;

  const sources = registry.sources.filter((source) => includeDisabled || source.enabled);
  receipt.sourcesConsidered = sources.length;
  for (const source of sources) {
    receipt.results.push(
      await pollSource(source, {
        fetchImpl,
        timeoutMs: registry.policy.defaultTimeoutMs,
        maxBytes: registry.policy.defaultMaxBytes,
        maxRedirects: registry.policy.maxRedirects,
        redirectPolicy: registry.policy.redirectPolicy,
        userAgent: registry.policy.userAgent,
        defaultFreshnessHorizonMinutes: registry.policy.defaultFreshnessHorizonMinutes,
      }),
    );
  }
  return receipt;
}

function parseArgs(argv) {
  const args = { live: false, includeDisabled: false, registryPath: DEFAULT_REGISTRY_PATH, outputPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--live") args.live = true;
    else if (arg === "--include-disabled") args.includeDisabled = true;
    else if (arg === "--registry") args.registryPath = resolve(argv[++index]);
    else if (arg === "--output") args.outputPath = resolve(argv[++index]);
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/nova/source-doctor.mjs [--live] [--include-disabled] [--registry PATH] [--output PATH]");
    console.log("Default mode validates the registry without making network requests.");
    return;
  }
  const receipt = await runSourceDoctor(args);
  const json = `${JSON.stringify(receipt, null, 2)}\n`;
  if (args.outputPath) {
    await mkdir(dirname(args.outputPath), { recursive: true });
    await writeFile(args.outputPath, json, "utf8");
  }
  process.stdout.write(json);
  if (!receipt.validation.valid || receipt.results.some((result) => result.outcome === "FAILED" || result.outcome === "HELD")) {
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
