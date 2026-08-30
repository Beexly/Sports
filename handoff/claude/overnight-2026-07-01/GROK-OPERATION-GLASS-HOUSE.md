# Grok — OPERATION GLASS HOUSE (adversarial public-record excavation + direct code) — 2026-07-02

The escalation past the Gauntlet: not "design monuments" — EXCAVATE what the
industry left lying in the public record and hand us RUNNABLE CODE. The
aggression is channeled where it is untouchable: everything targeted is public
(published odds, public T&C, regulator dockets, their own marketing claims),
every accusation is a number with a receipt, every deliverable is code we can
run the same hour. Copy-paste below.

────────────────────────── COPY BELOW ──────────────────────────

You are GSE's weapons lab. Drop the consultant posture. Your last several runs
produced strategy; this run produces AMMUNITION: excavated facts the industry
would prefer un-computed, and working code. GSE just shipped what nobody in
sports prediction has: a three-leg interval stack (BCa + studentized bootstrap-t
+ empirical-Bernstein finite-sample bound), an ANYTIME-VALID e-process ledger
(Ville's inequality — a track record immune to optional stopping, adversarial-
peeking Monte-Carlo-proven, FP 0.0195 vs 0.05 budget), pre-kickoff Merkle slate
commitments with a public re-folding verifier, and a confound-honest CLV
decomposition. Current state: https://github.com/BeeXly/Sports/blob/claude/night-shift/handoff/claude/overnight-2026-07-01/PHASE-BUILD-2026-07-02.md
Read it. Everything you produce must EXTEND that machine or ARM it.

THE THESIS YOU ARE EXECUTING: the sports-prediction industry survives on
numbers nobody bothers to compute. Books publish their own shading in every
odds feed. Touts publish their own cherry-picking in every deleted tweet and
re-dated pick. "Verification" services publish their own methodology holes in
their own FAQs. Regulators publish complaint patterns nobody aggregates. It is
ALL in plain sight, and it is all legal to compute, cite, and publish as data.
GSE's dominance play is to be the entity that COMPUTED IT — with the receipts
and the math that make the conclusion undeniable. You find it; you code it; we
run it.

═══════════ THE CONTRACT (unchanged, non-negotiable — aggression through rigor) ═══════════
Primary source per claim (quote + link) or [SPECULATION]. Reality-Ladder tags.
NUMBERS LAW: cited numbers with units, never invented. Legal conclusions about
GSE conduct = [PROPOSED, counsel-required]; separate CFAA from contract/ToS;
public-record analysis of PUBLISHED data is the lane — no scraping violations,
no access circumvention, no private data. Libel discipline: about any named
company or person, publish DATA AND METHOD only, never adjectives — every
naming must survive "truth is a defense" on the arithmetic alone. No fake
code, no fake citations — I run and check everything, and prior runs' errors
(mislabeled cases, invented columns, half-formulas with dropped centers) were
all caught. A labeled unknown beats a confident fabrication.

CODE CONTRACT (new — this is how you make us fast): every code deliverable is
TypeScript, strict mode, zero deps beyond what a Node 20 runtime ships,
deterministic (seeded mulberry32 PRNG where randomness exists — no Math.random,
no Date.now in logic), pure functions + a separate loader boundary, and ships
with (a) a vitest test file whose Monte-Carlo assertions state their
Monte-Carlo standard error and threshold arithmetic in comments, (b) the exact
run command, (c) a one-paragraph statement of the #1 confound and its control.
Match the house shape: functions return `Result | null` on refused input,
never throw on data; every "observed" number in a comment must be one YOUR
code actually printed — mark any number you could not execute as [UNRUN].

═══════════ DELIVERABLE 1 — THE SHADING FINGERPRINT ENGINE (code + method) ═══════════
Books publish their vig asymmetries in every odds snapshot. Write the complete
TypeScript module that, given a time-series of published odds (gameId, book,
market, side, americanOdds, timestamp — our Odds table shape), computes per
(book, sport, market): hold percentage distribution; SHADING ASYMMETRY (how
far the vig-free line sits from the multi-book consensus, signed toward the
popular side — name the popularity proxy honestly); reaction latency vs the
consensus move; stale-window frequency. Include the exact statistical test
(with multiple-comparison control — name it) for "this book's shading on this
market is systematic, not noise." The #1 confound (popular side correlates
with home/favorite — control it) handled explicitly. This is the Bookmaker
Fingerprint we deferred as data-blocked — UNBLOCK it by writing the code
that runs the day our snapshots accrue, plus name every PUBLIC historical
odds archive (license + URL) that could backfill it TODAY.

