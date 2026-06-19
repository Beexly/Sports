# The Proof Moat + Accuracy-Presentation Playbook

Synthesis of a deep research fleet (competitor teardowns + how credible forecasters present
accuracy). This is the strategic spine for Phases 2–3. Sources are cited in the per-topic
research notes; everything below was cross-verified across ≥2 independent sources.

---

## 1. The one finding that decides positioning

**No real competitor publishes a verified, calibrated, auditable track record of its OWN
predictions.** This is the open lane — and it's exactly GSE's thesis.

| Competitor | What they show | The gap GSE exploits |
|---|---|---|
| **Props.Cash** ($19.99/mo) | Backward-looking prop hit-rates, color-coded vs the line. "Not a handicapping service." A "recalibrated confidence score" claim with **no public calibration data**. | Shows *what happened*; never proves its own signals win. |
| **Outlier.bet** ($19.99–$129.99/mo) | Hit-rates, bet-slip integration, "AI smart projections" win-probabilities — **no published calibration/CLV/ROI**. "Isn't a pick service." | Win-probabilities with zero calibration evidence. |
| **Unabated** ($99–$199/mo + add-ons) | Sells *tools* (the no-vig "Unabated Line"), not picks. Fronts **unverified** "96% of members become winners / $50k–120k earned" marketing. | Preaches process-over-results while headlining unverified results. |
| **Pikkit** (free / $39.99 Pro) | Auto-syncs **users'** bets → verified personal records + CLV. Anti-tout by design. | Verifies *your* bets, not *its own* picks; CLV methodology opaque (no Pinnacle de-vig). |

**The wedge line (founder voice):** *"Everyone shows you what happened. We prove whether
following us wins — calibrated, against the close, in public, win or lose."* That is a claim
none of them can copy without exposing their own record.

**Honest caveat that makes it stronger:** the proof only counts once the sample is real.
Lead with the *commitment* and the *method* now; let the numbers fill in as picks settle
(the existing gated-state posture).

**Why the wedge lands (the tout problem):** the "guaranteed lock" pick-seller model is
*structurally* distrusted — the seller wins the moment you pay (incentives are decoupled from
your result), advertised 70–90% win rates are mathematically impossible (real edges cap
~55–60% vs −110), and the record is trivially fakeable (double-siding both sides to different
buyers, deleting losers, series-counting, Photoshopped tickets). There's almost no regulation
(DOJ fraud prosecutions only happen *after* millions are lost — see Adam Meyer, 8yrs; Cory
Zeidman, $25M). McAfee (2026): **~1 in 3 Americans have hit a betting scam; ~1 in 4 lost money
(avg $547); ~1 in 6 got "guaranteed win" messages.** The only credible answer the whole
industry has converged on is **tamper-proof, complete, independently-verifiable records** —
which is GSE's existing posture (versioned picks, tamper-evident receipts, trust ledger,
proof-gated PROVEN→ESTABLISHED ladder). The product isn't better locks; it's *verifiability
itself*.

---

## 2. The accuracy-presentation playbook (adopt these patterns)

Drawn from the only orgs that present accuracy honestly: **Manifold, Metaculus, Good
Judgment / Tetlock, and FiveThirtyEight's "Checking Our Work."**

1. **A permanent, public, auto-updating track-record page** — not a blog post. 538's
   *"Checking Our Work"* is the model: every published pick logged with its confidence +
   timestamp, joined to outcome after it settles. (Maps to the existing `accuracy`/`calibrate`
   pipeline + `/reliability`/`/performance`/`/accountability`.)

