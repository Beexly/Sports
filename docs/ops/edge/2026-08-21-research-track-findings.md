# Research Track Findings — Math Validation + Six Lanes

**Source:** the master charter's Research track, executed 2026-08-21 as an 11-agent
fan-out (5 methodology validators at high reasoning effort + 5 domain lanes + synthesis).
The headline math bug (Anscombe inverse offset 3/8 -> 1/8) was independently re-derived by
hand before this was recorded: for Poisson(lambda), E[sqrt(X+3/8)]^2 - 3/8 ~= lambda - 1/4,
so the current back-transform underestimates each team's run rate by ~1/4 run. Confirmed.

---

# Decision Memo — Research Track Results (six lanes)

**To:** Fable / founder (build-phase decision) · **From:** Research lead · **Date:** 2026-08-21
**Bottom line:** The frozen MVE spec is testing a mis-calibrated model. Do **not** fire it until the Lane-B math is corrected.

---

## 1. HEADLINE — the MVE is armed on a model with three independent, confirmed math errors

Charter §0 frames Lane B as "the math is built; are the constants validated?" The answer is **no — the constants are not merely unvalidated, several are provably wrong**, and they are wired into the pre-registered MLB-totals MVE that §3 item 6 lists as *one-shot, irreversible, founder-gated*. Firing it now would prospectively certify a model that is already known to be broken. That is the worst outcome the e-process protocol can produce (a false certification), so it outranks the merge queue, the settlement backlog, and everything else in the build track.

Three errors, in order of consequence:

1. **The back-transform uses the wrong Anscombe inverse offset (3/8 instead of 1/8).** This is the single highest-value fix. `θ² − 3/8` underestimates each team's run rate by ~¼ run, ~0.5 run on the total. At a 8.5 line that moves P(Over) by **~5.3 percentage points — larger than the ~4.5% two-way vig.** That is a *real-money, fadeable UNDER lean a sharp can exploit*, not a rounding nit. The prereg flagged the Jensen/variance term (worth ~0.04pp, negligible) and **missed the dominant offset error entirely.**

2. **φ = 12 makes the NB2 tails far too thin.** Empirical MLB team-runs VMR is ~2.15–2.22 (Var ≈ 9.5–10 at μ≈4.5); φ=12 encodes only VMR 1.375. The method-of-moments φ that reproduces reality is **~3.7**, i.e. φ=12 is ~3.3× too large. Consequence: upper-tail probabilities understated 26–38% exactly where totals bets live → overconfident edges and mis-calibrated confidence scores.

3. **s²=0.04 / the D_i form under-shrink, and the charter's own premise is backwards.** The charter guessed s²=0.04 makes shrinkage "6× too aggressive." It is the opposite: smaller s² → smaller D_i → **B_i down → *less* shrinkage.** 0.04 is 6.25× *below* the Anscombe Poisson floor of 0.25 (a pooled variance mathematically **cannot** sit below it) and self-contradicts the model's own φ=12 over-dispersion. The correct D_i for this pipeline is the theoretical **1/(4n_i)** (ledger C-64), not the empirical s²/n_i that Amendment v2.2 (C-65) reintroduced.

Also note two premise corrections for the record: the "locked fixture at maxdiff 0" cited in §0 as validation **only proves formula wiring — it feeds s²=0.04 as a given and cannot validate it** (circular); and `efron-morris-js.ts` is an **orphan commit not on HEAD / not in the working tree** on the prereg branch, so the "verified, wired-in" module is currently unwired. The good news: all of this is still doc-level and pre-freeze, so it can be corrected cleanly *now* before the model hash is frozen. After the track opens, per prereg §7, these changes void the pre-registration.

---

## 2. Math verdicts — every Lane B constant

