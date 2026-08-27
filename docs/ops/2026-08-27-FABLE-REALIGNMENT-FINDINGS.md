# Fable realignment findings — 2026-08-27 (overnight)

**What this is:** the founder asked for (1) the remaining corpus-queue items worked
through with reasoning instead of accepted excuses, (2) a scan of the imported
workspace-dump material for anything missed, (3) an adversarial audit of every
"put aside / couldn't / blocked" reason in the ops docs, (4) an overnight Hermes
research workload, and (5) a 20,000-ft review. This doc is deliverables 2, 3 and
the evidence base; the Hermes prompt is `docs/agent-prompts/HERMES-OVERNIGHT-2026-08-27.md`;
the 20k review is §5 below. Produced by an 8-agent parallel recon over the repo,
the hermes branch, and the PR #675 review threads, followed by same-night
implementation. Every claim below was verified against files/refs, not memory.

---

## 1. Shipped tonight (the queue items that were "blocked" and weren't)

| Item | Was stated as | Actually was | Shipped |
|---|---|---|---|
| Hermes-branch assets | "hermes-branch-only" (18 files) | One `git checkout` away; all tests pass against main's framework | ✅ falsify.ts (+test), nflverse-pfr-def.ts (+test), props-hb-pd model+bind (+tests), kickoff-return-yards model+bind (+tests), MODELPROB_DESIGN.md, EDGE_LEDGER.md (+R05), EDGE_RESEARCH_NEXT_5.md, INVENTORY.md, EDGE-HUNT-LAUNCH.md, covariate-bus defense/H2 extension |
| Ledger row 10 (GMM coverage clustering) | "QUEUED — participation/NGS aggregates" | The MATH needs no data; only the feature plumbing does | ✅ `edge-lab/kernel/gmm-em.ts` — diagonal-covariance EM, seeded k-means++, log-space, LOWO-ARI K-selection with a TYPED "unstable" kill, featureInfluence, exact ARI in stats.ts, and the polarity gate that keeps clusters ANONYMOUS until a pre-registered semantic validation passes (the CodeRabbit finding, encoded in the type). 25 tests |
| Ledger row 9 (CPAE GAM surface) | "QUEUED — nflverse aggregates only" | Same: pure core implementable tonight | ✅ `expected-metrics/cpae-surface.ts` + `cpae-aggregate.ts` — natural-cubic depth basis × 3 locations (33 features), §3.2 shrinkage cell-exact, discrete Eq. 1 at QB and DEFENSE grain, distributional companions; as-of discipline structural + leakage mutation test; QB-only ρ gate carried in the contract. 23 tests |
| Ledger row 14 (fail-closed LLM judge) | "QUEUED" (no reason recorded) | Full spec existed in the batch1 extraction | ✅ `content-engine/judge-gate.ts` — deterministic harness: strict verdict parse (16-case reject table), refId cross-reference vs the draft's real id inventory, severity veto, bounded-retry reducer with exact accounting, additive-only BY TYPE (no representable "unblock"). 31 tests. Prompt/transport/wiring stay founder-gated |
| Ledger row 12 (eval lane) + row 13 (audit ordering) | "QUEUED" (no reason recorded) | Verified genuinely unstarted — no technical block, only unspent time | ⏳ **Correction to an earlier draft of this doc**: I initially wrote these as shipped tonight. That was wrong — I checked just now and neither `scripts/agent-eval/qa/` nor the audit-secrets/audit-stripe reorder exists on disk. They remain QUEUED, same as the ledger states. No excuse recorded because there isn't one; first in line for tomorrow's coding session |

Still honestly gated after tonight (with the REAL gate named):
- CPAE/GMM **real-data fits** — need nflverse pbp/NGS rows plumbed (ordinary data
  work, no rights issue; queued for Hermes/tomorrow). The props-hb-cpae-def bind
  is the next mechanical increment after a real surface exists.
- Defense-side `cpaeAllowed` **admission** — needs its own validation target
  (no vendor ground truth exists); QB-side ρ ≥ 0.75 gate is defined.
- Judge-gate **prompt + wiring** — founder-gated by design (production content paths).
- Tracking-data items (row 19) — genuine rights gate; Hermes gets the vendor-
  landscape dossier task instead.

## 2. Deferred-reasons audit — the adversarial pass

Full detail per item lives in the recon record; the findings that matter, ranked:

