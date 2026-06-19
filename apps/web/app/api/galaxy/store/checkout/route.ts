import { NextResponse } from "next/server";
import { z } from "zod";
import { beginNovaCheckout } from "@/lib/galaxy/store";

export const dynamic = "force-dynamic";

const Body = z.object({ sku: z.string() });

/**
 * Nova-pack checkout (Stripe TEST MODE only). Returns a test-mode scaffold and
 * never creates a live charge — hard-stop #1 is enforced in `beginNovaCheckout`.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, checkout: beginNovaCheckout(parsed.sku) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout unavailable.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
