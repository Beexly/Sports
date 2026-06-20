/**
 * Galaxy Dynasty — Vault Market PROTOTYPE + watchlist (Stage 2).
 *
 * Collector tooling: watch cards (value tracking) and post card-for-card trade
 * offers. NO currency, NO cash, NO physical custody (Credit Constitution §4.2;
 * custody/settlement is Stage-3 partner-gated). Offers are recorded as interest;
 * acceptance/settlement is intentionally deferred and logged.
 */

import { db } from "@sports/db";

export interface TradeOfferView {
  readonly id: string;
  readonly fromHandle: string;
  readonly offerCardName: string;
  readonly offerCardSlug: string;
  readonly requestCardSlug: string | null;
  readonly note: string | null;
  readonly createdAt: string;
}

export async function toggleWatch(profileId: string, cardSlug: string): Promise<{ watching: boolean }> {
  if (profileId === "stub") return { watching: false };
  try {
    const card = await db.galaxyCard.findUnique({ where: { slug: cardSlug } });
    if (!card) throw new Error("Unknown card.");
    const existing = await db.cardWatch.findUnique({
      where: { profileId_cardId: { profileId, cardId: card.id } },
    });
    if (existing) {
      await db.cardWatch.delete({ where: { id: existing.id } });
      return { watching: false };
    }
    await db.cardWatch.create({ data: { profileId, cardId: card.id } });
    return { watching: true };
  } catch {
    return { watching: false };
  }
}

export async function listWatchedSlugs(profileId: string): Promise<string[]> {
  if (profileId === "stub") return [];
  try {
    const rows = await db.cardWatch.findMany({
      where: { profileId },
      include: { card: { select: { slug: true } } },
    });
    return rows.map((r) => r.card.slug);
  } catch {
    return [];
  }
}

export async function createTradeOffer(
  profileId: string,
  offerCardSlug: string,
  requestCardSlug?: string,
  note?: string,
): Promise<{ ok: boolean }> {
  if (profileId === "stub") return { ok: false };
  try {
    const card = await db.galaxyCard.findUnique({ where: { slug: offerCardSlug } });
    if (!card) throw new Error("Unknown card.");
    await db.cardTradeOffer.create({
      data: {
        fromProfileId: profileId,
        offerCardId: card.id,
        requestCardSlug: requestCardSlug ?? null,
        note: note ?? null,
      },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function listTradeOffers(): Promise<TradeOfferView[]> {
  try {
    const rows = await db.cardTradeOffer.findMany({
      where: { status: "OPEN" },
      include: { fromProfile: { select: { handle: true } }, offerCard: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
    return rows.map((r) => ({
      id: r.id,
      fromHandle: r.fromProfile?.handle ?? "Player",
      offerCardName: r.offerCard.name,
      offerCardSlug: r.offerCard.slug,
      requestCardSlug: r.requestCardSlug,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
