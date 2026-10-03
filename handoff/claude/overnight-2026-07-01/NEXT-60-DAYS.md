# GSE: The Next 60 Days (July 2 - August 30, 2026)

One page. Sequenced by dependency, split by who pulls each lever. No invented
percentages: targets are actions and proofs, because that is what compounds.

## Phase 1 — Data alive + money path proven (Days 0-7)

**Owner (one sitting, ~30 min):**
- Merge the 4 waiting branches (scheduler, freshness-badge, night-shift, and
  anything Copilot has queued); add the CRON_SECRET repo secret on GitHub
- Stripe: finish the payout "Action required" task; run one live checkout +
  refund (webhook already proven 200)
- Neon dashboard: check compute/quota; upgrade if capped (likely ~$19/mo, the
  single biggest reliability buy)
- Flip on a PREVIEW deploy: `NEON_SERVERLESS_DRIVER=true` → watch /api/health
  → if clean for a day, set in production

**System (already built, activates on merge):**
- 7 refreshes/day (Vercel 6am + GitHub Actions 6x) → fresh lines all day
- Freshness badge live on /picks; Telegram alerts on any ingestion failure
- Proof of life: picks on the board every slate day, health 200 all week

## Phase 2 — Edge construction (Days 8-21)

**Claude builds (in order):**
1. Line-movement display for Pro (the paid tier's visible reason to exist)
2. NWS weather → MLB shadow evidence (cleared source; display on cards, no
   scoring change yet)
3. MLB Stats API probables/lineups intake (terms read → registry → adapter)
4. `ODDS_FRESHNESS_MODE=dynamic` flip after a clean scheduler week (2h gate
   near first pitch — sharper than anything competitors advertise)
5. Run `scripts/calibration-validate.ts` against prod (167 eligible picks)

**Owner decides:**
- Calibration verdict: PASS → schedule the audited MODEL_VERSION activation
  (the path-to-70 §7 sequence); FAIL → keep collecting, nothing fake ships
- Data budget: The Odds API plan vs credits burn at 7x/day (watch the
  "requests remaining" number in cron logs; 6.4k credits at last reading)

## Phase 3 — Model honesty becomes the product (Days 22-40)

- Calibration activation (if validated): calibrated win probabilities +
  conviction tiers replace the raw heuristic; reliability diagram goes public
- Statcast (barrel%, xwOBA) + Retrosheet park/ump priors as shadow evidence
- Volatility-triggered ad-hoc refresh (line-velocity spike → extra fetch)
- Airwave lanes: whitelist 3-5 podcast/YouTube feeds, flip the env keys you
  already designed; claims flow through the review queue only
- Weekly ritual starts: every Monday, the calibration table + CLV read
  decides the week's model work. The 80-89 band at 29.5% is target #1.

## Phase 4 — Audience while it runs (Days 41-60)

- Waitlist → launch email to the founding list (the no-claim templates exist)
- Content engine live in draft mode: daily brief + weekly recap drafted by
  the system, reviewed and published BY YOU (PUBLIC_BLOG_ENABLED is verified
  safe to flip)
- The transparency story IS the marketing: "every pick shows its line age,
  factor trail, and our public CLV" — post the receipts, not promises
- College prep: sportsdataverse archives wired before CFB kickoff (late Aug)
- Revisit pricing once the board has run 30+ days: founding rates lock

## Budget reality (monthly, everything included)
- Vercel Hobby $0 (Pro $20 only if cron/limit pain returns)
- Neon ~$19 · The Odds API current plan (watch credits) · everything else $0
  (GitHub Actions, NWS, MLB facts, nflverse, Telegram)
- Total: under ~$75/mo until revenue says otherwise

## The two numbers that matter by Day 60
1. **Consecutive days with picks on the board and zero unexplained failures**
   (target: the streak becomes boring)
2. **Calibration error trending toward zero** on the public reliability
   diagram (win rate follows honesty; 70% is claimed only when the math says
   so)

Everything above ships through the same pipeline that built this week:
branch → validate → merge → verify in prod → next. No migrations under
pressure, no invented numbers, no gate flipped without its proof.
