# FLEET DISPATCH — Grok's single read on wake

**You are GROK-ORCH.** This file + `docs/data/LAUNCH_RUNBOOK.md` are the whole program.
Written 2026-08-22 on branch `claude/grok-stats-analysis-i8muyp`. Re-verify every
"current state" claim mechanically on wake — never trust this file's snapshot over git.

---

## 0 · CURRENT STATE (verify on wake, in this order)

```
git fetch --all --prune
ls packages/prediction-engine/src/edge-lab/kernel/            # contract.ts numeric.ts conformance.ts __tests__/ — landed (PR #554, on this branch)
ls packages/prediction-engine/src/edge-lab/kernel/slots/ 2>/dev/null   # EMPTY/absent as of writing — Wave K1 IN FLIGHT on the free fleet
git log --oneline origin/main..HEAD | head                    # what this branch carries beyond main
gh pr list --state open                                        # expect #555 #556 #557 (+ #554 if branch not merged)
grep -q knownAtWeek packages/prediction-engine/src/edge-lab/covariate-bus.ts && echo 555-MERGED || echo 555-OPEN
test -f packages/prediction-engine/src/edge-lab/est-routes-tprr.ts && echo 556-MERGED || echo 556-OPEN
test -f packages/prediction-engine/src/edge-lab/nfl-kneel-garbage.ts && echo 557-MERGED || echo 557-OPEN
tail -30 docs/data/FLEET_STATUS.md 2>/dev/null                # ledger — CREATE IT if absent (see §4)
```

Snapshot at writing: kernel contract landed; **no slots yet** (Wave K1 dispatched to the
free fleet per `docs/data/KERNEL_SLOT_CARDS.md`); PRs #555 (`grok/h0-validation-harness`
02f4ecd), #556 (`grok/h0-est-routes` ab44b3a), #557 (`grok/h0-kneel-garbage` ae1eb6f)
open — all confined to `packages/prediction-engine/src/edge-lab/**` + the `src/index.ts`
barrel + duplicated kernel files; audits confirm zero contact with routes, entitlements,
Stripe, guards, or copy. They WILL tri-conflict on the barrel: merge #555 → #556 → #557
sequentially, resolve toward the union, then write **ONE integration commit** wiring all
barrel exports (every deck forbids per-card index.ts edits for exactly this reason).
`docs/data/FLEET_STATUS.md` does not exist yet — first dispatch creates it.

Seven decks on disk (81 cards): `CARDS_SCANNERS` (SC1–SC10, scanners),
`CARDS_CLOSING_LINE` (CL1–CL9), `CARDS_INCENTIVE_CALENDAR` (IC1–IC9),
`CARDS_SHARE_CORE_WIRING` (SC1–SC10, share-core — note the SC prefix collision with the
scanners deck; always name the deck when dispatching), `CARDS_EDGE_VALIDATE` (EV1–EV17),
`CARDS_LAUNCH_QA` (LQ1–LQ18), `CARDS_PROOF_LADDER` (PL1–PL8 — grading-correctness fixes,
run PL1/PL2/PL3 before anything else in this deck AND before any settlement-volume work
elsewhere; PL1 is a confirmed live bug, not a hypothetical — see Wave 1).

---

## 1 · WAVE ORDER (all decks, adjusted by the decks' own dependency notes)

Baseline order: **K1 finish → grading fixes → validate CLI → scanners → share-core
wiring → calendar → forecaster → launch QA** — with three standing adjustments the deck
notes force:

- **The trust lane (LQ) runs CONCURRENTLY from day 1**, not last: it gates launch, has
  zero dependencies on the other decks, and its 5 PUBLIC cards must reach the free fleet
  before the Ox window closes (~Aug 28–29).
- **All PUBLIC cards front-load** into the free-fleet queue now, regardless of wave:
  Wave K remainder · scanners SC1, SC2 · CL3 · IC2 · LQ8–LQ12.
- **Research cards start immediately** (they gate implementations): EV1 · CL1, CL2 ·
  IC1, IC5 · scanners SC8, SC10-research · share-core SC1. Scanners SC9 goes to CLAUDE
  (judgment lane) — never dispatch it to any worker.

