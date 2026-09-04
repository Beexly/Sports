# Chaos campaign — 2026-09-04

Eleven models, parallel, ~15s a run, through the local OmniRoute router. Used well this
is the fastest hypothesis generator available. Used badly it is a plausible-sounding
noise machine.

**The rule that makes it useful:** a Chaos output is a HYPOTHESIS, never a finding.
Nothing from a run enters a doc, a claim, or the product until it has been falsified
against real data — the 15,939-pick replay corpus, the live graded picks, or a source
we opened ourselves. Last night's 9-model panel fabricated citations *while being
explicitly told not to* ("Cover (1965)" with a title that isn't Cover's 1965 paper,
a phantom "Chernoff (1952)"). The consensus was right; the bibliography was invented.
Treat every run that way.

**Why the prompts below are shaped as they are.** A soft question gets eleven
paraphrases of the obvious. Every prompt here does four things:
1. **Bans the obvious explicitly** — listing what we already know and forbidding it.
2. **Forces a falsifiable test** — a named dataset and a stated pass/fail threshold.
3. **Demands a pre-registered failure mode** — "if this is wrong, here is what we'd see."
4. **Makes UNSURE cheap and invention expensive** — say so, or be caught.

Run order matters: C1 and C6 can change the product. C2-C5 harden it.

---

## The state every prompt assumes (paste this block into each run)

```
CONTEXT — all verified, all from commands actually run:
- Deterministic factor model, NFL/NCAAF/NBA/NCAAB/MLB/NHL/MLS. Not an LLM. Positioning
  is "we're not AI, we're math you can read."
- Historical replay, frozen model, 1999-2025 NFL REG, 6,967 games, 15,939 settled
  picks, ZERO lookahead errors, graded against real closing lines.
    SPREAD    n=6778  48.86%  ROI -6.53%
    TOTAL     n=6868  49.49%  ROI -5.44%
    MONEYLINE n=2001  76.71%  ROI -1.96%   (wins 3 of 4 and still loses money)
    overall   n=15647 52.70%  ROI -5.48% per unit staked
- Confidence does NOT rank outcomes: AUC 0.4965, p=0.41 on 13,646 picks.
  Controls |line|, rest, week all ~0.50 too.
- Independently corroborated on LIVE production picks: the >=80 confidence tail is
  152 graded picks, 61 wins, 40%, INVERTED; resolution 0.005 on 1,663 graded picks.
- 11 market slices tested (favourite/dog, 4 spread bands, over/under, 4 total bands).
  ZERO cleared break-even on the Wilson LOWER bound.
- Market closing line walk-forward: pooled Brier 0.2106, CI [0.2050, 0.2172], n=2,750.
  Best calibrator isotonic, +0.00007 — i.e. the close is already near-perfectly
  calibrated and there is essentially nothing to recalibrate.
- CLV is UNMEASURED, not disproven: our entry line IS the close by construction, so
  every pick grades MATCHED_CLOSE. We hold no opening-line archive.
```

---

## C1 — The edge hunt (highest value; run first)

> You are a quantitative sports-betting researcher being paid to find a real,
> exploitable edge. Read the CONTEXT block. Then answer ONE question:
>
> **What is the single most promising thing we have NOT yet tested that could produce
> a positive-ROI edge, given the data we actually hold?**
>
> BANNED — we have already tested these and they returned nothing. Proposing any of
> them marks your answer as unread:
> - confidence-based selection · line-magnitude bands · favourite vs underdog
> - over vs under · total-size bands · rest differential · week of season
> - "recalibrate the model" (the close is already calibrated, isotonic gains +0.00007)
> - "collect more data" · "use machine learning" · "ensemble more models"
>
> Your answer MUST contain all five, or it is discarded:
> 1. THE HYPOTHESIS — one sentence, mechanistic. Why would this edge EXIST? Who is on
>    the other side of the bet and why are they wrong?
> 2. THE TEST — computable on 1999-2025 nflverse games.csv (game_id, season, week,
>    teams, spread_line, total_line, home/away_moneyline, scores, rest, roof, surface)
>    OR name the exact additional free, legally-redistributable dataset required.
> 3. THE THRESHOLD — the pass criterion, pre-registered, as a Wilson LOWER bound
>    against 52.38% break-even. "It looks promising" is not a threshold.
> 4. THE PRE-REGISTERED FAILURE — what the result looks like if you are WRONG. If you
>    cannot describe the failure, you have not made a falsifiable claim.
> 5. YOUR PRIOR — probability this survives an honest out-of-sample test, 0-100%, and
>    what would move it.
>
> Rank your own answer against the base rate: most proposed sports edges are dead on
> arrival because the closing line already prices them. If your idea is priced into the
> close, say so and give a different one. Do not be encouraging. UNSURE is respectable.

**What to do with the output:** every hypothesis goes into a slice test against the
existing corpus (`scripts/analytics/replay-breakdown.ts` already has the harness —
add the slice, run it, report the Wilson lower bound). Anything that clears break-even
on the lower bound gets a second, out-of-sample confirmation before it is spoken about.
Expect zero survivors. One survivor is a business.

---

## C6 — The CLV unlock (equal-highest value; run second)

This is the one measurement that could overturn the negative result, and the only thing
blocking it is data.

