# workers/twitter-bot — the X transport

**What this is.** The missing half of the GSE X bot. Everything up to the HTTP call already
existed (`apps/web/lib/twitter-bot/*` for the templates, `apps/web/lib/bot-outbox/*` for planning,
idempotency keys and the compliance gate, `apps/web/app/cockpit/bot-outbox/` for operator review).
This is the call.

```
oauth1.js        OAuth 1.0a request signing (HMAC-SHA256, or SHA1 where required)
x-client.js      POST /2/tweets, rate-limit header parsing, structured attempt log
sender.js        MUTE_BOT, idempotency, thread chaining, outcome classification
*.test.js        41 tests, including the RFC 5849 section 3.4.1.1 base-string vector
```

```sh
node --test --test-concurrency=1 *.test.js
```

---

## The four rules, and the failure each one prevents

### 1. `MUTE_BOT` is checked at SEND time

Not at schedule time. A mute that takes effect on the next cycle leaves everything already planned
free to go out, which means it is not a mute.

Only the literal `"true"` (case- and whitespace-insensitive) mutes. A typo'd value such as `"yes"`
or `"1"` does **not** mute, and that direction is deliberate: the check is strict so the exact
spelling documented here is the only thing that works, rather than a guess at what an operator
might have meant. A test pins it.

### 2. The idempotency key is recorded BEFORE the request leaves

The failure that matters is not "posted never". It is **"posted twice after a timeout"**: the
request succeeded, the response was lost, the job retried. Recording the key afterwards cannot
distinguish that from a failure, so a retry duplicates a public post.

Recording first means a lost response is classified `UNKNOWN` and **not retried**. A test asserts
the ledger contains the key at the moment the HTTP call is made.

### 3. A thread is not atomic, and the outcome says so

If post 3 of 6 fails, posts 1 and 2 are public and permanent. There is no rollback. So:

- The whole thread is validated **before any of it is sent** — discovering post 6 is too long after
  five are live is not a recoverable state.
- A failure mid-thread returns `PARTIAL` **with the ids that landed**. A caller that believes the
  thread failed entirely will re-post it. The fix for a partial thread is a follow-up reply, never
  a duplicate.

### 4. Rate limits come from the response, never from a constant

`x-rate-limit-remaining` and `x-rate-limit-reset` are the authority. The ceiling depends on the
account's tier, and a stale constant in the optimistic direction is how an account gets throttled
by the platform instead of by us. Note `reset` is in **seconds**; treating it as milliseconds
yields a reset time in 1970 and an immediate retry loop.

---

## Outcomes

| Outcome | Meaning | What the caller should do |
|---|---|---|
| `sent` | Posted. | Record the id. |
| `muted` | `MUTE_BOT=true` at send time. No request was made. | Leave queued. |
| `already_sent` | The idempotency key was already used. | Nothing. |
| `rate_limited` | 429 or 5xx. Carries `retryAfterSec`. | Retry after the delay. |
| `partial` | A thread landed some posts. Carries `tweetIds`. | **Never** re-post the thread. |
| `failed` | A definitive API rejection. | Surface to the cockpit. |
| `unknown` | The request left; the response did not arrive. | **Do not retry.** A human decides. |
| `invalid` | A thread post was empty or over 280 characters. | Fix the copy. |

`unknown` is the most important row on that table. It is the honest answer when the outcome is
genuinely unknowable, and the safe one: a duplicate post to a public account is worse than a
missing one.

---

## Account hygiene is enforced by absence

The voice spec says the bot follows, likes and retweets **zero** accounts. `XClient` therefore has
exactly one mutating method — `postTweet`. There is no `follow`, `like`, `retweet`, `unfollow`,
`unlike` or `delete`, and a test asserts the prototype surface contains none of them.

A capability that does not exist cannot be called by a future change that did not read the spec.

---

## Wiring it up (not done yet)

1. **Credentials.** Four values from the X developer portal, for the `@GalaxySportsAI` account:
   `X_CONSUMER_KEY`, `X_CONSUMER_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`. Store them as
   environment variables, never in the repo. Read them with the same `$$ENV` indirection the rest of
   the platform uses.

2. **The ledger.** `MemoryLedger` is for tests only. The real one needs a `BotOutboxRecord` write
   before the send and an update after — the table already exists and already carries an
   `idempotencyKey` from `apps/web/lib/bot-outbox/plan.ts`.

3. **The scheduler.** The planner exists and produces the outbox; it needs a clock. The repo has 22
   Vercel cron schedules already; this is one more.

4. **The two template corrections.** `apps/web/lib/twitter-bot/templates/pick-publication.ts` has
   been fixed (confidence as a score, and a duplicated pick line). The settlement-glyph question in
   `docs/product/twitter-bot-voice-spec.md` is still open and is an owner decision — see
   `docs/mobile/X_COMMUNITY_STRATEGY.md` section 3.

---

## What is NOT here

- **No reply-reading, no mentions, no engagement.** The voice spec refuses all of it, and the
  community strategy argues for keeping that refusal.
- **No scheduling logic.** This sends what it is given.
- **No media upload.** `post/2/tweets` with text only; the strategy notes images as a later step.
- **No retry loop.** Outcomes are returned, not retried internally. Retry policy belongs to the
  caller, which knows whether a given post is still worth sending an hour later.
