import type { OpportunityObservation, OpportunitySource } from "./types";

export interface ParsedOpportunitySnapshot {
  readonly sourceId: string;
  readonly capturedAt: string;
  readonly payloadFingerprint: string;
  readonly observations: readonly OpportunityObservation[];
  readonly warnings: readonly string[];
  /** Raw source bodies are intentionally never returned or persisted. */
  readonly rawBodyRetained: false;
}

interface UnknownRecord { readonly [key: string]: unknown }

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function arrayField(record: UnknownRecord, key: string): readonly unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function fingerprint(value: string): string {
  // Deterministic, dependency-free content fingerprint for change detection.
  // The persistence adapter may additionally store a cryptographic SHA-256.
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function validDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fallback;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function xmlField(block: string, names: readonly string[]): string | null {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function xmlLink(block: string): string | null {
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return atom?.trim() ?? xmlField(block, ["link"]);
}

function parseRssOrAtom(source: OpportunitySource, body: string, nowIso: string): readonly OpportunityObservation[] {
  const blocks = body.match(/<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks.slice(0, 100).flatMap((block): readonly OpportunityObservation[] => {
    const title = xmlField(block, ["title"]);
    const url = xmlLink(block);
    const published = xmlField(block, ["pubDate", "published", "updated"]);
    const externalId = xmlField(block, ["guid", "id"]) ?? url ?? (title ? fingerprint(title).slice(0, 16) : null);
    if (!title || !url || !externalId) return [];
    const labels = [...new Set([source.transport, ...source.classes])];
    const publishedAt = validDate(published, nowIso);
    return [{
      sourceId: source.id,
      externalId,
      title,
      url,
      publishedAt,
      observedAt: nowIso,
      contentFingerprint: fingerprint(stableJson({ title, url, publishedAt, labels })),
      labels,
    }];
  });
}

function parseGitHubReleases(source: OpportunitySource, value: unknown, nowIso: string): readonly OpportunityObservation[] {
  if (!Array.isArray(value)) throw new Error(`${source.id} expected a JSON array of GitHub releases.`);
  return value.slice(0, 100).flatMap((raw): readonly OpportunityObservation[] => {
    if (!isRecord(raw) || raw["draft"] === true) return [];
    const idValue = raw["id"];
    const tag = stringField(raw, "tag_name");
    const title = stringField(raw, "name") ?? tag;
    const url = stringField(raw, "html_url");
    const publishedAt = validDate(stringField(raw, "published_at") ?? stringField(raw, "created_at"), nowIso);
    if ((typeof idValue !== "number" && typeof idValue !== "string") || !title || !url) return [];
    const labels = ["github-release", raw["prerelease"] === true ? "prerelease" : "stable", ...source.classes];
    return [{
      sourceId: source.id,
      externalId: String(idValue),
      title,
      url,
      publishedAt,
      observedAt: nowIso,
      contentFingerprint: fingerprint(stableJson({ id: idValue, tag, title, url, publishedAt, prerelease: raw["prerelease"] === true })),
      labels,
    }];
  });
}

function parseHuggingFace(source: OpportunitySource, value: unknown, nowIso: string): readonly OpportunityObservation[] {
  if (!Array.isArray(value)) throw new Error(`${source.id} expected a JSON array of models.`);
  return value.slice(0, 100).flatMap((raw): readonly OpportunityObservation[] => {
    if (!isRecord(raw)) return [];
    const id = stringField(raw, "id") ?? stringField(raw, "modelId");
    if (!id) return [];
    const lastModified = validDate(stringField(raw, "lastModified") ?? stringField(raw, "createdAt"), nowIso);
    const tags = arrayField(raw, "tags").filter((item): item is string => typeof item === "string").slice(0, 20);
    const pipelineTag = stringField(raw, "pipeline_tag");
    const labels = [...new Set(["huggingface-model", ...(pipelineTag ? [pipelineTag] : []), ...tags, ...source.classes])];
    const selected = { id, lastModified, pipelineTag, tags, private: raw["private"] === true, gated: raw["gated"] ?? false };
    return [{
      sourceId: source.id,
      externalId: id,
      title: id,
      url: `https://huggingface.co/${id}`,
      publishedAt: lastModified,
      observedAt: nowIso,
      contentFingerprint: fingerprint(stableJson(selected)),
      labels,
    }];
  });
}

function parseMcpRegistry(source: OpportunitySource, value: unknown, nowIso: string): readonly OpportunityObservation[] {
  if (!isRecord(value)) throw new Error(`${source.id} expected a JSON object.`);
  const servers = arrayField(value, "servers");
  return servers.slice(0, 100).flatMap((raw): readonly OpportunityObservation[] => {
    if (!isRecord(raw)) return [];
    const server = isRecord(raw["server"]) ? raw["server"] : raw;
    const meta = isRecord(raw["_meta"]) ? raw["_meta"] : {};
    const name = stringField(server, "name");
    const version = stringField(server, "version") ?? "latest";
    if (!name) return [];
    const repository = isRecord(server["repository"]) ? server["repository"] : {};
    const repositoryUrl = stringField(repository, "url");
    const websiteUrl = stringField(server, "websiteUrl") ?? stringField(server, "homepage");
    const url = repositoryUrl ?? websiteUrl ?? `https://registry.modelcontextprotocol.io/v0.1/servers?search=${encodeURIComponent(name)}`;
    const publishedAt = validDate(
      stringField(meta, "publishedAt") ?? stringField(meta, "updatedAt") ?? stringField(server, "updatedAt"),
      nowIso,
    );
    const status = stringField(meta, "status") ?? stringField(server, "status");
    const labels = [...new Set(["mcp-server", ...(status ? [status] : []), ...source.classes])];
    const selected = { name, version, repositoryUrl, websiteUrl, status, publishedAt };
    return [{
      sourceId: source.id,
      externalId: `${name}@${version}`,
      title: `${name} ${version}`,
      url,
      publishedAt,
      observedAt: nowIso,
      contentFingerprint: fingerprint(stableJson(selected)),
      labels,
    }];
  });
}

function parseGenericJson(source: OpportunitySource, value: unknown, nowIso: string): readonly OpportunityObservation[] {
  const payloadFingerprint = fingerprint(stableJson(value));
  return [{
    sourceId: source.id,
    externalId: `${source.id}-snapshot`,
    title: `${source.name} metadata snapshot`,
    url: source.url,
    publishedAt: nowIso,
    observedAt: nowIso,
    contentFingerprint: payloadFingerprint,
    labels: ["json-snapshot", ...source.classes],
  }];
}

function parseHtmlSnapshot(source: OpportunitySource, body: string, nowIso: string): readonly OpportunityObservation[] {
  const pageTitle = decodeEntities(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? source.name);
  return [{
    sourceId: source.id,
    externalId: `${source.id}-page`,
    title: pageTitle || source.name,
    url: source.url,
    publishedAt: nowIso,
    observedAt: nowIso,
    contentFingerprint: fingerprint(body),
    labels: ["page-snapshot", ...source.classes],
  }];
}

export function parseOpportunitySourcePayload(
  source: OpportunitySource,
  body: string,
  now: Date = new Date(),
): ParsedOpportunitySnapshot {
  const nowIso = now.toISOString();
  const warnings: string[] = [];
  let observations: readonly OpportunityObservation[];

  if (source.transport === "rss" || source.transport === "atom") {
    observations = parseRssOrAtom(source, body, nowIso);
  } else if (source.transport === "github_releases") {
    observations = parseGitHubReleases(source, JSON.parse(body) as unknown, nowIso);
  } else if (source.transport === "json_api") {
    const value = JSON.parse(body) as unknown;
    if (source.id === "huggingface-hub-discovery") observations = parseHuggingFace(source, value, nowIso);
    else if (source.id === "mcp-official-registry") observations = parseMcpRegistry(source, value, nowIso);
    else observations = parseGenericJson(source, value, nowIso);
  } else {
    observations = parseHtmlSnapshot(source, body, nowIso);
    if (source.transport === "manual_snapshot") warnings.push("Manual snapshot parsed; no autonomous fetch was authorized.");
    if (source.transport === "webhook") warnings.push("Webhook payload treated as an immutable source snapshot.");
  }

  if (observations.length === 0) warnings.push("No valid metadata observations were extracted.");
  return {
    sourceId: source.id,
    capturedAt: nowIso,
    payloadFingerprint: fingerprint(body),
    observations,
    warnings,
    rawBodyRetained: false,
  };
}
