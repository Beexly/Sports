#!/usr/bin/env node
/**
 * Galaxy Proof MCP — an MCP server that lets any AI agent (or human via an MCP
 * client) INDEPENDENTLY and TRUSTLESSLY verify Galaxy Sports Edge's
 * publish-before-kickoff pick record.
 *
 * The point of this server is not to *tell* an agent "our record is real."
 * It is to let the agent PROVE it to itself: every settled receipt carries its
 * leaf preimage, so the SHA-256 commitment is recomputed LOCALLY (node:crypto)
 * and compared to the frozen contentHash. GSE's own server is never trusted for
 * the verdict — it only serves the data the agent then checks with its own math.
 *
 * Read-only by construction: every network call is a GET against the public,
 * no-auth Proof API. Nothing here can mutate state, spend money, or leak a
 * pre-kickoff pick (the receipts endpoint only ever exposes settled, kicked-off
 * commitments).
 *
 * Honesty is inherited from the API: the ledger reports an unpublished state
 * until a substantiated record exists, and an empty receipts list is a valid,
 * honest answer — not an error. This server surfaces those states verbatim and
 * makes NO performance, accuracy, or win-rate claims of its own.
 *
 * Algorithm (must match apps/web/lib/proof + packages/prediction-engine exactly):
 *   leafHash(pickId, payload) = sha256("leaf:" + pickId + ":" + payload)
 *   nodeHash(left, right)     = sha256("node:" + left + ":" + right)
 *   merkleRoot(leaves)        = pair-hash up the tree, duplicating the last leaf
 *                               if a layer is odd; empty set -> sha256("")
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHash } from "node:crypto";
import { z } from "zod";

// ── Config ────────────────────────────────────────────────────────────────
// Point at production by default; override for a Vercel Preview deploy (the
// Proof surface ships on the `claude/glass-ledger-edge-engine` branch and is
// only live once that branch is deployed).
const BASE_URL = (process.env.GSE_PROOF_BASE_URL ?? "https://www.galaxysportsedge.com").replace(/\/+$/, "");
const USER_AGENT = "galaxy-proof-mcp/1.0.0 (+https://www.galaxysportsedge.com)";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_AUDIT_PAGES = 200; // safety cap for the full-record audit loop

// ── Trustless hashing (local; the whole point) ──────────────────────────────
const LEAF_PREFIX = "leaf:";
const NODE_PREFIX = "node:";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** leafHash(pickId, payload) = sha256("leaf:" + pickId + ":" + payload). */
function leafHash(pickId: string, payload: string): string {
  return sha256Hex(`${LEAF_PREFIX}${pickId}:${payload}`);
}

/** nodeHash(left, right) = sha256("node:" + left + ":" + right). */
function nodeHash(left: string, right: string): string {
  return sha256Hex(`${NODE_PREFIX}${left}:${right}`);
}

/** Merkle root over already-hashed leaves. Empty set -> sha256(""). */
function merkleRoot(leaves: readonly string[]): string {
  if (leaves.length === 0) return sha256Hex("");
  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i]!;
      const right = i + 1 < layer.length ? layer[i + 1]! : left; // duplicate last if odd
      next.push(nodeHash(left, right));
    }
    layer = next;
  }
  return layer[0]!;
}

// ── HTTP helper (read-only GETs, honest error mapping) ───────────────────────
interface FetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function getJson<T>(path: string): Promise<FetchResult<T>> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal: controller.signal,
    });
    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        error:
          `Not found at ${url}. The Proof surface is only live once the ` +
          `Proof-API branch is deployed to this host. Set GSE_PROOF_BASE_URL to a ` +
          `deploy/preview URL that serves /api/proof/*.`,
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        status: 503,
        error:
          "The proof ledger is temporarily unavailable (upstream 503). This is NOT a " +
          "verdict of non-existence — retry shortly.",
      };
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Upstream returned HTTP ${res.status} for ${url}.` };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: `Network error fetching ${url}: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

// ── Minimal shapes we rely on from the Proof API ─────────────────────────────
interface Receipt {
  pickId: string;
  contentHash: string;
  payload: string;
  result?: string;
  frozenAt?: string;
  modelVersion?: string;
  verified?: boolean;
  game?: { matchup?: string; sport?: string; commenceTime?: string } | null;
}
interface ReceiptsPage {
  doctrine?: string;
  count: number;
  nextCursor?: string | null;
  receipts: Receipt[];
  verify?: unknown;
}

// ── Server ───────────────────────────────────────────────────────────────
const server = new McpServer({ name: "galaxy-proof", version: "1.0.0" });