**Rank 1 — merge PR #675.** The settlement identity fix (commit 5fce90345) is NOT
on origin/main (bb0e7dfc0). Every "82 overdue picks drain on the next cron"
claim, settlement-health GREEN, calibration-eligibility leg 1, and PROVEN wait
on this single merge+deploy. It also carries every corpus module shipped this
session. Founder action: merge + deploy; bundle `prisma migrate deploy`
(founder path #3) and the orphan-Neon-project deletion (#6) into the same session.

**Rank 2 — LINE_ARCHIVE flags dark since ~Aug 22 16:31Z.** `LINE_ARCHIVE_ENABLED`
+ `LINE_ARCHIVE_EU_PINNACLE` were dropped in the redeploy; ~5 days of CLV
denominator are gone unrecoverably, and the SONNET-PLAN Phase-2/3 deferral
bucket's revisit trigger is silently broken because the "Phase-2 clock" never
restarted. Founder action: one Vercel env visit. Agent follow-up: a startup
env-flag assertion so a redeploy can never silently drop it again (failure mode
now proven). **The "CLV sharp-anchor decision" founder ask is pre-solved:**
pinnacle-line-archive.ts already implements the Pinnacle-close leg via the
existing Odds API EU contract, and Kalshi is registry-disqualified (Developer
Agreement §3/§3.1). The decision reduces to flipping the flag.

**Rank 3 — PROVEN's Brier floor is partly self-imposed.** ECE leg already passes
(PAVA 0.0371 ≤ 0.05, staged for C6 apply). The Brier ≤ 0.22 floor is evaluated
POOLED across MONEYLINE (honest: 0.632 vs 0.640) and SPREAD/TOTAL (tout-grade),
and `segmented-murphy.ts` already implements integrity-guarded segmented
publication. CLAUDE.md's ladder requires "≥100 settled + published calibration"
— nothing requires publishing the noise lanes. Founder decision to tee up: an
ML-only honest calibration publication (memo-ready; E1 already orders killing
raw SPREAD/TOTAL confidence from surfaces).

**Rank 4 — K11 Dirichlet-multinomial is pure inertia.** Contract + digamma
primitive exist on main; no implementation. ~1 day of pure math unblocks the
H0.5 rz-share bind. Queued as tomorrow's first kernel task.

**Rank 5 — four shipped calibration modules have zero live callers**
(FL-GUARD, stability-plasticity, phase-bucketed ECE, hierarchical shrinkage).
None of the stated reasons is a gate — each is a ≤1-day wiring PR on data the
repo already holds, and the re-fit cadence that needs them arrives with NFL
kickoff (Sept 9). Same class: content-guard shadow mode (run `auditNumerals` +
`dischargeRelationClaims` log-only in readiness.ts), the soccer cards/bookings
archive (its own spec said "start the archive now" and nothing was started),
the paired-bootstrap upgrade to teacher-eval (pure code on the existing export).

**Rank 6 — founder gates that are real but under-served** (the ask was never
reduced to a one-look artifact): F-10 MVE amendment (draft the complete
amended pre-registration + power curves as a ready-to-sign package), F-9 Glass
Ledger schema review (one-page schema-diff memo), PR #463 .github one-liners
(the external alarm rail is dead until applied), free-tier factor-trail tease
(the never-proposed middle option: factor NAMES free, weights Pro), Stripe
LIVE-mode confirmation + one real checkout (the revenue-critical path; every
prep task is agent-stageable).

**Holds verified sound (no action):** the §3b power-verified negatives
(L-15/L-16/L-17/C-16), the 13 wave-5 collision ignores, DEFER_90_DAYS doctrine,
founder-YES flip roster, tracking-rights gate, in-play-odds gate. One caveat
recorded: any NEW admitted covariate should trigger a scheduled re-look at
L-17-style CLV prediction (the ledger's own re-open condition).

## 3. Workspace-dump gap scan (what was missed, honestly)

I cannot reach `C:\Garrett` from this cloud container — this scan covers
everything imported into the repo plus every in-repo REFERENCE to
local-machine-only material.

**Fully processed:** the dump branch's nine root docs (byte-identical in
`docs/ops/archive/root-museum/`), decision-log/handoff histories, the ~20
"superseded — do not re-mine" items.

**Present in repo but never processed (next cloud agent's queue):**
1. The extraction doc's §1.1–1.11 "still-actionable gold" — daily digest,
   dunning + winback emails, per-entity OG proof cards, free-tier tease,
   activation events, web-quality punch list — ALL verified still unbuilt,
   with kickoff Sept 9 as the clock. This is the retention layer.
2. `handoff/codex/` — the CODEX_* session archives exist ON MAIN and were
   skipped by the extraction brief; never triaged (e.g.
   `agent-os-runtime/NEXT_BEST_BUILDS.md`, `KNOWN_WEAKNESSES.md`).
3. The statking lane (`lib/statking/` 68 modules incl. 36 vendor adapters,
   `data/source-atlas/` incl. the source-contact CRM and terms-review queue)
   — wired into admin pages but June-13-frozen; freshness audit + the
   source-atlas contact/terms queues feed the rights process directly.
4. §4 contradictions #1 (factor-trail) and #6 (CLAUDE.md's dangling pricing-doc
   pointer) are still absent from `docs/DECISIONS_TO_RATIFY.md`.
5. One shallow fetch of `origin/garrett/resource-dump-2026-06-15` + name-diff
   vs main would prove whether anything beyond the verified root docs is
   branch-only (the only never-read dump category).

**Pull-list for a LOCAL agent on the founder's machine (priority order):**
- **P1** `C:\Users\Garrett\academy-corpus\` — pull ONLY the ~14 standing-consult
  files named in SONNET-MAX-LEVERAGE-PROMPT §9 (do not bulk-import; the
  playbook forbids it).
- **P2** `C:\Users\Garrett\AppData\Local\hermes\HANDOFF_LAGUNA.md` + `config.yaml`
  — the local Hermes runner's brain; pairs with the GROK A2 stale-ledger fix.
- **P3** the local gse-data-scout checkout's `CLUBELO-LARS-EMAIL-DRAFT.md`
  (owner-gated ClubElo permission email — blocks a live confidence input).
- **P4** verify `C:\Users\Garrett\Sports-canonical-2026-06-03` has no unpushed
  commits on `claude/edge-map-rebuild-2026-06-04` (@8e74089).
- **DO NOT PULL:** `VERCEL_ENV.txt`, `.launch-secrets\secrets.env` (secrets),
  Downloads "Sports Intelligence OS" docs (banned by SPRINT_BOOT rule 7).
- **Already resolved — skip:** hermes/w2-audit-settlement push (on origin).
- **Local ACTIONS (not pulls):** GROK A2 (hermes-runner.ps1 fix+launch),
  A3 (db integration smoke via local docker), A4 (api.clubelo.com probe +
  Lars email), A5 (Playwright journey suite).

## 4. The modelProb thread (why the salvage matters most)

`docs/edge/MODELPROB_DESIGN.md` (salvaged tonight) is the written exit from
C-28 — the audit finding that today's celebrated calibration re-measures the
MARKET (p = confidence/100, which is derived from line movement/consensus).
The design: market-free player signals (YACoe, TPR) → per-signal z-score vs a
rolling league baseline → n/(n+τ) shrinkage with pre-registered τ → snap-weighted
offense aggregation → mint `modelProb` only above a pre-registered minimum n
(else null — honest absence). It unblocks C-21 (grouping-loss go/no-go), then
C-22/C-26. Cost per its own next-actions: two signal producers + one pure
aggregator + a signed pre-registration — days, not a rebuild. The falsifier and
PFR-def parser salvaged alongside it are respectively the verdict harness and
the data source the next edge wave (EDGE_RESEARCH_NEXT_5) cites. **This is the
program's critical path and it now lives on main.**

## 5. 20,000-ft review — what we're forgetting, missing, underleveraging

1. **The scarcest asset is settled samples, and we under-accumulate them.**
   Every methods module shipped this month is throttled by n (teacher eval
   "inconclusive at current n", PROVEN at n=791, R62's n≥500 bar). Yet we settle
   only what we pick. The system should settle-and-archive EVERY game in the 7
   ingested sports (scores already flow), archive closing lines for all of them
   (flag, Rank 2), and archive soccer cards for the ingame fit. Data compounds;
   code can be written any day. Hermes' overnight charter reflects this.
2. **modelProb is the one true bottleneck and it kept slipping** because it
   lived on an unfetched branch. Now on main with a days-scale plan (§4).
   Nothing else in the edge program pays off until an independent p exists —
   prioritize it above further covariate breadth.
3. **We keep building instruments and not wiring them** (Rank 5). The pattern
   "pure core now, wiring later" is right for risk but wrong forever; the batch
   of shadow-mode wirings should ride the next re-fit cadence, or the corpus
   work quietly becomes a museum.
4. **The revenue path has quietly aged**: Stripe LIVE unconfirmed, retention
   layer (digest/dunning/winback/OG cards) unbuilt, founding-member window
   burning down to kickoff. The edge program is the moat, but the June dump's
   §1 list is the store, and it is 13 days from the season with zero of eleven
   items landed.
5. **Founder-gate hygiene**: every stalled founder decision should arrive as a
   one-look artifact (signed-ready F-10, schema-diff memo for F-9, anchor memo
   for CLV, ML-only publication memo). Tonight's docs start that; the pattern
   should be standing.
6. **Second-look discipline works** — FL-GUARD and No-Forgetting were rescued
   from "ignore" and are now shipped code. Keep the register live; the wave-5
   ignores were re-verified with citable disqualifiers and should not be
   re-litigated without new input.
7. **Underleveraged existing assets**: HistoricalGame (settled closing lines
   since 1999) is a backtest corpus most methods modules haven't touched;
   officials data (2015+) and open-meteo weather are ingested-or-cleared but
   unmodeled; the Odds API's `/v4/historical` snapshots (paid, already
   contracted) could retro-fill CLV gaps the flag outage created.

---

*Recon: 8 parallel agents, 2026-08-27 ~02:30–02:50 UTC; implementation same
night. See git log for the shipped commits; the Hermes overnight prompt is
`docs/agent-prompts/HERMES-OVERNIGHT-2026-08-27.md`.*
