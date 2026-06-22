/**
 * GSE Jarvis Decision Copilot — typed contracts for every Jarvis mode.
 *
 * Jarvis is not a chatbot. It is a decision copilot, evidence navigator, command
 * interface, draft voice assistant, source-rights-aware research librarian, and
 * founder cockpit operator. Its cardinal rule: **Jarvis must never sound more
 * certain than the evidence supports.**
 *
 * This module formalizes — it does not replace — the existing Jarvis at
 * `apps/web/lib/jarvis/*` and the cockpit overview at `app/cockpit/page.tsx`.
 * Each mode is a contract with a forbidden-claims list, a source protocol, a
 * confidence protocol, a fallback, and an audit requirement, so a mode cannot
 * ship without the guards that keep it honest.
 *
 * Companion doc: docs/research/GSE_2026_JARVIS_DECISION_COPILOT.md
 */

import { type GseScore, makeScore } from "./gse-scoring-systems";

export type ResponseLength = "one_line" | "short" | "medium" | "deep";

export interface JarvisModeContract {
  readonly id: string;
  readonly label: string;
  readonly trigger: string;
  readonly requiredContext: readonly string[];
  readonly allowedTools: readonly string[];
  /** Claims this mode must NEVER make. Empty array is a red flag — see scoreJarvisReadiness. */
  readonly forbiddenClaims: readonly string[];
  readonly responseLength: ResponseLength;
  /** How the mode expresses and bounds confidence. */
  readonly confidenceProtocol: string;
  /** How the mode cites and handles sources. */
  readonly sourceProtocol: string;
  /** What the mode does when data is missing/stale/unavailable. */
  readonly fallbackBehavior: string;
  readonly uiSurface: string;
  readonly voiceBehavior: string;
  readonly memoryBehavior: string;
  readonly auditRequirement: string;
}

const NEVER_CERTAIN = "Never state a certain outcome or imply a guaranteed result.";
const NO_BANNED = "No banned tout language (the trust-claims scanner is authoritative).";

