/**
 * Decision Quality — shared spine for Galaxy's process-over-outcome layer.
 *
 * This file is the single source of truth for the four-dimensional pick
 * review framework (autopsy), the bettor archetype model (profile), the
 * parlay diagnostic taxonomy, the roster shock and coaching edge factor
 * sets, and the cross-surface vocabulary that ties them together.
 *
 * Consumed by:
 *  - `app/autopsy/page.tsx` — autopsy framework cards
 *  - `app/profile/page.tsx` — Betting Brain Profile dimensions and archetypes
 *  - `app/parlay-mri/page.tsx` — parlay diagnostic taxonomy
 *  - `app/roster-shock/page.tsx` — roster impact factor cards
 *  - `app/coaching-edge/page.tsx` — coaching factor cards
 *  - `app/briefing/page.tsx` — adaptive framing (future)
 *  - `app/command/page.tsx` — discipline patterns (future)
 *  - PickCard component — grade badges and confidence framing
 *  - Future: per-archetype briefing rules, shareable autopsy cards
 *
 * Compliance reminder: keep public taxonomies here. The numeric
 * thresholds that derive a grade or trigger a verdict are TRADE SECRETS
 * (TS-008, TS-001) and must remain server-side.
 */

// ─── Autopsy ──────────────────────────────────────────────────────────────

export type AutopsyDimension = "process" | "signal" | "clv" | "outcome";

export type ProcessGrade = "A" | "B" | "C" | "D";
export type SignalGrade = "A" | "B" | "C" | "D";
export type ClvGrade = "+" | "0" | "−";
export type OutcomeGrade = "W" | "L" | "P";

export interface AutopsyDimensionEntry {
  readonly id: AutopsyDimension;
  readonly label: string;
  readonly description: string;
  readonly grades: ReadonlyArray<{ grade: string; meaning: string }>;
}

export const AUTOPSY_DIMENSIONS: ReadonlyArray<AutopsyDimensionEntry> = [
  {
    id: "process",
    label: "Process Grade",
    description:
      "Did you follow your stated decision process before acting? Did you check the board, the pass list, the market context?",
    grades: [
      { grade: "A", meaning: "Full process — board, pass list, market, bankroll check" },
      { grade: "B", meaning: "Most of process — missed one step" },
      { grade: "C", meaning: "Partial — acted on a single factor without cross-check" },
      { grade: "D", meaning: "Minimal — narrative or emotion-driven action" },
    ],
  },
  {
    id: "signal",
    label: "Signal Grade",
    description:
      "How strong was the underlying signal at the time of the bet? This is not the outcome — it's what the model said when you acted.",
    grades: [
      { grade: "A", meaning: "Elite — edge index 80+, full factor confirmation" },
      { grade: "B", meaning: "High — edge index 65–79, majority factor confirmation" },
      { grade: "C", meaning: "Marginal — edge index 50–64, mixed signals" },
      { grade: "D", meaning: "Weak or absent — acted against model or below threshold" },
    ],
  },
  {
    id: "clv",
    label: "CLV Result",
    description:
      "Did the closing line validate your entry price? Positive CLV means you got better than market price.",
    grades: [
      { grade: "+", meaning: "Positive CLV — your entry was better than the closing line" },
      { grade: "0", meaning: "Flat CLV — entry was near the closing line" },
      { grade: "−", meaning: "Negative CLV — market moved against your entry after the bet" },
    ],
  },
  {
    id: "outcome",
    label: "Outcome",
    description:
      "What happened. The least important of the four dimensions for process review — result variance is real.",
    grades: [
      { grade: "W", meaning: "Win — pick covered" },
      { grade: "L", meaning: "Loss — pick did not cover" },
      { grade: "P", meaning: "Push — no action" },
    ],
  },
];

export type AutopsyQuadrant =
  | "good-process-bad-outcome"
  | "bad-process-good-outcome"
  | "bad-process-bad-outcome"
  | "good-process-good-outcome";

export interface AutopsyPattern {
  readonly id: AutopsyQuadrant;
  readonly pattern: string;
  readonly summary: string;
  readonly action: string;
  readonly accent: string;
}

export const AUTOPSY_PATTERNS: ReadonlyArray<AutopsyPattern> = [
  {
    id: "good-process-bad-outcome",
    pattern: "Good process, bad outcome",
    summary:
      "A+ process, A signal, positive CLV — loss. This is variance. You did nothing wrong. Do not adjust your process based on this result.",
    action: "Log it. Move on. Sample size is the answer.",
    accent: "border-l-cyan-500",
  },
  {
    id: "bad-process-good-outcome",
    pattern: "Bad process, good outcome",
    summary:
      "D process, C signal, negative CLV — win. This is the most dangerous outcome. It reinforces a bad pattern. You got lucky.",
    action:
      "Treat this as a loss for process review purposes. Identify which step you skipped and add a gate.",
    accent: "border-l-red-500",
  },
  {
    id: "bad-process-bad-outcome",
    pattern: "Bad process, bad outcome",
    summary:
      "D process, poor signal, negative CLV — loss. This is the clearest autopsy case. The result confirmed what the process should have prevented.",
    action:
      "Build a structural check: which step, if added, would have stopped this bet? Add it as a mandatory gate.",
    accent: "border-l-amber-500",
  },
  {
    id: "good-process-good-outcome",
    pattern: "Good process, good outcome",
    summary:
      "A process, A signal, positive CLV — win. This is what sustainable edge looks like. The process worked and the result confirmed.",
    action: "Identify what made this bet a strong signal. Can you replicate the conditions?",
    accent: "border-l-green-500",
  },
];

