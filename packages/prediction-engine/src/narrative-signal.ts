/**
 * Narrative signal — a Tier-B contextual edge nudge from public media / discussion
 * narratives around an athlete (contract incentives, milestone chases, publicly
 * expressed motivation or frustration). This is the "atmosphere / heat map" layer:
 * it does NOT originate picks and is NEVER cited as public provenance. It folds
 * into edge only as a SMALL, hard-capped adjustment — motivation is a real but
 * weak performance signal, and overweighting narrative would betray the glass-box
 * discipline (structured data stays the source of truth).
 *
 * SCOPE / ETHICS — professional & competitive narratives ONLY: contract/incentive
 * terms, milestone proximity, role changes, publicly stated motivation/frustration.
 * It must NOT infer health, injuries, or private personal life; those require Tier-1
 * official confirmation through their own channels, never crowd sentiment.
 *
 * Pure functions, no I/O — fully unit-testable. Ingestion (Reddit API, RSS, news)
 * and wiring this nudge into the scorer are separate, founder-gated steps.
 */
import type { NarrativeTheme, NarrativeTextItem, ThemeHeat, NarrativeSignal } from "@sports/types";

// Re-export the shared signal shapes so engine-side callers can import them here.
export type { NarrativeTheme, NarrativeTextItem, ThemeHeat, NarrativeSignal };

/** Performance polarity: does a theme tend to lift (+1) or depress (-1) output? */
const THEME_POLARITY: Record<NarrativeTheme, 1 | -1> = {
  contract_incentive: 1,
  milestone_chase: 1,
  motivation_positive: 1,
  morale_negative: -1,
  role_elevated: 1,
  role_reduced: -1,
};

interface ThemeLexicon {
  readonly theme: NarrativeTheme;
  readonly patterns: readonly RegExp[];
}

const LEXICON: readonly ThemeLexicon[] = [
  {
    theme: "contract_incentive",
    patterns: [
      /\bincentives?\b/i,
      /\bcontract year\b/i,
      /\bbonus\b/i,
      /\bplaying for a (new )?(deal|contract)\b/i,
      /\bprove[- ]it deal\b/i,
      /\bescalator\b/i,
    ],
  },
  {
    theme: "milestone_chase",
    patterns: [
      /\bmilestone\b/i,
      /\b(franchise|career|nfl|nba|single-season) record\b/i,
      /\bchasing\b/i,
      /\bon pace for\b/i,
      /\bcareer[- ]high\b/i,
      /\bneeds? \d+ (more )?(yards|points|threes|rebounds|assists|goals|receptions)\b/i,
    ],
  },
  {
    theme: "motivation_positive",
    patterns: [
      /\brevenge game\b/i,
      /\bsomething to prove\b/i,
      /\bmotivated\b/i,
      /\bdoubted\b/i,
      /\bsnubbed\b/i,
      /\bbulletin board\b/i,
      /\bfired up\b/i,
    ],
  },
  {
    theme: "morale_negative",
    patterns: [
      /\bfrustrat(ed|ion)\b/i,
      /\bunhappy\b/i,
      /\btrade request\b/i,
      /\bhold[- ]?out\b/i,
      /\bbenched\b/i,
      /\bdisgruntled\b/i,
      /\bwants out\b/i,
      /\bdistraction\b/i,
    ],
  },
  {
    theme: "role_elevated",
    patterns: [
      /\bpromot(ed|ion)\b/i,
      /\bstarting (role|job)\b/i,
      /\bincreased (usage|role|snaps|minutes|targets)\b/i,
      /\bnamed (the )?starter\b/i,
      /\bfeatured back\b/i,
    ],
  },
  {
    theme: "role_reduced",
    patterns: [
      /\bdemot(ed|ion)\b/i,
      /\breduced (role|usage|snaps|minutes|targets)\b/i,
      /\bsplit (carries|reps|time)\b/i,
      /\bcommittee\b/i,
      /\blost (the )?(starting )?job\b/i,
    ],
  },
];

