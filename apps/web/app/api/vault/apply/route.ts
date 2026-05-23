import { NextResponse } from "next/server";
import { validateVaultApplicationInput } from "@/lib/vault/applications";

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

  const validation = validateVaultApplicationInput(body);

  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Vault application could not be accepted.",
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
        code: "VAULT_APPLICATIONS_NOT_ENABLED",
        message:
          "Vault application intake is validated, but storage is not enabled yet.",
      },
    },
    { status: 501 },
  );
}
