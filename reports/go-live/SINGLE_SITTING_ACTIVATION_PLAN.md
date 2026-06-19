# Single-Sitting Activation Plan — go live in ~60 minutes

The whole activation, sequenced to do in one sitting with no waiting on yourself.
Detail for each step is in `OWNER_ACTIVATION_RUNBOOK.md`; this is the tight path.
Have open: your host (Vercel), a Postgres provider, Stripe, Google Cloud Console.

---

## T-0 → T+10 · Database
1. Create a free Postgres (Supabase/Neon/Railway). Copy both connection strings.
2. In your host env: set `DATABASE_URL`, `DIRECT_URL`.
3. Run `prisma migrate deploy` (and `npm run db:seed` for the dev admin, optional).

## T+10 → T+20 · Auth
4. `NEXTAUTH_SECRET` = `openssl rand -base64 32`. `NEXTAUTH_URL` = your prod URL.
5. `ADMIN_EMAILS` = your email.
6. *(Optional now, can add later)* Google OAuth → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## T+20 → T+40 · Stripe
7. Stripe → API keys → `STRIPE_SECRET_KEY`.
8. Stripe → Products → create Founding Desk / Pro / Elite → copy price IDs →
   `STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID`, `STRIPE_PRO_MONTHLY_PRICE_ID`,
   `STRIPE_ELITE_MONTHLY_PRICE_ID`.
9. Stripe → Webhooks → endpoint `<url>/api/webhooks/stripe` → `STRIPE_WEBHOOK_SECRET`.

## T+40 → T+55 · Deploy
10. Push all env vars into the host (Production scope).
11. Deploy. The `vercel.json` crons (`refresh-odds`, `settle-picks`) start the loops.
12. Sign in with your admin email; confirm `/cockpit` opens.

## T+55 → T+60 · Verify
13. Run the top of `LIVE_SMOKE_TEST_CHECKLIST.md` (sections 1–4).
14. Do one Stripe **test-mode** checkout (card `4242…`); confirm the webhook fired; cancel it.
15. Open `/cockpit/go-live` — confirm the groups are green for what you set.

## After
16. Once the DB is live and the Odds runner has produced ≥1 ingestion, set
    `OUTCOME_LEARNING_ENABLED=true` to begin the win-rate record.
17. Walk away. `/cockpit/autonomy` shows the loops running themselves. Check the
    cockpit when you feel like it; tweak the parked levers when the system flags them.

---

**Done.** You set ~10 secrets and clicked deploy. Everything else — data refresh,
scoring, settlement, CLV capture, self-audit, drift watch — runs on its own, at $0,
inside the guardrails.
