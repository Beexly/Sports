/**
 * Galaxy Proof MCP — hosted tool set (W-MCP).
 *
 * The founder's galaxy-proof-mcp packet as a HOSTED surface: the original
 * 7-tool contract plus get_reality_receipt (W003's composed envelope +
 * receipt + Bitcoin-anchor object, added the same in-process, one-truth-path
 * way as every other tool here), served from the site itself at /api/mcp
 * (streamable-HTTP JSON-RPC), so any MCP-capable agent can add
 * https://www.galaxysportsedge.com/api/mcp as a connector and audit the
 * record — zero installs, zero new infra.
 *
 * One canonical truth path: handlers run IN-PROCESS over the repo's own proof
 * modules — buildMachineProof / buildVerificationSpec / buildProofOpenApiSpec
 * directly, and the REAL receipts + verify route handlers invoked internally
 * (so pagination, the settled-only leak gate, and the per-row tamper check are
 * exactly the public API's, never a re-implementation). Local recompute uses
 * the production hashLeaf/merkleRoot from @sports/prediction-engine — the very
 * functions the conformance vectors pin.
 *
 * Read-only by construction: every tool is a pure read; nothing can mutate
 * state, spend, or leak a pre-kickoff pick (the receipts source only ever
 * serves settled, kicked-off commitments). Honesty inherited verbatim: an
 * unpublished ledger and an empty receipt list are valid answers, and no tool
 * makes any performance/accuracy/win-rate claim of its own.
 */

import { createHash } from "node:crypto";
import { hashLeaf, merkleRootFromLeafHashes } from "@sports/prediction-engine";
import { buildMachineProof } from "@/lib/proof/machine-proof";
import { buildProofOpenApiSpec } from "@/lib/proof/openapi-spec";
import { buildVerificationSpec } from "@/lib/proof/verification-spec";
import { SITE_URL } from "@/lib/seo/site-url";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** MCP tool-result content: a single JSON-as-text block. */
export interface McpToolResult {
  readonly content: readonly { readonly type: "text"; readonly text: string }[];
  readonly isError?: boolean;
}

function jsonResult(value: unknown, isError = false): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) };
}

