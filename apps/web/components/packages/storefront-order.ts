import type { PickPackageOffering } from "@/lib/packages/catalog";
import type { CoachGameWriteup } from "@/lib/writeups/coach-writeup-engine";

const FULL_SLATE_WINDOWS: ReadonlySet<PickPackageOffering["windowSlot"]> = new Set([
  "WEEKLY_PASS",
  "WEEKEND_PASS",
]);

export function isFullSlatePack(pkg: PickPackageOffering): boolean {
  return FULL_SLATE_WINDOWS.has(pkg.windowSlot);
}

/** Display order only: for-sale packs, full-slate pass first, then catalog order. */
export function orderPacksForStorefront(
  catalog: readonly PickPackageOffering[],
): PickPackageOffering[] {
  const forSale = catalog.filter((pkg) => pkg.forSale !== false);
  return [...forSale.filter(isFullSlatePack), ...forSale.filter((pkg) => !isFullSlatePack(pkg))];
}

export function lowestPriceDollars(packs: readonly PickPackageOffering[]): string | null {
  if (packs.length === 0) return null;
  return (Math.min(...packs.map((pkg) => pkg.standardPriceCents)) / 100).toFixed(0);
}

/**
 * Games that have not kicked off. getActiveUpcomingWriteups() falls back to
 * the whole slate when nothing is upcoming; a public dossier must never
 * feature a started or finished game next to an unlock link.
 */
export function upcomingOnly(
  writeups: readonly CoachGameWriteup[],
  now: Date = new Date(),
): CoachGameWriteup[] {
  return writeups.filter((w) => {
    const kickoff = Date.parse(w.kickoff);
    return !Number.isNaN(kickoff) && kickoff > now.getTime();
  });
}
