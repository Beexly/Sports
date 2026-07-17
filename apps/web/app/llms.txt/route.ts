import { buildMachineProof, renderLlmsTxt } from "@/lib/proof/machine-proof";

/**
 * GET /llms.txt — the AI-agent manifest (llmstxt.org convention).
 *
 * A concise, link-rich guide that tells any LLM agent what Galaxy Sports
 * Edge is and, crucially, how to INDEPENDENTLY verify our record: the
 * receipt-verify endpoint, the proof surface, and the hash-chain method.
 * Composed from the same `buildMachineProof()` snapshot the JSON Proof API
 * serves, so the two can never drift.
 *
 * Served text/plain (llms.txt is a plaintext/markdown well-known file, like
 * robots.txt). Publicly readable — it deliberately contains no secrets and
 * no unsubstantiated performance numbers (the ledger snapshot it embeds is
 * founder-gated through loadLedgerView()).
 */

export const dynamic = "force-dynamic";

export function GET(): Response {
  const body = renderLlmsTxt(buildMachineProof());
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Short cache: the embedded ledger snapshot can change the moment the
      // founder flips PUBLISH_LEDGER or a substantiated entry lands.
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