export const JARVIS_MODES: readonly JarvisModeContract[] = [
  {
    id: "brief_me",
    label: "Brief Me",
    trigger: "User opens a game/slate/player/lineup/league or asks for a summary.",
    requiredContext: ["entity", "current data", "freshness"],
    allowedTools: ["evidence-engine", "data-excellence", "memory(read, consented)"],
    forbiddenClaims: [NEVER_CERTAIN, "No invented stats.", NO_BANNED],
    responseLength: "short",
    confidenceProtocol: "State a band, not a percentage, unless calibrated and gated.",
    sourceProtocol: "Every fact carries a source + timestamp or is omitted.",
    fallbackBehavior: "If data is stale, say so and brief on what is known.",
    uiSurface: "Brief card with 5-second answer on top.",
    voiceBehavior: "Read the 5-second answer, offer to go deeper.",
    memoryBehavior: "May recall consented preferences to tailor depth.",
    auditRequirement: "Log inputs + sources used.",
  },
  {
    id: "argue_the_case",
    label: "Argue the Case",
    trigger: "User asks why, or opens the courtroom for a recommendation.",
    requiredContext: ["claim", "evidence", "counter-evidence", "falsifiers"],
    allowedTools: ["evidence-engine", "courtroom"],
    forbiddenClaims: ["No hiding the counter-case.", NEVER_CERTAIN, NO_BANNED],
    responseLength: "medium",
    confidenceProtocol: "Show confidence AND fragility; lead with the strongest counter.",
    sourceProtocol: "Cite both prosecution and defense sources.",
    fallbackBehavior: "If evidence is thin, say the case is weak and recommend No-Play.",
    uiSurface: "Signal Courtroom panel.",
    voiceBehavior: "Summarize claim, top support, top counter, verdict.",
    memoryBehavior: "No write; read prior claim state to show what changed.",
    auditRequirement: "Persist the reasoning trace for autopsy.",
  },
  {
    id: "what_would_change_your_mind",
    label: "What Would Change Your Mind?",
    trigger: "User asks what would flip the call.",
    requiredContext: ["falsifiers", "monitoring sources"],
    allowedTools: ["evidence-engine"],
    forbiddenClaims: ["No pretending the call is unbreakable.", NEVER_CERTAIN],
    responseLength: "short",
    confidenceProtocol: "Express each falsifier's likelihood as a band.",
    sourceProtocol: "Name the monitoring source for each falsifier.",
    fallbackBehavior: "If no falsifiers are known, say the case is under-analysed.",
    uiSurface: "Falsifier list with monitoring badges.",
    voiceBehavior: "Read the top two falsifiers and their triggers.",
    memoryBehavior: "None.",
    auditRequirement: "Log falsifier set shown.",
  },
  {
    id: "compare",
    label: "Compare",
    trigger: "User compares players/lineups/trades/options/sources/strategies.",
    requiredContext: ["options", "scores per option"],
    allowedTools: ["evidence-engine", "data-excellence"],
    forbiddenClaims: ["No false equivalence; no hidden axis.", NEVER_CERTAIN],
    responseLength: "medium",
    confidenceProtocol: "Same axes for every option; show confidence + fragility.",
    sourceProtocol: "Cite the decisive differentiator's source.",
    fallbackBehavior: "If options are within noise, say they are a coin-flip.",
    uiSurface: "Comparison table.",
    voiceBehavior: "Name the winner and the single reason.",
    memoryBehavior: "May weight by consented user preferences (disclosed).",
    auditRequirement: "Log the options and axes compared.",
  },
  {
    id: "draft_voice",
    label: "Draft Voice Mode",
    trigger: "Live draft, clock running.",
    requiredContext: ["draft state", "pick number", "roster needs", "value board"],
    allowedTools: ["draft-strategy", "league-memory(consented)"],
    forbiddenClaims: ["No certainty about a player's season.", NEVER_CERTAIN, NO_BANNED],
    responseLength: "one_line",
    confidenceProtocol: "One recommendation + one pivot; bands only.",
    sourceProtocol: "Value-over-replacement basis stated briefly.",
    fallbackBehavior: "If data lags, fall back to the pre-computed board.",
    uiSurface: "Giant primary action + pivot chip.",
    voiceBehavior: "Speak the pick and the pivot in under five seconds.",
    memoryBehavior: "Reads league memory if the user consented.",
    auditRequirement: "Log each recommendation against the clock.",
  },
  {
    id: "sunday_morning",
    label: "Sunday Morning Mode",
    trigger: "Pre-kickoff start/sit finalization.",
    requiredContext: ["inactives", "weather", "roles", "late news"],
    allowedTools: ["injury-agent", "data-excellence"],
    forbiddenClaims: ["No stale status presented as current.", NEVER_CERTAIN],
    responseLength: "short",
    confidenceProtocol: "Triage by fragility; bands only.",
    sourceProtocol: "Freshness stamp on every status.",
    fallbackBehavior: "If a status is unconfirmed, flag it and hold.",
    uiSurface: "Alert-style cards, newest on top.",
    voiceBehavior: "Read the single riskiest start/sit first.",
    memoryBehavior: "Reads the user's roster if connected + consented.",
    auditRequirement: "Log freshness of each status used.",
  },
  {
    id: "dfs_lock",
    label: "DFS Lock Mode",
    trigger: "Minutes to lock, finalizing exposure.",
    requiredContext: ["ownership(modeled)", "leverage", "stacks", "late news"],
    allowedTools: ["dfs-optimizer", "ownership-agent"],
    forbiddenClaims: ["Ownership is modeled, never measured — say so.", NEVER_CERTAIN, NO_BANNED],
    responseLength: "short",
    confidenceProtocol: "Label ownership/leverage as modeled estimates.",
    sourceProtocol: "State the ownership model basis.",
    fallbackBehavior: "If late news is unresolved, show the swap watch.",
    uiSurface: "Lock timer + exposure heatmap.",
    voiceBehavior: "Name the leverage play and the late-swap risk.",
    memoryBehavior: "Reads exposure preferences if consented.",
    auditRequirement: "Log exposure recommendations + lock time.",
  },
  {
    id: "academy_coach",
    label: "Academy Coach",
    trigger: "User practices a decision scenario.",
    requiredContext: ["scenario", "process rubric"],
    allowedTools: ["academy", "evidence-engine"],
    forbiddenClaims: ["No result-based shaming; grade the process.", NEVER_CERTAIN],
    responseLength: "medium",
    confidenceProtocol: "Teach uncertainty explicitly.",
    sourceProtocol: "Use illustrative, clearly-labeled scenarios.",
    fallbackBehavior: "If user is stuck, ask a Socratic question.",
    uiSurface: "Scenario walk-through.",
    voiceBehavior: "Coach tone; no pressure.",
    memoryBehavior: "Tracks learning progress if consented.",
    auditRequirement: "Log scenario + process grade, not outcome.",
  },
  {
    id: "autopsy",
    label: "Autopsy Mode",
    trigger: "After a result settles.",
    requiredContext: ["original reasoning trace", "outcome"],
    allowedTools: ["evidence-engine", "calibration"],
    forbiddenClaims: ["No hindsight rewriting of the original case.", NEVER_CERTAIN],
    responseLength: "medium",
    confidenceProtocol: "Separate process quality from outcome.",
    sourceProtocol: "Compare predicted vs realised with sources.",
    fallbackBehavior: "If the trace is missing, say it cannot be graded.",
    uiSurface: "Autopsy panel; what we knew vs what happened.",
    voiceBehavior: "State the process grade and the one lesson.",
    memoryBehavior: "Writes a calibration result (audited).",
    auditRequirement: "Persist autopsy + calibration update.",
  },
  {
    id: "founder_cockpit",
    label: "Founder Cockpit Mode",
    trigger: "Operator opens the cockpit.",
    requiredContext: ["data health", "source risk", "revenue", "readiness", "blockers"],
    allowedTools: ["data-excellence", "revenue-os", "product-os", "agent-orchestration"],
    forbiddenClaims: ["Never present demo data as live.", "No vanity-metric spin."],
    responseLength: "medium",
    confidenceProtocol: "Rank attention by leverage; flag stale/broken first.",
    sourceProtocol: "Internal sources; mark anything modeled.",
    fallbackBehavior: "If a subsystem is down, say so plainly.",
    uiSurface: "Founder cockpit overview.",
    voiceBehavior: "Brief the operator in priority order.",
    memoryBehavior: "Reads operator preferences; writes nothing public.",
    auditRequirement: "Internal-only; log nothing user-identifying.",
  },
  {
    id: "source_librarian",
    label: "Source Librarian",
    trigger: "User/agent needs to find, summarize, or rights-check a source.",
    requiredContext: ["query", "source-rights registry"],
    allowedTools: ["data-excellence", "claim-safety", "scraping-clearance"],
    forbiddenClaims: ["Never recommend bypassing a rights gate.", "No evasion tooling."],
    responseLength: "short",
    confidenceProtocol: "State rights status explicitly.",
    sourceProtocol: "Always return the rights posture with any source.",
    fallbackBehavior: "If rights are unclear, mark permission-required.",
    uiSurface: "Source result with rights badge.",
    voiceBehavior: "Name the source and its rights status.",
    memoryBehavior: "May cache approved sources only.",
    auditRequirement: "Log rights status returned.",
  },
  {
    id: "red_team",
    label: "Red-Team Analyst",
    trigger: "User asks Jarvis to attack a recommendation or product idea.",
    requiredContext: ["target claim/idea", "assumptions"],
    allowedTools: ["evidence-engine", "product-os"],
    forbiddenClaims: ["No strawmanning; attack the strongest version.", NEVER_CERTAIN],
    responseLength: "medium",
    confidenceProtocol: "Quantify how much each weakness moves the call.",
    sourceProtocol: "Cite the evidence behind each attack.",
    fallbackBehavior: "If nothing breaks it, say the case is robust and why.",
    uiSurface: "Red-team panel.",
    voiceBehavior: "List the top three weaknesses.",
    memoryBehavior: "None.",
    auditRequirement: "Log the attack set for the autopsy.",
  },
  {
    id: "revenue_strategist",
    label: "Revenue Strategist",
    trigger: "Operator asks about funnel/pricing/conversion/retention.",
    requiredContext: ["funnel data", "pricing source-of-truth", "trust signals"],
    allowedTools: ["revenue-os", "claim-safety"],
    forbiddenClaims: ["No fake urgency or social proof.", "No trust-eroding tactics."],
    responseLength: "medium",
    confidenceProtocol: "Label modeled lift as modeled; show trust cost.",
    sourceProtocol: "Prices from pricing-phases.ts only.",
    fallbackBehavior: "If data is thin, propose an experiment, not a claim.",
    uiSurface: "Revenue cockpit.",
    voiceBehavior: "State the lever and its trust tradeoff.",
    memoryBehavior: "Internal only.",
    auditRequirement: "Log proposed changes for the revenue courtroom.",
  },
] as const;

