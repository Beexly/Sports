/**
 * GET /.well-known/receipt-keys.json — public keyring for verifying signed
 * GovernedReceipt objects. Returns only public key material + status; never
 * private keys (the InMemoryKeyringStore.listVerifiable() records may carry
 * privateKeyPem for the active key, so it is stripped explicitly here, not
 * merely omitted by luck of field ordering).
 */

import { NextResponse } from "next/server";
import { getGovernedKeyring } from "@/lib/governed/keyring-singleton";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const store = await getGovernedKeyring();
  const keys = await store.listVerifiable();
  return NextResponse.json({
    keys: keys.map((k) => ({ kid: k.kid, publicKeyPem: k.publicKeyPem, status: k.status })),
  });
}
