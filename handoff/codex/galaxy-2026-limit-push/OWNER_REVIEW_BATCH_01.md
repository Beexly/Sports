# Owner-Review Batch 01 — bulk decisions

Source: the 721 `owner_review` items in `NORMALIZED_RESOURCE_LEDGER.csv`. These are gated
(no use until decided). This batch groups them so you can approve/reject in bulk.

## Headline finding

**There are no NEW real sports-stats data sources hiding in this queue.** The genuine
stats feeds (CFBD, balldontlie, ESPN public, henrygd, The Odds API, SportsDataIO,
Sportradar, …) are already captured in `apps/web/lib/scraping/sports-data-candidates.ts`
and the rights registry. The "sports_data" items here are mostly **copyrighted football
replays/highlights** and games — not facts. So this queue is a **cleanup**, not a
promotion goldmine: adopt ~12 content tools, reject/keep-gated the rest.

## Decisions (recommended)

### A. APPROVE as internal tooling — self-hosted content intelligence (~12)
Open-source RSS readers we RUN ourselves (same posture as Feedly, already approved) to
monitor sports news/content for the content engine + Airwave. No third-party-data rights
risk — they're tools, not feeds we republish.

`FreshRSS`, `Miniflux`, `CommaFeed`, `yarr`, `Fraidycat`, `Brief`, `Feedbro`, `HiveRSS`
(self-hostable) · `Inoreader`, `NewsBlur` (freemium hosted).

→ **Recommend: approve → move to approved_direct as operational tooling.** Prefer the
self-hostable ones to keep cost at $0.

### B. REJECT — copyrighted media (rights risk)
- **Replay / highlight / full-match sites** (9): Footballia, FullMatchShows,
  footballhighlights, FootballOrigin, SoccerFull, NFL Video, Time Soccer TV, HooFoot,
  MySoccerPulse. Copyrighted video — never ingest.
- **Media downloaders** (yt-dlp, JDownloader, gallery-dl, podcast-dl, PodcastToMP3,
  Qobuz downloaders, DownloaderForReddit, …): download copyrighted content.

→ **Recommend: reject (keep hard-gated). Do not adopt for the platform.**

### C. REJECT — out of scope for a sports-stats product
Dual-use/gray tools with no stats value:
- disposable email (72) · adblock (72) · OSINT (41) · deobfuscators (6).

→ **Recommend: reject / drop from active review.** Keep gated; no pursuit.

### D. DEFER — large general buckets, low sports value
- YouTube tools (259) · Reddit tools (129). Overwhelmingly general-purpose. A few
  *specific* assets could matter later (official team YouTube channels, sports subreddits
  for sentiment) — but those are **specific channels/subreddits**, not these tools.

→ **Recommend: keep gated.** Revisit only named sports channels/subreddits as concrete
sources, each through the source-provider gate.

## Net effect if you accept the recommendation

| Bucket | Count (approx) | Action |
|---|---|---|
| A — RSS reader tools | ~12 | approve as internal tooling |
| B — copyrighted media | ~30 | reject (rights risk) |
| C — out of scope | ~190 | reject / drop |
| D — general YouTube/Reddit | ~390 | keep gated, revisit specific assets only |
| (remainder) | rest | keep gated pending future, source-by-source |

The real stats-source work stays where it belongs: the CFB/NFL candidate registry, worked
one source at a time through the gate (CFBD next).

## To apply

Approvals here are recorded as decisions; promotion of bucket A means adding those tools
to the approved-direct allowlist (or adopting them in ops). Rejections keep items gated
(no code change needed). Tell me which buckets you accept and I'll apply them.
