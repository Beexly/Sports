# Triage — 10 uploaded discovery/research artifacts, 2026-08-26

Session `claude/gse-week1-launch-bh0nqo`. Everything below was checked in this
container; nothing is taken on the documents' own word.

## Verdict in one line

**One of the ten advances the live hypothesis. The wind/weather prop mapping is
the first artifact this session has seen that names specific, quantified,
testable PROP effects — and its input side is already legally cleared. It is
blocked by exactly the same missing input as everything else: historical player
prop lines.** The ~50 repos are, with two exceptions, irrelevant to a Sept 3
deadline.

## 1. VERIFICATION FAILURES FOUND

### `vercel/og` does not exist — and it is marked ADOPT

`git ls-remote https://github.com/vercel/og` → **fails**. 36 of the 37 repos I
checked resolve; this one does not. OG image generation lives in the `@vercel/og`
npm package inside `vercel/next.js`, and the renderer is `vercel/satori`.

Category C states: "12 verified repos (all exist live, no exclusions hit)…
**All verified via web search + URL confirmation.**" That claim is false for at
least one entry, and the false entry carries an ADOPT verdict. Treat every
"verified" in these documents as unverified until re-checked.

### `nfl_backtest.py` is not a backtest

18 lines. It imports six packages, records which are present, and writes the
result to `C:/Users/Garrett/AppData/Local/hermes_nfl_cache/pkg_check.txt`. It is
a package-availability probe on a Windows path. No backtest, no data, no model.
Nothing to run and nothing to review.

### EDGE_LEDGER cites 8 files; 7 are not in this repo

It presents 10 numbered items as "file:line verified". Checked:

| cited file | in repo? |
|---|---|
| `NFL_BETTING_EDGES.md` | **NO** |
| `docs/nfl-osint-props-research.md` | **NO** |
| `NFL-coaching-tendencies-prop-edges.md` | **NO** |
| `NFL_BETTING_REPOS_CODE_DEEP_DIVE.md` | **NO** |
| `NFL_depth_chart_snap_count_edges.md` | **NO** |
| `handoff/H1_RESEARCH_2026-08-23.md` | **NO** |
| `nfl_altitude_research.md` | **NO** |
| `SWARM_RECOVERY.md` | yes |

