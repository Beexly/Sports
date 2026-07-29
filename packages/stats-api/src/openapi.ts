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
      "/values/{metricId}": {
        get: {
          summary: "PIT metric value",
          operationId: "getMetricValue",
          parameters: [
            { name: "metricId", in: "path", required: true, schema: { type: "string" } },
            { name: "entityId", in: "query", required: true, schema: { type: "string" } },
            { name: "asOf", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          ],
          responses: {
            "200": { description: "Value" },
            "400": { description: "Missing asOf/ids" },
            "403": { description: "Not public" },
            "501": { description: "Provider not wired" },
          },
        },
      },
      "/external": {
        get: {
          summary: "External free/HF/open source registry",
          operationId: "listExternalSources",
          parameters: [
            { name: "kind", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "External sources" } },
        },
      },
      "/source-matrix": {
        get: {
          summary: "Source coverage matrix",
          operationId: "getSourceMatrix",
          responses: { "200": { description: "Coverage" } },
        },
      },
      "/truth/fire": {
        get: {
          summary: "Fire-authority demo scenarios (LIVE_BOARD default off)",
          operationId: "getFireAuthorityDemos",
          responses: { "200": { description: "Scenarios" } },
        },
        post: {
          summary: "Evaluate fire-authority composition",
          operationId: "postFireAuthority",
          responses: {
            "200": { description: "Authorized FIRE" },
            "422": { description: "Refused (hold)" },
          },
        },
      },
      "/partners/compliance": {
        get: {
          summary: "Partner/affiliate doctrine — sportsbook affiliates blocked",
          operationId: "getPartnerCompliance",
          responses: { "200": { description: "Doctrine + assessments" } },
        },
      },
      "/phase-c/status": {
        get: {
          summary: "Phase C (5b) status — UNVERIFIED until measured",
          operationId: "getPhaseCStatus",
          responses: { "200": { description: "Baseline + report" } },
        },
      },
      "/rights/classify-export": {
        post: {
          summary: "Classify bulk export path (RESULT vs DERIVATIVE_DB vs BLOCKED)",
          operationId: "classifyExportPath",
          responses: {
            "200": { description: "Classification" },
            "403": { description: "Blocked" },
            "422": { description: "SPDX required" },
          },
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
