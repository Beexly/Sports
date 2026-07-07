# FantasyPros (NFL) — engine teardown

*Public-source only. 2 pages given by Garrett + 3 official FantasyPros
methodology/FAQ pages + 1 search. ~15 credits total — deliberately lean pass,
no multi-agent workflow. `(documented)` = verbatim from FantasyPros' own pages;
`(inferred)` = reasoned, not confirmed by them.*

## The headline finding: their Accuracy Challenge does NOT feed their Consensus Rankings

This is the real answer to "what don't they want you to know" — and it's not a
conspiracy, it's a **documented design choice most users never notice**:

> *"ECR™ represents the collective opinion of the experts we track. We generate a
> consensus cheat sheet by calculating how many 'Rank Points' each player
> receives based on his ranked position on each expert's cheat sheet... We add
> these Rank Points up for each player **across all experts**..."*
> — [tools FAQ](https://www.fantasypros.com/tools/) `(documented)`

FantasyPros runs a genuinely rigorous, public **Expert Accuracy** grading system
(below) that ranks 100+ experts by historical skill — but the **default Expert
Consensus Rankings (ECR) count every tracked expert equally**. A mediocre
expert's rank and a top-accuracy expert's rank carry the *same weight* in the
number you see on the default cheat sheet. The accuracy grades are a published
side-report, not an input to the main product.

**The lever they hand you (and almost nobody uses):** the same FAQ says you can
build a **custom consensus from a hand-picked or accuracy-filtered subset of
experts** via their Cheat Sheet Wizard — *"use one of our accuracy filters or
hand-pick the experts you trust... combine anywhere from 2 to all experts we
track."* `(documented)` That's the actual edge: FantasyPros' own accuracy data
lets you build a **top-quartile-expert-only consensus** instead of trusting the
flat default — most users never do this.

## Engine 1 — Expert Consensus Rankings (ECR)

- **Mechanism: Borda-count-style "Rank Points," not an average.** They
  explicitly rejected a raw average because it requires assigning an arbitrary
  numeric rank to players an expert left off their list, which skews results.
  `(documented)`
- **Structural property (inferred, follows directly from the mechanism):** a
  point-sum/Borda system **compresses outliers**. An expert who is boldly and
  *correctly* right on a sleeper (ranks him #5 overall while consensus has him
  #150) gets far less credit for that call than a raw-average system would give
  — the size of the disagreement doesn't matter, only the rank-points delta
  does. The system is built to reward broad agreement with the field, not
  contrarian correctness. This is the mechanical reason ECR reads as
  "consensus-safe" rather than "sharp."

## Engine 2 — Expert Accuracy (the real methodology, fully documented)

Five explicit steps, at [about/faq/football-draft-accuracy-methodology](https://www.fantasypros.com/about/faq/football-draft-accuracy-methodology/) `(documented)`:

1. **Convert each expert's rank to a point projection** using the rank slot's
   trailing 3-year average production (e.g., "WR #50" → the historical scoring
   average of players who finished WR #50). Smooths outlier seasons.
2. **Accuracy Gap** = |projected pts − actual 3-yr-avg pts| for that player. Summed
   across the position → the expert's raw score. Lower = better.
3. **Missing-player handling (a real soft spot):** if an expert doesn't rank a
   player who later qualifies for the pool, they're NOT assigned an arbitrary
   bad rank. If the player entered the pool via preseason ECR, the expert is
   slotted at *their own last rank + 1*. If the player entered via breakout
   actual production (a player nobody projected, e.g. Raheem Mostert-style),
   the penalty only applies **when the expert's implied error is worse than the
   field average**, and even then it's capped at *(their gap − the average
   expert's gap)* — not an absolute penalty.
   **The loophole this creates:** an expert can publish a *shorter* ranked list
   and cap their downside exposure to deep-sleeper busts, while still getting
   full upside credit for the players they do rank. Ranking fewer players is a
   free option, not a risk.
4. **Position-relevance weighting** (added 2021): a multiplier from 1.0 down to
   0.5 based on preseason ECR rank — e.g., RB multiplier is 1.0 through RB72,
   linearly down to 0.5 by RB96. Deep-bench predictions matter half as much as
   top-of-draft ones.
5. **Rank the experts** by summed weighted Accuracy Gap per position; **Overall
   = QB+RB+WR+TE only** — K and DST are explicitly excluded from Overall
   because *"predicting performance for these two positions involves much more
   luck."* `(documented, their own words)`

## Business model / corporate

- **FantasyPros® is a trademark of Marzen Media LLC.** `(documented — footer)`
- **They own/cross-sell BettingPros** (real-money sports-betting props, spread
  picks, PrizePicks) directly inside My Playbook, with per-user tracking
  (`distinct_id` + `referred_by` params threading a FantasyPros session ID into
  the betting property). Same pattern as LineStar's affiliate stack: a
  skill-content company monetizing a real-money-adjacent cross-sell.
  `(documented)`
- **League sync covers more platforms than either RotoWire or LineStar:**
  Yahoo, ESPN, Sleeper, CBS, MyFantasyLeague, RTSports, FleaFlicker, Fantrax,
  BB10s, NFC, FFPC, FFWC, FanStar, DataForce, LeagueTycoon, + manual import.
  Free tier caps at **1 synced team**. `(documented)`
- **"FP Users Win 50% more championships"** — a marketing claim on the
  homepage; no methodology link found in this pass (unverified — would need a
  separate page/press release to substantiate).

## The GSE read

RotoWire sells authority. LineStar sells a patent. **FantasyPros sells rigor —
and it's real** (the accuracy methodology is genuinely well-designed and
transparently published). Their soft spot isn't sloppiness, it's a **product
gap**: the rigorous per-expert accuracy grading they compute is *not* the
default weighting users see. GSE's wedge against a well-run competitor like
this is narrower than against RotoWire/LineStar — the honest move is to note
what they do well (public methodology, real accuracy grading) rather than
overclaim an edge that isn't there. Where GSE can differentiate: (a) make
accuracy-weighting the *default*, not an opt-in filter a user has to discover,
and (b) publish realized ROI/calibration the way FantasyPros publishes
Accuracy Gaps — same rigor, applied to picks/predictions rather than just
rankings.
