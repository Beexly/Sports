/**
 * DISCOVERY LAYER — Counterfactual Market Theater (Invention 32).
 *
 * A world model for market belief. Where the Einstein/Galileo oracle asks "what should move?", the
 * theater asks "what would the whole TIMELINE look like under a different reality?" — earlier/later
 * news, more attention, thinner liquidity, only one sharp reactor, a false rumor, a partial
 * correction. It generates an ordered reaction sequence (which actor reacts when), the candidate
 * windows (lag gaps), and the false-positive traps to expect. Rule-based and pure.
 */

export type Perturbation =
  | { readonly kind: "earlier_news"; readonly minutes: number }
  | { readonly kind: "later_news"; readonly minutes: number }
  | { readonly kind: "higher_attention"; readonly factor: number }
  | { readonly kind: "thinner_liquidity"; readonly factor: number }
  | { readonly kind: "single_sharp_reactor" }
  | { readonly kind: "false_rumor" }
  | { readonly kind: "partial_correction" };

export interface BaseScenario {
  readonly shockType: string;
  readonly shockTimeMin: number;
  /** Books ordered by typical reaction speed (fastest first), with their lag in minutes. */
  readonly books: ReadonlyArray<{ book: string; lagMin: number }>;
  /** Market families ordered by absorption (fastest first), with their lag in minutes. */
  readonly families: ReadonlyArray<{ family: string; lagMin: number }>;
}

export interface TimelineStep {
  readonly tMin: number;
  readonly actor: string;
  readonly action: string;
}

export interface AlternateTimeline {
  readonly perturbation: Perturbation;
  readonly steps: readonly TimelineStep[];
  /** Windows (minutes) where a faster actor leads a lagging one — candidate exploit windows. */
  readonly candidateWindows: ReadonlyArray<{ fromMin: number; toMin: number; laggard: string }>;
  readonly traps: readonly string[];
  readonly note: string;
}

/** Generate an alternate market timeline from a base scenario and a typed perturbation. */
export function simulateTimeline(base: BaseScenario, perturbation: Perturbation): AlternateTimeline {
  const traps: string[] = [];
  let shockTime = base.shockTimeMin;
  let lagScale = 1;
  let publishable = true;

  switch (perturbation.kind) {
    case "earlier_news": shockTime -= perturbation.minutes; break;
    case "later_news": shockTime += perturbation.minutes; break;
    case "higher_attention": lagScale *= 1 + 0.3 * (perturbation.factor - 1); traps.push("attention may move surfaces beyond causal justification (overreaction trap)"); break;
    case "thinner_liquidity": lagScale *= perturbation.factor; traps.push("liquidity mirage: a tradable-looking price may die on size/spread"); break;
    case "single_sharp_reactor": traps.push("only one book moves — copycat cascade may not follow; the move may be a head-fake"); break;
    case "false_rumor": publishable = false; traps.push("FALSE RUMOR: quarantine — any move is correction-prone; no public claim"); break;
    case "partial_correction": traps.push("median corrected but tail/alt ladder may not — median-tail split candidate"); break;
  }

  const steps: TimelineStep[] = [{ tMin: shockTime, actor: "reality", action: `${base.shockType} occurs` }];
  const bookReacts = base.books.map((b) => ({ book: b.book, t: shockTime + b.lagMin * lagScale })).sort((a, b) => a.t - b.t);
  for (const r of bookReacts) steps.push({ tMin: Number(r.t.toFixed(1)), actor: r.book, action: "reprices main market" });
  const famReacts = base.families.map((f) => ({ family: f.family, t: shockTime + f.lagMin * lagScale })).sort((a, b) => a.t - b.t);
  for (const r of famReacts) steps.push({ tMin: Number(r.t.toFixed(1)), actor: r.family, action: "absorbs into family" });
  steps.sort((a, b) => a.tMin - b.tMin);

  // Candidate windows: between the fastest family and each slower family.
  const candidateWindows: Array<{ fromMin: number; toMin: number; laggard: string }> = [];
  if (famReacts.length >= 2) {
    const lead = famReacts[0]!;
    for (const r of famReacts.slice(1)) if (r.t - lead.t > 1) candidateWindows.push({ fromMin: Number(lead.t.toFixed(1)), toMin: Number(r.t.toFixed(1)), laggard: r.family });
  }

  return {
    perturbation,
    steps,
    candidateWindows,
    traps,
    note: publishable ? "Counterfactual timeline generated (shadow/research only)." : "Counterfactual contains a FALSE-RUMOR branch — quarantined, no public expression.",
  };
}
