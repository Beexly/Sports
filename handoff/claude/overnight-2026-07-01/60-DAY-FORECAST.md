# GSE 60-Day Rolling Forecast — Good / Bad / Ugly (v1, July 2)

Scenario forecast with triggers, mitigations, and revenue impact. Honest
framing: drivers and ranges tied to actions, no invented decimals. Update this
file weekly; the scenarios narrow as real data lands.

---

## Phase 1: Data alive + money proven (Days 0-7)

**GOOD (the base case if the morning checklist happens):** 6am cron + merged
fallback code fills the board with MLB picks; 7 refreshes/day keep lines
under 3h old all day; freshness badge shows it publicly; one test checkout
proves the revenue pipe; Stripe payouts enabled. *Revenue impact: the machine
can now legally take money — precondition for everything.*

**BAD (plausible):** the diagnostic reveals lines genuinely stale at 6am
(books post MLB lines late morning). *Mitigation, already built:* the 9am and
11am ET scheduler passes catch the morning lines; picks appear midday instead
of dawn. Zero code needed, just the scheduler merge + secret.

**UGLY (the one that hurts):** Neon keeps dropping connections even after the
plan check, killing random requests. *Mitigations, already built:* flip
`NEON_SERVERLESS_DRIVER=true` on a preview → prod; if Neon still flakes
after BOTH the plan upgrade and the driver, THEN the deliberate database
migration conversation happens — with dumps, a preview environment, and a
rollback, not overnight. *Revenue impact of inaction: every dropped request
during a paying user's session is churn.*

## Phase 2: Edge construction (Days 8-21)

**GOOD:** dynamic freshness live (2h near first pitch); line movement visible
to Pro; NWS weather on MLB cards; live RSS wire feeding The Beat. The product
now shows four things no competitor at this price shows: line age, line
movement, weather context, attributed news signals. *Revenue impact: the Pro
tier finally has visible, screenshot-able superiority — this is what converts.*

**BAD:** Odds API credit burn at 7x/day forces a plan decision
(~6.4k credits at last reading; 3 markets x 2-3 sports x 7 fetches ≈
60-90/day → fine; but adding sports scales it). *Mitigation:* in-season
filtering already limits sports; watch the "requests remaining" log weekly;
the paid tier is a revenue-linked upgrade, not a surprise.

**UGLY:** the calibration validator comes back FAIL — the model's confidence
doesn't beat raw out-of-sample. *Mitigation (this is why the gate exists):*
nothing fake ships; picks continue with the honest uncalibrated label;
the 80-89 band gets a targeted review (it's winning 29.5% — likely an
overconfidence pattern the conviction tiers can absorb). *Revenue impact:
none immediate — the product never promised calibration, it promised honesty.*

## Phase 3: Model honesty becomes the product (Days 22-40)

**GOOD:** validator PASSes → audited activation → calibrated probabilities +
conviction tiers public → the reliability diagram becomes the marketing.
*Revenue impact: "our 70% tier hits 70% because the math says so" is the
sentence that sells subscriptions — and it only exists via this gate.*

**BAD:** sample grows slower than hoped (MLB-only summer slate). *Mitigation:*
football-data-uk backtest volume for offline hardening; NHL/NBA/CFB seasons
arrive within the window; patience costs nothing, faking costs everything.

**UGLY:** a losing stretch lands right at launch-marketing time (variance
guarantees one eventually). *Mitigation, structural:* the whole surface is
built for this — CLV shown separately from win rate, "a quiet board is a
position," honest bands. The trust product SURVIVES losing weeks; tout sites
don't. That asymmetry IS the moat. *Do not delay marketing waiting for a hot
streak — that's results-timing, the thing we don't do.*

## Phase 4: Audience (Days 41-60)

**GOOD:** waitlist email → founding members → first organic subscriptions;
the drafted-daily-brief cadence gives shareable content with receipts.
*Revenue: first real MRR. Founding pricing locks loyalty.*

**BAD:** traffic arrives but doesn't convert. *Mitigation:* the funnel
instrumentation lane (PostHog already wired no-op — add the key) tells you
WHERE it leaks before you guess; free tier is generous by design, so the
upgrade trigger (confidence + factor trail + line movement) must be visible
on every free pick — it is, as locked chips.*

**UGLY:** a competitor clones the freshness badge and undercuts. *Mitigation:*
they can clone the badge, not the ledger. The proof-of-record receipts (see
moon-leap below), public CLV history, and the settled-pick archive are
time-locked assets a clone starts at zero on. Speed of the build loop (this
week: ~30 shipped commits) is the second moat.

---

## The moon-leap (new, grounded in code that already exists)

**Public Proof-of-Record verification.** Every pick already mints a
tamper-evident SHA-256 receipt at creation (`pickProofReceipt` — payload +
contentHash, frozen before kickoff, never rewritten). Nobody is USING this
publicly yet. Build `/verify`: paste any pick's receipt hash → the site shows
the frozen pre-kickoff commitment (line, price, confidence, timestamp) and
proves it hasn't changed. Print the hash on every pick card. Result: the only
picks site where a skeptic can cryptographically verify that no pick was
ever edited after the fact. Zero new infrastructure — the receipts exist
today. This is the "receipts" brand made literal, and it is unclonable
without a year of honest history.

---

*Weekly update ritual: refresh this file every Monday with what the week
proved; scenarios that died get marked dead, new ones added. The forecast is
a living instrument, not a prophecy.*
