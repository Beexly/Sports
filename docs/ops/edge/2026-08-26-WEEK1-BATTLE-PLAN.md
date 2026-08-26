# WEEK 1 BATTLE PLAN — the three armable candidates

## STATUS UPDATE 2026-08-26, ~15:50 UTC — the wave landed. Read this first.

**The C-75 second wave (23 agents, independent recomputation + the first-ever real falsifier
runs on real data) is in: none of the three candidates below is armable. Candidate 1 is KILLED.
Candidate 2 is KILLED (broad) / too thin to gate (narrow) and rests on a table with a real bug.
Candidate 3's favorite leg holds but its underdog legs are now in unresolved dispute with Hermes'
own numbers.** Full evidence: `docs/ops/edge/2026-08-26-hermes-second-wave-verification.md`.

This is not a failure of the plan below — it is the plan working exactly as designed. Every
ARM-GATE existed to be a real gate, not a formality, and every one of them either failed to
confirm or actively caught a defect. The rest of this document is kept intact as the record of
what was proposed and why; each candidate section now carries its verdict inline. **No live
e-process runner gets built for Candidate 1 or 2 — SONNET-EXECUTION-ORDERS queue item #2 is
revised accordingly (see AGENT_LEDGER.md C-79).** The honest state of the edge program, retested
on the most rigorous instrument this repo has ever had: **historical game-level ATS/totals/
moneyline space is now closed for the 2026 season on real data, not merely suspected closed.**
That is itself the deliverable — see the rewritten §"THE STANDING TRUTH" at the bottom.

---

**Written 2026-08-26, kickoff in ~8 days.** Source: direct read of every Hermes lead document
(W2-keynumber-prereg.md, kickoff-time-fav-scan.md, rest-edge-scan.md, wong-teaser-check.md,
persistence-to-market.md) — the numbers below are quoted from those files, and every one is under
independent recomputation by the C-75 second wave right now. **ARM-GATE** = what must come back
true from the wave (or founder data) before real money touches it. Stakes are founder-decided,
always; agents arm nothing.

---

## CANDIDATE 1 — Key-number dog side (+3 / +6). The strongest thing anyone has found.

**The play:** take home underdogs priced at exactly +3 or +6 (equivalently: fade home favorites
at −3/−6).

**The evidence (Hermes, quoted):** n=1,179 games at these numbers, home favorites cover **44.9%**
(z=−3.52 vs coin-flip among decided). Dog side covers **55.05%** of decided games. **Stable in
both eras** — 44.7% (1999–2013) and 45.3% (2014–2025) — which is the signature of structure, not
one-era noise. Real mechanism: field-goal increments make games land ON 3 and 6; flat pricing at
those numbers under-compensates the dog side. Hermes's own margin histogram corroborates the
landing mass (+3 margin: 78 games vs −3: 48 in the home-fav sample).

**Why it is not yet an edge:** (a) ~40 buckets were scanned before locking 3&6 — z=−3.52 survives
Bonferroni×40 but scan-then-lock is not clean prereg; (b) the consensus close is not a real book's
close — **books already shade key numbers**, so the tradable residual is strictly smaller and
could be zero; (c) their fixed-λ e-process did not certify (E≈0.073–0.35, bar is 20).

**ARM-GATES (all three, no exceptions):**
1. Second wave confirms the effect survives multiplicity + push-handling recompute.
2. Second wave's vig test: effect positive after real spread juice on the 5,065 priced rows.
3. Founder price check at a real book Week 1: is +3 actually available at the consensus number,
   or already shaded to +2.5/−115? If shaded away, the edge was already harvested — stand down.

**If armed:** preregistered one-sided e-process (λ locked at Kelly-derived ~0.056, NOT the 0.04
Hermes used), one bet per qualifying game, dog side only, entry price recorded write-once. Kill at
E≤0.10; certify only at E≥20 — which at ~2–4 qualifying games/week is a **season-long** track.
Week 1 gives the first honest observations, not the verdict.

