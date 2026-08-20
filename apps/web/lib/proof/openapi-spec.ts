/**
 * OpenAPI 3.1 contract for the read-only Proof API.
 *
 * The machine-auditable Proof surface (/llms.txt → /api/proof/ledger →
 * /api/proof/receipts → /api/verify) described as a formal, tool-consumable
 * contract, so any OpenAPI-aware agent or client auto-discovers and calls it
 * without bespoke glue. Served at /api/proof/openapi.json and linked from the
 * llms.txt manifest.
 *
 * Read-only by construction: every operation is a GET, there are no security
 * schemes (the record is public), and nothing here can mutate state. This is a
 * DIFFERENT surface from the shadow `apps/web/lib/api/v1` OpenAPI generator —
 * it documents only the already-live public proof endpoints, and deliberately
 * carries no auth/scope machinery.
 *
 * Pure module (no HTTP, injectable base URL) so it is unit-testable. Contains
 * no performance claims — only structural descriptions of endpoints.
 */

import { SITE_URL } from "@/lib/seo/site-url";

export interface BuildProofOpenApiOptions {
  readonly siteUrl?: string;
  /** Contract version string (SemVer-ish). Bump when the shape changes. */
  readonly version?: string;
}

const DEFAULT_VERSION = "1.0.0";

/**
 * Build the OpenAPI 3.1 document for the public Proof API. The return type is
 * inferred from the literal (fully typed, no `any`).
 */
