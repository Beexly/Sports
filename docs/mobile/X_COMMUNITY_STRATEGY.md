# X (Twitter) — community, distribution and revenue

**Status:** strategy + build plan. Reconnaissance complete, transport absent.
**Requested by:** owner, 2026-09-15.
**Supersedes nothing.** `docs/product/twitter-bot-voice-spec.md` remains the voice authority for
what the bot says; this document is about what X is *for* and what is missing.

---

## 1. What already exists (so this does not get rebuilt)

| Asset | Path | State |
|---|---|---|
| Voice spec — four event kinds, eight hard refusals | `docs/product/twitter-bot-voice-spec.md` | Complete |
| Templates | `apps/web/lib/twitter-bot/templates/*.ts` | Built — **two doctrine conflicts, see §3** |
| Planner — idempotency, blocked reasons, compliance gate | `apps/web/lib/bot-outbox/plan.ts` | Built |
| DB adapters | `apps/web/lib/bot-outbox/records.ts` | Built |
| Operator review UI | `apps/web/app/cockpit/bot-outbox/page.tsx` | Built |
| Eval cases | `docs/ops/evals/twitter-bot-*.md` | Written |
| **Transport — auth, rate limit, send, retry, log** | `workers/twitter-bot/` | **ABSENT** |
| **Community / engagement / partnership layer** | — | **ABSENT** |

**The finding, stated plainly: GSE has a fully specified, compliance-gated, operator-reviewable X
bot that cannot post.** Everything up to the HTTP call exists. That is an unusually well-defined
gap, which is why this is cheap to close.

---

## 2. What X is for — four jobs, in priority order

The account is `@GalaxySportsAI`. Four jobs, and they are not equal. Getting the order wrong is how
a trust product becomes a content farm.

### Job 1 — The public record needs a witness (highest value)

The product's entire claim is that its record is checkable. Today the record is checkable *by
whoever visits the site*. X changes that: a settlement posted at the moment it settles is
timestamped by a third party, publicly, before the outcome can be curated out.

This is the single most defensible thing the account can do, and it is also the hardest to fake.
**Post every settled free-tier pick, wins and losses alike, with no filter.** A bot that posts 73%
of its wins and 100% of its losses is a bot nobody can accuse of anything, which is the point.

### Job 2 — Distribution (medium value, real)

Every post links to a surface. Not "link in bio", not a thread that ends in a funnel — a direct
link to the specific `/room/[gameId]` or `/picks` page the post is about. The measurable goal is
referrals that convert to a first repeat visit, not follower count.

### Job 3 — Community (the owner's ask — and the one to be most careful with)

There is a real appetite on X for a *methodology* community: people who want to talk about
calibration, closing line value, sample size and variance rather than locks. That audience exists
and is currently underserved — it is the same audience that reads `docs/calibration-proposals/`.

**What that community looks like when it is on-brand:**
- A weekly published calibration post — the curve, the Brier score, and the verdict *including
  when the verdict is "higher confidence is winning less."*
- Loss autopsy threads. These are the highest-engagement content the account can produce, and they
  are also the most honest. Nobody else publishes them.
- Open methodology questions answered with the framework and never the weights
  (`docs/positioning.md` § Public Methodology Rule already draws that line).
- A model-changelog post on every MODEL_VERSION bump, naming what changed and why.

**What it must never become** (each is a hard refusal already in the voice spec, listed here
because community-building pressure pushes toward all four):
1. "Who do you have tonight?" — engagement bait.
2. Reply-guy behaviour on other people's posts — off-mission and dilutes the account.
3. Giving out picks in replies to people who ask. The bot has no ability to publish a pick that
   did not clear the gate, and replying to a request is exactly that.
4. A follower-count milestone post. Nobody who matters is impressed, and it is the "more action"
   impulse the strategy triage rejects.

### Job 4 — Research input (real, but gated)

X is the fastest surface for injury news, lineup changes and beat-reporter information. That is
genuinely valuable for a market-reading model. It is also the fastest surface for rumours.

**The repo already has the right primitive:** `apps/web/lib/decision-genome/rumor-quarantine.ts`.
Any X-sourced signal goes through it or does not enter. The lane is specified in §5 and is
deliberately last.

---

## 3. Two doctrine conflicts that must be fixed before the bot posts

Found during reconnaissance. Both are in the *existing* templates, so they are live defects the
moment the transport ships.

### Conflict 1 — the spec renders confidence as a percent

`pick-publication.ts` produces:

> `Published BOS -3.5 at 73% confidence (SOLID_PLAY).`

That spec predates the 2026-09-13 measurement (`AGENTS.md`): `confidence` is a weighted factor sum
whose 80+ band claims 0.8663 and realizes **0.5191** (z = −10.7). A percent on the *widest-reach
surface the product owns* asserts a win probability the number demonstrably is not — and unlike the
app, a tweet cannot be recalled.

**Fix:** render `72/100` and say "score". Correct the spec and the template together, and add an eval.

### Conflict 2 — the spec permits ✅/❌/⚖️; the design contract forbids emoji

The voice spec calls them "the only emojis the bot uses". `DESIGN.md` mandates W/L/P/V monograms
and says "emoji ≈ zero"; `apps/web/lib/positioning-vocab.json` plus `scripts/guardrails/trust-gate.mjs`
enforce the ban. Both cannot be right.

