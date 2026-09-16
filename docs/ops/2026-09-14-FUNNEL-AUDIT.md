# Funnel audit — 2026-09-14

**Question the founder asked:** the funnel is empty and that is not deliberate. Why?

**Scope.** Four dimensions: discoverability, the money path, what a cold visitor
sees, and what the written strategy said to do versus what was ever done. This is
the single durable record; the thread it came from is not.

**How to read the evidence tags.** Every claim below carries one:

- **[VERIFIED]** — I ran the command or the query in this session and saw the
  output. The command is printed beside it.
- **[REPORTED]** — a survey agent measured it and showed its work, and I have not
  re-run it. Treat as a lead with evidence attached, not as a finding. Several
  agent findings this week were wrong in exactly the direction that flattered the
  agent's own headline, so the distinction is load-bearing.

Where a **[REPORTED]** number disagrees with a **[VERIFIED]** one, the verified
number wins and the gap is explained in place.

---

## 1. The headline: the public record page publishes a winning verdict built from picks nobody could bet

This outranks everything else in this document, including the broken checkout.
This product's whole premise is that it does not lie about its own performance.

**[VERIFIED]** `/performance` renders, right now:

```
Win Rate 53.2%   Wins 1,215   Losses 1,069   Pushes 8
Conclusive — Observed 53.2% on n=2284; the 95% interval [51.1%, 55.2%]
lies entirely above the 50.0% threshold.
```

`curl -s https://www.galaxysportsedge.com/performance` — `data-verdict="conclusive"`,
2026-09-14 ~05:00 UTC.

**[VERIFIED]** Split that exact sample by whether any sportsbook priced the pick.
Population replicated from `rebuild-performance-summaries.ts` (published,
non-bootstrap, result in WIN/LOSS/PUSH, `modelVersion <> 'v5.0.0-seed'`) plus the
builder's in-play exclusion (`generatedAt < commenceTime`), which is what
`build-performance-summaries.ts` applies:

| lane | W | L | win rate |
|---|---|---|---|
| book-priced (>= 1 book) | 745 | 777 | **48.95%** |
| model signal (0 books, unbettable) | 470 | 292 | **61.68%** |
| **total** | **1,215** | **1,069** | **53.2%** |

The totals reconcile exactly with the live page: 745+470 = 1,215 wins,
777+292 = 1,069 losses, 8 pushes, 2,292 settled. This is the same population, not
a similar one.

**[VERIFIED]** By market, same population:

| market | lane | W | L | win rate |
|---|---|---|---|---|
| SPREAD | book-priced | 363 | 413 | **46.78%** |
| TOTAL | book-priced | 284 | 334 | **45.95%** |
| MONEYLINE | book-priced | 98 | 30 | 76.56% |
| MONEYLINE | model signal (0 books) | 470 | 292 | 61.68% |

So the published record decomposes into:

1. Every market where a customer can actually act and where 52.4% is the known
   break-even — spreads and totals — is **losing**: 647-747 combined, 46.41%.
2. Two moneyline buckets, where a win rate without the price attached says
   nothing at all. Winning 76.56% on short favourites can still lose money.
3. Of the 890 settled moneylines, **762 (86%) had zero books pricing them.** They
   have no price, so no customer could have placed them, and they are the single
   largest block in the headline.

**[VERIFIED]** Only 125 of 2,292 settled picks (5.5%) carry a stored price at all
(`clvLockPrice` non-null): book-priced n=105, +1.12u, +1.07%; model-signal n=20,
+2.47u, +12.33%. Both samples are far too small to conclude anything, and that is
the point — **for 94.5% of the published record no realized return is computable,
and the site publishes only the win rate.**

**Correction to the survey.** The agent reported this lane split as 51.42% and
"below break-even". That number omits the in-play exclusion the page itself
applies, so it was measured on a different population than the one on screen. On
the page's own population the bettable record is 48.95% — not "below break-even"
but **below a coin flip**. The finding is real and it is worse than reported.