export function buildProofOpenApiSpec(opts: BuildProofOpenApiOptions = {}) {
  const base = (opts.siteUrl ?? SITE_URL).replace(/\/+$/, "");
  const version = opts.version ?? DEFAULT_VERSION;

  return {
    openapi: "3.1.0",
    info: {
      title: "Galaxy Sports Edge — Proof API",
      version,
      summary: "Read-only endpoints for independently auditing the publish-before-kickoff pick record.",
      description:
        "Public, no-auth endpoints an agent uses to read and independently verify the record. " +
        "The ledger surfaces are founder-gated (they report an honest unpublished state until a " +
        "substantiated record exists) and can only ever carry metrics that cleared a four-leg " +
        "substantiation guard. Receipt endpoints expose only settled, kicked-off commitments, each " +
        "carrying the leaf preimage so the SHA-256 hash can be recomputed and checked against the " +
        "frozen commitment.",
    },
    servers: [{ url: base, description: "Canonical public host" }],
    paths: {
      "/api/proof/ledger": {
        get: {
          operationId: "getProofLedger",
          summary: "Machine-readable ledger snapshot + verification map.",
          description:
            "The founder-gated ledger state (published:false with a reason until PUBLISH_LEDGER is set) plus the doctrine, verification links, and hard refusals. Always 200.",
          responses: {
            "200": {
              description: "The current proof snapshot.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MachineProofDoc" } } },
            },
          },
        },
      },
      "/api/proof/receipts": {
        get: {
          operationId: "listProofReceipts",
          summary: "Enumerable list of settled, individually-verifiable pick receipts.",
          description:
            "Lists only settled AND kicked-off receipts (a strict subset of 'open'), so a pre-kickoff commitment never appears. Each row carries the leaf preimage for independent recomputation.",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Page size, 1–100 (default 25).",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
            },
            {
              name: "cursor",
              in: "query",
              required: false,
              description: "Opaque receipt id from a prior page's nextCursor.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "A page of settled receipts (empty list when none exist yet).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ReceiptsPage" } } },
            },
            "503": {
              description: "The proof ledger is temporarily unavailable (DB outage). Not a verdict of non-existence.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ServiceError" } } },
            },
          },
        },
      },
      "/api/proof/ledger-chain": {
        get: {
          operationId: "getProofLedgerChain",
          summary: "Hash-chained pick + settlement export for the open recompute verifier.",
          description:
            "Streams the Glass Ledger chain in the exact {entries:[...]} shape scripts/edge-lab/recompute.ts consumes. Empty chain returns 200 with entries:[] and an honest note, never 404. Does not emit performance numbers.",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Page size, 1–500 (default 200).",
              schema: { type: "integer", minimum: 1, maximum: 500, default: 200 },
            },
            {
              name: "afterSeq",
              in: "query",
              required: false,
              description: "Return entries with seq greater than this cursor.",
              schema: { type: "integer", minimum: -1 },
            },
          ],
          responses: {
            "200": {
              description: "A page of chain entries (empty list when none exist yet).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/LedgerChainExport" } } },
            },
            "503": {
              description: "The chain store is temporarily unavailable (DB outage). Not a verdict of non-existence.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ServiceError" } } },
            },
          },
        },
      },
      "/api/proof/verification-spec.json": {
        get: {
          operationId: "getVerificationSpec",
          summary: "Trustless conformance spec: the hash-chain algorithm + known-answer test vectors.",
          description:
            "The exact pick-commitment algorithm plus synthetic KAT vectors, so a third party can implement the verifier in any language and confirm it reproduces our hashes. No auth, always 200.",
          responses: {
            "200": {
              description: "The verification specification and its test vectors.",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/verify": {
        get: {
          operationId: "verifyReceipt",
          summary: "Verify a single pick receipt by its content hash.",
          description:
            "Re-hashes the stored payload and compares it to the frozen commitment. Pre-kickoff receipts return a SEALED result (existence + integrity + freeze time only); post-kickoff/settled receipts open in full.",
          parameters: [
            {
              name: "hash",
              in: "query",
              required: true,
              description: "A 64-character lowercase SHA-256 receipt hash.",
              schema: { type: "string", pattern: "^[0-9a-f]{64}$" },
            },
          ],
          responses: {
            "200": {
              description: "Verification result (found:false, sealed, or fully opened).",
              content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyResult" } } },
            },
            "400": { description: "Missing or malformed hash." },
            "503": { description: "The verifier is temporarily unavailable. Not a verdict." },
          },
        },
      },
    },
    components: {
      schemas: {
        MachineProofDoc: {
          type: "object",
          description: "The proof snapshot. See /llms.txt for the human-oriented manifest.",
          properties: {
            service: { type: "string" },
            summary: { type: "string" },
            doctrine: { type: "array", items: { type: "string" } },
            ledger: {
              description: "Founder-gated ledger view: unpublished (with a reason) or published with substantiated rows.",
              type: "object",
            },
            verify: { type: "object" },
            references: { type: "array", items: { type: "object" } },
            neverDoes: { type: "array", items: { type: "string" } },
            generatedAt: { type: "string", format: "date-time" },
          },
          required: ["service", "doctrine", "ledger", "verify", "generatedAt"],
        },
        ReceiptsPage: {
          type: "object",
          properties: {
            doctrine: { type: "string" },
            count: { type: "integer", minimum: 0 },
            nextCursor: { type: ["string", "null"] },
            receipts: { type: "array", items: { $ref: "#/components/schemas/Receipt" } },
            verify: { type: "object" },
          },
          required: ["count", "receipts"],
        },
        Receipt: {
          type: "object",
          properties: {
            pickId: { type: "string" },
            contentHash: { type: "string", pattern: "^[0-9a-f]{64}$" },
            slateKey: { type: ["string", "null"] },
            result: { type: "string" },
            frozenAt: { type: "string" },
            modelVersion: { type: "string" },
            verified: { type: "boolean", description: "Server-side tamper check: hash intact AND columns match the hashed payload." },
            game: { type: ["object", "null"] },
            committed: { type: ["object", "null"], description: "Committed fields, present only when verified is true." },
            payload: { type: "string", description: "The leaf preimage: recompute sha256('leaf:'+pickId+':'+payload)." },
          },
          required: ["pickId", "contentHash", "verified", "payload"],
        },
        LedgerChainExport: {
          type: "object",
          properties: {
            entries: { type: "array", items: { type: "object" } },
            count: { type: "integer", minimum: 0 },
            nextSeq: { type: ["integer", "null"] },
            note: { type: "string" },
          },
          required: ["entries", "count", "note"],
        },
        VerifyResult: {
          type: "object",
          properties: {
            found: { type: "boolean" },
            verified: { type: "boolean" },
            sealed: { type: "boolean" },
            frozenAt: { type: "string" },
            modelVersion: { type: "string" },
          },
          required: ["found"],
        },
        ServiceError: {
          type: "object",
          properties: { error: { type: "string" } },
          required: ["error"],
        },
      },
    },
  };
}