// ─── Betting Brain Profile ────────────────────────────────────────────────

export type ProfileDimensionId =
  | "risk-tolerance"
  | "betting-style"
  | "volume"
  | "tilt-trigger"
  | "sport-depth";

export interface ProfileDimensionOption {
  readonly value: string;
  readonly label: string;
  readonly sub: string;
}

export interface ProfileDimension {
  readonly id: ProfileDimensionId;
  readonly label: string;
  readonly description: string;
  readonly options: ReadonlyArray<ProfileDimensionOption>;
}

export type BetorArchetype =
  | "sharp-disciplined"
  | "situational-reader"
  | "market-mover"
  | "action-driven";

export interface ArchetypeEntry {
  readonly id: BetorArchetype;
  readonly label: string;
  readonly description: string;
  readonly approach: string;
  readonly riskNote: string;
  readonly accent: string;
}

export const PROFILE_ARCHETYPES: ReadonlyArray<ArchetypeEntry> = [
  {
    id: "sharp-disciplined",
    label: "Sharp & Disciplined",
    description:
      "You apply process before emotion. You skip games readily. Your win rate is above your experience level because you protect yourself from bad-process bets.",
    approach: "Model-first + flat betting + selective volume + long-run thinking.",
    riskNote:
      "Watch for: under-betting high-edge spots because the process feels 'too easy.' Edge is earned slowly.",
    accent: "border-l-cyan-500",
  },
  {
    id: "situational-reader",
    label: "Situational Reader",
    description:
      "You find edges in context others miss — rest, travel, lineup, motivation. Your research is qualitative and matchup-driven.",
    approach: "Situational + moderate sizing + selective on high-conviction spots.",
    riskNote:
      "Watch for: narrative bias. Situational context is real, but it must confirm the model, not replace it.",
    accent: "border-l-violet-500",
  },
  {
    id: "market-mover",
    label: "Market Follower",
    description:
      "You're fast. You read line movement intuitively. Your edge comes from acting before the market reprices.",
    approach: "Market-reader + variable sizing + moderate volume + speed.",
    riskNote:
      "Watch for: steam chasing. Following a move you didn't identify is not edge — it's catching up to one.",
    accent: "border-l-amber-500",
  },
  {
    id: "action-driven",
    label: "Action-Driven",
    description:
      "You enjoy the process and act frequently. Volume can work — but only with strict per-bet discipline.",
    approach: "High volume + strict 1% flat-bet cap + must clear the No-Bet list before acting.",
    riskNote:
      "Watch for: quantity as a substitute for quality. More bets at lower conviction is negative-EV by definition.",
    accent: "border-l-rose-500",
  },
];

// ─── Parlay MRI ───────────────────────────────────────────────────────────

export type ParlayDiagnosticId =
  | "positive-correlation"
  | "negative-correlation"
  | "same-game"
  | "ev-dilution"
  | "structural-weakness"
  | "stake-discipline";

export interface ParlayDiagnostic {
  readonly id: ParlayDiagnosticId;
  readonly title: string;
  readonly summary: string;
  readonly severity: "info" | "caution" | "warn";
}

export const PARLAY_DIAGNOSTICS: ReadonlyArray<ParlayDiagnostic> = [
  {
    id: "positive-correlation",
    title: "Positive correlation",
    summary:
      "Same-team legs price as one event. Books adjust the implied probability; bettors don't.",
    severity: "warn",
  },
  {
    id: "negative-correlation",
    title: "Negative correlation",
    summary:
      "Independent markets — closest to fair value. Acceptable when each leg is a standalone thesis.",
    severity: "info",
  },
  {
    id: "same-game",
    title: "Same-game parlay",
    summary:
      "Heavily correlated. Significant additional margin built into the price.",
    severity: "warn",
  },
  {
    id: "ev-dilution",
    title: "EV dilution by legs",
    summary:
      "Every leg added amplifies the vig. A 4-leg parlay at standard -110 juice carries roughly thirteen-percent expected loss against fair pricing.",
    severity: "caution",
  },
  {
    id: "structural-weakness",
    title: "Structural weakness",
    summary:
      "If you can't articulate why each leg is in this parlay, that is the diagnostic. Add structure or pass.",
    severity: "warn",
  },
  {
    id: "stake-discipline",
    title: "Stake discipline",
    summary:
      "Parlays are high-variance instruments. Cap stake at 1% of bankroll; treat as entertainment, not bankroll strategy.",
    severity: "caution",
  },
];

