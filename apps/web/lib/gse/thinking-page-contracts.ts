/**
 * GSE Thinking-Website Page Contracts.
 *
 * Every major surface is treated as an active cognitive system, not a brochure.
 * Each page declares the user's primary question, the decision it supports, the
 * evidence and counter-evidence layers it must carry, its freshness/source
 * obligations, the Jarvis mode that backs it, its no-play path, and its autopsy
 * path. The Page Intelligence score measures how well a page turns data into a
 * supported decision — the counter-evidence layer is the heaviest term because
 * showing the other side is the thing most sites skip.
 *
 * Companion doc: docs/research/GSE_2026_THINKING_WEBSITE_CONTRACTS.md
 */

import { type GseScore, makeScore } from "./gse-scoring-systems";

export type PageSurface = "public" | "dashboard" | "cockpit";
export type RightsRiskBand = "low" | "medium" | "high";

export interface PageContract {
  readonly page: string;
  readonly route: string;
  readonly surface: PageSurface;
  readonly primaryUserQuestion: string;
  readonly decisionSupported: string;
  readonly dataRequired: readonly string[];
  readonly hasEvidenceLayer: boolean;
  readonly hasCounterEvidenceLayer: boolean;
  readonly showsFreshness: boolean;
  readonly showsSource: boolean;
  /** Jarvis mode id that backs this page (see jarvis-decision-copilot.ts). */
  readonly jarvisMode: string;
  readonly userMemoryUsed: string;
  readonly sourceRightsRisk: RightsRiskBand;
  readonly conversionOpportunity: string;
  readonly hasNoPlayPath: boolean;
  readonly autopsyPath: string;
  readonly successMetric: string;
  readonly failureMode: string;
}

/** Defaults keep the 20+ contracts terse while guaranteeing every field exists. */
function page(
  p: Pick<PageContract, "page" | "route" | "surface" | "primaryUserQuestion" | "decisionSupported"> &
    Partial<PageContract>,
): PageContract {
  return {
    dataRequired: p.dataRequired ?? [],
    hasEvidenceLayer: p.hasEvidenceLayer ?? false,
    hasCounterEvidenceLayer: p.hasCounterEvidenceLayer ?? false,
    showsFreshness: p.showsFreshness ?? false,
    showsSource: p.showsSource ?? false,
    jarvisMode: p.jarvisMode ?? "brief_me",
    userMemoryUsed: p.userMemoryUsed ?? "none",
    sourceRightsRisk: p.sourceRightsRisk ?? "low",
    conversionOpportunity: p.conversionOpportunity ?? "none",
    hasNoPlayPath: p.hasNoPlayPath ?? false,
    autopsyPath: p.autopsyPath ?? "none",
    successMetric: p.successMetric ?? "user reaches a supported decision",
    failureMode: p.failureMode ?? "user leaves without a decision",
    ...p,
  };
}