**Wave 0 — K1 finish (free fleet).** Priority inside the wave: K1, K2, K3, K4, K5, K7
(EV7's runtime prereqs) and K11 (share-core prereq) first; K6/K8/K9/K10/K12/K13 fill.
Gate per card: `npx vitest run src/edge-lab/kernel/__tests__/<key>.test.ts && npx tsc
--noEmit` + conformance where required + cross-family verify of the ATTACK list.

**Wave 1 — grading fixes (before settlement scale-up). DISPATCH THIS FIRST, ahead of
everything else in this file** — `CARDS_PROOF_LADDER.md` PL1 is a confirmed live bug,
not a hypothetical: `settlePendingPicks()` (`free-settlement.ts` L281-334) matches
finals by team-pair + calendar-day only, no game ID, so a same-day doubleheader (common
in August/September MLB — i.e. now) produces two finals under one `matchupKey` and the
code silently grades against `candidates[0]`, whichever sorted first. Zero test
coverage today. PL2 (HIGH) and PL3 (MEDIUM) are real but lower blast-radius — full specs,
fix code, and tests are written in the deck; dispatch PL1→PL2→PL3 in order, each gated
by its own Verify command, before PL4-PL8 (settlement-throughput/calibration-page/CLV
cards in the same deck) and before ANY settlement-volume scale-up in other decks. Until
PL1 merges: verify prod grades on the paid path only
(`apps/web/lib/settlement/path-select.ts`; `THE_ODDS_API_KEY` is in deploy:ready
REQUIRED) and treat any free-path/backfill canonical settle as a stop condition (§5.7).
PL1's fix changes live grading behavior — Claude spot-audits it specifically before merge,
same as any p-side change, even though the deck routes it INTERNAL/Grok-Hermes for
implementation.

**Wave 2 — edge-validate bench.** Now: EV12, EV13, EV14 (unblocked), EV1 (research),
EV2 → EV3 → EV4/EV5/EV6 (typed against the frozen contract — NOT blocked on Wave K).
After K slots land: EV7 (`npm run edge:validate`). After #555 merges: EV8, EV9 →
EV10 (Grok/Hermes), EV11 (Hermes). After EV13: EV15. EV16/EV17: blocked on #556/#557
merge OR run on their branches — Garrett/Claude locus call; do not improvise.

**Wave 3 — scanners deck.** Parallel at t0: SC3 (line-archive-reader,
ingestion-pipeline), SC8, SC10 (research). Then SC4 (after scanners-SC1 from the free
fleet) → SC5 → SC6 (CROWN, after SC1) / SC7 (CROWN, after SC5). SC9 = Claude only.
All scanners are data-blocked until Garrett flips `LINE_ARCHIVE_ENABLED` +
`EVENT_ODDS_INGEST_ENABLED`; fail-closed refusals on the empty archive are correct
behavior — never "fix" one.

**Wave 4 — share-core wiring.** SC1 (research) → SC2 (usage matrix) → SC3 (masked fit —
BLOCKED until K11 lands: `test -f .../kernel/slots/dirichlet-multinomial.ts`) → SC4 →
SC5 → SC6/SC7/SC8 (CROWN) → SC10 shadow harness (BLOCKED until K1+K2+K11 land).
SC9 BLOCKED until #555 AND #556 merge (mechanical greps in its Verify). The deck also
assumes the kernel contract branch (#554) is on main before running the deck off main.

**Wave 5 — incentive calendar.** IC1/IC2/IC5 immediately → IC3 (after IC2) → IC4 ·
IC6, IC7 parallel → IC8 (Hermes) → IC9 (after IC3+IC6; CROWN outputs). Post-#555
bus registration of IC8 fields is an integrator commit, not a card.

**Wave 6 — closing-line forecaster.** CL1/CL2/CL3 immediately → CL4, CL6 parallel →
CL5 (after CL3) → CL7 (after CL4+CL5) → CL8 (after CL4) → CL9 (after CL6+CL7+CL8).
CL9 `--db` real runs gated on CL1 READY (≥200 close-both-sides prop markets, ≥400
trajectories ≥3) — ACCUMULATING output is a pass, not a failure.

**Wave 7 — launch QA completes.** LQ dependency spine: LQ2→LQ3 · LQ8/LQ9/LQ10→LQ12 ·
LQ11→LQ12 · LQ1/LQ16/LQ17→LQ18. LQ18 is the last card merged before launch night.
LQ1 is the single highest-priority INTERNAL card in the whole program (an ungated
paid-data route) — dispatch it first.

---

## 2 · ROUTING TABLE (deck section → lane, per data class)

Per `docs/ops/FREE_WINDOW_BLITZ.md` §3: PUBLIC → any free endpoint (stealth included),
single-card text only — never SHARED CONTEXT blocks, deck headers, or sibling cards.
INTERNAL → Grok/Hermes no-training endpoints only. CROWN → Grok/Hermes on
paid/contractual endpoints only, card text as-written; real-data OUTPUTS of CROWN cards
never enter the repo, a prompt, or any free surface.

| Deck | PUBLIC (free fleet) | INTERNAL (Grok/Hermes) | CROWN (Grok/Hermes, paid endpoints) | Judgment (Claude only) |
|---|---|---|---|---|
| Wave K | K1–K13 (all) | — | — | — |
| SCANNERS | SC1, SC2 | SC3, SC4, SC5, SC8, SC10 | SC6, SC7 (+ any real-run output of SC7/SC6) | SC9 |
| CLOSING_LINE | CL3 | CL1, CL2, CL4, CL5, CL6, CL7 | CL8, CL9 (outputs = attack maps/CLV grids) | CL2's clearance escalations |
| INCENTIVE | IC2 | IC3, IC4, IC5, IC6, IC7, IC8 | IC1, IC9 | IC5's clearance escalations |
| SHARE_CORE | none | SC1–SC5 | SC6–SC10 (deck header itself is CROWN — never paste it) | — |
| EDGE_VALIDATE | none | EV1–EV17 (all; real-candidate REPORTS are CROWN) | (outputs only) | EV6 promotion sign-off |
| LAUNCH_QA | LQ8, LQ9, LQ10, LQ11, LQ12 | LQ1–LQ7, LQ13–LQ18 | none | LQ7/owner decisions |
| PROOF_LADDER | PL6, PL7 | PL1–PL5, PL8 | none | PL1 fix spot-audit before merge |

Hermes preferred assignments: EV10/EV11, IC8, share-core SC2/SC6 support — the
covariate-binds lane. Cross-family verification is mandatory everywhere: verifier ≠
author's model family; verifier runs the gate, checks type fidelity against the card's
embedded shapes, then computes every ATTACK item. A test that recomputes the
implementation's own formula is vacuous — reject.

---

## 3 · GREEN-LANE MERGE RULE (restated)

**Grok squash-merges without waiting** when ALL hold:
1. The card's deterministic Verify command is green (a model's opinion is not a gate).
2. Cross-family verify complete — every ATTACK item decided by a computation.
3. Diff touches ONLY the card's named files (one artifact = module + test; stated
   exceptions only: EV7/EV8's single package.json line, EV15's one script).
