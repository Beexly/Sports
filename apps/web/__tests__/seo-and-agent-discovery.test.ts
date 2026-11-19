import { describe, it, expect } from "vitest";
import { buildGseAgentCard } from "../app/.well-known/agent-card.json/route";
import { buildGseMcpServerCard } from "../app/.well-known/mcp/server-card.json/route";
import { buildGseMcpManifest } from "../app/.well-known/mcp/route";
import { buildGseRobotsMetadata, AI_SEARCH_AND_CITATION_BOTS } from "../lib/seo/ai-crawler-robots";
import { buildGseCompliantOrganizationAndDatasetNodes, GSE_DATASET_LICENSE_URL } from "../lib/seo/gse-compliant-schema";
import { assertAdLandingPageCleanRoom, buildGlobalHreflangAlternates } from "../lib/seo/global-multisport-seo";
import { buildGseLlmsAgentDiscoveryAppendix } from "../lib/seo/llms-agent-discovery";
import { PUBLIC_RECORD_LINE } from "../lib/ledger/public-record";

describe("Global SEO, Dataset license, and A2A/MCP Agent Discovery", () => {
  it("resolves Google Search Console Dataset license requirement across schema builders", () => {
    const { organizationNode, datasetNode } = buildGseCompliantOrganizationAndDatasetNodes();
    expect(organizationNode.areaServed).toBe("Worldwide");
    expect(datasetNode["@type"]).toBe("Dataset");
    expect(datasetNode.license).toBe(GSE_DATASET_LICENSE_URL);
    expect(datasetNode.description).toContain(PUBLIC_RECORD_LINE);
  });

  it("serves compliant A2A v1.0 Agent Card and MCP SEP-1649/SEP-1960 discovery manifests", () => {
    const agentCard = buildGseAgentCard();
    expect(agentCard.name).toBe("Galaxy Sports Edge");
    expect(agentCard.description).toContain(PUBLIC_RECORD_LINE);
    expect(agentCard.skills.length).toBeGreaterThanOrEqual(4);

    const mcpCard = buildGseMcpServerCard();
    expect(mcpCard.$schema).toContain("modelcontextprotocol.io/schemas/server-card/v1.0");
    expect(mcpCard.serverInfo.description).toContain(PUBLIC_RECORD_LINE);

    const mcpManifest = buildGseMcpManifest();
    expect(mcpManifest.server_card_url).toBe("https://www.galaxysportsedge.com/.well-known/mcp/server-card.json");
  });

  it("enforces RFC 9309 per-crawler private disallow rules and ad landing-page clean room", () => {
    const robots = buildGseRobotsMetadata();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    expect(rules.length).toBeGreaterThan(AI_SEARCH_AND_CITATION_BOTS.length);
    for (const bot of ["Googlebot", "OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"]) {
      const entry = rules.find((r) => r.userAgent === bot);
      expect(entry?.disallow).toContain("/api/");
      expect(entry?.disallow).toContain("/cockpit/");
    }

    const cleanRes = assertAdLandingPageCleanRoom("<html><body>Galaxy Sports Edge Analytics</body></html>");
    expect(cleanRes.clean).toBe(true);
    const dirtyRes = assertAdLandingPageCleanRoom('<a href="https://sportsbook.draftkings.com/nfl">Bet</a>');
    expect(dirtyRes.clean).toBe(false);

    const alternates = buildGlobalHreflangAlternates("/pricing");
    expect(alternates.canonical).toBe("https://www.galaxysportsedge.com/pricing");
    expect(buildGseLlmsAgentDiscoveryAppendix()).toContain("/.well-known/agent-card.json");
  });
});