export const PAGE_CONTRACTS: readonly PageContract[] = [
  page({
    page: "Landing", route: "/", surface: "public",
    primaryUserQuestion: "Is this credible and what does it do?",
    decisionSupported: "Decide whether to try the free tier.",
    dataRequired: ["methodology summary", "track-record posture"],
    hasEvidenceLayer: true, showsSource: true,
    conversionOpportunity: "free signup",
    successMetric: "free signup with honest expectations",
    failureMode: "hype-driven signup that churns",
  }),
  page({
    page: "Pricing", route: "/pricing", surface: "public",
    primaryUserQuestion: "Is paid worth it and am I safe to pay?",
    decisionSupported: "Choose a tier or stay free.",
    dataRequired: ["pricing-phases.ts", "tier value", "refund terms"],
    hasEvidenceLayer: true, showsSource: true,
    conversionOpportunity: "subscription",
    hasNoPlayPath: true, // staying free is a valid outcome
    successMetric: "informed tier choice",
    failureMode: "buyer's remorse / refund",
  }),
  page({
    page: "Methodology", route: "/methodology", surface: "public",
    primaryUserQuestion: "How does this actually work?",
    decisionSupported: "Decide whether to trust the process.",
    dataRequired: ["engine behavior", "calibration posture"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsSource: true,
    conversionOpportunity: "free signup",
    successMetric: "user understands limits + uncertainty",
    failureMode: "overstated certainty",
  }),
  page({
    page: "Today's Board", route: "/today", surface: "dashboard",
    primaryUserQuestion: "What matters today and what should I do?",
    decisionSupported: "Pick which decisions to act on today.",
    dataRequired: ["live odds", "signals", "freshness"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true, showsSource: true,
    jarvisMode: "brief_me", userMemoryUsed: "preferences (consented)",
    hasNoPlayPath: true, autopsyPath: "/performance",
    successMetric: "user acts on the few decisive items",
    failureMode: "overload → no decision",
  }),
  page({
    page: "Edge Map", route: "/observatory", surface: "dashboard",
    primaryUserQuestion: "Where is the edge across the board?",
    decisionSupported: "Allocate attention to the strongest spots.",
    dataRequired: ["model output", "market signal", "freshness"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true, showsSource: true,
    jarvisMode: "compare", hasNoPlayPath: true, autopsyPath: "/performance",
    successMetric: "attention goes to robust edges",
    failureMode: "chasing fragile edges",
  }),
  page({
    page: "Signal Courtroom", route: "/today", surface: "dashboard",
    primaryUserQuestion: "Why should I trust this signal?",
    decisionSupported: "Accept, watchlist, or pass a signal.",
    dataRequired: ["claim", "evidence", "counter-evidence", "falsifiers"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true, showsSource: true,
    jarvisMode: "argue_the_case", hasNoPlayPath: true, autopsyPath: "/performance/losses",
    successMetric: "user sees the full case before deciding",
    failureMode: "verdict without its counter-case",
  }),
  page({
    page: "GSN Transmission", route: "/gsn", surface: "public",
    primaryUserQuestion: "What's the story and is it data-backed?",
    decisionSupported: "Decide whether the narrative is credible.",
    dataRequired: ["data-backed facts", "approved sources"],
    hasEvidenceLayer: true, showsSource: true, sourceRightsRisk: "medium",
    jarvisMode: "source_librarian",
    conversionOpportunity: "free signup",
    successMetric: "every claim maps to a source",
    failureMode: "unsupported narrative",
  }),
  page({
    page: "Academy", route: "/academy", surface: "dashboard",
    primaryUserQuestion: "How do I decide better?",
    decisionSupported: "Practice a decision and learn the process.",
    dataRequired: ["scenarios", "process rubric"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true,
    jarvisMode: "academy_coach", autopsyPath: "in-scenario autopsy",
    successMetric: "process understanding improves",
    failureMode: "outcome-biased teaching",
  }),
  page({
    page: "Bias Mirror", route: "/today", surface: "dashboard",
    primaryUserQuestion: "Am I about to repeat a mistake?",
    decisionSupported: "Pause and reconsider a biased decision.",
    dataRequired: ["decision history (consented)", "bias signals"],
    hasCounterEvidenceLayer: true, jarvisMode: "red_team",
    userMemoryUsed: "decision history (consented)",
    hasNoPlayPath: true, autopsyPath: "/performance",
    successMetric: "user reflects without feeling shamed",
    failureMode: "nagging → dismissal",
  }),
  page({
    page: "Trust Ledger", route: "/proof", surface: "public",
    primaryUserQuestion: "Can I verify what you claimed before the result?",
    decisionSupported: "Decide how much to trust the platform.",
    dataRequired: ["frozen recommendation receipts", "timestamps"],
    hasEvidenceLayer: true, showsFreshness: true, showsSource: true,
    autopsyPath: "/performance",
    successMetric: "claims are auditable pre-result",
    failureMode: "post-hoc claim editing",
  }),
  page({
    page: "Fantasy home", route: "/fantasy", surface: "dashboard",
    primaryUserQuestion: "What should I do with my fantasy team?",
    decisionSupported: "Route to the right fantasy decision tool.",
    dataRequired: ["roster", "league settings (consented)"],
    jarvisMode: "brief_me", userMemoryUsed: "league memory (consented)",
    successMetric: "user reaches the right tool fast",
    failureMode: "decision sprawl",
  }),
  page({
    page: "DFS Optimizer", route: "/fantasy/dfs", surface: "dashboard",
    primaryUserQuestion: "What's my best lineup for this slate?",
    decisionSupported: "Build/finalize a lineup under constraints.",
    dataRequired: ["projections", "salaries", "ownership (modeled)"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true,
    jarvisMode: "dfs_lock", hasNoPlayPath: true, autopsyPath: "post-slate autopsy",
    successMetric: "user sees exposure + the fragile core",
    failureMode: "black-box lineup, no trust",
  }),
  page({
    page: "Draft OS", route: "/fantasy/draft", surface: "dashboard",
    primaryUserQuestion: "Who should I draft right now?",
    decisionSupported: "Make the pick on the clock.",
    dataRequired: ["value board", "roster needs", "league memory (consented)"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true,
    jarvisMode: "draft_voice", userMemoryUsed: "league memory (consented)",
    hasNoPlayPath: true, autopsyPath: "post-draft autopsy",
    successMetric: "value-correct pick before the clock",
    failureMode: "reach under time pressure",
  }),
  page({
    page: "Roster Coach", route: "/fantasy/lineup", surface: "dashboard",
    primaryUserQuestion: "Who do I start this week?",
    decisionSupported: "Set the optimal lineup.",
    dataRequired: ["roster", "matchups", "injury", "weather"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true,
    jarvisMode: "sunday_morning", hasNoPlayPath: true, autopsyPath: "post-week autopsy",
    successMetric: "marginal starters set with fresh info",
    failureMode: "stale status → wrong start",
  }),
  page({
    page: "Trade Calculator", route: "/fantasy/trade", surface: "dashboard",
    primaryUserQuestion: "Is this trade actually good for me?",
    decisionSupported: "Accept, counter, or decline a trade.",
    dataRequired: ["roster", "schedule-adjusted value"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true,
    jarvisMode: "argue_the_case", hasNoPlayPath: true, autopsyPath: "post-trade autopsy",
    successMetric: "equity-correct decision",
    failureMode: "name-value over equity",
  }),
  page({
    page: "Waiver Pro", route: "/fantasy/waivers", surface: "dashboard",
    primaryUserQuestion: "Who do I claim and for how much?",
    decisionSupported: "Set FAAB/waiver claims.",
    dataRequired: ["opportunity changes", "roster fit"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true,
    jarvisMode: "argue_the_case", hasNoPlayPath: true, autopsyPath: "post-week autopsy",
    successMetric: "durable role change distinguished from mirage",
    failureMode: "FAAB overpay on a mirage",
  }),
  page({
    page: "Player Insights", route: "/players", surface: "dashboard",
    primaryUserQuestion: "What's the real story on this player?",
    decisionSupported: "Form a defensible view of a player.",
    dataRequired: ["usage", "role", "matchup", "advanced stats"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true, showsSource: true,
    jarvisMode: "source_librarian", autopsyPath: "/performance",
    successMetric: "evidence-based player view",
    failureMode: "narrative over data",
  }),
  page({
    page: "Cockpit", route: "/cockpit", surface: "cockpit",
    primaryUserQuestion: "What needs my attention as operator?",
    decisionSupported: "Decide what to ship and what to fix.",
    dataRequired: ["data health", "readiness", "blockers"],
    hasEvidenceLayer: true, showsFreshness: true,
    jarvisMode: "founder_cockpit", successMetric: "attention ranked by leverage",
    failureMode: "vanity metrics over real state",
  }),
  page({
    page: "Revenue Cockpit", route: "/cockpit/revenue-os", surface: "cockpit",
    primaryUserQuestion: "Where is the trust-safe revenue?",
    decisionSupported: "Choose a monetization lever.",
    dataRequired: ["funnel", "pricing source-of-truth", "trust signals"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true,
    jarvisMode: "revenue_strategist", successMetric: "lever chosen without trust cost",
    failureMode: "conversion bought with trust",
  }),
  page({
    page: "Source Rights Cockpit", route: "/cockpit/sources", surface: "cockpit",
    primaryUserQuestion: "Can we use this source this way?",
    decisionSupported: "Clear or block a source/use.",
    dataRequired: ["source-rights registry", "intended use"],
    hasEvidenceLayer: true, showsSource: true, sourceRightsRisk: "high",
    jarvisMode: "source_librarian", successMetric: "no use exceeds its rights",
    failureMode: "rights overreach",
  }),
  page({
    page: "Jarvis", route: "/cockpit/jarvis", surface: "cockpit",
    primaryUserQuestion: "Help me reason through this.",
    decisionSupported: "Navigate evidence to a disciplined call.",
    dataRequired: ["claim", "evidence", "counter-evidence", "falsifiers"],
    hasEvidenceLayer: true, hasCounterEvidenceLayer: true, showsFreshness: true, showsSource: true,
    jarvisMode: "argue_the_case", hasNoPlayPath: true, autopsyPath: "autopsy mode",
    successMetric: "reasoned decision with the counter-case seen",
    failureMode: "answer without its falsifiers",
  }),
] as const;

/** Look up a page contract by route. */
export function getPageContract(route: string): PageContract | undefined {
  return PAGE_CONTRACTS.find((p) => p.route === route);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Intelligence score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score how well a page turns data into a supported decision (0..100, higher is
 * better). The counter-evidence layer carries the most weight because showing
 * the other side is the discipline most products skip; a page that only ever
 * confirms the user cannot score in the high band.
 */
export function scorePageIntelligence(contract: PageContract): GseScore {
  const flags: string[] = [];
  let score = 0;

  if (contract.decisionSupported.trim().length > 0) score += 20;
  else flags.push("no primary decision named");

  if (contract.hasEvidenceLayer) score += 15;
  else flags.push("no evidence layer");

  if (contract.hasCounterEvidenceLayer) score += 20;
  else flags.push("no counter-evidence layer — the most common gap");

  if (contract.showsFreshness) score += 12;
  else flags.push("freshness not shown");

  if (contract.showsSource) score += 12;
  else flags.push("source not shown");

  if (contract.hasNoPlayPath) score += 11;
  else flags.push("no no-play/watchlist path");

  if (contract.autopsyPath !== "none" && contract.autopsyPath.trim().length > 0) score += 10;
  else flags.push("no autopsy path");

  return makeScore("page_intelligence", score, {
    confidence: "well_supported",
    rationale: [
      `decision: ${contract.decisionSupported.slice(0, 48)}`,
      contract.hasCounterEvidenceLayer ? "counter-case present" : "counter-case missing",
      contract.hasNoPlayPath ? "no-play path present" : "no no-play path",
    ],
    flags,
  });
}