**VERDICT 2026-08-26 (C-75 second wave): GATE 1 FAILED. KILLED. Do not arm.** The n=1,179 figure
does not reconstruct under any of 7 bucket definitions three independent agents tried against the
real data — the reproducible exact-`{3,6}` bucket is n=773, and at that n the effect fails
Bonferroni correction at both m=40 (Hermes' own claimed scan size) and the broader honest m=70.
Worse: this bind has now been run through the falsifier's shuffle gate for the first time ever
(it never had before — no falsifier verdict on it existed pre-wave), and it was **KILLED**
(survives only 59–95/200 label permutations across parameterizations; needs ≥190/200 to pass).
The naive multiplicity framing alone would have shown a misleading PASS (logM up to 5.12) — the
shuffle gate, the exact one broken until today, is what actually catches this. "The strongest
thing anyone has found" does not survive first contact with a working instrument. Full detail:
`docs/ops/edge/2026-08-26-hermes-second-wave-verification.md` §2 (key-number row) and §4 (first
falsifier run). Moved to "HONESTLY DEAD" below.

## CANDIDATE 2 — H3: eastward road favorites (+2 zones). Small, live, real-mechanism.

**The play:** back road favorites traveling eastward across ≥3 timezone offsets (post-2015 only).

**The evidence (Hermes, quoted, and it survived their own push-artifact audit):** post-2015 n=79,
cover **60.8%**, z=+2.34 against the CORRECT 0.476 post-vig benchmark. Companion fade H2
(west-coast teams at 10am body-clock, road): post-2015 cover **30.6%**, z=−2.05, but n=36 — too
thin to arm alone; it rides as a shadow track only.

**Why it is not yet an edge:** 3-hypothesis family (z=+2.34 unadjusted); n accumulates at only
~8 games/season; the harness lacks true kickoff times (H2's window is a structural proxy).

**ARM-GATES:**
1. Second wave recompute confirms n/z with independent timezone table (Hermes already caught one
   hand-typed-table error here — the recompute is not optional).
2. falsifyBind pass on the post-2015 rows with real de-vigged marketProb.
3. Kickoff-time data lands (sportsoddshistory bulk — clearance check required first; scraping
   registry classification is a hard gate, no evasion ever) to convert H2 from proxy to real.

**If armed:** tiny preregistered stake, every qualifying game, season-long e-process. Expected
~8 observations by January — this is a multi-season track and is stated as such.

**VERDICT 2026-08-26 (C-75 second wave): GATE 1 FAILED — a real bug found instead of a clean
confirm. Do not arm; not armable this season regardless.** The shared `NFL_TEAM_UTC_OFFSET` table
silently omits three relocated franchises (OAK/SD/STL); using the actual repo table gives n=87
(not Hermes' n=79), z=1.82 (not z=2.34). Correcting for the omission gets closer (n=83, z=2.31)
but still leaves a residual ~4-game gap to Hermes' figure that is unexplained — exactly the kind
of hand-typed-table error this gate existed to catch, and it caught one, just not the one
expected. First-ever falsifier runs: the BROAD formulation (n=176, all away teams, not just road
favorites) is **KILLED** (shuffle 76/200, multiplicity logM=1.379 against a 2.996 bar). The
NARROW formulation — the actual candidate as defined above, road favorites only, n=87 — is too
small for the gates to run at all: **PARKED (starved)**, not confirmed, not killed, genuinely
unknown. Gate 3 (real kickoff-time data) also still does not exist — only a 1,192-byte prose memo
that spot-checked one row and says its own cross-validation was "queued for next cycle," never
run. Nothing here is armable until the timezone table is fixed AND real kickoff data lands AND
the narrow sample grows enough to gate. Full detail: verification doc §2 (H3 row) and §4.

## CANDIDATE 3 — Wong teasers at modern prices. One phone-check from a verdict.

**The play:** two-team 6-point teasers crossing 3 and 7 (favs −7.5/−8 → −1.5/−2; dogs
+1.5/+2.5 → +7.5/+8.5).

**The evidence (Hermes, quoted):** the classic crossing legs REPLICATE in 27 seasons of our data:
**69.9%** (n=259), **66.8%** (n=380), **77.1%** (n=105) per leg. A two-team teaser at −120 needs
p² > 45.45%/leg. At the observed 67–70%, pairs clear it — **if −120 exists anywhere today.**
Modern books moved to −125/−130, which eats most of it.

**Why it is not yet an edge:** entirely a function of TODAY'S teaser pricing, which no dataset in
this repo carries. Also legs within a week are not independent; correlation must be priced.

**ARM-GATE (one item, founder, ~10 minutes):** record actual Week-1 teaser prices from 2–3 real
books (screenshot into the repo). At −120: armable. At −130: dead, closed honestly, on the kill
ledger, done forever.

**VERDICT 2026-08-26 (C-75 second wave): the leg math itself is now split — do not spend the
founder's 10 minutes yet.** The favorite leg REPLICATES cleanly (69.9%, n=259, exact match). Both
underdog legs do NOT: Hermes cites 66.8%/77.1% (n=380/n=105); two independent recompute methods
land on 75.2%/67.6% at the identical n — an 8–10 point disagreement, not noise. Hermes' original
generating script is not committed anywhere in this repo, so there is nothing to diff against; the
discrepancy is unresolved, not merely disputed. Since the play is a TWO-team teaser pairing a
favorite leg with an underdog leg, the pair-level breakeven math this candidate's whole case rests
on cannot be trusted until the underdog legs are re-derived and reconciled. **Revised ARM-GATE:
reconcile the underdog-leg numbers first** (agent-executable — re-derive with a documented,
committed method, per verification doc §8 item 7), **then** the founder's 10-minute price check
still applies exactly as written above.

---

## HONESTLY DEAD — do not resurrect
- **Candidate 1, key-number dog +3/+6: KILLED (2026-08-26, C-75).** "The strongest thing anyone
  has found" — dead on first contact with a working falsifier. See verdict block above.
- **H3 broad formulation (all away teams, n=176): KILLED (2026-08-26, C-75).** The narrow
  (road-favorites-only) formulation is PARKED, not dead — see verdict block above; do not conflate
  the two.
- **Persistence→market (all five mappings): KILLED** — every half-split within 1 SE of breakeven
  (Hermes's own honest first-pass kill; the wave double-checks it, nothing more).
- **Home-favorite blanket fade (z=−5.38): ARTIFACT, and now more precisely understood.** Not pure
  push-asymmetry as first labeled — the extreme z came from testing the push-excluded rate against
  the wrong null (the −110 vig breakeven instead of a fair coin). Correctly specified, the residual
  is z≈−2.23, which itself does not survive an era split (pre/post-2012 individually
  z=−1.47/−1.68, neither significant). Its corpse is still useful: it *proves* games pile up on 3
  and 6 — but that mechanism's own best candidate (C1 above) is now also dead.
- Everything the prior program pre-registered and killed (L-15/16/17, C-44 scope). Still dead.
- CPOE persistence, home-fav/road-dog ATS, overs/unders, divisional/large/short-spread ATS, home
  moneyline (2006+ real prices) — all **KILLED** in the first-ever real falsifier campaign on this
  data (2026-08-26, C-75). None of these were previously tested at all; now all are, and all die.

## THE STANDING TRUTH, stated once (rewritten 2026-08-26 after the wave landed)
**None of the three candidates this document proposed is armable, and the reason is not thin
data or an untested instrument — it is the opposite.** The falsifier was repaired today (four
defects fixed) and then, for the first time in this program's history, actually run against real
closing prices at scale: 8+ full strategies, thousands of games each, zero survivors. The closing
spread is not measurably biased (slope 1.05 vs 1, p=0.058); the devigged moneyline close is
well-calibrated (Brier 0.211); a 132-test segment scan across every era/week/spread/total/
divisional/weekday/favorite-side cut clears nothing but the mechanical overtime segment. This is
what a genuinely efficient market looks like under a genuinely working instrument — not an
absence of testing, an actual measured absence of edge in historical game-level ATS/totals/
moneyline space. Our own laws (R62 n≥500 prospective; C-33 certification-is-2027; C-41 no
retrospective claims) already forbade calling anything here an edge before kickoff; today's wave
means there is now nothing retrospective left worth arming even under those laws' own permissive
reading. **What remains live: Door B (independent modelProb → props, still untested by this wave
— it needs a modelProb pipeline this program has never fired) and Door A (measurement
infrastructure — capture-readiness, C-76's acceptance harness, C-78's provenance tag).** Public
claims: none (C-32) — this document is now itself the honest public-facing answer to "do we have
an edge," and the answer is documented, precise, and no.

## Countdown to Sept 3 (rewritten 2026-08-26 — the wave landed, the plan below is now void)
- ~~Wave confirms/kills gates 1–2 of Candidates 1 & 2~~ — **DONE, both KILLED/PARKED. See verdicts.**
- ~~Live e-process runners for Candidates 1 & 2~~ — **NOT BUILT.** Building live infrastructure for
  a killed signal and a starved one would misrepresent the evidence; SONNET-EXECUTION-ORDERS queue
  item #2 is revised (AGENT_LEDGER.md C-79) rather than executed as originally scoped.
- **Agent-executable next** (verification doc §8, ranked): fix `build-cpoe-falsify-harness.py`'s
  inverted-favorite-sign + push-as-loss bugs and re-run; correct `market-atlas.md`'s two
  mislabeled columns (27/27 seasons); fix `build-close-calibration.py`'s no-op `devig()`; fix
  `NFL_TEAM_UTC_OFFSET`'s missing OAK/SD/STL; reconcile the Wong-teaser underdog legs (blocks
  Candidate 3's revised ARM-GATE above); run the two cheap pre-registered tests named there
  (totals devig calibration, divisional-unders raw z-test).
- **Founder (unchanged, still the highest-information queue):** the STATE.md founder queue (CLOSE
  liveness, shadow-falsifier run, merge #672); supply the FiveThirtyEight Elo files if this
  program is to ever test anything beyond closing-line-relative space; decide the
  `hermes/w2-audit-settlement` merge (264 commits ahead, carries most of the "needs data" list).
  Candidate 3's teaser price check is now gated on the agent-executable leg reconciliation above —
  do not spend the 10 minutes until that's resolved.
