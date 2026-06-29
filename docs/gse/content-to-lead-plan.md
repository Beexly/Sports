# GSE — Content-to-Lead Plan (No-Claim, Draft-Only)

**Status:** DRAFTS ONLY. No auto-posting. No publishing. Owner holds the publish gate.
**Compliance:** every draft below must pass `runNoClaimGuard` (the platform
`@/lib/compliance-scanner` rules, all layers) with **zero `block` flags** before any
use, and must contain no positive performance claim. Framing is transparency /
decision-hygiene / calibration / research / waitlist only.

> No win-rate, ROI, accuracy, edge, profit, picks-sold-as-certainty, guaranteed
> outcome, or sportsbook/affiliate wording. No auto-post. The owner approves each
> post before it leaves the building.

> **Canonical source + CI scan:** these drafts now live as typed constants in
> `apps/web/lib/gse/content-drafts.ts` (currently **35** social posts) and are scanned
> by the real compliance scanner in `apps/web/__tests__/gse-waitlist.test.ts` (every
> string must pass `runNoClaimGuard` with 0 block flags). A representative subset is
> shown below; the module is canonical.

## A. No-claim social post drafts (representative subset of 25)

1. We publish our model's honest scorecard — including where it loses. On the last
   out-of-sample test (10,301 plays) it did not beat a simple baseline. That's not a
   sales line; it's the standard we hold ourselves to.
2. A pick without a documented process is a guess wearing confidence. We're building
   the opposite: the process, the sources, and the uncertainty — written down.
3. Three questions before any sports decision: What do I actually know? How fresh is
   it? What would change my mind? If you can't answer all three, that's the work.
4. We don't sell certainty. We help you see your own decision process clearly — what
   you trust, why, and where it breaks.
5. Transparency test: can a service show you where its model underperforms? If not,
   ask why. Ours is public.
6. Calibration over hype. A number that knows what it doesn't know beats a loud
   number that pretends.
7. Most hype talk is noise. We'd rather show you a clean audit trail than a confident
   headline.
8. Decision hygiene is unglamorous: log the bet, log the reason, log the result,
   review weekly. That's most of the secret.
9. We separate process quality from outcome. You can run a great process and still
   lose a game. Judge the process.
10. If a service hides its sample size, you can't judge anything it says. Sample size
    and baseline first, always.
11. Founding lane is open: a documented decision-process audit, source-quality
    checks, and a research brief. No promised outcomes — just clarity.
12. What we refuse to fake: marketing win rates, returns, accuracy, or any promised
    result. The honest read is the product.
13. Research we're working through: injury context vs. market reaction, rest and
    travel spots, weather-sensitive totals. Education, not advice.
14. Your weakest decision moment is usually emotional, not analytical. We help you
    build the rule that protects you from yourself.
15. We'd rather earn trust slowly than rent attention loudly. If that resonates, the
    founding waitlist is open.

## B. 10 research-brief topics (education, no outcome guarantees)

1. Injury context vs. market reaction — when is the news already in the line?
2. Rest and travel spots — quantifying short-week and cross-country effects with
   uncertainty bands.
3. Weather-sensitive markets — wind/precipitation on totals, stated as ranges.
4. Closing-line value as a *process* metric — a discipline signal, not an outcome promise.
5. Pace and possessions — why totals need tempo, not just averages.
6. Opponent adjustment — strength-of-schedule done honestly.
7. Sample-size discipline — how few games is too few to say anything.
8. Calibration drift — detecting when confidence stops matching reality.
9. Source triage — rating data by recency, rights, and reliability.
10. Decision journaling — a falsifiable rule template for exceptions.

## C. CTAs (no-claim)

- Primary: "Founding waitlist — process-first, no promised outcomes → /waitlist"
- Secondary: "Read the honest model scorecard (it does not beat a naive baseline yet)."
- Never: any CTA implying winnings, edge, locks, or guaranteed results.

## D. Compliance scan procedure (mandatory before any use)

1. Run each draft through `runNoClaimGuard(text)` → require `ok === true` (0 block flags).
2. Run each through `hasNoPerformanceClaim(text)` → require `true`.
3. Manual read for tone (no tout voice, no hype emoji ladder, no competitor compare).
4. Log the `claim_gate_hit` event for any draft that fails, and rewrite — never ship a failure.

## E. Owner gates (all BLOCKED)

- No auto-posting / scheduling. No external account use.
- Owner approves each post + channel before publishing.
- No links to sportsbooks/affiliates. No pricing in posts.
- Backtest-truth posts must use the exact honest figures (beats naive = false).

## F. Exact next safe action

Keep these as drafts. When the owner wants to publish, run the §D scan, present the
approved set, and let the owner post manually. No agent auto-post.
