/**
 * Galaxy Dynasty — boosts & consumables server lib (Stage 3 revenue).
 *
 * Inventory + active timed effects. Effects only ever touch the cosmetic/
 * progression economy (Credits + Season Points multipliers, streak shields,
 * cosmetic bursts/spotlights) — NEVER a graded outcome, rating, calibration, or
 * skill XP (enforced by the engine allow-list + brand gate test). Nova purchases
 * are Stripe TEST mode only (D-014). Crash-safe in DB-stub mode.
 */

import { db } from "@sports/db";
import {
  getConsumable,
  combinedMultiplier,
  CONSUMABLES_CATALOG,
  type ActiveEffect,
} from "@sports/galaxy-engine";
import { assertTestModeOnly } from "./store.js";

export interface ConsumableInventoryItem {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly description: string;
  readonly rarity: string;
  readonly source: string;
  readonly novaPrice: number | null;
  readonly owned: number;
  readonly timed: boolean;
}

export async function getActiveEffects(profileId: string): Promise<ActiveEffect[]> {
  if (profileId === "stub") return [];
  try {
    const rows = await db.galaxyActiveEffect.findMany({
      where: { profileId, expiresAt: { gt: new Date() } },
      select: { kind: true, magnitude: true },
    });
    return rows.map((r) => ({ kind: r.kind as ActiveEffect["kind"], magnitude: r.magnitude }));
  } catch {
    return [];
  }
}

/** Combined Credits + Season Point multipliers from active boosts (capped). */
export async function getActiveMultipliers(profileId: string): Promise<{ credits: number; season: number }> {
  const effects = await getActiveEffects(profileId);
  return {
    credits: combinedMultiplier(effects, "credits_boost"),
    season: combinedMultiplier(effects, "season_boost"),
  };
}

export interface AcquireConsumableResult {
  readonly ok: boolean;
  readonly testMode?: boolean;
  readonly error?: string;
}

export async function acquireConsumable(profileId: string, consumableId: string, qty = 1): Promise<AcquireConsumableResult> {
  const c = getConsumable(consumableId);
  if (!c) return { ok: false, error: "Unknown consumable." };
  if (profileId === "stub") return { ok: false, error: "Create your Galaxy Profile first." };

  let testMode = false;
  if (c.source === "nova") {
    try {
      assertTestModeOnly();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Commerce unavailable." };
    }
    testMode = true;
  }

  try {
    await db.galaxyConsumableInventory.upsert({
      where: { profileId_consumableId: { profileId, consumableId } },
      update: { quantity: { increment: qty } },
      create: { profileId, consumableId, quantity: qty },
    });
    return { ok: true, testMode };
  } catch {
    return { ok: false, error: "Could not acquire." };
  }
}

export interface ActivateResult {
  readonly ok: boolean;
  readonly message?: string;
  readonly error?: string;
}

export async function activateConsumable(profileId: string, consumableId: string): Promise<ActivateResult> {
  const c = getConsumable(consumableId);
  if (!c) return { ok: false, error: "Unknown consumable." };
  if (profileId === "stub") return { ok: false, error: "Create your Galaxy Profile first." };

  try {
    const inv = await db.galaxyConsumableInventory.findUnique({
      where: { profileId_consumableId: { profileId, consumableId } },
    });
    if (!inv || inv.quantity <= 0) return { ok: false, error: "You don't have that consumable." };

    if (c.kind === "streak_shield") {
      return { ok: false, error: "Streak Shields activate automatically when a missed day would reset your streak." };
    }

    // Consume one.
    await db.galaxyConsumableInventory.update({
      where: { id: inv.id },
      data: { quantity: { decrement: 1 } },
    });

    if (c.durationHours > 0) {
      const expiresAt = new Date(Date.now() + c.durationHours * 60 * 60 * 1000);
      await db.galaxyActiveEffect.create({
        data: { profileId, kind: c.kind, magnitude: c.magnitude, expiresAt },
      });
      return { ok: true, message: `${c.name} active for ${c.durationHours}h.` };
    }
    // Instant cosmetic (emote burst) — consumed, no persistence needed.
    return { ok: true, message: `${c.name} used.` };
  } catch {
    return { ok: false, error: "Could not activate." };
  }
}

/** Consume one Streak Shield if the player owns any. Returns true if used. */
export async function consumeStreakShield(profileId: string): Promise<boolean> {
  if (profileId === "stub") return false;
  try {
    const rows = await db.galaxyConsumableInventory.findMany({ where: { profileId, quantity: { gt: 0 } } });
    for (const row of rows) {
      const def = getConsumable(row.consumableId);
      if (def?.kind === "streak_shield") {
        await db.galaxyConsumableInventory.update({ where: { id: row.id }, data: { quantity: { decrement: 1 } } });
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function getConsumableInventory(profileId: string): Promise<ConsumableInventoryItem[]> {
  const counts = new Map<string, number>();
  if (profileId !== "stub") {
    try {
      const rows = await db.galaxyConsumableInventory.findMany({ where: { profileId } });
      for (const r of rows) counts.set(r.consumableId, r.quantity);
    } catch {
      /* no DB */
    }
  }
  return CONSUMABLES_CATALOG.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    description: c.description,
    rarity: c.rarity,
    source: c.source,
    novaPrice: c.novaPrice ?? null,
    owned: counts.get(c.id) ?? 0,
    timed: c.durationHours > 0,
  }));
}
