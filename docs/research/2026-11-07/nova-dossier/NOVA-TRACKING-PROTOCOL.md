# Nova tracking — event protocol (binding on every agent)

Owner of this protocol: Motif. Ordered by Garrett, 2026-11-07 15:10 CT: Nova's growth, improvements, and performance are tracked automatically, in workflows, tested — never by Garrett, never from memory.

## The rule

Any agent that produces, posts, or retires a Nova artifact appends its entry to GROWTH-LEDGER.md (same folder) IN THE SAME RUN, before reporting the work done. An artifact that is not in the ledger does not count as produced. A public post that is not in the Performance Log with its URL does not count as posted.

## What gets an entry

Production Log — every generation or production run:
date/time CT · artifact filename · route/tool · cost (credits or free) · the exact line/script · status (IN PRODUCTION / HELD / REJECTED / SUPERSEDED / LIVE) · defects observed on review · Garrett's verdict when he gives one.

Performance Log — every public post:
post URL · platform · retrieval-dated metrics (views, likes, replies/comments, shares/reposts) · notes. Metrics are only ever entered from a real retrieval, never estimated. A metric that could not be retrieved is entered as "not retrieved" — never guessed.

Decisions & Changes Log — every change to her voice, style, spec, design, or rules:
what changed · who decided (Garrett's decisions only; agents propose, Garrett decides) · where the governing record lives.

## Weekly review (cron: nova-growth-review-weekly)

Reconciles this ledger against the artifacts on disk and the public posts, fills the Drift & Consistency Checks table, and writes the week's review file (tracking/reviews/YYYY-MM-DD-review.md). Discrepancies between the ledger and reality are flagged in the review, never silently fixed in past entries — corrections are appended as new entries.

## Hard boundaries

- Nothing posts publicly without Garrett's approval of the specific piece. Tracking never authorizes a post.
- This protocol tracks; it never changes Nova. Voice/style/spec/design changes are Garrett's decisions, recorded after he makes them.
- No AGY/Antigravity contact in any tracking step.
