/**
 * Sealed card freshness.
 *
 * The sealed card is generated per slate. Once the slate has been played, its
 * rows are settled history, not live plays: serving them as "today's picks"
 * offers tickets on games that already happened. This gate makes that
 * impossible by refusing to render a card past its shelf life.
 *
 * Pure by design: the caller passes `now` so the boundary is testable without
 * freezing the clock.
 */

/** A card is live for the week it was sealed. Past that it is history. */
export const CARD_MAX_AGE_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CardFreshness {
  readonly stale: boolean;
  readonly ageDays: number;
  readonly generatedAt: string | null;
}

export function cardAgeDays(generatedAt: string | null | undefined, now: Date): number | null {
  if (!generatedAt) return null;
  const sealed = new Date(`${generatedAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(sealed.getTime())) return null;
  const elapsed = now.getTime() - sealed.getTime();
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / MS_PER_DAY);
}

export function cardFreshness(
  generatedAt: string | null | undefined,
  now: Date = new Date(),
  maxAgeDays: number = CARD_MAX_AGE_DAYS,
): CardFreshness {
  const age = cardAgeDays(generatedAt, now);
  if (age === null) {
    // An undated card cannot be shown as live: no date means no proof it is current.
    return { stale: true, ageDays: Number.POSITIVE_INFINITY, generatedAt: generatedAt ?? null };
  }
  return { stale: age > maxAgeDays, ageDays: age, generatedAt: generatedAt ?? null };
}