| Constant | Current value | Verdict | What to change | Conf. |
|---|---|---|---|---|
| Anscombe **inverse** offset | `θ² − 3/8` | **WRONG — exploitable** | Use `θ² − 1/8` (asymptotically unbiased inverse; Mäkitalo–Foi 2011). ~0.5 run / ~5.3pp P(Over) > vig. | High |
| Back-transform **structure** | average-then-square: `((θ_h+θ_a)/2)²` | **WRONG for a total** | Invert per team then sum: `(θ_h²−1/8)+(θ_a²−1/8)`. Kills between-team convexity gap `(¼)(θ_h−θ_a)²`. | Med |
| **φ** (NB2 dispersion) | `12` | **TOO HIGH ~3.3×** | Refit from settled data → **~3.7** (per-team); if line is game-total, refit vs game-total variance, don't inherit 12. | High |
| **D_i** form | `s²/n_i` (prereg §3 pt5) | **WRONG for this pipeline** | Adopt **`1/(4 n_i)`** per ledger C-64; the Anscombe transform was *chosen* to make sampling var the known 1/4. | High |
| **s²** `DEFAULT_POOLED_VARIANCE` | `0.04` | **MIS-SET CONSTANT** (not observed; 6.25× below Poisson floor) | Retire from D_i. Keep only as a diagnostic that must read ~0.25 (or ~0.34 NB2-consistent); if it ever reads 0.04 the input isn't Anscombe-transformed. | High |
| **MIN_GAMES_FOR_EMPIRICAL** | `8` | **TOO LOW** (s² from 8 obs has ~53% rel. SE) | Raise to O(50–100+); pre-threshold fallback = **0.25**, never 0.04. | High |
| Anscombe **forward** offset | `sqrt(x+3/8)` | **CORRECT** — keep | Var(√(X+3/8))≈0.25 confirmed by sim (0.249 @ Poisson 4.5). No change. | High |
| Jensen `Var(Θ)` back-transform correction | omitted | **Real but NEGLIGIBLE** | Bias is *exactly* `Var(Θ)` (~0.0005–0.0034 run → ~0.04pp). Do **not** ship as a standalone fix; fold in for free only if touching the back-transform anyway. | High |
| A_hat (method-of-moments) | formula OK | **CORRECT formula, artifact input** | Under correct s²=0.25 and n=4–20, honest A_hat = 0 (full shrinkage). Report A_hat beside s² so under-shrinkage is visible. | Med |
| Locked fixture (prereg §3 pt12) | X=[2.1,2.2,2.0,2.4], n=[4,20,4,8] | **Re-anchor** | Under 1/(4n_i): sum D=0.169 > spread 0.0875 → A_hat=0, all θ=2.175. Re-derive the worked example, or pick a spread that genuinely exceeds sampling noise. | High |

**Net:** one exploitable directional bug (inverse offset + structure), one calibration bug (φ), one under-shrinkage/spec-contradiction cluster (s²/D_i/8-game), one governance contradiction (C-64 vs C-65 — reconcile in favor of C-64), and one correctly-flagged-but-negligible term (Jensen). The forward transform is fine.

**Does one dispersion model generalize across sports?** No — it's **1 reusable shrinkage engine + ~4 distinct tail models.** Efron–Morris shrinkage transfers to all 5 sports (the real moat). Anscombe+NB2 transfers cleanly **only MLB→NHL** (recalibrate φ upward, handle empty-net/shootout). Soccer keeps Dixon–Coles (the existing module; don't route O/U through NB2). NBA = Gaussian. NFL = compound/drive model (multimodal on 3s and 7s). Do **not** market "one model, five sports" for the tail step — false for NBA/NFL.

---

## 3. The other five lanes

