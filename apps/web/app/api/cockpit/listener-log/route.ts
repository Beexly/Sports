import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { validateClaimBatch } from "@/lib/airwave/listener-log-validation";

/**
 * Listener log intake — the LEGAL manual lane for broadcast claims
 * (docs/legal/SIRIUSXM_CONNECTION.md, registry: siriusxm-streaming).
 *
 * A human heard it on their own subscription and typed a paraphrase.
 * Rules enforced here, mirroring the claim-extraction contract:
 *   - paraphrase only (no verbatim quotes accepted as a field)
 *   - no audio refs, no transcripts, no automation upstream
 *   - batch mode = many claims in YOUR words, one review task each —
 *     never a transcript (timestamp lines are rejected outright)
 *   - lands as SCOUT CockpitTasks (NEEDS_REVIEW) — full audit trail,
 *     zero new schema; nothing reaches a public surface from here.
 */
export const dynamic = "force-dynamic";

interface ListenerLogBody {
  pundit?: string;
  show?: string;
  sport?: string;
  direction?: string;
  paraphrase?: string;
  /** Batch mode: one paraphrased claim per entry, shared metadata. */
  claims?: string[];
  airedOn?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ListenerLogBody;
  try {
    body = (await req.json()) as ListenerLogBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const pundit = body.pundit?.trim();
  if (!pundit) {
    return NextResponse.json({ error: "pundit-required" }, { status: 400 });
  }

  // Batch mode (a 4-hour show's worth of paraphrased takes) and single mode
  // share one path. The validator caps line length and rejects pasted
  // transcripts (timestamped lines) so the lawful lane stays paraphrase-only.
  const rawClaims =
    Array.isArray(body.claims) && body.claims.length > 0
      ? body.claims
      : body.paraphrase != null
        ? [body.paraphrase]
        : [];

  const validated = validateClaimBatch(rawClaims);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error, detail: validated.detail }, { status: 400 });
  }

  const sharedMeta = {
    provenance: "manual_listener_log",
    rights_status: "PERMISSION_REQUIRED",
    pundit,
    show: body.show?.trim() ?? null,
    sport: body.sport?.trim() ?? null,
    direction: body.direction?.trim() ?? null,
    airedOn: body.airedOn?.trim() ?? null,
  };

  const created = await db
    .$transaction(
      validated.claims.map((claim, i) =>
        db.cockpitTask.create({
          data: {
            title:
              `Listener log: ${pundit} — ${body.sport?.trim() || "sport n/a"}` +
              (validated.claims.length > 1 ? ` (${i + 1}/${validated.claims.length})` : ""),
            description:
              `${claim}\n\n` +
              `Show: ${body.show?.trim() || "—"} · Direction: ${body.direction?.trim() || "—"} · ` +
              `Aired: ${body.airedOn?.trim() || "—"}\n` +
              `Attribution: Claim heard on SiriusXM (manual listener log)`,
            assignedAgent: "SCOUT",
            status: "NEEDS_REVIEW",
            priority: 40,
            riskLevel: "LOW",
            source: "manual_listener_log",
            payload: sharedMeta,
          },
          select: { id: true },
        }),
      ),
    )
    .catch(() => null);

  if (!created) {
    return NextResponse.json({ error: "db-unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, filed: created.length, taskIds: created.map((t) => t.id) });
}