/** JSON-Schema for a tool's input (MCP wire format). */
export interface McpToolDef {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

interface ReceiptsPage {
  readonly count: number;
  readonly nextCursor: string | null;
  readonly receipts: readonly {
    readonly pickId: string;
    readonly contentHash: string;
    readonly payload: string;
    readonly verified: boolean;
  }[];
}

/** Invoke the real receipts route handler in-process (one truth path). */
async function fetchReceiptsPage(limit: number, cursor: string | null): Promise<{ ok: true; page: ReceiptsPage } | { ok: false; error: string }> {
  const { GET } = await import("@/app/api/proof/receipts/route");
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("cursor", cursor);
  const res = await GET(new Request(`${SITE_URL}/api/proof/receipts?${qs.toString()}`));
  const body = (await res.json()) as ReceiptsPage & { error?: string };
  if (res.status !== 200) {
    return { ok: false, error: body.error ?? `receipts source returned HTTP ${res.status}` };
  }
  return { ok: true, page: body };
}

interface RealityReceiptResponse {
  readonly found: boolean;
  readonly receipt?: unknown;
  readonly reason?: string;
  readonly error?: string;
}

/**
 * Invoke the real /api/proof/reality/[gameId] route handler in-process (one
 * truth path — the MCP tool can never drift from the public JSON API, same
 * discipline as fetchReceiptsPage above). Distinguishes honest absence
 * (found:false, never an isError) from a genuine service outage.
 */
async function fetchRealityReceipt(gameId: string): Promise<{ ok: true; body: RealityReceiptResponse } | { ok: false; error: string }> {
  const { GET } = await import("@/app/api/proof/reality/[gameId]/route");
  const res = (await GET(new Request(`${SITE_URL}/api/proof/reality/${encodeURIComponent(gameId)}`), {
    params: Promise.resolve({ gameId }),
  })) as Response;
  const body = (await res.json()) as RealityReceiptResponse;
  if (res.status === 503) {
    return { ok: false, error: body.error ?? "reality-receipt source returned HTTP 503" };
  }
  return { ok: true, body };
}

const NO_ADDITIONAL = { additionalProperties: false } as const;

export const PROOF_MCP_TOOLS: readonly McpToolDef[] = [
  {
    name: "get_record_summary",
    title: "Get record summary",
    description:
      "The ledger snapshot + verification map. Honest unpublished state until a substantiated record exists — this tool makes no performance claim of its own.",
    inputSchema: { type: "object", properties: {}, ...NO_ADDITIONAL },
  },
  {
    name: "list_settled_receipts",
    title: "List settled receipts",
    description:
      "Enumerate settled, kicked-off pick receipts — each row carries its leaf preimage (payload) so you can recompute its commitment yourself.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Page size 1-100 (default 25)." },
        cursor: { type: "string", description: "Opaque receipt id from a prior page's nextCursor." },
      },
      ...NO_ADDITIONAL,
    },
  },
  {
    name: "verify_receipt_local",
    title: "Verify a receipt locally (trustless)",
    description:
      'Recompute sha256("leaf:" + pickId + ":" + payload) and compare to the frozen contentHash. The verdict is YOUR math, not Galaxy\'s assertion.',
    inputSchema: {
      type: "object",
      properties: {
        pickId: { type: "string", description: "The receipt's pickId." },
        payload: { type: "string", description: "The leaf preimage (the receipt's payload field)." },
        contentHash: { type: "string", description: "The frozen 64-hex SHA-256 commitment to check against." },
      },
      required: ["pickId", "payload", "contentHash"],
      ...NO_ADDITIONAL,
    },
  },
  {
    name: "verify_receipt_via_api",
    title: "Verify a receipt via Galaxy's API (cross-check)",
    description:
      "Cross-check one hash against Galaxy's own verifier. Pre-kickoff receipts return SEALED (existence + integrity + freeze time only); settled receipts open in full.",
    inputSchema: {
      type: "object",
      properties: {
        hash: { type: "string", pattern: "^[0-9a-fA-F]{64}$", description: "A 64-character SHA-256 receipt hash." },
      },
      required: ["hash"],
      ...NO_ADDITIONAL,
    },
  },
  {
    name: "get_verification_spec",
    title: "Get the verification spec + test vectors",
    description:
      "The exact commitment algorithm plus synthetic known-answer vectors — implement the verifier in any language and confirm it reproduces these hashes.",
    inputSchema: { type: "object", properties: {}, ...NO_ADDITIONAL },
  },
  {
    name: "get_openapi_contract",
    title: "Get the Proof API OpenAPI contract",
    description: "The formal OpenAPI 3.1 contract for the read-only Proof API.",
    inputSchema: { type: "object", properties: {}, ...NO_ADDITIONAL },
  },
  {
    name: "audit_record_trustlessly",
    title: "Audit the whole settled record (trustless)",
    description:
      "Paginate every settled receipt, recompute every leaf hash locally, compute the Merkle root over the settled set, and report how many verify plus any mismatches. Your math end to end.",
    inputSchema: {
      type: "object",
      properties: {
        maxReceipts: { type: "integer", minimum: 1, maximum: 20000, description: "Safety cap (default 5000)." },
      },
      ...NO_ADDITIONAL,
    },
  },
  {
    name: "get_reality_receipt",
    title: "Get a Reality Receipt for one decision",
    description:
      "One reproducible object per game decision (publish or pass): the W001 evidence-envelope digest, the pick-proof receipt's live tamper check (sealed pre-kickoff, opening at kickoff/settlement exactly like verify_receipt_via_api), and the Bitcoin-anchor status of its slate commitment. Public, FREE-tier-only by construction — a kicked-off/settled PRO or ELITE pick's committed fields can never open here.",
    inputSchema: {
      type: "object",
      properties: {
        gameId: { type: "string", description: "The game id (as used by /room/[gameId] and /api/proof/reality/[gameId])." },
      },
      required: ["gameId"],
      ...NO_ADDITIONAL,
    },
  },
];

const MAX_AUDIT_PAGES = 200;

