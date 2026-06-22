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
  // Cinematic-entrance backdrop. Calm deep-space still:
  "intro-galaxy": {
    gradient:
      `radial-gradient(48% 42% at 18% 16%, rgba(34,211,238,0.10), transparent 62%), ` +
      `radial-gradient(70% 45% at 50% 116%, rgba(123,97,255,0.12), transparent 70%), ` +
      `linear-gradient(180deg, ${OBSIDIAN} 0%, #070810 60%, ${OBSIDIAN} 100%)`,
    still: "/immersive/intro-galaxy.webp",
  },
  // Signal Room hero — the new flagship intelligence command room
  "signal-room-hero": {
    gradient:
      `radial-gradient(70% 60% at 78% 18%, rgba(34,211,238,0.10), transparent 60%), ` +
      `radial-gradient(60% 55% at 12% 80%, rgba(139,92,246,0.14), transparent 65%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/signal-room-hero-a.webp",
    motion: "/immersive/signal-room-hero.mp4",
  },  // The Owner's Command Deck — a single operator watching the company run itself
  "command-deck": {
    gradient:
      `radial-gradient(70% 60% at 50% 35%, rgba(0,229,255,0.08), transparent 60%), ` +
      `radial-gradient(50% 50% at 85% 75%, rgba(123,97,255,0.10), transparent 65%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #080a12)`,
    still: "/immersive/command-deck-wide-a.webp",
    motion: "/immersive/command-deck-motion.mp4",
  },
  "command-deck-alt": {
    gradient:
      `radial-gradient(70% 60% at 50% 35%, rgba(0,229,255,0.08), transparent 60%), ` +
      `radial-gradient(50% 50% at 15% 80%, rgba(255,56,199,0.08), transparent 65%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #080a12)`,
    still: "/immersive/command-deck-wide-b.webp",
  },
  // Jarvis is speaking — the intelligence core, alive
  "jarvis-speaking": {
    gradient:
      `radial-gradient(60% 50% at 60% 45%, rgba(0,229,255,0.12), transparent 55%), ` +
      `radial-gradient(50% 40% at 30% 70%, rgba(123,97,255,0.10), transparent 60%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #080a12)`,
    still: "/immersive/jarvis-speaking-a.webp",
  },
  "jarvis-speaking-alt": {
    gradient:
      `radial-gradient(60% 50% at 55% 50%, rgba(0,229,255,0.10), transparent 55%), ` +
      `radial-gradient(50% 40% at 25% 75%, rgba(123,97,255,0.08), transparent 60%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #080a12)`,
    still: "/immersive/jarvis-speaking-b.webp",
  },

  // Legacy hero — preserved for fallback
  "home-hero-cosmos": {
    gradient:
      `radial-gradient(70% 60% at 78% 18%, rgba(34,211,238,0.10), transparent 60%), ` +
      `radial-gradient(60% 55% at 12% 80%, rgba(139,92,246,0.14), transparent 65%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/home-hero-cosmos.webp",
    motion: "/immersive/home-hero-cosmos.mp4",
  },
  "observatory-market-field": {
    gradient:
      `radial-gradient(60% 55% at 70% 25%, rgba(34,211,238,0.10), transparent 60%), ` +
      `radial-gradient(55% 50% at 20% 80%, rgba(255,56,199,0.10), transparent 65%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/observatory-market-field.webp",
    motion: "/immersive/observatory-market-field.mp4",
  },
  "no-bet-stillness": {
    gradient:
      `radial-gradient(70% 80% at 50% 0%, rgba(255,56,199,0.10), transparent 70%), ` +
      `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/no-bet-stillness.webp",
  },
  "today-mission": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.12), transparent 70%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/today-mission.webp",
    motion: "/immersive/today-mission.mp4",
  },
  "house-belonging": {
    gradient: `radial-gradient(55% 75% at 50% 0%, rgba(255,56,199,0.12), transparent 70%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/house-belonging.webp",
    motion: "/immersive/house-belonging.mp4",
  },
  "academy-path": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(139,92,246,0.12), transparent 70%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/academy-path.webp",
  },
  "board-command": {
    gradient: `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/board-command.webp",
  },
  "brief-horizon": {
    gradient: `linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/brief-horizon.webp",
  },
  "intelligence-deepsignal": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.10), transparent 70%), radial-gradient(50% 50% at 22% 80%, rgba(255,56,199,0.08), transparent 65%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/intelligence-deepsignal.webp",
  },
  "trends-field": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.11), transparent 70%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/trends-field.webp",
  },
  "performance-grid": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.10), transparent 70%), radial-gradient(50% 50% at 78% 20%, rgba(139,92,246,0.08), transparent 65%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/performance-grid.webp",
  },
  "proof-crystal": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.11), transparent 70%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/proof-crystal.webp",
  },
  "accountability-steady": {
    gradient: `radial-gradient(55% 80% at 50% 0%, rgba(139,92,246,0.11), transparent 70%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/accountability-steady.webp",
  },
  "players-constellation": {
    gradient: `radial-gradient(60% 80% at 50% 0%, rgba(34,211,238,0.10), transparent 70%), radial-gradient(50% 50% at 22% 78%, rgba(255,56,199,0.08), transparent 65%), linear-gradient(180deg, ${OBSIDIAN}, #0a0b12)`,
    still: "/immersive/players-constellation.webp",
  },
};

export function getPlate(id: string): PlateManifest | undefined {
  return PLATE_MANIFEST[id];
}