The line references may well be correct wherever those files live. They cannot
be checked here, so the ledger's claims are `MISSING: 7 of 8 EDGE_LEDGER source
files` — recorded as asserted, not as verified. Same posture as the crawl4ai
artifacts.

### `.hermestmp.DsupzV` is a fuller DRAFT of the wind doc, not a duplicate

Same 148 lines, different bytes (11,787 vs 11,443). The **temp file is the
better source** — finalizing trimmed real specificity:

- "individual props under-adjust **across the board**" → "under-adjust"
- "lateral drift — **biggest kicker risk**" → "lateral drift"
- "for the **downfield** team" → "for the team benefitting"

If this research is kept, keep the temp file's text.

### Star counts are approximations presented as confirmations

Every figure in Categories B and C is prefixed `~`, yet Category B opens "All
links, stars/license/activity **confirmed** via GitHub/web search." I verified
existence only; I did not verify a single star count or licence. Neither,
apparently, did the source.

## 2. PRE-REJECTED FAMILY COLLISIONS

This session operates a reject-on-sight list. Three of the five Top
Recommendations hit it.

| item | rank | family | call |
|---|---|---|---|
| `gitroomhq/postiz-app` | **Top Rec #1** | GPL/AGPL embedded in GSE — **AGPL-3.0** | REJECT for embedding. Defensible ONLY as a separately-hosted service with no GSE code linked; the triage's own "AGPL caveat" is right but it should not be rank 1. |
| `bradautomates/content-ideas` | **Top Rec #5** | scraped-token gateway + social scraping | REJECT. Drives the ScrapeCreators API against X/Instagram/TikTok/YouTube. That is a third-party scraping service on social platforms — the same shape as the PFR issue already flagged this session. |
| `harry0703/MoneyPrinterTurbo` | Top Rec #2 | none (MIT) | Licence is fine. Relevance is not: AI short-video marketing, 8 days from kickoff, zero contact with either blocker. PARK. |
| `nflverse/nflverse-pfr` | Cat A #4 | GPL-3.0 | Cat A flagged this correctly — "do not embed in MIT stack". Agreed; REFERENCE only. |
| `sherlock-project/sherlock` | triage #5 | OSINT person-tracking | Already hard-rejected. Correct. |
| `per-simmons/ai-reply-guy` | triage #2 | X automation via browser injection | Already hard-rejected. Correct — `chrome.debugger` keystroke injection to defeat anti-spam is the definition of the banned pattern. |
| `10up/classifai` | triage #17 | WordPress-only plugin | Already rejected. Correct. |

The 18-URL triage is the strongest of the five documents: its ToS reasoning is
sound and it independently reached the same rejections the standing rules
require. Its ranking is where it slips.

## 3. THE ONE THING WORTH KEEPING

`NFLWindPropAdjustmentMapping.md` (use the `.hermestmp` draft) and
`nfl_altitude_research.md`.

**Why these matter and the repo lists do not:** this session established that
Door B — player props — is the only untested door, and that no priced test could
be run for want of prop lines. These documents propose *specific, quantified,
falsifiable prop effects*:

- passing yards ≈ **−0.7% to −0.9% per mph** (Claremont/Zipperman 2014, OLS on
  3,133 games 2002-13, visitor ≈ 2× home sensitivity)
- completion% 60.31% calm → **54.65%** at 20-25 mph
- mean attempted FG distance **−7 yards** at 20+ mph
- rushing **+30-40 yds / +5 FP** to the lead back at 25+ mph
- convexity: the 15→20→25 climb is ~1.5-2× the 10→15→20 climb

**And the input side is already cleared.** `open-meteo` is in the source-rights
registry with status **`approved_open_license`** (registry line 195-202). Wind
and temperature are legally ingestible today, no memo needed. That is a genuine
green light and it is rare in this repo.

### But the edge claim is unfalsified, and it is stated as fact

The document asserts: "totals and passing-touchdown lines adjust by 20+ mph, but
QB passing-yards and RB rushing-yards individual props **under-adjust across the
board — the persistent edge**."

That is an edge claim, not a finding. Wind is public, forecast days ahead, and
trivially available to every book. The prior that books ignore it on player props
while pricing it into totals needs evidence, and none is offered. Everything this
session learned applies verbatim: `targets` looked like a SURVIVOR at logM 91
until its base rate was corrected and it fell to 2.91.

**What would falsify it, precisely:** join historical player-prop lines to
game-time wind, bucket by the document's own bands, and test whether realized
outcomes beat the posted line in the high-wind buckets. If books price wind into
props, the buckets converge on breakeven and the hypothesis is KILLED cleanly —
which is a publishable result either way.

**It needs the same one input as everything else.** `getHistoricalEventOdds`
(`packages/data-ingestion/src/odds-api-client.ts:409`, "player props after
2023-05-03") is licensed, the key is live in production, and it has **zero
callers**.

## 4. RECOMMENDATION

1. **Do not act on the repo lists before Sept 3.** Of ~50 repos, the ones worth
   anything are already in use (`nflverse` is a cleared registry source and
   supplied this session's NGS data) or are ordinary utilities
   (`next-sitemap`, `schema-dts`, `rss-parser`) that no part of the Week-1 path
   is waiting on.
2. **Keep the wind/altitude research; re-file the temp draft as the canonical
   text.** It is the first credible prop-hypothesis generator in the pile.
3. **Build the `getHistoricalEventOdds` caller.** It converts the wind
   hypothesis, the `avgSeparation` survivor, and Door B generally from
   untestable to testable. It is one component and it is unbuilt, not blocked.
4. **Re-verify anything from these documents before relying on it.** One ADOPT
   pointed at a repo that does not exist; a file named `nfl_backtest.py`
   contains no backtest; 7 of 8 ledger citations are unresolvable here.