/** Dispatch one tool call. Unknown tool → error result (the route maps JSON-RPC codes). */
export async function callProofMcpTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
  switch (name) {
    case "get_record_summary": {
      const doc = buildMachineProof();
      return jsonResult({ ok: true, ledger: doc.ledger, doctrine: doc.doctrine, verify: doc.verify, neverDoes: doc.neverDoes });
    }
    case "list_settled_receipts": {
      const limit = typeof args["limit"] === "number" ? Math.min(Math.max(Math.floor(args["limit"]), 1), 100) : 25;
      const cursor = typeof args["cursor"] === "string" ? args["cursor"] : null;
      const r = await fetchReceiptsPage(limit, cursor);
      return r.ok ? jsonResult({ ok: true, page: r.page }) : jsonResult({ ok: false, error: r.error }, true);
    }
    case "verify_receipt_local": {
      const pickId = String(args["pickId"] ?? "");
      const payload = String(args["payload"] ?? "");
      const expected = String(args["contentHash"] ?? "").trim().toLowerCase();
      const recomputed = hashLeaf(sha256Hex, { id: pickId, payload });
      return jsonResult({
        ok: true,
        matches: recomputed === expected,
        recomputed,
        expected,
        recipe: 'sha256("leaf:" + pickId + ":" + payload)',
        note: "Recomputed in-process with node:crypto — compare independently anytime; the recipe + vectors are public.",
      });
    }
    case "verify_receipt_via_api": {
      const hash = String(args["hash"] ?? "").toLowerCase();
      const { GET } = await import("@/app/api/verify/route");
      const res = (await GET(new Request(`${SITE_URL}/api/verify?hash=${encodeURIComponent(hash)}`))) as Response;
      const body = (await res.json()) as Record<string, unknown>;
      if (res.status === 503) return jsonResult({ ok: false, error: "Verifier temporarily unavailable — not a verdict; retry shortly." }, true);
      if (res.status !== 200) return jsonResult({ ok: false, error: `verifier returned HTTP ${res.status}`, result: body }, true);
      return jsonResult({ ok: true, result: body });
    }
    case "get_verification_spec":
      return jsonResult({ ok: true, spec: buildVerificationSpec() });
    case "get_openapi_contract":
      return jsonResult({ ok: true, openapi: buildProofOpenApiSpec() });
    case "audit_record_trustlessly": {
      const cap = typeof args["maxReceipts"] === "number" ? Math.min(Math.max(Math.floor(args["maxReceipts"]), 1), 20000) : 5000;
      const leaves: string[] = [];
      const mismatches: { pickId: string; recomputed: string; published: string }[] = [];
      let cursor: string | null = null;
      let pages = 0;
      while (leaves.length < cap && pages < MAX_AUDIT_PAGES) {
        pages += 1;
        const r = await fetchReceiptsPage(100, cursor);
        if (!r.ok) return jsonResult({ ok: false, error: r.error, pagesFetched: pages - 1 }, true);
        for (const receipt of r.page.receipts) {
          if (leaves.length >= cap) break;
          const recomputed = hashLeaf(sha256Hex, { id: receipt.pickId, payload: receipt.payload });
          leaves.push(recomputed);
          if (recomputed !== receipt.contentHash.toLowerCase()) {
            mismatches.push({ pickId: receipt.pickId, recomputed, published: receipt.contentHash });
          }
        }
        cursor = r.page.nextCursor;
        if (!cursor) break;
      }
      return jsonResult({
        ok: true,
        settledReceiptsAudited: leaves.length,
        verified: leaves.length - mismatches.length,
        mismatches,
        merkleRootOverSettledSet: merkleRootFromLeafHashes(leaves, sha256Hex),
        note:
          leaves.length === 0
            ? "Zero settled receipts exist yet — an honest empty record, not an error. The root over the empty set is sha256(\"\")."
            : "Every leaf hash above was recomputed from its published preimage; the root is your math, not Galaxy's assertion.",
        truncated: cursor !== null && leaves.length >= cap ? `capped at ${cap} receipts — raise maxReceipts to continue` : null,
      });
    }
    case "get_reality_receipt": {
      const gameId = String(args["gameId"] ?? "").trim();
      if (!gameId) return jsonResult({ ok: false, error: "gameId is required" }, true);
      const r = await fetchRealityReceipt(gameId);
      if (!r.ok) return jsonResult({ ok: false, error: r.error }, true);
      // Honest absence (no such game, or no decision recorded yet) is a real
      // answer, not a tool failure — never marked isError.
      return jsonResult({ ok: true, found: r.body.found, receipt: r.body.receipt ?? null, reason: r.body.reason ?? null });
    }
    default:
      return jsonResult({ ok: false, error: `Unknown tool: ${name}` }, true);
  }
}
