/**
 * Tool Registry — approved extraction tools, their purposes, and allowed modes.
 *
 * Evasion tools (CAPTCHA bypass, stealth crawlers, proxy rotators for access control
 * avoidance, login automation) are explicitly NOT registered and must not be added.
 */

import type { ExtractionMode } from "./extraction-modes";

// ─── Tool definitions ─────────────────────────────────────────────────────────

export type ToolId =
  | "trafilatura"
  | "crawlee-python"
  | "playwright"
  | "autoscraper"
  | "easyspider"
  | "fetch-native"
  | "manual-operator";

export type ToolEntry = {
  readonly tool_id: ToolId;
  readonly name: string;
  readonly description: string;
  readonly allowed_modes: readonly ExtractionMode[];
  readonly requires_browser: boolean;
  readonly evasion_capable: boolean;
  readonly approved: boolean;
  readonly approved_for_production: boolean;
  readonly notes: string;
};

export const TOOL_REGISTRY: readonly ToolEntry[] = [
  {
    tool_id: "trafilatura",
    name: "trafilatura",
    description:
      "Python library for clean article/text extraction from HTML. " +
      "Removes boilerplate; extracts main article content. No headless browser.",
    allowed_modes: [
      "clean_text_extract",
      "public_logged_off_fact_extract",
    ],
    requires_browser: false,
    evasion_capable: false,
    approved: true,
    approved_for_production: true,
    notes: "MIT license. Use for text extraction from approved sources only. Rate-limit all requests.",
  },
  {
    tool_id: "crawlee-python",
    name: "crawlee-python (Apify)",
    description:
      "Python web-scraping framework. HTTP and browser crawling. " +
      "Approved for non-evasive crawling of permitted sources.",
    allowed_modes: [
      "public_logged_off_fact_extract",
      "permissioned_crawl",
      "vendor_trial_ingest",
    ],
    requires_browser: false,
    evasion_capable: false,
    approved: true,
    approved_for_production: true,
    notes:
      "Apache-2.0 license. Do not enable stealth plugins or proxy rotation for access-control avoidance. " +
      "Rate-limiting and source-ID headers required on all requests.",
  },
  {
    tool_id: "playwright",
    name: "Playwright",
    description:
      "Browser automation library. Approved for QA testing and approved browser automation only. " +
      "NOT approved for anti-bot evasion.",
    allowed_modes: [
      "public_logged_off_fact_extract",
      "permissioned_crawl",
      "manual_research_note",
    ],
    requires_browser: true,
    evasion_capable: false,
    approved: true,
    approved_for_production: false,
    notes:
      "Apache-2.0 license. Approved for QA and approved browser automation only. " +
      "Never use stealth mode, fingerprint spoofing, or CAPTCHA bypass plugins.",
  },
  {
    tool_id: "autoscraper",
    name: "autoscraper",
    description: "Pattern-discovery scraper for internal lab/research use only.",
    allowed_modes: [],
    requires_browser: false,
    evasion_capable: false,
    approved: true,
    approved_for_production: false,
    notes:
      "INTERNAL PATTERN DISCOVERY LAB ONLY. " +
      "Do not run against production sources without separate clearance. " +
      "Outputs are for pattern discovery; never ingest results directly.",
  },
  {
    tool_id: "easyspider",
    name: "EasySpider",
    description: "No-code visual web scraping tool for analyst / manual research workflows.",
    allowed_modes: ["manual_research_note"],
    requires_browser: true,
    evasion_capable: false,
    approved: true,
    approved_for_production: false,
    notes:
      "ANALYST / MANUAL RESEARCH ONLY. " +
      "Do not connect to production data pipeline. " +
      "Outputs reviewed by human before any use.",
  },
  {
    tool_id: "fetch-native",
    name: "Native fetch / HTTP client",
    description:
      "Standard HTTP fetch (Node.js / browser). Used for licensed API calls and open-dataset downloads.",
    allowed_modes: [
      "licensed_api_ingest",
      "open_dataset_ingest",
      "public_logged_off_fact_extract",
      "vendor_trial_ingest",
    ],
    requires_browser: false,
    evasion_capable: false,
    approved: true,
    approved_for_production: true,
    notes:
      "Standard HTTP. Attach source_id header on all requests. Rate-limit per source config. " +
      "Respect Retry-After headers. Log all requests with source_id and timestamp.",
  },
  {
    tool_id: "manual-operator",
    name: "Manual operator",
    description: "A human operator manually reviewing, copying, or noting information.",
    allowed_modes: ["manual_research_note"],
    requires_browser: false,
    evasion_capable: false,
    approved: true,
    approved_for_production: true,
    notes:
      "Manual research notes only. No automated extraction. No protected content copied. " +
      "Notes must be attributed to source_id and include review date.",
  },
];

export function getToolEntry(toolId: ToolId): ToolEntry | undefined {
  return TOOL_REGISTRY.find((t) => t.tool_id === toolId);
}

export function getApprovedProductionTools(): readonly ToolEntry[] {
  return TOOL_REGISTRY.filter((t) => t.approved && t.approved_for_production);
}

export function isToolApprovedForMode(toolId: ToolId, mode: ExtractionMode): boolean {
  const entry = getToolEntry(toolId);
  if (!entry || !entry.approved) return false;
  return (entry.allowed_modes as readonly string[]).includes(mode);
}
