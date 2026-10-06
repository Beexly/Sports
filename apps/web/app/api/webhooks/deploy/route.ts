import { NextRequest, NextResponse } from "next/server";
import { db } from "@sports/db";
import type { DeployEvent } from "@sports/compliance";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deliveryId =
    (typeof body.id === "string" && body.id) ||
    (typeof body.deliveryId === "string" && body.deliveryId) ||
    req.headers.get("x-delivery-id") ||
    req.headers.get("x-github-delivery");

  if (!deliveryId) {
    return NextResponse.json(
      { error: "Missing delivery ID (id field or x-delivery-id header)" },
      { status: 400 }
    );
  }

  const env = typeof body.env === "string" ? body.env : "production";
  const prNumber = typeof body.prNumber === "number" ? body.prNumber : undefined;
  const requiredChecksOk = typeof body.requiredChecksOk === "boolean" ? body.requiredChecksOk : false;

  let deployedAt: Date | undefined;
  if (typeof body.deployedAt === "string" || typeof body.deployedAt === "number") {
    const parsed = new Date(body.deployedAt);
    if (!isNaN(parsed.getTime())) {
      deployedAt = parsed;
    }
  }

  const jsonPayload = JSON.parse(JSON.stringify(body));

  const logRow = await db.deployWebhookLog.upsert({
    where: { id: deliveryId },
    create: {
      id: deliveryId,
      env,
      prNumber: prNumber ?? null,
      requiredChecksOk,
      deployedAt: deployedAt ?? null,
      payload: jsonPayload,
    },
    update: {
      env,
      prNumber: prNumber ?? null,
      requiredChecksOk,
      deployedAt: deployedAt ?? null,
      payload: jsonPayload,
    },
  });

  const event: DeployEvent = {
    id: logRow.id,
    env: logRow.env,
    prNumber: logRow.prNumber ?? undefined,
    requiredChecksOk: logRow.requiredChecksOk,
    deployedAt: (logRow.deployedAt ?? logRow.createdAt).toISOString(),
  };

  return NextResponse.json({ received: true, event });
}