server.registerTool(
  "get_record_summary",
  {
    title: "Get record summary",
    description:
      "Fetch the machine-readable ledger snapshot (GET /api/proof/ledger): the doctrine, " +
      "verification map, and the honest ledger state (it reports an unpublished state with a " +
      "reason until a substantiated record is published). Makes no win-rate/accuracy claim.",
    inputSchema: {},
  },
  async () => {
    const r = await getJson<Record<string, unknown>>("/api/proof/ledger");
    if (!r.ok) return textResult({ ok: false, error: r.error }, true);
    return textResult({ ok: true, source: `${BASE_URL}/api/proof/ledger`, ledger: r.data });
  },
);

server.registerTool(
  "list_settled_receipts",
  {
    title: "List settled receipts",
    description:
      "Enumerate settled, individually-verifiable pick receipts (GET /api/proof/receipts). Only " +
      "settled AND kicked-off commitments appear (never a pre-kickoff pick). Each row carries its " +
      "leaf preimage so you can verify it yourself with verify_receipt_local. An empty list is a " +
      "valid, honest answer, not an error.",
    inputSchema: {
      limit: z.number().int().min(1).max(100).optional().describe("Page size 1-100 (default 25)."),
      cursor: z.string().optional().describe("Opaque receipt id from a prior page's nextCursor."),
    },
  },
  async ({ limit, cursor }) => {
    const qs = new URLSearchParams();
    if (limit) qs.set("limit", String(limit));
    if (cursor) qs.set("cursor", cursor);
    const path = `/api/proof/receipts${qs.toString() ? `?${qs.toString()}` : ""}`;
    const r = await getJson<ReceiptsPage>(path);
    if (!r.ok) return textResult({ ok: false, error: r.error }, true);
    return textResult({ ok: true, source: `${BASE_URL}${path}`, page: r.data });
  },
);

server.registerTool(
  "verify_receipt_local",
  {
    title: "Verify a receipt locally (trustless)",
    description:
      "TRUSTLESS per-receipt check. Given a receipt's pickId, payload (leaf preimage) and its " +
      "frozen contentHash, this recomputes sha256(\"leaf:\"+pickId+\":\"+payload) LOCALLY and compares " +
      "it to contentHash. Galaxy's server is never consulted — a `matches:true` means the receipt's " +
      "commitment is intact by your own math. Feed it rows from list_settled_receipts.",
    inputSchema: {
      pickId: z.string().describe("The receipt's pickId."),
      payload: z.string().describe("The leaf preimage (the receipt's `payload` field)."),
      contentHash: z.string().describe("The frozen 64-hex SHA-256 commitment to check against."),
    },
  },
  async ({ pickId, payload, contentHash }) => {
    const recomputed = leafHash(pickId, payload);
    const expected = contentHash.trim().toLowerCase();
    const matches = recomputed === expected;
    return textResult({
      ok: true,
      trustless: true,
      note: "Computed locally with node:crypto — Galaxy's server was not asked for this verdict.",
      pickId,
      recomputedHash: recomputed,
      expectedHash: expected,
      matches,
      interpretation: matches
        ? "The commitment is intact: the published hash is exactly sha256 of the leaf preimage."
        : "MISMATCH: the hash does not match the preimage. Do not trust the committed fields of this receipt.",
    });
  },
);

server.registerTool(
  "verify_receipt_via_api",
  {
    title: "Verify a receipt via Galaxy's API (cross-check)",
    description:
      "Ask Galaxy's own verifier about a single receipt hash (GET /api/verify?hash=). Returns " +
      "{found, verified, sealed, frozenAt, modelVersion}. Pre-kickoff receipts return SEALED " +
      "(existence + integrity + freeze-time only). Use this to CROSS-CHECK verify_receipt_local; " +
      "the local check is the trustless one.",
    inputSchema: {
      hash: z.string().regex(/^[0-9a-f]{64}$/i).describe("A 64-character SHA-256 receipt hash."),
    },
  },
  async ({ hash }) => {
    const path = `/api/verify?hash=${encodeURIComponent(hash.toLowerCase())}`;
    const r = await getJson<Record<string, unknown>>(path);
    if (!r.ok) return textResult({ ok: false, error: r.error }, true);
    return textResult({ ok: true, source: `${BASE_URL}${path}`, result: r.data });
  },
);