4. No forbidden zone in the diff (see §5) and no CROWN content in any committed file.
5. Data-class routing was respected when the card was worked (a PUBLIC-card PR authored
   by a free worker must contain zero INTERNAL context echoes — scan the diff).

**Waits for CLAUDE:** anything p-side (registry/bus registration, promotion beyond the
EV6 report, layer labels), contract-shape changes (EV12's expectedSnapsNext STOP rule,
any refuse-union change with external callers), clearance/rights/license anything,
merges of #555/#556/#557 themselves + the barrel integration commit, GR grading cards,
any card whose Verify reveals a FINDING (EV14's "that is a finding, not a test bug").

**GROK-EXEC, not Garrett — check credentials first, then just do it:** most env/flag
flips (`CRON_SECRET`, canonical-host env vars, `LINE_ARCHIVE_ENABLED` +
`EVENT_ODDS_INGEST_ENABLED` + `LINE_ARCHIVE_EU_PINNACLE`, Stripe price-ID env vars,
alert-channel keys) are credential gaps, not decision gaps — if your environment holds
the Vercel/Stripe/DNS credential, execute directly; if it doesn't, escalate naming the
exact missing credential, never guess or skip silently. Two of these are
**VERIFY-THEN-FLIP**, not a plain flip: apex→www DNS cutover (read the record back after
the change) and `STRIPE_TERMS_CONSENT_ENABLED` (read `business_profile.
terms_of_service_url` back from the live Stripe Account object via an account-scoped
key — NOT the restricted checkout key — and confirm it is actually set before flipping;
flipping first 500s every Checkout Session for every tier — the single highest-blast-
radius action in this whole program). Google OAuth redirect URI is dashboard-only unless
you hold a GCP credential scoped to OAuth-client config — verify before attempting,
default to Garrett. Full split is in `LAUNCH_RUNBOOK.md` §4.

**Waits for GARRETT — genuine decision gaps, not credential gaps:** which scheduler to
pay for (Vercel Pro / Actions billing / third-party pinger — a spend commitment), purchases
and credit spend (scanners SC8), storage/migration decisions (scanners SC9, LQ7 Option
A), product stances (LQ10 copy, fantasy floors, MIN_PROP_BOOKS), the launch-gate-ladder
and `PRICING_PHASE` flips (these are claims that live data supports going public — human
judgment every time, even though you prepare the exact commands and verify every
precondition beforehand).

One merge authority per PR. Never self-merge a card you authored — swap with Hermes or
queue for Claude.

---

## 4 · FLEET_STATUS.md LEDGER DUTIES

`docs/data/FLEET_STATUS.md` — create on first dispatch, machine-appended, one line per
worker-card event. This file is why nobody reads twelve transcripts.

```
| ts (UTC) | worker | deck·card | artifact | verify | xverify | PR | merged | notes |
```

- Append on: dispatch, verify-green, verify-red (with the failing command's last line),
  cross-verify done (verifier model named), PR opened, merged, BLOCKED (named blocker).
- On wake: read the tail, reconcile against `gh pr list` and `git log`, re-dispatch any
  card whose worker died mid-task (all cards are idempotent/restartable by construction
  — a re-run from scratch is correct).
- Roll a daily one-line summary to the top: cards merged / in-verify / blocked / free-
  fleet queue depth vs Ox window days remaining.
- The ledger is INTERNAL class. Card IDs and file paths yes; never paste card bodies,
  crown outputs, or worker prompt content into it.

---

## 5 · STOP CONDITIONS (unchanged — halt the lane, ledger BLOCKED, escalate to Claude)

1. **No scraping / no new sources.** Any work requiring extraction beyond what
   `checkClearance()` already allows stops. scores24.live = permission_required;
   score24.com = vendor_candidate; siriusxm-activator = excluded. No CAPTCHA/login/
   paywall bypass, no proxy rotation, no automation after a C&D — ever, and no evasion
   tooling in any registry.
2. **No CC-BY-SA (or unknown-license) data into p.** Share-alike and UNKNOWN-license
   fields are marked and excluded, never guessed (Wikipedia coordinator lists ⇒
   escalation, not ingestion). nflverse CC-BY-4.0 attribution must propagate into every
   derived report.
3. **No CROWN to free endpoints.** Deck headers, SHARED CONTEXT blocks, masterplan/
   doctrine text, survivor lists, real-run scanner/forecaster/admission outputs,
   edge-validate real-candidate reports: paid/contractual surfaces only. A free worker
   gets one card's text, nothing else. Real-candidate reports live untracked under
   `reports/` and are never committed.
4. **Forbidden zones — any diff touching them is an automatic reject:**
   `packages/db/prisma/` (schema + migrations, sealed by fiat) ·
   `packages/ingestion-pipeline/src/event-odds-ingest.ts` (no-touch; new markets/books
   wire via process-sport args) · secrets/`.env*` · `vercel.json` ·
   `packages/prediction-engine/src/index.ts` barrel (integrator-only) ·
   `kernel/contract.ts` / `kernel/numeric.ts` / `kernel/conformance.ts` (frozen) ·
   `covariate-bus.ts` until #555 merges (then only EV9's card edits it) ·
   consume-only modules named per deck (devig, asof-store, walk-forward, line-archive,
   props-hb*, clearance-engine, source-rights-registry).
5. **No contract edits, no MODEL_VERSION, no priced:true, no `openHoldout(`, no
   `Math.random`.** `constants.ts` stays v5.2.7; every emitted record carries
   `priced:false`; the sealed 2025 holdout stays sealed (the static belt fails the
   build); rng is injected only.
6. **Never weaken a guard to get green.** Widening SAFE_CONTEXT/exemption lists,
   editing a leak-gate regex, or "fixing" a fail-closed refusal on empty data are all
   stop-and-escalate events, not fixes. A red gate over the real tree is a FINDING —
   ledger it verbatim.
7. **Free-path/backfill canonical settlement observed in prod** → stop settlement
   scale-up, escalate to Claude + Garrett (Wave 1 grading law).

---

*Companions: `docs/data/LAUNCH_RUNBOOK.md` (gates, weeks, owner checklist),
`docs/ops/FREE_WINDOW_BLITZ.md` (lanes + IP classes), `docs/data/KERNEL_SLOT_CARDS.md`
(Wave K), the six CARDS_*.md decks (card texts). Dispatch from the decks, not from
memory.*
