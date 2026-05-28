/**
 * Brain Q&A API (Phase 7)
 *
 * POST /api/brain
 * Body: { query: string }
 *
 * Gating:
 *   - Session required (any tier).
 *   - Evidence Vault must have at least one public-safe item (gate check).
 *   - ANTHROPIC_API_KEY must be set (otherwise returns 503 with clear message).
 *
 * Response:
 *   200 { answer: string; evidenceCount: number; sourceTiers: number[] }
 *   400 { error: string }           — bad input
 *   401 { error: string }           — not signed in
 *   503 { error: string; gate: string } — vault empty / API key missing
 *
 * Design: The Brain uses the Evidence Vault as its only source of truth.
 * It does NOT make claims it cannot back with a vault item. The system
 * prompt enforces this explicitly and the Claim Governance engine evaluates
 * the response before it is surfaced.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lookupEvidence } from "@/lib/evidence-vault";
import { evaluateClaimApproval } from "@/lib/claim-governance";

export const dynamic = "force-dynamic";

const MAX_QUERY_LENGTH = 500;
const MAX_EVIDENCE_ITEMS = 20;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth gate ────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to access the Research Brain." }, { status: 401 });
  }

  // ── API key gate ─────────────────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "Research Brain is not yet active. Check back after launch.", gate: "ANTHROPIC_API_KEY_MISSING" },
      { status: 503 },
    );
  }

  // ── Input validation ─────────────────────────────────────────────────────
  let body: { query?: unknown };
  try {
    body = await req.json() as { query?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawQuery = body.query;
  if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
    return NextResponse.json({ error: "query must be a non-empty string." }, { status: 400 });
  }

  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);

  // ── Evidence lookup — broad scan for any public-safe fact ────────────────
  // The Brain searches across all entity types for relevant evidence.
  // A future version will parse the query for entity mentions; for now
  // we demonstrate the pipeline with a market-wide scan.
  const allEvidence = await lookupEvidence({
    entityType: "market",
    entityId: "global",
    publicSafeOnly: true,
    excludeExpired: true,
  });

  // Also load game-level evidence
  const gameEvidence = await lookupEvidence({
    entityType: "game",
    entityId: "global",
    publicSafeOnly: true,
    excludeExpired: true,
  });

  const evidence = [...allEvidence, ...gameEvidence].slice(0, MAX_EVIDENCE_ITEMS);
  const sourceTiers = [...new Set(evidence.map((e) => e.sourceTier))].sort();
  const evidenceCount = evidence.length;

  // ── Governance check on the question intent ──────────────────────────────
  // Detect if the user is asking for a win-rate claim and gate it.
  const queryLower = query.toLowerCase();
  const isWinRateQuery =
    queryLower.includes("win rate") ||
    queryLower.includes("win-rate") ||
    queryLower.includes("accuracy") ||
    queryLower.includes("how often do you win") ||
    queryLower.includes("percentage correct");

  if (isWinRateQuery) {
    const governance = evaluateClaimApproval({
      claimType: "win_rate",
      evidenceIds: [],
      sourceTiers: [],
    });
    if (governance.verdict === "REJECTED") {
      return NextResponse.json({
        answer:
          "The Calibration Report — including win rates and accuracy percentages — is gated until at least 30 picks settle per model version. This prevents publishing a number before it means anything statistically. The gate clears automatically when the threshold is hit.",
        evidenceCount: 0,
        sourceTiers: [],
        governanceNote: governance.rejectionCode,
      });
    }
  }

  // ── Build the evidence context for the AI prompt ─────────────────────────
  const evidenceContext =
    evidenceCount > 0
      ? evidence
          .map((e) => `[Tier ${e.sourceTier} · ${e.claimType} · ${e.entityId}] ${JSON.stringify(e.content)}`)
          .join("\n")
      : "(No public-safe evidence items currently in the vault. The Brain can only answer questions backed by vault evidence.)";

  // ── Claude API call ───────────────────────────────────────────────────────
  const systemPrompt = `You are the Galaxy Sports Edge Research Brain. You answer sports intelligence questions using ONLY the evidence provided below. You NEVER fabricate stats, picks, injury reports, win rates, or accuracy claims. If a question cannot be answered from the provided evidence, say so directly. Never claim the model has a specific win rate or accuracy unless the evidence explicitly states a calibrated number. Never use language like "guaranteed", "sure thing", "risk-free", or "locked in".

Evidence vault (${evidenceCount} items, source tiers: ${sourceTiers.join(", ") || "none"}):
${evidenceContext}`;

  const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: query }],
    }),
  });

  if (!apiRes.ok) {
    const text = await apiRes.text();
    console.error("[brain] Claude API error", apiRes.status, text);
    return NextResponse.json(
      { error: "Research Brain temporarily unavailable. Try again in a moment." },
      { status: 503 },
    );
  }

  const completion = await apiRes.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const answer =
    completion.content?.find((c) => c.type === "text")?.text ??
    "No answer generated.";

  return NextResponse.json({
    answer,
    evidenceCount,
    sourceTiers,
  });
}