> We need a HISTORICAL OPENING-LINE archive for US sports, to measure closing-line
> value. We already have closing lines free (nflverse games.csv, CC-BY-4.0). We need
> the OPEN, or any pre-close timestamped snapshot, for the same games.
>
> Hard constraints — an answer violating any of these is worthless to us:
> - Must permit COMMERCIAL use of DERIVED outputs. We publish our own analysis, never
>   the raw data. A source that forbids commercial derived use is disqualified.
> - Must be obtainable WITHOUT scraping behind a login, paywall, or click-through
>   licence, and without violating a site's terms.
> - Must have per-game granularity and enough history to be worth having (3+ seasons).
>
> For EACH candidate give: name · URL · the licence by name and the actual clause on
> commercial derived use · exact seasons covered · whether it carries a true OPEN or
> only "latest" · format · how to obtain it legally.
>
> If you do not KNOW a source's licence, write LICENCE UNKNOWN. Do not infer it from
> the project's reputation. Do not invent a URL. A short list of three real sources
> beats twenty plausible ones — we will check every URL you give and a fabricated one
> destroys the whole answer's credibility.
>
> Finally: if you believe no such free source exists, say so plainly and name the
> cheapest paid one with its actual price.

**What to do with the output:** every URL gets opened and every licence clause read
before anything is written down. Cross-check against `.claude/rules/scraping.md` and
`source-rights-registry.ts`. This is exactly where a fabricated citation would cost us.

---

## C2 — Red-team the proof positioning

> A sports-prediction company is about to launch. It will NOT claim a win rate. Instead
> it publishes: a reliability diagram of its own settled picks, a closing-line-value
> ledger, timestamped tamper-evident proof receipts minted before kickoff, and a public
> factor breakdown for every pick. Its own honest numbers: the model is roughly
> break-even-to-negative against the closing line, and its confidence score does not
> rank outcomes (AUC 0.4965).
>
> You are, in turn: (a) a sharp bettor on Twitter, (b) a state gaming regulator,
> (c) a competitor's head of marketing, (d) a journalist.
>
> For EACH: what is the single hardest attack you make on this company, and what is
> the strongest honest defence available to it? Be specific and quote the exact line of
> attack you would publish. Do not be kind. Assume you are trying to end them.
>
> Then: name the ONE thing they could add before launch that most blunts your attack.

---

## C3 — The frontier gap

> Describe what a genuinely world-class 2026 sports prediction + fantasy product has
> that a competent-but-ordinary one does not. Not features — CAPABILITIES and the proof
> that they are real.
>
> Constraints: no generic SaaS advice ("great onboarding", "mobile-first", "AI-powered"
> — that last one is actively banned, this product is explicitly not AI). Every item
> must be something a user can VERIFY is true rather than take on trust.
>
> For each: the capability · why a user would switch for it · what it costs to build ·
> and whether it is defensible or copied in a week.
>
> Rank by (value to user) / (cost to build). Be brutal about which are table stakes
> versus real differentiators.

---

## C4 — Adversarial launch QA

Run this against the live preview URL once the launch build is up.

> You are the most hostile plausible user of a paid sports-picks site. Your goals, in
> order: see paid content without paying; make the site display a number that is wrong;
> make it claim something it cannot support; break checkout in a way that charges you
> without granting access, or grants access without charging.
>
> For each attempt: exact steps, what you expected, what you would look for as evidence
> it worked. Prioritise by damage done if it succeeds. Include the boring attacks —
> URL manipulation, stale cache, a declined card, a back button mid-checkout, an expired
> session, an ad-blocker — before the exotic ones.

---

## C5 — Falsify our own numbers

Adversarial self-check. Run it before publishing any figure.

> Here is a measurement methodology. Find the error. Assume there IS one.
>
> [paste CONTEXT block, plus:] The replay reconstructs each historical game by taking
> nflverse's single closing line per market and replicating it across N synthetic
> bookmaker rows at standard -110 pricing, then runs the frozen scoring model on that
> input and grades against the real final score. Feature assembly is type-separated from
> settlement so the scorer structurally cannot read a score. ROI is computed at each
> pick's real entry odds; win rates use Wilson intervals; the AUC uses average ranks for
> ties and a seeded permutation test.
>
> Questions: What does this design measure that it does not claim to? What does it CLAIM
> to measure that it actually does not? Which stated number is most likely to be wrong,
> and what is the specific mechanism? Where could a lookahead leak still hide despite
> the type separation?
>
> Do not reassure us. If the methodology is sound in a respect, say so in one line and
> move on to the weaknesses.

---

## Operating rules for the whole campaign

- **Every run is blind.** Never tell the models what answer you expect. Agreement across
  eleven only means something if none of them were led.
- **Every claim gets checked before it is written down.** URLs opened, licences read,
  slices actually run against the corpus.
- **Log what came back and what survived.** Append to
  `docs/data/CHAOS_CAMPAIGN_LOG_2026-09-04.md`: run, date, verdict counts, hypotheses
  generated, hypotheses SURVIVED after falsification. The survival rate is the number
  that tells us whether Chaos is earning its keep.
- **A run that produces nothing usable is a result**, and gets logged as one. That is
  what "no edge here" looks like, and it is worth knowing.

## Mechanics (from the verified OmniRoute guide)

- `oma_live_` **admin** token, not an `sk-` inference key (those 401).
- `maxTokens` minimum **256**; use 2048+ for C1/C6 or answers truncate mid-reasoning.
- `OMNIROUTE_MEMORY_MB=8192` or the parallel fan-out crash-loops.
- One connection per provider slug — extra same-slug connections are silently dropped.
- Cross-check no paid provider slipped in: no `modelId` starting `claude/ codex/ kiro/
  kr/ cc/ cursor/ devin/ grok-cli/ amazon-q/ deepseek/`.
