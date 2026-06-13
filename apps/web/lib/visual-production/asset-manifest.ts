/**
 * Plate manifest — which generated atmosphere plates are actually committed,
 * plus the CSS gradient base each one falls back to. `GeneratedPlate` reads from
 * here. Add a `still`/`motion` path only once the file is committed under
 * apps/web/public/immersive — until then the surface renders the gradient alone.
 *
 * Pure data. Keyed by world-slate asset id (apps/web/lib/visual-production/world-slates.ts).
 */
export interface PlateManifest {
  /** Always-painted CSS background (base + fallback). */
  readonly gradient: string;
  /** Committed still under /public/immersive, if any. */
  readonly still?: string;
  /** Committed looping video under /public/immersive, if any. */
  readonly motion?: string;
}

const OBSIDIAN = "#05060A";

export const PLATE_MANIFEST: Readonly<Record<string, PlateManifest>> = {
  "home-hero-cosmos": {
    gradient:
      `radial-gradient(70% 60% at 78% 18%, rgba(34,211,238,0.10), transparent 60%), ` +
      `radial-gradient(60% 55% at 12% 80%, rgba(139,92,246,0.14), transparent 65%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/home-hero-cosmos.webp",
  },
};

export function getPlate(id: string): PlateManifest | undefined {
  return PLATE_MANIFEST[id];
}
