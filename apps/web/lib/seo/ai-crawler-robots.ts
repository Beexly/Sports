/**
 * RFC 9309 compliant robots.txt rules for Galaxy Sports Edge.
 *
 * Crucial RFC 9309 invariant: any named User-agent group completely overrides
 * the wildcard (*) group for that crawler instead of inheriting from it.
 * Therefore PRIVATE_DISALLOW_PATHS MUST be repeated inside every named
 * AI-search and user-fetch crawler group so /api/, /cockpit/, and /dashboard/
 * remain protected while public pages, /llms*.txt, and /.well-known/* stay
 * 100% crawlable for global search and AI assistant citations.
 */
import type { MetadataRoute } from "next";

export const PRIVATE_DISALLOW_PATHS: string[] = [
  "/api/",
  "/cockpit/",
  "/dashboard/",
  "/admin/",
  "/_next/data/",
];

export const PUBLIC_AGENT_ALLOW_PATHS: string[] = [
  "/",
  "/llms.txt",
  "/llms-full.txt",
  "/.well-known/agent-card.json",
  "/.well-known/agent.json",
  "/.well-known/mcp",
  "/.well-known/mcp.json",
  "/.well-known/mcp/server-card.json",
  "/.well-known/ai-plugin.json",
  "/api/mcp",
  "/api/agent/",
];

export const AI_SEARCH_AND_CITATION_BOTS: string[] = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "DuckAssistBot",
];

export const OPTIONAL_MODEL_TRAINING_BOTS: string[] = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
];

export function buildGseRobotsMetadata(options?: {
  allowFoundationTraining?: boolean;
}): MetadataRoute.Robots {
  const allowTraining = options?.allowFoundationTraining ?? false;

  const searchRules = AI_SEARCH_AND_CITATION_BOTS.map((ua) => ({
    userAgent: ua,
    allow: PUBLIC_AGENT_ALLOW_PATHS,
    disallow: PRIVATE_DISALLOW_PATHS,
  }));

  const trainingRules = OPTIONAL_MODEL_TRAINING_BOTS.map((ua) =>
    allowTraining
      ? {
          userAgent: ua,
          allow: ["/llms.txt", "/llms-full.txt", "/accountability", "/picks", "/pricing"],
          disallow: PRIVATE_DISALLOW_PATHS,
        }
      : {
          userAgent: ua,
          allow: ["/llms.txt", "/llms-full.txt"],
          disallow: ["/"],
        },
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_AGENT_ALLOW_PATHS,
        disallow: PRIVATE_DISALLOW_PATHS,
      },
      ...searchRules,
      ...trainingRules,
    ],
    sitemap: "https://www.galaxysportsedge.com/sitemap.xml",
    host: "https://www.galaxysportsedge.com",
  };
}
