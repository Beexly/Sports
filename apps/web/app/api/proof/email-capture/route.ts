import { NextResponse } from "next/server";
import { validateProofSurfaceEmailCapture } from "@/lib/proof-email-capture";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const validation = validateProofSurfaceEmailCapture(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Email capture could not be accepted.",
          fields: validation.errors,
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "PROOF_EMAIL_CAPTURE_NOT_ENABLED",
        message:
          "Email capture is validated, but subscriber storage is not enabled yet.",
      },
    },
    { status: 501 },
  );
}