// ─── Roster Shock ─────────────────────────────────────────────────────────

export type RosterShockFactorId =
  | "starter-impact"
  | "usage-redistribution"
  | "pace-effect"
  | "line-timing"
  | "market-depth";

export interface RosterShockFactor {
  readonly id: RosterShockFactorId;
  readonly title: string;
  readonly description: string;
}

export const ROSTER_SHOCK_FACTORS: ReadonlyArray<RosterShockFactor> = [
  {
    id: "starter-impact",
    title: "Starter Impact",
    description:
      "Primary contributor out. Usage shifts, role elevation, production floor drops. The market typically prices replacement-level; role-adjusted impact is often larger.",
  },
  {
    id: "usage-redistribution",
    title: "Usage Redistribution",
    description:
      "Who absorbs the minutes? The second player, not the starter's backup, often absorbs the highest share of usage. Prop markets are slow to reprice.",
  },
  {
    id: "pace-effect",
    title: "Pace Effect",
    description:
      "Lineup changes alter rotation depth and foul-trouble dynamics. Teams with shorter benches see pace changes that affect totals even when the spread is accurately repriced.",
  },
  {
    id: "line-timing",
    title: "Line Timing",
    description:
      "The gap between announcement and line reprice is the window. First-mover advantage exists. After 20 minutes, assume the market has adjusted.",
  },
  {
    id: "market-depth",
    title: "Market Depth",
    description:
      "Thin markets (alt props, specific books) restake slowest. Consensus books move fastest. Shopping across depth matters.",
  },
];

export const ROSTER_SHOCK_WINDOWS = [
  { range: "0–15 min", state: "Forming", note: "Market is forming. Line is likely stale." },
  { range: "15–45 min", state: "Adjusting", note: "Major books have adjusted. Props still catching up." },
  { range: "45+ min", state: "Priced", note: "Line is priced in. Value window has closed." },
] as const;

// ─── Coaching Edge ────────────────────────────────────────────────────────

export type CoachingFactorId =
  | "pace-preference"
  | "rotation-depth"
  | "ats-discipline"
  | "fourth-quarter-aggression"
  | "scheme-vs-matchup";

export interface CoachingFactor {
  readonly id: CoachingFactorId;
  readonly title: string;
  readonly description: string;
}

export const COACHING_FACTORS: ReadonlyArray<CoachingFactor> = [
  {
    id: "pace-preference",
    title: "Pace Preference",
    description:
      "Coaches who consistently slow or push pace create predictable totals behavior. A fast-paced coach in a slow-opponent matchup creates structural tension. That tension is modelable.",
  },
  {
    id: "rotation-depth",
    title: "Rotation Depth",
    description:
      "Short-rotation coaches are vulnerable in B2Bs and long travel stretches. Deep-rotation coaches maintain performance. This interacts directly with rest analytics.",
  },
  {
    id: "ats-discipline",
    title: "ATS Discipline",
    description:
      "Some coaches consistently cover as underdogs. Some struggle to cover as heavy favorites. This is structural, not lucky, and appears in the model's factor mix.",
  },
  {
    id: "fourth-quarter-aggression",
    title: "Fourth-Quarter Aggression",
    description:
      "Late-game tendencies affect spread outcomes disproportionately. A conservative coach who goes to a prevent defense in close games has measurable ATS implications.",
  },
  {
    id: "scheme-vs-matchup",
    title: "Scheme vs. Matchup",
    description:
      "Scheme-first coaches create opportunity when the matchup exploits a known weakness. This is the slowest signal to price — books need player-data; this is team-data.",
  },
];

// ─── Cross-surface lookups ────────────────────────────────────────────────

export function getArchetype(id: BetorArchetype): ArchetypeEntry {
  const found = PROFILE_ARCHETYPES.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown archetype: ${id}`);
  return found;
}

export function getAutopsyPattern(id: AutopsyQuadrant): AutopsyPattern {
  const found = AUTOPSY_PATTERNS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown autopsy pattern: ${id}`);
  return found;
}

export function getCoachingFactor(id: CoachingFactorId): CoachingFactor {
  const found = COACHING_FACTORS.find((f) => f.id === id);
  if (!found) throw new Error(`Unknown coaching factor: ${id}`);
  return found;
}

export function getRosterShockFactor(id: RosterShockFactorId): RosterShockFactor {
  const found = ROSTER_SHOCK_FACTORS.find((f) => f.id === id);
  if (!found) throw new Error(`Unknown roster shock factor: ${id}`);
  return found;
}

export function getParlayDiagnostic(id: ParlayDiagnosticId): ParlayDiagnostic {
  const found = PARLAY_DIAGNOSTICS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown parlay diagnostic: ${id}`);
  return found;
}