**Where the 50.0% comes from.** `apps/web/app/performance/page.tsx:385` renders
`<VerdictLine wins losses minSample />` with **no `threshold` prop**;
`apps/web/components/performance/verdict-line.tsx:22` defaults
`threshold = 0.5`. **[VERIFIED]** — both read in this session. The component
accepts a threshold and is tested with one (`verdict-line.test.tsx:47,54` pass
`0.8` and `0.9`), so this is a call site that never passed the argument, not a
missing capability. The site's own `/pricing` ladder names the real bar:
"a verified closing-line-value beat rate >= 52.4% (the market break-even line)".

**[VERIFIED]** And the same live site contradicts itself about this:
`apps/web/lib/gse/waitlist-copy.ts:34` puts on `/waitlist` the sentence "The model
does not beat naive on this tested setup", while `/performance` says "Conclusive".
Both are public. Both cannot stand.

### What must NOT be done about this

Do not lower, hide, or suppress any number here. The numbers are right; the
framing is wrong. Specifically:

- Do not delete the model-signal rows from the record. They were published; they
  settle; removing them from the track record would flatter our numbers by
  dropping exactly the rows the customer never had access to. The same argument
  already governs `adverse-edge-suppression.ts` — hide a row we should not have
  offered, never erase it from the record.
- Do not change the 52.4% figure to make anything pass. It is the market
  break-even at -110 and it is arithmetic, not a policy knob.
- Do not "fix" it by passing a lower threshold to `VerdictLine`.

### What the fix actually is

1. Split the headline into **bettable** (book-priced) and **model signal (no book
   price)**, with the bettable number in the hero position.
2. Pass an explicit `threshold` to `VerdictLine` per market: 0.524 for
   SPREAD/TOTAL at -110; for MONEYLINE, the de-vigged implied probability of the
   locked price, or withhold the verdict entirely where no price is stored.
3. Publish realized units beside the win rate for the priced sample, and state the
   coverage honestly (125 of 2,292).
4. The word "Conclusive" does not return until the interval clears the market
   break-even, not 50%.

Steps 1 and 2 are a display change that makes a true statement instead of a
misleading one. They do not touch the engine, do not need a MODEL_VERSION bump,
and do not move a gate floor. **They are the highest-value work in this document.**

---

## 2. The money path: the product has been unable to accept money since 2026-09-09

Filed as **issue #822**, with a do-not-let-an-agent-fix-this banner. Summary here
so this document stands alone.

**[VERIFIED]** The chain, each link checked independently:

| step | value | source |
|---|---|---|
| FOUNDING Pro monthly | $14.99 | `pricing-phases.ts:79` |
| PROVEN Pro monthly | $19.99 | `pricing-phases.ts:96` |
| live `/pricing` renders | **$19.99** | curl: `"price":19.99` |
| Stripe price `price_1Tdsq...V2T9cY` | **1499c**, `lookup_key gse-pro-monthly` | Stripe's own webhook payload in `webhook_events` |
| resolver on mismatch | `if (verdict !== "match") return "";` | `stripe.ts:248` |
| route response | 503 | `checkout/route.ts:114` -> `:117` |
| attempt row written at | `:382`, 268 lines later | same file |

The founder flipped `PRICING_PHASE=PROVEN` on 2026-09-09. The advertised amount
moved to 1999c; the Stripe Price object is immutable at 1499c; `stripe.ts:248`
fails closed on the mismatch and the route returns 503 before Stripe is ever
contacted. Both resolution branches (env price id and `lookup_key` fallback) land
on the same 1499c object.

**The failure is silent.** The 503 fires 268 lines before `getOrCreateCheckoutAttempt`,
so a blocked Subscribe click writes **nothing** — no `checkout_attempts` row, no
Stripe session, no log line anyone reads. Five days of this leaves no trace.

**Failing closed was correct.** The alternative — resolving to a price that does
not match what the page advertised — charges a customer an amount they did not
agree to. The guard is right; the configuration is missing.

