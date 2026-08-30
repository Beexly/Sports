/**
 * News Impact Engine — turns a breaking item into a decision.
 *
 * The value isn't aggregating beat-writer chatter (everyone does that). It's
 * answering, the instant a report lands: how reliable is the source, which
 * players and lines does it move, by how much, and what should you do — before
 * the market prices it in. Reliability tier × signal magnitude × freshness decay.
 *
 * Pure functions. Source roster and live ingestion are founder-gated; the engine
 * runs on any item regardless of where it came from.
 */

/** Source reliability tiers — the spine of the whole system. */
export type Tier = "Insider" | "Beat" | "Verified" | "Aggregator" | "Unconfirmed";

/** How much we trust a tier (0..1). National insiders break it first and right. */
export const TIER_WEIGHT: Record<Tier, number> = {
  Insider: 1.0, // Schefter / Rapoport tier — breaks national, rarely wrong
  Beat: 0.85, // the local beat writer in the building — first on practice/snaps
  Verified: 0.7, // official team / league feed — true but often late
  Aggregator: 0.45, // re-poster, no primary sourcing
  Unconfirmed: 0.2, // rumor, single anonymous, unvetted
};

export type SignalType =
  | "injury-out"
  | "injury-return"
  | "role-up"
  | "role-down"
  | "trade"
  | "scheme"
  | "suspension"
  | "weather"
  | "depth-chart";

/** Base fantasy magnitude (−100..100) and how fast it decays (half-life, minutes). */
const SIGNAL: Record<SignalType, { fantasy: number; market: number; halfLife: number; label: string }> = {
  "injury-out": { fantasy: -88, market: -55, halfLife: 90, label: "Ruled out" },
  "injury-return": { fantasy: 64, market: 40, halfLife: 120, label: "Returning" },
  "role-up": { fantasy: 52, market: 30, halfLife: 240, label: "Role up" },
  "role-down": { fantasy: -46, market: -26, halfLife: 240, label: "Role down" },
  trade: { fantasy: 40, market: 35, halfLife: 360, label: "Trade" },
  scheme: { fantasy: 30, market: 22, halfLife: 720, label: "Scheme shift" },
  suspension: { fantasy: -70, market: -44, halfLife: 180, label: "Suspension" },
  weather: { fantasy: -24, market: -30, halfLife: 300, label: "Weather" },
  "depth-chart": { fantasy: 34, market: 18, halfLife: 480, label: "Depth chart" },
};

export type NewsItem = {
  readonly id: string;
  readonly source: string;
  readonly tier: Tier;
  readonly team: string;
  readonly player?: string;
  readonly headline: string;
  readonly signal: SignalType;
  /** minutes since the report landed */
  readonly minutesAgo: number;
};

export type ImpactRead = {
  readonly item: NewsItem;
  readonly reliability: number; // 0..1
  readonly freshness: number; // 0..1, decays by signal half-life
  readonly fantasyDelta: number; // −100..100, reliability-scaled
  readonly marketDelta: number; // −100..100
  /** urgency = how much you should care RIGHT NOW (magnitude × reliability × freshness) */
  readonly urgency: number; // 0..100
  readonly action: string;
};

/** Exponential decay by the signal's half-life. */
function freshnessFor(signal: SignalType, minutesAgo: number): number {
  const { halfLife } = SIGNAL[signal];
  return Math.pow(0.5, Math.max(0, minutesAgo) / halfLife);
}

function actionFor(item: NewsItem, fantasyDelta: number, reliability: number): string {
  const who = item.player ?? item.team;
  if (reliability < 0.4) return `Hold: single ${item.tier.toLowerCase()} source; wait for a second report before acting on ${who}.`;
  switch (item.signal) {
    case "injury-out":
      return `Pivot off ${who}. The backup is the speculative add. Get there before your league.`;
    case "injury-return":
      return `${who} back in play; re-slot and discount the contingency you were holding.`;
    case "role-up":
      return `Buy-low window on ${who} closing; claim or start before the number moves.`;
    case "role-down":
      return `Fade ${who} this week; the touches are leaking elsewhere.`;
    case "suspension":
      return `${who} out multi-week: drop in redraft, the next man up is the real add.`;
    case "trade":
      return `New context for ${who}; revalue on the new offense before the market resets.`;
    case "scheme":
      return `Scheme change reshapes ${who}'s usage; see Scheme Intelligence for the cascade.`;
    case "weather":
      return `Game-script risk on ${who}; lean the floor, fade the ceiling.`;
    case "depth-chart":
      return `${who} climbing the chart: a snap-count story worth a speculative stash.`;
  }
}

