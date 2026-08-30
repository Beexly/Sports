# All remaining levers — close-out matrix (2026-08-10)

Integrity held: no PERFORMANCE_STATS · no maps apply · no invented PROVEN · RANKING_PAUSE_APPLY OFF.

## Track A — edge / PROVEN

| Lever | Outcome |
|---|---|
| Independent trueProb durable on new + settled | **Done** (process-sport, signal-slate, force reprice backfill) |
| Coverage / separation | **~65% / >0** on independent bake-off |
| Live eligibility p | **v5.2.6** evidence shrink α=0.88 + market-anchored blend |
| Dual-objective selective | **Done** (max RES under Brier cap) |
| Odds dual-path + clock honesty | **Done** (ESPN tertiary; zero-odds no clock advance) |
| Re-run calib | Continuous via cron |
| Brier ≤ 0.22 / GREEN×3 | **Not yet** — sample + selective + pause discipline |
| RANKING_PAUSE_APPLY | Ready · founder flip |
| THE_ODDS_API_KEY | Founder env (optional denser books) |

## Track B — revenue

| Lever | Outcome |
|---|---|
| Money rails (secret, webhook, 6 prices) | **Live** |
| Webhook host audit | **Healthy** (galaxysportsedge.com only) |
| Checkout API | Auth 401 without session (correct) |
| Waitlist capture | **Live** |
| Waitlist → paid CTA | **Done** (post-submit → /pricing + sign-in) |
| Founding Payment Link script | **Ready** (`scripts/ops/create-founding-payment-link.mjs`) |
| Real card charge | **Founder only** |

## Track C — ops

| Lever | Outcome |
|---|---|
| Vercel-only scheduler SoT | **Accepted** + documented on External Cron workflow |
| Cron dual auth | **Done** |
| Autonomy Bearer-only execute | **Done** |
| Autonomy cannot flip PERF_STATS/LIVE | **Confirmed** (allow-list + requiresOwner) |
| Env examples for close-out flags | **Done** (.env.example + production.example) |
| GH Actions minutes | External / billing |

## Track D — polish

| Lever | Outcome |
|---|---|
| Pick-card rankingP | **Done** |
| Independent edge “priced into ranking” badge | **Done** (v5.2.6) |
| Content generate-drafts | **Live** (daily + weekly drafts) |
| Archives (podcast/newsletter) | Thin — draft-only law; human publish |
| Product boards honesty map | **Done** |
| Brand motion / Higgsfield | Founder approval |

## What still cannot be finished by agent alone

1. Card Checkout once (Stripe session + human browser)  
2. Vercel env secrets you have not pasted (`THE_ODDS_API_KEY` if denser books wanted)  
3. `RANKING_PAUSE_APPLY=true` explicit YES  
4. GH Actions billing restore  
5. GREEN×3 — requires time + independent settles under selective (not inventable)

## Next autonomous loop (no gate flips)

1. forceReprice + calibration-metrics as settles land  
2. refresh-odds multi-sport (ESPN)  
3. generate-signal-slate + settle-picks  
4. Remeasure Brier/RES — chase ≤0.22 then GREEN×3  
5. Never open PERFORMANCE_STATS while RED
