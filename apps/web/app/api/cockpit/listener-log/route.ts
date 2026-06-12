import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";

/**
 * Listener log intake — the LEGAL manual lane for broadcast claims
 * (docs/legal/SIRIUSXM_CONNECTION.md, registry: siriusxm-streaming).
 *
 * A human heard it on their own subscription and typed a paraphrase.
 * Rules enforced here, mirroring the claim-extraction contract:
 *   - paraphrase only (no verbatim quotes accepted as a field)
 *   - no audio refs, no transcripts, no automation upstream
 *   - lands as a SCOUT CockpitTask (NEEDS_REVIEW) — full audit trail,
 *     zero new schema; nothing reaches a public surface from here.
 */
export const dynamic = "force-dynamic";

interface ListenerLogBody {
  pundit?: string;
  show?: string;
  sport?: string;
  direction?: string;
  paraphrase?: string;
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
  const paraphrase = body.paraphrase?.trim();
  if (!pundit || !paraphrase) {
    return NextResponse.json({ error: "pundit-and-paraphrase-required" }, { status: 400 });
  }
  if (paraphrase.length > 280) {
    return NextResponse.json(
      { error: "paraphrase-too-long", detail: "Keep it a short factual paraphrase — not a transcript." },
      { status: 400 },
    );
  }

  const task = await db.cockpitTask
    .create({
      data: {
        title: `Listener log: ${pundit} — ${body.sport?.trim() || "sport n/a"}`,
        description:
          `${paraphrase}\n\n` +
          `Show: ${body.show?.trim() || "—"} · Direction: ${body.direction?.trim() || "—"} · ` +
          `Aired: ${body.airedOn?.trim() || "—"}\n` +
          `Attribution: Claim heard on SiriusXM (manual listener log)`,
        assignedAgent: "SCOUT",
        status: "NEEDS_REVIEW",
        priority: 40,
        riskLevel: "LOW",
        source: "manual_listener_log",
        payload: {
          provenance: "manual_listener_log",
          rights_status: "PERMISSION_REQUIRED",
          pundit,
          show: body.show?.trim() ?? null,
          sport: body.sport?.trim() ?? null,
          direction: body.direction?.trim() ?? null,
          airedOn: body.airedOn?.trim() ?? null,
        },
      },
      select: { id: true },
    })
    .catch(() => null);

  if (!task) {
    return NextResponse.json({ error: "db-unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, taskId: task.id });
}