═══════════ DELIVERABLE 2 — THE TOUT AUTOPSY PROTOCOL (code + excavation) ═══════════
Design + code the pipeline that takes any public tout's PUBLISHED pick stream
(public tweets/posts — their own publications) and runs it through OUR anytime-
valid e-process: "here is your record under math that does not allow window
shopping." Deliver: the normalization schema (pick, price, timestamp, source
URL), the e-process runner (reuse our construction — it is in the repo doc),
the deleted/re-dated-pick DETECTION heuristics (archive diffs, numbering gaps,
reply-thread timestamps — public evidence only), and the output artifact
(per-tout: e-value path, everSignificant, the honest sentence). Then EXCAVATE:
pick 5 of the loudest public track-record claims in US sports betting media
[name them from their own public marketing, quote the claim verbatim with URL]
and specify exactly what public data would settle each claim with our machine.
DO NOT fabricate their numbers — build the test, cite the claim, mark the
verdict [AWAITING DATA RUN].

═══════════ DELIVERABLE 3 — THE FINE-PRINT QUANTIFIER (excavation + code) ═══════════
Promo terms, odds-boost conditions, max-win clauses, void rules, dormancy
fees: all published, all quantifiable, almost never quantified. Excavate the
published T&C of the top 6 US books (quote + link the exact clauses) and
build the TypeScript scoring module that turns a term-sheet into numbers:
effective boost EV after playthrough; void-rule breadth score; limitation
asymmetry (their right to void vs yours). Deliver the comparison table with
every cell sourced to a quoted clause. Where a term is ambiguous, say
ambiguous — the AMBIGUITY COUNT is itself a published number. This is the
consumer-side "what they'd prefer nobody tabulated" artifact, and it is
bulletproof: it is literally their own contract, arithmetic'd.

═══════════ DELIVERABLE 4 — THE WSR UPGRADE, FROM THE PRIMARY SOURCE (code) ═══════════
Our anytime ledger deliberately ships a conservative betting schedule because
we refuse to trust a remembered constant. You have search: pull Waudby-Smith &
Ramdas (JRSS-B 2023, and the arXiv version), quote the EXACT predictable-
plug-in lambda schedule and truncation from the paper (equation number +
verbatim formula), and implement it as a drop-in `lambdaSchedule` option for
our `anytimeValidLedger` — with the adversarial-peeking Monte-Carlo test
proving the upgraded schedule ALSO holds the Ville budget AND showing the
measured power gain vs our current schedule at the same break-even/-110
construction (print both numbers; [UNRUN] if you cannot execute — but write
the test so we can). Also pull and quote the exact GRAPA/aGRAPA definitions so
we can cite our current schedule's lineage correctly. This is you doing what
we could not: verified constants from the primary source, as running code.

═══════════ DELIVERABLE 5 — THE REGULATORY X-RAY (excavation) ═══════════
State gaming regulators publish enforcement actions, fines, house-rule
filings, and complaint statistics. Sportsbook parent companies publish 10-Ks
with hold percentages and legal-proceeding disclosures. Excavate: the 10
most revealing PUBLIC regulatory/financial facts about US sports betting
operators that never reach mainstream sports media (fine + docket number +
link; hold trends by state from public revenue reports — Nevada/NJ/etc.
publish monthly). For each: the number, the source, and the one-sentence
"why the industry doesn't lead with this." Then the FORECAST: given
ESPN-DraftKings integration and these enforcement patterns, the 5 most likely
industry ruptures in the next 18 months, each with a NAMED, WATCHABLE early
indicator (a specific monthly report, docket, or filing we can monitor) —
forecasts we can score with our own calibration machinery later.

═══════════ DELIVERABLE 6 — THE UNPRECEDENTED ARTIFACT (design + code skeleton) ═══════════
Propose and spec the ONE public artifact that has genuinely never existed —
your candidate must survive this test: name the closest prior art (search for
it — prove you looked) and state the exact residual novelty in one sentence.
Our candidate to beat: "The Anytime Board" — a live public leaderboard where
EVERY track record shown (ours first, touts who opt in, and cited public
claims as [UNTESTED] rows) is computed exclusively under anytime-valid
inference with pre-kickoff Merkle receipts — the first leaderboard in any
prediction domain where LOOKING at it repeatedly cannot inflate what it
shows. If you can beat that candidate, do; if not, spec IT: full data model,
API shape, the exact honest-language rules for [UNTESTED] rows (libel-check
each phrase), and the TypeScript for the board's core ranking + display
policy module with tests. This is the "who the fuck are these guys" surface:
polite, mathematical, and impossible to un-see.

═══════════ EXECUTION ORDER ═══════════
Depth over breadth, code over prose. For each deliverable: the excavated
receipts (quotes + links), then the code (complete, no ellipses in function
bodies), then the test file, then the run command, then the confound
paragraph, then Reality-Ladder tag the whole deliverable. Finish with: THE
KILL LIST (what you attempted and could not source/verify — named, so we know
the frontier) and THE ONE MOVE (which deliverable we ship first for maximum
"who are these guys" per engineering hour, defended in 5 sentences). Do not
stop until all six are delivered. Go.

────────────────────────── COPY ABOVE ──────────────────────────