export function readImpact(item: NewsItem): ImpactRead {
  const reliability = TIER_WEIGHT[item.tier];
  const freshness = freshnessFor(item.signal, item.minutesAgo);
  const base = SIGNAL[item.signal];
  const fantasyDelta = Math.round(base.fantasy * reliability);
  const marketDelta = Math.round(base.market * reliability);
  const urgency = Math.round(Math.abs(base.fantasy) * reliability * freshness);
  return { item, reliability, freshness, fantasyDelta, marketDelta, urgency, action: actionFor(item, fantasyDelta, reliability) };
}

export const signalLabel = (s: SignalType): string => SIGNAL[s].label;

/** Rank a wire of items by what deserves attention right now. */
export function rankWire(items: readonly NewsItem[]): ImpactRead[] {
  return items.map(readImpact).sort((a, b) => b.urgency - a.urgency);
}

// ─────────────── corroboration (a second source confirms) ───────────────

export type Corroboration = {
  /** distinct sources reporting the same player + signal */
  readonly sources: number;
  /** true once two or more distinct sources align */
  readonly confirmed: boolean;
  readonly sourceNames: readonly string[];
};

/** Group the wire by (team, player, signal) and count distinct sources per story. */
export function corroborate(items: readonly NewsItem[]): Map<string, Corroboration> {
  const out = new Map<string, Corroboration>();
  const groups = new Map<string, NewsItem[]>();
  for (const it of items) {
    // Only a specific PLAYER makes two headlines the same story. Without one,
    // "team + signal" is far too coarse to claim corroboration — two unrelated
    // Chiefs injury notes are not "confirmed by 2 sources". Player-less items
    // stand alone (sources: 1) so the badge can never be fabricated.
    if (!it.player) {
      out.set(it.id, { sources: 1, confirmed: false, sourceNames: [it.source] });
      continue;
    }
    const key = `${it.team}|${it.player}|${it.signal}`;
    const g = groups.get(key);
    if (g) g.push(it);
    else groups.set(key, [it]);
  }
  for (const group of groups.values()) {
    const sourceNames = [...new Set(group.map((g) => g.source))];
    const corr: Corroboration = { sources: sourceNames.length, confirmed: sourceNames.length >= 2, sourceNames };
    for (const it of group) out.set(it.id, corr);
  }
  return out;
}

export type CorroboratedRead = ImpactRead & { readonly corroboration: Corroboration };

/**
 * Rank the wire with corroboration: a confirmed story (two+ distinct sources)
 * gets a reliability lift, and its urgency, fantasy and market deltas scale with
 * it — corroboration is the difference between a rumor and a fact.
 */
export function rankWireCorroborated(items: readonly NewsItem[]): CorroboratedRead[] {
  const corr = corroborate(items);
  return items
    .map((it) => {
      const base = readImpact(it);
      const c = corr.get(it.id) ?? { sources: 1, confirmed: false, sourceNames: [it.source] };
      if (!c.confirmed) return { ...base, corroboration: c };
      const reliability = Math.min(1, base.reliability + 0.08 * (c.sources - 1));
      const ratio = base.reliability > 0 ? reliability / base.reliability : 1;
      return {
        ...base,
        reliability: Math.round(reliability * 1000) / 1000,
        urgency: Math.round(base.urgency * ratio),
        fantasyDelta: Math.round(base.fantasyDelta * ratio),
        marketDelta: Math.round(base.marketDelta * ratio),
        corroboration: c,
      };
    })
    .sort((a, b) => b.urgency - a.urgency);
}
