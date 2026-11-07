# ALL OF TODAY'S RESEARCH — ONE FILE — Thursday, October 29, 2026

Everything from today's sweeps in one place: Instagram AM run + deep dive, the 45-minute midday push (Instagram 30, X deeper pass, X reproduction checks, trending scan + deep dive, keyword explores on both platforms), plus a closing deep dossier on codebase-memory-mcp. All sections complete.

## READ THIS PART ONLY — THE SCORECARD

**Volume:** Instagram: 50 posts dissected (20 AM + 30 midday), 0 rate limits on the midday run. X: 40 posts dissected (22 first run + 18 deeper) + 5 published stat claims recomputed from real data. Trending: 13 GitHub/HF items scanned, 6 deep-dived. Keyword explores: 50 terms searched across X and Instagram, ~74 candidates captured, top ones verified.

**The 8 things that actually matter:**
1. **Headroom** (78K stars) — compresses agent context locally and reversibly. TEST first. (IG deep dive)
2. **Cloudflare security-audit-skill** — run it scoped on the Sports repo with your 59 gitleaks hits as evidence; it turns the credential sitting into proven verdicts. TEST. (Trending deep dive)
3. **Opik** (23K stars) — agent tracing with a built-in agent that root-causes failures and turns them into regression tests. TEST. (IG midday A)
4. **Claude SEO** (23.9K stars) — full site audits inside Claude Code in ~15 min. A Kit sales artifact and a GSE visibility tool. TEST. (IG midday B)
5. **The @KoalatyStats funnel chart was 4/5 right and 1/5 wrong** — recomputed from nflverse: Detroit does NOT allow the highest pass-rate-over-expectation (Miami does). The wrong number was invisible until recomputed. (X reproduction)
6. **Catchable Ball Rate cannot be built from public data** — it's human charting (SIS/ESPN). The one stat class the engine can't synthesize. (X deeper)
7. **Magnemo** — agent memory where nothing becomes memory until a human approves it. Your memory doctrine as a product. FLAG for deep dive. (X explore)
8. **LineOfEvidence Sim Lab** — play-by-play sims flipping box-score models in public (Carolina over Green Bay). Your doctrine, reproducible from your warehouse. FLAG. (X explore)

**Corrections caught today:** DFS Army's "232,000 lineups" is publisher-stated, not public data. AgentScout is a 2,060-tool directory, not "189 templates." The NVIDIA "dataset from TV footage" claim doesn't match the verified announcement. "safemcp" is five same-name repos — ambiguous, don't trust the name. YouPi-PG's license field is empty — nothing touches it until read.

**Still UNVERIFIED, stated plainly:** @the_waldman's +23.8 units. SumerSports' 55% equilibrium method (not findable).

**Resolved at close (Part 11):** the anytime-touchdown splits hold — 33% of rushing TDs from the 1-yard line reproduced exactly, the rest close, method point fully supported. The Kimi K3.1 Pro caption claims are Moonshot's own numbers, accurately captioned (weights promised by Nov 4, not yet out; the Terminal-Bench figure is vendor-run — Artificial Analysis independently scores it 55). codebase-memory-mcp is real (47,781 stars) — its honest figure is 10x fewer tokens from its own arXiv preprint, not the 99% its post claimed. Onyx's license is mixed, not the clean MIT its caption claimed.

---

# PART 1 — INSTAGRAM, MORNING RUN (20 posts)

# Instagram For You discovery sweep — 2026-10-29 AM

