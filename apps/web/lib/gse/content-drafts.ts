/**
 * GSE — no-claim content drafts (canonical source).
 *
 * The single source of truth for the social/brief drafts described in
 * `docs/gse/content-to-lead-plan.md`. Encoding them here makes the no-claim
 * guarantee CI-enforced: the test in `apps/web/__tests__/gse-waitlist.test.ts`
 * runs EVERY string below through the platform compliance scanner
 * (`runNoClaimGuard`) and `hasNoPerformanceClaim`, so a drafting mistake fails
 * the build instead of shipping.
 *
 * These are DRAFTS ONLY. Nothing here is auto-posted or published — the owner
 * holds the publish gate (see the plan doc). No win-rate / ROI / accuracy / edge
 * / profit / picks / guaranteed-outcome / sportsbook framing.
 *
 * Pure data module — no network, no PII.
 */

/** 15 no-claim social post drafts (process / transparency / education). */
export const SOCIAL_POST_DRAFTS: readonly string[] = [
  "We publish our model's honest scorecard — including where it loses. On the last out-of-sample test (10,301 plays) it did not beat a simple baseline. That's not a sales line; it's the standard we hold ourselves to.",
  "A pick without a documented process is a guess wearing confidence. We're building the opposite: the process, the sources, and the uncertainty — written down.",
  "Three questions before any sports decision: What do I actually know? How fresh is it? What would change my mind? If you can't answer all three, that's the work.",
  "We don't sell certainty. We help you see your own decision process clearly — what you trust, why, and where it breaks.",
  "Transparency test: can a service show you where its model underperforms? If not, ask why. Ours is public.",
  "Calibration over hype. A number that knows what it doesn't know beats a loud number that pretends.",
  "Most hype talk is noise. We'd rather show you a clean audit trail than a confident headline.",
  "Decision hygiene is unglamorous: log the bet, log the reason, log the result, review weekly. That's most of the secret.",
  "We separate process quality from outcome. You can run a great process and still lose a game. Judge the process.",
  "If a service hides its sample size, you can't judge anything it says. Sample size and baseline first, always.",
  "Founding lane is open: a documented decision-process audit, source-quality checks, and a research brief. No promised outcomes — just clarity.",
  "What we refuse to fake: marketing win rates, returns, accuracy, or any promised result. The honest read is the product.",
  "Research we're working through: injury context vs. market reaction, rest and travel spots, weather-sensitive totals. Education, not advice.",
  "Your weakest decision moment is usually emotional, not analytical. We help you build the rule that protects you from yourself.",
  "We'd rather earn trust slowly than rent attention loudly. If that resonates, the founding waitlist is open.",
];

/** 10 research-brief topics (education; no outcome guarantees). */
export const RESEARCH_BRIEF_TOPICS: readonly string[] = [
  "Injury context vs. market reaction — when is the news already in the line?",
  "Rest and travel spots — quantifying short-week and cross-country effects with uncertainty bands.",
  "Weather-sensitive markets — wind and precipitation on totals, stated as ranges.",
  "Closing-line value as a process metric — a discipline signal, not an outcome promise.",
  "Pace and possessions — why totals need tempo, not just averages.",
  "Opponent adjustment — strength-of-schedule done honestly.",
  "Sample-size discipline — how few games is too few to say anything.",
  "Calibration drift — detecting when confidence stops matching reality.",
  "Source triage — rating data by recency, rights, and reliability.",
  "Decision journaling — a falsifiable rule template for exceptions.",
];

/** No-claim CTAs. */
export const CONTENT_CTAS: readonly string[] = [
  "Founding waitlist — process-first, no promised outcomes.",
  "Read the honest model scorecard (it does not beat a naive baseline yet).",
];

/** Every draft string, for the no-claim test sweep. */
export const ALL_CONTENT_DRAFT_STRINGS: readonly string[] = [
  ...SOCIAL_POST_DRAFTS,
  ...RESEARCH_BRIEF_TOPICS,
  ...CONTENT_CTAS,
];
