import { catalogStats } from "./catalog.js";

/** OpenAPI 3.1 document for GSE Stats API v1 */
export function buildStatsOpenApi() {
  const stats = catalogStats();
  return {
    openapi: "3.1.0",
    info: {
      title: "Galaxy Sports Edge Stats API",
      version: "1.0.0",
      description:
        "Rights-tagged sports metrics registry and feature access. " +
        "Refuse-default. No fabricated win-rates. " +
        `Catalog density: ${stats.total} metrics (${stats.publicApi} public-eligible).`,
      contact: { name: "Galaxy Sports Edge", url: "https://www.galaxysportsedge.com/" },
    },
    servers: [{ url: "/api/gse/v1", description: "GSE Stats API v1" }],
    paths: {
      "/catalog": {
        get: {
          summary: "Catalog summary + law strip",
          operationId: "getCatalogSummary",
          responses: { "200": { description: "Summary" } },
        },
      },
      "/metrics": {
        get: {
          summary: "List metrics",
          operationId: "listMetrics",
          parameters: [
            { name: "sport", in: "query", schema: { type: "string" } },
            { name: "family", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            {
              name: "publicOnly",
              in: "query",
              schema: { type: "boolean", default: true },
            },
          ],
          responses: { "200": { description: "Metric list" } },
        },
      },
      "/metrics/{metricId}": {
        get: {
          summary: "Get metric definition",
          operationId: "getMetric",
          parameters: [
            { name: "metricId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Metric" },
            "403": { description: "Not public (refuse-default)" },
            "404": { description: "Not found" },
          },
        },
      },
      "/coverage": {
        get: {
          summary: "Source coverage matrix",
          operationId: "getCoverage",
          responses: { "200": { description: "Coverage" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
    },
  } as const;
}
