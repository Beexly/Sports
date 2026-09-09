# Agent-Directory Submissions List — DRAFT (Agent 8, Marketing)

**Status: a list for a human to act on. Nothing here has been submitted by this
agent.** Per the mission brief, this doc is gated on Hermes's HP-1 (the `/ai.txt`
redirect fix): intel `LAUNCH/06-LLMS-AGENT-SURFACE.md`'s own header note says
production's `/ai.txt` currently 308-redirects to `http://localhost:3000/llms.txt`
— **do not submit or ping anything below until that is confirmed fixed**, because
a localhost redirect in the wild is worse than no listing (same doc, T+1H note in
intel `LAUNCH/11-LAUNCH-NIGHT-RUNBOOK.md`).

Verify before submitting: `curl -sI https://www.galaxysportsedge.com/ai.txt` and
`curl -sI https://www.galaxysportsedge.com/llms.txt` both return a clean
same-host response (not a localhost redirect).

## What actually needs no submission

`/llms.txt` and `/ai.txt` follow the same discovery model as `robots.txt`: AI
crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) check the well-known path at
your domain automatically once the files are live — there is no "submit" step
for the base standard. The items below are third-party **directories that list
sites known to publish an llms.txt**, which is a discoverability add-on, not a
requirement.

## Directories to submit to (verified reachable via web search 2026-09-08; confirm
the current submission mechanism on each site before using it — an agent should
not be trusted to have the current form fields memorized)

1. **llms.txt hub** — https://llmstxthub.com/ — a directory of AI-ready
   documentation and llms.txt examples. Has its own directory listing; check the
   site for a current "submit" or "add your site" link.
2. **llms-text.com directory** — https://www.llms-text.com/ — maintains a
   running list of sites using llms.txt; check for a submission form.
3. **llmstxt-site (GitHub)** — https://github.com/krish-adi/llmstxt-site — a
   community-maintained directory of llms.txt files in the wild. As of this
   writing the maintainer has moved from pull-request submissions to a form
   linked from the repo's README — use whichever mechanism the README currently
   documents, not a PR, since PRs may no longer be the accepted path.
4. **llmstxt.studio** — https://llmstxt.studio/guides/submit-llmstxt-ai-directories
   — publishes its own running guide to directories worth listing on; useful as
   a live, maintained source for additional targets beyond the three above,
   since directory lists in this space change faster than this doc can track.

## Exact text to submit (identical everywhere, sourced from the live `/llms.txt`
and intel `LAUNCH/01-LAUNCH-COPY-DECK.md` §1 — do not paraphrase per-directory)

- **Site name:** Galaxy Sports Edge
- **URL:** https://www.galaxysportsedge.com
- **llms.txt URL:** https://www.galaxysportsedge.com/llms.txt
- **One-line description (160c budget, matches `LAUNCH/01` §6 short bio):**
  "Sports-intelligence OS. Calibrated probability, hash-chained records, No-Bet
  by default. Find the signal before the market moves."
- **Category, if the directory requires one:** Sports / Sports Betting Analytics
  / Sports Data (pick whichever the specific directory's taxonomy offers — none
  of them are guaranteed to have the same categories).
- **Contact:** hq@galaxysportsedge.com

## What NOT to submit

Nothing implying a performance claim, win rate, or "AI-powered" framing — several
of these directories auto-generate a card from your `llms.txt` content, so the
`/llms.txt` file itself (Hermes/Hp-1 territory, intel `LAUNCH/06` §"FILE:
apps/web/app/llms.txt") is the actual source of truth for what a directory will
display. Confirm that file's live content passes the same do-not-say list
(`LAUNCH/01` §9) before any of these submissions, since a directory card is a
public surface too.