**A — Data & rights.** The vendor question that could end the data hunt: **yes, The Odds API paid historical endpoint covers 2022–2026 core h2h/spreads/totals for all five sports** (data from 2020-06-06; 5-min snapshots from Sep-2022). Caveats: **snapshot-only — no "closing" field**, so reconstruct close = nearest-before-commence_time (±5 min, label it honestly); **10× cost** (10 credits/region/market) → budget the **5M/$119-mo tier** for a one-off multi-sport backfill, cancel after. CC0 sources cover only soccer *results*: openfootball = EPL fixtures+scores (no odds); **drop martj42 for EPL** (national-team only). Register both new sources: Odds API historical = `approved_api`, openfootball = `approved_open_license`. **No free rights-clear closing-line source exists for any sport — the paid endpoint is the sole path.**

**C — Revisit.** `context-mode` (ELv2 — safe for internal use, no copyleft) is real but the 98% is cherry-picked; **pilot it behind the Read/Grep/Playwright-heavy repo-inspection subagents only**, not web-research lanes (our WebFetch already summarizes). OSINT tools all legit and slot into clearance: **archive.today is the best fit — snapshot each source's terms_url/robots_url at clearance time into the RightsSnapshot** (defensible proof-of-terms; the SBR $5k-ToS reversal is exactly why). WHOIS→pre-outreach contact resolution; OpenCorporates→vendor_candidate KYV; Wappalyzer→feeds `blocked_technical_controls` (classify defenses, never route around them). Free-tier swaps: **Upstash Redis (500k cmds/mo — watch BullMQ command burn) and Neon Postgres (0.5GB/branch, scale-to-zero) replace paid line items for dev/staging + pre-revenue prod**; Sentry free for errors. **Do NOT use Vercel Hobby for GSE** — its non-commercial clause makes a paid product a licensing risk; budget Pro. Prefer Resend (3k/mo) over SES trial framing.

**D — Market.** Competitors price **well above** us: Action Network PRO $29.99 / LABS $249; OddsJam ~$39→$500. Our Elite at $24.99 sits below competitors' *entry* tiers → the named ladder (PROVEN/ESTABLISHED/AUTHORITY) has real headroom. The legal "get their math" path is fully in reach off the existing Odds API feed: **de-vig (multiplicative baseline + Shin option, cite Shin 1993 EJ 103:1141) → CLV vs Pinnacle no-vig close.** Ship the public CLV ledger (already promised in Elite; it's also the ESTABLISHED milestone's ≥52.4% CLV proof). Zero new rights exposure — posted odds only.

**E — Growth.** Ordered, all ~$0 (assets exist): **(1)** wire the free 2-pick teaser to the live NFL Week 1 + EPL slate, put a single "Unlock confidence + full board — $14.99" CTA **on the blurred confidence cell** (nearest dollar). **(2)** programmatic SEO: one data-backed preview per fixture (~26/wk) via the numeric-guarded content-generator, CTA→/picks (cheapest compounding channel). **(3)** distribute the embeddable Edge Index widget into game threads (referral + backlinks). **(4)** sprint to PROVEN — **blocker is settled-pick accrual, not code**; turn on daily NFL+EPL generation+grading NOW, ~100 settled in 4–6 weeks, publish calibration the moment count≥100. **(5)** capture the pre-PROVEN audience via waitlist + weekly "graded-in-public" newsletter; convert with a founding-rate push the day calibration ships.

**F — Reliability.** Two dead, zero-signal monitors confirmed. **(1)** `external-watchdog.yml:63` fails unless scheduler status `== "ok"`, but the code only ever emits `"healthy"` → **alarm is permanently red, operators mute it, real scheduler death goes unnoticed**; fix to `!= "healthy"`. **(2)** `external-cron.yml:130` gates `refresh-odds` on a `*/30 * * * *` cron that **doesn't exist in on.schedule** → odds refresh can never fire on schedule; add the cron or fix the `if`. Plus `ci.yml:118` `build: needs: test` → a red test makes Build **skip (not fail)**, which branch protection treats as non-blocking → a broken build can merge; drop the gate or add an `if: always()` `ci-complete` aggregator as the sole required check. Lower severity: nova evidence-verify `exit 0` soft-pass (emit a neutral "NOT VERIFIED" signal) and neon `delete: needs: setup` (14-day expires_at backstop caps the leak). Add a CI lint asserting every `github.event.schedule ==` literal matches an on.schedule entry, and a regression test tying the watchdog's accepted string to the `SchedulerLivenessStatus` literal.

