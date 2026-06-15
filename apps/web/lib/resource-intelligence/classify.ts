/**
 * Resource Intelligence — classifier (the rights gate for raw resources).
 *
 * Ordered, conservative, deterministic. Order matters:
 *   1. noise            → not a real resource
 *   2. QUARANTINE       → piracy / evasion / circumvention. TERMINAL. Wins over everything.
 *   3. approved_direct  → small curated allowlist of vetted, safe, high-value tools
 *   4. owner_review     → scraping/crawling, third-party sports data, RSS/YT/podcast/API
 *                         ingestion, and legal-gray tools — gated behind source-provider +
 *                         clearance engine; NEVER auto-promoted
 *   5. positive buckets → prototype / roadmap / internal_reference by functional category
 *
 * Invariant enforced by tests: anything matching a quarantine signal can ONLY ever
 * receive disposition "quarantine". Nothing dangerous can reach an approved bucket.
 */

import type {
  ClassifiedResource,
  RawResourceEntry,
  ResourceCategory,
  ResourceDisposition,
  ResourceRiskTier,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Rule = { readonly re: RegExp; readonly label: string };

function firstMatch(haystack: string, rules: readonly Rule[]): Rule | undefined {
  return rules.find((r) => r.re.test(haystack));
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['"`’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function stableId(name: string): string {
  const slug = normalizeName(name).replace(/\s+/g, "-");
  return `res_${slug || "unknown"}`;
}

// ─── Quarantine signals (TERMINAL) ──────────────────────────────────────────────
// Unambiguous piracy, account-gated circumvention, or anti-control evasion.

const QUARANTINE_RULES: readonly Rule[] = [
  // Piracy distribution. "torrent" matches without a word boundary so compound
  // site names (LimeTorrents, JapaneseTorrents) cannot evade the gate.
  { re: /torrent/, label: "torrent/piracy distribution" },
  { re: /\bmagnet\b/, label: "magnet/piracy link" },
  { re: /\bwarez\b/, label: "warez" },
  // No-boundary match (no English false positives) so compounds like "SomeIPTV"
  // / "FreePPV" cannot evade the gate.
  { re: /iptv/, label: "IPTV (unlicensed TV)" },
  { re: /\bppv\b|ppv (stream|mirror)/, label: "PPV mirror" },
  { re: /m3u8?/, label: "m3u playlist (unlicensed streams)" },
  { re: /\bnzb\b|\busenet\b/, label: "usenet/NZB piracy" },
  { re: /\bdebrid\b/, label: "debrid (piracy unlock)" },
  { re: /\b(repack|scene release|ddl|nulled)\b/, label: "scene/repack/DDL/nulled piracy" },
  { re: /\bpiracy\b/, label: "explicit piracy resource" },
  { re: /streaming (site|app|aggregat)/, label: "unlicensed streaming aggregator" },
  { re: /\b(putlocker|soap2day|fmovies|123movies|primewire|sflix)\b/, label: "known piracy streaming site" },
  { re: /\bfree (movies|tv|anime|sports|live tv)\b/, label: "free copyrighted media (piracy)" },
  // ROM / abandonware acquisition (emulators themselves are not quarantined here)
  { re: /\broms?\b|\bromset\b|\bno-intro\b|\bredump\b/, label: "ROM acquisition (piracy)" },
  { re: /\babandonware\b/, label: "abandonware (piracy-gray, blocked)" },
  // Cracked software / license circumvention
  { re: /\bcrack(ed|s|ing)?\b/, label: "cracked software" },
  { re: /\bkeygen/, label: "keygen" },
  { re: /pre-?(activated|cracked)/, label: "pre-activated/cracked" },
  { re: /\bactivator\b|kms\s?pico|massgrave|(windows|office) activation/, label: "software activation bypass" },
  { re: /\bserial keys?\b|\blicense keys?\b.*(free|share)/, label: "shared license keys" },
  // Access-control / evasion
  { re: /\bbypass/, label: "access bypass" },
  { re: /byp4xx|\b403\b.*(bypass|forbidden)/, label: "403/forbidden bypass" },
  { re: /captcha (solv|bypass|farm)|solve captcha/, label: "CAPTCHA bypass" },
  { re: /paywall/, label: "paywall bypass" },
  { re: /(remove|removal|strip).{0,12}drm|\bwidevine\b|drm.{0,12}(remov|strip)/, label: "DRM removal" },
  { re: /login bypass|cloudflare bypass|bot detection bypass/, label: "auth/anti-bot bypass" },
  { re: /\bjailbreak/, label: "jailbreak" },
  { re: /leaked (system )?prompt|system prompt leak|jailbreak prompt/, label: "leaked/jailbreak prompts" },
  { re: /(rotating|rotate) prox|proxy rotation|circumvent (ip|block)/, label: "proxy rotation to circumvent controls" },
  { re: /fake account|account (generator|creator)|credential (stuff|dump)/, label: "fake account / credential abuse" },
];

// ─── Owner-review signals (gated, never auto-promoted) ───────────────────────────

const OWNER_REVIEW_RULES: readonly Rule[] = [
  { re: /\bscrap(e|er|ers|ing)\b/, label: "scraping tool — clearance gate required" },
  { re: /\bcrawl(er|ers|ing)?\b|\bspider\b/, label: "crawler — clearance gate required" },
  { re: /\b(rss|atom)\b/, label: "RSS/feed ingestion candidate — source-provider review" },
  { re: /\byoutube\b/, label: "YouTube ingestion candidate — ToS/source review" },
  { re: /\bpodcast\b/, label: "podcast ingestion candidate — source review" },
  { re: /\breddit\b/, label: "Reddit ingestion candidate — source review" },
  { re: /\b(nfl|nba|mlb|nhl|soccer|football|sportsbook|odds|betting|fixtures?|standings?)\b/, label: "sports-data source — StatKing/source-provider review" },
  { re: /\bdataset\b/, label: "dataset — license review required" },
  { re: /\b(api|feed)s?\b/, label: "third-party API/feed — license + terms review" },
  // Legal-gray dual-use tools: real use, but needs a human/legal call.
  { re: /\badblock|ad-?block/, label: "adblock (legal-gray) — owner review" },
  { re: /\bdeobfuscat/, label: "deobfuscator (dual-use) — owner review" },
  { re: /\btemp(orary)? mail|disposable email/, label: "disposable email (gray) — owner review" },
  { re: /\bosint\b/, label: "OSINT (dual-use) — owner review" },
];

// ─── Curated approved-direct allowlist (safe, high-value) ────────────────────────
// Sourced from the handoff BENEFIT_MATRIX top-safe set. Matched on normalized name.

const APPROVED_DIRECT_ALLOWLIST: ReadonlySet<string> = new Set([
  "playwright",
  "can i use",
  "caniuse",
  "bruno",
  "httpie",
  "redoc",
  "snyk",
  "wazuh",
  "security onion",
  "umami",
  "goaccess",
  "cloudflare web analytics",
  "grafana",
  "dbeaver",
  "duckdb",
  "qdrant",
  "docker",
  "portainer",
  "openrouter",
  "artificial analysis",
  "feedly",
]);

// ─── Functional category (prioritization only) ───────────────────────────────────

const CATEGORY_RULES: readonly { readonly category: ResourceCategory; readonly re: RegExp }[] = [
  { category: "testing_qa", re: /\b(test|qa|playwright|cypress|selenium|lighthouse|e2e|accessibility|a11y|caniuse|can i use|checklist|visual regression)\b/ },
  { category: "security", re: /\b(security|snyk|wazuh|vuln|cve|pentest|firewall|fail2ban|antivirus|encryption|password manager|hardening)\b/ },
  { category: "analytics", re: /\b(analytics|umami|goaccess|plausible|matomo|metrics|telemetry|grafana)\b/ },
  { category: "ai_ml_cost", re: /\b(ai|llm|gpt|openrouter|embedding|vector|qdrant|artificial analysis|model cost|inference)\b/ },
  { category: "api_tooling", re: /\b(api|bruno|httpie|postman|openapi|swagger|redoc|graphql|rest client)\b/ },
  { category: "data_ops", re: /\b(database|sql|duckdb|dbeaver|etl|warehouse|postgres|parquet|data ops)\b/ },
  { category: "infrastructure", re: /\b(docker|portainer|kubernetes|k8s|nginx|self-host|container|vps|deploy|reverse proxy)\b/ },
  { category: "design_ux", re: /\b(design|ux|ui|figma|color|font|icon|css|palette|mockup|wireframe)\b/ },
  { category: "content_intel", re: /\b(feedly|rss|news|content|seo|metadata|podcast)\b/ },
  { category: "sports_data", re: /\b(sport|nfl|nba|mlb|odds|score|fixture|standings|fantasy)\b/ },
  { category: "scraping_crawling", re: /\b(scrap|crawl|spider|extract)\b/ },
  { category: "system_tool", re: /\b(windows|system|registry|taskbar|debloat|uninstall|driver|tweak)\b/ },
  { category: "dev_tool", re: /\b(git|cli|terminal|editor|ide|compiler|package manager)\b/ },
];

function categorize(haystack: string): ResourceCategory {
  return CATEGORY_RULES.find((c) => c.re.test(haystack))?.category ?? "uncategorized";
}

/**
 * Safe-to-adopt operational categories. These are tools WE run in our own
 * environment (test, security, analytics, infra, data-ops, API, design, content,
 * AI-cost, dev) — they carry no third-party-data rights risk, so they are
 * approved-direct. Specific security/license vetting still happens at adoption;
 * "approved-direct" means cleared of the RIGHTS gate, not that every tool is
 * individually audited. Data sources / scraping never reach here — they are
 * routed to owner_review first.
 */
const SAFE_ADOPT_CATEGORIES: ReadonlySet<ResourceCategory> = new Set<ResourceCategory>([
  "testing_qa",
  "security",
  "analytics",
  "ai_ml_cost",
  "api_tooling",
  "data_ops",
  "infrastructure",
  "design_ux",
  "content_intel",
  "dev_tool",
]);

// ─── Noise detection at the resource level ───────────────────────────────────────

function isNoiseName(name: string, normalized: string): boolean {
  if (normalized.length < 2) return true;
  if (name.length > 50) return true; // a sentence, not a tool name
  if (/^(see|the|a|an|and|with|for|via|note|tip|warning|e\.?g\.?|etc)\b/i.test(name.trim())) return true;
  if (/^\d+$/.test(normalized)) return true;
  return false;
}

// ─── Classify ────────────────────────────────────────────────────────────────────

export type Classification = {
  readonly disposition: ResourceDisposition;
  readonly riskTier: ResourceRiskTier;
  readonly category: ResourceCategory;
  readonly gateRequired: boolean;
  readonly reasons: readonly string[];
};

export function classifyEntry(entry: RawResourceEntry): Classification {
  const normalized = normalizeName(entry.name);
  const haystack = `${entry.name} ${entry.description} ${entry.section}`.toLowerCase();
  const category = categorize(haystack);

  // 1. Noise
  if (isNoiseName(entry.name, normalized)) {
    return { disposition: "rejected_noise", riskTier: "none", category, gateRequired: false, reasons: ["not a recognizable resource name"] };
  }

  // 2. Quarantine (terminal) — wins over everything below.
  const quarantine = firstMatch(haystack, QUARANTINE_RULES);
  if (quarantine) {
    return {
      disposition: "quarantine",
      riskTier: "blocked",
      category: category === "uncategorized" ? "media_piracy" : category,
      gateRequired: true,
      reasons: [`quarantined: ${quarantine.label}`],
    };
  }

  // 3. Approved-direct allowlist (only reachable if NOT quarantined).
  if (APPROVED_DIRECT_ALLOWLIST.has(normalized)) {
    return {
      disposition: "approved_direct",
      riskTier: "low",
      category,
      gateRequired: false,
      reasons: ["curated safe high-value tool (approved-direct allowlist)"],
    };
  }

  // 4. Owner review (gated; never auto-promoted).
  const owner = firstMatch(haystack, OWNER_REVIEW_RULES);
  if (owner) {
    return {
      disposition: "owner_review",
      riskTier: "medium",
      category: category === "uncategorized" ? "sports_data" : category,
      gateRequired: true,
      reasons: [owner.label],
    };
  }

  // 5. Safe operational tooling (we run it; no third-party-data rights risk) → approved-direct.
  if (SAFE_ADOPT_CATEGORIES.has(category)) {
    return {
      disposition: "approved_direct",
      riskTier: "low",
      category,
      gateRequired: false,
      reasons: [`safe operational category (${category}) — cleared of rights gate; vet specifics at adoption`],
    };
  }

  // 6. Remaining safe but unrecognized / not-yet-relevant (system tweaks, uncategorized) → reference.
  return { disposition: "approved_internal_reference", riskTier: "none", category, gateRequired: false, reasons: ["safe — reference only"] };
}

/** Build a ClassifiedResource from one representative entry (after dedupe merge). */
export function classifyResource(
  entry: RawResourceEntry,
  occurrences: number,
): ClassifiedResource {
  const c = classifyEntry(entry);
  return {
    id: stableId(entry.name),
    name: entry.name,
    normalizedName: normalizeName(entry.name),
    description: entry.description,
    section: entry.section,
    sourceFile: entry.sourceFile,
    firstLine: entry.lineNumber,
    occurrences,
    disposition: c.disposition,
    riskTier: c.riskTier,
    category: c.category,
    gateRequired: c.gateRequired,
    reasons: c.reasons,
  };
}
