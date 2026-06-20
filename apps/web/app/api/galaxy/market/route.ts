import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfileId } from "@/lib/galaxy/session";
import { toggleWatch, createTradeOffer, listTradeOffers } from "@/lib/galaxy/market";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, offers: await listTradeOffers() });
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("watch"), cardSlug: z.string() }),
  z.object({
    action: z.literal("offer"),
    offerCardSlug: z.string(),
    requestCardSlug: z.string().optional(),
    note: z.string().max(120).optional(),
  }),
]);

export async function POST(req: Request): Promise<NextResponse> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Create your Galaxy Profile to use the Vault Market." }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid market payload." }, { status: 400 });
  }

  if (parsed.action === "watch") {
    const { watching } = await toggleWatch(profileId, parsed.cardSlug);
    return NextResponse.json({ ok: true, watching });
  }
  const offer = await createTradeOffer(profileId, parsed.offerCardSlug, parsed.requestCardSlug, parsed.note);
  return NextResponse.json({ ok: offer.ok });
}