**[VERIFIED] The post-payment path is not broken and must not be rebuilt.**
`webhook_events` holds live-mode events from 2026-06-20:
`checkout.session.completed` -> `invoice.payment_succeeded` ->
`customer.subscription.created`, all processed. That path has executed
end-to-end against live Stripe.

**Founder-only fix, two options:**

- **A (one minute):** set `PRICING_PHASE=FOUNDING` in Vercel. Advertised returns
  to 1499c, matches the existing Price, checkout opens. Given zero customers
  acquired, PROVEN pricing is buying nothing.
- **B (correct, slower):** create six new Stripe Price objects at the PROVEN
  amounts and set each `STRIPE_*_PRICE_ID` to `<new id>,<old id>` so grandfathered
  members keep their rate.

**Latent hazard armed by option B:** if a new Price is created and its id is *not*
added to the matching env var and it carries no `lookup_key`, the resolver falls
back to the old 1499c object and the first buyer is charged the old amount while
the page advertises the new one. Set the env var in the same change.

---

## 3. What a cold visitor sees

Verified subset first.

**[VERIFIED] Sign-in is Google-only.** `apps/web/lib/auth.ts:94-99` — the
`providers` array contains exactly one entry, `GoogleProvider`. No email, no magic
link, no Apple. A card-in-hand buyer clicking Subscribe while signed out is
redirected to a page whose only affordance is "Continue with Google", and for a
gambling-adjacent product mandatory Google identity linkage is a known abandonment
trigger. Both real checkout attempts in the database reached a live Stripe session
and then expired unused.