export interface AnalyzeOptions {
  /** Now, for recency decay (injectable for tests). */
  readonly now?: () => Date;
  /** Half-life of an item's weight, in days. Default 7. */
  readonly halfLifeDays?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function recencyWeight(publishedAt: string | undefined, now: Date, halfLifeDays: number): number {
  if (!publishedAt) return 1;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return 1;
  const ageDays = Math.max(0, (now.getTime() - t) / DAY_MS);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

function matchThemes(text: string): NarrativeTheme[] {
  const matched: NarrativeTheme[] = [];
  for (const entry of LEXICON) {
    if (entry.patterns.some((pattern) => pattern.test(text))) matched.push(entry.theme);
  }
  return matched;
}

/**
 * Reduce a bag of athlete-tagged text items to a single narrative signal.
 * Returns null when nothing in the bag triggers a theme (the honest default:
 * no narrative → no nudge).
 */
export function analyzeNarrative(
  items: readonly NarrativeTextItem[],
  options: AnalyzeOptions = {},
): NarrativeSignal | null {
  const now = (options.now ?? (() => new Date()))();
  const halfLifeDays = options.halfLifeDays ?? 7;

  const athleteId = items[0]?.athleteId ?? "";
  const heatByTheme = new Map<NarrativeTheme, { heat: number; hits: number }>();
  const sources = new Set<string>();
  let signedMass = 0;
  let totalMass = 0;
  let contributing = 0;

  for (const item of items) {
    const themes = matchThemes(item.text);
    if (themes.length === 0) continue;
    contributing += 1;
    sources.add(item.source);
    const w = recencyWeight(item.publishedAt, now, halfLifeDays) * (item.weight ?? 1);
    for (const theme of themes) {
      const prev = heatByTheme.get(theme) ?? { heat: 0, hits: 0 };
      heatByTheme.set(theme, { heat: prev.heat + w, hits: prev.hits + 1 });
      signedMass += w * THEME_POLARITY[theme];
      totalMass += w;
    }
  }

  if (contributing === 0 || totalMass <= 0) return null;

  const direction = clampUnit(signedMass / totalMass);
  // Intensity saturates with mass: a handful of strong, recent items ≈ full.
  const intensity = clamp01(1 - Math.exp(-totalMass / 3));
  // Confidence grows with volume AND source diversity — one noisy thread ≠ a trend.
  const diversity = 0.5 + 0.5 * Math.min(1, sources.size / 3);
  const confidence = clamp01((1 - Math.exp(-contributing / 5)) * diversity);

  const themes: ThemeHeat[] = [...heatByTheme.entries()]
    .map(([theme, v]) => ({ theme, heat: round4(v.heat), hits: v.hits }))
    .sort((a, b) => b.heat - a.heat);

  return {
    athleteId,
    direction: round4(direction),
    intensity: round4(intensity),
    confidence: round4(confidence),
    volume: contributing,
    themes,
  };
}

/** Default hard cap on the narrative edge nudge: ±1.0 point (0.01). Weak by design. */
export const DEFAULT_NARRATIVE_EDGE_CAP = 0.01;

/**
 * Map a narrative signal to a SMALL, hard-capped edge adjustment for the side the
 * athlete helps. delta = direction × intensity × confidence × cap, so by
 * construction |delta| ≤ cap: narrative can nudge a pick but never carry it.
 */
export function narrativeEdgeAdjustment(
  signal: NarrativeSignal | null,
  cap: number = DEFAULT_NARRATIVE_EDGE_CAP,
): number {
  if (!signal) return 0;
  const bound = Math.abs(cap);
  const raw = signal.direction * signal.intensity * signal.confidence * bound;
  return round4(Math.max(-bound, Math.min(bound, raw)));
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function clampUnit(x: number): number {
  return Math.max(-1, Math.min(1, x));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
