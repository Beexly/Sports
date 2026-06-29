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
  "Variance is not a verdict. A few losses don't mean the process broke — and a few wins don't mean it works. Sample size decides.",
  "We log every decision before the result is known. After, we grade the decision, not the outcome. That's the only honest scoreboard.",
  "If you can't explain why you made a call in one sentence a stranger would understand, the call wasn't ready.",
  "Source quality beats source quantity. One reliable, timely input you understand is worth ten you don't.",
  "The market is usually right. Our job isn't to feel smarter than it — it's to know exactly when and why we'd disagree, and to write it down first.",
  "Confidence should be a range, not a flag. 'Lean, with these caveats' is more honest than a checkmark.",
  "We delete more ideas than we keep. A process that never says 'no bet' isn't a process.",
  "Uncertainty bands are a feature, not an apology. We'd rather show the range than fake a point.",
  "Trust is built in the boring middle: the same checklist, every day, recorded, reviewed. No fireworks.",
  "Read the model where it's weak, not just where it's strong. The honest gaps are the most useful part.",
  "A model is a hypothesis with a memory. We write down what we expect, then let the results argue back.",
  "We separate 'interesting' from 'actionable.' Most signals are interesting. Very few change a decision.",
  "Discipline is choosing the boring, repeatable read over the exciting one-off. The boring read compounds.",
  "Process notes beat hot takes. A take ages in a day; a documented method gets better every week.",
  "We don't hide the misses. The miss log is where the next improvement actually comes from.",
  "Numbers without provenance are decoration. Every figure we use can point back to where it came from.",
  "Overconfidence is the most expensive habit in sports decisions. Calibration is the cheapest fix.",
  "We grade ourselves on whether the process was sound, not whether the ball bounced our way.",
  "If a method only works when you squint, it doesn't work. We keep the tests honest and the bar visible.",
  "The goal isn't to be loud about being right. It's to be quiet, consistent, and easy to audit.",
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
