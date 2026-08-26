# Forward Plan — 2026-08-26

**Author:** Fable seat, at founder request ("design a plan for us going forward"), written to be
executed by cheaper seats afterward. **Read with:** `docs/ops/edge/2026-08-26-edge-program-verification.md`
(the C-67 audit) and, once landed, `2026-08-26-hermes-second-wave-verification.md` (C-75, in flight).

---

## 1 · Ground truth (established, not assumed)

1. **No edge demonstrated on any real data, ever.** One thing genuinely disproven (MLB
   close-prediction on the 241-game corpus, pre-committed stop, HOLDS under adversarial audit);
   nearly everything else was **never tested** (C-67).
2. **Every falsifier verdict before today is void.** Four defects found and fixed in one day —
   inert shuffle/split (C-65), erased supM crossings, silent marketProb=0.5 (C-70), and the
   evidence-inversion overflow (C-74, found by Hermes, verified and tightened here). The
   instrument works now; it never did before.
3. **The market is efficient at the close** (Hermes: mean cover margin +0.07, shrinking absolute
   miss over decades — under second-wave recomputation now). Beating the closing number in
   historical ATS space has been tested repeatedly and dies every time. This is a *measurement*,
   not a mood: it defines where an edge cannot live.
4. **We finally have real market data in-file**: 6,967 games with closing lines, 5,065 with real
   juice (2006+). The DATABASE_URL blocker no longer gates falsifier R&D.
5. **The business does not require the edge.** GSE's product is the proof layer — honesty
   machinery, receipts, calibration transparency (C-43). Track R is unaffected by anything the
   edge program finds or fails to find. Do not let edge R&D block launch work, ever.

## 2 · The strategy the evidence forces

Stop spending on close-beating signals in historical game-level ATS/totals space. Three doors
remain live, in priority order:

- **DOOR A — Measurement first (cheap, compounding).** Prospective data must be trustworthy
  before any prospective claim can be. M-F7 close-age bound: DONE (C-68). Remaining: lock-price
  provenance at pick creation; C-20 price-space grading (schema migration = founder-gated);
  Murphy decomposition module. Every un-fixed day poisons future evidence.
- **DOOR B — Independent modelProb → props/derivative markets.** The books' pricing is laziest
  where liquidity is thinnest. The aggregation core is built (C-72); the ~40 binds and top-5
  unexploited props are structurally untestable until a modelProb flows. This is the only door
  that *creates* resolution rather than re-measuring the market (C-16 dossier's governing result).
- **DOOR C — Post-close / live-state information.** Key-number live e-process (W2 prereg, locked
  before the 2026 season), kickoff-time H2/H3 once sportsoddshistory data lands, exchange
  divergence once X4 gets real infra (C-71: needs persistence + callers, not just a cron line).

**Standing kill discipline:** every new test is pre-registered with its kill threshold *before*
data is seen, runs through the repaired four-gate falsifier with real marketProb, and a null at
low power is recorded as "could not see", never "not there".

## 3 · Seat economics (the usage-saving structure)

| Seat | Cost | Use for | Never for |
|---|---|---|---|
| **Hermes** (free OpenRouter) | $0 | Data acquisition, scans, harness builds, scrapes within clearance | Final verdicts on its own work (C-51 seat-swap rule) |
| **Claude Sonnet** | low | Second-wave verification, code that must be right, PR/ledger discipline | Open-ended wandering |
| **Fable** | high | Plan synthesis, verdict documents, hard statistical calls — switch ON for the moment, OFF after | Routine execution, monitoring, scans |
| **Founder hands** | scarce | DB queries, signups, env flips, merges to main | Anything an agent can verify from files |

Cross-model law stays: **whoever builds does not verify.** Hermes builds → Claude recomputes
(C-75 running now). Claude builds → Hermes or a fresh Claude session attacks it.

## 4 · The queue (ranked, information-per-effort)

**In flight:** C-75 second wave → replication scorecard + first honest falsifier campaign on real
data + the market's measured break-even. Everything below re-ranks when it lands.

**Founder (≈20 minutes total, highest information in the program):**
1. `docs/ops/hermes/hf7-archive/query.sql` — is NFL CLOSE still 0? (decides whether the forward
   archive exists at all — C-62)
2. `npx tsx scripts/edge-lab/run-shadow-falsifier.ts` with a real DATABASE_URL — the ShadowSignal
   readout (C-73; the fastest real independent-probability test the operation owns)
3. The Odds API signup → live multibook feed (Hermes queue item; enables CLV going forward)
4. Decide the falsify.ts merge: this branch's version supersedes Hermes's (C-74 verified theirs
   and went stricter) — merge PR #672 first, then hermes branch resolves on ours.

**Agent-executable next (no DB, in order):**
1. Land C-75 results doc + ledger DONE.
2. Lock-price provenance capture at pick creation (Door A, tests included).
3. `murphy_decompose` as a tested pure module (both Hermes's queue and ours rank it top).
4. Key-number 2026 live e-process runner: frozen rules from W2 prereg, fed by the live feed once
   the founder signs up — built dark, never self-armed.
5. Wire modelProb (C-72) into a shadow-only path for one prop family, synthetic-validated,
   prereg drafted UNSIGNED for founder signature (Door B).

**Explicitly not doing:** re-testing historical game-level ATS variants beyond the second wave
(the door the evidence closed); anything on the C-32 do-not-do list; X4 cron-only "fixes" (C-71).

## 5 · Decision gates (written before results, so they bind)

- **"An edge exists"** may be said only when: a pre-registered, prospective track on real prices
  crosses `1/alpha` on the repaired e-process with the frozen rules — never from a backtest,
  never retrospectively (C-41 precedent).
- **Edge R&D budget cap:** if the second wave plus the two founder DB actions produce zero live
  doors, edge work drops to background cadence (Hermes-only scans) and the operation's paid
  seats go 100% to Track R until the NFL season provides prospective data. The program has
  killed enough retrospective ground; the next real information arrives with live games.
- **A SURVIVOR from any first run is treated as suspect** until it replicates on a disjoint
  sample and survives the converter-vacuity check (the YACoe lesson, C-69).

*Every claim above traces to a ledger row or committed document; nothing here is aspiration
dressed as fact.*
