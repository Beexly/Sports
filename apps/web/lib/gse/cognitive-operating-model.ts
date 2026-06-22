/**
 * GSE Cognitive Operating Model — "think for people" without manipulation.
 *
 * Think-for-people means: reduce cognitive load, organize evidence, expose
 * tradeoffs, summarize complexity, detect contradictions and bias, show
 * uncertainty, preserve agency, recommend disciplined next actions, and help
 * users learn from outcomes. It does NOT mean manipulate, hide uncertainty,
 * overrule the user, exploit gambling psychology, or manufacture confidence.
 *
 * This module encodes the principles, the user modes, the cognitive command
 * palette, and two scores (User Bias Risk, Cognitive Load) so the product can
 * measure whether a surface helps a person decide or just floods them.
 *
 * Companion doc: docs/research/GSE_2026_COGNITIVE_OPERATING_MODEL.md
 */

import { type GseScore, makeScore, weightedAverage, clampScore } from "./gse-scoring-systems";

// ─────────────────────────────────────────────────────────────────────────────
// Principles
// ─────────────────────────────────────────────────────────────────────────────

export interface CognitivePrinciple {
  readonly id: string;
  readonly principle: string;
  readonly antiPattern: string;
}

export const COGNITIVE_PRINCIPLES: readonly CognitivePrinciple[] = [
  { id: "compress", principle: "Compress complexity without hiding tradeoffs.", antiPattern: "Oversimplifying by deleting the counter-case." },
  { id: "answer_reason_evidence", principle: "Lead with the answer, then the reason, then the evidence.", antiPattern: "Burying the recommendation under a wall of stats." },
  { id: "show_wrongness", principle: "Always show what would make the answer wrong.", antiPattern: "Presenting a verdict with no falsifier." },
  { id: "detect_bias", principle: "Detect user bias without shaming.", antiPattern: "Moralizing or nagging the user." },
  { id: "honest_urgency", principle: "Use urgency only when time genuinely matters.", antiPattern: "Fake countdowns and manufactured scarcity." },
  { id: "agency", principle: "Preserve user agency — recommend, never coerce.", antiPattern: "Dark patterns that funnel a single action." },
  { id: "no_gambling_exploit", principle: "Never exploit gambling psychology.", antiPattern: "Loss-chasing nudges, near-miss dopamine loops." },
  { id: "reward_discipline", principle: "Reward discipline, not dopamine.", antiPattern: "Celebrating volume of action over decision quality." },
  { id: "no_play_wins", principle: "Let No-Play be a win.", antiPattern: "Framing passing on a bad spot as a failure." },
  { id: "teach_through_autopsy", principle: "Teach through autopsy — grade the process, not the scoreboard.", antiPattern: "Result-based shaming after variance." },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// User modes
// ─────────────────────────────────────────────────────────────────────────────

export interface UserMode {
  readonly id: string;
  readonly label: string;
  readonly userState: string;
  readonly primaryAnxiety: string;
  readonly whatToHide: string;
  readonly whatToShow: string;
  readonly primaryAction: string;
  readonly trustRequirement: string;
  readonly jarvisBehavior: string;
  readonly mobileBehavior: string;
  readonly failureMode: string;
}

export const USER_MODES: readonly UserMode[] = [
  {
    id: "novice",
    label: "Novice mode",
    userState: "New, low context, wants to learn the safe way.",
    primaryAnxiety: "Looking foolish / making an obvious mistake.",
    whatToHide: "Dense factor trails, jargon, raw model internals.",
    whatToShow: "One clear recommendation, plain-language reason, one risk.",
    primaryAction: "Understand a single pick well.",
    trustRequirement: "No overstated certainty; visible uncertainty.",
    jarvisBehavior: "Explain like a patient coach; define terms inline.",
    mobileBehavior: "Single-column, one decision per screen.",
    failureMode: "Overwhelm → bounce. Guard: progressive disclosure.",
  },
  {
    id: "sharp",
    label: "Sharp mode",
    userState: "Experienced, wants depth fast, distrusts fluff.",
    primaryAnxiety: "Wasting time on shallow takes; missing an edge.",
    whatToHide: "Hand-holding, tutorials, oversized explainers.",
    whatToShow: "Evidence, counter-evidence, falsifiers, line context, CLV framing.",
    primaryAction: "Audit the case and decide quickly.",
    trustRequirement: "Sourced numbers, honest fragility, no spin.",
    jarvisBehavior: "Terse, cite-first, lead with the counter-case.",
    mobileBehavior: "Dense but scannable; expandable evidence drawers.",
    failureMode: "Condescension → distrust. Guard: depth on demand.",
  },
  {
    id: "builder",
    label: "Builder mode",
    userState: "Assembling lineups/rosters across many decisions.",
    primaryAnxiety: "Correlated risk and exposure they cannot see.",
    whatToHide: "Per-pick prose; show portfolio view instead.",
    whatToShow: "Exposure, correlation, leverage, marginal value of each slot.",
    primaryAction: "Optimize a portfolio, not a single pick.",
    trustRequirement: "Transparent optimizer assumptions.",
    jarvisBehavior: "Compare constructions; surface fragility of the core.",
    mobileBehavior: "Portfolio summary first; drill into slots.",
    failureMode: "Black-box optimizer → no trust. Guard: show assumptions.",
  },
  {
    id: "draft_night",
    label: "Draft night mode",
    userState: "Live draft, clock running, high pressure.",
    primaryAnxiety: "Reaching / missing value / freezing on the clock.",
    whatToHide: "Anything not actionable in the next 60 seconds.",
    whatToShow: "Best value at pick, positional runs, two alternatives.",
    primaryAction: "Make the pick before the clock expires.",
    trustRequirement: "Fast, never more certain than the board supports.",
    jarvisBehavior: "Clock-aware, one recommendation + one pivot.",
    mobileBehavior: "Giant primary action; voice-first option.",
    failureMode: "Latency / overload → bad pick. Guard: pre-computed board.",
  },
  {
    id: "sunday_morning",
    label: "Sunday morning mode",
    userState: "Final start/sit calls before kickoff.",
    primaryAnxiety: "Late news flipping a lineup decision.",
    whatToHide: "Long-range season analysis.",
    whatToShow: "Inactives, weather, role, the single fragile call.",
    primaryAction: "Confirm or flip the marginal starter.",
    trustRequirement: "Freshness stamps on every status.",
    jarvisBehavior: "Triage the riskiest slot first.",
    mobileBehavior: "Alert-style cards, newest news on top.",
    failureMode: "Stale status → wrong start. Guard: freshness gate.",
  },
  {
    id: "dfs_lock",
    label: "DFS lock mode",
    userState: "Minutes to lock, finalizing exposure.",
    primaryAnxiety: "Ownership/leverage and a late scratch.",
    whatToHide: "Slow-changing projections.",
    whatToShow: "Ownership read, leverage, stacks, late-news watch.",
    primaryAction: "Finalize or pivot exposure before lock.",
    trustRequirement: "Ownership labeled modeled, not measured.",
    jarvisBehavior: "Surface leverage and the one late-swap risk.",
    mobileBehavior: "Lock timer + exposure heat at a glance.",
    failureMode: "Overconfidence in ownership → tilt. Guard: label as modeled.",
  },
  {
    id: "late_swap",
    label: "Late-swap emergency mode",
    userState: "A starter is out; minutes to react.",
    primaryAnxiety: "Salvaging a lineup under time pressure.",
    whatToHide: "Everything except the swap decision.",
    whatToShow: "Best legal swap, salary/position fit, correlation impact.",
    primaryAction: "Execute the best available swap.",
    trustRequirement: "Only show swaps that are actually legal/eligible.",
    jarvisBehavior: "One swap, one alternative, the tradeoff in a line.",
    mobileBehavior: "Single emergency card; confirm in one tap.",
    failureMode: "Illegal/late swap suggested. Guard: eligibility check.",
  },
  {
    id: "research",
    label: "Research mode",
    userState: "Deep-diving a player/team/slate with time.",
    primaryAnxiety: "Missing a hidden factor or contradiction.",
    whatToHide: "Nothing — but organize it.",
    whatToShow: "Full evidence graph, sources, contradictions, history.",
    primaryAction: "Build a defensible thesis.",
    trustRequirement: "Every claim traceable to a source.",
    jarvisBehavior: "Act as research librarian; surface contradictions.",
    mobileBehavior: "Saveable threads; resumable later.",
    failureMode: "Analysis paralysis. Guard: end with a disciplined call.",
  },
  {
    id: "academy",
    label: "Academy mode",
    userState: "Learning to decide better, outcome-agnostic.",
    primaryAnxiety: "Not understanding why a process was right/wrong.",
    whatToHide: "Live money pressure.",
    whatToShow: "Scenarios, the process, the autopsy, the lesson.",
    primaryAction: "Practice a decision and review the reasoning.",
    trustRequirement: "Grade the thinking, never the scoreboard.",
    jarvisBehavior: "Socratic; no result-based shaming.",
    mobileBehavior: "Bite-size scenarios.",
    failureMode: "Outcome bias creeps in. Guard: process-only grading.",
  },
  {
    id: "founder_cockpit",
    label: "Founder cockpit mode",
    userState: "Operator triaging the whole business at a glance.",
    primaryAnxiety: "What is broken / stale / risky right now.",
    whatToHide: "End-user marketing polish.",
    whatToShow: "Data health, source risk, revenue, readiness, blockers.",
    primaryAction: "Decide what to ship and what to fix next.",
    trustRequirement: "Honest internal state — never demo data as live.",
    jarvisBehavior: "Brief the operator; rank attention by leverage.",
    mobileBehavior: "Ranked attention list; tap to drill.",
    failureMode: "Vanity metrics. Guard: surface stale/broken first.",
  },
] as const;

/** Look up a user mode by id. */
export function getUserMode(id: string): UserMode | undefined {
  return USER_MODES.find((m) => m.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cognitive command palette
// ─────────────────────────────────────────────────────────────────────────────

export interface CognitiveCommand {
  readonly command: string;
  readonly intent: string;
  readonly requiredData: readonly string[];
  readonly outputShape: string;
}

export const COGNITIVE_COMMANDS: readonly CognitiveCommand[] = [
  { command: "Tell me what matters", intent: "Compress the slate to the few decisive factors.", requiredData: ["signals", "evidence"], outputShape: "Ranked 3–5 factors with why-it-matters." },
  { command: "What am I missing?", intent: "Surface overlooked counter-evidence and blind spots.", requiredData: ["counter-evidence", "user history"], outputShape: "List of overlooked factors + bias flags." },
  { command: "What would make this wrong?", intent: "Name the falsifiers that flip the call.", requiredData: ["falsifiers", "monitoring"], outputShape: "Falsifier list with likelihood + monitoring." },
  { command: "Compare the paths", intent: "Lay options side by side on the same axes.", requiredData: ["options", "scores"], outputShape: "Comparison table: confidence/fragility/tradeoff." },
  { command: "Give me safe / upside / balanced", intent: "Offer three risk postures, not one answer.", requiredData: ["projections", "variance"], outputShape: "Three labeled constructions." },
  { command: "Show the evidence", intent: "Open the supporting case with sources.", requiredData: ["evidence", "sources"], outputShape: "Evidence list with source + freshness." },
  { command: "Show the counterargument", intent: "Steelman the other side.", requiredData: ["counter-evidence"], outputShape: "Ordered counter-case." },
  { command: "What is the market missing?", intent: "Find where our read diverges from price.", requiredData: ["market signal", "model output"], outputShape: "Divergence + why it may persist or not." },
  { command: "What is the crowd overreacting to?", intent: "Flag narrative-driven mispricing.", requiredData: ["narrative signal", "ownership"], outputShape: "Overreaction flag + disciplined counter." },
  { command: "What is fragile here?", intent: "Locate the single shock that breaks the plan.", requiredData: ["fragility", "falsifiers"], outputShape: "Fragility callout + monitoring step." },
  { command: "What should I monitor?", intent: "Set the watch list until action time.", requiredData: ["falsifiers", "freshness"], outputShape: "Monitoring checklist with triggers." },
  { command: "What did I do last time?", intent: "Recall the user's prior decision and outcome.", requiredData: ["decision history (consented)"], outputShape: "Prior decision + outcome + lesson." },
  { command: "Am I repeating a mistake?", intent: "Detect a recurring bias pattern, gently.", requiredData: ["decision history", "bias score"], outputShape: "Pattern note, framed as a question." },
  { command: "What is the disciplined move?", intent: "Recommend the process-correct action, including No-Play.", requiredData: ["verdict", "fragility"], outputShape: "One disciplined recommendation + alternative." },
  { command: "What is the no-play case?", intent: "Make the honest argument for passing.", requiredData: ["counter-evidence", "fragility"], outputShape: "The case for sitting this one out." },
] as const;

/** Look up a cognitive command by its phrase (case-insensitive). */
export function getCognitiveCommand(command: string): CognitiveCommand | undefined {
  return COGNITIVE_COMMANDS.find((c) => c.command.toLowerCase() === command.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// User Bias Risk score
// ─────────────────────────────────────────────────────────────────────────────

/** All fields are 0..1 intensities derived from consented decision history. */
export interface BiasSignals {
  readonly recencyChasing: number;
  readonly lossChasing: number;
  readonly favoriteTeamSkew: number;
  readonly overtrading: number;
  readonly ignoringCounterEvidence: number;
  readonly narrativeChasing: number;
}

/**
 * Score a user's bias risk (0..100, higher is RISKIER) from decision-history
 * signals. Designed to INFORM, never to shame — the output is meant to be
 * surfaced as a gentle question ("Am I repeating a mistake?"), and loss-chasing
 * is weighted highest because it is the most harmful pattern to leave unflagged.
 */
export function scoreUserBiasRisk(s: BiasSignals): GseScore {
  const flags: string[] = [];
  if (s.lossChasing >= 0.6) flags.push("loss-chasing pattern — the most important to surface gently");
  if (s.ignoringCounterEvidence >= 0.6) flags.push("tends to skip the counter-case");
  if (s.overtrading >= 0.6) flags.push("high action volume relative to edge");

  const score = weightedAverage([
    { value: s.lossChasing * 100, weight: 2.5 },
    { value: s.recencyChasing * 100, weight: 1.5 },
    { value: s.ignoringCounterEvidence * 100, weight: 2.0 },
    { value: s.overtrading * 100, weight: 1.5 },
    { value: s.favoriteTeamSkew * 100, weight: 1.0 },
    { value: s.narrativeChasing * 100, weight: 1.0 },
  ]);

  return makeScore("user_bias_risk", score, {
    confidence: "tentative",
    rationale: ["derived from consented decision history", "framed for self-reflection, not judgement"],
    flags,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cognitive Load score
// ─────────────────────────────────────────────────────────────────────────────

export interface CognitiveLoadSignals {
  /** Number of competing primary CTAs on the surface (1 is ideal). */
  readonly primaryActions: number;
  /** Distinct data elements presented at once. */
  readonly dataElements: number;
  /** Count of unexplained jargon terms. */
  readonly unexplainedJargon: number;
  /** Decisions the user must make to proceed. */
  readonly decisionsRequired: number;
  /** 0..1 novelty of the interface to this user. */
  readonly novelty: number;
}

/**
 * Score the mental burden a surface imposes (0..100, higher is HEAVIER). The
 * remedy for a high score is progressive disclosure and a single clear primary
 * action — NEVER hiding the tradeoffs, which would trade clarity for
 * manipulation.
 */
export function scoreCognitiveLoad(s: CognitiveLoadSignals): GseScore {
  const flags: string[] = [];
  if (s.primaryActions > 1) flags.push(`${s.primaryActions} competing primary actions — pick one`);
  if (s.unexplainedJargon > 0) flags.push(`${s.unexplainedJargon} unexplained term(s)`);

  // Each factor mapped to a 0..100 burden with saturating curves.
  const ctaBurden = Math.min(100, Math.max(0, s.primaryActions - 1) * 35);
  const densityBurden = Math.min(100, s.dataElements * 6);
  const jargonBurden = Math.min(100, s.unexplainedJargon * 20);
  const decisionBurden = Math.min(100, s.decisionsRequired * 18);
  const noveltyBurden = clampScore(Math.max(0, Math.min(1, s.novelty)) * 100);

  const score = weightedAverage([
    { value: ctaBurden, weight: 2.0 },
    { value: densityBurden, weight: 1.5 },
    { value: jargonBurden, weight: 1.5 },
    { value: decisionBurden, weight: 2.0 },
    { value: noveltyBurden, weight: 1.0 },
  ]);

  return makeScore("cognitive_load", score, {
    confidence: "supported",
    rationale: [
      `${s.primaryActions} primary action(s)`,
      `${s.dataElements} data elements`,
      `${s.decisionsRequired} decisions required`,
    ],
    flags,
  });
}