2. **The reliability diagram, built exactly right:** x = stated confidence, y = actual hit
   rate, binned to the nearest 5%, one dot per bin, the **45° perfect-calibration diagonal**,
   and a per-bin **sample size + plain-language tooltip** ("We rated N picks ~70%; they won
   71%"). Above the line = underconfident, below = overconfident. **Show uncertainty bands**
   (Metaculus's 90% interval per bin) so nobody over-reads small-sample wobble.

3. **The "truth in advertising" promise, in plain English** (538): *"When we call a pick a
   75% favorite, it should win about 75% of the time over the long run."* Make it prominent,
   not buried in methodology.

4. **Report TWO numbers, never one:** calibration (are the probabilities honest?) AND a
   **Brier score** with its **0.25 "always-50/50" baseline** shown (Good Judgment / Metaculus).
   A model can be perfectly calibrated and useless if it says 50% on everything — the Brier/
   skill score proves discrimination.

5. **Benchmark against a meaningful baseline, disclosed.** 538 was criticized for "better
   than a coin flip." Benchmark against the **no-vig closing line / market consensus** — which
   is also the CLV story and the ≥52.4% ladder gate. "Beat the close on the same games" is the
   honest, hard-to-fake skill claim.

6. **Lead with CLV as the leading indicator.** CLV converges ~10× faster than win/loss
   (σ≈0.1 vs ≈1.0) and is literally what sportsbooks use to identify sharps. De-vig the close
   first; report both points (spreads/totals) and % EV. **State the efficiency boundary**: CLV
   is meaningless in thin markets (props, niche leagues, early season) — saying so is itself a
   trust signal.

7. **Pre-empt binary thinking** (538's most valuable move): *"A 30% pick still hits sometimes
   — and it's supposed to. Losing a 70% pick doesn't make it a bad pick."* Protects the brand
   from "you said X and it didn't happen," and trains users to value probability over optics.

8. **Hard sample-size gate with confidence intervals.** <100 settled proves little; ~250 is a
   first gauge (still ~25% chance of being down with a real edge); 500–1,000+ to separate skill
   from luck. Never headline a rate without **n** and an interval; suppress small-sample
   bragging. (This is also why SHARP/APEX tier claims stay "building the record" until proven.)

9. **Open the data / make it auditable.** 538 open-sourced every forecast+outcome so outsiders
   could re-grade them — the strongest possible "we're not cherry-picking" signal. GSE already
   has tamper-evident receipts + the trust ledger; surface a downloadable/auditable settled-pick
   record. This is the single biggest credibility lever and fully compatible with the no-fake-
   data bars.

10. **Let users filter the record by segment** (sport, market, confidence tier, window) — and
    accept it will surface weak segments. Metaculus's credibility comes precisely from making
    weaknesses auditable (it openly shows its AI category near chance). Volunteer your limits.

---

## 3. What this means for the rebuild (mapped to phases)

- **Front door / Phase 1:** the hero's three trust reasons (CLV / calibration / No-Bet) are
  exactly right — they ARE the moat. The welcome video should land the wedge line in §1.
- **Phase 3 (the point):** make the accuracy-proof surface the centerpiece, not a footnote.
  Build the reliability diagram + Brier-with-baseline + CLV-vs-close + the "truth in
  advertising" promise + the auditable ledger. Use `ACCURACY_PROOF_COPY.md` for the words.
- **Design / Phase 2:** the credible-forecaster aesthetic is *restraint + legibility* (538/
  Metaculus), not dashboard density — which matches the founder voice. The diagonal + dots +
  sample-size tooltips read as rigorous, not flashy.
- **SEO/AEO:** the methodology/calibration pages ARE the answer-engine moat — transparent,
  citable, authoritative content competitors won't publish. Keep them crawlable + structured.

*Bottom line: GSE doesn't need more features to be the best of 2026. It needs to make the one
thing nobody else will do — prove itself, honestly and publicly — the unmistakable center of
the product.*

---

## 4. The honest engine is built — wire it into the EXISTING surface (no new page)

The research's accuracy-presentation spec is now a **pure, tested module**, not just a doc:
`apps/web/lib/calibration/reliability-presentation.ts` → `buildReliabilityPresentation(samples)`.
It composes on the existing calibration math and adds exactly what the research says makes a
record trustworthy:
- per-bin **consistency bands** (Metaculus/538) + **over/under-confidence** verdicts,
- the plain-language **"We rated N picks ~70%; they won 71%"** readout (538),
- **Brier** + **Brier-skill vs the 0.25 always-50% baseline** (Good Judgment),
- the overall **hit-rate with a Wilson 95% CI** (never a bare stat),
- the research **sample-size gate** (`building`/`early`/`developing`/`credible`) — below 100
  settled it returns `displayReady:false` + a "building the record" verdict (no fabrication).

**Wire it into the EXISTING `/reliability` ("The Receipts") and/or `/performance` page — do
NOT add a new surface.** Feed it the settled `{probability, outcome}` samples those pages
already load; render the bins as the reliability diagram (predicted x, observed y, the 45°
diagonal, the band, the tooltip = `bin.readout`), show `brierSkillVsBaseline` + `verdictLine`,
and render the honest gated state when `displayReady` is false. Words: `ACCURACY_PROOF_COPY.md`.
14 unit tests prove the math + the honesty floor.
