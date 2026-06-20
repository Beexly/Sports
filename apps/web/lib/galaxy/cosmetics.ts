/**
 * Galaxy Dynasty — cosmetics economy server lib (Stage 2 revenue).
 *
 * Owning + equipping cosmetics. EARN/season cosmetics require an achievement;
 * Nova cosmetics are bought in Stripe TEST mode only (no charge, no cash — D-014).
 * Cosmetics never grant power. Crash-safe in DB-stub mode.
 */

import { db, isStubMode } from "@sports/db";
import {
  getCosmetic,
  isCosmeticUnlocked,
  starterCosmetics,
  COSMETICS_CATALOG,
  COSMETIC_CATEGORIES,
  BOSSES,
  type CosmeticDef,
  type CosmeticUnlockContext,
} from "@sports/galaxy-engine";
import { assertTestModeOnly } from "./store.js";
import type { ProfileView } from "./types.js";

function ctxFromProfile(p: ProfileView): CosmeticUnlockContext {
  return {
    bossCleared: new Set(p.bossCleared),
    bossClearedCount: p.bossCleared.length,
    bossTotal: BOSSES.length,
    seasonTier: p.seasonTier,
    ratingTierName: p.ratingTier,
  };
}

export async function getOwnedCosmeticIds(profileId: string): Promise<Set<string>> {
  if (profileId === "stub") return new Set(starterCosmetics().map((c) => c.id));
  try {
    const rows = await db.galaxyCosmeticOwnership.findMany({
      where: { profileId },
      select: { cosmeticId: true },
    });
    const set = new Set(rows.map((r) => r.cosmeticId));
    for (const c of starterCosmetics()) set.add(c.id); // starters always owned
    return set;
  } catch {
    return new Set(starterCosmetics().map((c) => c.id));
  }
}

export async function getEquipped(profileId: string): Promise<Record<string, string>> {
  if (profileId === "stub") return {};
  try {
    const row = await db.galaxyProfile.findUnique({
      where: { id: profileId },
      select: { equippedCosmetics: true },
    });
    const eq = row?.equippedCosmetics;
    return eq && typeof eq === "object" ? (eq as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Grant the starter cosmetics on onboarding and equip sensible defaults. */
export async function grantStarterCosmetics(profileId: string): Promise<void> {
  if (profileId === "stub") return;
  try {
    const starters = starterCosmetics();
    for (const c of starters) {
      await db.galaxyCosmeticOwnership.upsert({
        where: { profileId_cosmeticId: { profileId, cosmeticId: c.id } },
        update: {},
        create: { profileId, cosmeticId: c.id, category: c.category, acquiredVia: "starter" },
      });
    }
    const equipped: Record<string, string> = {};
    for (const c of starters) equipped[c.category] = c.id;
    await db.galaxyProfile.update({ where: { id: profileId }, data: { equippedCosmetics: equipped } });
  } catch {
    /* no DB */
  }
}

export interface AcquireResult {
  readonly ok: boolean;
  readonly testMode?: boolean;
  readonly error?: string;
}

export async function acquireCosmetic(
  profileId: string,
  cosmeticId: string,
  profile: ProfileView,
): Promise<AcquireResult> {
  const c = getCosmetic(cosmeticId);
  if (!c) return { ok: false, error: "Unknown cosmetic." };
  if (profileId === "stub") return { ok: false, error: "Create your Galaxy Profile first." };

  let acquiredVia: string;
  let testMode = false;

  if (c.source === "starter") {
    acquiredVia = "starter";
  } else if (c.source === "nova") {
    // Stripe test-mode only — never a live charge (hard-stop #1).
    try {
      assertTestModeOnly();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Commerce unavailable." };
    }
    acquiredVia = "nova_test";
    testMode = true;
  } else {
    // earn / season_drop — must meet the requirement.
    if (!isCosmeticUnlocked(c, ctxFromProfile(profile))) {
      return { ok: false, error: "Not unlocked yet — keep playing to earn it." };
    }
    acquiredVia = "earned";
  }

  try {
    await db.galaxyCosmeticOwnership.upsert({
      where: { profileId_cosmeticId: { profileId, cosmeticId } },
      update: {},
      create: { profileId, cosmeticId, category: c.category, acquiredVia },
    });
    return { ok: !isStubMode(), testMode };
  } catch {
    return { ok: false, error: "Could not acquire." };
  }
}

export async function equipCosmetic(profileId: string, cosmeticId: string): Promise<AcquireResult> {
  const c = getCosmetic(cosmeticId);
  if (!c) return { ok: false, error: "Unknown cosmetic." };
  if (profileId === "stub") return { ok: false, error: "Create your Galaxy Profile first." };

  const owned = await getOwnedCosmeticIds(profileId);
  if (!owned.has(cosmeticId)) return { ok: false, error: "You don't own that yet." };

  try {
    const equipped = await getEquipped(profileId);
    equipped[c.category] = cosmeticId;
    await db.galaxyProfile.update({ where: { id: profileId }, data: { equippedCosmetics: equipped } });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not equip." };
  }
}

export interface WardrobeItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly source: string;
  readonly rarity: string;
  readonly description: string;
  readonly novaPrice: number | null;
  readonly owned: boolean;
  readonly equipped: boolean;
  readonly unlockable: boolean;
  readonly requirementLabel: string | null;
}

export interface WardrobeCategory {
  readonly id: string;
  readonly label: string;
  readonly items: readonly WardrobeItem[];
}

export async function getWardrobe(profileId: string, profile: ProfileView): Promise<WardrobeCategory[]> {
  const owned = await getOwnedCosmeticIds(profileId);
  const equipped = await getEquipped(profileId);
  const ctx = ctxFromProfile(profile);

  const toItem = (c: CosmeticDef): WardrobeItem => {
    const isOwned = owned.has(c.id);
    const unlockable = (c.source === "earn" || c.source === "season_drop") && !isOwned && isCosmeticUnlocked(c, ctx);
    const reqLabel = c.requirement && "label" in c.requirement ? c.requirement.label : null;
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      source: c.source,
      rarity: c.rarity,
      description: c.description,
      novaPrice: c.novaPrice ?? null,
      owned: isOwned,
      equipped: equipped[c.category] === c.id,
      unlockable,
      requirementLabel: reqLabel,
    };
  };

  return COSMETIC_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    items: COSMETICS_CATALOG.filter((c) => c.category === cat.id).map(toItem),
  })).filter((cat) => cat.items.length > 0);
}

/** The player's equipped title name (for My Dynasty), if any. */
export async function getEquippedTitle(profileId: string): Promise<string | null> {
  const equipped = await getEquipped(profileId);
  const id = equipped["title"];
  if (!id) return null;
  return getCosmetic(id)?.name ?? null;
}
