# Grok Edge Round 2 — Deep Triage: the Spectacle Layer + the Rigor That Makes It Undeniable (2026-07-02)

Grok's Division 2 adopted the content-not-bettor lens and found a REAL tool (the
CRAN `implied` package — Shin/power/proportional devig, genuinely usable). Solid.
But this round the gold is in a dimension neither of us pushed: Garrett wants to
be NOTICED — to be undeniable on sight. That changes what we build and how.

## THE UNLOCK: every internal signal has a PUBLIC SPECTACLE version
An internal "book conviction score" impresses nobody. The SAME math, published
as adversarial, provable, receipted transparency against a billion-dollar book,
is press-bait and community-viral. The reframe: don't hide the edge — WEAPONIZE
its visibility. Three spectacles fall directly out of Division 2:

1. **"The Book X-Ray."** Publish, live, the book's OWN implied probability
   distribution reconstructed from its full alt ladder: "here is what FanDuel
   actually thinks, versus the single number they show you." Nobody publishes a
   book's hidden distribution. It screenshots. It demands attention because it
   makes the invisible visible.
2. **"Caught Mispricing" live feed.** When our internal-coherence detector finds
   a book's halves don't sum to its full game (or team-totals ≠ game-total), we
   publish it in real time WITH a timestamped receipt: "GSE caught [book]
   mispricing [market], sealed at [hash]." Adversarial transparency against a
   $B company, provable, and nobody else does it. That is the "notice us
   immediately" artifact.
3. **"The book followed us."** Combine the ladder extractor with the line-
   predicts-the-line proof: publish OUR fair distribution BEFORE the book's
   ladder settles, then show the book's own ladder CONVERGING to ours, with the
   pre-commit receipt. A cryptographically-timestamped proof that the market
   moved toward us. This is the single most attention-demanding artifact
   possible in this space, and it cannot be faked — a rival has no pre-dated
   convergence record.

The edges are the fuel; the SPECTACLE is what makes people look. Build both.

## GOLD Grok missed #1 — the historical alt-ladder time series is a MOAT we manufacture NOW
Grok's validation test (regress ladder kinkiness on out-of-sample accuracy)
quietly assumes we HAVE historical deep alt-ladder snapshots. We mostly don't —
and neither do most vendors: odds APIs sell CURRENT odds, not deep historical
alt-ladder time series at high frequency. That is not a blocker; it is the
opportunity. **Start LOGGING full alt ladders now** (we already ingest odds).
In one season we own a proprietary dataset nobody sells — the validation data
for every Division-2 edge AND a standalone asset. The thing vendors don't
capture is exactly the thing that becomes our moat. Action: a ladder-logging
job, today, dark. The clock on this moat starts the day we turn it on.

## GOLD Grok missed #2 — the DEVIG METHOD CHOICE is the alpha, not a given
Grok treats Shin/power/proportional as interchangeable extraction knobs. They
are not. WHICH devig method best matches empirical outcomes is an unanswered
empirical question PER SPORT and PER MARKET. Discovering "power devig fits NFL
alt totals, Shin fits NBA spreads, proportional fails both" — validated on real
results — is itself a proprietary calibration finding nobody has published. The
method-selection is the edge. The `implied` package gives us all the methods for
free; the ALPHA is knowing which one is right where, proven on outcomes.

## CRITICAL RIGOR FIX Grok (and a lazy version of us) would get wrong
The "kinkiness predicts book error" test has a fatal confound: a book's ladder is
kinky PRECISELY where the game is uncertain (pick-em spreads, volatile totals),
and uncertain games are inherently harder to predict. So naive "kinkiness → book
error" may just be re-measuring GAME VOLATILITY, not book laziness. The honest
test MUST control for game volatility (compare kinkiness against a volatility-
matched baseline; or residualize kinkiness on a volatility proxy first). This is
the difference between a real finding and a spurious one — AND it is the moat,
because the whole brand is surviving scrutiny. Every edge test from here must
name its #1 confound and how it controls for it. A tout skips this; a
trust-brand cannot.

## LEGAL RE-FLAG — Grok slipped again on 2A(c)
Grok tagged "[VERIFIED] Van Buren (licensed data read ok; ToS permit modeling)."
CFAA is fine, but "vendor licenses permit modeling" is NOT verified — vendor ToS
VARY WILDLY, and several odds APIs explicitly restrict redistribution or
commercial derivative products. That is [PROPOSED, quote the actual vendor ToS
per vendor], never [VERIFIED]. The recurring Grok failure is grading a legal
conclusion as settled. Reinforce in the next contract: the vendor-license
question is answered by QUOTING each vendor's ToS, not by citing a CFAA case.

## Citation nit
Grok's "Pinnacle devig guide" link was pinnacleoddsdropper.com (a third-party
site), not Pinnacle. The `implied` CRAN package is the real, citable resource
for the methods. Pin sources to primary origins.

## Net build list from Round 2
1. Ladder-logging job (dark) — start manufacturing the historical moat TODAY.
2. Book X-Ray extractor (implied-distribution from full ladder) — internal
   signal + public spectacle.
3. Internal-coherence "caught mispricing" detector + receipted public feed.
4. Devig-method bake-off per sport/market, validated on outcomes.
5. Every test carries an explicit confound-control (volatility first).