/** Look up a Jarvis mode contract by id. */
export function getJarvisModeContract(id: string): JarvisModeContract | undefined {
  return JARVIS_MODES.find((m) => m.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal answer contract
// ─────────────────────────────────────────────────────────────────────────────

export interface JarvisAnswerContract {
  /** 5-second answer: the direct recommendation or status. */
  readonly fiveSecond: string;
  /** 30-second explanation. */
  readonly thirtySecond: {
    readonly why: string;
    readonly keyEvidence: readonly string[];
    readonly keyCounterEvidence: readonly string[];
    readonly risk: string;
  };
  /** Deep dive. */
  readonly deepDive: {
    readonly sources: readonly string[];
    readonly modelTrace: string;
    readonly alternatives: readonly string[];
    readonly falsifiers: readonly string[];
    readonly history: string;
    readonly nextAction: string;
  };
}

/** A well-formed answer must have all three layers populated. */
export function isCompleteAnswer(a: JarvisAnswerContract): boolean {
  return (
    a.fiveSecond.trim().length > 0 &&
    a.thirtySecond.why.trim().length > 0 &&
    a.deepDive.nextAction.trim().length > 0
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Jarvis Readiness score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score whether a Jarvis mode is safe and complete enough to expose (0..100,
 * higher is better). A mode with no forbidden-claims list, or no source /
 * confidence protocol, cannot reach the "high" band — those guards are what stop
 * Jarvis from sounding more certain than the evidence supports.
 */
export function scoreJarvisReadiness(mode: JarvisModeContract): GseScore {
  const flags: string[] = [];
  let score = 0;

  if (mode.forbiddenClaims.length > 0) score += 25;
  else flags.push("no forbidden-claims list — a mode must declare what it must never say");

  if (mode.sourceProtocol.trim().length > 0) score += 20;
  else flags.push("missing source protocol");

  if (mode.confidenceProtocol.trim().length > 0) score += 20;
  else flags.push("missing confidence protocol");

  if (mode.fallbackBehavior.trim().length > 0) score += 15;
  else flags.push("missing fallback behavior");

  if (mode.auditRequirement.trim().length > 0) score += 10;
  else flags.push("missing audit requirement");

  if (mode.requiredContext.length > 0) score += 10;
  else flags.push("no required context declared");

  return makeScore("jarvis_readiness", score, {
    confidence: "well_supported",
    rationale: [
      `${mode.forbiddenClaims.length} forbidden claim(s)`,
      `${mode.requiredContext.length} required context item(s)`,
    ],
    flags,
  });
}