**[VERIFIED] Analytics are inert.** `apps/web/lib/analytics/events.ts:93-100` —
`track()` returns its payload and dispatches nothing ("Intentionally inert for
now — no network, no identity"). The call sites are real and already placed,
including `upgrade_cta_click` and `checkout_start` on the Subscribe button.
Cloudflare's beacon gives pageviews only. **Nobody can answer "how many people
reached /pricing and did not click Subscribe."** That is the one number that would
diagnose everything else in this section, and wiring any provider is a single env
key against call sites that already exist.

**[VERIFIED] The waitlist is orphaned and has never captured a real lead.**
`SELECT count(*) FROM gse_waitlist_leads` -> **1**, created 2026-08-10, email
`closeout-smoke-...@galaxysportsedge.test`, `utm_source ops-closeout` — an
internal smoke test. `/waitlist` appears in no nav, footer, or homepage href.

Reported, evidence attached, not re-verified by me:

- **[REPORTED] `/pricing` contradicts itself.** Browser tab reads
  "Founding-Member Rates, Locked For Life" and the FAQ says "we're
  pre-track-record", while the hero says Proven and the cards charge $19.99 /
  $29.99 / $6.99 — $5-$10 above the Founding rates printed one section higher on
  the same page. A visitor arriving on a founding-rate promise sees a higher
  number. Note this is currently moot in one sense: nobody can complete a purchase
  at either price (§2).
- **[REPORTED] The free preview shows the worst rows on the board.** Around the
  day rollover `/picks` served a signed-out visitor two already-settled picks from
  the previous day, both moneylines with no book price, under "Every pick we're on
  today" — while the database held 10 FREE-tier picks priced by 8-11 books on
  games kicking off within 24 hours. The free teaser is the entire top of the
  funnel.
- **[REPORTED] The counters disagree with each other.** Today's picks reads 12
  (homepage), 12 (/board), 18 (/picks). Settled sample reads 2,058 (homepage),
  2,058 (/board), 2,292 (/performance), 2,385 (/calibration prose), 2,945
  (/proof). A sceptic checking one number against another finds five answers.
  Some of these are legitimately different populations; none of them says so.
- **[REPORTED] The homepage's largest editorial block sells the holds, and the
  counter beside it reads 0.** "A pass is not a blank. It is the finding" sits
  next to "We passed on 0". `/board` prints "Passed On 0 — Nothing passed on yet
  today" directly above a pass list with two entries. This is downstream of the
  `gate_decisions` table having no writer since 2026-06-11 (AGENTS.md).
- **[REPORTED] `/engine`, one of the three proof doors, renders all zeros** for
  its today-scoped counters: 0 odds rows, 0 games, 0 sports, 0 receipts.
- **[REPORTED] `/calibration`'s hero chart defaults to a 46% band** with the
  surrounding paragraph disowning the metric the chart plots. The page is the most
  honest on the site and the least legible.
- **[REPORTED] The hero never names the category.** No "sports", "betting",
  "picks", "odds" in the first screen; `<title>` is the bare brand name.
- **[REPORTED] `/players` serves 2024-season data** behind a homepage door
  advertising "140,866 live player rows", and is never CDN-cached (0.67s to 13.9s
  across four consecutive requests, 409KB uncompressed).

---

## 4. The strategy gap: the plan exists in four written forms and essentially none of it ran

All **[REPORTED]** unless tagged. The founder's question was whether the plan is
all SEO. It is not, and that is the finding.

**[REPORTED]** `docs/launch-prep/30-day-campaign-plan.md` weights the mix: X 35%,
Threads 20%, email 25%, founder DMs 10%, SEO 5%, blog 5%. North star: 500 free
signups and 25 paid by day 30. Measured against the database: users 2, waitlist
leads 1 (synthetic), contest entries 0, blog posts 0, journal entries 0, push
subscriptions 0, promotions 0. 2,603 commits since the last human signed up
(2026-06-10); 18 touched any acquisition surface.

**[VERIFIED]** The two-user, zero-subscription state and the 2026-06-10 newest
user were measured directly earlier in this session.

So the answer to "why is it not acquiring" is not a conversion-rate problem. **No
channel has ever pointed a stranger at the site.** Everything in §3 is real and
still downstream of that.

Supporting, each **[REPORTED]** with evidence:

- **The price was stepped up with zero customers ever acquired.** Founding rates
  expired without a single person having paid one. See §2 — the step-up is also
  what broke checkout.
- **No top-of-funnel capture exists.** The homepage has no signup CTA, no email
  capture, no waitlist link. The only identity affordance is "Sign in". Email is
  25% of the plan's weight and has no front door.
- **The free top-of-funnel product is dark.** "Beat the Model" — the free,
  no-entry-fee contest chosen specifically because it is legal in all 50 states
  and needs no proof to be worth playing — 404s at both URLs and has never taken
  an entry.
- **The content channel the strategy pivoted onto was never built.**
  `docs/strategy/ENTITLEMENT_REMAP_SPEC.md` records the 2026-07-10 reversal: picks
  became the paid product again, and the top of funnel was to be won "on content +
  engagement". The draft generator is hard-coded never to publish; 67 drafts sit
  unpublished; `blog_posts` and `model_journal_entries` are both 0. The funnel was
  traded for a channel that does not exist.
- **The outreach assets would misrepresent the product if sent today**: they quote
  $19/mo (a price that exists nowhere), name a feature absent from the live site,
  use AI framing the brand now bans, and point at the wrong X handle.
- **AI-citation is one-third built.** `/llms.txt` and `/ai.txt` resolve;
  `/agents.json`, `/.well-known/agents.json`, `/api/mcp`, `/rss.xml`, `/feed.xml`
  all 404. The competitive intel names AI-citation as the channel that survives
  the organic-search collapse.
- **The strategy is stale at its root.** The blueprint sequences "earn the number
  -> prove it on CLV -> publish -> distribute -> monetize", and every pricing and
  positioning decision assumes the proof arrives. §1 shows spreads and totals
  below break-even and CLV at 23% against 52.4%. The only in-repo plan written for
  a product *without* proof is `docs/strategy/REVENUE_NOW.md` (give the picks
  away, sell the tools) and it was reversed on 2026-07-10.

That last point is the one worth the founder's morning. The current plan's
premise — that the picks are the proven paid product — is not what the record
measures. That is a founder decision, not an agent's.

---

## 5. Order of work

Ranked by honesty risk first, then by whether anything downstream can work.

| # | Item | Who | Effort |
|---|---|---|---|
| 1 | `/performance` split into bettable vs model-signal; explicit per-market threshold; stop saying "Conclusive" against 50% | agent-legal (display only) | hours |
| 2 | Reconcile `/waitlist` "does not beat naive" with `/performance` "Conclusive" | founder decides which is true | minutes |
| 3 | Unbreak checkout: `PRICING_PHASE=FOUNDING`, or six new Stripe Prices with comma fallbacks | **founder only** | minutes / hours |
| 4 | Alert on the checkout 503 and wire `stripe-price-check.mjs` into `daily-smoke.yml` | agent-legal | hours |
| 5 | Wire `track()` to any provider (one env key; call sites already exist) | founder (env) | hours |
| 6 | Add one non-Google sign-in path (email magic link, NextAuth v5) | agent-legal, founder-gated scope | days |
| 7 | Put a two-field email capture on the homepage and under the `/picks` paywall | agent-legal | hours |
| 8 | Decide the strategy question in §4: proven-picks product, or tools-and-free-picks | **founder only** | — |

Items 1, 4, 7 need no founder input and no gate flip. Item 3 blocks all revenue
and cannot be done by an agent.

## 6. Boundaries

**Founder-only under law 3** (an agent flipping any of these publishes an unearned
claim or mis-states a price): `PRICING_PHASE`, any Stripe price id, any env flag,
any gate floor, the 52.4% threshold, the MODEL_VERSION bump implied by refitting
confidence.

**Agent-legal:** everything in §5 rows 1, 4, 7 — display framing, monitors, and a
capture form. None touches the engine, the schema, or a gate.

**Explicitly not mine and not to be duplicated:** the OOM investigation (#821),
the SSRF connect-time control (#820), the `gate_decisions` retirement, the
gate-slate bound, and the underround odds quarantine were handed to another agent.

---

## Appendix — verification log

Commands and queries run in this session, 2026-09-14 ~05:00 UTC. All SQL is
read-only SELECT against Neon project `summer-brook-99380762`.

1. `curl -s https://www.galaxysportsedge.com/performance` — `data-verdict="conclusive"`,
   "Observed 53.2% on n=2284 ... above the 50.0% threshold".
2. `sed -n '1,60p' apps/web/components/performance/verdict-line.tsx` — `threshold = 0.5` default at line 22.
3. `sed -n '370,400p' apps/web/app/performance/page.tsx` — `VerdictLine` at :385 with no threshold prop.
4. `grep -n "where" apps/web/lib/performance/rebuild-performance-summaries.ts` — the page's population filter.
5. `sed -n '96,170p' apps/web/lib/performance/build-performance-summaries.ts` — the in-play exclusion that closes the 171-row gap between live picks and the summaries table.
6. `SELECT ... GROUP BY lane` on the replicated population — 745/777 book-priced, 470/292 model-signal; reconciles to the page's 1,215/1,069/8.
7. Same, `GROUP BY pickType, lane` — SPREAD 46.78%, TOTAL 45.95%, MONEYLINE book-priced 76.56%, MONEYLINE model-signal 61.68%.
8. Same, realized units at `clvLockPrice` — n=105 (+1.07%) and n=20 (+12.33%); 125 of 2,292 rows carry a price.
9. `SELECT count(*), min(created_at), max(created_at), min(email) FROM gse_waitlist_leads` — 1 row, 2026-08-10, a smoke-test address.
10. `grep -n "providers:" -A12 apps/web/lib/auth.ts` — one provider, Google.
11. `sed -n '85,105p' apps/web/lib/analytics/events.ts` — `track()` dispatches nothing.
12. `grep -rn "naive" apps/web/lib/gse/waitlist-copy.ts` — the "does not beat naive" public sentence.
13. `grep -rn '"/waitlist"' apps/web/components/nav* apps/web/components/footer* apps/web/app/page.tsx` — no matches.

Money-path chain (§2) was verified link-by-link earlier in the same session and is
recorded on issue #822.
