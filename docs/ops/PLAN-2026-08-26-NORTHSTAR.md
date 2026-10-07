# THE PATH — GSE Strategic Plan from 20,000 Feet

**Author:** Fable seat, founder-ordered ("take control and design a plan to go forward — step
outside the box"). **Supersedes nothing, reframes everything:** the tactical plan
(`PLAN-2026-08-26-FORWARD.md`) remains the execution layer; this document is the layer above it —
why, in what order, with what minds, and against what clock.

---

## 0 · Where we actually are (one paragraph, no varnish)

A solo founder runs a multi-model fleet that has produced enormous verified output — and, today,
proved three uncomfortable things at once: (1) no edge has ever been demonstrated on real data,
and the instrument for finding one (the falsifier) was broken in four distinct ways for its entire
life; (2) the fleet's error-detection works — every defect, false claim, and bad plan line
introduced today was caught, traced, and fixed the same day — but its *error prevention* does not:
agents copy stale claims, deny the existence of files on branches they never fetched, and produce
faster than one human can absorb; (3) the single highest-information actions available (a 30-second
SQL query, a one-command falsifier run, a historical-odds pull on an already-paid subscription)
have sat unexecuted for days because everything routes through one person's hands and attention.
The constraint on this operation is not intelligence and it is not effort. It is **attention
economics and sequencing** — and the clock that matters has 8 days on it.

## 1 · The three reframes (each one reorders the priorities)

**R1 — The season is the deadline.** NFL Week 1 kicks off ~Sept 3–7 — eight days out. Every
retrospective analysis is now near-worthless at the margin; the second wave finishes that chapter.
What is irreplaceable is **live-season data captured cleanly from day one**: closing lines with
provenance, lock prices that are real book quotes, CLOSE-stamped archive rows, prop lines. A week
of season not captured cleanly is gone forever — it cannot be re-bought at any price. The business
plan already named the archive's "un-buyable start date" as the moat (C-43); this is the year that
clock either starts clean or doesn't. **Capture readiness by Sept 3 outranks every research task.**

**R2 — The product never waits on the edge.** The evidence now says plainly: GSE's product is the
truth layer — receipts, calibration, kill ledger, CLV tooling, the public record of what does NOT
work. That is valuable to bettors *whether or not GSE's own picks beat anything*, and it is the
only sports product whose credibility **grows** when results are honest nulls. Consequence with
teeth: the pricing ladder's PROVEN/ESTABLISHED steps are gated on performance that may never
arrive — so the FOUNDING tier must be priced and positioned to be viable *forever* on
tool-and-transparency value alone. Any roadmap item where Track R waits on Track E is a planning
bug. There are currently none — keep it that way.

**R3 — We have been hunting where the light is, not where the books are soft.** Everything ever
tested: historical, game-level, closing-line-relative, on free data — the single most efficient
market segment in existence, the one place guaranteed empty (measured: mean cover margin ~+0.07).
Meanwhile the operation *built* ~40 player-prop binds — the thin-liquidity segment where book
laziness is documented — and never fired them, because no independent modelProb flowed. The
weapons exist; they were pointed at the wrong target. Door B (modelProb → props, shadow-only) is
the only research direction with a mechanism for why an edge could exist at all.

## 2 · What we were missing (the blind-spot ledger)

1. **Instrument-after-experiment epistemics.** The falsifier was built, trusted, used — and only
   then audited. Standing law from today: **no instrument's verdict counts until the instrument
   has killed known-bad and passed known-planted-good at multiple n** (an acceptance harness, kept
   green forever). This applies next to `bernoulli-eprocess.ts` (its exp-overflow `return null` is
   the C-74 root cause, still unfixed, owner-gated) and to every future measurement tool.
2. **The founder-bottleneck economy.** The fleet is optimized to *produce* (docs, findings,
   commits) when it must be optimized to *reduce founder load*. Fixed by §3's architecture: one
   state page, a founder queue capped at 3, quarantine-until-verified for all agent handoffs.
3. **Merge debt is existential.** Two diverged branches (this one, 80+ commits incl. the only
   working falsifier; hermes/w2 with the data + research) both die stranded if they don't land on
   main. PR #672 first, hermes second, resolve falsify.ts to this branch's stricter version. Every
   day unmerged is drift risk (Hermes already "corrected" reality against a branch it never saw).
4. **Revenue reality went unexamined.** Today produced zero sentences about paying users, funnel,
   or churn. The truth machinery must point at the business too: the founder queue includes one
   recurring question — *what did the funnel do this week?* — answered from Stripe/analytics, not
   vibes. If the answer is "nothing," that is Track R's C-62: the measurement that decides whether
   the door exists.
5. **The pricing ladder's honest shadow.** PROVEN requires ≥100 settled + published calibration;
   ESTABLISHED requires verified CLV ≥52.4%. Current evidence says the second may never trigger.
   That is survivable (R2) — but only if it is *planned for*, not discovered later.
6. **Certification honesty.** Per C-33's own arithmetic, certification is a **2027 event** on
   every sport. The 2026 season is for capture, shadow-tracks, and product — not for claiming.
   Anyone (agent or human) who drifts toward a 2026 performance claim is violating the plan.

## 3 · The intelligence architecture (what minds, doing what)

The gap is not IQ — it is **memory, reconciliation, and routing**. Same seats, new contract:

| Seat | Contract |
|---|---|
| **Hermes** (free) | Data acquisition, scans, harness-building ONLY. All output lands in `handoff/` as **QUARANTINED** until a Claude seat verifies. Repo-state / PR-state assertions from Hermes are void on arrival (proved today, twice). On model-fallback, Hermes must not write state claims at all. |
| **Claude Sonnet** (low) | The workhorse: verification waves, code that must be right, ledger/PR discipline, the librarian duty below. |
| **Fable** (high, metered) | Judgment moments only: plans, verdict documents, statistical rulings, this document. On → decide → off. |
| **DeepSeek / external adversary** (free) | Statistical red team. Track record is real (caught the e-process null misspecification). Every prereg passes through it before freezing. |
| **Founder** (scarce, the true constraint) | ≤15 min/day from ONE queue of ≤3 items. DB, env, signups, merges, and the weekly revenue answer. Nothing else may claim his attention. |

**The librarian duty (new, assigned to every Claude session as standing overhead):** maintain
`docs/ops/STATE.md` — a single page, hard-capped ~60 lines: current ground truth, the founder
queue (≤3), what is quarantined awaiting verification, what is in flight. The founder reads ONE
page. The 146-row ledger stays the audit trail; STATE.md is the cockpit. Any session that ends
without updating it has not finished.

**Two laws with no exceptions:** builder never verifies its own work (cross-model when possible);
nothing sourced from a handoff enters a plan or STATE.md until checked against the ledger and,
for live state, the truth surface.

## 4 · The campaign calendar (NFL-anchored, dates are real)

**By Sept 3 (capture-ready — outranks everything):**
- [ ] FOUNDER: fresh `hf7-archive/query.sql` run — is CLOSE stamping alive? If 0, the archive is
      silently dead and fixing it becomes the fleet's only job.
- [ ] FOUNDER: `run-shadow-falsifier.ts` with DB creds — the ShadowSignal readout (one command).
- [ ] FOUNDER: historical-odds pull with the existing paid Odds API key (no signup — key live
      since R-6). Backfills multibook closes; also confirms the key's plan covers props history.
- [ ] FOUNDER: merge PR #672, then hermes/w2 (falsify.ts resolves to ours).
- [ ] AGENTS: lock-price provenance at pick creation (write-once book quote + source + timestamp).
- [ ] AGENTS: falsifier acceptance harness (planted edge + pure noise at n∈{100,1k,5k}) kept green.
- [ ] AGENTS: key-number W2 live e-process runner finished dark — armed only by founder YES.
- [ ] AGENTS: STATE.md exists and is current.

**Sept–Jan (the season):** capture everything, claim nothing. Two live shadow tracks maximum
(§5). Product beats ship on Track R's own rhythm — season-start is also the audience's moment of
maximum attention; the truth-layer story ("we publish what doesn't work") is a launch narrative no
competitor can copy. Weekly founder rhythm: Monday 15 minutes — read STATE.md, answer the funnel
question, clear the queue.

**2027:** first certification-eligible sample sizes exist. Not before.

## 5 · The edge program, reduced to two live tracks (everything else parked)

1. **W2 key-number** — already preregistered; runs live on 2026 closes through the repaired
   e-process, frozen rules, founder-armed. Kill/certify thresholds as written. This is Door C's
   one shot this season.
2. **modelProb → one prop family, shadow-only** — C-72's core wired to a single family (pick the
   one the second wave's data supports best), synthetic-validated, prereg drafted UNSIGNED for
   founder signature, shadow all season. This is Door B's one shot.

Parked explicitly: all remaining historical game-level work (the second wave is its funeral or
its miracle — either way it ends there), X4 exchange (until real infra), all other binds (until a
modelProb exists and one family has proven the pipe).

## 6 · Definition of winning, 90 days out (Nov 26)

- **Track R:** the funnel question has 12 weekly answers on record; FOUNDING-tier value prop
  stands without any performance claim; season content shipped weekly; zero honesty violations.
- **Data:** unbroken capture since Week 1 — CLOSE-stamped archive rows, provenance-tagged locks,
  multibook history backfilled. The moat's clock is running.
- **Edge:** two shadow tracks with clean, complete season-to-date paths — whatever the verdicts.
  A dead-clean KILLED pair is a *win* (publishable to the kill ledger, on-brand, and the question
  finally has a real answer).
- **Fleet:** founder time ≤15 min/day sustained; STATE.md never stale; zero unverified handoff
  claims in any plan.

## 7 · Stop-losses (pre-committed)

- If capture-readiness is not achieved by Sept 10 (Week 1 + buffer), agents freeze all research
  and do nothing but capture-infrastructure until it is.
- If the funnel question returns "no signal" for 8 consecutive weeks, Track R's roadmap gets its
  own 20k-ft session — the honest one about product-market fit, not features.
- Edge R&D token budget: background cadence only (free seats + one Sonnet verification pass per
  Hermes delivery) until a shadow track crosses its preregistered threshold. Fable touches edge
  work only at verdict moments.

---

*Everything above traces to ledger rows, committed documents, or the live truth surface — except
the funnel question, which is the one measurement this repo has never taken. That is the point.*