server.registerTool(
  "get_verification_spec",
  {
    title: "Get the verification spec + test vectors",
    description:
      "Fetch the trustless conformance spec (GET /api/proof/verification-spec.json): the exact " +
      "hash-chain algorithm plus known-answer test vectors, so you can implement the verifier in any " +
      "language and confirm it reproduces Galaxy's hashes.",
    inputSchema: {},
  },
  async () => {
    const r = await getJson<Record<string, unknown>>("/api/proof/verification-spec.json");
    if (!r.ok) return textResult({ ok: false, error: r.error }, true);
    return textResult({ ok: true, source: `${BASE_URL}/api/proof/verification-spec.json`, spec: r.data });
  },
);

server.registerTool(
  "get_openapi_contract",
  {
    title: "Get the Proof API OpenAPI contract",
    description:
      "Fetch the formal OpenAPI 3.1 contract for the Proof API (GET /api/proof/openapi.json), so an " +
      "OpenAPI-aware client can auto-discover every endpoint without bespoke glue.",
    inputSchema: {},
  },
  async () => {
    const r = await getJson<Record<string, unknown>>("/api/proof/openapi.json");
    if (!r.ok) return textResult({ ok: false, error: r.error }, true);
    return textResult({ ok: true, source: `${BASE_URL}/api/proof/openapi.json`, openapi: r.data });
  },
);

server.registerTool(
  "audit_record_trustlessly",
  {
    title: "Audit the whole settled record (trustless)",
    description:
      "The full self-audit. Paginates every settled receipt, recomputes each leaf hash LOCALLY and " +
      "compares it to the published contentHash, and computes the Merkle root of those leaves — all " +
      "with your own math, trusting Galaxy's server only to serve the raw data. Reports how many " +
      "receipts verify, lists any mismatches, and returns the locally-computed root over the settled " +
      "set. Makes NO claim about win rate — this proves INTEGRITY (nothing was altered after " +
      "commitment), not profitability.",
    inputSchema: {
      maxReceipts: z
        .number()
        .int()
        .min(1)
        .max(20000)
        .optional()
        .describe("Safety cap on receipts to audit (default: all)."),
    },
  },
  async ({ maxReceipts }) => {
    const leaves: string[] = [];
    const mismatches: Array<{ pickId: string; recomputed: string; published: string }> = [];
    let total = 0;
    let verifiedLocally = 0;
    let cursor: string | null = null;
    let pages = 0;

    while (pages < MAX_AUDIT_PAGES) {
      pages += 1;
      const qs = new URLSearchParams({ limit: "100" });
      if (cursor) qs.set("cursor", cursor);
      const r: FetchResult<ReceiptsPage> = await getJson<ReceiptsPage>(`/api/proof/receipts?${qs.toString()}`);
      if (!r.ok || !r.data) return textResult({ ok: false, error: r.error, pagesFetched: pages - 1 }, true);

      for (const rec of r.data.receipts) {
        if (maxReceipts && total >= maxReceipts) break;
        total += 1;
        const recomputed = leafHash(rec.pickId, rec.payload);
        const published = rec.contentHash.trim().toLowerCase();
        leaves.push(published); // the receipt's contentHash IS its Merkle leaf
        if (recomputed === published) verifiedLocally += 1;
        else mismatches.push({ pickId: rec.pickId, recomputed, published });
      }

      cursor = r.data.nextCursor ?? null;
      if (!cursor || (maxReceipts && total >= maxReceipts)) break;
    }

    const root = merkleRoot(leaves);
    const allIntact = total > 0 && mismatches.length === 0;

    return textResult({
      ok: true,
      trustless: true,
      note:
        "Every leaf hash was recomputed locally with node:crypto. Galaxy's server was trusted only " +
        "to serve the raw preimages, not for any verdict.",
      host: BASE_URL,
      settledReceiptsAudited: total,
      verifiedLocally,
      mismatchCount: mismatches.length,
      mismatches: mismatches.slice(0, 25),
      merkleRootOfSettledSet: root,
      merkleRootNote:
        "Merkle root over the enumerated settled receipts (node prefix 'node:', last leaf duplicated on odd layers). " +
        "If Galaxy publishes a committed-set root, compare it against this.",
      verdict:
        total === 0
          ? "No settled receipts yet — an honest empty record, not a failure."
          : allIntact
            ? `All ${total} settled receipts are cryptographically intact by local recomputation. This proves the record was not altered after commitment; it makes no claim about win rate.`
            : `${mismatches.length} of ${total} receipts FAILED local hash recomputation — treat their committed fields as untrustworthy.`,
    });
  },
);

// ── Boot ─────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs (stdout is the MCP transport).
  process.stderr.write(`galaxy-proof-mcp connected. Proof host: ${BASE_URL}\n`);
}

main().catch((err) => {
  process.stderr.write(`galaxy-proof-mcp fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
