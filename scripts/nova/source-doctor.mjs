#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../..");
const DEFAULT_REGISTRY_PATH = resolve(REPO_ROOT, "data/nova/official-source-registry.json");

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

const VALID_PARSERS = new Set([
  "structured_page_delta",
  "github_releases_json",
  "rss_atom_metadata",
  "cisa_kev_json",
]);

const CONTENT_TYPES_BY_PARSER = Object.freeze({
  structured_page_delta: ["text/html", "text/plain", "application/xhtml+xml"],
  github_releases_json: ["application/json", "application/vnd.github+json", "text/json"],
  rss_atom_metadata: ["application/rss+xml", "application/atom+xml", "application/xml", "text/xml", "text/plain"],
  cisa_kev_json: ["application/json", "text/json", "text/plain"],
});

function asNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function canonicalHost(value) {
  return String(value).trim().toLowerCase().replace(/\.$/, "");
}

function contentTypeBase(value) {
  return String(value ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function validateRegistry(registry) {
  const errors = [];
  const warnings = [];

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return { valid: false, errors: ["Registry must be a JSON object."], warnings };
  }
  if (registry.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (!registry.policy || typeof registry.policy !== "object") errors.push("policy object is required.");
  if (!Array.isArray(registry.sources)) errors.push("sources must be an array.");
  if (!Array.isArray(registry.sources)) return { valid: false, errors, warnings };

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
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Only HTTPS URLs are allowed.");
  if (parsed.username || parsed.password) throw new Error("Credentials in source URLs are forbidden.");
  const hosts = new Set(allowedHosts.map(canonicalHost));
  if (!hosts.has(canonicalHost(parsed.hostname))) {
    throw new Error(`Host ${parsed.hostname} is not allowlisted.`);
  }
  return parsed;
}

async function readBoundedBody(response, maxBytes) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Declared response size ${declared} exceeds ${maxBytes} bytes.`);
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
      if (total > maxBytes) {
        await reader.cancel("NOVA byte ceiling exceeded");
        throw new Error(`Response exceeded ${maxBytes} bytes.`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

export async function fetchBounded(source, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is unavailable.");

  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 1_048_576;
  const maxRedirects = options.maxRedirects ?? 2;
  const userAgent = options.userAgent ?? "GSE-NOVA/0.1 read-only opportunity intelligence";
  const conditional = options.conditional ?? {};

  let current = assertAllowedUrl(source.url, source.allowedHosts);
  let redirects = 0;

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
          accept: "application/json, application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, text/plain;q=0.8",
          "user-agent": userAgent,
          ...(conditional.etag ? { "if-none-match": conditional.etag } : {}),
          ...(conditional.lastModified ? { "if-modified-since": conditional.lastModified } : {}),
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects >= maxRedirects) throw new Error(`Redirect ceiling ${maxRedirects} exceeded.`);
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect ${response.status} omitted Location.`);
      current = assertAllowedUrl(new URL(location, current).toString(), source.allowedHosts);
      redirects += 1;
      continue;
    }

    const baseType = contentTypeBase(response.headers.get("content-type"));
    const allowedTypes = CONTENT_TYPES_BY_PARSER[source.parser] ?? [];
    if (response.status !== 304 && !allowedTypes.includes(baseType)) {
      throw new Error(`Content type ${baseType || "missing"} is not allowed for ${source.parser}.`);
    }

    if (response.status === 304) {
      return {
        status: 304,
        finalUrl: current.toString(),
        redirects,
        unchanged: true,
        contentType: baseType,
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
      redirects,
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
  return value.slice(0, 20).map((release) => ({
    id: String(release?.id ?? release?.tag_name ?? ""),
    tag: String(release?.tag_name ?? ""),
    name: String(release?.name ?? release?.tag_name ?? ""),
    publishedAt: release?.published_at ?? null,
    prerelease: Boolean(release?.prerelease),
    draft: Boolean(release?.draft),
    url: release?.html_url ?? null,
  })).filter((release) => release.id && release.tag);
}

function summarizeCisaKev(value) {
  const vulnerabilities = Array.isArray(value?.vulnerabilities) ? value.vulnerabilities : [];
  return vulnerabilities.slice(0, 100).map((item) => ({
    id: String(item?.cveID ?? ""),
    vendor: String(item?.vendorProject ?? ""),
    product: String(item?.product ?? ""),
    addedAt: item?.dateAdded ?? null,
    dueAt: item?.dueDate ?? null,
  })).filter((item) => item.id);
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
  return blocks.slice(0, 100).map((block) => {
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const id = block.match(/<(?:guid|id)[^>]*>([\s\S]*?)<\/(?:guid|id)>/i)?.[1] ?? "";
    const date = block.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1] ?? "";
    const link = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]
      ?? block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
      ?? "";
    return {
      id: decodeXml(id || link || title),
      title: decodeXml(title),
      publishedAt: decodeXml(date) || null,
      url: decodeXml(link) || null,
    };
  }).filter((item) => item.id && item.title);
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

export async function pollSource(source, options = {}) {
  const startedAt = new Date();
  const baseReceipt = {
    sourceId: source.id,
    startedAt: startedAt.toISOString(),
    parser: source.parser,
    parserVersion: 1,
    externalActions: "READ_ONLY_GET",
    installAttempted: false,
    executeAttempted: false,
  };

  try {
    const fetched = await fetchBounded(source, options);
    return {
      ...baseReceipt,
      completedAt: new Date().toISOString(),
      outcome: fetched.unchanged ? "UNCHANGED" : "FETCHED",
      http: {
        status: fetched.status,
        finalUrl: fetched.finalUrl,
        redirects: fetched.redirects,
        contentType: fetched.contentType,
        etag: fetched.etag,
        lastModified: fetched.lastModified,
        bytes: fetched.bytes,
        sha256: fetched.sha256,
      },
      summary: fetched.body === null ? null : summarizeSourceBody(source, fetched.body),
      error: null,
    };
  } catch (error) {
    return {
      ...baseReceipt,
      completedAt: new Date().toISOString(),
      outcome: "FAILED_CLOSED",
      http: null,
      summary: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runSourceDoctor({ registryPath = DEFAULT_REGISTRY_PATH, live = false, includeDisabled = false, fetchImpl } = {}) {
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
    receipt.results.push(await pollSource(source, {
      fetchImpl,
      timeoutMs: registry.policy.defaultTimeoutMs,
      maxBytes: registry.policy.defaultMaxBytes,
      maxRedirects: registry.policy.maxRedirects,
      userAgent: registry.policy.userAgent,
    }));
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
  if (!receipt.validation.valid || receipt.results.some((result) => result.outcome === "FAILED_CLOSED")) {
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
