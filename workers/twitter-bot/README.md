# workers/twitter-bot — Motif/Muse X Transport & Content Lanes

**What this is.** The X (Twitter) transport and content lane generator for **Motif/Muse** on **@GalaxySportsHQ** (NEVER grokbot).
Everything up to the HTTP call is planned and verified with zero hindsight:
- `apps/web/lib/twitter-bot/*` for base templates
- `apps/web/lib/bot-outbox/*` for planning, idempotency keys, and compliance gates
- `workers/twitter-bot/x-client.js` for API v2 posting, quote tweets, replies, and chunked media upload
- `workers/twitter-bot/sender.js` for `MUTE_BOT` checking, idempotency, and outcome classification
- `workers/twitter-bot/ledger.js` for persistent `BotOutboxRecord` ledger tracking
- `workers/twitter-bot/receipts.js` for settlement receipt tweets quoting original pre-game calls
- `workers/twitter-bot/content-lanes/sniper-replies.js` for high-signal chart replies under top NFL accounts

```
oauth1.js                         OAuth 1.0a request signing (HMAC-SHA1 & HMAC-SHA256)
x-client.js                       POST /2/tweets, media upload (INIT->APPEND->FINALIZE), rate limits
sender.js                         MUTE_BOT, idempotency, thread chaining, outcome classification
ledger.js                         BotOutboxLedger persistence, status tracking, UNKNOWN safety
receipts.js                       Settlement receipt quote-tweets (single settlement glyph)
content-lanes/sniper-replies.js   High-signal chart replies (@SamHoppen, @FantasyPtsData, @PattonAnalytics)
*.test.js, test/*.test.mjs        Comprehensive test suite (61 tests)
```

```sh
npm test
```

---

## The Four Rules, and the Failure Each One Prevents

### 1. `MUTE_BOT` is checked at SEND time

Not at schedule time. A mute that takes effect on the next cycle leaves everything already planned
free to go out, which means it is not a mute.

Only the literal `"true"` (case- and whitespace-insensitive) mutes. A typo'd value such as `"yes"`
or `"1"` does **not** mute.

### 2. The idempotency key is recorded BEFORE the request leaves

The failure that matters is not "posted never". It is **"posted twice after a timeout"**: the
request succeeded, the response was lost, the job retried. Recording the key afterwards cannot
distinguish that from a failure, so a retry duplicates a public post.

Recording first means a lost response is classified `UNKNOWN` and **not retried**.

### 3. A thread is not atomic, and the outcome says so

If post 3 of 6 fails, posts 1 and 2 are public and permanent. There is no rollback:
- The whole thread is validated **before any of it is sent**.
- A failure mid-thread returns `PARTIAL` **with the ids that landed**.

### 4. Rate limits come from the response, never from a constant

`x-rate-limit-remaining` and `x-rate-limit-reset` are the authority. Note `reset` is in **seconds**;
converting from seconds to ms is strictly handled.

---

## Media Upload & Quote Tweet Capabilities

- **Chunked Media Upload:** `uploadMedia(buffer, mimeType, mediaCategory)` implements the Twitter v1.1
  chunked media upload protocol:
  1. `INIT`: Reserves media ID with `command=INIT`, total bytes, MIME type, and media category.
  2. `APPEND`: Uploads 1MB–4MB chunks as multipart form data.
  3. `FINALIZE`: Finalizes the upload.
  4. `STATUS`: Polls processing status for videos or asynchronous media until succeeded or failed.
- **Quote Tweets:** `postTweet({ text, quoteTweetId })` quotes the target tweet ID directly via API v2 `quote_tweet_id`.
- **Settlement Receipts:** Quotes the original timestamped pre-game call tweet to prove 0 hindsight.
  Single settlement glyph rule: Exactly one settlement glyph (`W`, `L`, `PUSH`, or `⚖️`) on lead post.
- **Zero External Links in Root:** Root tweets avoid external links to eliminate X's 50–80% link suppression penalty.
  Dossier/room links are reserved for sub-replies or bio.

---

## Governed Dispatch Gate

To prevent accidental public posts while enabling legitimate operator and content lane dispatch:
- Scripts under `scripts/` must implement a Governed Dispatch Gate: requiring explicit dry-run flags (`--dry-run` / `dryRun: true`) or environment approval (`MUSE_X_PUBLISH_APPROVED=true`).
- The core engine (`apps/`, `packages/`) remains strictly forbidden from ever importing or reaching the transport.

---

## Agent Routing & Identity

- **Agent:** `motif-muse`
- **Account:** `@GalaxySportsHQ`
- All logs, ledger rows, and events emit `{ agent: "motif-muse", account: "@GalaxySportsHQ" }`.
