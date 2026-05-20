# PickPilot Operator Playbook — Days 1–30

The site is live. Now you operate it. This is what to actually do each day.

**The single most important habit:** show up. Not "post 10 times today." Show up consistently every day for 30 days. Calibration takes settled picks. Audience takes consistent reps. Both compound.

---

## Daily routine — 20 minutes a day

Pick one time. Same time every day. Don't skip it.

### Morning (10 min)

1. **`npm run smoke:prod`** — hit every route on production, confirm green
2. **Glance at Vercel deploy log** — confirm no overnight build failures
3. **Glance at Postgres usage** — Neon free tier is 0.5 GB; you have months but watch the trend
4. **Glance at Odds API credits remaining** — free tier is 500/mo; once you upgrade ($30) it's 20k
5. **One social post** (round-robin: X → IG → Threads → FB across the week, content from `social/launch-day.md`)

### Evening (10 min)

1. **Check `/api/picks` endpoint** — confirm at least 1 pick was generated today (if data-refresh worker is running)
2. **Settled-pick counter** — query Postgres: `SELECT COUNT(*) FROM picks WHERE settled_at IS NOT NULL`. The gate threshold is 100.
3. **Engagement scan** — 2 min reading replies/comments on today's social post. Don't argue. Acknowledge thoughtful ones.

---

## Weekly routine — Sunday, 60 minutes

1. **Pick counter check-in.** If the trajectory says you'll hit 100 settled picks by day X, set a calendar reminder to flip `PERFORMANCE_STATS_ENABLED=true` on day X.
2. **Read your own homepage as a stranger.** Does anything sound hyped? Anything you can't back? Add to a "trim copy" list.
3. **Write the week's "Round X" social post** (see `social/launch-day.md`). Schedule via Buffer/Meta Business Suite.
4. **Update the launch journal** (create `docs/launch-journal.md`). One paragraph per week: what shipped, what broke, what you learned. Future-you will be glad.

---

## The 30-day gate progression

This is the platform's own architecture. Don't skip steps under FOMO.

| Day | Trigger | What to flip |
|---|---|---|
| 1 | Deploy successful | All gates stay default (silent collection) |
| 7 | ~30 settled picks | `DERIVED_MODEL_HISTORY_ENABLED=true` (Vercel env, redeploy) |
| 14 | Slate healthy, ingestion stable | `PUBLIC_PICKS_ENABLED=true`. **Upgrade Odds API to $30 tier** the same day. |
| 14 | Same day as ↑ | Buy a test month of X Premium ($16/mo) for engagement experiments, OPTIONAL |
| 21 | ~70 settled picks | `PUBLIC_BLOG_ENABLED=true`. Anthropic generates the first blog post — run it through the trust-claim scanner before publishing. |
| 28 | ≥100 settled picks | `PERFORMANCE_STATS_ENABLED=true`. The Performance page now publishes a real number. **Switch Stripe to Live mode and run `npm run stripe:seed`.** |
| 30 | Paywall live | Promote pricing on social. First charges arrive. |

---

## When something breaks — runbook

### Symptom: smoke test fails on `/api/health`
- Likely cause: Neon connection dropped. Neon free tier auto-pauses after 5 min of inactivity — first request after pause takes 1–3 seconds.
- Fix: redeploy on Vercel, OR upgrade Neon to Launch tier ($19/mo) to prevent auto-pause.

### Symptom: smoke test fails on a public page
- Likely cause: ENV var missing in Vercel.
- Fix: Vercel → Settings → Environment Variables → re-check against `VERCEL_ENV.txt`. Redeploy.

### Symptom: Odds API returns 401
- Cause: key revoked or quota exceeded.
- Fix: log in to `the-odds-api.com`, check quota. If exhausted, upgrade to $30 tier OR wait for monthly reset.

### Symptom: Stripe webhook 400
- Cause: `STRIPE_WEBHOOK_SECRET` mismatch.
- Fix: Stripe → Webhooks → click your endpoint → reveal signing secret → paste into Vercel `STRIPE_WEBHOOK_SECRET`. Redeploy.

### Symptom: NextAuth says "Configuration"
- Cause: Almost always `NEXTAUTH_URL` mismatch with what Google OAuth has registered.
- Fix: Google Cloud Console → OAuth client → confirm `https://pickpilotapp.bet/api/auth/callback/google` is in Authorized redirect URIs.

### Symptom: Social post got 3 likes and you're spiraling
- Read this: **engagement is a settled-picks problem.** You haven't earned the right to be loud yet. Stay consistent. Day 1 looks identical to day 30 except the compound rate.

---

## The four metrics that matter

Only these. Everything else is vanity.

1. **Settled picks count.** This is the gate to credibility. Drives every other metric.
2. **Calibration error.** Once `PERFORMANCE_STATS_ENABLED=true`, the Performance page surfaces it. The number must be small. If it's large, the model is wrong — you have a data problem, not a marketing problem.
3. **Sign-ups per day.** Trickle until day 14 (public picks open). Step-change after.
4. **First real $ from Stripe Live.** Day 30 target. Doesn't need to be big — needs to be real.

---

## The four things you do NOT do

1. **Don't publish a win-rate before the gate threshold.** The platform won't let you, but the impulse will be strong.
2. **Don't post variance-as-skill claims.** "I called the over last night" said three nights in a row is hype, not record. Wait until the published Vault can back it.
3. **Don't argue with strangers about a single pick.** A 60% confidence pick is supposed to lose 40% of the time. Variance is real, by design.
4. **Don't ship a "premium tier" feature you wouldn't pay for yourself.** Pro = full reasoning + line movement. Elite = early access + alerts. Don't bolt on padding.

---

## A note on showing up

Most platforms in this space die on day 18, not day 1. Day 1 has adrenaline. Day 18 has noise, no audience, and the strong urge to over-promise to get attention.

The architecture you shipped is built specifically to prevent you from breaking under that pressure. The gates won't let you publish what you can't back. The banned-phrase scanner stops you mid-keystroke. Trust the design you already shipped.

Your job from day 2 onward: show up, post one thing, monitor the smoke test, do nothing dramatic.

That's the whole game.