**Resolution — a documented, single-use exception.** Settlement glyphs are permitted **only on the
settlement lead post**, and nowhere else, for a platform-specific reason: at timeline scale a
monogram is illegible and the platform's own convention for outcome carries meaning that a letter
does not. Every other post uses the sanctioned data glyphs (↑ ↓ − · →). The exception is written
into the voice spec with its boundary, and an eval asserts a glyph does not appear on any other
event kind.

---

## 4. Revenue on X — an honest reading

| Option | Verdict | Reasoning |
|---|---|---|
| Sportsbook affiliate links | **Reject** | `platform-gaps-triage.md` § 🛑 is explicit: co-branded sportsbook checkout "turns us into a tout funnel that pushes wagering". An honest, clearly-labelled disclosure link is the *most* that would ever be considered, and it is founder-gated. |
| Sponsored posts | **Reject** | The account's value is that it has no reason to lie. Sponsorship prices exactly that. |
| X Premium / subscriptions revenue share | **Not a business** | Payouts are trivial at any realistic follower count, and the programme requires a paid tier. |
| Driving app subscriptions (IAP) | **The actual revenue path** | X is top-of-funnel for the App Store listing and the web pricing page. Measured as: link clicks → store page views → trials. |
| Creator/contributor programme (multi-contributor House picks) | **Founder-gated, and phase-appropriate** | `docs/product/phase-6-plus-planning.md` Item 2 specs it. It requires a solo creator layer that has run 6+ months first, plus a revenue-split decision. Not a v1 build, and building the tooling now would be building for a decision that has not been made. |
| B2B / data licensing visibility | **Real, second-order** | The same posts that demonstrate methodology rigour are the ones an institutional buyer reads. No product work; just do not hide the record. |

**The honest summary:** X is a distribution and trust channel for this product, not a revenue
channel. Any X revenue model that works is one where the account's credibility is the asset — which
means the model must never be the thing that spends it.

---

## 5. The research lane — X as a signal source

Safe only with a strict pipeline, and the pipeline is the deliverable:

```
X post (beat reporter, injury news)
  → decision-genome/rumor-quarantine.ts   (existing; quarantines unverifiable claims)
  → source-rights registry                (existing; what may be read and how used)
  → corroboration requirement: >= 2 independent sources OR an official team statement
  → THEN, and only then, a signal category for the engine
```

**Three rules that make this safe:**

1. **No X-sourced signal may be the sole basis for a published pick.** Corroboration is required.
   A single reporter's claim moves a line, and moving lines are exactly what this model reads — so
   an uncorroborated rumour would become a self-fulfilling input.
2. **The timestamp is the signal, not the claim.** "This was reported 40 minutes before the line
   moved" is measurable and useful. "This report is true" is not something X can tell us.
3. **Nothing X-sourced is ever quoted.** The engine consumes a signal category, never text, both
   for rights reasons and because a rumour rendered as prose is a rumour the product now appears
   to endorse.

---

## 6. What to build, and in what order

| # | Build | Why in this order |
|---|---|---|
| 1 | **Transport** — OAuth 1.0a signer, API v2 client, rate limiter, idempotent sender, `MUTE_BOT` honouring, attempt logging | Without it nothing posts and every other item is theory. |
| 2 | **Fix the two template conflicts** + evals | Must land *with* the transport, or the first post ships the error. |
| 3 | **Wire the outbox to a scheduler** (Vercel cron, matching the repo's existing 22 schedules) | The planner exists; it needs a clock. |
| 4 | **Community cadence** — weekly calibration post, autopsy thread, model changelog | Turns the account from a settlement log into a surface people follow. |
| 5 | **Measurement** — referral attribution from post → store page → trial | Without it, "did X work" is a feeling. |
| 6 | **Research lane**, through rumor-quarantine | Last, because it is the only item that can damage the model rather than the account. |

### Transport specification

- **Auth:** OAuth 1.0a user context (HMAC-SHA256). A signer is pure, deterministic, and unit-testable
  on any host — no network needed to verify the signature algorithm against RFC 5849 test vectors.
- **Endpoint:** `POST /2/tweets`, with `POST /2/tweets` + `reply.in_reply_to_tweet_id` for threads.
- **Rate limits:** honour `x-rate-limit-remaining` / `x-rate-limit-reset` from the response headers
  rather than a hardcoded ceiling; the account's tier determines the real limit and a stale
  constant is how a bot gets muted by the platform.
- **Idempotency:** the planner already emits an `idempotencyKey`. The transport records it BEFORE
  sending and checks it before sending, because the failure mode is "posted twice after a timeout",
  not "posted never".
- **`MUTE_BOT`** is checked at send time, not at schedule time. A mute that only takes effect on the
  next cycle is not a mute.
- **Logging:** one row per attempt with outcome, so `AgentRunLog` answers "what did it post".
- **Account hygiene from the spec is automated, not aspirational:** the bot follows nothing, likes
  nothing, and retweets nothing. A test asserts the transport exposes no such call.

---

## 7. Metrics that matter (and the ones that do not)

**Matter:** referral clicks to `/room/*`, store page views attributable to X, trials started, first
repeat visit rate, and the ratio of settlement posts to publications (a healthy feed is roughly
1:1 over a season — a feed that is mostly wins means losses are being suppressed).

**Do not matter:** follower count, impressions, likes. Each of them is trivially gameable by
engagement bait, which is the one thing the voice spec forbids outright. A metric you are not
allowed to optimise for is not a metric.