Account: @gbeexly. Surface: Instagram home For You / Suggested feed (browser capture 10:33–10:39 CT, inventory: `raw/2026-10-29-AM-feed-inventory.md`). Feed: **35 organic posts + 9 ads excluded**. Duplicates skipped: **2**. New posts available: **33**. Selected and dissected: **20** (inventory #2–#19, #21, #22, in feed order). 13 further new posts (#23–#35) were inventoried but not selected — they sit past the 20-post cutoff and remain unindexed for a future run.

**Platform limit hit:** instagram-cli returned 429 on the 5th `post` call (inventory #6). Per protocol, ALL instagram-cli calls stopped at that point and were never resumed. Posts #2–#5 were read from full CLI post JSON (saved in `raw/2026-10-29-AM/`); the other 16 selected posts were read from stored annotation records (hatch-zeitgeist `--raw`, saved as `.zg.json` beside them) plus the feed inventory. Media-understanding and comment fetches completed for **0 of 20** — comment analysis below is limited to counts and caption-visible gate patterns. That is the run's main gap, and it is recorded, not papered over.

## Executive section — strongest finds first

1. **Zero Breach Toolkit — TEST.** @archive.genocide's release post names the real repo in the caption: **github.com/interplains/Zero-Breach-Toolkit** — verified: 3,296 stars, 361 forks, Apache-2.0, created 2026-10-25, pushed 2026-10-29. Offline scanner for traces of known mercenary spyware across Windows/macOS/Linux/Android/iPhone backups. Direct fit for Garrett's Family Shield lane. The "12,100 traces" figure is the creator's number (UNVERIFIED); the repo's existence, purpose, and license are verified. Four days old — sandbox-first, never run on a primary machine untested.
2. **Univer — TEST.** @gittrend.io reel; repo **github.com/dream-num/univer** verified: 22,784 stars, 1,912 forks, Apache-2.0, pushed 2026-10-29 (numbers corrected in the addendum below — an early read caught stale search-index figures). It now bills itself as "The Office Harness for AI Agents" — spreadsheets, docs, slides, canvas, relational tables, and PDF in one runtime, so agents and users edit the same files inside your own app. Candidate for future GSE/ARE surfaces (boards, packets, client deliverables) when a sheets surface is actually needed.
3. **Self-improving trading-bot architecture — LEARN-ONLY.** @arwazaz_'s carousel caption carries the full design in the open: research agents → strategy generation → backtest + out-of-sample + robustness → one-change-at-a-time self-improvement loop with version control → risk controls → paper trading. It mirrors GSE's own validation discipline. The actual repositories and build plan sit behind a "Comment ROADMAP" gate and were NOT obtained (no commenting, per standing rules).
4. **OpenNavo — WATCH (finding corrected in the addendum below).** @gittrend.io's reel pushes "OpenNavo" (Homebrew as a one-click Mac app store) behind a "comment brew" gate. My first GitHub search returned zero repositories and the original draft of this report called it non-existent — that was wrong. The repo **github.com/opennavo/OpenNavo** exists: 69 stars, 2 forks, GPL-3.0, pushed 2026-10-29 — it was created/indexed inside the sweep window itself, which is why the first search missed it. Real but brand-new and tiny; the gate was hiding a real, immature project, not a phantom.
5. **Two offensive tools cataloged as threat awareness only — CONTEXT-ONLY.** ZOON (@dayofexploits — IP-based victim location/device tracker; no matching repo resolved on GitHub) and WishFish (@dayofexploits — front-camera-grabbing phishing links; repo kinghacker0/WishFish verified, 1,304 stars, stale since 2023). Both conflict with Garrett's defensive-only rules and his no-live-location-tracking refusal. They are in the record so the techniques are recognized, never adopted.

No ADOPT verdicts this run: the two TEST items both need hands-on evaluation first, and everything else is a pattern, a gate, or context.

## Per-post dossiers (feed order)

### #2 — @dayofexploits — carousel — ZOON
- URL: https://www.instagram.com/p/De7bDCrEw3a/ · Media 18115391663035828 · 221 likes, 2 comments (CLI post JSON, `raw/2026-10-29-AM/De7bDCrEw3a.json`)
- Content (caption, verbatim payload): "ZOON — This tool tracks the victim's location and collects victim device information from the IP address," wrapped in an educational-purposes disclaimer and a 25-hashtag offensive-security tag block (#kalilinux #metasploit #nmap …).
- Verification: GitHub name search for ZOON surfaces no matching tool (top results are Zooniverse/unrelated). Repo identity UNVERIFIED.
- Lane fit: none for adoption — live location tracking of people is a standing refusal. Defensive value only: know the technique exists.
- **Verdict: CONTEXT-ONLY** (threat awareness).

### #3 — @quantscience_ — photo — no caption
- URL: https://www.instagram.com/p/DfFVOetH50Y/ · Media 18013893773986999 · 1 like, 0 comments (CLI post JSON)
- Content: caption is empty; the payload is inside the image, which was not read this run (media-understanding never ran — 429 stop). @quantscience_ is a quantitative-finance account, so the image is presumably a chart/result graphic — that is inference, labeled as such, not a read.
- **Verdict: CONTEXT-ONLY** with an explicit gap: image payload unread. Closes when media-understanding runs in a later pass.

### #4 — @itstundeanthony — reel — "erase" gate
- URL: https://www.instagram.com/p/DfC10ExiGYa/ · Media 18019331699957109 · 2,013 likes, 410 comments (CLI post JSON)
- Content (full caption): "Comment 'erase' for the setup guide 👇 @david_knowsai #ai". The entire payload — apparently an AI erase/background-removal setup from @david_knowsai — is behind the keyword gate. 410 comments on a 2-line caption is the gate pattern: comments are overwhelmingly the keyword, not discussion (inferred from the caption's design; comment bodies were not fetched — 429 stop).
- Verification: nothing to verify — no tool is named in the post itself.
- Lane fit: if the underlying tool is a free AI eraser, it would fit content-production cleanups; unknowable without the gated guide.
- **Verdict: LEARN-ONLY** (gate pattern cataloged; payload not obtained, by rule).

### #5 — @angus.sewell — reel — brand commentary + "launch" gate
- URL: https://www.instagram.com/p/DfFQH_VRtmo/ · Media 17915261964498676 · 235 likes, 132 comments (CLI post JSON)
- Content (full caption): a critique of brands that go corporate and water down the positioning that made them — "Hims and Hers would be another great example… They went all 'we hate big Pharma' and then proceeded to become big Pharma themselves." Ends with "comment 'launch' and I'll send you the prompts" — the prompt payload is gated.
- Lane fit: the brand lesson is real for Kit/ARE positioning work — anti-incumbent positioning dies when you become the incumbent. The gated prompts are not obtained.
- **Verdict: LEARN-ONLY.**

### #6 — @arwazaz_ — carousel — self-improving trading bot architecture
- URL: https://www.instagram.com/p/De2EFbZjBHi/ · 5,707 followers · 1,775 likes, 1,899 comments (stored record, `De2EFbZjBHi.zg.json`) — comments exceeding likes is the ROADMAP-gate signature.
- Content (caption carries the architecture in the open): AI research agents → real market data + feature engineering → strategy generation as Python code → backtesting, out-of-sample testing, robustness checks → controlled self-improvement loop (analyze results, test one change at a time, compare against baseline, version control) → risk management + broker integration → paper trading, monitoring, deployment. The complete build plan, GitHub repositories, and implementation sequence are behind "Comment ROADMAP."
- Verification: no repo is named in the open caption, so nothing to resolve; effectiveness claims are the creator's (UNVERIFIED).
- Lane fit: direct conceptual mirror for the GSE engine's calibration discipline and for any future trading-adjacent research — the validation-first loop design is the takeaway, not the gated code.
- **Verdict: LEARN-ONLY** (gated payload not obtained, by rule).

### #7 — @gittrend.io — reel — Univer
- URL: https://www.instagram.com/reel/DfFAAhWiRDu/ · 180,810 followers · 230 likes, 11 comments · posted 2026-10-29 05:24 (stored record)
- Content (caption): "Univer is a free, open-source toolkit that lets you build spreadsheets, documents, and slides straight into your own app — so your AI agents and your users work on the same files."
- Verification (primary source): **github.com/dream-num/univer** — 22,784 stars, 1,912 forks, Apache-2.0, pushed 2026-10-29T10:41Z (direct repo read; see addendum — an early search-index read showed stale 11,360/1,596 figures). The caption's description matches the repo's own positioning ("The Office Harness for AI Agents"). "Free" = open-source Apache-2.0 (verified); the project also sells enterprise tiers (noted from the repo's public positioning — tier pricing not fetched this run).
- Lane fit: a real candidate when GSE or ARE needs an in-app sheets/docs surface that agents and Garrett edit together. Heavyweight SDK — adopt at need, not speculatively.
- **Verdict: TEST.**

### #8 — @mlb — photo — World Baseball Classic / World Series champion
- URL: https://www.instagram.com/p/DfECruPtam2/ · 13.67M followers · 473,590 likes, 1,571 comments (stored record)
- Content (caption): "WORLD BASEBALL CLASSIC CHAMP ✅ / WORLD SERIES CHAMP ✅ / TAKE IT IN, WILLIAM CONTRERAS, YOU'RE THE ULTIMATE WORLD CHAMPION TONIGHT."
- Lane fit: GSE covers MLB in season; a champion-narrative data point for content context only. No tool, no claim to verify beyond the post itself.
- **Verdict: CONTEXT-ONLY.**

### #9 — @archive.genocide — reel — Zero Breach Toolkit
- URL: https://www.instagram.com/reel/DfAkXOeIRBm/ · 407,928 followers · 110,404 likes, 1,222 comments (stored record)
- Content (caption names the payload directly): "We have released Zero Breach Toolkit, our second free open sourced tool capable of detecting over 12,100 traces of Israeli & other spyware on your devices. It works on Windows, Linux, Mac, Android and Iphones. You can download it here: https://github.com/interplains/Zero-Breach-Toolkit … It never writes to disk, connects to the internet, or ask for admin rights, it takes around 10-15 minutes to run."
- Verification (primary source): **github.com/interplains/Zero-Breach-Toolkit** — real: 3,296 stars, 361 forks, Apache-2.0, created 2026-10-25, pushed 2026-10-29T15:05Z. Repo description confirms: "Free, open-source, offline checks for traces of known mercenary spyware. Works on Windows, macOS and Linux, Android phones and iPhone backups." The 12,100-traces count and the never-writes-to-disk claim are creator statements (UNVERIFIED at code level — no code audit this run).
- Lane fit: Family Shield, directly. A four-day-old security tool from an activist archive account is exactly the class of thing to run in a sandbox first and read before trusting.
- **Verdict: TEST** (sandbox-only first pass).

### #10 — @fuckjerry — reel — "Team work"
- URL: https://www.instagram.com/reel/DfD43mlhtYR/ · 16.73M followers · 157,004 likes, 535 comments (stored record). Credit: @meishellnicole.
- Content: two-line caption ("Team work 💯"); the payload is the video itself, a comedy clip. No spoken/on-screen payload recovered (stored understanding empty).
- **Verdict: CONTEXT-ONLY** (entertainment; feed-composition signal only).

### #11 — @chiefgyk3d — photo — no caption
- URL: https://www.instagram.com/p/DezDUl1R8hE/ · 82,525 followers · 503 likes, 11 comments (stored record)
- Content: no caption; tagged AI content in the inventory. The image payload was not read (no stored understanding; media-understanding blocked by the 429 stop). Nothing about this post can be honestly stated beyond its existence and engagement counts.
- **Verdict: CONTEXT-ONLY** with an explicit gap: image payload unread.

### #12 — @houseofhighlights + @bleacherreport — reel — LeBron reaction
- URL: https://www.instagram.com/reel/DfD3ezoNn3K/ · 51.04M followers · 171,455 likes, 2,471 comments (stored record)
- Content (caption): "Bron couldn't believe it 💀" — a courtside reaction clip.
- Lane fit: NBA content context for GSE social awareness; nothing actionable.
- **Verdict: CONTEXT-ONLY.**

### #13 — @thetradingfraternity — reel — Anthropic/biotech claim
- URL: https://www.instagram.com/reel/DfDm-KKPmsL/ · 456,936 followers · 6,606 likes, 166 comments (stored record)
- Content (caption, full): "Anthropic just bought a 1 person biotech…that is a faceless twitter account lol the other company they are working with is founded and chaired by the same founder and chair of MRNA. Jensen even got some shares. I hope you're paying attention."
- Verification: no company named, no source linked; the claim is UNVERIFIED market gossip in this form. Not checked further because the post names nothing checkable.
- **Verdict: CONTEXT-ONLY** (claim labeled UNVERIFIED).

### #14 — @gittrend.io — reel — OpenNavo
- URL: https://www.instagram.com/reel/DfAWKNnjB9n/ · 180,810 followers · 420 likes, 23 comments (stored record)
- Content (caption): "Comment 'brew' and I'll send you the repo link. OpenNavo turns Homebrew into a one-click app store on your Mac, with release notes and undo-able uninstalls." Hashtags: #homebrew #macos #opensource #rust #tauri.
- Verification (primary source): **github.com/opennavo/OpenNavo** — 69 stars, 2 forks, GPL-3.0, pushed 2026-10-29T15:13Z; description matches the caption ("free, open-source Homebrew GUI for Mac: installs and updates Homebrew apps in one click"). A sibling repo (opennavo/opennavo-design, MIT) also exists. CORRECTION: the first search this run returned total 0 and the original draft reported the name as non-existent — the repo was created/indexed during the sweep window; the later direct search resolves it. The repo link was still behind the comment gate and was not obtained from the post; the repo was found by name search.
- Lane fit: a Homebrew GUI would be a minor Mac-side convenience (Garrett's Windows host is the fleet's second machine; low relevance), and at 69 stars it is unproven.
- **Verdict: WATCH** — real, but days old and tiny; maturity and safety unestablished.

### #15 — @pjtradesnq — reel — trading emotion post
- URL: https://www.instagram.com/reel/DfD6GpPu2mn/ · 279,060 followers · 6,899 likes, 395 comments (stored record)
- Content (caption): "God be with us all 🙏🏻 #news #breakingnews #ai #internet" — an NQ futures-trading account reacting to news; the payload is the video, not recovered.
- **Verdict: CONTEXT-ONLY.**

### #16 — @quantscience_ — carousel — no caption
- URL: https://www.instagram.com/p/DfE-_PLmHgA/ · 42,877 followers · 17 likes, 0 comments (stored record)
- Content: carousel with an empty caption; slide payloads not read (no stored understanding; media-understanding blocked by the 429 stop). Second @quantscience_ item this run with an image-only payload.
- **Verdict: CONTEXT-ONLY** with an explicit gap: slide payloads unread. Closes when media-understanding runs in a later pass.

### #17 — @dayofexploits — photo — WishFish
- URL: https://www.instagram.com/p/DehqrYXlvC7/ · 60,816 followers · 204 likes, 4 comments (stored record)
- Content (caption payload): "Using the WishFish tool, you can generate different phishing links for wishing or custom sites that can grab victims' front-camera pictures and also give you a lot of information about the target IP address," plus the standard educational-purposes disclaimer.
- Verification (primary source): **github.com/kinghacker0/WishFish** — 1,304 stars, description matches ("Powerful Tool to Grab Front Camera Snaps Using A Link"), last pushed 2023-03-19 — real and stale.
- Lane fit: none for adoption — a phishing/camera-grab tool is offensive kit, outside Garrett's defensive-only rules. Threat-awareness value: recognize WishFish-style links.
- **Verdict: CONTEXT-ONLY** (threat awareness).

### #18 — @esim3400 — reel — Brewers World Series post
- URL: https://www.instagram.com/reel/DfECbUpAclR/ · 913,227 followers · 44,960 likes, 85 comments (stored record)
- Content (caption): "BREWERS WIN THEIR 1ST EVER WORLD SERIES! #baseball #mlb #fyp" — a celebration post from a gaming/simulation-style account. Whether it depicts a real result or a simulation is not established by the post's stored record; treated as entertainment content, not as a verified sports result.
- **Verdict: CONTEXT-ONLY.**

### #19 — @restructureai — reel — "Private AI Operating System"
- URL: https://www.instagram.com/reel/DfEBpHnAatB/ · 29,120 followers · 295 likes, 309 comments (stored record) — comments exceeding likes suggests a gate or a prompt thread, but comment bodies were not fetched (429 stop), so the pattern is noted, not characterized.
- Content (caption, full): "I Built a Private AI Operating System to Run Your Entire Business #reels #claude #automatedsystem #automation #system #systemdesign #restructureai". The substance is in the spoken video, which was not recovered.
- Lane fit: the concept — a Claude-based private AI OS for running a business — is the ARE/Content-OS lane exactly, which is why this is WATCH rather than context: worth a deliberate look at the creator's linked materials later, on evidence, not on this caption.
- **Verdict: WATCH** (spoken payload unrecovered — explicit gap).

### #21 — @donovanlancome + @houstontips — reel — Houston house
- URL: https://www.instagram.com/reel/DfD5SUxO3KU/ · 15,794 followers · 24,066 likes, 515 comments (stored record)
- Content (caption): "Need to get rid of this house 🤦‍♂️ #explore #houston #fyp #1 #galleria" — Houston (Galleria) real-estate content, likely a wholesaler/investor walkthrough. Engagement far above the account's follower count.
- Lane fit: local-market context only. No outreach (standing rule). Possible pattern reference for Houston property-content formats; nothing more is claimed.
- **Verdict: CONTEXT-ONLY.**

### #22 — @kem_glitch — reel — LLM-wiki commentary
- URL: https://www.instagram.com/reel/DfFSZDvN6oV/ · 20,612 followers · 68 likes, 14 comments (stored record)
- Content (caption, full): "So can we stop talking about LLM wikis now and just accept karpathy wasn't right. 🤣 he moved on - why haven't you? #ai #artificialintelligence #openai" — a take on the LLM-wiki knowledge-base pattern associated with Karpathy.
- Lane fit: a sentiment data point for Garrett's own knowledge-organization choices (corpus/wiki patterns) — the argument itself is in the spoken video, not recovered.
- **Verdict: CONTEXT-ONLY.**

## GAP AUDIT

- **Feed items seen:** 35 organic posts + 9 ads (ads excluded from selection per protocol; none of the 9 was a tool/repo offer worth separate recording except the Massive MCP market-data promo, noted here as ad-only and not counted).
- **Duplicates skipped: 2.** #1 @simplifyinai DfD_VBfGQbV — already dissected today as SHARED-ITEMS-REGISTER entry S49 (Mesh LLM). #20 @simplifyinai De_yi6OGcs6 — captured in the 2026-10-27 sweep (`ig-sweep-2026-10-27/context/feed-11.json`, the "Halupedia/vibeserver" carousel).
- **New available / selected:** 33 new; 20 selected in feed order (inventory #2–#19, #21, #22). **13 new posts (#23–#35) were inventoried but not selected** — they remain unindexed and will count as new again if they resurface; a deeper run or the next slot can take them deliberately.
- **Fully dissected vs partial:** 4 posts read from full CLI post JSON with complete captions (#2, #3, #4, #5). 16 read from stored annotation records: 14 with complete captions, 2 with no caption and no stored understanding (#11 @chiefgyk3d photo, #16 @quantscience_ carousel — image/slide payloads unread). Reel spoken content was not independently recovered for any reel; where the caption carried the payload (#7, #9, #14) the dossier is complete, where it didn't (#10, #15, #19, #22) the dossier says so.
- **429 stop:** instagram-cli `post` call #5 (inventory #6, De2EFbZjBHi) returned 429. All instagram-cli calls stopped immediately and permanently for this run. Consequences: media-understanding 0/20, comment fetches 0/20. Comment sections were therefore analyzed by counts and caption design only — the gate-pattern counts (e.g., #6's 1,899 comments vs 1,775 likes, #4's 410 comments on a 2-line caption) are structural evidence, not comment-body reads.
- **Claims left UNVERIFIED:** Zero Breach Toolkit's "12,100 traces" and no-disk-writes claims (repo existence/purpose/license verified; code not audited); ZOON's repo identity and capabilities; OpenNavo's maturity/safety (existence verified — see addendum); @thetradingfraternity's Anthropic/biotech claim (nothing checkable named); @esim3400's Brewers post as a real-world result; @restructureai's AI-OS capabilities; @arwazaz_'s self-improvement effectiveness.
- **DM/comment-gated payloads NOT obtained (by rule — no commenting, no outreach):** #4 "erase" setup guide; #5 "launch" prompts; #6 ROADMAP build plan + repository list; #14 "brew" repo link.
- **What closes each gap:** a later run after the 429 window resets can run media-understanding + comment fetches for the 16 stored-record posts and the 3 image-payload posts (#3, #11, #16) — the raw JSON and post IDs are all saved under `raw/2026-10-29-AM/`, so that pass needs no re-collection. The gated payloads close only if the creators publish them openly; they are never closed by commenting.
- **Primary sources checked:** GitHub — dream-num/univer (verified, direct read), interplains/Zero-Breach-Toolkit (verified, direct read; caution: same-name forks/copies already exist — only the interplains original is the release), kinghacker0/WishFish (verified), opennavo/OpenNavo (verified on re-search — see addendum), ZOON search (no match).

## ADDENDUM — corrections from the completed verification pass (same run, filed openly)

The first version of this report contained two errors, both from reading an early GitHub search response before the full verification pass finished. They are corrected above and recorded here rather than silently replaced:

1. **OpenNavo (#14) — earlier error: "does not exist."** The first repository search for "opennavo" returned total 0, and the executive section and dossier reported the project as non-existent. A later search in the same run resolves **opennavo/OpenNavo** (69 stars, GPL-3.0, pushed 2026-10-29T15:13Z) — the repository was created or indexed during the sweep window itself. Verdict stays WATCH, but for the opposite reason: it is real, brand-new, and unproven, not a phantom. Lesson recorded: a zero-result name search on a hours-old project is a timing artifact, not a finding; gated-repo items get a delayed re-search before any non-existence claim is filed.
2. **Univer (#7) — earlier error: stale figures.** The executive section and dossier first carried 11,360 stars / 1,596 forks / pushed 2026-10-28 from a search-index read. The direct repository read gives **22,784 stars / 1,912 forks / pushed 2026-10-29T10:41Z**. The TEST verdict is unchanged and, on the corrected numbers, stronger.

---

# PART 2 — INSTAGRAM, MORNING DEEP DIVE (repo-level dossiers)

# Instagram For You sweep — 2026-10-29 AM DEEP-DIVE enrichment pass

Ordered by Garrett, 2026-10-29: *"I don't really care about comments — I care about what the repo is, how to use it, where to find it, and what system it goes with. Go deeper, more introspective, dynamic, creative."*

This pass answers that spec. Part A re-reads the five repos from this morning's sweep at internals level (full README, repo tree, install/usage docs, requirements, license, releases, open issues). Part B dissects the six named-tool posts from the AM inventory (#23–#35) that were never dissected, resolves each to its real repository, and gives it the same treatment. Part C is the synthesis: what combines, what changes a running workflow, and the test order.

Method notes: everything below comes from the repositories' own documentation and metadata via the GitHub API, read on 2026-10-29. Nothing was installed or run. Instagram was used only to recover full captions for the five Part B posts that needed them (no 429 hit this pass; the AM run's 429 did not recur). Star counts are as of this read.

---

# PART A — REPO-INTERNALS DEEP DIVES

## A1. Zero Breach Toolkit — interplains/Zero-Breach-Toolkit

**Verdict: TEST** (sandbox/VM first run; strongest Family Shield find of the day)

**WHAT IT IS (mechanism).** An offline indicator-matching scanner for mercenary spyware — Pegasus, Predator, Graphite, Candiru/DevilsTongue, Paragon-class tooling. It does not "detect malware" generically; it compares evidence on a device against ~12,400 published indicators from 29 named sources (Amnesty International Security Lab, the Mobile Verification Toolkit indicator set, Citizen Lab, Echap's stalkerware research, plus a hand-curated Citizen Lab set with per-line citations). The match targets are concrete: spyware infrastructure addresses inside browser history/cookies/HSTS/bookmarks/downloads across ~20 browsers and Chromium-based desktop apps (Slack-class apps included, because their web records are browser records); file fingerprints (hashes of executables/DLLs up to 120 MiB in selected folders); persistence and execution records (Prefetch, Amcache, startup/task/service registrations, PowerShell logs, DNS cache, hosts file); and the "Run box" history that catches fake-"verify you are human" paste-a-command lures. For phones it never talks to the phone directly: Android is read from an AndroidQF collection (apps + signing certificates + install history — including apps already removed — SMS links, sideloaded-app capability audit, bootloader/debug state), and iPhone is read from a local Finder/Apple Devices/iTunes backup, encrypted backups supported, plus extracted filesystems and sysdiagnose archives.

**WHERE TO FIND IT.** https://github.com/interplains/Zero-Breach-Toolkit (3,303★, 362 forks, Apache-2.0, created 2026-10-25, releases landing multiple times per day — v0.1.12 on 2026-10-29). Built on the author's earlier interplains/zero-breach. Key docs inside the repo: `docs/METHODOLOGY.md`, `docs/COVERAGE.md`, `docs/PATTERNS.md`, `docs/IPHONE.md`, `docs/VERIFYING.md`, `PRIVACY.md`, `scan/CONTRACT.md`.

**HOW TO USE IT.** Python 3.8+, no administrator rights, no extra packages. Get the ZIP (Code → Download ZIP) or `git clone`. The only networked step is updating indicators: `python -X utf8 scan/zero-breach-toolkit.py --update` (without it, only a small built-in set is used; repeat every few weeks). Then close browsers/chat apps and run `python -X utf8 scan/zero-breach-toolkit.py` — an interactive menu; Enter = standard check of this computer, ~15 minutes. Windows alternative: double-click `scan\run-scan.cmd`. Useful flags: `--quick` (skips file fingerprints), `--phone "FOLDER"` (a phone collection or iPhone backup), `--json report.json` (machine-readable report), `--share-json summary.json` (minimal shareable summary). Reports land in a `findings/` folder. macOS needs Terminal granted Full Disk Access or Safari records are silently out of reach (the report lists them as unchecked). Android flow: enable USB debugging, run the menu's phone path, it drives AndroidQF collection with a prescribed answer table, then scans the collection. iPhone flow: make an encrypted local backup first, then point the tool at the backup folder and give it the backup password.

**Safety posture — this is the part that matters.** Read-only by design: it writes only temp database snapshots and the reports you request, never modifies source evidence. No network during a scan: Python network calls are blocked in-process and redirected paths refused — and the docs honestly state this is *not* an OS-level sandbox. The project is anonymous, and its answer to "why trust you" is reproducibility: the single-file release bundle is generated deterministically from source, each release publishes size + SHA-256 (v0.1.12: 971,462 bytes, hash printed in the README), releases are GPG-signed, and the README walks you through rebuilding and comparing. There is deliberately no signed Windows executable. Result language is calibrated: "no known indicators found" is never presented as proof of safety, every report lists what could *not* be checked, and a match is framed as "look closer, not infected" with a pointer to the Access Now helpline. That honesty discipline is rare in this tool class and matches Garrett's own reporting doctrine.

**WHICH SYSTEM IT PLUGS INTO.** **Family Shield** — it is the device-side half of the shield: a concrete exposure audit for Garrett's own computers and phones and, with consent, family devices. Second seat: fleet hygiene — a standard check for this VM and the Windows host, the two machines that hold his credentials and agent infrastructure.

**CREATIVE ANGLES.**
- The repo's `dist/` folder publishes the same indicator set as ready-made blocklists — hosts file, dnsmasq config, adblock list, MISP JSON, STIX. That turns a one-time scan into a standing prevention layer: feed the dnsmasq/hosts output to the home network's DNS and the known spyware infrastructure becomes unreachable for every device on the network, including devices the scanner can't read.
- `--json` output makes it scriptable into a periodic check whose diff (new indicators, new findings) is the actual signal — the Family Shield version of his calibration habit: baseline, re-measure, report changes only.
- Pairing: Zero Breach checks *devices*; Watcher (Part B2) watches *exposure* — leaked credentials and lookalike domains. Run together they are the two halves of the shield from a single morning's feed (see Part C).

**RISKS AND LIMITS.** Four days old at first read (mitigated by: source-only execution, reproducible builds, an extensive in-repo test suite under `scan/tests/`). Anonymous authorship means trust rests entirely on the reproducibility story — which is verifiable, and should be verified before any family device is scanned. Same-name copycat repos already exist; only `interplains/` is the release. False positives are expected by design (execution records don't prove content; inventory records don't prove execution). Open issues are few (4) and mundane (a missing report.txt complaint, a macOS hang).

**FIRST TEST.** Run it on this VM (Linux, Python present) from a cloned copy: `--update`, then `--quick`, then a full standard check, and read the JSON report's "could not be checked" list. That validates the whole chain — indicator update, scan, report shape — on a machine whose contents are already known, before it ever touches a personal device.

## A2. Univer — dream-num/univer

**Verdict: TEST** (at need — when a real sheets/docs surface is on the table)

**WHAT IT IS (mechanism).** An isomorphic TypeScript runtime for building office applications *inside your own product* — spreadsheets, documents, slides, canvas, relational tables, and PDF sharing one plugin architecture, one command system, one canvas rendering engine, and one Facade API. It is not a hosted Google Sheets clone and not a file viewer; it is the SDK you embed. "The Office Harness for AI Agents" means something specific in the repo's own docs: agents get (1) **programmatic editing** — inspect and modify workbook/document content through the structured Facade API (`FUniver.newAPI(univer)`, `createWorkbook(...)`, range/formula/command/event access); (2) **output verification** — agents check their own work through content inspection, rendered screenshots, and layout diagnostics; (3) **worktree collaboration** — agents edit isolated drafts, a human reviews and decides what merges. The same code runs in the browser and headless in Node.js, so a workbook an agent builds server-side is the same object a person opens in the UI. There is also a sibling MCP server, **dream-num/univer-mcp**, for driving Univer Sheets in natural language, and an agent-skills pack (`dream-num/univer-sdk-skills`) that teaches coding agents the SDK.

**WHERE TO FIND IT.** https://github.com/dream-num/univer (22,784★, 1,912 forks, Apache-2.0, founded 2022, pushed today; 146 open issues — a mature project, not a weekend repo). Docs: https://docs.univer.ai (Web SDK, Server SDK, AI SDK at docs.univer.ai/ai, Facade reference). MCP: https://github.com/dream-num/univer-mcp.

**HOW TO USE IT.** npm packages under `@univerjs/*`. Two integration modes: **Preset Mode** (fast: `pnpm add @univerjs/presets @univerjs/preset-sheets-core`, `createUniver({ presets: [UniverSheetsCorePreset({ container: 'app' })] })`, done — a working sheets app) and **Plugin Mode** (compose exactly the plugins you need — core, render engine, formula engine, docs/sheets/slides + UI plugins — when bundle size or deep integration matters). Your page needs one container div. React, Vue, and Web Components shells are supported. The open-source boundary is explicit and matters: OSS Sheets covers workbooks, formulas, formatting, filter/sort, validation, conditional formatting, comments, tables — but **real-time collaboration, edit history, import/export (xlsx etc.), printing, charts, and pivot tables are Univer Pro (commercial)**. The headless Node runtime and automation primitives are OSS; the collaboration server and server-side calculation are Pro. An honest read: one agent + one human editing through the Facade/worktree pattern is achievable on the OSS core; multi-user live co-editing and xlsx import/export are where the paywall sits.

**WHICH SYSTEM IT PLUGS INTO.** **GSE / autonomous revenue engine product surfaces** — any place Garrett's agents produce tabular or document deliverables that a human then reviews: the weekly DFS packet (position boards as live, agent-filled sheets instead of static exports), the orchestration board's data layer, calibration/result tables for the engine, and Kit client deliverables (a client-facing live sheet beats a PDF for the $350-site lane). It replaces the "agent writes a file, Garrett opens it somewhere else" seam with one shared object both sides edit.

**CREATIVE ANGLES.**
- The worktree pattern is his 2-agent merge gate wearing an office suite: agents draft in isolation, Garrett merges. Univer is the first office runtime found in the corpus that builds that exact governance shape into the document layer.
- univer-mcp + the fleet MCP bus: a sheet becomes a fleet tool. Any agent that can call MCP can read/write the same workbook the human is looking at — the picks reasoning trail (Reasoning Doctrine: what was weighed, what was discounted, why) rendered as a living board instead of a log file.
- Verification-by-screenshot is the same doctrine as his "wired means verified in the artifact": the agent doesn't claim the sheet is right, it renders and looks.

**RISKS AND LIMITS.** Heavyweight monorepo (179 MB); the Pro gate sits on exactly the features a casual evaluation would reach for first (collaboration, import/export) — scope any test to OSS capabilities or price Pro deliberately. The AI SDK/worktree surface is newer than the core and its licensing "varies by feature" per the README's own caveat.

**FIRST TEST.** Preset-Mode sheets in a scratch Vite app (30 minutes of plumbing), then one univer-mcp round-trip: an agent creates a workbook, writes a small results table, renders a screenshot to verify. If that loop is clean, it earns a place in the DFS-packet rebuild; if not, nothing downstream was committed.

## A3. OpenNavo — opennavo/OpenNavo

**Verdict: WATCH** (real, well-built, wrong hardware fleet today — pattern value now, product value if a Mac ever joins)

**WHAT IT IS (mechanism).** The Instagram caption sold a Homebrew GUI; the repo is a full platform that happens to include one. Three layers: (1) a **catalog backend** (Go/Gin/GORM, PostgreSQL, Redis) that syncs Homebrew's public APIs and git history to build a directory of Mac apps with per-version release notes, install counts, requirements, dependencies/conflicts, and uninstall behavior — opennavo.com runs this exact code; (2) a **web directory** (Nuxt 4, ten languages) with search, rankings, collections, and Brewfile generation; (3) a **macOS app** (Tauri 2 + Rust) that does the actual machine work. The app's safety design is the interesting part: the server never runs brew; the app invokes brew with argument arrays (no shell), validates package names against an allowlist, restricts writes to `--cask`, and for uninstalling apps from *any* source (App Store, DMG, pkg) it pre-lists every related file it found (app data, caches, preferences, background items, installer receipts — matched by bundle ID / App Group / zap rules), never follows symlinks, re-checks each path immediately before removal, and sends files to Trash first so removal is undoable. It also includes a risk-grouped cleanup scanner, a menu-bar system monitor, and — notable for this fleet — a **built-in MCP service (Python/FastMCP) through which AI agents can maintain the app catalog content within granted permissions, with dry-run support on all writes.**

**WHERE TO FIND IT.** https://github.com/opennavo/OpenNavo (69★, 2 forks, GPL-3.0, created 2026-10-09, pushed today). Live site: https://opennavo.com. Structure: `apps/web`, `apps/desktop`, `apps/admin`, `apps/server`, `apps/mcp`, `packages/`, `ops/` (Docker Compose, Caddy, Prometheus/Grafana, backups).

**HOW TO USE IT.** As an end user: install the macOS app (macOS 13+) from the site/releases — no account, it detects your Homebrew setup and works. As a self-hoster you'd run the whole platform — `make setup`, `make infra migrate seed`, catalog sync, then five separate dev services (API :8080, worker, web :3000, admin :9527, desktop) with Node 24/pnpm 10, Go 1.27, Rust 1.96 (pinned), Python 3.13/uv, and Docker for Postgres/Redis/MinIO. That is a product deployment, not a utility install, and nobody should do it just to click-install Mac apps.

**WHICH SYSTEM IT PLUGS INTO.** None directly — Garrett's fleet is a Linux VM plus a Windows host; there is no Mac in it. The honest seat today is **pattern library for Kit/client work and fleet tooling**, and a standing option if an Apple Silicon machine ever joins the fleet (at which point it also becomes the natural software manager for a Mesh LLM node — see A4).

**CREATIVE ANGLES.**
- The transferable product idea: a friendly, safety-railed GUI over a scary package manager, with pre-action review and undo, is exactly the shape non-technical users need — the same shape could wrap tooling installs for Kit clients (a one-click "your site tools" updater) far better than a terminal ever will.
- Its MCP-with-dry-run content administration is a design reference for the fleet: agents maintaining a catalog *through* an API that forces dry runs and permission scopes is the anti-drift pattern (work proceeds, writes stay reviewable) implemented by someone else — worth stealing for fleet-facing admin surfaces.
- The catalog itself (release notes + requirements + uninstall behavior per app) is a research surface: before installing any Mac tool in the future, its entry answers questions GitHub READMEs bury.

**RISKS AND LIMITS.** Twenty days old, 69 stars, GPL-3.0 (fine to use; copyleft matters only if Garrett ships derivatives), dev context skews to China mirrors (documented mirror switching is a feature there, neutral here), and the desktop's power (it deletes files, controls fans via a helper) is exactly why its own safety rails need to hold — unproven at this age.

**FIRST TEST.** None until a Mac exists. Trigger to revisit: any Apple Silicon acquisition, or a Kit client engagement that needs Mac software hand-holding.

## A4. Mesh LLM — Mesh-LLM/mesh-llm (register S49, deepened)

**Verdict: WATCH** — TEST trigger defined below; the deep read changes the *reason* for the verdict, not the verdict

**WHAT IT IS (mechanism).** Two products in one Rust workspace. **Skippy** is the inference half: a patched llama.cpp runtime that owns model management, native inference, split execution, and OpenAI-compatible serving. **Mesh** wraps it with peer discovery, encrypted transport, routing, plugins, and a web console. The operating logic is more conservative than the Instagram pitch: **single-machine fit first** — if one node can host the whole model, it serves locally with no split traffic at all. Routing is by the request's `model` field to whichever peer serves that model; every node exposes the same `/v1` API. Transport is QUIC via Iroh, end-to-end encrypted including split activations; Iroh relays forward packets they cannot read. Discovery splits by trust: public meshes advertise over Nostr; **private meshes are invite-token only**. **Skippy stage splits** are the big-model path: the coordinator plans contiguous layer ranges, peers fetch *layer packages* (a `model-package.json` plus GGUF fragments, addressed like `hf://meshllm/<repo>@<rev>`) so each node downloads only its stage, downstream stages start first, and the stage-0 route publishes when all are ready. There is also an experimental **Mixture-of-Agents gateway**: send `"model": "mesh"` and the request fans out to every model in the mesh in parallel; a deterministic code arbiter (not another model call) merges responses and escalates to a reducer LLM only on genuine conflict. Model support tracks llama.cpp family parity (89 certified family rows: Qwen, Llama, Gemma, Mistral, DeepSeek, GLM, MiniMax, Phi, and more; split multimodal certified for Qwen-VL and DeepSeek-OCR lines).

**WHERE TO FIND IT.** https://github.com/Mesh-LLM/mesh-llm (3,629★, 471 forks, Apache-2.0, created 2026-02-11, pushed today; 213 open issues). Docs hub at meshllm.cloud; in-repo: `mesh/docs/MESHES.md`, `mesh/docs/USAGE.md`, `mesh/docs/CLI.md`, `mesh/docs/AGENTS.md`, `skippy/docs/SKIPPY_SPLITS.md`, `skippy/docs/FAMILY_STATUS.md`.

**HOW TO USE IT.** Installers: shell one-liner (macOS/Linux), PowerShell on Windows, `brew install Mesh-LLM/tap/mesh-llm` on Apple Silicon; packaged bundles exist for CPU, CUDA, ROCm, Vulkan, and Metal flavors. Then `mesh-llm setup`. Core commands: `mesh-llm serve --auto` (join the best public mesh, API on :9337, console on :3131); `mesh-llm serve --model Qwen3-8B-Q4_K_M` (start a private mesh serving that model); `mesh-llm serve --join <token>`; `mesh-llm serve --model hf://… --split` (stage-split a big model); `mesh-llm client --auto` (API-only client). The coding-agent integration is one command per agent: `mesh-llm claude`, `mesh-llm opencode`, `mesh-llm goose`, `mesh-llm pi` — each launches that agent wired to the mesh endpoint. There is a deliberate debugging mode, `--local-model-only --gguf <abs-path>`, which serves one local GGUF with no mesh networking; the docs warn it is *not* the production path (it bypasses the host-runtime normalizer that makes tool calls behave) and that it **fails hard if the model doesn't fit local capacity — it never silently falls back to distributed serving**.

**Realistic limits, from the docs (not the post).** Stage splits trade latency for capacity: activations cross the network, so a 70B split across weak nodes generates slowly — the mechanism buys *ability*, not speed. The public mesh is other people's hardware and other people's prompts; the private invite mesh is the only configuration aligned with his privacy posture. MoA is explicitly experimental ("behavior may change between versions") and needs ≥2 distinct models in the mesh. Source builds are heavy (Rust + cmake + Node 24 + platform linkers).

**WHICH SYSTEM IT PLUGS INTO.** **The routing stack / fleet infra** — as a *floor*, not a replacement: a private two-node mesh (this VM + the Windows host) serving small GGUFs behind the same OpenAI-compatible shape his routers already speak. Today both machines are GPU-less, so the floor is small models on CPU — useful for cheap classification/summarization grunt work, not for the 70B headline.

**CREATIVE ANGLES.**
- **MoA as a review primitive:** his Review Board doctrine (independent verdicts, merged by rule) is literally implemented here — fan one question to several small local models, arbitrate deterministically, escalate only on conflict. A local, $0 second-opinion layer for low-stakes verification work (numbers-checking drafts, citation spot-checks) without touching paid or free-tier quotas.
- **Outage insurance for the free-first stack:** when OpenRouter free tiers rate-limit (a lived experience in this fleet), a local mesh floor means agents degrade to smaller local models instead of stopping. Degraded beats halted.
- **The agent launchers invert his current wiring:** instead of configuring each coding agent to point at a gateway, the mesh *adopts* the agent (`mesh-llm claude`). Worth comparing against FreeLLMAPI's `setup-claude` approach (Part B3) — two competing answers to the same fleet problem, testable head-to-head.

**RISKS AND LIMITS.** Young and wide (213 open issues); public-mesh trust model is unacceptable for private prompts — private mode only; split-serving expectations must stay honest (the S49 skeptic's joke is directionally right for WAN splits; LAN splits between his two machines are the only sane configuration); no compute is created — the pool is exactly the hardware he owns.

**FIRST TEST.** Single-node, no mesh: install the release binary on this VM, `serve --local-model-only` with a small GGUF (Qwen3-8B-Q4 class or smaller), and verify the :9337 endpoint answers an OpenAI-format request and that `mesh-llm opencode` wires a real agent session to it. That test validates endpoint + launcher mechanics for the price of one download; the two-node private mesh is step two, and stage splits wait for hardware that justifies them.

## A5. WishFish — kinghacker0/WishFish (defensive recognition only)

**Verdict: CONTEXT-ONLY** (threat awareness; never adopted, never operated)

**WHAT IT IS.** A years-old phishing kit (1,304★, GPL-3.0, created 2019, stale since 2023-03) whose entire mechanism is a lure page plus a permission prompt. That is all the detail this dossier carries, by design.

**RECOGNITION PROFILE (the defensive payload).** The lures are social occasions and media: festival/holiday "wish" greeting pages, fake live-meeting pages, fake video pages — links that arrive by message with a plausible reason to open them. The tell is what the page asks for: **a greeting card, a wish page, or a meeting link never legitimately needs camera access.** A page that asks for the camera (or mic) immediately on open, outside a real meeting app, is the attack announcing itself. The visit alone also exposes the visitor's IP address and device information to the page operator — no click past the permission prompt is required for that part. Variants of this kit have circulated since 2019 (it is itself a derivative of an earlier tool), so the pattern matters more than this specific repo: link → occasion-themed page → permission request.

**WHICH SYSTEM IT PLUGS INTO.** **Family Shield, education layer.** This is a teachable recognition rule for the household — "occasion link + camera ask = close the tab" — and it pairs with this morning's other @dayofexploits item (ZOON, an IP-based location tracker) as a matched set: the feed's offensive-tool posts describe exactly the two things a shared link can do to you (locate you from your IP; photograph you through a permission you granted). Zero Breach (A1) is the answer on the device side; recognition is the answer on the human side.

**RISKS AND LIMITS.** None from cataloging. The repo is stale (2023) but the lure pattern is not.

**FIRST TEST.** None. Filed for recognition only.

---

# PART B — THE UNDISSECTED NAMED-TOOL POSTS (#23–#35), RESOLVED AND DEEP-DIVED

## B1. @fork.cast_ (#23) — malicious-pdf — jonaslejon/malicious-pdf

**Verdict: LEARN-ONLY** (a defensive test-fixture generator for systems he owns; know it cold, run it rarely)

**WHAT IT IS (mechanism).** A single-purpose Python generator that emits a standardized battery of 67 test PDFs, each embedding a different way a PDF can reach out of its viewer: phone-home callbacks, SSRF triggers, XSS in viewer contexts, XXE, NTLM credential-hash capture, and data-exfiltration paths — covering techniques sourced from two decades of published PDF research (PortSwigger's portable-data-exfiltration work, PDFBox/iText XXE CVEs, PDF.js arbitrary-JS CVE-2024-4367, Acrobat tracking/CSP issues, ImageMagick shell injection via PDF password, and a 2026 Acrobat 0-day writeup that inspired the newest cases). Every generated file points its callbacks at a URL *you* supply — your Burp Collaborator or Interact.sh endpoint — so a "hit" tells you exactly which component in your pipeline executed or fetched something it shouldn't have. Obfuscation levels 0–4 progressively hide the payloads (hex/octal encoding, JS bracket notation, stream compression, a base64 decoder stub) to test whether your scanner still catches what it claims to catch.

**WHERE TO FIND IT.** https://github.com/jonaslejon/malicious-pdf (4,500★, 596 forks, BSD-2-Clause, created 2021, pushed 2026-10-17; OpenSSF Best Practices badged; only 4 open issues — a mature, narrow tool). Surfaced by @fork.cast_ ("ForkCast" security account); the caption names it outright once read in full.

**HOW TO USE IT.** `pip install -r requirements.txt`, then `python3 malicious-pdf.py <your-collaborator-url>` — 67 files land in `output/` as test1.pdf…test67.pdf. `--obfuscate 0–4`, `--output-dir`, `--no-credit` are the only real options. You then feed the files to the thing under test (an upload endpoint, a converter, a viewer, a static-analysis tool) and watch your callback endpoint.

**WHICH SYSTEM IT PLUGS INTO.** **Fleet security hygiene / Family Shield's technical edge** — and the sharpest fit is one the creator never pitched: **Garrett's own ingestion lane.** His workflows routinely convert untrusted PDFs from the wild (shared items, exports, client files) through local tooling. A malicious PDF is an attack aimed precisely at that seam: the document that phones home when a converter processes it. This generator is how you prove your own pipeline doesn't — run the battery against the exact converters/viewers in his stack, on infrastructure he owns, and read which callbacks fire. Secondary seat: any upload-accepting surface he ships (GSE site, Kit client sites) gets the same treatment before launch.

**CREATIVE ANGLES.**
- It converts "are we vulnerable to bad documents?" from a worry into a 67-row checklist with binary answers — his favorite shape of knowledge (measured, not vibes).
- The obfuscation ladder gives a graded scanner test: a tool that catches level 0 and misses level 2 has a *measured* detection ceiling, which is exactly the kind of claim his Numbers Cop doctrine wants evidenced before any security tool is trusted.

**RISKS AND LIMITS.** It is dual-use pentest tooling: the files are genuinely malicious-patterned, so they live in a dedicated folder, never in shared drives or client deliverables, and are only ever pointed at his own endpoints. Antivirus will flag the outputs (that's their job). BSD-2-Clause, no maintenance risk of consequence — the technique catalog ages slowly.

**FIRST TEST.** Not a today-task. The bounded version, when scheduled: generate one battery against a self-hosted Interact.sh endpoint, run it through the local PDF-conversion path only, record which of the 67 callbacks fire, file the table. Half an hour, entirely on his own machines.

## B2. @esgeeks (#25) — Watcher — thalesgroup-cert/Watcher

**Verdict: TEST** (self-hosted; the exposure-side half of Family Shield, plus a brand-protection seat for GSE)

**WHAT IT IS (mechanism).** A full cyber-threat-intelligence platform from Thales Group's CERT, open-sourced and self-hosted (Django + React, Docker stack). It continuously pulls external signal — CERT RSS feeds (CERT-FR, CERT-EU, US-CERT, ACSC), CVEs from cve.circl.lu, ransomware victims/groups from ransomware.live and ransomlook.io, certificate-transparency logs via CertStream, and the open web via a bundled SearxNG — and turns it into analyst-shaped output: AI weekly digests of trending topics, real-time breaking-news alerts, and on-demand summaries for any keyword with related CVEs and threat actors. The AI is deliberately unglamorous and local: Hugging Face Transformers with google/flan-t5-base for summarization and dslim/bert-base-NER for automatic IOC extraction — no paid API, no data leaving the box for inference. Around that core sit the two modules that matter most for Garrett: **suspicious-domain detection** (dnstwist permutations of your domains + CertStream monitoring to catch typosquats/homographs the day they're registered) and **information-leak detection** (watching Pastebin, GitHub, GitLab, Bitbucket, StackOverflow, npm, APKMirror for your keywords — leaked credentials, API keys, confidential strings). You define Watch Rules per keyword/domain; alerts go out by email, Slack, or Citadel; IOCs export to MISP, cases sync to TheHive; auth supports LDAP/OIDC/local. It also tracks your legitimate domains (expiry, registrar, repurchase status, UDRP cases).

**WHERE TO FIND IT.** https://github.com/thalesgroup-cert/Watcher (1,435★, 219 forks, AGPL-3.0, created 2020, pushed today; 17 open issues — a maintained institutional project, six years old). Docs: https://thalesgroup-cert.github.io/Watcher/. The @esgeeks post (Spanish-language security account) links it directly in its caption.

**HOW TO USE IT.** Docker, ~10 minutes per the README: `git clone`, `cd watcher/deployment`, `make init`, `make up`, `make migrate`, `make superuser`, `make populate-db` — web UI on http://localhost:9002 (Traefik reverse proxy, MySQL, CertStream and SearxNG sidecars come in the compose). Kubernetes manifests also ship in-repo. Ongoing operation is web-UI work: add legitimate domains, define watch rules/keywords, connect notification channels, read the weekly digest.

**WHICH SYSTEM IT PLUGS INTO.** **Family Shield (exposure side)** and **GSE brand/infrastructure protection**, in one deployment:
- Leak rules for his own identifiers — his name, his GitHub org, his domains, and *patterns* around his stack — watching the exact places credentials get dumped. Context that makes this concrete, from his own record: on 2026-10-22, GitGuardian reported 17 secret incidents in Beexly/Sports from committed secrets, and a same-day scan found 59 possible leaks across 38 files. His leak problem is not hypothetical and it is not only about commits he makes — it's about anything of his that surfaces anywhere public. Watcher is the standing tripwire for that class.
- Domain rules for galaxysportsedge.com and his other domains: typosquat registrations are how phishing kits (see A5) get dressed in a brand's clothes. Catching a lookalike domain at certificate issuance is the cheapest moment to act on it.

**CREATIVE ANGLES.**
- **Kit client add-on:** a $350 website is a one-time sale; "we watch for copies of your site, leaks of your business name, and scam domains impersonating you" is a recurring-value service. One Watcher instance can hold many clients' domains as separate watch rules — the marginal cost per client is near zero, which is the ARE shape (build once, sell the vigilance repeatedly). AGPL care required if offered as a hosted service (see Risks).
- **The digest as an intel input:** the weekly AI digest + breaking alerts are a ready-made feed for his situational-awareness lane — threat landscape summarized by local models on his own box, no new subscription, no new background job phoning a vendor.
- **Pairing with A1:** Zero Breach answers "is anything bad already on our devices?"; Watcher answers "is anything of ours exposed or impersonated out there?" Device side + exposure side = the shield stops being a folder of intentions and becomes two running checks.

**RISKS AND LIMITS.** AGPL-3.0: self-hosting for himself is clean; offering it as a network service to clients triggers AGPL source-availability obligations — manageable, but it must be a deliberate decision, not a surprise. The stack is not light (MySQL + Traefik + SearxNG + CertStream) — it wants a real always-on home, which this VM is. flan-t5-base summaries are serviceable, not brilliant; the value is the collection and correlation, not prose quality. Leak detection is keyword-bound: it finds what you tell it to look for, so rule design is the work.

**FIRST TEST.** Docker deployment on this VM with a deliberately small scope: legitimate domains = galaxysportsedge.com (+ his other real domains), watch rules = "galaxysportsedge", "Galaxy Sports Edge", his GitHub org name. Run one week. The test passes if the digest arrives, the domain monitoring is quiet-or-correct, and at least the machinery is proven before any client conversation.

## B3. @voxaris_ai (#26) — Headroom — headroomlabs-ai/headroom

**Verdict: TEST** — the single highest-leverage fleet find in this feed; test it first (Part C)

**WHAT IT IS (mechanism).** A local context-compression layer that sits between a coding agent and the model, shrinking what the agent *sends* (tool outputs, logs, files, RAG chunks) and trimming what the model *writes back* — without deleting anything. The pipeline: a **CacheAligner** flags volatile content that would bust provider KV-cache prefixes; a **ContentRouter** classifies each payload and dispatches it — **SmartCrusher** for JSON, **CodeCompressor** (AST-aware) for source code, **Kompress-v2-base** (a small HF model) for prose. The crucial design decision is **CCR (reversible compression)**: originals are cached locally, and the model gets a retrieval tool (`headroom_retrieve`) to pull the full text back on demand — compression is a view, not a destruction. The project's own benchmark table (seeded, reproducible offline): code search 17,199 → 13,597 tokens (−21%), SRE incident debugging 55,957 → 24,340 (−57%), codebase exploration −42%, GitHub issue triage −30%; compression latency 0.21 ms p50 on a 10K-token payload — it does not show up in agent latency. Accuracy evals at N=100 show no detectable degradation (GSM8K identical; they report the TruthfulQA +0.03 honestly as inside the confidence interval — the same statistical honesty Garrett demands). The Instagram claim of "over 77,000 stars" checks out: **78,233★, 6,094 forks, Apache-2.0, created 2026-01-07, pushed today.** (The repo moved from chopratejas/headroom to the headroomlabs-ai org.)

**WHERE TO FIND IT.** https://github.com/headroomlabs-ai/headroom. Docs: https://docs.headroomlabs.ai (architecture, CCR, benchmarks, limitations pages all public). Kompress model card on Hugging Face (chopratejas/kompress-v2-base).

**HOW TO USE IT.** Python 3.11+. `uv tool install --python 3.13 "headroom-ai[all]"` (or pip; npm package is SDK-only, no CLI; Docker image on GHCR). Four modes: **wrap** — `headroom wrap claude` (also codex, grok, copilot, cursor, aider, opencode, cline, continue, goose, openhands, kimi, zcode…) starts a local proxy, registers the Serena semantic-code-navigation MCP for the wrapped project (skippable with `--code-memory none`), and launches the agent through it; `headroom unwrap <tool>` reverses it. **proxy** — `headroom proxy --port 8787`, zero code changes, any OpenAI-compatible client (for third-party upstreams like OpenRouter pass `--openai-api-url`, or your key goes to the wrong provider and 401s — the README calls this out explicitly). **library** — `from headroom import compress` inline. **MCP** — `headroom mcp install` exposes `headroom_compress` / `headroom_retrieve` / `headroom_stats` to any MCP client. Two more features matter here: **cross-agent memory** — one shared store across Claude, Codex, Gemini, and Grok with automatic dedup; and **`headroom learn`** — mines failed sessions and writes the corrections into `CLAUDE.local.md` / `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` / `GROK.md`. Operations: `headroom doctor`, `headroom perf`, `headroom dashboard`, `headroom savings` (measures *your* traffic, not their benchmarks).

**WHICH SYSTEM IT PLUGS INTO.** **Agent fleet infra + the routing stack — the cost layer.** His fleet runs Claude Code, Codex, OpenCode, Grok, Jules sessions, and subagents against free-tier-first routing; every one of those sessions pays full price in tokens for tool outputs, file dumps, and logs. Headroom attacks exactly that line item, locally, before the request ever reaches a router. It composes with — does not replace — his OmniRoute fork and the OpenRouter free models: agent → Headroom (compress) → gateway (route) → provider. And `headroom learn` writing into AGENTS.md is his own lessons-file convention, automated: failed sessions mining themselves into standing instructions.

**CREATIVE ANGLES.**
- **The free-tier multiplier:** free tiers are quota-shaped (requests/day, tokens/day). A 30–50% token cut on agent traffic is arithmetically identical to a 30–50% larger free quota across every provider he pools — it multiplies FreeLLMAPI/OmniRoute (B3 of the trio below) without a single new account.
- **CCR fits the provenance doctrine:** his corpus work insists nothing be silently dropped — originals retrievable, compression reversible, savings measurable. This is the first compression tool in the record whose design doesn't ask him to trade away auditability for savings.
- **Cross-agent memory is a fleet problem he already has:** his agents duplicate context and re-learn the same facts per tool. A shared, deduped memory store across Claude/Codex/Gemini/Grok is a direct shot at that — worth evaluating on its own merits during the same test, not as a footnote.
- **The measurement is built in:** `headroom savings` on his own traffic turns "does compression help *us*" into a number — the Hermes Pattern applied to a vendor claim, with the tool itself supplying the instrument.

**RISKS AND LIMITS.** Telemetry is **on by default** (anonymous counters/ratios/model IDs — never prompts or code, per their docs) — set `HEADROOM_TELEMETRY=off` / `HEADROOM_OFFLINE=1` before any real session; a fleet that handles his code should not phone home by default. Scale cuts both ways: 484 open issues, including a live one noting SmartCrusher runs 3–8× over its documented perf targets on benchmark fixtures. Wrapping changes the agent's request path — a misconfigured upstream sends keys to the wrong provider (documented failure mode, avoidable). An Enterprise tier exists; the OSS repo states everything in it stays Apache-2.0.

**FIRST TEST.** One bounded, measured run: install in a scratch environment, telemetry off, wrap one real coding task of the kind the fleet does daily (a repo task through Claude Code or OpenCode), then run the *same class* of task unwrapped and compare `headroom savings` plus output quality. Decision rule stated in advance: adopt for fleet-wide wrapping only if his own traffic shows ≥25% token reduction with no visible quality loss — his number, not their 21–57%.

## B4. @gittrend.io (#28) — ReelMimic — edenfunf/reelmimic

**Verdict: LEARN-ONLY** (the product doesn't fit his content rules; the production *pattern* is a Content OS blueprint)

**WHAT IT IS (mechanism).** A local web app (localhost:4318) that clones the *craft* of a reference video without copying its footage. You drop in a file, phone recording, or YouTube link plus a one-line brief. It first dissects the reference — shot count and lengths, BPM, transitions, colors, framing, camera moves — then produces a plan (storyboard, characters, assets, style frames) that you review and argue with in a side chat before anything renders. Production is an **agent crew**: up to 6 builder agents (your own Claude Code or Codex, running on your subscription) work different parts in parallel, and **every finished shot is reviewed by a different agent than the one that made it**; fixes must arrive with before/after screenshots, and the reviewer verifies them. You review the result by scrubbing to any second and leaving timestamped notes, sent in one batch. Rendering is 2D only, across seven drawing engines — vector/motion-graphics (built on heygen-com/hyperframes), hand-painted watercolor (on tuzhechen2005/painted-animation), crayon picture book, pixel art, paper cut-out stop-motion, whiteboard doodle, anime cel — and **styles are Markdown files**: a new style is a document, not code. The README states the boundary plainly: "No real people. It makes animation, not live-action footage."

**WHERE TO FIND IT.** Original: https://github.com/edenfunf/reelmimic (265★, 41 forks, MIT, created 2026-09-28, pushed 2026-10-26; 49 open issues). Provenance caution: a second repo, ilyi1116/reelmimic (13★ but 155 forks, created a day later, untouched since), carries the same text — that fork/star shape is a copy-farm profile; **edenfunf is the only one to touch.** Docs in-repo: `docs/ARCHITECTURE.md`, `docs/EXTENDING.md`.

**HOW TO USE IT.** Needs Node 22.18+, Python 3.10+, FFmpeg, Chrome, and a logged-in Claude Code or Codex CLI (all generation runs through your agent account and counts against its usage; hitting a limit pauses the job, resumable). `git clone`, `./install.sh` (Windows: `install.bat`), `./start.sh`, open localhost:4318, drop a reference, approve the plan, wait — a 30–60 s video takes **1–3.5 hours** after approval (watercolor/crayon slowest). Keys/paths in `~/.reelmimic/secrets.json` (kept outside the repo by design). Posting is a separate, dry-run-first command (`npm run post-video`, via Upload-Post) and never automatic. Tested mostly on Windows — which happens to match his host.

**WHICH SYSTEM IT PLUGS INTO.** **GSE Content OS — as a pattern, not a product.** It cannot make his sports content: his standing rule is real footage, short transformative clips, commentary-led — and ReelMimic makes 2D animation of invented characters, the opposite input. What plugs in is its *operating system*: reference dissection → plan approval gate → parallel builders → independent reviewer with screenshot proof → timestamped human notes. That is the Hermes Pattern and the Review Board doctrine re-implemented as a video pipeline by a stranger — independent confirmation that his production architecture is where the ecosystem is heading, and a concrete reference implementation to mine when the Content OS build phase starts. (Compare S48's Hypit, which attacks the same problem from the template side; ReelMimic is the agent-crew side. The two together map the design space.)

**CREATIVE ANGLES.**
- **Style-as-Markdown is his voice-brief pattern.** His X voice rules live in a brief file; ReelMimic proves a whole visual style can live in one too — a "GSE explainer style.md" (telestration look, caption treatment, pacing) becomes a portable, versionable asset any agent can execute against.
- **Non-sports ARE lane:** Kit clients and local businesses are not bound by the sports-footage rule. A 30-second paper-cutout short telling a bakery's or a barber's story, made from a reference the client already loves, is a sellable artifact — animation is a feature there, not a compromise.
- **The reviewer protocol is stealable today,** without installing anything: builder/reviewer separation + screenshot-proof fixes is a checklist his existing video work can adopt verbatim.

**RISKS AND LIMITS.** Young (one month, five of seven engines "have had less real-world use"), slow (hours per short), and it burns his Claude/Codex quota as its compute — the free-ness is real but the currency is his agent usage. 2D-only is a hard boundary, not a roadmap item to wait on.

**FIRST TEST.** None for output. The learn-action is a read of `docs/ARCHITECTURE.md` during the Content OS build, with the reviewer protocol and style-file pattern extracted into that design.

## B5. @cracked.artificial (#31) — "3 free GitHub projects that will kill your subscription bill" — all three identified

The reel names **none** of the three (the names sit behind a "comment REPO" gate that was not used). Each was identified from its functional description in the caption, then verified at the repo. Confidence and method are stated per item.

### B5a. "34 AI providers behind one key, 7.4 billion free tokens a month" → **FreeLLMAPI** — tashfeenahmed/freellmapi

**Verdict: TEST** (head-to-head against his OmniRoute fork — one of them should win on evidence)

**Identification:** certain. The repo's own description is the caption's sentence verbatim: "7.4 billion tokens per month. 34 free LLM providers. 635 free model endpoints. All behind one /v1 endpoint." **43,780★, MIT, created 2026-04, pushed today.**

**WHAT IT IS.** A personal, local LLM router that pools the free tiers of 34 providers (Google, Groq, Cerebras, Mistral, OpenRouter, Cloudflare, Cohere, Z.ai, NVIDIA, Hugging Face, …) behind one OpenAI-compatible endpoint (http://localhost:3001/v1) and one unified key. Provider keys live encrypted (AES-256-GCM) in a local SQLite DB; your apps only ever see the unified `freellmapi-…` key. Routing: six strategies rank models by live speed/capability/reliability; on a 429 or 5xx it fails over to the next model with cooldowns and key rotation; it counts requests/tokens per provider/model/key and *learns each provider's real limits* so it stays under caps instead of discovering them. It speaks OpenAI (chat/responses/embeddings/images/audio), **Anthropic Messages format** (so Claude Code and Anthropic SDKs can run against the free pool), Gemini format, and Ollama-style NDJSON. Its model catalog self-updates from a signed feed — with a business-model catch: free installs get the *monthly snapshot* (models arrive 30 days late); "premium" routers get same-day. It also doubles as an MCP server agents can introspect mid-session, and ships setup generators (`npx freellmapi setup-claude`, `setup-codex`, … 16 agents) that back up your config before merging.

**HOW TO USE IT.** Docker one-liner (`curl -fsSL https://freellmapi.co/install.sh | bash` → ~/freellmapi, generates the encryption key, starts the container), or desktop installers (Windows .exe / macOS .dmg from Releases), or Docker Compose from the docs. Open localhost:3001, paste provider keys on the Keys page, order the Fallback Chain, take the unified key, point any OpenAI-compatible client at it. CLI key management via `npx freellmapi keys add|list|remove|test`.

**WHICH SYSTEM / CREATIVE ANGLES.** **The routing stack** — and this one comes with a twist: the same search that identified it surfaced **OmniRoute**, Garrett's existing fork's upstream, trending in the same breath (352 providers claimed, ~1.47–1.62B pooled free tokens/month, RTK/Caveman compression). FreeLLMAPI and OmniRoute are the two poles of his free-first doctrine: OmniRoute = breadth (providers, models, strategies, his existing investment); FreeLLMAPI = depth for one person (quota learning, encrypted key custody, Anthropic-format endpoint, 40 MB footprint). The honest move is not picking from brochures — it is a measured bake-off on one real workload (requests served, 429s hit, latency, models actually available), letting the Numbers Cop pattern settle it. Second angle: the "7.4B tokens" headline is an *upper bound* — both gateways draw on the same providers' free tiers, and a free tier belongs to his account, not to the gateway; running both does not double Groq. Any capacity planning must count each provider's pool once. Third: key custody cuts both ways — one encrypted local DB holding every provider key is convenient and is also the single most valuable file on the machine; it belongs in the same protection class as his credential store.

**RISKS.** The 30-day catalog lag on free installs is a real, designed limitation. Young project (April 2026) with a premium upsell — the incentive gradient points at the paid tier. **FIRST TEST:** the bake-off above; loser gets cataloged, winner becomes the no-spend lane's front door.

### B5b. "Clones voices, dubs any video into 646 languages, on your own laptop — ElevenLabs for free" → **VoiceStudio** — debpalash/VoiceStudio

**Verdict: WATCH** (real and remarkable; license-fenced for revenue work — a fence Garrett's own audit already found)

**Identification:** certain. The 646-language figure is unique to this project (it comes from its default engine, k2-fsa/OmniVoice, trained on 581,000 hours of audio), and multiple independent October write-ups call it the fastest-growing project on GitHub — matching the caption's other claim. **93,903★, AGPL-3.0, created 2026-04-09, pushed today.**

**WHAT IT IS / HOW TO USE IT.** A fully local voice workbench (Electron app + Python backend): zero-shot voice cloning from a short clean reference, voice *design* from descriptive tags, video dubbing with per-speaker voice preservation, dictation, transcription (WhisperX), multi-voice audiobooks, vocal isolation (Demucs), diarization (Pyannote). Sixteen TTS engines and eleven STT engines are swappable in its model manager. It exposes an OpenAI-shaped local audio API **and an MCP server**, installs per-platform (Windows .exe stable with CUDA/ROCm/CPU, macOS Apple Silicon, Linux, Docker; CPU-only works, slower), and even ships an agent skill (`npx skills add debpalash/VoiceStudio`) so a coding agent can install and drive it.

**WHICH SYSTEM / CREATIVE ANGLES.** **GSE Content OS voice lane — personal and non-revenue use only, unless the engine is swapped.** The fence is precise and was already established in Garrett's own Oct 28 content-stack audit: the *app* is AGPL-3.0, but the default OmniVoice model's weights are non-commercial — so narration for anything that earns money (ads, product videos, client work, monetized channels) cannot ride the default engine. Within the fence, the combinations are strong: local API + MCP means his agents could generate and transcribe voice without audio ever leaving the machine (privacy posture his cloud TTS lanes don't have), and dubbing is the one capability his current stack lacks entirely — a GSE explainer dubbed for Spanish-language audiences is a real growth surface *if* a commercially clean engine is selected in the manager and verified. **RISKS:** license verification per-engine is the whole game here — "open-source app" headlines conceal per-model terms; quality across 646 languages varies wildly (the engine's own docs concede voice design is trained on Chinese/English data). **FIRST TEST:** none until a revenue-voice need forces the engine-license question; personal-use experimentation is unconstrained.

### B5c. "Type one sentence and it makes the whole video" → **MoneyPrinterTurbo** — harry0703/MoneyPrinterTurbo

**Verdict: CONTEXT-ONLY** (capability cataloged; conflicts with his sports-content rules)

**Identification:** high confidence, by function. The caption's pipeline — one topic sentence in; script, voiceover, footage, music, and subtitles out — is this project's documented one-click workflow, and it is the dominant repo in its class: **136,264★, MIT, pushed today.** (The reel named nothing; if the creator meant a different tool, it would be a lesser-known clone of this one's design.)

**WHAT IT IS / HOW TO USE IT.** A Python pipeline (WebUI, API, CLI, and an agent mode): an LLM writes the script from your topic/keyword, TTS voices it, stock footage is fetched and matched, background music and generated subtitles are added, and an HD short is rendered. Install via `pip install mpt` (`mpt webui`, port 8503; or `mpt cli`), Docker Compose, or source; config in `config.toml`, with API keys for whichever LLM/material/voice services you choose entered in the WebUI.

**WHICH SYSTEM / CREATIVE ANGLES.** For GSE sports: **none** — his standing rule requires real game footage with transformative, commentary-led editing; an automated stock-footage assembler is the exact genre that rule and the 2026-09-15 rejection ("no AI slideshow substitutes") exist to exclude. Cataloged honestly for two narrower things: (1) non-sports ARE faceless-short experiments where templated assembly is the genre (listicle/affiliate formats), entered with eyes open about commoditization — when a pipeline has 136k stars, its output shape is the internet's most recognizable filler; (2) as a *component donor* — its script→TTS→subtitle timing pipeline is a reference for assembling his own commentary-led edits faster, keeping his footage and his voice rules. **RISKS:** quality ceiling, platform-policy exposure on fully automated content, and brand risk if its output shape ever touched the GSE name. **FIRST TEST:** none proposed.

## B6. @githubsignals (#33) — Openjutsu — D3voz/openjutsu

**Verdict: WATCH** (the right tool class for a lane Garrett has deliberately stopped; hardware-blocked besides — cataloged for the day that decision reopens)

**WHAT IT IS (mechanism).** An open-source, fully local alternative to Higgsfield's Genjutsu motion transfer. It is a small Next.js app driving ComfyUI workflows through the Comfy API: **SAM 3.1** tracks people in the source video (at 1008 px working size); the tracked person is converted into a sharp *grey mannequin* of their exact silhouette — that mannequin is the motion reference; **MiniMax H3** (open weights, INT8-pruned build) regenerates only the masked region as your character from a photo, so camera, cuts, motion, and the original soundtrack survive untouched. **Qwen3-VL 8B** describes shots and matches people to roles. Modes: **Simple** (one character replaces the main person), **Advanced** (1–4 characters with per-shot role matching, plus a Montage mode for edited clips with handovers), **Object swap** (SAM tracks a named thing — hair, jacket, a car — and changes, removes, or re-backgrounds only it), **From picture** (FLUX poses your character into a frame, optional relight in nine looks, then video), and two post passes — **Fix faces** (redraws small faces at close-up size and pastes them back, the known H3 weakness) and **Fix colours** (a DCTL tone-map grade, no H3 run, seconds per clip). A pre-flight check compares the workflow against ComfyUI's installed nodes/models and tells you exactly what's missing.

**WHERE TO FIND IT.** https://github.com/D3voz/openjutsu (266★, 46 forks, MIT, TypeScript, **created 2026-10-26 — three days old**, pushed today; 38 open issues). A sibling, Comfy-Org/comfy-openjutsu (50★), is Comfy's own clonable reference app — provenance is unusually good for a three-day-old project. The @githubsignals caption names it directly ("Open source: d3voz/openjutsu").

**HOW TO USE IT.** Hard requirements: **an NVIDIA GPU** (developed/tested on an RTX 4060 Ti 16 GB with 64 GB system RAM; H3 INT8 models stream from RAM), ComfyUI ≥ 0.41.2, Node 22.6+, Python for the `comfy-api-proxy`. About a dozen custom-node packs (SolarRenderer, MiniMaxH3 context-loop and prompt-builder packs, KJNodes, controlnet_aux, VideoHelperSuite, the author's own swap/face/grade packs, Impact Pack) plus a model shopping list: H3 INT8 diffusion model + DMAD speed LoRA, Qwen3-VL text encoders (32B INT4 for H3, 8B INT8 describer), H3 video/audio VAEs, SAM 3.1 checkpoint, YOLO face/person models, InsightFace buffalo_l. Run: start ComfyUI on :8188, install/patch/start comfy-api-proxy on :8189, `npm ci && npm run build && npm start`, open localhost:3000 (Windows gets a `start_openjutsu.bat`). Costs in time: ~6–13 minutes for a 6-second 480p swap on the reference GPU; 1080p ≈ 2.5× slower than 736p; face-fixing a 17 s video ≈ 28 minutes. Known breakage: mirrors/reflections defeat it (the reflection keeps the original person and H3 copies their look back).

**WHICH SYSTEM IT PLUGS INTO.** **The Nova / GSE video lane — adjacent, not active.** Garrett stopped the Nova video lane on 2026-10-28 (bible §57) and assigned its future to Kimi K3, on his word. Openjutsu does not override that; what it does is change the option set for the day he reopens it: the lane's previous choices were Higgsfield's paid creator tool (credits, cloud, his §53 pick) or nothing. There is now a third: an MIT-licensed local pipeline in the same tool class. It is *also* blocked independently of the stop order — neither this VM nor his Windows host has an NVIDIA GPU (Kaggle is the fleet's only GPU lane, and Openjutsu is an interactive desktop ComfyUI app, a poor fit for a Kaggle session). Both blocks are recorded plainly; neither is a verdict on the tool.

**CREATIVE ANGLES.**
- **The three-way comparison, pre-registered:** when the video lane reopens, the honest test is the same source clip through Kimi K3, Higgsfield Genjutsu, and Openjutsu, judged on his realism bar (Nova bible §38: look/sound/feel/move real, movement test). Openjutsu's presence makes that comparison possible at $0 marginal cost per attempt.
- **Object swap is the sleeper feature for his actual current work:** swapping a *thing* (a jersey, a logo, a product) inside real footage, with everything else untouched, fits inside his transformative-edit doctrine in a way person-swapping doesn't need to — short clips, commentary-led, his footage rules intact.
- **Fix colours as a standalone:** the 5-second grade pass for H3's harsh look is a general "de-AI the grade" utility — the kind of small tool that earns its keep outside its parent app, if a GPU ever hosts it.

**RISKS AND LIMITS.** Three days old; 38 open issues; multi-GB model downloads; render times that make iteration slow; reflection failure mode; and the general face-swap adjacency — his use stays inside his own footage, his own persona, and his honesty rules (Nova answers honestly that she is AI when asked). **FIRST TEST:** none while §57 stands and no NVIDIA GPU exists. Trigger: Garrett reopens the video lane, or a GPU node joins the fleet.

---

# PART C — SYNTHESIS: WHAT TODAY'S FEED IS ACTUALLY SAYING

## C1. The pattern across the eleven items

Read together, the eleven deep-dived items are not eleven random tools. They cluster into three systems, and the clusters assemble themselves:

**A free-first inference stack, in three layers.** Headroom compresses what agents send (30–57% on agent-shaped traffic). FreeLLMAPI and OmniRoute pool free provider tiers behind one key. Mesh LLM floors the whole thing with local hardware. Each layer is independently useful, independently testable, and multiplies the others: compression makes free quotas bigger; routing makes more quotas reachable; a local floor makes the stack degrade instead of die when a provider rate-limits you — which, in this fleet's lived experience (a 429 stopped this very sweep this morning), is not an edge case but a Tuesday. A year ago this stack was a architecture diagram people argued about; this feed delivered all three layers as shipping open-source with five- and six-figure star counts. The scarce resource has moved: it is no longer model access, it is **orchestration, context cost, and verification**. That is, not coincidentally, a description of Garrett's existing operating model — Motif orchestrates, the Review Board verifies, free-first routing is doctrine. The ecosystem is productizing his architecture back at him; the opportunity is to adopt the productized pieces where they've out-built his hand-rolled ones, and to notice that his hand-rolled doctrines (merge gates, proof-in-artifact) keep showing up as other people's headline features (Univer's worktrees, ReelMimic's screenshot-proof reviews, Zero Breach's reproducible builds, Headroom's reversible compression).

**A family shield, in three sides.** Zero Breach checks the *device* (traces already present). Watcher checks the *perimeter* (his names/domains/credentials exposed or impersonated out in the world). malicious-pdf provides the test fixtures for the *input* side (the documents his own pipelines ingest). Device, perimeter, input — a coherent defensive posture assembled accidentally by one morning's algorithm. The algorithm does not know about his Oct 22 secret-incident history or his stated family-protection intent; it just keeps serving security tooling because he lingers on it. The feed, read at depth, is a mirror of attention — which is the introspective point of this sweep design: the value was never the posts, it's what his attention has already selected, verified at primary source.

**A video lane in suspension, with its future option set quietly improving.** ReelMimic (agent-crew animation), Openjutsu (local motion transfer), Hypit from S48 (template extraction), VoiceStudio (local voice) — the content tooling keeps arriving whether or not he is buying. Because the Nova lane is stopped by his order, the right move is exactly what happened: catalog at depth, spend nothing, and let the option set mature. When Kimi K3's turn comes, it will be judged against real alternatives instead of a vacuum.

## C2. What combines, specifically

1. **Headroom × FreeLLMAPI/OmniRoute.** Compression in front of routing. The bake-off should include a third arm: Headroom + winner, since the combination is the actual candidate architecture for the fleet's no-spend lane.
2. **Zero Breach blocklists × home DNS.** The scanner's by-product (`dist/` hosts/dnsmasq outputs) is a prevention layer for every device on the home network — the only item today whose second use is arguably bigger than its first.
3. **Watcher × Kit.** One Watcher instance, many clients' domains: threat vigilance as the recurring-revenue wrapper on one-time website sales. This is the funnel doctrine in miniature — the client can't climb to "monitor my own exposure" alone; Garrett sells the climb.
4. **Univer × fleet MCP bus.** A workbook as a shared agent/human surface is the missing display layer for the picks reasoning trail — the doctrine wants the reasoning *published*; Univer is the first found tool where the reasoning could live as an editable artifact instead of a post.
5. **Mesh LLM MoA × Review Board.** Deterministic arbitration over parallel model verdicts is the Review Board's merge step, mechanized. Even if Mesh itself waits, the pattern — fan out, arbitrate in code, escalate only on conflict — is a design decision available to the fleet's own verdict plumbing today.
6. **ReelMimic's protocol × Content OS.** Builder/reviewer separation with screenshot proof, and style-as-Markdown, are adoptable as *process* this week, at zero installs, while the product itself stays on the shelf.

## C3. What changes a workflow he already runs

- **Coding-agent sessions** get a cost layer (Headroom) and a measured baseline (`headroom savings`) where today there is neither measurement nor compression — the fleet's largest recurring token spend becomes an instrumented number.
- **The routing question stops being a preference.** OmniRoute-vs-FreeLLMAPI becomes a bake-off with a loser, run once, on his traffic — the same replace-guesses-with-measurements move as the Hermes Pattern's correlation work.
- **Family Shield stops being a lane description and becomes two scheduled checks** (device scan diff + exposure digest) with a fixture test for the ingestion path behind them.
- **The sweep itself changes:** this pass is the template — captions and claims are merely pointers; the repo is the post. Comment sections contributed nothing to any dossier above, which settles the format question empirically for future runs.

## C4. Proposed test order, with reasons

1. **Headroom** — highest leverage, lowest risk, self-measuring. One wrapped vs unwrapped task decides it. Benefits every agent he runs, starting the day it lands.
2. **Zero Breach Toolkit** — run on this VM first (known contents, Linux path is the simple one), verify the reproducible-release hash while doing it, then the family devices conversation is grounded in a real report instead of a claim.
3. **Watcher** — one Docker deployment, three watch rules, one week of quiet-or-signal. It guards the exact failure class that already cost him once (public secret exposure), and it is the only candidate that can turn into client revenue (Kit add-on).
4. **FreeLLMAPI × OmniRoute bake-off** (with a Headroom-combined arm) — one workload, three configurations, numbers decide the routing stack's shape.
5. **Univer** — when the DFS packet or another real sheets surface is scheduled; testing it speculatively, without a surface that needs it, would violate his own adopt-at-need discipline.
6. **Mesh LLM single-node endpoint test** — cheap and bounded (`--local-model-only`, one small GGUF, verify :9337 + an agent launcher). The full private mesh waits for a second node worth meshing; stage splits wait for a GPU.

**Waiting on hardware or on Garrett's word, honestly labeled:** OpenNavo (needs a Mac), Openjutsu (needs an NVIDIA GPU and a reopened video lane), VoiceStudio revenue use (needs an engine-license decision), malicious-pdf battery (a scheduled hygiene task, not a blocker).

## C5. Gap audit for this pass

- **Read at depth:** 11 repos' full READMEs + metadata; repo trees for Zero Breach (full recursive), Univer, Watcher, Mesh LLM, Openjutsu (root level); Zero Breach releases + open issues; Headroom open-issue themes (partial sample — one API page returned malformed JSON mid-read; theme coverage is indicative, not complete).
- **Not done, by design:** no installs, no executions, no code-level audit of any repo (READMEs and docs are the projects' own claims — where a number matters, like Headroom's savings, the dossier routes the decision through Garrett's own measurement rather than trusting the claim); no comment-section analysis (per Garrett's directive — and empirically unnecessary: every payload resolved without it); @cracked.artificial's three projects were identified by functional description, two with verbatim-description certainty, one (MoneyPrinterTurbo) by class-dominance — the creator's gated list itself was not obtained, by the standing no-commenting rule.
- **Instagram:** 5 post fetches this pass, zero 429s. The AM run's 429 gap (media-understanding and comment fetches at 0/20) remains open but is now moot for these eleven items — their dossiers rest on primary sources, not on the posts.
- **Still undisected from the AM inventory:** #24 (Ernie Johnson), #27 (starter_story), #29 (bond-market claim), #30, #32, #34, #35 — none is a named-tool post; they remain unindexed for a future run, unchanged from the AM gap audit.

*End of deep-dive pass. Companion files: raw evidence under `~/workspace/ig-for-you-sweep/raw/deep-dive/` (repo metadata + README JSON/MD for all eleven repos); AM report `reports/2026-10-29-AM.md`; seen index updated with the six Part B posts.*

---

# PART 3 — INSTAGRAM, MIDDAY 30 — BATCH A (posts 1–15)

# Instagram For You sweep — 2026-10-29 midday, Batch A (positions 1–15)

Account: @gbeexly, home For You/Suggested feed (inventory: `raw/2026-10-29-midday-feed-inventory.md`). All 15 posts pulled via instagram-cli — **zero 429s this batch**. Raw JSON in `raw/2026-10-29-midday/`. Media-understanding read on the 6 payload-bearing posts. Comments were not analyzed (one gate-locator theme noted on #8 from stored annotation, not a comments pull).

## Top finds

1. **Opik (#2) — TEST.** The "self-host your entire AI observability stack" post resolves to a real, major open-source platform: comet-ml/opik, 23,022★, Apache-2.0, pushed today. It goes past tracing into root-cause-and-fix loops and plain-English regression suites — the exact shape of the fleet's QC problem.
2. **Kem's verification skill (#13) — LEARN-ONLY (high value).** A complete, transferable method for giving agents "hands and eyes" (Playwright, DevTools, image diff, Storybook, Sentry) packaged as a SKILL.md — a direct mirror of Garrett's "wired = verified in the artifact" doctrine, with a build recipe attached.
3. **YouPi-PG (#8) — WATCH.** A real zero-fee self-hosted payment gateway (youpi-pg/YouPI-PG, 2,718★), but UPI/India-only by design. The mechanism (bank-notification-verified payments) is the interesting part, not a US fit today.

---

## Dossiers

### #1 — @carterperez.dev — reel — "Hermes" malware investigation (dev series part 4)
- URL: https://www.instagram.com/reel/DfFXDxkBKze/ · Media 18115581194111167 · 157 likes · posted 2026-10-29
- WHAT IT IS: Part 4 of a supply-chain investigation. A Python X-client library ("xscrape") was found carrying hidden malware that reports to a panel sold as **"Hermes"** on Russian-language forums (exploit.in, XSS.mx). The presenter traces 28 trojanized GitHub repos updated in lockstep by one operator account, and locates a live C2 via Shodan. Full paper linked in caption: papers.lisdex.sh/hermes/paper.pdf. **Name collision warning: this "Hermes" is a malware panel — it is NOT Garrett's Hermes agent.** The shared name is exactly why it belongs in the record.
- WHERE: post above; paper at papers.lisdex.sh (linked from the caption itself).
- SYSTEMS: Family Shield / fleet supply-chain hygiene. The pattern — popular-looking GitHub utility repos trojanized by a single coordinated publisher — is the threat model behind Garrett's repo-vetting rules and the S44/S4-style cautions in the register.
- CREATIVE ANGLES: the lockstep-update fingerprint (many repos pushing within minutes) is a cheap detection heuristic for any future "trending repo" intake: check the publisher's sibling repos and update cadence before trusting a star count.
- RISKS: single-presenter investigation; the paper is the primary source and was not independently reproduced here. Claims about the named operator are the presenter's (UNVERIFIED beyond his published evidence).
- FIRST TEST: none — awareness item. **Verdict: LEARN-ONLY** (threat awareness).

### #2 — @dailydoseofds_ — photo — Opik, self-hosted AI observability stack ⭐
- URL: https://www.instagram.com/p/Deld9TBjYyr/ · Media 18135560953643660 · 236 likes · posted 2026-10-16
- WHAT IT IS: **Opik** (by Comet) — an open-source LLM/agent observability, evaluation, and optimization platform. Per the post and verified against the repo: (1) tracing of every call/tool/retrieval step across 50+ frameworks; (2) **Ollie**, a built-in coding agent that reads the span tree, finds the root cause of a failure, proposes a diff, and — on approval — reruns the agent against the exact failing inputs; (3) test suites that turn each debugged failure into a permanent regression test written as plain-English checks instead of score thresholds; (4) an agent sandbox for testing prompt/model changes end-to-end before shipping.
- WHERE: **github.com/comet-ml/opik** — 23,022 stars, 1,905 forks, Apache-2.0, Python, created 2023, pushed 2026-10-29 (active today). Repo tree shows a serious multi-app monorepo (apps/, deployment/, SDKs; agent-tooling dotdirs for Claude/Codex/Cursor in-tree).
- HOW TO USE IT: self-host via the repo's install scripts (opik.sh / opik.ps1, deployment/ directory) or pip SDK + one decorator to instrument an agent; traces, evaluations, and the Ollie fix loop run against your own deployment. Comet also sells a hosted cloud tier — the open-source self-host path is the one that matters here.
- WHICH SYSTEM: **agent fleet infrastructure / QC.** The fleet's standing failure mode is agents shipping unverified work (the dependency-audit waiver pattern, PR descriptions that contradict diffs). Opik's trace→root-cause→approved-diff→rerun-on-failing-inputs loop is that QC pattern as a product, and its plain-English regression suites match Garrett's "checks a person can read" preference.
- CREATIVE ANGLES: point Ollie-style reruns at the fleet's own recurring failure classes (waiver slips, placeholder overwrites) so each caught defect becomes a permanent regression check; pair with this morning's Watcher find (perimeter) — Opik is the inside-the-agent counterpart.
- RISKS: heavyweight platform (multi-service deployment) for a small fleet; Ollie is a vendor feature whose fix quality is the vendor's claim until tested (UNVERIFIED at our scale); Apache-2.0 core is clean, but confirm the self-hosted build excludes no features behind the cloud tier before committing.
- FIRST TEST: self-host on the VM, instrument one disposable agent task, break it deliberately, and see whether the trace + proposed diff + rerun loop catches and fixes it without hand-holding. **Verdict: TEST.**

### #3 — @shootwithali — reel — fashion (Friday the 13th mini dress, Hot Topic)
- URL: https://www.instagram.com/reel/DfFaLtkgTMv/ · 185 likes · posted 2026-10-29
- Content: alt-fashion outfit post; no tool, repo, or claim. Halloween-adjacent costume content only.
- **Verdict: CONTEXT-ONLY.**

### #4 — @dayofexploits — carousel — CamXploit (offensive tool — recognition only)
- URL: https://www.instagram.com/p/Dd7EFOEk9u4/ · Media 18184635724412525 · 370 likes · posted 2026-09-30
- WHAT IT IS: **CamXploit** — a reconnaissance tool for finding potentially exposed IP cameras by scanning open ports and common misconfigurations. Verified at primary source: **github.com/spyboy-productions/CamXploit**, 1,201 stars, pushed 2026-01-06; the repo description matches the caption nearly verbatim.
- TREATMENT: threat-awareness only, per the ZOON/WishFish precedent — no operating detail, no usage instructions, nothing run. Its defensive value: exposed-camera scanning is a known, packaged technique; a household camera setup should be checked for exactly this class of exposure (default credentials, open ports, cloud-relay misconfig) from the defender's side.
- SYSTEMS: Family Shield (defensive recognition). Never adopted, never run — same standing line as WishFish.
- **Verdict: CONTEXT-ONLY** (threat awareness; cataloged, not killed — the entry exists so the technique is recognized on sight).

### #5 — @houseofhighlights — reel — sports clip
- URL: https://www.instagram.com/reel/DfFKMj0zy_6/ · 45,267 likes · posted 2026-10-29
- Content: NBA highlight/reaction clip ("IQ in sync with Scottie"), via X. No payload beyond the clip itself; NBA content context for GSE social awareness.
- **Verdict: CONTEXT-ONLY.**

### #6 — @githubprojects — photo — OOMWOO open-source robot vacuum ⭐
- URL: https://www.instagram.com/p/Dee733jvYUT/ · Media 18075265913474932 · 11,606 likes · posted 2026-10-14 · Link in caption: osp.fyi/oomwoo
- WHAT IT IS: **OOMWOO** — a build-it-yourself open-source robot vacuum: Raspberry Pi compute, ESP32/Arduino motor control, ROS2, a cheap 2D LiDAR for mapping, 3D-printed chassis, Home Assistant integration, and **fully local operation — no cloud account, no telemetry phone-home**. Honest status from the project's own page: hardware not yet validated end-to-end; today it runs in simulation, build instructions pending validation.
- WHERE: **github.com/makerspet/oomwoo** — 12,864 stars, Apache-2.0, pushed 2026-10-29 (today). Family of repos: oomwoo-cad (84★, 3D CAD), oomwoo-pcb (51★, I/O board), oomwoo-one (59★, ROS2 description package). Main tree includes BOM.md (bill of materials) and docs/.
- HOW TO USE IT: today — clone and run the ROS2 simulation; the BOM and CAD/PCB repos define the physical build for when validation lands. Nothing to buy or assemble yet.
- WHICH SYSTEM: no direct GSE/revenue lane — this is a **future-projects / household** item, and its real value to Garrett is architectural proof: a consumer device class (robot vacuums are notorious cloud spies) rebuilt local-first with commodity parts. That local-first pattern is the same doctrine as his fleet and Family Shield posture.
- CREATIVE ANGLES: the LiDAR-mapping + ROS2 stack is a cheap robotics learning platform if a hardware project ever enters the queue; the BOM-first, CAD/PCB/firmware split-repo structure is a clean template for open-hardware publishing generally.
- RISKS: not buildable yet (project's own admission); star count (12.9K) reflects interest, not a working product; parts cost and time are real when validation lands.
- FIRST TEST: none warranted now — simulation only. Revisit when the project marks hardware validated. **Verdict: WATCH.**

### #7 — @dani_white12 — carousel — fashion
- URL: https://www.instagram.com/p/DfDvlRYDTqa/ · Media 17918260950467384 · 20 likes · posted 2026-10-28. (The capture's malformed long-suffix permalink resolved cleanly by shortcode — no search needed.)
- Content: outfit post ("Fb saw the drip"), no caption payload, no tool or claim.
- **Verdict: CONTEXT-ONLY.**

### #8 — @drcintas — reel — GATE "OPEN": YouPi-PG, zero-fee payment gateway ⭐
- URL: https://www.instagram.com/reel/DerepBfSJSK/ · Media 18636966520063942 · 1,928 likes, 2,337 comments (gate signature: comments exceed likes) · posted 2026-10-19
- WHAT IT IS: The gate hid the name; the reel itself names it: **YouPi-PG** — a self-hosted payment gateway for **UPI and cash-on-delivery** with zero per-transaction platform fees. Mechanism: a JS checkout snippet + pay button generates a UPI QR/payment link; the customer's payment lands directly in the merchant's own bank account/UPI ID (no intermediary holding funds); the gateway then **verifies payment by monitoring the merchant's bank SMS and email alerts** and flips the order status automatically. Presenter contrasts it with Razorpay/Stripe taking 2–3% + tax.
- WHERE: **github.com/youpi-pg/YouPI-PG** — 2,718 stars, JavaScript, created 2026-09-19, pushed 2026-10-28. (License: the GitHub API returned no license object — treat as UNCONFIRMED until the repo's LICENSE file is read; that is a real adoption blocker, not a detail.)
- HOW TO USE IT: self-host the gateway, add its script tag and pay button to a checkout page, configure your UPI/bank alert channels; customers pay by QR/link to your account directly and the site confirms via the alert watcher.
- WHICH SYSTEM: **revenue infrastructure — by pattern, not by install.** The honest limit: UPI is India's rail. Garrett's lanes (Kit sites, ARE) settle in USD through Stripe-class rails, so this exact tool does not drop in. What transfers: (1) the proof that a zero-fee, notification-verified pattern works at 2.7K-star scale — relevant to any future India-market or UPI-accepting client work; (2) the design lesson for Kit offers in fee-sensitive markets; (3) a watch item if a US-analog (ACH-alert or open-banking-webhook based) ever appears.
- CREATIVE ANGLES: for a client whose customers already pay by direct transfer/Zelle-style rails, a watcher that auto-confirms orders removes the manual "did they pay?" step — that workflow gap exists in US small-business commerce too, and this repo is the reference implementation of the pattern.
- RISKS: verification depends on SMS/email alert parsing — fragile (formats change, alerts delay, dual-SIM/routing edge cases); funds-flow with no intermediary means no chargeback/escrow protection layer; license unconfirmed; six weeks old; stored annotation on the post shows commenters raising exactly the reliability and India-only scope concerns.
- FIRST TEST: none for US lanes. If ever evaluated: read the LICENSE and the alert-parsing code first, then a ₹1 self-payment in a sandbox store. **Verdict: WATCH** (pattern cataloged; geography is the current constraint).

### #9 — @ariacodez — reel — GATE "DRIVE": 9Drive, pooled Google Drive storage
- URL: https://www.instagram.com/reel/DfFZSNfqTMr/ · Media 18656962930013494 · 183 likes · posted 2026-10-29
- WHAT IT IS: The reel names it on screen: **9Drive** — an open-source web app that connects multiple Google Drive accounts (plus S3 buckets) into one unified storage dashboard, pooling their free quotas (presenter's example: 4 accounts = 60GB), with routing to whichever account has space. The "DRIVE" gate hides only the creator's copy-paste AI-agent setup prompt, not the tool.
- WHERE: **github.com/zenhosta/9drive** — 2,718 stars, Apache-2.0, pushed 2026-10-25. Description matches the reel.
- HOW TO USE IT: self-host the web app, OAuth-connect your Drive accounts, upload/download through the single dashboard; it places files across accounts by available space.
- WHICH SYSTEM: marginal for Garrett — his storage problem is corpus organization, not raw free-tier gigabytes, and his Drive is already connected through sanctioned routes. Nearest fit: a future-projects/household overflow pool, or a Kit client pattern for storage-poor small shops.
- RISKS: pooling multiple free accounts to dodge paid tiers sits against the spirit of Google's consumer terms — account-action risk is the user's (UNVERIFIED either way; flagged, not asserted); a self-hosted app holding OAuth tokens for many accounts is a high-value target — the Zero Breach lesson applies: token storage is the product's soft underbelly.
- FIRST TEST: none proposed. **Verdict: LEARN-ONLY** (pattern cataloged: storage-gateway pooling; constraint = ToS-adjacency + token risk).

### #10 — @d3ndr1t30x — photo — PHP2Shell attribution correction ⭐
- URL: https://www.instagram.com/p/Dezvqx1mK8L/ · Media 18066509894513060 · 414 likes · posted 2026-10-22
- WHAT IT IS: A creator publicly correcting his own earlier post. **PHP2Shell** = two PHP engine RCE flaws, **CVE-2026-109618 and CVE-2026-109619, CVSS 9.2**, emergency-patched 2026-10-21. His original post credited Wiz Research alone; the correction restores the full record: **Calif's Ryan Austin reported an RCE on Aug 11** (audit begun Jul 30, via OpenAI's Patch the Planet); **OpenAI independently reported the same root cause** and later contributed more attack paths (Sep 18); **Wiz reported Aug 24** after its own discovery (Aug 19). The post also carries SinSinology's accusation that Wiz bought the php2shell domain and out-marketed the other finders.
- VERIFICATION (primary timeline: PHP Foundation via TechTarget/Medium deep-dives): the correction's dates and credits **check out** — Calif Aug 11 ✓, Wiz Aug 24 ✓, OpenAI independent root-cause report ✓, coordinated credit to all three at announcement (Oct 20) ✓. One nuance the correction itself underplays: Wiz genuinely discovered both CVEs independently with its own tooling — "Wiz did research here" is right, and the record supports independent discovery, not copying. The domain/marketing accusation remains **an accusation (UNVERIFIED motive)**; the documented harm is narrower and real: headline coverage centered Wiz while Calif's earlier report was in the Foundation's own timeline.
- WHICH SYSTEM: **fleet doctrine / Family Shield intel.** Two transfers: (1) an operational one — any PHP surface in Garrett's stack (client WordPress-class sites in the Kit lane especially) needed the Oct 21 patches; PHP 7.4/8.0/8.1 are EOL with no official fixes, so version inventory matters; (2) a culture one — this post is the verification-integrity standard in public: a small creator correcting attribution against a vendor's marketing gravity is the same discipline as Garrett's provenance doctrine ("provenance is the product").
- CREATIVE ANGLES: the three-way independent discovery (Calif + OpenAI + Wiz, all AI-assisted) is itself a signal: frontier-model vuln research now finds decade-old engine bugs — fleet security assumptions should price that in for every dependency, not just PHP.
- RISKS: none in the item itself; the underlying CVEs are the risk (in the wild since Oct 17 honeypot attempts).
- FIRST TEST: none — record item. If a PHP version inventory of Garrett's/Kit surfaces hasn't been run since Oct 21, that's the follow-up it implies. **Verdict: LEARN-ONLY** (verified correction; doctrine + patch-posture value).

### #11 — @specialreport — reel — "PROJECT FORTRESS" DoD commentary
- URL: https://www.instagram.com/reel/DfA6007FPif/ · 69,466 likes · posted 2026-10-27
- Content: commentary reel claiming the DoD is updating domestic defense strategy for multi-domain scenarios (grid blackouts, satellite interference, supply-chain disruption). No document, tool, or primary source is named in the post; "PROJECT FORTRESS" as a named program is **UNVERIFIED** from this post alone.
- Lane note: the scenario list (grid/satellite/supply-chain) overlaps Garrett's family-preparedness interests, but an unsourced commentary reel is context, not intel.
- **Verdict: CONTEXT-ONLY** (claims UNVERIFIED).

### #12 — @neuron.machinelearning — photo — 20 ML algorithms cheatsheet
- URL: https://www.instagram.com/p/DejSYdxIvhX/ · Media 18138814075725477 · 2,408 likes · posted 2026-10-16
- Content: a standard, accurate taxonomy cheatsheet (regression/classification/ensembles/clustering/dim-reduction/DL/RL) with when-to-use guidance. Nothing novel; the caption's own thesis — "the most sophisticated algorithm isn't necessarily the best one" — is sound and matches the engine's measured-values discipline.
- Lane note: reference/teaching value for the research program's newer readers; no method, dataset, or tool to adopt.
- **Verdict: LEARN-ONLY** (brief — generic but correct reference material).

### #13 — @kem_glitch — reel — "Verification is how you move" ⭐
- URL: https://www.instagram.com/reel/DfAIPrAtteM/ · Media 18140018914555425 · 452 likes · posted 2026-10-27 (AM-feed #34, never dissected until now)
- WHAT IT IS: A method post, read in full via stored annotation. Kem (Glitch Cat Club) argues verification is the single highest-leverage agent skill: an agent must check its own work by *using* it — "hands, eyes, and tools" — instead of claiming a fix. The stack he demos: **Playwright** (hands — drive the real app), **Chrome DevTools** (eyes — catch 500s/console errors), **image diff** (pixel comparison for visual regressions), **Storybook** (every component state laid out), **Sentry** (what real users actually hit). The packaging is the payload: he builds it as a reusable **SKILL.md** by answering five questions — surface, run, drive, observe, isolate — and uses codegen to turn manual clicks into repeatable tests. Before/after proof is the output format.
- WHERE: the method is in the reel itself (no repo named or needed); the five tools are standard open-source/known products (Playwright, Storybook, Sentry et al.).
- WHICH SYSTEM: **fleet-wide doctrine, immediately.** This is Garrett's "wired = verified in the artifact" rule and the QC gate, expressed as an agent skill: a session that must open the board, drive it, screenshot-diff it, and hand back proof would have caught the placeholder-scoring.ts and waiver-slip failures structurally, not by vigilance. It also composes with #2 (Opik): Kem's skill is the *act* of verification; Opik is the *record* of it.
- CREATIVE ANGLES: write the five-question SKILL.md for the Sports repo's two most-burned surfaces (public board, dependency audit) so verification becomes a file every coding session loads, not a reminder in a prompt; the isolate question (what state must be controlled for the check to mean anything) is the one most home-grown checklists skip.
- RISKS: demo-scale evidence (three toy apps) — the method is sound, the magnitude of benefit at production scale is the creator's claim (UNVERIFIED); browser-driving verification is slower per run, so it belongs on gates, not every commit.
- FIRST TEST: draft the SKILL.md for one surface (the board) from his five questions and run it once against the known gate_decisions failure mode. **Verdict: LEARN-ONLY** (method adopted into doctrine candidates; the test above is a writing task, not a tool install).

### #14 — @mattjayy — reel — Florida driver license database breach
- URL: https://www.instagram.com/reel/DdErmDuNMwb/ · 57,345 likes · posted 2026-09-09 (reel predates the official disclosure; the underlying event is verified)
- VERIFIED EVENT: FLHSMV's DAVID driver/vehicle database was accessed on **2026-09-04** using compromised credentials of a Plant City police employee that were **improperly stored on a personal electronic device**; FLHSMV announced 2026-10-16, is notifying current/former FL license, ID, and title holders, and offers a year of Sontiq monitoring + $1M identity insurance. DL/vehicle records and document images potentially affected; count undisclosed; the ShinyHunters attribution is reported but not officially confirmed (UNVERIFIED).
- WHICH SYSTEM: **Family Shield.** Garrett is Texas-based, so direct exposure turns on ever having held a FL license/title (unknown — not asserted). The transferable lesson is the intrusion vector itself: the breach entered through credential storage hygiene at the *edge* of a system, not through the core — the same lesson as Garrett's own Oct 22 secret-incident history.
- **Verdict: CONTEXT-ONLY** (news; verified, with a Family Shield hygiene note).

### #15 — @brwalkoff — reel — Brewers World Series final out
- URL: https://www.instagram.com/reel/DfEFp16SQhA/ · 29,117 likes · posted 2026-10-28
- Content: crowd-noise clip of Milwaukee's final out (via @mlb), matching this morning's feed cluster of Brewers title content. No claim to verify beyond the event coverage itself; MLB content context for GSE.
- **Verdict: CONTEXT-ONLY.**

---

## Gap audit — Batch A

- Feed items in batch: 15 (positions 1–15). Dissected: 15/15. Full dossiers: 8 (#1, #2, #4, #6, #8, #9, #10, #13). Honest briefs: 7 (#3, #5, #7, #11, #12, #14, #15).
- 429s: **none.** All instagram-cli calls (15 post pulls + 1 batched media-understanding for 6 media) completed.
- Primary sources checked: GitHub API on comet-ml/opik, makerspet/oomwoo (+3 sibling repos), youpi-pg/YouPI-PG, zenhosta/9drive, spyboy-productions/CamXploit; PHP Foundation timeline via TechTarget/Medium reporting; FLHSMV disclosure via dig.watch/Alachua Chronicle/TC Sentinel.
- Gates encountered: #8 "OPEN" and #9 "DRIVE" — both payloads were recoverable from the posts themselves (names spoken/shown on screen); the gated extras (DM'd link; setup prompt) were not pursued, per the no-outreach rule.
- Left UNVERIFIED: #1 operator-attribution claims (presenter's paper is the source); #8 YouPi-PG **license (API returned none — must read the repo LICENSE before any use)** and its reliability at scale; #10 domain/marketing accusation (motive); #11 "PROJECT FORTRESS" as a named program; #14 ShinyHunters attribution.
- Not read: full READMEs beyond metadata/tree for the resolved repos (time-boxed run); the Hermes paper PDF (linked, not fetched); image-diff-level reads of #12's cheatsheet graphic itself (caption carries its full taxonomy).
- What closes each: LICENSE file read for YouPi-PG; paper PDF fetch for #1; a DoD primary source for #11; an Opik hands-on (already specified as its first test).

---

# PART 4 — INSTAGRAM, MIDDAY 30 — BATCH B (posts 16–30)

# Instagram For You discovery sweep — 2026-10-29 midday, batch B (positions 16–30)

Account: @gbeexly. Inventory: `raw/2026-10-29-midday-feed-inventory.md`. All 15 posts fetched in full via instagram-cli (JSON in `raw/2026-10-29-midday-B/`); media-understanding run on the 5 priority posts. **No 429 hit this batch.** Comments were not read (by rule) — every payload locator was found in the post itself or its screen content.

Verdicts: TEST ×1, LEARN-ONLY ×4, CONTEXT-ONLY ×10, ADOPT ×0, WATCH ×0.

---

## #19 — @gittrend.io — Claude SEO (the reel's gate hides a real, large repo) — TEST

- URL: https://www.instagram.com/p/De9us3NAi0A/ · Media 18139951957622822 · 1,725 likes, 694 comments (the "seo" keyword gate at work)
- **WHAT IT IS:** The screen recording in the reel shows the repo directly: **Claude SEO — a universal SEO skill for Claude Code**. Verified at primary source: **github.com/AgriciDaniel/claude-seo** — 23,860 stars, MIT license, last pushed 2026-10-22. (The stored screen read rendered the owner as "AgricDaniel"; the real owner is **AgriciDaniel** — a direct metadata call on the misread name 404s, a name search resolves it.) Per the repo's own description: 26 sub-skills + 19 sub-agents covering technical SEO, E-E-A-T, schema, and GEO. Per the reel's screen read of the repo page: audits technical SEO, crawlability, indexing, sitemaps, robots.txt, redirects, page speed, Core Web Vitals, content quality, structured data, and AI-citation readiness (how Google AI Overviews, ChatGPT, Perplexity, and Gemini cite a page). Claimed runtime: a full site audit in 10–15 minutes vs a 4–8 hour manual audit.
- **WHERE:** https://github.com/AgriciDaniel/claude-seo — the DM gate was never needed; the payload was on screen in the reel itself.
- **HOW TO USE IT:** It's a Claude Code skill pack — install per the repo README (README internals not read this pass; metadata + description + the reel's own screen capture were), then invoke the audit per site inside Claude Code. Adjacent verified alternatives in the same search: zubair-trabzada/geo-seo-claude (11,355★, MIT, GEO-first) and JeffLi1993/seo-audit-skill (775★).
- **WHICH SYSTEM:** **Kit first** — a 15-minute, presentable SEO audit is a sales artifact: run it on a prospect's site, hand them the findings, sell the fix (his $350 site lane and upsells). Second: **GSE** — galaxysportsedge.com's own SEO + AI-citation visibility, which is exactly the GEO half of this tool. Third: ARE client deliverables.
- **CREATIVE ANGLES:** Pair with this morning's Watcher find (thalesgroup-cert/Watcher): Watcher watches a client's domain from outside (lookalikes, leaks), Claude SEO audits it from inside — together they're a recurring "site health" package a Kit client could pay monthly for. The AI-citation audit is also a quiet GSE distribution lever: being cited by ChatGPT/Perplexity answers is free reach for a pre-traffic site.
- **RISKS:** The "10.8K Search Console clicks in 12 weeks / 99 PageSpeed" figures are the author's own case study on his own site (UNVERIFIED as typical results). A skill pack executes prompts/instructions inside Claude Code — read the pack before any fleet use, same rule as any third-party skill. SEO audit quality vs. a human specialist is unproven by us.
- **FIRST TEST:** Run it on galaxysportsedge.com in a throwaway Claude Code session; score the report against a short manual checklist (indexing, sitemap, schema, Core Web Vitals). If the findings are real and prioritized, it graduates to the Kit funnel.
- **Verdict: TEST.**

## #22 — @therealyanjigb — "Grok Bot" self-improving prompt loop — LEARN-ONLY

- URL: https://www.instagram.com/p/DfE81EDqvX7/ · Media 18115100144141511 · 81 likes, 2 comments
- **WHAT IT IS:** A screen demo of a UI labeled "GROK LOOP" (project "global / self-improve-07") by creator Yanji (AI & cybersecurity content). The loop, fully described in the caption: 15 worker agents (research, lead finder, summarizer, copywriter, email/post writers, data analyst, fact checker, support, code runner, outreach, SEO writer, news scanner, translator) → a **Grader** scores every output against a fixed rubric → anything under 0.9 goes to a **Coach**, which diagnoses the failure, rewrites that worker's prompt, and reruns the task → a rewrite that performed worse was **rolled back**. Claimed results: 108 tasks overnight, pass rate 61% → 97%, 23 prompt rewrites, 6 fails fixed, zero human edits, after the operator "told it to fix its own prompts or get deleted."
- **VERIFICATION:** The architecture is real and coherent — grader/coach/rollback is sound prompt-optimization practice. But: no public repo resolves (GitHub name search for the project returns 1 unrelated hit); the metrics are the creator's own demo counters on a small account; and "Grok Bot" here is the creator's own bot build wearing the name — there is no evidence tying this to any xAI product or deployment. The deletion framing is a hook. **All numbers UNVERIFIED; the pattern is the payload.**
- **WHICH SYSTEM:** **Fleet infra / agent ops, directly.** This is Garrett's own unsolved problem in miniature: Jules sessions, Dots, and subagents whose prompts he currently tunes by hand. The mapping is one-to-one with systems he already runs — his qi-check gate is a Grader; his 2-agent merge gate is a Coach review; git is the rollback layer the demo reinvents.
- **CREATIVE ANGLES:** (1) Apply grader→coach→rollback to X-post drafting: qi-check scores, a coach pass rewrites the *prompt template* (not just the post), git versions every template so a regression rolls back. (2) Apply to Jules session prompts: freeze a rubric per task class, auto-rewrite failing prompts, keep the human gate on merges exactly where it already is. (3) The demo's missing piece is his doctrine's strength: persisted traces. His version would log every rewrite + score delta, which the demo only shows as counters.
- **RISKS:** Self-modifying prompts against a fixed rubric invite rubric-gaming and silent drift; without a frozen eval set the "97%" is unfalsifiable. Never let a loop like this touch production prompts without version control and a holdout set.
- **FIRST TEST:** None on the artifact (nothing to install — no repo). The pattern test, when fleet time allows: one bounded task class, frozen rubric, git-versioned prompts, rollback armed.
- **Verdict: LEARN-ONLY** (pattern is an ADOPT-candidate for fleet-ops design; every claim UNVERIFIED).

## #16 — @thehackernews — CyberStrikeAI / "44 AI agents" — LEARN-ONLY (defensive)

- URL: https://www.instagram.com/p/DfBSp6Cvi0g/ · Media 18032557124683543 · 462 likes
- **WHAT IT ACTUALLY DOCUMENTS:** The post links The Hacker News' report on **TrendAI (Trend Micro) research** into three exposed attacker server environments used against Japanese organizations (October 2026). Case 1: operators abused **CyberStrikeAI** — an open-source AI penetration-testing platform (verified: AIPentest/CyberStrikeAI, 8,219★, Apache-2.0, actively pushed) — delegating work among **44 agents** across reconnaissance, vulnerability validation, exploitation, C2, persistence, exfiltration, and reporting; at least **19 identifiable organizations (16+ in Japan)** received structured validation reports in a short window; the same operator also touched Taiwan and Hong Kong. Case 2: a human-led, LLM-assisted campaign that breached a GIS server via **default credentials**. Case 3: AI used only for tooling, against edge devices (Cisco, Citrix, F5, Yamaha) via **published vulnerabilities and credentials sitting in config files**. No evidence the three share an operator.
- **THE DEFENSIVE POINT (TrendAI's own conclusion):** the weaknesses have not changed — attackers are still "looking for unlocked doors." What changed is scale and stamina: thousands of doors tried at once, in the target's language, without fatigue. Microsoft's 2026 Digital Defense Report (cited in the same article) puts vuln-discovery-to-weaponization at under 24 hours.
- **WHERE:** Article: https://thehackernews.com/2026/10/cyberstrikeai-uses-44-ai-agents-to.html (read in full); underlying research: TrendAI/Trend Micro (linked from the article). The tool's repo is named for awareness only — it is an offensive platform; nothing about operating it is documented here, by design.
- **WHICH SYSTEM:** **Family Shield (primary)** — this is the current, sourced version of the threat picture Garrett's protection lane is built on: the realistic attack on a household or a small business is automated scanning for default creds, unpatched edge gear, and exposed services, not a targeted human hacker. Second: **fleet infra** — his own internet-facing surfaces (MCP bus, self-hosted tools) sit in exactly the swept class.
- **CREATIVE ANGLES:** A standing "unlocked doors" self-audit is the countermeasure the article writes for him: inventory his own exposed services, kill default credentials, patch edge devices on a <24h CVE cadence, and watch for the uniform report/index artifacts these platforms leave. His Intel bot could run that checklist as a recurring Family Shield routine. Note the structural mirror: a 44-agent delegated fleet is the same shape as his own agent fleet — his differentiator is the gate doctrine (human approval on sends, purchases, production), which is a safety property worth naming in the Family Shield material.
- **RISKS:** Threat-intel framing is the vendor's (Trend Micro sells detection for this); the counts are TrendAI's analysis of exposed servers, labeled as such. Nothing here is a how-to and none is included.
- **FIRST TEST:** No offensive test, ever. Defensive first step when the lane is worked: a self-exposure inventory against the case-2/case-3 patterns (default creds, config-file secrets, unpatched edge services).
- **Verdict: LEARN-ONLY** (doctrine-grade input for Family Shield).

## #26 — @khanjicyber — stolen-iPhone "secret text" location trick — LEARN-ONLY

- URL: https://www.instagram.com/p/DfDXKV4ziBl/ · Media 17910228486589599 · 90,224 likes, 21,795 comments (gate keyword "OUTSMART" — the full mechanism is already in the caption, no gate needed)
- **WHAT IT IS (recognition level):** A built-in **iOS Shortcuts personal automation**: when a message containing a secret phrase arrives, the automation takes the phone's current location, builds a Google Maps link from the coordinates, (per the caption) also captures a front-camera photo, and sends both back to the sender. No third-party app — it's Apple's own Shortcuts automation feature, set up in advance by the phone's owner.
- **WHICH SYSTEM:** **Family Shield.** Two sides: (a) as an owner-consented backup locator on his own/family devices alongside Find My; (b) as a recognition item — in any device audit, an unknown message-triggered automation in Shortcuts is something to look for, because the same mechanism planted by someone with brief physical access would report a phone's location to them.
- **LIMITS (the caption itself admits one):** iOS can block actions while the phone is locked; it also needs the phone powered and connected, and it is not Find My — no continuous tracking, no offline-finding network. The trigger phrase is a bearer secret: anyone who learns it can ping the phone's location.
- **FIRST TEST:** Optional five-minute own-phone setup/test if Garrett wants it on a family device; nothing needed to catalog the mechanism.
- **Verdict: LEARN-ONLY** (Family Shield awareness + optional own-device use).

## #29 — @remonbiz — "AI slop must be destroyed" — LEARN-ONLY (brief)

- URL: https://www.instagram.com/p/DfEZ5o1Ohqu/ · Media 18137536441647632 · 1,588 likes
- **WHAT IT IS:** Not an essay — the photo is a thumbnail for the creator's 1h47m YouTube teardown, "reverse engineering AI slop apps and exposing their keys": taking apart low-quality AI apps and finding API keys embedded in them. The slogan is channel branding for security teardown content, not a content-quality manifesto.
- **WHY IT'S IN THE RECORD:** It's field evidence for Garrett's standing credential rule — keys shipped inside client apps get extracted and publicly exposed. Directly relevant to **Kit** (never embed keys in a client-side build; proxy through a backend) and to his credential-hygiene lane generally.
- **Verdict: LEARN-ONLY** (brief; the video itself was not watched — thumbnail + title are the read).

## #17 — @yung.planet — BMO cosplay (Nova personality source) — CONTEXT-ONLY

- URL: https://www.instagram.com/p/DfFYhI6J6dH/ · Media 18101324708536388 · 2,187 likes
- **CONTENT NOTE:** Mars, day 29 of a 31-day Halloween series: her BMO (Adventure Time) take — bright blue braided wig, blue face paint with silver circuit traces, circuit boards and wires as a cyborg headpiece, sheer gloves; caption teases a hidden "special piece" of the costume for the audience to guess. The traits Garrett locked as Nova's bubbly base are all on display: daily-series discipline (29 of 31 days), playful guessing-game engagement, cute-robotic but warm and expressive. Filed as a personality-source data point only.
- **Verdict: CONTEXT-ONLY.**

## Briefs — CONTEXT-ONLY

- **#18 @hurdles — Burfict reel** (https://www.instagram.com/p/DfDD1omPmkc/): NFL history clip; the caption carries the full record (undrafted → 127-tackle rookie year → NFL-leading 171 tackles in 2013 → a suspension/fine history ending in the 12-game 2019 ban, the longest on-field suspension in NFL history at the time). Player-history knowledge for GSE content context; no tool, no method. **CONTEXT-ONLY.**
- **#20 @solarcastarchive — "next lockdown will be digital"** (https://www.instagram.com/p/DfERlLZqLRp/): CBDC/digital-ID doom commentary; opinion content, no verifiable claim set, no payload. **CONTEXT-ONLY.**
- **#21 @lil.timm — no caption, Houston** (https://www.instagram.com/p/De4hFzOhl2h): 4,037 likes / 623 comments on an uncaptioned reel; the payload is the video itself, which text routes don't recover. Nothing resolvable. **CONTEXT-ONLY** + gap (video not transcribed).
- **#23 @alpha_leaders — Jio Platforms IPO** (https://www.instagram.com/p/DfFWKciMO5d/): financial news — Jio's Oct 28, 2026 debut: ~$3.17B raise (India's largest by issue size), +21.36% at open, ~$131.3B market value, 22.19× subscribed, 533.3M subscribers, FY26 revenue ~$15.44B / profit ~$3.16B — all figures as stated in the post, not independently verified. General market awareness for the desk lane; no Garrett system fit. **CONTEXT-ONLY.**
- **#24 @mrintentional_ — motivational** (https://www.instagram.com/p/DfC_MhBMF90/): menswear/mindset creator, "Bet on yourself. It's only cringey until it works." — 185K likes of engagement with no transferable payload. **CONTEXT-ONLY.**
- **#25 @bleacherreport — LaMelo/Kuminga timeout clip** (https://www.instagram.com/p/DfFap46uSJf/): NBA entertainment clip. **CONTEXT-ONLY.**
- **#27 @alexxsharpx — personal outfit post** (https://www.instagram.com/p/DfFag3qRs_U/): alt/corporate-goth fashion with gifted items; no payload for any lane. **CONTEXT-ONLY.**
- **#28 @dugoutforever — Vogelbach champion-as-coach** (https://www.instagram.com/p/DfFXPAROEKY/): Dan Vogelbach — never won a World Series as a player — is a champion in his first season as the Brewers' hitting coach in Milwaukee's first title (via Front Office Sports). Part of this feed's Brewers-WS cluster; MLB story context for GSE. **CONTEXT-ONLY.**
- **#30 @bentellect — comedy** (https://www.instagram.com/p/DfAcqZMRyE7/): "Im never flying at night" — 878K likes, pure entertainment. **CONTEXT-ONLY.**

---

## GAP AUDIT — batch B

- **Fetched:** 15/15 posts via instagram-cli full JSON (saved, `raw/2026-10-29-midday-B/`). **429 stops: none.**
- **Media-understanding:** 5/15 (the priority set: #16, #19, #22, #29, #17). The other 10 were caption-complete or caption-empty; #21's video content remains unread (no text route), recorded above.
- **Verification depth:** claude-seo resolved to the real repo (AgriciDaniel/claude-seo) via metadata + search after the screen-read name 404'd; README internals not read — install specifics rest on the repo description + the reel's screen capture. CyberStrikeAI resolved via GitHub search (AIPentest/CyberStrikeAI); THN article read in full; TrendAI's underlying report not opened separately (article carries its findings and quotes). #22: no primary artifact exists publicly to verify against — its claims are UNVERIFIED by construction, stated in the dossier.
- **UNVERIFIED claims carried:** #22's 61%→97% / 108 tasks / 23 rewrites (creator's demo counters); #19's 10.8K-clicks case study (author's own site); #23's Jio figures (as posted).
- **Comments:** not read for any post (standing rule); no payload required them — #19's repo and #26's full mechanism were both recovered from the posts themselves.
- **What closes the gaps:** a README-level read of claude-seo before the Kit test; a video-transcription route for uncaptioned reels (#21 class); TrendAI's original report if the Family Shield lane wants the full campaign detail.

---

# PART 5 — X, FIRST RUN (22 posts)

# X For You discovery sweep — 2026-10-29 first run (dissection + deep dive)

Account: @GalaxySportsHQ. Surface: X home timeline, "For you" tab (browser capture 11:40–11:48 CT, inventory: `raw/2026-10-29-first-run-feed-inventory.md`). Feed: **44 positions — 40 organic, 0 promoted, 4 TRADING-BOT flagged** (positions 12, 15, 22, 43 — never opened, per Garrett's rule). Duplicates against the X seen index, the shared-items register, and the IG seen index: **0**. Selected and dissected: the first **20 new organic non-flagged posts** (positions 1–11, 13, 14, 16–21, 23). Bonus, past the cutoff: the two repo roundups (#25, #27), fully resolved and verified. Everything else past the cutoff stays inventoried-only and unindexed for the evening run.

Method notes: football posts get full dossiers, never compressed (Garrett's rule for X). Numbers inside posts are claims — labeled UNVERIFIED unless reproduced from a named source. Repo facts come from the GitHub API read on 2026-10-29. Nothing was installed, bought, or run. Replies were not analyzed (Garrett's standing rule).

---

## Executive section — strongest finds first

1. **DFS Army's "Cracking the DFS Code" research — LEARN-ONLY (serious).** The post's study is real and identifiable: Kevin "Geek" Alan's book built on an audit of top-finishing DraftKings NFL lineups. Its headline construction findings are publicly summarized (87% of top lineups QB+1/QB+2; the WR1 present only 55% of the time; ~70% carry a secondary correlated pair; sub-10% ownership is near-mandatory). The post's exact sample (34,856 lineups, 4 seasons) is UNVERIFIED. This is the same epistemics as Garrett's standing DFS directive — construction rules measured from real top lineups — and three independent winner samples now agree on the grammar (see #14 and the synthesis).
2. **The pass-rate Nash equilibrium argument — LEARN-ONLY.** Sound game theory with a direct engine use: league pass rate is a defense-set equilibrium, so *team deviations from equilibrium* are the signal, and defense-induced deviations (see #16) must not be read as offensive choice. A reasoning prior for the situations/matchups layers, free.
3. **Petersen & Zech, "Mathematical theory of deep learning" — ADOPT (program ingestion).** The arXiv ID in the post resolves exactly: arXiv:2407.18384, a full free textbook (approximation, optimization, statistical learning theory), v4 Jan 2026. Squarely inside the standing NGS/arXiv program.
4. **The DT one-on-one isolation chart (@throwthedamball) — LEARN-ONLY.** Rate × grade on *unassisted* reps is the honest way to price interior pressure — a method GSE can compute in-house, not a chart to copy.
5. **PropsEdge — WATCH (benchmark, do not buy for picks).** Verified pricing ($19.99/mo, $50/mo Pro). Its heatmap is the presentation format the betting public reads; its +EV machinery is market-first by construction, which Garrett's doctrine deliberately keeps last. The value is competitive: see what the public sees, keep reasoning-first.
6. **Bonus roundups resolved in full:** all 10 Claude Code skill repos verified (two truncated paths corrected, one transfer caught); Obsidian's 7 repos verified and the 42,437★ claim re-summed at 42,537 (live-count drift). One genuine fleet candidate inside: **caveman** (token-frugal agent communication) as a measurable cost experiment.

**News:** no named-player injury or availability news appears anywhere in this 44-position inventory. Nothing to file on the health layer from this run.

---

## The 20 dossiers (inventory order)

### #1 — @PythonPr — ML loss functions chart (image)
- Post: https://x.com/PythonPr/status/2115518969910108330
- **WHAT IT IS:** a static study card charting the standard loss functions (cross-entropy, MSE/MAE, hinge family) and where each applies. No mechanism beyond the reference itself.
- **WHERE:** the post; @PythonPr is a content aggregator, the chart is generic study material.
- **HOW TO USE IT:** as a wall card — nothing to install or run.
- **WHICH SYSTEM:** none directly. The literacy underneath it (which loss fits which target) is the same literacy as the engine's scoring choices — margin regression vs win classification vs proper scoring rules (Brier/CRPS) in the Sports stack.
- **CREATIVE ANGLES:** the chart's classification/regression split is a decent teaching frame for a Content OS explainer on how the engine is graded.
- **RISKS:** none; also nothing proprietary.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — generic study material Garrett already commands.

### #2 — @PhysInHistory — calculus symbols chart (image)
- Post: https://x.com/PhysInHistory/status/2115694640041279687
- **WHAT IT IS:** a notation reference image (integral/derivative/limit symbols). Pure study card.
- **WHERE / HOW:** the post; nothing to use.
- **WHICH SYSTEM:** none.
- **CREATIVE ANGLES:** none honest — notation fluency is assumed across his research programs.
- **RISKS:** none.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — generic study material.

### #3 — @antoniolupetti — "Mathematical Theory of Deep Learning" (free book, arXiv 2407.18384)
- Post: https://x.com/antoniolupetti/status/2115423809104695419
- **WHAT IT IS (verified):** a full-length textbook by **Philipp Petersen and Jakob Zech** covering the three pillars of deep learning theory — approximation theory (what networks can express), optimization theory (what training can find), statistical learning theory (what generalizes). It prioritizes rigorous-but-accessible results over generality, per its own abstract.
- **WHERE TO FIND IT:** https://arxiv.org/abs/2407.18384 (v4, revised 15 Jan 2026; cs.LG). Free PDF, free HTML version, and TeX source on arXiv. DOI: 10.48550/arXiv.2407.18384. The post's "free book" claim checks out completely.
- **HOW TO USE IT:** download the PDF/HTML; read as a reference text, chapter-targeted (the generalization chapter is the one with engine crossover).
- **WHICH SYSTEM:** the standing **NGS/arXiv research program** — this is a theory-shelf anchor for the program's remaining reads, and the ε_generalization + ε_approximation decomposition in its learning-theory chapters is the same accounting shape as the engine's discrimination-vs-calibration split.
- **CREATIVE ANGLES:** cite it as the program's reference when arXiv papers in the queue invoke approximation/generalization results without proof — one verified textbook closes dozens of "take it on faith" gaps.
- **RISKS:** none material; it is mathematics, not tooling. Time cost only.
- **FIRST TEST / VERDICT:** **ADOPT** — file into the arXiv program tracker as the theory reference; no purchase, no install, verified at the primary source.

### #4 — @jithinvraj — logistic/softmax regression explainer (image)
- Post: https://x.com/jithinvraj/status/2115479075695501642
- **WHAT IT IS:** a one-image explainer of logistic regression and the softmax function.
- **WHERE / HOW:** the post; study material.
- **WHICH SYSTEM:** softmax is literally the engine's probability layer (and the devig step's cousin), but an explainer adds nothing to a stack that already ships Bradley-Terry/Dixon-Coles-class machinery.
- **CREATIVE ANGLES:** usable as a plain-language teaching visual if GSE content ever explains "how a model turns scores into probabilities."
- **RISKS:** none.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — generic study material.

### #5 — @PropsEdge — Week 8 matchup heatmap + platform (propsedge.io, code X20)
- Post: https://x.com/PropsEdge/status/2115484558896291860
- **WHAT IT IS (mechanism):** the post is a Week 8 "matchup heatmap" — every defense ranked by the rate stats prop bettors use (the opponent-allowed side of each prop market), published as free social content to sell the platform. The platform itself (verified from propsedge.io): real-time odds across **25+ sportsbooks**, player projections, team defensive rankings, injury/lineup feeds, a **+EV finder** (their projection vs the book's price), **arbitrage and middles feeds**, and a **DFS optimizer**. Pricing from its own comparison table: **$19.99/mo base; $50/mo Pro** (arbitrage, +EV pages, DFS optimizer, and "Research+" are Pro-gated). The post's code X20 is a 20%-off hook. Vendor claims on the homepage (14,000+ bettors, 1M+ props analyzed) are UNVERIFIED.
- **WHERE TO FIND IT:** https://propsedge.io (pricing/features as above, read 2026-10-29).
- **HOW TO USE IT:** subscription web app; free Discord community and the public heatmap posts are the no-cost surface.
- **WHICH SYSTEM IT PLUGS INTO:** nominally the GSE engine's **market layer — which Garrett's doctrine deliberately runs last and small** — plus the Content OS as a format benchmark. What GSE already computes in-house: projections, matchup reasoning, devigging, price-check discipline, and a props optimizer (engine_math / props lane). What PropsEdge would actually add: 25-book line-shopping and arb/middle scanning — market machinery, not reasoning — and a polished opponent-stats heatmap presentation.
- **CREATIVE ANGLES:** the heatmap is the exact visual grammar the betting public reads weekly. GSE's published board can borrow the *presentation* (defense-vs-stat heat grid) while filling it with reasoning-first content — same shelf appeal, opposite epistemics. Their free heatmap posts are also a standing competitive-intel feed: what the public is being shown about each defense, each week, for $0.
- **RISKS AND LIMITS:** buying it to source picks inverts matchup-first/books-last — its +EV engine is market-echo by construction (projection vs price, no matchup reasoning trail). Subscription spend is Garrett's call and is not needed for the benchmark value.
- **FIRST TEST / VERDICT:** no purchase. Benchmark from the free posts/Discord for one week against GSE's own matchup board; revisit only if a specific data gap appears. **WATCH.**

### #6 — @matharium — quadric surfaces (video)
- Post: https://x.com/matharium/status/2115586660532461994
- **WHAT IT IS:** a math-visualization video on quadric surfaces (ellipsoids, hyperboloids, paraboloids and their equations).
- **WHICH SYSTEM:** none — aesthetically strong math content; the surface taxonomy underlies nothing in the current stack that a video would improve.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — generic study material.

### #7 — @CoachMikeHayde — Cover 2 beater: the Texas concept vs Tampa 2
- Post: https://x.com/CoachMikeHayde/status/2115628734397202904
- **WHAT IT IS (mechanism):** coaching-clinic scheme content. Tampa 2's structure is known: two deep safeties split the field, the Mike linebacker carries the deep middle seam, and corners sink/run with verticals. Its two structural stress points are (a) the deep middle the Mike must carry at depth and (b) the sideline hole between the sinking corner and the safety. The Texas concept (a Walsh-tree shot concept: a deep post/corner family paired with an underneath outlet that punishes the flat defender) is presented as the canonical answer because it stresses both points on one snap and forces the corner/safety/Mike triangle to declare. The post's teaching value is the *why*: which defender is put in conflict, and which route is the read.
- **WHERE TO FIND IT:** the post; @CoachMikeHayde's account is an ongoing coaching-content source.
- **HOW TO USE IT:** as scheme vocabulary — a named, diagrammed entry for "what does the offense do to this shell."
- **WHICH SYSTEM IT PLUGS INTO:** GSE engine, **matchups layer (scheme vs scheme)** — when the reasoning engine evaluates a pass offense against a Cover 2/Tampa 2 team, the beater catalog is the checklist of answers the offense actually has, weighted by that team's usage (weekly cycle layer 1). Second seat: **Content OS** — this is exactly the explainer grammar (one concept, one conflict, one read) his Tifo/Secret Base-style references use.
- **CREATIVE ANGLES:** build the **beater catalog** as a standing scheme reference: each coverage family (Cover 2, Tampa 2, Cover 3, quarters, man-match) paired with its canonical beaters and the personnel each beater needs. Weekly usage data then answers "did they call the beater, and did they have the players for it" — coaching Twitter, converted into a structured reasoning checklist instead of a clip folder.
- **RISKS AND LIMITS:** single-clip coaching content simplifies; no usage or success data attached; effectiveness claims are the coach's (UNVERIFIED at data level).
- **FIRST TEST / VERDICT:** catalog the concept into the scheme notes; the catalog's first real test is one Week 9 matchup trace where the beater check visibly changes the reasoning. **LEARN-ONLY.**

### #8 — @KirkDBorne — LLMs explained, tokens to behavior (video)
- Post: https://x.com/KirkDBorne/status/2115674629687652553
- **WHAT IT IS:** a mainstream explainer video walking LLMs from tokenization to emergent behavior, with the math signposted.
- **WHICH SYSTEM:** none — Garrett operates several layers above this (he runs the fleet this explains). At most, a shareable primer for Kit clients at the bottom of his funnel.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — competent, generic, below his operating level.

### #9 — @monotykamary — autoprover / formal-verification claims (video)
- Post: https://x.com/monotykamary/status/2115818634039697711
- **WHAT IT IS (mechanism):** a video riding the current autoformalization wave: LLM agents translating mathematics into **Lean 4**, where a small trusted kernel machine-checks every step. The mechanism is real — a Lean-accepted proof is not a hallucination. The honest catch, documented in an October 2026 critique by Bastounis, Circelli & Hansen (summarized in current coverage): **Lean verifies the translated statement, not the original claim** — autoformalization must resolve natural-language ambiguity by guessing, the guess becomes the theorem, and documented cases exist where the formal statement is weaker than the headline it "proves." The video's own specific claims were not independently reproduced this run: UNVERIFIED.
- **WHERE TO FIND IT:** the post; the underlying field is Lean 4 + Mathlib and the public prover projects around them.
- **HOW TO USE IT:** nothing to install for Garrett's purposes; the transferable artifact is the evaluation rule.
- **WHICH SYSTEM IT PLUGS INTO:** the **arXiv research program** and his standing verification doctrine. "Machine-checked" has the same failure shape as "the module is wired" — the artifact checked is the *statement as translated*, so you read the final theorem statement, not the announcement. His wired-means-verified-in-the-artifact rule, applied to proofs.
- **CREATIVE ANGLES:** a one-line addition to the program's paper-triage checklist — for any "AI proved X" claim: find the formal statement, compare it to the claim, price the gap. That single check separates the field's real results from its press releases.
- **RISKS AND LIMITS:** hype-dense area; benchmark solve-rates quoted in secondary content (e.g. "80%+") are marketing until tied to a named benchmark and a statement-level read.
- **FIRST TEST / VERDICT:** none as tooling. **LEARN-ONLY** — the lesson is the verification gap, and it's already his doctrine wearing a different coat.

### #10 — @naturevx0 — image only, no text
- Post: https://x.com/naturevx0/status/2115607565627506859
- **WHAT IT IS:** unknown — an image with no caption, and the image payload could not be read this run.
- **GAP (explicit):** the X API connector (`custom.x-api`) could not supply a post read — its connector doc is an unfilled template with no working helper, and the api.x.com bearer on file is recorded as invalid. No browser media pass was in this run's scope. The gap closes when either a working X API read path exists or a browser pass opens the post and reads the image.
- **FIRST TEST / VERDICT:** none possible. **CONTEXT-ONLY** — payload unread, recorded as a gap, not guessed at.

### #11 — @run_the_sims — the pass-rate Nash equilibrium
- Post: https://x.com/run_the_sims/status/2115788393728880945
- **WHAT IT IS (mechanism):** a game-theory argument about play-calling. Offense and defense are in a mixed-strategy game: if passing is under-used relative to its value, defenses that sell out against the run get punished until they rebalance; the equilibrium pass rate is the rate at which the defense is *indifferent* — where the marginal value of a pass equals the marginal value of a run against an adjusted defense. The post, citing **@SumerSports** data in a Kollmann/Tice quote chain, puts the equilibrium at ~55% against the NFL's actual ~54% — i.e., the league is already essentially at equilibrium, and "just pass more" is not a free lunch, because the observed rate is the *defense-adjusted* outcome.
- **LOGIC CHECK:** the argument's structure is sound — it is the standard indifference/minimax logic, correctly applied: an equilibrium rate is set by the opponent's best response, not by the offense's preference, and situational mix (score state, down-and-distance) explains small residuals. The digits (~55% vs ~54%) are cited to SumerSports and NOT reproduced this run — UNVERIFIED at the digit level; the range is directionally consistent with publicly known neutral-situation pass rates, which this run also did not re-derive.
- **WHERE TO FIND IT:** the post and its quote chain (@SumerSports is the data attribution).
- **HOW TO USE IT:** as a prior inside reasoning, not as a stat to quote: treat league pass rate as an equilibrium outcome; treat *team-level deviations* — a team passing far above/below its equilibrium given its personnel — as the actual signal (exploiting a defense, or leaking value).
- **WHICH SYSTEM IT PLUGS INTO:** GSE engine, **situations layer with matchups-layer consequences** — it disciplines two reasoning habits: (1) never credit/blame an offense for a play mix the opponent's defense induced (see #16 — Flores manufactures exactly this), and (2) when a team's mix moves, ask what changed in opponents' responses before crediting a coaching decision.
- **CREATIVE ANGLES:** invert the lens for content: "the defense chose this offense's play mix" is a publishable, non-obvious frame for a weekly piece, and it is *true* in a way most coverage never states. Pair with #7's beater catalog: equilibrium thinking says why the beater works — it reprices the defense's indifference point.
- **RISKS AND LIMITS:** equilibrium estimates are model-dependent (which plays count as "neutral" moves the number); a 1-point gap is inside situational noise, so the strong claim is "near equilibrium," not the exact digits.
- **FIRST TEST / VERDICT:** write the prior into the situations-layer notes and check it against one week of the engine's own play-by-play warehouse (neutral-situation pass rate vs opponent) — his data can reproduce or refute the digits in-house. **LEARN-ONLY.**

### #12 — @velesxbt — TRADING-BOT FLAG — skipped, never opened (Garrett's rule).

### #13 — @taketheunderzet — "I've solved DFS for week 8" (image)
- Post: https://x.com/taketheunderzet/status/2115779682285056422
- **WHAT IT IS:** a bare claim with an image payload that could not be read this run (same X-media gap as #10). No method, sample, or result is stated in text — there is nothing to evaluate even before the image gap: a claim of a solved week, with the evidence locked in an unread picture.
- **CLAIM STATUS:** UNVERIFIED, and untestable as posted.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — contrast #14: this is what DFS content looks like with no receipts; the sweep's standard is the opposite.

### #14 — @DFSArmy — QB stacking research, "Cracking the Code" (34,856 top lineups, 4 seasons)
- Post: https://x.com/DFSArmy/status/2115819990347616675
- **WHAT IT IS (verified as far as the public record allows):** the post promotes the research program of **Kevin "Geek" Alan**, DFS Army's founder, published as the book **"Cracking the DFS Code: Revealing the Secrets to Winning Large-Field DraftKings NFL Tournaments"** (sold via Amazon; promoted across DFS Army's own channels with a "Cracking The Code" walkthrough video). The method is Garrett's own directive executed by someone else: audit *actual top-finishing DraftKings NFL lineups* and measure their construction — stack shapes, correlation structure, ownership profile — instead of theorizing about lineups.
- **WHAT THE FINDINGS ARE (from the author's public walkthrough, as summarized):** 87% of top lineups used a QB+1 or QB+2 stack; the QB was paired with his **WR1 only 55% of the time** — the other 45% ran through WR2/WR3/TE, which is where the leverage and salary relief live; roughly **70% of top lineups carried a secondary correlated pair** outside the main game stack; **96.4% of top-100 lineups contained at least one sub-10%-owned skill player** (2.7 per lineup on average); triple stacks underperform QB+1/+2. These are consistent with DFS Army's own methodology archive, which has published stacking rules of thumb and winning-lineup stack audits since 2016 (their 2022 audit of weekly winners: ~2 stacks, ~5 players, on average).
- **WHAT IS *NOT* VERIFIED:** the post's exact sample — **34,856 top lineups over 4 seasons** — was not independently reproduced. The definition of "top lineup" (top-100? top 1%? which contests?) is only checkable inside the book, and the definition moves the findings. The sample size and the four-season window stay **UNVERIFIED**.
- **WHERE TO FIND IT:** the book (Amazon, "Cracking the DFS Code" by Kevin Alan); free partial surface — DFS Army's methodology articles at dfsarmy.com and the author's walkthrough video, both of which expose the headline rules without purchase.
- **HOW TO USE IT:** as construction *rules with a sample behind them* for the weekly DFS packet: stack shape quotas, the WR2/TE leverage rule, the secondary-correlation requirement, the sub-10% ownership floor. Each rule should enter the packet as a measured claim with its source, per Garrett's research standard (consensus across outlets, not one voice).
- **WHICH SYSTEM IT PLUGS INTO:** the **DFS lane of GSE** — Garrett's standing directive (2026-09-25) is verbatim this method: "understand real winning-lineup construction from samples, examples, data, metrics." It also touches the engine: the secondary-correlation finding is the DFS cousin of his SGP correlation work — correlation as something you *add deliberately in a second place*, not only inside the main stack.
- **CREATIVE ANGLES:** three independent winner samples now exist in reach — this book's audit, DFS Army's own weekly-winner audits, and public Milly Maker winner studies (e.g. Seeking Optimal's all-winners-since-2021 audit, which independently lands on QB+1 41% / QB+2 44% and a 41% bring-back rate). Where three samples agree, the rule is load-bearing for the packet; where they disagree (e.g. exact bring-back rates), the disagreement is itself a research task with a definite answer in his own data habits. Nobody in his feed is doing that cross-sample diff — it's an open lane.
- **RISKS AND LIMITS:** DraftKings-classic-specific (salary/ownership ecology doesn't transfer 1:1 to other sites or showdown); the book is a purchase — Garrett's money, Garrett's call, and per free-first routing the free summaries should be mined first; survivorship in "top lineup" definitions is the whole ballgame, hence the UNVERIFIED tag on the sample.
- **FIRST TEST:** no purchase needed for the first move — diff the book's publicly stated rules + DFS Army's free audits against the packet's current construction rules and against one public winner audit; buy the book only if the diff exposes rules he doesn't already hold. **LEARN-ONLY** (serious; top follow-up in this run).

### #15 — @RohOnChain — TRADING-BOT FLAG — skipped, never opened (Garrett's rule).

### #16 — @The_Coach_A — Flores' Vikings run-fit (MatchQuarters)
- Post: https://x.com/The_Coach_A/status/2115534069190602850
- **WHAT IT IS (mechanism):** a film-and-structure breakdown of Brian Flores' Minnesota run defense: how the front fits the run (spill vs box principles, simulated-pressure looks that become run fits, safeties as fit players) such that the defense manufactures negative plays rather than playing stout down-to-down. The post's cited split makes the signature precise: **Run DVOA 9th** (good, not elite, down-to-down) against **EPA/run #1 at −.230** (the league's best per-play damage) — a boom-profile run defense: it wins by blowing up plays, not by conceding 3.4 yards at a time. Numbers are **cited from FTN data via the post — not reproduced this run (cited-not-reproduced)**.
- **WHERE TO FIND IT:** the post; @The_Coach_A publishes through MatchQuarters.
- **HOW TO USE IT:** as an opponent-identity input: "MIN run defense" in the reasoning trace should read *negative-play manufacturer with a merely good success profile*, which projects differently — RB efficiency suppressed in chunks, volume and pass-game spillover more live than against a uniformly stout front.
- **WHICH SYSTEM IT PLUGS INTO:** GSE engine, **matchups layer** — and it interlocks with #11: Flores' front is a disequilibrium machine; it forces offenses into pass mixes they didn't choose, so opponent play-mix against MIN must be read as defense-induced in the situations layer. It also feeds props reasoning (RB rushing lines vs MIN are an efficiency question, not a volume question).
- **CREATIVE ANGLES:** the DVOA-vs-EPA split is a generalizable diagnostic — any defense (or offense) whose per-play damage rank and success-rate rank diverge wildly is a *variance* unit, and variance units change how you price both sides: they fatten underdog paths and thin favorite paths. A "split-rank divergence" flag is a cheap computed feature with real reasoning content.
- **RISKS AND LIMITS:** FTN/DVOA are paywalled sources — cited, not reproduced; single-analyst film reads carry selection bias in which snaps get clipped.
- **FIRST TEST / VERDICT:** add the divergence flag idea to the matchups-layer notes; validate on the engine's own EPA/success data for 2026 defenses before it earns a place in traces. **LEARN-ONLY.**

### #17 — @DeFiTracer — manual price-action setup (BOS / FVG / order blocks)
- Post: https://x.com/DeFiTracer/status/2115598451094290644
- **WHAT IT IS:** a manual crypto trading playbook post — market-structure vocabulary (break of structure, fair value gaps, order blocks) for discretionary price-action entries. Not a bot post (in scope per the run's rules), but it is market-mechanics content.
- **WHICH SYSTEM:** none of Garrett's — his market contact runs through the sports engine, where the market is a price-check at the end of matchup-first reasoning, never the method. A chart-pattern vocabulary does not transfer into that doctrine.
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** (brief by design).

### #18 — @PhillyNick100 quoting @throwthedamball — DT one-on-one frequency × percentile grades
- Post: https://x.com/PhillyNick100/status/2115583401822400983
- **WHAT IT IS (mechanism):** a chart of defensive tackles plotted by **one-on-one frequency** (how often a DT rushes without stunt/blitz help — true isolated reps) against **percentile pass-rush grades on those reps**. The mechanism is the isolation: raw DT pressure numbers are polluted by scheme (stunts, simulated pressures, free runs); restricting to unassisted one-on-one reps prices the player's own skill. Source: @throwthedamball's chart; the underlying grade provenance is the chart's own (UNVERIFIED — no methodology note captured with it).
- **WHERE TO FIND IT:** the post and the quote chain to @throwthedamball (who also publishes at throwthedamball.com).
- **HOW TO USE IT:** read DTs in the high-frequency/high-grade quadrant as genuine interior disruptors; treat high raw pressure with low one-on-one share as a scheme product that travels poorly.
- **WHICH SYSTEM IT PLUGS INTO:** GSE engine, **matchups layer (player vs player)** — interior pressure is the fastest legal way to break a QB's timing, and "this DT vs this interior line, on isolated reps" is a concrete input for pass/rush props and sack-adjacent reasoning. The method generalizes beyond DT: rate × grade on unassisted reps is an honest one-on-one board at any position.
- **CREATIVE ANGLES:** this is NGS-style thinking built from public data — and it is computable in-house: Garrett's stack can build its own true-one-on-one board (any position) from the play data he already pulls, turning a borrowed chart into an owned, weekly-refreshed reasoning input. That is the difference between reading the public edge and owning it.
- **RISKS AND LIMITS:** percentile grades without the underlying dataset or sample thresholds; a single chart, one week, no error bars.
- **FIRST TEST / VERDICT:** prototype the isolation metric on one week of DT data in-house and eyeball it against the chart's ordering; agreement earns the method a standing place. **LEARN-ONLY.**

### #19 — @CurtCig quoting @thecfbsignal — the Cignetti system (Indiana)
- Post: https://x.com/CurtCig/status/2115628067410661717
- **WHAT IT IS (mechanism):** an article-length breakdown of Curt Cignetti's Indiana build. The transferable mechanism is an *evaluation system*, not a scheme: recruit and portal for **proven production over pedigree** (players who already produced at a lower level over players who were merely rated), keep staff continuity so the system compounds, and run a scheme that travels because it is built on repeatable structure rather than matchup-specific tricks. The article's specific factual claims were not independently fact-checked this run (single-source narrative).
- **WHERE TO FIND IT:** the post's quote chain to @thecfbsignal's article.
- **HOW TO USE IT:** as a coaching-systems case study — how a program manufactures an edge in the portal era: mispriced evaluation (production nobody priced) + continuity (a system that doesn't reset yearly).
- **WHICH SYSTEM IT PLUGS INTO:** GSE engine, **situations layer (coaching/systems)** for the NCAA lane — a prior for rating Indiana-class risers: production-based rosters are systematically underrated by pedigree-based markets early, which is a *matchup-first* edge (it exists before any book is consulted). Second seat: **Content OS** — a systems-explainer in the Tifo mold for NCAA coverage.
- **CREATIVE ANGLES:** Cignetti's edge and GSE's thesis are the same shape — *measure what players did, not what they were labeled* — which makes the article a content asset and a reasoning prior simultaneously: the same piece can run publicly as a story and privately as a layer note on how to price portal-built rosters.
- **RISKS AND LIMITS:** narrative case studies overfit to the winner (survivorship); the "system" may be partly a quarterback and a schedule. Treat as a prior to test, not a fact.
- **FIRST TEST / VERDICT:** check the prior against the warehouse: how did production-portal rosters perform ATS/against expectation in their first season? His data answers it. **LEARN-ONLY.**

### #20 — @coachadamrice — Oklahoma State 3×1 Sniffer / ISO concept (@chlkapp video)
- Post: https://x.com/coachadamrice/status/2115506757997068346
- **WHAT IT IS (mechanism):** a single-concept teaching video: a 3×1 formation with a **sniffer** (an off-ball tight end/H-back aligned behind the line) running an ISO concept. The mechanism is declaration-forcing: the sniffer's alignment and motion make the defense show its structure (who travels, who bumps, which safety rotates), and the ISO route then attacks the leverage the declaration just revealed. It is matchup manufacturing by formation — the offense buys information before the snap and spends it on one route.
- **WHERE TO FIND IT:** the post; the video is @chlkapp content (a coaching-film platform account).
- **HOW TO USE IT:** as scheme vocabulary for the NCAA lane — a named entry in the same catalog as #7, on the formation side rather than the coverage side.
- **WHICH SYSTEM IT PLUGS INTO:** GSE engine, **matchups layer (scheme vs scheme)** — formation-driven declaration is one of the mechanisms behind "this offense creates the matchup it wants," which belongs in traces as a *cause*, not a vibe. Second seat: Content OS concept explainers.
- **CREATIVE ANGLES:** pair with #7 into the standing **beater/declaration catalog**: coverages and their beaters on one side, formations and what they force on the other. The catalog converts a coaching-content habit (Garrett's feed is full of it — #41 and #42 in this same inventory are the same genre) into structured engine knowledge instead of a screenshot folder.
- **RISKS AND LIMITS:** one concept, one cut-up; no success-rate data; college context (hash marks and personnel differ from the NFL).
- **FIRST TEST / VERDICT:** catalog entry only; the catalog test is the same Week 9 trace check as #7. **LEARN-ONLY.**

### #21 — @e_opore — load balancing explainer + paid Gumroad handbook
- Post: https://x.com/e_opore/status/2115780118014505326
- **WHAT IT IS:** a system-design explainer on load balancing (the standard taxonomy: round-robin, least-connections, consistent hashing, health-checked failover) with a paid Gumroad handbook as the upsell. The explainer is competent; the content is textbook-standard and the handbook is the monetization layer, not new knowledge.
- **WHICH SYSTEM:** nominally fleet infrastructure — but honestly: Garrett's routing problems are already served by gateway-class tooling (LiteLLM/OmniRoute lineage), and a generic interview-prep handbook adds nothing to it. The load-balancing *concepts* matter at a layer he already operates past.
- **CREATIVE ANGLES:** the only real one — the explainer format itself (one mechanism, one diagram, one failure mode) is a clean template for Content OS technical explainers.
- **RISKS:** paying for the handbook would violate free-first routing with zero offsetting gain.
- **FIRST TEST / VERDICT:** none; do not buy the handbook. **CONTEXT-ONLY** — the explainer is the (small) value; the upsell is not.

### #22 — @carm1nee — TRADING-BOT FLAG — skipped, never opened (Garrett's rule).

### #23 — @grammarengli — "600 advanced words" (image)
- Post: https://x.com/grammarengli/status/2115790726651167213
- **WHAT IT IS:** a vocabulary study card — a long image list of advanced English words with glosses.
- **WHICH SYSTEM:** none. Writing quality matters to the Content OS, but rote word lists are not how his voice work happens (his X voice is plain and direct by doctrine — advanced vocabulary is, if anything, against the grain).
- **FIRST TEST / VERDICT:** none. **CONTEXT-ONLY** — generic study material.

---

## BONUS — past the cutoff, resolved in full (clearly separated from the 20)

### B1 — #25 @neerajjj6785 — Top 10 Claude Code skill repos
Post: https://x.com/neerajjj6785/status/2115683570886828270 — every link in the post was truncated; each entry below was resolved and verified via the GitHub API on 2026-10-29 (stars as of this read).

| # | Repo (verified path) | Stars | License | Last push | What it is |
|---|---|---|---|---|---|
| 1 | obra/superpowers | 308,193 | MIT | 2026-10-23 | Agentic skills framework + software-development methodology |
| 2 | mattpocock/skills | 306,374 | MIT | 2026-10-29 | "Skills for Real Engineers," from the author's own .agents directory |
| 3 | multica-ai/andrej-karpathy-skills | 226,305 | **none detected** | 2026-04-20 | A single CLAUDE.md behavior file derived from Karpathy's observations |
| 4 | anthropics/skills | 184,710 | none detected by API* | 2026-10-28 | Anthropic's official public Agent Skills repository |
| 5 | DietrichGebert/ponytail | 179,894 | MIT | 2026-10-29 | Minimalism skill — "think like the laziest senior dev in the room" |
| 6 | nextlevelbuilder/ui-ux-pro-max-skill | 142,431 | MIT | 2026-10-26 | Design-intelligence skill for UI/UX work (post's path lacked the `-skill` suffix) |
| 7 | Graphify-Labs/graphify | 138,439 | Apache-2.0 | 2026-10-27 | Turns a codebase + docs + schemas + PDFs into a queryable knowledge graph (post pointed at safishamsi/graphify — the repo has **transferred** to Graphify-Labs) |
| 8 | JuliusBrussee/caveman | 116,009 | Apache-2.0 | 2026-10-29 | Token-frugal communication skill + proxy for coding agents |
| 9 | addyosmani/agent-skills | 111,664 | MIT | 2026-10-29 | Production-grade engineering skills for coding agents |
| 10 | Leonxlnx/taste-skill | 105,281 | MIT | 2026-10-29 | Design-taste skills (art direction, reference imagery) for coding agents (resolved from the truncated "taste") |

\* anthropics/skills carries per-skill terms in practice; the API reports no single repo license — read the specific skill's terms before reuse.

**FIT WITH GARRETT'S FLEET:** his fleet already runs a mature skill system (system + custom skills with dossier standards, gates, and doctrine files), so none of these replaces anything. Ranked by actual signal: (1) **anthropics/skills** — the canonical format source; worth a one-time diff of his skill conventions against the official spec his other agents also read. (2) **caveman** — token frugality is a *measurable* claim in a fleet that runs free-first routing and context budgets: an A/B on one routine agent task prices it exactly. (3) **graphify** — codebase-to-knowledge-graph aimed squarely at a repo the size of Sports; WATCH until a comprehension bottleneck is actually felt. (4) **superpowers / mattpocock / addyosmani / ponytail / taste / ui-ux-pro-max** — quality packs to cherry-pick individual skills from at need, not frameworks to adopt wholesale; their methodologies overlap his fleet-standards (which are stricter). (5) **andrej-karpathy-skills** — no license detected and the stalest repo on the list (April); a CLAUDE.md he can write himself. **Verdict for the roundup: LEARN-ONLY**, with caveman flagged as the one TEST candidate and anthropics/skills as a one-time format diff.

### B2 — #27 @Mr_Buzzoni — Obsidian's 7 official repos, "42,437 stars" claim
Post: https://x.com/Mr_Buzzoni/status/2115466871793406007 — all seven repos verified under the **obsidianmd** org via the GitHub API, 2026-10-29:

| Repo | Stars | License | Last push | Role |
|---|---|---|---|---|
| obsidianmd/obsidian-releases | 22,746 | — | 2026-10-29 | The app itself (release distribution) |
| obsidianmd/obsidian-clipper | 5,422 | MIT | 2026-09-22 | Web clipper (save web content into a vault) |
| obsidianmd/obsidian-sample-plugin | 4,600 | 0BSD | 2026-08-02 | Canonical plugin template |
| obsidianmd/jsoncanvas | 3,746 | MIT | 2026-07-24 | The open JSON Canvas file-format spec |
| obsidianmd/obsidian-api | 2,347 | MIT | 2026-10-05 | Plugin API type definitions |
| obsidianmd/obsidian-help | 1,951 | — | 2026-10-28 | Documentation vault |
| obsidianmd/obsidian-importer | 1,725 | MIT | 2026-10-21 | Importers (Notion/Evernote/notes-class sources → vault) |

**Claim check:** direct sum of the seven = **42,537 stars** vs the post's claimed **42,437** — a 100-star difference on a live counter (stars move daily; the claim was accurate within drift, likely exact at posting or rounded from a slightly earlier read). Verdict on the claim: **substantively verified**.
**FIT WITH GARRETT'S CORPUS WORK:** his knowledge corpus lives in memory files, Drive, and Docs — there is no Obsidian vault in the stack today, so there is no adoption case for the app. The two transferable pieces are **jsoncanvas** (an open, MIT-licensed, JSON-based canvas format his own tooling could emit without adopting Obsidian — a portable spec, the most valuable kind of find in a roundup) and **obsidian-importer** (a maintained map of how content gets *out* of Notion/Evernote-class silos, relevant if a corpus migration ever runs). **Verdict: LEARN-ONLY** — format spec cataloged; no vault, no adoption.

---

## Synthesis — what this feed is actually saying

**1. The public-data edge is contested exactly at the matchup layer — and the contest is over presentation, not reasoning.** This one feed contains a vendor selling defense-vs-stat heatmaps (#5), an analyst isolating one-on-one skill from scheme pollution (#18), and two scheme-literacy accounts (#7, #16, plus #42 past the cutoff). Everyone in the public market can buy the charts. Nobody in it publishes the reasoning trail — what was weighed, what was discounted, why. That is Garrett's stated product. The two *methods* worth benchmarking in-house are the ones that are computable from data he already pulls: **true one-on-one isolation** (#18) and the **equilibrium pass-rate prior** (#11). Both convert borrowed public insight into owned engine inputs; that conversion, repeated, is the whole moat.

**2. The DFS lane has a three-sample consensus sitting unharvested.** The DFS Army book's construction rules (#14), DFS Army's own weekly-winner audits, and public Milly Maker winner studies agree on the construction grammar (QB+1/+2 dominance, WR2/TE leverage, secondary correlation, sub-10% ownership floor) and disagree only in the decimals. Garrett's standing DFS directive asks for exactly this: construction from real samples, consensus across outlets. The diff of the three samples against the packet's current rules is the cheapest high-certainty research task in this entire run — it costs no money (free summaries first) and lands directly in a weekly deliverable.

**3. The feed thinks Minnesota's defense is the scheme story of the season — twice.** Flores appears at #16 in the selected 20 and again at #42 (boundary overload vs the Colts, past the cutoff). When the algorithm independently surfaces the same unit twice in 44 posts, the content lane should treat MIN's defense as a standing storyline, and the engine should treat the #16 divergence diagnostic (per-play damage rank vs success rank) as a candidate computed feature — variance units change prices on both sides.

**4. The tech half of the feed was study-card noise except where it touched his two research programs.** The arXiv textbook (#3) goes straight into the program. The autoprover video (#9) contributes an evaluation rule the program can reuse on every "AI proved X" headline. The skill-repo roundup (B1) says the agent-skills ecosystem is consolidating around Anthropic's format at enormous star counts — his fleet's conventions deserve one diff against the canonical spec, and caveman offers a rare thing in that ecosystem: a claim (token savings) that can be *measured* in an afternoon.

**5. Proposed follow-up order, with reasons:**
1. **DFS three-sample construction diff** (free, immediate, lands in the weekly packet — highest certainty per hour).
2. **Caveman token A/B** on one routine agent task (measures a fleet-wide cost claim for the price of one task).
3. **ArXiv program ingestion** of Petersen & Zech (#3) as the theory reference (one line in the tracker; closes recurring gaps).
4. **One-on-one isolation prototype** (#18) on one week of DT data, checked against the public chart's ordering (agreement = a new owned matchup input).
5. **Equilibrium prior + Flores divergence flag** (#11, #16) written into layer notes and validated on the warehouse (his own data can reproduce both).
6. **anthropics/skills format diff** (one pass; keeps his skill system interoperable with what his other agents read) — and graphify stays WATCH until a comprehension bottleneck is felt.

---

## GAP AUDIT

- **Items seen:** 44 positions (40 organic, 0 promoted/ads).
- **Trading-bot skipped:** 4 (positions 12 @velesxbt, 15 @RohOnChain, 22 @carm1nee, 43 @KirkDBorne) — never opened, per Garrett's rule. (Position 43's author also appears unflagged at #8 and was dissected there.)
- **Duplicates:** 0 (checked against the X seen index, SHARED-ITEMS-REGISTER.md, and the IG seen index — no status ID or item overlap).
- **Selected:** 20 (positions 1–11, 13, 14, 16–21, 23). **Bonus dissected:** 2 (#25, #27). **Inventoried-only, carried forward unindexed:** 18 positions — 24 (@sfdata9ers missed-tackle rankings), 26 (@TheHonestNFL "Final draft"), 28 (@KoalatyStats defensive target funnels), 29 (@the_waldman sims/projections, +23.8u claim UNVERIFIED), 30 (@throwthedamball Caleb Williams article), 31 (@ShampaIslaa9va image-only), 32 (@ghatz_28 Catchable Ball Rate), 33 (@1006_amit7481 job-board affiliate list), 34 (@_avichawla prefix-aware routing / KV-cache explainer — strong routing-stack material), 35 (@Swolosimo Madden concepts), 36 (@mathemetica vector operators), 37 (@footballu_app Bengals PA TE leak), 38 (@cosmosarcive quantum explainer), 39 (@AIGuideHQ data structures), 40 (@MathscIub integration table), 41 (@MikekKuchar Wisconsin Tampa vs USC), 42 (@The_Coach_A Flores boundary overload), 44 (@DavidZach16 Matchups In Motion Week 8). Several are strong (#24, #28, #32, #34, #42); they remain eligible for the evening run because only dissected posts are indexed.
- **Fully dissected vs compressed/image-gap:** football posts in the 20 received full dossiers (#5, #7, #11, #14, #16, #18, #19, #20). Generic study material was compressed to CONTEXT-ONLY with a one-line reason (#1, #2, #4, #6, #8, #23). **Image-payload gaps: 2** — #10 (@naturevx0, image unread) and #13 (@taketheunderzet, claim locked in an unread image). #1/#2/#4/#23 are image posts whose content is known at inventory-description level (chart type identified); their cells were not independently transcribed.
- **X media route check:** the custom.x-api connector cannot currently read posts — its CONNECTOR.md is an unfilled template with no helper, and the stored api.x.com bearer is recorded as invalid. The image gaps close when a working X API read path is configured or a browser media pass is authorized for a future run.
- **Primary sources checked:** arXiv (2407.18384 resolves; authors, v4 date, subjects verified); propsedge.io (tiers $19.99/$50, feature gates, book/league counts from its own pages); DFS Army's own site/podcast listings and the book's public walkthrough summary (book identity and headline findings verified; the study's microdata is not public); GitHub API for all 17 bonus repos.
- **Unresolved names:** none in the 20. Bonus truncations required three corrections, all resolved: ui-ux-pro-max → **nextlevelbuilder/ui-ux-pro-max-skill**; taste → **Leonxlnx/taste-skill**; graphify's owner moved → **Graphify-Labs/graphify** (transfer from safishamsi).
- **UNVERIFIED claims register:** PropsEdge homepage counts (14,000+ bettors; 1M+ props) and any X20 terms beyond the code itself; DFS Army's 34,856-lineup / 4-season sample and its "top lineup" definition; Flores' FTN/DVOA/EPA-run figures (cited-not-reproduced); the DT chart's grade provenance; the autoprover video's specific claims; the Cignetti article's factual claims; @the_waldman +23.8 units (inventoried only).
- **What closes each gap:** the book itself (or its microdata) closes the DFS sample question — a purchase decision that is Garrett's; an FTN/DVOA pull closes #16's digits; one week of in-house play data closes #11 and prototypes #18; a working X read path closes the image gaps.

---

# PART 6 — X, DEEPER PASS (18 posts, claim-level depth)

# X For You discovery sweep — deeper pass, 2026-10-29

Scope: the 18 posts inventoried but not dissected in the first run (positions 24, 26, 28–42, 44), plus deep dives on the first run's two top finds (DFS Army #14, pass-rate equilibrium #11). Method: post text and quotes from the first-run browser capture; every checkable payload taken to a primary or named source on the public web. X stayed read-only; no reply sections were used. Numbers are labeled VERIFIED (reproduced/traced to source), CITED (named source, not reproduced), or UNVERIFIED.

---

## PART 1 — The 18 inventoried-only posts

### #24 — @sfdata9ers — missed-tackle team rankings through Week 7 (data: @pfref)
- Post: https://x.com/sfdata9ers/status/2115844929247166692
- **WHAT IT IS:** a full-league ranking of team missed tackles through Week 7. The timeline text exposes the endpoints: 1. DET, 2. TEN, 3. MIN at the top (fewest) … 30. PHI, 31. DEN, 32. CLE at the bottom (most). The middle of the table lives in the post's image, which could not be read this pass — gapped, not guessed.
- **SOURCE CHECK (the payload this post actually carries):** the attribution is real. Pro Football Reference publishes missed tackles as **MTkl** (and MTkl%) in its player-level Advanced Defense tables, publicly, updated Wednesdays — PFR's own pages state the advanced stats run through Week 7 of 2026 as of today. An independent PFR-sourced republication (BetMGM's missed-tackles table, updated Oct 28) reproduces the same shape: DET fewest by a wide margin (12), DEN most (56), CLE (51) and PHI (49) the next-worst cluster. Two mid-table swaps vs the post (TEN/MIN order, DEN/CLE order) are consistent with a one-week window difference between the post's Week 7 cut and the republication's later update — the post's endpoints are **CITED and cross-checked at headline level**, not scraped cell-by-cell.
- **HOW TO USE IT:** PFR does not publish a ready-made team ranking; the table is the sum of player MTkl on each team's Advanced Defense page. That is a summing job, not a data purchase — GSE can build the identical table in-house, weekly, for free, and timestamp it.
- **WHICH SYSTEM:** GSE engine, **matchups layer** (defensive tackling quality is a real YAC/explosives input) and it interlocks with the first run's #16: Minnesota's missed-tackle rank is the other half of the Flores profile — a defense that both manufactures negative plays and rarely whiffs is a different projection than either trait alone.
- **CREATIVE ANGLES:** missed-tackle rate against is an *offensive* stat too — the same PFR table, read from the ball-carrier side via player rushing/receiving advanced stats, identifies which RBs/WRs gain hidden yards against sloppy-tackling defenses. Nobody posts that version.
- **RISKS:** missed tackles are a charted stat; PFR's charting standard is consistent but single-source. Small counts early-season (DET at 12 is a 7-week sample).
- **FIRST TEST / VERDICT:** build the W1–7 team MTkl table from PFR and diff it against the post's visible endpoints; if it matches, the table becomes a standing weekly pull. **LEARN-ONLY.**

### #26 — @TheHonestNFL — "Final draft" (4 images)
- Post: https://x.com/TheHonestNFL/status/2115554404426461209
- **WHAT CAN BE SAID HONESTLY:** the entire payload is in four images; the text is two words ("Final draft"). The account is a film-breakdown voice, so this is presumably a draft of an analysis product — but presumption is not a read. Image payload **unread — gap**, same X-media limitation as first-run #10/#13.
- **VERDICT: CONTEXT-ONLY** (gap recorded; closes only with an X media route).

### #28 — @KoalatyStats (Joseph Bryan) — 2026 defensive target funnels
- Post: https://x.com/KoalatyStats/status/2115811766294757392
- **WHAT IT IS (from the post text, which is substantive):** where each defense's targets are being funneled, 2026 season: Green Bay allows the 2nd-highest target share to WRs; Detroit allows the 3rd-most pass attempts against, the league's highest PROE against, and the 2nd-highest target share to TEs; San Francisco and Atlanta funnel targets to RBs. The chart image carries the full table; the headline claims are in the text.
- **SOURCE / COMPUTABILITY:** every ingredient is public-data computable — target share by position from play-by-play (nflverse), and PROE (pass rate over expected) is the NGS-derived expectation metric nflverse publishes. The account's exact pipeline is UNVERIFIED, but nothing here needs proprietary data — GSE can reproduce the full funnel table in-house and check the four headline claims exactly. Figures as posted: **CITED, not yet reproduced.**
- **WHICH SYSTEM:** GSE engine, **matchups layer**, in its most direct form: a target funnel is a statement about which opposing pass-catchers a defense structurally feeds. It is also DFS/content fuel — funnel-against is the cleanest one-line start/sit logic there is.
- **CREATIVE ANGLES:** funnels are two-sided — a defense that funnels to RBs is telling you its coverage removes WRs/TEs *or* that its pass rush forces checkdowns; separating those two causes (pressure rate vs coverage shell) turns a descriptive chart into a predictive one. That decomposition is the version worth building.
- **RISKS:** through-Week-7 samples; target shares are opponent-schedule contaminated until adjusted.
- **FIRST TEST / VERDICT:** reproduce the table from nflverse through Week 7 and verify the four headline claims; if they hold, funnel-against joins the weekly matchups inputs. **LEARN-ONLY.**

### #29 — @the_waldman — Panthers @ Packers sims and projections, "+23.8 units so far this year"
- Post: https://x.com/the_waldman/status/2115830608454987890
- **WHAT IT IS:** a simulation-model tout post: game sims and player projections for CAR @ GB, explicitly "No bets" on this game, with a season record claim of **+23.8 units — UNVERIFIED** (no ledger, methodology, or price basis stated in the post; nothing to reproduce it against).
- **WHICH SYSTEM:** none directly. The honest use is competitive context: sims-first public modelers are the comparison class for GSE's own published reasoning, and an unledgered units claim is exactly the credibility gap GSE's verified-record posture exists to exploit.
- **VERDICT: CONTEXT-ONLY** (record claim logged as UNVERIFIED; no follow-up owed).

### #30 — @throwthedamball (Judah Fortgang) — "Has Caleb Williams Arrived?"
- Post: https://x.com/throwthedamball/status/2115559500350431253 · Article read in full: throwthedamball.com, published Oct 28, 2026.
- **WHAT IT IS (mechanism):** a QB-behavior study arguing Williams' league-best under-pressure play in 2026 is a *skill acquisition*, not variance. The evidence chain: his time bought after pressure arrived rose from ~1.4s (2024) to ~1.7s; pressure-to-sack rate collapsed from ~30% (2024 — only Will Levis worse in his database) to 10% (2025); scramble rate rose 15% → 23%; and the new element in 2026 is *in-pocket* manipulation — moving within the pocket without bailing — which he charts as the most frequent in the NFL this year. Downstream: tight-window throw rate down to 6% (from 14% as a rookie), accuracy up across all field areas, Chicago's YAC generation now trails only Mahomes and Allen in his accounting, rhythm/undisturbed EPA at the 85th percentile (from 60th), and Chicago throwing 5% more than situation-expected (2nd in NFL). Fortgang flags his own caveat: partial-season samples, robustness-checked against random 4-week windows.
- **CLAIM STATUS:** outcome stats are from the author's own charting database — **CITED, not reproduced**. The mechanism claim (a new, repeatable skill vs hot outcomes) is the falsifiable part, and he states it as such.
- **WHICH SYSTEM:** GSE engine, **QB-behavior track of the matchups layer** — this is the template for how the engine should treat any "QB is suddenly great under pressure" signal: under-pressure performance is historically one of the least stable QB stats year to year, so the reasoning trace should demand the mechanism (what changed in the movement profile) before upgrading a QB. It also feeds the situations layer via Chicago's pass-rate-over-expected shift.
- **CREATIVE ANGLES:** the scramble-extend vs in-pocket-move split is a general QB taxonomy — every QB the engine faces can be typed by which survival skill he owns, and each type fails differently against pressure packages (compare #42: Flores' overloads are built to punish pocket-movers specifically by removing the escape lane they move *to*). Two feed posts, one matchup model.
- **RISKS:** single-analyst charting; 7-week sample; "best under pressure" is precisely the stat class that regresses.
- **FIRST TEST / VERDICT:** none required to use the *method* — the split-pressure taxonomy goes into QB-track notes now; the Williams conclusion itself stays a cited claim until a full season lands. **LEARN-ONLY** (high value).

### #31 — @ShampaIslaa9va — image only
- Post: https://x.com/ShampaIslaa9va/status/2115773581682782526
- **WHAT CAN BE SAID HONESTLY:** no text, image unread. Nothing else is claimable. **Gap.**
- **VERDICT: CONTEXT-ONLY** (image payload unread).

### #32 — @ghatz_28 — NFL QB Catchable Ball Rate, Weeks 1–7 (image)
- Post: https://x.com/ghatz_28/status/2115808424814366757
- **WHAT THE METRIC IS (defined):** catchable ball rate (CTBL%) = the share of a QB's attempts that arrive catchable for the receiver — a ball-placement/accuracy measure that strips out receiver drops and throwaways better than raw completion%. The per-QB values are in the post's image (unread — gap); the metric's definition and provenance are what this pass can establish.
- **PROVENANCE (verified):** catchable ball rate is a **human-charted** stat, not a play-by-play derivative. It is published as part of the Sports Info Solutions charting family — The Analyst's QB work uses CTBL% alongside OPENTGT% (open target rate) and PKP% (pickable pass rate), all SIS-charted — and ESPN's analytics charting uses the same catchable-ball concept in its QB evaluations. There is no public feed that computes it; the chart behind this post is built on one of those charting sources (which one is UNVERIFIED).
- **HOW TO USE IT / THE HONEST LIMIT:** GSE cannot compute CTBL% from nflverse — ball placement isn't in public play-by-play. The nearest in-house proxies are completion% residuals after accounting for depth, pressure, and throwaway rate — a *proxy*, and it must be labeled one, because the whole value of CTBL% is that it sees the throw, not the outcome.
- **WHICH SYSTEM:** GSE engine, **QB-behavior track (matchups layer)** — as a *concept to respect and an axis to approximate*, and as content: catchable-ball framing explains QB performances that completion% misreads in both directions.
- **CREATIVE ANGLES:** pair CTBL% with #30 — Fortgang's claim is, in effect, that Williams' catchable-ball profile transformed; two independent feed posts are pointing at ball placement as the undervalued QB axis. If GSE ever buys one charted dataset, this family (catchable / pickable / open-target) is the candidate, because it is the one the engine provably cannot synthesize.
- **RISKS:** charting is judgment-based and vendor definitions differ slightly; single-source dependency if adopted.
- **FIRST TEST / VERDICT:** build the completion-residual proxy and check its correlation with published CTBL% leaderboards (The Analyst's are public in articles); if the proxy tracks, use it labeled; if not, the axis stays external. **LEARN-ONLY.**

### #33 — @1006_amit7481 — remote-job boards + Claude course list, affiliate links
- Post: https://x.com/1006_amit7481/status/2115670447383593127
- **ONE LINE:** listicle spam — three real job boards (Remotive, We Work Remotely, Remote Rocketship) wrapped around a chain of LinkedIn/affiliate course links (imp.i384100.net is an affiliate redirect). Nothing here GSE doesn't already have better. **CONTEXT-ONLY.**

### #34 — @_avichawla (Avi Chawla) — prefix-aware LLM routing, explained
- Post: https://x.com/_avichawla/status/2115748674903130471
- **WHAT IT IS (mechanism):** an explainer of KV-cache-aware request routing for multi-GPU LLM serving. Production prompts share long prefixes (system prompt, tool definitions, conversation history); the GPU that served the last turn holds that prefix's KV cache. A cache-blind router sends the next turn to a cold GPU, which recomputes the whole prefix before generating a token. A prefix-aware router hashes the prompt block-by-block (each hash chained over everything before it), keeps a block-to-worker index of *locations* (never the tensors), routes to the worker holding the most matching blocks — Worker B with 4/4 blocks in his worked example — weighs load alongside locality so the warmest GPU doesn't get the longest queue, and updates the index from cache events so the next turn lands warm too. A small edit early in the prompt invalidates every block after it — the fragility is part of the mechanism.
- **THE BENCHMARK CLAIM — TRACED TO SOURCE:** the post's figures (p90 time-to-first-token 0.54s vs 92.5s random on 8 vLLM pods / 16 H100s) are a faithful retelling of **llm-d's own published benchmark** ("KV-Cache Wins You Can See," Sept 2025, engineers from IBM/Red Hat/Google/Alibaba/DaoCloud): precise prefix-aware scheduling hit p90 TTFT of 0.542s vs 31.1s for llm-d's earlier approximate scheduler and ~92s for random routing; throughput roughly doubled vs cache-blind routing. The post's "170x sooner" = 92.5 / 0.54. **Status: the post's numbers are VERIFIED as an accurate reproduction of the llm-d project's published results — and those results are a backer-run benchmark on a workload built to reward the technique**: 150 simulated tenants with 6,000-token shared contexts, total KV demand at ~73% of cluster capacity (6× any single pod). Independent commentary on the same benchmark is blunt: gains collapse toward zero when prefix share is low or cache is plentiful; llm-d wins exactly when cache is scarce and workload is skewed.
- **WHERE TO FIND IT:** llm-d (llm-d.ai, open-source Kubernetes distributed-inference project) for the system; Chawla's linked article covers the four caching layers (KV / prefix / prompt / semantic) from first principles.
- **HOW TO USE IT — AT GARRETT'S SCALE, HONESTLY:** he does not run multi-GPU vLLM clusters; fleet inference is API-based plus Kaggle jobs. The mechanism still transfers one level up, twice: (1) **stable-prefix discipline** — system prompts, tool definitions, and doctrine files kept byte-stable and front-loaded is what makes both provider-side prompt caching and tools like Headroom (this morning's Instagram find) pay; an early-token edit to a system prompt silently forfeits the cache everywhere. (2) **Session affinity in his own routing layer** — his gateway (OmniRoute/OpenRouter path) should pin a continuing conversation to the same provider/model endpoint for the same reason the router pins to Worker B: the warm cache lives there, and a mid-conversation provider hop is a cold-prefill tax on every turn.
- **WHICH SYSTEM:** **agent fleet infrastructure / routing stack** — a design principle for the gateway layer and for prompt construction across every agent job, including these sweeps.
- **CREATIVE ANGLES:** the block-hash index idea is a general pattern — "index of where state lives, never the state" — that maps onto his corpus infrastructure: a locator index over the research corpus (which file holds which analysis) with the same property that an early edit invalidates downstream entries. Cache thinking is corpus thinking.
- **RISKS:** importing cluster-scale conclusions into single-node/API reality is the failure mode; the 170× figure must never be quoted outside its workload.
- **FIRST TEST / VERDICT:** audit one real fleet conversation path for prefix stability (is the system prompt byte-identical across turns?) and measure provider prompt-cache hit behavior before/after pinning a session to one endpoint. **LEARN-ONLY** (mechanism certain; local magnitude unmeasured).

### #35 — @Swolosimo — Madden 27 seam routes vs Cover 3/4
- Post: https://x.com/Swolosimo/status/2115564515509055509
- **ONE-PARAGRAPH TREATMENT:** a video-game playbook post (stemmed corner + stock seam to stress deep-third/quarter defenders). The underlying concept is real scheme — vertical stems forcing zone defenders to declare — and it rhymes with first-run #7's Texas concept, but the product is Madden adjustments, not football data; nothing here is measurable or sourceable for the engine. **CONTEXT-ONLY** (the seam-stress idea is already in the scheme catalog via #7).

### #36 — @mathemetica — five operators of vector fields
- Post: https://x.com/mathemetica/status/2115666415663682037
- **ONE LINE:** a competent plain-language explainer of divergence, gradient, curl, Laplacian, and d'Alembertian as local-behavior descriptors of a field. Generic study material — but the framing ("operators that make a field confess its local behavior") is the same intellectual move as the engine's local diagnostics; no action. **CONTEXT-ONLY.**

### #37 — @footballu_app — Bengals 3rd & short play-action TE leak (video)
- Post: https://x.com/footballu_app/status/2115842919043088736
- **BRIEF:** a 37-second scheme clip of a tendency play — TE leak off play-action on 3rd & short. Tendency clips are matchups-layer raw material in principle, but a single unattributed clip with no data behind it is an anecdote, not an input. If Cincinnati's 3rd-&-short PA rate ever matters to a specific week's reasoning, it gets pulled from play-by-play then. **CONTEXT-ONLY.**

### #38 — @cosmosarcive — quantum mechanics as Hilbert-space geometry
- Post: https://x.com/cosmosarcive/status/2115208166640341277
- **ONE LINE:** a correct, standard explainer (states as vectors, probability as squared inner product). Background knowledge for the research program's math base; no mechanism, tool, or data. **CONTEXT-ONLY.**

### #39 — @AIGuideHQ — data structures for coding interviews (image)
- Post: https://x.com/AIGuideHQ/status/2115466830928113741
- **ONE LINE:** evergreen interview-prep chart; the payload is the image (a standard data-structures summary), the text names the topic. No fleet use — his agents don't interview. **CONTEXT-ONLY.**

### #40 — @MathscIub — integration formulas table (image)
- Post: https://x.com/MathscIub/status/2115815765228261622
- **ONE LINE:** the first run already read the image's title ("INTEGRATION — IMPORTANT FORMULAS"); a reference table, generic study material. **CONTEXT-ONLY.**

### #41 — @MikekKuchar — Wisconsin's Non-Traditional Tampa vs USC (X&O Labs)
- Post: https://x.com/MikekKuchar/status/2115493261322203291 · Source: xandolabs.com (The Lab).
- **WHAT IT IS:** a coach-education study of how Wisconsin upset USC with two "Non-Traditional Tampa" variants: (1) a Field Trap rotation with a field pressure pattern, and (2) a Double Cloud rotation against condensed sets. Tampa structure (two-high shell, middle runner carrying the seam) reached from non-standard rotations — the coverage arrives from a picture that doesn't announce it.
- **SOURCE CHECK:** X&O Labs is a real coaching-research publisher; its Lab catalog carries a standing "Full Install: Non-Traditional Tampa" research series built from coach interviews and film study — the product class Kuchar (an X&O Labs editor) is pointing at is genuine and exactly as described. The full install is member-paywalled; the two variant names and the game context are public via the post. Details beyond that: **CITED, paywall-gated.**
- **WHICH SYSTEM:** GSE engine, **matchups layer (scheme taxonomy)** — college lane primarily: rotation-based Tampa variants are a coverage-disguise category the reasoning system should name correctly when a defense's post-snap picture contradicts its pre-snap shell. The transferable idea for the NFL side is the same one as #30/#42: disguise is a *rotation path*, and typing defenses by rotation path beats typing them by static shell.
- **CREATIVE ANGLES:** X&O Labs' whole model — structured coach interviews turned into install documents — is a content format GSE's college coverage could mirror at public scale: one scheme, its two variants, the game it decided.
- **RISKS:** paywalled depth; college-to-NFL transfer is conceptual, not statistical.
- **FIRST TEST / VERDICT:** none — catalog the two variants in the scheme notes. **LEARN-ONLY.**

### #42 — @The_Coach_A — Flores' boundary overload vs Indianapolis (MatchQuarters)
- Post: https://x.com/The_Coach_A/status/2115579366977708499
- **WHAT IT IS (mechanism, from the post text):** the companion piece to first-run #16, showing the *pressure* side of the same defense. Minnesota's all-up/max-pressure reputation is the wrapper; the actual play here is a boundary overload that becomes coverage: Van Ginkel and Cashman drop out, the boundary DE bull-rushes the left tackle specifically to put two defenders on the tight end, and when Indy attacks the vision zones with a Sail concept — the textbook answer — the QB holds for the break and is sacked by the unblocked defender the structure manufactured. The blitz look was the mechanism for creating a free runner *and* a doubled TE simultaneously.
- **WHICH SYSTEM:** GSE engine, **matchups layer** — completes the Flores file: #16 (run-fit boom profile) + #24 (tackling floor) + #42 (pressure-as-coverage) is now a three-source opponent identity for Minnesota, each from a different post in one day's feed. It also feeds props reasoning in the negative: QB/TE lines against MIN are priced against the *reputation*; the structure says the TE is the designed casualty.
- **CREATIVE ANGLES:** "the pressure look that drops out" is a generalizable recognition category for the reasoning traces — defenses whose blitz rate and actual rush rate diverge are systematically misread by market-facing analysis, and that divergence is computable from charting Garrett already respects (blitz% vs pressure% splits). A named, checkable disagreement — the exact shape of his Reasoning Doctrine.
- **RISKS:** single-game film selection by an analyst who publishes on this defense often; the reputation caveat cuts both ways.
- **FIRST TEST / VERDICT:** none new — folds into the #16 divergence-flag test (split MIN's blitz-look rate from its true rush rate on the engine's data). **LEARN-ONLY.**

### #44 — @DavidZach16 — "Matchups In Motion: Week 8" (image)
- Post: https://x.com/DavidZach16/status/2115835047349473588
- **WHAT CAN BE ESTABLISHED:** a weekly fantasy matchup column in image form: Justin Jefferson's ceiling spot, Josh Jacobs' favorable matchup, Seattle's defense vs Chicago (the "Bear spray" headline — which interlocks with #30's game), and Josh Downs as a start candidate. The arguments and any data live in the image — **unread, gap**. The column's publication home was not verified in this pass (searched; the Week 8 edition did not surface outside X).
- **WHICH SYSTEM:** this is the *format* GSE's own weekly content competes with — headline-matchup framing. Noted as competitive format awareness; the substance is gapped, not evaluated.
- **VERDICT: CONTEXT-ONLY** (image payload unread; column source unverified).

### News list (named-player injury/availability)
None in Part 1 — no post in this set carries injury or availability news. (The Week 8 context in #30/#44 is matchup content, not availability.)

---

## PART 2 — Deep dives on the first run's top finds

### Deep dive A — #14 @DFSArmy / Kevin "Geek" Alan, "Cracking the DFS Code"

**What the public record actually contains (all mined free, per free-first routing):** the book — *Cracking the DFS Code: Revealing the Secrets to Winning Large-Field DraftKings NFL Tournaments* (Amazon; promo code "BOOK" gives 20% off DFS Army subscriptions, which tells you the book is also a funnel) — and the author's own long-form video walkthroughs on DFS Army's channels ("I Studied 230,000 NFL DFS Lineups" for main slate; a separate 350-lineup showdown study), whose published summaries expose the study's structure and headline results.

**THE SAMPLE — STATUS UPGRADE, STATED PRECISELY:** the post's "34,856 top lineups over 4 seasons" can now be traced to the publisher's own study description: **232,000 lineups analyzed across 376 major tournaments over four seasons, of which 35,000+ were top-100 finishing entries.** The post's 34,856 is evidently the exact count of that top-100 subset, and the discrepancy between "34,856" and "over 35,000" is rounding in the publisher's own summary, not invention. Status: **the figure is now corroborated by the publisher's primary public description of the study** — it is still publisher-stated, not independently reproduced (the underlying lineup-level data is not public, so no third party *can* reproduce it), and "top lineup" = top-100 finisher in a major tournament, which is now a *known* definition rather than an unknown one. That is as verified as this claim can get without buying the book and re-auditing — and it resolves the first run's open question about what "top" meant.

**The construction rules, with their stated evidence (author's published summaries):**
- **Stacks:** 87% of top-100 lineups used QB+1 or QB+2 (QB+1 ~50%, QB+2 ~38%, naked QB ~10%, concentrated in the expensive-rushing-QB era). **45% of winning stacks did not include the WR1** — the partner was a WR2/WR3/TE. Bring-backs appear in only ~50% — optional, not mandatory.
- **Ownership:** the "two sub-10%" rule — at least two skill players (RB/WR/TE) under 10% owned — held in **94%** of top-100 lineups. Average winning total ownership ≈ 126%: winners eat real chalk and differentiate surgically. Shape: ~2 sub-5% punts, ~2 sub-10%, ~3 in the 10–20% band, 1–2 pieces over 20%.
- **Game selection:** ~70% of winning lineups stacked a game with a total **under 48**; the week's highest-total game is an ownership trap. Winning QBs were favorites 65% of the time, but ~30% of *tournament-winning* lineups used an underdog QB; average winning QB salary ~$6,148.
- **Position economics:** RB — pay for volume (average winning RB ~$6,500; only 5% of winners used an RB under $4,500). WR — barbell (average ~$5,900; one stud, one mid, one punt; avoid multiple ultra-cheap WRs). TE — the punt position (average ~$4,200; 80% of top-100s under $5,000). DST — pay up slightly (average ~$3,000, home favorites).
- **Cluster theory:** winners draw from **5–6 games** in two clusters — the primary QB game stack plus a **secondary correlated pair from a different game in ~70%** of top lineups (this is the first run's "secondary correlation" finding, now with its rate attached).
- **Meta shifts (the findings with dates on them):** the expensive QB is dead — winners spending >$7,000 at QB fell from 25% (2022) to under 3% (2025), while sub-$5,000 "punt" QBs rose from 2% to 22% of winners. The flex has rotated: WR-in-flex fell 55% → 32% (2023→2025), RB-in-flex rose to 43%, TE-in-flex rose 12% → 26% (double-TE is now a backed build, not a gimmick). And "chalk creep": median winning-lineup total ownership is up 16 points across the study window — the field is converging, so *where* you differentiate matters more than *how much*.

**Mapping against Garrett's standing DFS directive (2026-09-25: winning-lineup construction from real samples, not vibes; and the 2026-09-20 packet format — a full write-up with position boards and analysis, not lineup cards alone):**
- The directive and this research program are the same method — Garrett's directive is, verbatim, what Alan did. The packet should therefore treat these rules as *measured claims with a named sample*, cited as such, per his research standard (build from consensus across outlets): the stack quotas, the two sub-10% floor, and the secondary-pair rate now have three agreeing public sources (this study; DFS Army's own weekly-winner audits; independent Milly Maker winner studies) — that is the consensus standard met for those three.
- ** Where the packet can apply it in Week 8, concretely:** (1) flex default flips — RB or second TE in the flex unless the WR case is explicit; (2) the QB salary band — the packet's QB board should flag any >$7,000 QB build as swimming against a measured 25%→3% current; (3) the game-total trap — the packet's featured game stack should be checked against the slate's highest-total game and, if they coincide, the ownership cost stated in the write-up; (4) bring-back as a coin-flip decision to argue per game, not a default.
- **What would still need the book:** the game-archetype taxonomy and the showdown codex (350-lineup study) — showdown is a separate construction problem Garrett's packet may or may not cover; the main-slate rules are fully public. Buy decision stays Garrett's; the free layer is now demonstrably mined out.

**Verdict (unchanged, strengthened): LEARN-ONLY** — but the open items from the first run are closed: sample defined and corroborated at the publisher level, rules extracted with their rates, directive mapping written.

### Deep dive B — #11 @run_the_sims — the pass-rate equilibrium

**Source hunt, reported honestly:** the post attributes the ~55% equilibrium figure to @SumerSports data inside a Kollmann/Tice quote chain. A public methodology behind that specific figure — a SumerSports paper, model card, or article deriving 55% — **could not be found in this pass**; SumerSports publishes analysis but no locatable equilibrium derivation. The digits therefore remain **UNVERIFIED at the source level**: 55% equilibrium vs 54% actual is a claim traveling through a quote chain, and no amount of plausibility upgrades it.

**Headline-level check against the published literature (what can be verified):**
- The *framework* is established: run/pass choice is the canonical sports minimax example, and the academic literature tests it directly. The best-known result set (Kovash & Levitt's minimax tests on NFL play-calling; and the serial-correlation literature, e.g. Smith et al., "Minimax on the gridiron") converges on a nuanced pair of findings: aggregate play *frequencies* sit broadly where equilibrium reasoning predicts, **but play *sequences* deviate significantly — negative serial correlation (excessive switching, win-stay/lose-shift tendencies) — and the excessive switching measurably costs efficacy.** Jesse Galef's situation-controlled work finds the same texture at 2nd-and-10: the run-after-pass spike survives controlling for score and situation, i.e. it is a calling pattern, not a situation artifact.
- So the literature's verdict on the post's claim is: *directionally right, importantly incomplete.* "The league is at equilibrium" is true of the averages and false of the sequences — and the sequences are where the exploitable residue lives. A defense doesn't face a team's season pass rate; it faces the next call, and the next call is more predictable than equilibrium permits.

**What the engine would do with it, precisely (matchups layer prior, situations layer discipline):**
1. **As a prior:** expected neutral-situation pass rate for a team = the equilibrium band (roughly the mid-50s, opponent-adjusted), NOT the team's raw recent rate. Deviations of a team's *personnel-adjusted* mix from that band are the signal (a team structurally unable to reach equilibrium is leaking value; a team pushed off it by opponent design is not — see #16/#42 Flores).
2. **As a sequence feature (the upgrade this deep dive adds):** track opponent play-call *serial correlation* — run-after-pass and pass-after-run conditional rates, situation-controlled — as a defensive-preparation input: a predictable sequencer gives the opposing defense free expected value that aggregate rates hide. This is computable from the play-by-play warehouse Garrett already holds; no external data needed.
3. **As a reasoning-trace rule:** never publish "Team X passes too little" from aggregate rates alone; the equilibrium frame requires stating what the defense is conceding before calling a mix a mistake.

**What would falsify it:** (a) if situation-controlled, team-level mixes show *persistent, personnel-unexplained* deviation from the indifference band with no performance cost — then the band is wrong or the payoff model is; (b) if serial-correlation measures on current-season data come back at zero (calls truly memoryless given situation) — then the sequence feature is dead and the aggregate claim stands whole; (c) if EPA-by-play-type, defense-adjusted, shows a stable, large gap favoring passes at current rates — then the league is *not* at indifference and "pass more" is a real free lunch, contradicting the equilibrium reading. All three tests run on his own warehouse. The prior earns its place only while it survives them.

**Verdict (unchanged): LEARN-ONLY** — framework verified against literature; SumerSports' 55% figure UNVERIFIED and now explicitly the weak link; the actionable output is the sequence feature + the falsification tests, both in-house.

---

## GAP AUDIT

- **Posts dissected this pass:** 18 of 18 assigned (positions 24, 26, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44). Verdicts: LEARN-ONLY ×7 (#24, #28, #30, #32, #34, #41, #42), CONTEXT-ONLY ×11. Part 2 deep dives: 2, both closed to the extent the public record allows.
- **Image payloads unread (4):** #26 (4 images, "Final draft"), #31 (image only), #32 (per-QB catchable-ball values — metric defined and sourced, values gapped), #44 (Matchups in Motion arguments). Same standing X-media gap as the first run; closes only with a working X media route, which does not currently exist in his connectors (the custom.x-api connector is an unfilled template — first-run finding, unchanged).
- **What stayed UNVERIFIED at close:** @the_waldman's +23.8 units (no ledger exists to check against); the SumerSports 55%/54% digits (no public methodology found — the claim's weak link, now named); @KoalatyStats' exact pipeline (claims reproducible in-house, not yet reproduced); #32's charting vendor (SIS vs ESPN — provenance family verified, specific source not); #44's publication home; Fortgang's charting database figures in #30 (cited, single-analyst).
- **What got VERIFIED that wasn't before:** PFR publishes MTkl publicly at player level through Week 7, and the #24 post's endpoints cross-check against an independent PFR-sourced table; the DFS study's sample spec (232,000 lineups / 376 tournaments / 35,000+ top-100s / 4 seasons) from the publisher's own description, resolving the 34,856 figure; catchable ball rate's provenance (SIS/ESPN human charting, CTBL%); the llm-d benchmark as the true source of #34's numbers, with its workload caveats attached; X&O Labs' Non-Traditional Tampa install series as a real catalog item.
- **Paywalled depth not pursued:** X&O Labs full install (#41), MatchQuarters' Flores resource pages (#42 via #16) — names and mechanisms public, depth is Garrett's purchase call if ever.
- **Not done by rule:** no X engagement; no reply sections read; trading-bot positions (12, 15, 22, 43) remain untouched and unindexed, per Garrett's standing exclusion.

---

# PART 7 — X, REPRODUCTION CHECKS (claims recomputed from nflverse + PFR)

# Reproduce-or-refute checks — 2026-10-29

Two public analytics claims from today's X sweep, tested against public data computed in-house. Method and verdicts below; scripts and intermediate tables are in `~/workspace/x-for-you-sweep/raw/repro-koalaty/`.

---

## Check 1 — @KoalatyStats defensive target funnels (X, Oct 29)

Source post: https://x.com/KoalatyStats/status/2115811766294757392 — "2026: Where are NFL defenses allowing targets to go?" Headline claims: Green Bay allows the 2nd-highest target share to WRs; Detroit allows the 3rd-most pass attempts, the highest PROE, and the 2nd-highest target share to TEs; San Francisco and Atlanta funnel targets to RBs.

### Method
- **Data:** nflverse public releases, downloaded 2026-10-29 — `play_by_play_2026.csv.gz` (pbp) and `roster_2026.csv`.
- **Data vintage / completeness:** the current nflverse release contains **Weeks 1–7 only** (107 games, 18,738 plays). Week 8 is not yet in the release, so a through-Week-8 reproduction is **not computable from nflverse today**. All verdicts below are for the through-Week-7 window — which turns out to be the window the chart itself was almost certainly built on (see the pattern of exact rank matches).
- **Targets faced:** plays with `pass_attempt == 1`, excluding QB spikes and two-point attempts, with a non-null `receiver_id` → **6,805 targets** league-wide.
- **Position attribution:** `receiver_id` (GSIS) joined to `roster_2026.csv` on `gsis_id`, using the roster `position` field. **Zero unmapped receivers** (0 of 6,805). Distribution: WR 3,941 / TE 1,629 / RB 1,228 / QB 4 / OL 3. Target share allowed = targets to that group ÷ all targets faced (the 7 QB/OL trick-play targets stay in the denominator as OTHER). The roster file holds one row per player (no duplicate GSIS IDs) and lists no FBs in 2026, so RB needs no FB fold-in.
- **Pass attempts faced:** primary = count of `pass_attempt == 1` (excluding two-point attempts); cross-checked against dropbacks faced (`qb_dropback == 1`).
- **PROE allowed:** nflverse pbp carries `xpass`/`pass_oe` on 99.5% of dropbacks. PROE allowed = mean `pass_oe` of opposing dropbacks vs that defense. Six alternative definitions were also computed (per-attempt, per-game averaged, spikes excluded, pass-rate − xpass, win-probability 5–95% filter, single-week and Weeks 4–7 windows).
- **Mapping error modes (documented, not hidden):** roster position is the player's official listing, not his alignment on the play — hybrid players (a listed TE split wide, a listed WR in the backfield) are counted at their listed position; using nflverse participation data (actual alignment) would be the refinement. Listed position (`position`) was used rather than `depth_chart_position`. Neither choice is rank-material here: re-running target shares **including** two-point attempts leaves every claimed rank unchanged.

### Claim-by-claim verdicts

| # | Claim | Computed (W1–7) | Verdict |
|---|-------|------------------|---------|
| 1 | GB allows 2nd-highest WR target share | GB **65.7%**, rank **2** of 32 (PHI #1, 67.3%) | **REPRODUCED** |
| 2 | DET allows 3rd-most pass attempts | DET **279**, rank **3** (ATL 303, DEN 285); also rank 3 by dropbacks (288) | **REPRODUCED** (both definitions) |
| 3 | DET allows the highest PROE | DET **+29.3**, rank **7–11** across all six definitions; **MIA #1 (+34.7) under every season-long definition** | **NOT REPRODUCED** |
| 4 | DET allows 2nd-highest TE target share | DET **30.0%**, rank **2** (KC #1, 31.0%) | **REPRODUCED** |
| 5 | SF and ATL funnel targets to RBs | SF **23.7%** RB share, rank **2**; ATL **22.2%**, rank **3** (MIA #1, 24.1%) | **REPRODUCED** (both top-3; only MIA ahead of SF) |

Extract of the computed table (full 32-team table: `raw/repro-koalaty/defense_funnel_2026_w1-7.csv`):

| Defense | Att faced | Dropbacks | Targets | WR share | TE share | RB share | PROE allowed |
|---------|-----------|-----------|---------|----------|----------|----------|--------------|
| PHI | 252 | 265 | 229 | .673 | .188 | .140 | +30.6 |
| GB | 259 | 275 | 233 | **.657** | .180 | .163 | +26.6 |
| ATL | 303 | 307 | 270 | .552 | .226 | **.222** | +27.3 |
| DET | 279 | 288 | 243 | .551 | **.300** | .144 | +29.3 |
| SF | 263 | 268 | — | .526 | .237 | **.237** | +25.0 |
| MIA | — | — | — | — | — | **.241** | **+34.7** |
| KC | — | — | — | — | **.310** | — | — |

**On the PROE miss:** the gap is not a rounding or definition artifact. Miami leads Detroit by ~5.5 points under the baseline definition, and Detroit never ranks above 7th in any variant tried (per-attempt: 11th; per-game: 7th; WP-filtered: 10th; Week 7 only: 16th; Weeks 4–7: 7th). Either the chart's PROE column came from a non-standard formula the post doesn't disclose, or it is simply wrong. Everything else in the post reproduces *exactly* at Week 7 under the standard nflverse pipeline — which is what makes the PROE number stand out: the same pipeline that nails four of five claims refutes the fifth.

**On the window:** four exact rank matches (2nd, 3rd, 2nd, and a top-3 pair) in the only window public data currently supports is strong evidence the chart was built on through-Week-7 data with a standard pbp + roster-position pipeline — i.e., the account's method is reconstructible, and its one bad number is detectable only because it is.

---

## Check 2 — @sfdata9ers missed-tackle endpoints (X, Oct 29)

Source post: https://x.com/sfdata9ers/status/2115844929247166692 — team missed tackles through Week 7, attributed to Pro Football Reference: 1. DET, 2. TEN, 3. MIN … 30. PHI, 31. DEN, 32. CLE.

### Method
- PFR **is** programmatically reachable: `pro-football-reference.com/years/2026/defense_advanced.htm` returned HTTP 200 with a normal browser user-agent. (The advanced defense table does **not** live on the main `defense.htm` page, which contains no MTkl data at all, and the season `advanced.htm` hub carries only offensive advanced tables — the defense table is on the `defense_advanced.htm` page.) Player-level MTkl (768 players) was summed by team.
- PFR's aggregated totals match the independent BetMGM republication cited in the deeper pass **exactly** (DET 12, DEN 56, CLE 51, PHI 49) — two reads of the same table agree.
- Window note: PFR's advanced tables update Wednesdays and currently reflect games through Week 7.

### Verdicts

| Claim | Computed from PFR | Verdict |
|-------|-------------------|---------|
| DET fewest missed tackles (#1) | DET **12**, #1 — next team (MIN) has 18; "fewest by a mile" is literal | **REPRODUCED** |
| Top 3 = DET, TEN, MIN | DET 12 (#1), MIN 18 (#2), TEN 23 (#3, tied with CAR) — same three teams, TEN/MIN order swapped vs the post | **CLOSE** (adjacent swap) |
| Bottom 3 = PHI (30), DEN (31), CLE (32) | PHI 49 (#30, exact), CLE 51 (#31), DEN 56 (#32) — same three teams as the worst cluster; DEN/CLE order swapped vs the post | **CLOSE** (adjacent swap) |

Full team table: `raw/repro-koalaty/pfr_missed_tackles_by_team.csv`. The two adjacent swaps are consistent with the post having been made from a marginally different PFR update cut than today's table; the endpoints the post actually headlined (DET fewest by a wide margin; DEN/CLE/PHI the worst cluster) are correct.

---

## What this proves about borrowing charts vs computing in-house

1. **The public-chart ecosystem is reproducible almost for free.** Four of five KoalatyStats headline claims and both sfdata9ers endpoints rebuild exactly from two public files (nflverse pbp + rosters; one PFR page) in a few minutes of compute. Nothing in either chart required proprietary data — GSE's warehouse can generate both tables weekly, on its own schedule, with its own definitions written down.
2. **The one wrong number was invisible until reproduced.** The PROE claim sat in a chart whose other four numbers are exactly right. A borrowed chart imports its author's errors with no flag attached; the in-house table is what let the error be isolated to a single column. That is the doctrine in miniature: the reasoning is the product, and reasoning you cannot recompute is reasoning you are renting.
3. **Definition choices are the whole game.** Every verdict above turned on stated definitions (spikes and two-point plays out, roster position over alignment, per-dropback PROE). The borrowed charts state none of theirs. In-house, the definitions live next to the numbers, so a claim can be re-run when the definition is challenged.
4. **Known limits of the in-house route, honestly:** position attribution by roster listing rather than on-play alignment (participation data is the upgrade path), and nflverse's release lag — Week 8 was complete on the field before it existed in the public pbp file, so a borrowed chart can occasionally be *fresher* even when it is less checkable.

**Bottom line:** @KoalatyStats — 4 of 5 claims REPRODUCED exactly, PROE claim NOT REPRODUCED (Miami, not Detroit, allows the most over-expectation passing). @sfdata9ers — endpoints REPRODUCED (DET fewest) with two adjacent-order swaps (CLOSE). Both tables now exist in-house and can be regenerated weekly from `raw/repro-koalaty/repro.py` plus the PFR scrape.

*Run completed 2026-10-29 ~12:07 CT. Data: nflverse releases and pro-football-reference.com as of that date.*

---

# PART 8 — TRENDING SCAN (GitHub + Hugging Face)

# Trending scan — GitHub + Hugging Face — 2026-10-29 (~11:59 CT)

Quick headline triage, part of the 45-minute discovery push. Existence verified from the listings themselves; no READMEs read, no deep dives. Verdicts are lite: NOTE / SKIP, plus up to 5 FLAG FOR DEEP DIVE across both platforms. Nothing killed — "no lane" items are listed, not dropped.

## FLAG FOR DEEP DIVE (5)

1. **cloudflare/security-audit-skill** (GitHub weekly #1) — Cloudflare's coding-agent skill for multi-phase security audits with independently verified, machine-readable findings. 52,535★ total, +16,002 this week, JavaScript. WHY: lands directly on Garrett's open credential-rotation sitting (Neon + Telegram + BRIEFING.md purge) and the 59 gitleaks findings in the Sports tree — a verified-findings audit skill is the missing checker for that lane, and it fits the fleet's QC pattern (Jules/Dots adversarial review).
2. **obra/superpowers** (GitHub daily #2, weekly #7) — agentic skills framework + software-development methodology. 308,202★, Shell, MIT. WHY: the dominant skills architecture in the ecosystem, and it surfaced twice today (also #1 in the X sweep's Claude Code skill-repos roundup). Benchmark for how his fleet's custom skills are structured.
3. **thedotmack/claude-mem** (GitHub daily #8) — persistent context across sessions for agents: captures session activity, compresses it, injects relevant context into future sessions; works with Claude Code, Codex, Gemini, Hermes, Copilot, OpenCode. WHY: cross-session memory is his fleet's known weak spot (compaction losses are a recurring failure class in his own operation).
4. **CopilotKit/OpenBot** (GitHub daily #9) — open-source AI coworkers, each with its own computer (browser, files, tools); every action decided before it happens and recorded after. WHY: that decide-before/record-after shape is his gate doctrine as a product; his Dots layer already runs on CopilotKit, so this is the same vendor's fuller version of a pattern he already owns a piece of.
5. **pbakaus/impeccable** (GitHub daily #3, weekly #4) — design vocabulary for coding agents: steer with polish/bolder, review with critique/audit, catch AI slop before it ships. 94,801★, Rust, Apache-2.0. WHY: direct input to GSE web surfaces and Kit client deliverables, where generic-AI look is the exact failure his frontend-design standard exists to prevent.

## GitHub Trending — today (daily)

| Repo | What it is | Data | Lane call |
|---|---|---|---|
| HKUDS/DeepTutor | Lifelong personalized AI tutoring system | 49,543★, Python, Apache-2.0, pushed today | NOTE — revenue/ARE: tutoring is a proven AI product shape; pattern reference, no current lane |
| obra/superpowers | Agentic skills framework + dev methodology | 308,202★, Shell, MIT | FLAG (above) |
| pbakaus/impeccable | Design vocabulary / anti-slop for coding agents | 94,801★, Rust, Apache-2.0 | FLAG (above) |
| JetBrains/thinkrail | Lightweight IDE that customizes itself around vibe-coding with pi | 5,832★, TypeScript, Apache-2.0 | SKIP — fleet already has its coding lanes; IDE churn is not a gap |
| milind-soni/OpenMausBot | Open-source Grok Bot alternative; bots get a usable VM | 7,258★, TypeScript, Apache-2.0, pushed today | NOTE — fleet: a self-hosted alternative shape for his Grok-side bot workforce; immature, watch only |
| nightly-labs/openbot | Local-first desktop workspace for persistent AI teammates (Codex/Claude/Grok), task queues, agent-to-agent collaboration | 28★ — brand new, momentum-only listing | NOTE — concept is exactly his fleet-orchestration pattern; 28 stars means unproven, catalog only |
| elayadesign/ai-design-skills | Design skills pack for agents | 68★ — new | NOTE — tiny; same space as impeccable, which is the serious entry |
| thedotmack/claude-mem | Persistent cross-session agent memory (see flag) | metadata pull failed in scan; listing verified | FLAG (above) |
| CopilotKit/OpenBot | AI coworkers with own computers; actions decided before, recorded after | listing verified | FLAG (above) |
| togg53192-cmd/jailbreaks | A list of LLM jailbreak prompts | listing verified | SKIP — no lane; offensive prompt collection, cataloged for awareness only, nothing to adopt |
| Donchitos/Claude-Code-Game-Studios | Turns Claude Code into a game-dev studio: 49 agents, 72 workflow skills, studio hierarchy | listing verified | NOTE — fleet org-pattern reference (division/team-leader hierarchy mirrors his Grok Bot Galaxy structure); game dev itself is no lane |

## GitHub Trending — this week (additions beyond the daily list)

| Repo | What it is | Data | Lane call |
|---|---|---|---|
| cloudflare/security-audit-skill | Multi-phase security-audit skill, verified machine-readable findings | 52,535★, +16,002 this week, JavaScript | FLAG (above) |
| php/php-src | The PHP interpreter itself (release-cycle attention) | — | SKIP — no lane |
| AgriciDaniel/claude-seo | Universal SEO skill for Claude Code: 26 sub-skills + 19 sub-agents, technical SEO, GEO/AEO, llms.txt, backlinks, local SEO | listing verified | NOTE — GSE site + Kit: overlaps his existing SEO growth skill; worth a compare before any adoption |
| multica-ai/andrej-karpathy-skills | Single CLAUDE.md improving Claude Code behavior, from Karpathy's LLM-coding-pitfall observations | listing verified | NOTE — fleet standards input; also appeared in today's X sweep roundup; cheap to trial later |
| TauricResearch/TradingAgents | Multi-agent LLM financial trading framework | listing verified | NOTE — cataloged as a research pattern only; trading systems are not a GSE lane under his books-last doctrine, no adoption pitch |
| anthropics/knowledge-work-plugins | Anthropic's official open-source plugins for Claude Cowork knowledge workers | listing verified | NOTE — knowledge-organization patterns from the vendor itself |
| Leonxlnx/taste-skill | Agent skills giving coding agents design taste (art direction, reference images, browser check) | listing verified | NOTE — same design-quality lane as impeccable; also in today's X roundup |
| jakubkrehel/skills | Agent skills for building great interfaces | 9,128★, +776 this week, Markdown | NOTE — third entry in the same design-skills cluster this week; the cluster itself is the signal |
| ruvnet/ruflo | Agent harness: multi-agent swarms, autonomous workflows, adaptive memory, vector RAG; native Claude Code / Codex / Hermes integration | listing verified | NOTE — fleet infra: a swarm-harness pattern sitting next to his MCP fleet bus; compare material, not a replacement candidate today |

Pattern across GitHub today: the trending list IS the agent-skills ecosystem — skills frameworks, memory, coworker governance, design taste, SEO skills. The market is productizing exactly the layer Garrett already runs by hand.

## Hugging Face — trending models (top 20 by trending score)

| Model | What it is | Numbers | Lane call |
|---|---|---|---|
| Qwen/Qwen3.8-27B | Qwen multimodal flagship-class 27B | 7.51M downloads, 18,667 likes | NOTE — routing stack: 27B is the largest class that stays Kaggle/API-feasible for him; the one to watch as the open-weight reference |
| Lightricks/LTX-2.5 | Image/text-to-video diffusion | 2.27M downloads, 9,815 likes | NOTE — Content OS awareness only. Explicitly NOT a Nova pitch: her video lane is stopped, and AI generation is never a substitute for real footage in his sports work |
| abenzerps/Qwen-Image-2.1-Uncensored-Quantized | Uncensored Qwen-Image GGUF fine-tune | 2.17M downloads | SKIP — no lane |
| ISTA-DASLab/DeepSeek-V4.1-Flash-1017-GSQ-RCO-GGUF | Quantized GGUF of DeepSeek V4.1 Flash | 1.58M downloads | NOTE — routing stack: GGUF quants are the free-first, locally/Kaggle-runnable class his routing prefers |
| black-forest-labs/flux-3-image-klein-comfy | FLUX.3 Klein image model, ComfyUI build | 832K downloads, 2,019 likes | NOTE — image lane: FLUX-line successor to the family his Nova LoRA trains on (schnell); track, no action while that lane is quiet |
| deepseek-ai/DeepSeek-V4.1-Flash-1017 | DeepSeek V4.1 Flash, multimodal | 131K downloads, 3,720 likes | NOTE — hosted/API class; the original behind the GGUF above |
| nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB | Small Nemotron edge model, 4GB GGUF | 57K downloads | NOTE — edge/small class; plausible on modest hardware, no current job for it |
| LiquidAI/LFM3-1.7B | Tiny 1.7B edge LLM | 15.9K downloads | NOTE — same edge class, cataloged |
| RecursiveSI/flint | Small text-generation model | 16.6K downloads, 1,232 likes | SKIP — unknown provenance, no lane |
| MiniMaxAI/MiniMax-M3.1-Flash | MiniMax multimodal flash | 15.7K downloads | NOTE — API-class awareness only |
| Nanbeige/Nanbeige4.3-33B | 33B open LLM | 9.7K downloads | SKIP — no lane beyond awareness |
| XHToken/Spark-X2.6-4B | 4B text model | 10.2K downloads | SKIP — no lane |
| ccore/Qwen3.5-4B-3D-Coder | 4B code model, GGUF available | 12.2K downloads | NOTE — small coder class; fleet uses hosted frontier coders, catalog only |
| OpenMOSS-Team/MOSS-Image-SFT | Text-to-image model | 15K downloads | SKIP — no lane |
| baidu/Unlimited-OCR-2 | OCR / document-understanding model | 18.1K downloads | NOTE — document lane: OCR quality matters to his corpus/document ingestion work; API-class, cataloged |
| nvidia/NVIDIA-Nemotron-3.5-Transcribe-30B-A4B | Speech-to-text, 30B MoE | 4.3K downloads | SKIP — too big for his lanes; his whisper setup covers transcription |
| tencent/Hy-SimulMT-30B-A3B-FP8 | Simultaneous machine translation | 396 downloads | SKIP — no lane |
| orcarouter/DeepSeek-V4.1-Flash-1017-abliterated-GGUF | Abliterated (refusal-removed) DeepSeek quant | 28.8K downloads | SKIP — deliberately de-aligned variant, no lane |
| mistralai/Mistral-Large-4-1T-A52B | Mistral 1T-parameter flagship | 278 downloads, 1,133 likes | SKIP — datacenter-only by size; awareness that it exists |
| HuggingFaceBio/Carbon-X | Biology-domain LLM (Qwen3 base) | 2.8K downloads | SKIP — no lane |

## Hugging Face — trending datasets (notable of 20)

| Dataset | What it is | Numbers | Lane call |
|---|---|---|---|
| secemp9/arxiv-complete | Full arXiv corpus as a dataset | 168.8K downloads, 752 likes | NOTE (strong) — research program: direct feedstock for his NGS/arXiv program (579/750 verified); a local arXiv corpus changes how the remaining papers get found and read |
| XiaomiMiMo/MiMo-V2.6-RL-oss | RL training traces, Apache-2.0 | 235K downloads, 1,025 likes | NOTE — agent-training data pattern; awareness for fleet improvement work |
| CohereLabs/10-2026-qwen-investigation-traces | Agent investigation traces (JSON, agent-traces format) | 3.2K downloads | NOTE — fleet: real agent-trace data is eval material for his own agents |
| LocalLLaMA/typed-decisions | Decision-making benchmark (official) | 41.5K downloads | NOTE — reasoning/decision evals touch his engine's reasoning doctrine; cataloged |
| Vyber07/cyber-security | Cybersecurity QA dataset, Apache-2.0 | 6.6K downloads | NOTE — Family Shield-adjacent reference data; weak fit, cataloged |
| venvoo/china-a-share-l2-level2-limit-order-book-tick-data | China A-share L2 order-book tick data (>1T rows) | 178.5K downloads | SKIP — no lane (not his markets) |
| nvidia/simready-assets / simready-central-library | Robotics simulation-ready 3D assets, CC-BY-4.0 | 839K downloads | SKIP — robotics sim, no lane |
| datasocial/tiktok-5.6B-videos | 5.6B-row TikTok video metadata, CC-BY-NC | 32.8K downloads | NOTE — content-research scale reference; non-commercial license fences any revenue use |
| Manusagents/GPT-5.5-…-Distillation-Dataset | Multi-frontier-model distillation dataset | 13.1K downloads | SKIP — provenance murky by construction, no lane |
| ILSVRC/imagenet-1k | ImageNet-1k (perennial) | 95.5K downloads | SKIP — baseline dataset, nothing new |
| Remaining (3d-collection, Fable-5.1 reasoning, Nemotron-Personas-Vietnam, bones-studio/seed, CulturalRiddles, PhysicalAI-AV, VDEBench, text-to-3d-with-llm-code, Qwen/BlenderWorld) | 3D assets, persona corpora, robotics/video benchmarks | — | SKIP — no lane today, listed so the scan is complete |

## Hugging Face — trending spaces (notable of 20)

The Spaces list today is dominated by uncensored image/video generation demos — SKIP as a class (no lane; several are exactly the AI-generation category his footage rules fence off). Exceptions worth a line:

| Space | What it is | Lane call |
|---|---|---|
| black-forest-labs/flux-3-image-klein | Official FLUX.3 Klein demo (MCP server) | NOTE — the try-it surface for the FLUX.3 model above |
| multimodalart/jev-decision-index | "Decision index" static app, 840 likes | NOTE — unclear from listing alone; decision-support tooling is his engine's neighborhood, one line pending any future look |
| WizardTY/GEAR | LLM-agent harness research demo | NOTE (weak) — agent-harness pattern, same cluster as the GitHub fleet items |
| nvidia/simready-central | NVIDIA sim-ready asset browser (docker) | SKIP — robotics, no lane |
| pollen-robotics/microduck-simulator | Robot-duck simulator, 759 likes | SKIP — no lane |

## Scan notes / gaps

- GitHub trending pages return names + descriptions but star-gain only on some entries; per-repo metadata was pulled for 7 of 19 repos before the API wrapper's latency (~4–25 s/call) made full enrichment incompatible with the quick-scan brief. Confirmed figures are in the tables; the rest are listing-verified only.
- HF numbers are the API's own downloads/likes at fetch time (2026-10-29 ~16:58 UTC).
- Deep-dive flags are capped at 5 by the brief; the strongest near-miss was secemp9/arxiv-complete (dataset) — first in line if a flag slot opens.

---

# PART 9 — TRENDING DEEP DIVE (6 dossiers)

# Trending deep dive — 2026-10-29

The 5 flagged items from today's trending scan, plus the near-miss dataset, read at primary source (GitHub API metadata, full READMEs, the security-audit skill's own SKILL.md and file tree, and the HF dataset card/README). Nothing installed, nothing run. Vendor claims are labeled as vendor claims; everything else is from the repos themselves.

---

## 1. cloudflare/security-audit-skill — the missing checker for the credential-rotation sitting

**Verified facts:** 52,540★, 3,366 forks, MIT, JavaScript. Created 2026-06-18; last push 2026-09-14. It is the public seed of Cloudflare's internal vulnerability-discovery harness (their blog: "Build your own vulnerability harness"); the README is explicit that the internal system "grew into a multi-stage, fleet-wide system" beyond this skill — so the public version may lag the internal one (how much is UNVERIFIED).

**What it is.** One agent-neutral skill directory: a 22KB `SKILL.md`, 14 companion methodology files, a `report-schema.json`, and two zero-dependency Node validators *with their own test suites* (`validate-findings.cjs`, `validate-coverage-ledger.cjs`). Two modes: **guidance** (default — advice and focused review, writes nothing) and **full audit** (all six phases, artifacts written). Install: `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit`; it triggers on requests like "security audit this codebase." Output defaults outside the target repo (`~/security-audit-skill/<repo>/run-<N>`).

**The methodology — six phases:**
1. **Reconnaissance** — architecture, trust boundaries, input surfaces, and prior evidence are mapped into `architecture.md` and a deterministic `coverage-ledger.json` (coverage planned as units *before* anyone hunts).
2. **Coverage-led hunting** — isolated hunter subagents are assigned per ledger unit; separate coverage-critic waves hunt for gaps in the ledger itself.
3. **Candidate validation** — every unique candidate (fingerprinted, deduplicated) goes to a *fresh* verifier whose job is to disprove it. The agent that checks a finding is never the agent that found it.
4. **Structured output** — all final records land in `findings.json`, machine-validated against `report-schema.json`; the coverage ledger is validated too. Both validators re-run after every later change.
5. **Independent record verification** — fresh agents re-verify the final source claims in the records; a materially changed record gets another independent verifier.
6. **Target-neutral reporting** — `REPORT.md`, `FINDINGS-DETAIL.md`, and `NEEDS-VALIDATION.md` are *derived from* the verified records, never written freehand (prose/JSON disagreement is a named anti-pattern).

**What it verifies, and the verdict discipline.** A candidate only confirms with a complete source trace and a bounded observed result. Three verdicts: `confirmed` (the only class that receives severity — likelihood × impact, calibrated against written anchors; "severity requires impact, not deviation from a checklist"), `needs_validation` (a source-grounded hypothesis blocked on one exact unresolved fact — carries **no severity**), and `rejected` (disproved, kept on record). Each record carries a fingerprint, claimed root cause, source trace, evidence, blockers, a validation plan, and the smallest-effective-fix recommendation. Source inspection is read-only; target code runs only inside an OS-enforced sandbox (no external network, allowlisted environment, resource limits, write-isolated scratch) — if those controls can't be enforced, the lead stays `needs_validation` instead of being executed. Depth is tunable: `quick` / `standard` / `deep` profiles, scoped runs (named paths, or the diff between two refs), and a strict agent-invocation budget gate. Runs are additive: prior ledgers and findings carry forward, changed source gets revalidated, stale evidence is never treated as covered.

The companion files map to attack domains — the ones that matter here: `SUPPLY-CHAIN-AND-RELEASE.md` (dependencies, CI, release, signing), `CLOUD-AND-DEPLOYMENT.md` (IAM, IaC, containers, runtime config), `DATA-ISOLATION-AND-LIFECYCLE.md`, `WEB-PROTOCOL-AND-AUTH.md`, and `AI-AND-LLM.md` (prompt injection, agent/tool surfaces).

**How it runs against Beexly/Sports, concretely.** Point a coding agent at the Sports checkout and ask for a security audit, scoped: the paths gitleaks already flagged (e.g. `apps/web/app/api/cron/gamma/route.ts`, `scripts/ops/gamma-cron-smoke.sh`) or the diff of the Oct 22 commits GitGuardian tied to its 17 incidents. Feed the existing gitleaks output in as prior evidence in Phase 1. Hunters work the scoped units; verifiers try to kill each candidate; what survives lands in `findings.json`.

**Exactly how it changes the rotation sitting's workflow.** Today the sitting is a manual checklist (reset Neon, purge `BRIEFING.md`, rotate the Telegram token via BotFather) sitting next to **59 gitleaks findings nobody has triaged** — gitleaks finds patterns; it cannot say which of the 59 are live boundary failures, which are fixtures/test strings, and which are already-dead keys. The skill changes four things:

1. **Triage becomes verdicts, not vibes.** Each of the 59 becomes a fingerprinted `confirmed` / `needs_validation` / `rejected` record with a source trace — the exact real-vs-fixture split the sitting is currently missing.
2. **The unknowns become named facts.** "Is the Telegram token actually burned? Is the Neon string still live?" stop being assumptions and become `needs_validation` records, each with the exact unresolved fact and a safe validation plan.
3. **Coverage becomes provable.** The validated coverage ledger is a machine-checkable statement of what was actually examined — the audit-completion artifact the sitting would otherwise have to assert by hand.
4. **The fix becomes verifiable.** After rotation and purge, a re-run is additive: prior fingerprints are re-checked against current source, so "the old exposures are gone from the tree" is *demonstrated by the run diff*, not claimed. (Boundary: the skill audits source at a ref — it does not inspect git history or cloud consoles, and it rotates nothing. History verification stays with the existing git-security-guard skill; the rotations stay manual. It is the sitting's checker, not its executor.)

**Risks / limits.** Needs a coding agent with parallel subagents plus Node for the validators. A standard/deep run over a monorepo the size of Sports burns many agent invocations (the budget gate exists for this; `quick` = one hunter wave + one critic pass). On this VM the sandbox controls may not all be enforceable, which by design degrades reproduced checks to `needs_validation`. Public repo untouched since Sep 14.

**Smallest first test.** One `quick`-profile scoped run over the two production paths gitleaks flagged, with the 59 gitleaks hits supplied as prior evidence. Compare its verdicts against the known prod-vs-fixture split. One sitting, bounded, no repo changes (output lives outside the target).

---

## 2. thedotmack/claude-mem — automatic capture for the build lanes, not a replacement for curated memory

**Verified facts:** 104,444★, 9,218 forks, Apache-2.0, TypeScript, v15.6.0, pushed today (very actively maintained). Homepage claude-mem.ai.

**Mechanism — capture, compress, re-inject.** Lifecycle hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, SessionEnd) capture tool-use observations from the agent's work. A local worker service (Bun; HTTP API + web viewer) sends observations to an AI "observer" that compresses them into semantic summaries. Storage is SQLite (sessions, observations, summaries; FTS5 full-text) plus a Chroma vector database for hybrid semantic + keyword search. At SessionStart, relevant context is injected back; on demand, the agent retrieves through 3 MCP tools in a progressive-disclosure pattern — `search` (compact index, ~50–100 tokens/result), `timeline` (chronological context), `get_observations` (full detail, ~500–1,000 tokens/result). The "~10× token savings" figure is the project's own claim. `<private>` tags exclude content from storage. Settings live in `~/.claude-mem/settings.json`.

**Harness support** (per README): Claude Code (plugin marketplace), Codex, Gemini, **Hermes**, Copilot, **OpenCode**, plus Grok Bot, Antigravity, Pi, T3 Code, and an OpenClaw gateway installer. Install is one command per harness, e.g. `npx claude-mem install --ide opencode`. So yes — it covers his actual coding lanes (Hermes and OpenCode explicitly), not just Claude Code.

**The commercial catch, stated plainly.** The default memory provider is **CMEM Pro, their hosted observer** (30-day free trial, then subscription, or it falls back to consuming your Anthropic plan; OpenRouter/Gemini own-key and a local host provider are opt-ins). Default-path usage means session content flows to their hosted service for compression. For Garrett's data posture, only the host/own-key provider modes are acceptable — that choice has to be made deliberately at install, not discovered later. (Separately: there's a CMEM crypto token the creator has embraced. It doesn't touch the Apache-2.0 code, but it's reputational static around the project.)

**Honest comparison against his current memory system.** His system is curated and provenance-first: `MEMORY.md` claims with sources and supersession chains, daily logs, people/group pages, a nightly alignment synthesis, and search/explain tools that can show where any fact came from and what replaced it. claude-mem is the opposite trade: automatic and lossy.

- **Where it genuinely helps:** the capture gap in the *coding* lanes. Fleet build sessions (Hermes, OpenCode, Claude-class agents working in Sports) are exactly where context evaporates between sessions — what the last session changed, tried, and rejected has to be re-derived or handed off by hand. claude-mem captures that exhaust automatically, per project, with searchable recall. That is a real, recurring cost in his operation and his current system does not cover those harnesses at all.
- **Where it's redundant or worse:** the main personal/operational memory. His curated system is strictly better there — compression flattens corrections (his memory's core feature is that a corrected fact *replaces* the old one, with the chain visible; an AI summary can silently resurrect the stale version), and a second, less auditable memory store creates split-brain risk: two systems disagreeing about what happened, with the less provable one winning by convenience. His doctrine is provenance-is-the-product; claude-mem's summaries are provenance-optional.
- **Net:** a per-harness work log for build lanes — plausible. A replacement or peer for the curated memory — no.

**Smallest first test.** Install on one harness only (OpenCode against the Sports repo), host provider (no hosted observer), run a week of ordinary build sessions, then ask it a real recall question ("what changed in this file last week and why") and grade the answer against the actual commits and handoff notes. Reversible, touches nothing in the main memory system.

---

## 3. obra/superpowers — steal two mechanisms; his skill library is already the stronger system for his work

**Verified facts:** 308,206★, 27,415 forks, MIT, Shell. Created 2025-10-09, pushed 2026-10-23. By Jesse Vincent / Prime Radiant. Distributed through plugin marketplaces for 16+ harnesses (Claude Code official marketplace, Codex, Cursor, Gemini CLI, OpenCode, Hermes, Muse as a native plugin, and more).

**Architecture.** A bootstrap skill (`using-superpowers`) is injected at SessionStart and exists for one purpose: force the agent to check for relevant skills *before any task*. On top of that sits a library of ~16 composable skills in four classes — Testing (test-driven-development), Debugging (systematic-debugging, verification-before-completion, diagnosing-superpowers), Collaboration (brainstorming, writing-plans, executing-plans, dispatching-parallel-agents, requesting/receiving-code-review, using-git-worktrees, finishing-a-development-branch, subagent-driven-development), Meta (writing-skills, using-superpowers). The methodology is a gated pipeline: brainstorm (draw out intent, spec in digestible chunks) → isolated git worktree with a verified clean test baseline → written plan (2–5-minute tasks with exact file paths, complete code, verification steps) → execution (fresh subagent per task with a **two-stage review — spec compliance, then code quality** — or inline execution with one final review) → TDD enforced RED-GREEN-REFACTOR (code written before its test gets deleted) → code-review gates between tasks → branch finishing (merge/PR/keep/discard decision). Unusually, skill *behavior* is regression-tested with an eval harness (superpowers-evals drills). One telemetry note: the visual-companion logo is fetched from their site with the version string (no project data per their statement; opt out via `SUPERPOWERS_DISABLE_TELEMETRY`).

**Benchmark against Garrett's custom skills** (36 local skills in `~/workspace/custom-skills/` plus the system set). Overlap is large: he already runs local-brainstorming, local-writing-plans, local-tdd-workflow, local-systematic-debugging, local-code-reviewer-agent, local-git-commit — the superpowers core loop exists in his library, adapted to his repos and doctrine.

- **What superpowers does that his doesn't:** (1) the enforced bootstrap — his skills fire when the agent or skill search selects them; superpowers makes the check itself mandatory and automatic at session start. (2) Subagent-driven-development as a named default protocol, with the two-stage (spec, then quality) review spelled out. (3) Skill behavior evals — his skills are reviewed as prose; superpowers regression-tests whether the skill actually changes agent behavior. (4) Worktree isolation as a standard pipeline step. (5) One install/update channel across every harness he uses, where he currently maintains per-harness setup by hand.
- **What his does better:** everything domain- and doctrine-specific. local-git-security-guard (credential handling law), local-completion-gap-audit, local-wired-artifact-proof (never claim wired without reading the artifact), local-gse-rating-engines, local-x-poster (voice + gates) — superpowers is generic SDLC and will never carry his safety rules, his engine math, or his publishing gates. His library is an operating system for one specific operation; superpowers is a methodology for software work in general.

**Risks.** Wholesale adoption would collide with his own skills (duplicate triggers, competing plan formats), and its TDD-always stance fits feature builds better than his research/audit-heavy mix. Installing it fleet-wide to find out would cost more than the experiment is worth.

**Smallest first test.** None required to extract the value: pilot the two mechanisms directly — (a) a bootstrap rule in one harness ("check skills before any task" as a standing instruction), (b) the two-stage review pattern on the next Jules-class build task using his existing reviewer skill. If a framework trial is ever wanted, OpenCode on a scratch repo only — never Sports first.

---

## 4. pbakaus/impeccable — a deterministic slop checker that plugs into the workflow he already has

**Verified facts:** 94,804★, 5,592 forks, Apache-2.0, Rust (self-contained engine binary). Created 2025-11-16, pushed today. By Paul Bakaus. It began from Anthropic's frontend-design skill — the same ancestor as Garrett's own local-frontend-design, so this is the operationalized descendant of a tool he already carries.

**What it is.** A design vocabulary for coding agents in three parts:
- **24 commands** in four groups. *Steer:* bolder, quieter, distill, colorize, typeset, layout, animate, delight, overdrive — each loads a playbook for one move against one named target (`/impeccable bolder the pricing cards`). *Review:* `critique` (scored UX review against usability heuristics, fixes ranked) and `audit` (accessibility, performance, theming, responsive — findings P0 blocking to P3 polish). *Finish:* polish, harden, clarify, adapt, optimize, onboard. *Iterate/setup:* live, generate, shape, init, document, extract.
- **Per-project context files.** `/impeccable init` reads the codebase, asks only what it can't infer (audience, purpose, constraints), and writes `PRODUCT.md`; `/impeccable document` captures the existing visual system into `DESIGN.md`. Every later command reads both — so verdicts are against *the project's* brand, not generic taste.
- **A deterministic slop detector:** 62 rules, **no LLM, no API key**, naming the exact tells (Inter-for-everything, purple-to-blue gradients, cards nested in cards, gray text on colored backgrounds, skipped headings, cramped padding). Three ways to run it: an **agent hook** that scans every UI file as the agent edits and returns findings before the work is called done (Claude Code, Cursor, Codex, Copilot, Grok Build, Hermes); a **CLI** (`npx impeccable detect <dir|url> --json`; exit code 2 = findings; GitHub Actions annotation mode; rendered-page rules like contrast need a URL target); and a Chrome extension overlay for any live page. Live mode (pick an element in the browser, cycle variants, accept → written to source) supports Vite/Next/SvelteKit/Astro/Nuxt/HTML.

**How it plugs in / fit.** Install is `npx impeccable install` (detects your tools, offers the hook; per-tool plugin installs exist, including Muse and Hermes). For GSE web: the board and picks surfaces are exactly where "generic AI look" is his standing complaint class — the hook form catches it at edit time instead of at his review, and `audit` gives the board a repeatable P0–P3 quality gate. For Kit: the $350 one-page deliverables get a uniform pre-delivery bar — per-client `PRODUCT.md`/`DESIGN.md` pairs map directly onto his client-intake and brand-guideline skills, and `critique` on a finished page is a deliverable-quality receipt. It composes with local-frontend-design rather than replacing it: his skill sets direction, impeccable enforces mechanically.

**Risks.** The README's own warning: in Claude Code, installed hooks run outside model approval, and the first edit can download the engine — review hooks before unattended runs. Telemetry: starting a design fetches visual directions from their catalog and records which was picked (project name/code never sent, per their privacy page; disableable). Live mode is local-checkout only — never point it at a deployed site.

**Smallest first test.** The CLI alone, no install into any repo and no hook: `npx impeccable detect --json` over the Sports web source, plus one `critique` of the board page. Compare findings against his known frontend complaints. One command class, zero commitment.

---

## 5. CopilotKit/OpenBot — his gate doctrine as someone else's product (lighter pass)

**Verified facts:** 7,937★, 1,037 forks, MIT, TypeScript. Created 2026-08-17, pushed today. Status: **beta**, and explicitly "a template, not a product" — no hosted version, nothing published as a package; you clone it, replace the example tenant with your own coworkers/channels/skills, and run it yourself. Stack: Docker Compose, PostgreSQL, Bun 1.4+, plus a CopilotKit Intelligence project/license (free developer plan exists; Intelligence can be self-hosted) and your own model key.

**What it is.** Self-hosted AI coworkers that each get a computer of their own: a container with its own Chromium, logins, and `/workspace` volume (optionally under gVisor), a shell, files, and governed MCP access. The core is a **single gateway: every tool call is resolved against a server-held snapshot, decided against policy, written as an audit row, and only then executed — or refused, with the rule named.** There is no path that acts without the record existing first. Around that: per-bot and team approval settings (`/bots/:id/approvals`, `/admin/approvals`), an audit UI listing permitted/refused/failed actions, a **take-the-wheel** handoff (bot hits a login wall or 2FA → asks for help → human drives in the same panel, recorded as `computer.help_requested / control_taken / control_released`; bot actions are refused while a human drives), and secrets hygiene (audit records *that* a secret was requested and its length, never its content; credentials encrypted at rest, never returned by API). Bots are any AG-UI-protocol endpoint — LangGraph, Mastra, CrewAI, Pydantic AI, Google ADK, hand-written — so the governance rides the protocol, not the framework. One caution from their own README: a fresh clone defaults to `OPENBOT_SINGLE_USER=true` (every request admitted as admin) and must be locked down before anyone else can reach the deployment.

**Relevance to Garrett's fleet governance.** This is his decide-before/record-after doctrine — approval gates up front, ACTION_LOG behind — productized by the vendor behind his Dots layer (CopilotKit Intelligence is the same dependency his OpenDots sits on, and the one whose realtime egress currently blocks his Dots verdict lane). Honest assessment: adopting OpenBot wholesale would mean swapping his MCP fleet bus + orchestration board for a heavier Docker/Postgres stack and deepening the Intelligence dependency that is already a blocker — a bad trade today. The real value is as a **design reference**: the gateway choke point (one place where every fleet action is policy-checked and audit-rowed *before* execution, refusals naming the rule) is a pattern his own bus could grow natively, and their approvals/audit UX is a worked example of his gate doctrine at product quality. WATCH, not a test candidate this window.

**Smallest first step (if any).** Paper only: map his fleet's action classes against OpenBot's gateway policy model and note what his bus lacks. No clone, no run.

---

## 6. secemp9/arxiv-complete (near-miss) — a local arXiv, with honest limits

**Verified from the dataset's own README** (HF API: 168,756 downloads, 751 likes, not gated, Parquet):

- **What it is:** a one-off snapshot of arXiv. Metadata harvested 2026-08-30 via arXiv's OAI-PMH `arXivRaw` interface; file mirror taken 2026-09-05. **3,148,796 papers**, submissions from 1986 to 2026-08-27; a PDF is held for 99.47% of papers.
- **Format — nine configs, wildly different sizes:** `sample` (991 papers, 26 MB), `metadata` (3.15M rows, 1.6 GB), `versions` (5.03M rows, 269 MB), `files` (54.6M file-index rows with SHA-256 digests, no content, 2.4 GB), `paper_text` (resolved TeX text for 2,856,227 papers — 90.7% — **70 GB**), `latex` (12.3M TeX files, 0.16 TB), `source` (47.4M submission files, 6.51 TB), `pdf` (4.97M objects, 8.65 TB), `ps` (0.68 TB). **All nine total 16.08 TB** — an unfiltered download is a trap; the dataset's own docs steer you to per-config selection or remote SQL over the Parquet (`hf://` paths, row-group pruning). The three index configs together are 4.35 GB.
- **Coverage gaps, documented by the author:** 21,191 retrievable versions hold no artifact; `paper_text` retains raw LaTeX syntax, comments, and macros, includes withdrawal stubs and some mis-selected templates (needs filtering before corpus use); source packages are unversioned, so a paper's newest held PDF can lag its newest arXiv version.
- **License/terms:** "other" — **mixed per-paper arXiv author licenses**. The compilation's CC0 dedication explicitly does *not* extend to the papers (see the dataset's LICENSE). Internal research reading sits in the same posture as reading from arXiv directly; the dataset confers no additional rights over the papers themselves.

**What ingesting it would do for the NGS/arXiv program (579/750 verified, 171 to go):**
- **It gives:** (a) instant local full text for any candidate — the per-paper fetch step and arXiv rate limits disappear; (b) a queryable candidate pool (all of arXiv metadata + text) for screening the remaining 171 and the discretionary extra 250, by category, date, and content; (c) stronger provenance mechanics — the exact text read can be a local file whose SHA-256 sits in the `files` index.
- **It does not give:** a single verified paper. His standard — full read in depth (method, math, datasets, GSE application, implementation spec), a REJECT never counts — is earned paper by paper, and a corpus dump changes the *logistics* of reading, not the reading. It also freezes at Aug/Sep 2026: anything submitted after the snapshot still comes from arXiv live, and it does nothing for the NGS half of the program.
- **Practical shape:** pull `metadata` + `versions` + `files` (4.35 GB) now; hold `paper_text` (70 GB) until this VM's free-disk posture is confirmed (UNVERIFIED here) or query it remotely per paper.

**Smallest first test.** Load the 26 MB `sample` config and the `metadata` config; spot-check five papers the program has already verified — confirm the local text matches what was read from arXiv — then run one remaining-candidate category screen against it. If the spot check passes, the ingest earns its place as the program's local mirror.

---

## Closing ranking — what earns an actual test first

1. **cloudflare/security-audit-skill** — the only item tied to a live, dated obligation. The rotation sitting is open, 59 gitleaks findings sit untriaged, and this is precisely a triage-and-verify machine for them: scoped quick run, MIT, output outside the repo, verdicts instead of vibes. Highest leverage per hour by a wide margin.
2. **pbakaus/impeccable (detector CLI only)** — one read-only command against the Sports web source buys immediate signal on a standing pain (generic-AI look) with zero install commitment and a natural second home in Kit's delivery QA.
3. **secemp9/arxiv-complete (index configs)** — 4.35 GB accelerates a standing 171-paper backlog and hardens provenance; the test is a sample load plus a five-paper spot check.
4. **thedotmack/claude-mem** — a real problem (build-lane session amnesia), but the honest test is a week-long single-harness pilot with the data-flow choice (host provider only) made deliberately. Not a today test.
5. **obra/superpowers** — no test needed; the value is two mechanisms (enforced bootstrap, two-stage review) that transplant into his existing skills today.
6. **CopilotKit/OpenBot** — design reference only. Beta, template-grade, heavy stack, and it deepens the one vendor dependency already blocking his Dots lane.

---

# PART 10 — X KEYWORD EXPLORE, VERIFIED TRIAGE

# X keyword-explore triage — 2026-10-29 (verification pass, ~12:10–12:40 PM CT)

Source: `raw/2026-10-29-explore-candidates.md` (26 terms searched by the browser lane). URL-verified items were checked at primary sources where possible. Sweep-note items (no post URL captured) keep that label throughout. Nothing installed, nothing run, no X engagement. Claims not confirmed at a primary source are labeled UNVERIFIED.

## Section 1 — Tech repos/tools, primary-source verified

### feuersteiner/bref-ui — NOTE
Exists: 92★, 2 forks, MIT, created Feb 2025, pushed 2026-10-29 (active today). Mechanism: a Svelte 5 component library with scoped CSS and own-the-source distribution — the repo's own description says "for customizable websites and apps"; the post's "component library for coding agents" framing is the poster's spin, not the repo's. System touched: web surfaces — but GSE's Sports app is TypeScript/Next, so Svelte components do not drop in; Kit client one-pagers could use it if a Svelte stack were ever chosen. Too small and off-stack to flag.

### SoMarkAI/OXR — FLAG (#6)
Exists: 2,402★, 168 forks, created Oct 5, 2026, pushed Oct 24. License: NOASSERTION (no standard license detected — a fence to read before any use). Mechanism: an open-source document-parsing model (OCR/document-to-structured-text class) post-trained with an "RSI loop," claiming SOTA accuracy/speed (creator claim, UNVERIFIED). The post's "1.3B, open weights, free API" specifics were not confirmed at the repo level — UNVERIFIED. System touched: his document-ingestion lane (converters that process untrusted documents) — the same lane this morning's malicious-pdf find tests from the defense side. A strong local parser would feed corpus/research ingestion; the license question is the first thing a deep dive must settle.

### SuperPlane (superplanehq/superplane) — FLAG (#3)
Exists: 8,383★, pushed 2026-10-29 (today), license NOASSERTION on the repo listing. The post's "8.2k stars, v1.0, open-source software factory" claim checks out on the star count (8,383) — the highest-confidence resolution in this batch. Mechanism per repo description: an open-source factory for one-shot engineering — describe the work, the factory runs the build pipeline. System touched: agent fleet build orchestration — the same problem class as his Jules/OpenCode session management. Whether it composes with his merge-gate doctrine (2-agent review) is the deep-dive question.

### safemcp (from @themuscleai's post) — FLAG (#4), with an ambiguity warning
Name search returns a field of same-name repos, none established: keven-cyber/SafeMCP (9★, stale Apr 2025), wlc2424762917/SafeMCP (5★), openshieldai/safe-mcp-manager (2★), Danuka97/safemcp (0★), and 0x1903/safemcp (1★, MIT, pushed Oct 28, 2026 — yesterday) whose description matches the post's pitch almost exactly: "Is your AI agent setup safe? One command scans your MCP servers (Claude, Cursor, VS Code, …)". The post's "0.5.0" version string could not be tied to any of these at primary source — the exact repo behind the post stays UNRESOLVED, and the same-name crowd is itself a supply-chain hazard (a tired install command could pull the wrong one). System touched: fleet MCP bus security — his fleet runs a live MCP server and third-party MCP servers are a real attack surface; today's GitHub trending #1 was also an agent security-audit skill, so this theme is converging. Flagged for the concept and the disambiguation work, not for the 1-star repo's maturity.

### Magnemo — "The Memory MCP" (Magnemo-AI/MAGNEMO) — FLAG (#1)
Exists on both surfaces checked: magnemo.ai (fetched in full) and GitHub Magnemo-AI/MAGNEMO — 4★, 2 forks, Apache-2.0, created Sep 16, 2026, pushed today. Mechanism: a local MCP memory server storing agent memory as plain files on your own machine; the one hard rule is governance — an agent can only write drafts, nothing becomes memory until a human approves it, and every entry carries who wrote it, when, and who approved it (a receipt per entry). Install: `pip install magnemo`, `magnemo init`, `magnemo mount` (writes `.mcp.json`); Python 3.11+; tested with Claude Code, config snippets for the other major agent CLIs. System touched: the agent fleet's memory layer — cross-session memory is his fleet's known weak spot (a persistent-memory tool, claude-mem, also trended today), and Magnemo's approve-before-it's-remembered design is his own memory doctrine (claims with provenance and receipts) implemented as a product. Tiny and new (4 stars), so the design is the find, not the adoption.

### AgentScout (agentscouthq.com) — NOTE
The site is real and was fetched in full — but it is not what the post said. It is a directory: 2,060 AI agent tools and 274 MCP servers tracked across 40 categories, with daily link checks and free listing (paid fast-track/featured tiers exist and are labeled). The post's "189 installable bot templates" does not match the site's own description of itself — no template library is offered; treat the 189 figure as UNVERIFIED and the "templates" framing as wrong. Value to Garrett: a discovery index his sweep lanes can mine (it even lists new tools daily), not a tool. NOTE.

### Hermit (Infini-AI-Lab/hermit) — NOTE
Exists: Infini-AI-Lab/hermit, 350★ (repo description empty on the listing). The post's mechanism claim — a framework for geometric representation editing in LLM agents — is consistent with the lab's other work (the org's catalog is representation/embedding research: activation patching, latent reasoning, forensic watermark detection). The "<0.1% compute overhead" figure and the Terminal-Bench gains could not be confirmed at a primary source in this pass — UNVERIFIED. System touched: none directly today; it is research-lab output, relevant to the arXiv program's agent-reasoning shelf rather than the fleet. NOTE.

### Cooper MCP (mcp.cooperaiq.com) — NOTE
Real and exactly as posted: a free, no-auth, read-only remote MCP server for software research. It serves Cooper's published rankings of software products (Best / Most Affordable / Easiest to Set Up / Rising), where the ranking input is measured AI-assistant recommendations ("AIQ"), with cited source pages, dated snapshots, and history across editions. Eight tools (search_catalog, get_rankings, compare_products, get_evidence, get_history, get_methodology, etc.). Limits: 30 requests/minute, 1,000/day per network identity. Honest self-disclosure on the page: rankings measure what assistants recommend, not product quality or live prices, and query text is logged (redacted) for up to 30 days — so nothing confidential goes through it. System touched: Kit/client work and ARE vendor selection — a free second opinion when choosing software for a client build. Useful utility, not a frontier item. NOTE.

## Section 2 — Sports-method triage (headline level)

### @LineOfEvidence_ Sim Lab (lineofevidence.com/sims) — FLAG (#2)
Verified live and as described: a browser Monte Carlo lab running 10,000 play-by-play simulations per game from nflverse data (the page states 18,738 plays of 2026 pbp through Week 7), with 8 user-controlled filters ("recipes"), spread/total testing against market lines, and a published box-score baseline beside every sim. The CAR–GB divergence from the sweep note is on the page right now: the public box-score baseline makes Green Bay a 59% winner, while the play-by-play sim with filters active flips it to Carolina 58.1% — and the site shows its work, naming three "fault lines" (early-down EPA splits, turnover-luck vs non-turnover EPA, scheme/injury) with the exact pbp splits behind each swing. Why it matters: this is Garrett's doctrine running in public — matchup and play-by-play reasoning first, the market shown only as the line the sim is priced against — and the fault-line format is a glass-box reasoning trail of the kind GSE's own board is supposed to publish. Deep dive: reproduce one fault line from nflverse (he has the warehouse) and compare the sim's construction to GSE's own Dixon-Coles/normal-margin machinery.

### @WhiteBison11 Monte Carlo props + published calibration — FLAG (#5)
Sweep-note item (no post URL; his own page was not fetched in this pass — the calibration tab and the 55/45 split stay as described-but-UNVERIFIED). As described: 10,000 sims per player prop, with the final number anchored 55% to the model and 45% to the devigged market, and — the part worth respecting — a published calibration tab grading his own numbers. The honest doctrine comparison Garrett asked for: publishing calibration is exactly the honesty standard GSE holds itself to, and almost nobody in the public props space does it. But a 55/45 anchor means the market is nearly half the published number by construction; under books-last, the market's only job is pricing a play the reasoning already made, never blending into the probability itself. A GSE number built that way would be a market echo with a model accent. Deep dive: read the calibration tab's actual track record and whether the anchor weight is fixed or fitted — that decides whether this is a method to learn from or a cautionary example.

### @WalrusQuant distribution-choice piece (bayesratings.com) — NOTE
The site is verified live: bayesRatings publishes Bayesian ratings and forecasts across NFL, NBA, and NHL with model picks and win probabilities. The specific piece from the sweep note — Poisson vs negative binomial, and how distribution choice decides what a simulation concludes — was not fetched, so its claims stay at sweep-note level. The underlying point is sound and already load-bearing in Garrett's stack (his Dixon-Coles work is precisely a distribution-choice argument), so this is confirmation of a principle he already runs, not new information. NOTE.

### @gatadata88 win-probability methodology — NOTE
Sweep-note item. As described: win probability built from pregame team ratings plus home-field advantage, blended with Q4 score state, published back to 2002, positioned against ESPN's WP. The account's own methodology page was not located in this pass (the construction matches the standard published class — the ratings+HFA prior blended into in-game state is the textbook approach, e.g. the Bayesian WP literature), so the account-specific claims stay UNVERIFIED. The transferable idea, if the deep dive confirms the back-to-2002 series exists: a two-decade WP reference set built from ratings rather than market lines would be a market-free benchmark for GSE's own WP reasoning. NOTE, deep-diveable later.

### NVIDIA / LaLiga / Stats Perform TV-footage item — NOTE, with a correction
Partially verified, and the sweep note's framing needs correcting. What is actually announced (Oct 6, 2026, at IBC Amsterdam): NVIDIA expanded its sports-tech ecosystem with AI media and pose-estimation products — 3D Body Pose (single-camera athlete tracking), Video Frame Generation, TrueHDR — built for co-development with partners that include Stats Perform and Hawk-Eye. The LaLiga–Stats Perform relationship in the record is a data/streaming rights deal from 2022 (through 2028), not a new dataset announcement. So: "NVIDIA is productizing tracking-from-broadcast-footage with Stats Perform as a partner" is verified; "an in-depth sports dataset generated from regular TV footage" as a specific released dataset is UNVERIFIED. Why it still matters: pose estimation from ordinary broadcast video is the direction that eventually commoditizes tracking data — the input class GSE's engine currently can't get (compare this morning's Catchable Ball Rate finding: charted/tracking data is the one input family the engine can't synthesize). NOTE as a horizon item.

### Paydirt + the VSiN model survey — NOTE (competitive landscape)
VSiN's side is verified as a standing format: VSiN runs model-comparison coverage (Makinen's ratings and the TSI vs TeamRankings vs FPI vs Sagarin projections, published as "model disagreement" articles) and a weekly Analytics Report built on splits, ratings, and trends. Paydirt, the "modernized model, free for now" from the sweep note, did not surface in search — UNVERIFIED, no verdict beyond the note. The landscape read for GSE's public positioning: the "compare the public models against each other" seat is already occupied by a network with distribution, and every occupant competes on the same axis — whose number is closest to the market. None of them publishes a reasoning trail. GSE's stated differentiation (the reasoning is the product, books last) is genuinely unoccupied in this set — which is positioning information, not a tool find. NOTE.

## FLAG FOR DEEP DIVE — ranked (max 6)

1. **Magnemo (Magnemo-AI/MAGNEMO)** — governed agent memory (draft→approve, receipt per entry) aimed at the fleet's known weak spot; the design is Garrett's memory doctrine as a product.
2. **LineOfEvidence Sim Lab** — verified glass-box pbp simulator; the CAR–GB box-score-vs-pbp divergence is his matchup-first doctrine running in public, reproducible from his own nflverse warehouse.
3. **SuperPlane (superplanehq/superplane, 8,383★)** — the "software factory" claim verified at primary source; direct read on his fleet build-orchestration problem.
4. **safemcp (exact repo UNRESOLVED)** — MCP-config security scanning for a fleet that runs an MCP bus; the same-name repo crowd must be disambiguated before anything is trusted.
5. **WhiteBison props calibration** — published self-grading is the honesty standard worth studying; the 55/45 market anchor is the doctrine fault line to examine with real numbers.
6. **SoMarkAI/OXR** — open document-parsing model for the ingestion lane (pairs with this morning's malicious-pdf input-defense find); license (NOASSERTION) is the first question.

## Failed to resolve / unverified register
- safemcp: exact repo behind the post unresolved (5 same-name candidates; 0x1903/safemcp matches the pitch and is 1 day old, 1★).
- AgentScout "189 installable bot templates": contradicted by the site's own description (a 2,060-tool directory) — claim not carried forward.
- Hermit "<0.1% overhead" + Terminal-Bench gains: UNVERIFIED (no primary source read).
- OXR "1.3B / free API": UNVERIFIED at repo level; license NOASSERTION.
- WhiteBison calibration tab + 55/45 anchor: sweep-note level, his page not fetched.
- gatadata88 back-to-2002 WP series: account methodology not located; UNVERIFIED.
- NVIDIA/LaLiga "TV-footage dataset": corrected — verified announcement is NVIDIA's IBC pose/media suite with Stats Perform as partner; dataset-as-described UNVERIFIED.
- Paydirt model: not surfaced in search; UNVERIFIED.
- All model records/win-rate claims in the source posts: UNVERIFIED, none repeated as fact here.

---

# PART 11 — INSTAGRAM KEYWORD EXPLORE, VERIFIED TRIAGE


# IG Keyword-Explore Triage — 2026-10-29 (midday window, closes 12:43 PM CT)

Source list: `~/workspace/ig-for-you-sweep/raw/2026-10-29-explore-candidates.md` (24 candidates from 24 search terms).
Rules honored: read-only throughout; nothing installed or run; no Instagram engagement/outreach; every unverified claim stays labeled.

---

## 1. codebase-memory-mcp — **FLAG**

**Repo resolved:** `DeusData/codebase-memory-mcp` — 47,781★, 3,929 forks, **MIT**. Created 2026-02-24; last push **2026-10-29** (active today). Native C backend.

**What it actually does.** A local code-intelligence layer for AI agents. It parses 162 languages (vendored tree-sitter grammars) into a **persistent knowledge graph** of the codebase — symbols, call chains, dependencies, docs, infrastructure — and serves it through **17 MCP tools**: hybrid search (SQLite FTS5 BM25 + bundled Nomic `nomic-embed-code` embeddings compiled into the binary — no API key, no Ollama, no Docker), callers/dependencies, file outlines, semantic search, and change-aware test selection ("CBM Lens"). Results are deliberately compact and paged. Indexing and querying run fully local; no hosted service. The installer auto-configures 45 agent clients (Claude Code, Cursor, etc.).

**What the "99% token cut" rests on.** The IG caption ("cuts token usage by 99%") cherry-picks the project's oldest, narrowest number:
- The project's **31-repository arXiv preprint** (arXiv:2603.27277, March 2026), cited in the current README, reports **10× lower token use and 2.1× fewer tool calls** vs file-by-file exploration, on the study's workloads.
- The ~99% figure matches an earlier five-query comparison in an old README revision: ~3,400 vs ~412,000 tokens on five **structural** queries (≈99.2% — on those five queries only).
- They also ship a `docs/MEASURING_SAVINGS.md` guide so users can measure on their own workload — good evidence hygiene.

So: the effect is real and unusually well-documented for this category; the defensible headline is **10×**, not 99%.

**Honest comparison vs Garrett's existing options.**
- **claude-mem** (today's trending deep dive): session/episodic memory — what agents did and learned across sessions. Different layer; complementary, not competing.
- **graphify** (today's X-sweep TEST candidate): builds a knowledge graph over code/docs for querying — the closest overlap. CBM's edges over it: MCP-native persistent *incremental* graph, local embeddings with zero external dependency, change-aware test selection, and a published preprint + measurement guide (stronger evidence discipline).
- **Risks:** young project (Feb 2026), single vendor org, a large C binary is a supply-chain trust decision, and graph freshness/index size on the Sports monorepo is untested.

**Verdict: FLAG** — the strongest code-context candidate of the day. Bounded trial shape when Garrett wants it: index one repo (Sports web app), run 5 structural questions through CBM vs the current grep/read workflow, compare tokens with their measuring guide. Not installed or run in this window (per rules).

---

## 2. thelocktalk anytime-TD splits — numbers hold (convention-dependent)

**Method.** nflverse play-by-play (official GitHub release CSVs), **regular season only**, touchdown plays only (`touchdown=1`, two-point attempts excluded), field position = `yardline_100` (yards from the opponent's end zone) at the snap. Work dir: `~/workspace/x-for-you-sweep/raw/repro-anytime-td/`.

**Scope honesty:** the claim covers 2010–2025 (16 seasons). Inside this window I computed **3 sample seasons — 2012, 2018, 2024** (1,377 rushing TDs, 2,596 passing TDs pooled). The full 16-season aggregation was **NOT COMPUTED**. Because "inside the N" is ambiguous, both readings are reported: inclusive (spotted at the N or closer, ≤N) and strict (spotted strictly inside, <N).

| Claim (since 2010) | Pooled sample, inclusive ≤N | Pooled sample, strict <N | Per-season range (inclusive) | Verdict |
|---|---|---|---|---|
| 74% of rushing TDs from inside the 10 | 75.2% | 72.9% | 73.0–76.4% | **CLOSE** — claim sits between the two conventions |
| 57% of rushing TDs from inside the 5 | 60.9% | 56.1% | 60.1–61.9% | **REPRODUCED** under the strict reading (56.1 vs 57); inclusive runs ~4 pts hot |
| 33% of rushing TDs from the 1-yard line | 33.1% | 33.1% | 31.8–34.5% | **REPRODUCED** |
| 22% of passing TDs from inside the 5 | 25.7% | 20.7% | 24.4–27.5% | **CLOSE** — strict reading is 1.3 pts under the claim |

**Bottom line:** the post's splits are real under the strict "spotted inside the N" convention and bracketed by the two conventions overall — nothing is contradicted. The method point underneath (rushing TDs are goal-line events — ~56–61% from inside the 5; passing TDs are not — ~21–26%) is fully supported by the data. Season-to-season stability is high (ranges above), so the 3-season sample is unlikely to flip on the full pull; the full 2010–2025 run remains the closing step.

---

## 3. Kimi K3.1 Pro claims (ohmo.ai caption) — checked against Moonshot official sources only

Official anchors: kimi.com's homepage currently leads with the K3.1 Pro launch; Moonshot's HF org (`moonshotai`) lists **Kimi-K3** weights (updated Sep 2) but **no K3.1 Pro repo as of Oct 29** — consistent with a pending weights drop. All four numbers trace to Moonshot's Oct 23, 2026 launch materials.

| Caption claim | Verdict | Basis |
|---|---|---|
| Full weights due Nov 4 | **CONFIRMED as Moonshot's announced commitment** — not yet fulfilled | Stated in Moonshot's launch; no K3.1 Pro weights on the official HF org as of Oct 29. Note: at 2.8T total parameters, self-hosting is not realistic on Garrett's hardware either way — the practical Kimi lane stays API/hosted, unchanged. |
| 65.7% Terminal-Bench 4.0 | **CONFIRMED as Moonshot's published figure; independently UNVERIFIED** | Moonshot's number (vs Opus 5.5 66.4%, GPT-6 Astra 58.2%). Moonshot ran its own model inside the Claude Code harness and took rival scores from leaderboards/reports. Artificial Analysis independently scores K3.1 Pro 55 on its Intelligence Index (4th overall) — corroborates "frontier-tier," does not replicate 65.7. |
| 1M-token context | **CONFIRMED** | Official spec: 1,048,576 tokens, native. |
| Hallucinations 23.4% → 8.3% | **CONFIRMED as Moonshot's claim; methodology in-house, independently UNVERIFIED** | Moonshot's own hardest internal factual test, claim-level error rates, K3 → K3.1 Pro. Direction plausible; exact numbers are vendor numbers. |

---

## 4. Quick verifications

- **Onyx platform:** Real — `onyx-dot-app/onyx`, **33,077★** (the caption's "28k" is stale; it has grown past it), pushed 2026-10-29, "Open Source AI Platform — AI Chat that works with every LLM," 50+ connectors consistent with the caption. One correction: the license is **not** a clean MIT — GitHub reports NOASSERTION (mixed licensing: open-source core plus separately licensed enterprise parts), so the caption's flat "MIT" is only partly accurate.
- **Saluki 27B:** Exists — `ConwayResearch/Underdog-Saluki-27B-1.0` on Hugging Face (629,102 downloads) plus multiple community GGUF quantizations (the "<8GB" local angle); a community release built on Qwen 3.8 27B as captioned, not a major-lab model.
- **OpenBot (IG explainer, simplifyinai Sep 2):** **No new facts** beyond today's trending deep dive (`~/workspace/trending-scan/2026-10-29-deep-dive.md` §5). The IG framing ("free, 100% open-source Grok-bot alternative; AI coworkers each with own browser/files/logins") matches the verified CopilotKit/OpenBot dossier (7,937★, MIT, beta template; per-coworker container with own Chromium, logins, workspace; single policy gateway that audit-rows every action before execution). The explainer adds no mechanism, number, or capability the dossier doesn't already cover. Delta: none.

---

## 5. Content notes

**thelocktalk nflverse methodology post → Garrett's doctrine, mapped:**
- **Data Map** = his ingestion-first doctrine: know every field and its provenance before modeling — and nflverse (pbp since 1999, EP per snap, rosters, snaps, injuries) is literally his data spine.
- **Baseline, dumbest version first** = measured-over-guessed: a naive baseline must exist before any model claims edge, and all lift is reported against it.
- **Leak Check ("where your model is secretly seeing the future")** = his no-lookahead discipline in the weekly cycle: features must be knowable before kickoff; a model that peeks is the exact failure his gate audits exist to catch.
- Net: a public creator teaching his three core hygiene rules in plain language — a useful content benchmark for GSE explainers.

**NGS program tracker line (2026-10-29):** NGS's official account announced 2026-season metric additions — **Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0** (@nextgenstats, Sep 8) — classification-type features; add to the NGS inventory/glossary, relevant to the engine's OL/scheme matchup track.

---

## Gap audit (what was NOT done)
- Anytime-TD: full 2010–2025 aggregation NOT COMPUTED (3 of 16 seasons sampled; playoffs excluded by design).
- codebase-memory-mcp: not installed/run (per rules) — token figures rest on the project's own preprint and old-README comparison, not our measurement.
- Kimi K3.1 Pro: no independent benchmark replication exists yet anywhere; weights-drop fulfillment check belongs on/after Nov 4.
- Explore candidates outside the assigned five items were not individually verified in this pass.