---

## 4. Open-loops register update (charter §4)

- **MVE constants (φ=12, s²=0.04, 8-game, Jensen, D_i)** — **RESOLVED (with corrections):** φ→~3.7, s²=0.04 retired (use 0.25/0.34), 8-game→50–100+, Jensen negligible, D_i→1/(4n_i). *Plus a new finding not in the loop:* the 3/8→1/8 inverse-offset bug is the real headline. All must be fixed pre-freeze.
- **2022–2026 closing lines — vendor question** — **RESOLVED:** yes, Odds API historical covers all five sports; snapshot-only, 10× cost, ~$119/mo backfill tier. No free source exists.
- **One dispersion model generalizes?** — **RESOLVED:** no. Shared shrinkage engine + 4 tail plugins (NB2 MLB/NHL, Dixon-Coles soccer, Gaussian NBA, compound NFL).
- **Neon prod vs experiment branch; pasted prod string** — **STILL-OPEN:** not a research item; the exposed prod connection string **should be rotated** (founder action, security).
- **Open-discovery sweep synthesis** — **STILL-OPEN:** was mid-flight; not folded in here — confirm nothing outstanding.
- **Multi-sport re-score memo (Overlay soccer model, prop-edge CLV schema)** — **PARTIAL:** Lane D covers the CLV/de-vig methodology and confirms Dixon-Coles for soccer; the Overlay code-pattern extraction (unlicensed → reimplement only) is not yet done.
- **context-mode trial** — **PARTIAL:** mechanism validated, ELv2 cleared; the actual before/after token measurement on a locked task is not yet run — pilot pending.

---

## 5. What Fable should do first (build order)

Math corrections slot **above** the merge queue because a mis-calibrated MVE fired is irreversible.

1. **Correct the frozen MVE spec before any freeze/fire.** In `efron-morris-js.ts` + prereg §3: (a) inverse offset `3/8 → 1/8`; (b) back-transform to per-team invert-then-sum; (c) `D_i = 1/(4 n_i)`, retire s²=0.04 from D_i (keep as ~0.25 diagnostic); (d) raise MIN_GAMES to 50–100+; (e) re-derive the locked fixture; (f) add a regression test asserting model VMR at μ=4.5 ∈ [2.0,2.3]. Add a ledger row recording C-65 reverted C-64 and that C-64 is authoritative. **Wire the orphan module onto HEAD.**
2. **Refit φ from settled MLB data (~3.7)** and re-freeze the model hash on the corrected spec. Only then is the MVE eligible to fire (§3 item 6 stays founder-gated).
3. **Rotate the exposed Neon prod connection string** (security, independent of everything).
4. **Merge #442** (green main), rebase+merge #441, ESPN `limit=` fix, settlement backfill T11, T12 — the existing build-track order, now unblocked and *downstream* of the math fix.
5. **Fix the two dead monitors** (watchdog `"healthy"`, refresh-odds cron) + the `needs: test` skip gate, with the CI-lint and regression tests so they can't drift again.
6. **Flip on daily NFL+EPL generation + grading now** (Move 4) so PROVEN accrual starts at kickoff; wire the teaser→confidence-lock CTA (Move 1) and begin fixture-preview SEO (Move 2).
7. **Register the two new data sources** (Odds API historical `approved_api`, openfootball `approved_open_license`); wire archive.today proof-of-terms into RightsSnapshot; budget the $119/mo backfill tier when ready.

The edge is real and mostly built — but the MVE would currently prove the *wrong* model, and one bug is a fadeable UNDER lean larger than the vig. Fix the math, then fire.
