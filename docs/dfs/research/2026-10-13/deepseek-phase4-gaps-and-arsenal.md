# OPERATION FULL-COURT PRESS — PHASE IV: FIND THE GAPS, BUILD THE ARSENAL
## Self-critique everything. Then arm the operation with real code.

**Role:** You are the director of a 500-agent parallel research and systems-design operation. All lanes run simultaneously. Phases I–III mapped the territory, read the algorithm source, and specified the machine. Phase IV does two things your earlier phases did not: (1) it audits YOUR OWN prior output for gaps, blind spots, and shallow work, and (2) it finds the actual open-source weaponry — 20 repositories — evaluated for real, with integration specs.

**Who this is for:** Same operator. @GalaxySportsHQ on X, expanding to TikTok, YouTube Shorts, Instagram Reels. NFL-first. Real game footage, commentary-led, transformative clips (2–4 seconds per clip, telestrated, voiceover dominant). The operator has a VM, live browser, video tooling, and builds software. Everything you produce must be executable or buildable.

---

## THE QUALITY BAR (READ THIS FIRST — IT GOVERNS EVERYTHING)

The operator's standard is A+++++ or nothing. Operationally, that means:

1. **No placeholders.** No "TODO," no "insert URL here," no "requires manual discovery" without the discovery actually being done or a precise procedure given. If you cannot complete something, say exactly what you tried and what the operator must do — in concrete steps.
2. **Read the code, not the README.** For every repository: clone-level evaluation. What it actually does, code quality, maintenance status (last commit date), open issue count and severity, license and what the license permits commercially, dependencies and their weight. A repo you evaluated from its README summary alone is a failed evaluation.
3. **Every claim classified:** VERIFIED (primary source) / REPORTED (reputable secondary) / UNVERIFIED (inference — show reasoning). The citation integrity protocol from prior phases stands. A fabricated URL, statistic, or repo voids the lane.
4. **Contradict yourself honestly.** If Phase IV findings contradict Phase I–III, say so explicitly and explain which is right and why. Protecting earlier output is failure.
5. **Recency:** prefer sources from the last 12 months; stamp every source with publication and retrieval dates.

---

## PART A — THE GAP AUDIT (TURN YOUR WEAPONS ON YOUR OWN WORK)

Before finding anything new, audit Phases I–III. The operator's own verification already found these cracks — start here and go deeper:

1. **The cold-start contradiction.** Phase III said no cold-start boost exists in the X code; the operator read the xai-org/x-algorithm README himself and found it lists a "new-author boost" in RankingScorer. Resolve this definitively: read the actual primary source (xai-org/x-algorithm, not a community toolkit), find the new-author boost in code, and report exactly what it does, how long it lasts, and how to exploit it.
2. **The frequency contradiction.** Phase III's 30-day playbook says post 3–5×/day on X; Phase III's own findings (creator diversity cap, repeated-author decay in the code) argue for 1–2/day. Resolve it: what is the actual optimal posting frequency per platform, with the mechanism explained?
3. **Generous VERIFIED tags.** The 70% completion/VVSA thresholds are practitioner-reported, not platform-confirmed. Re-audit every VERIFIED tag in Phase III and downgrade where the evidence doesn't support it.
4. **The footage-acquisition gap — THIS ONE IS LIVE.** The operator is RIGHT NOW failing to download NFL footage from an official team site from a datacenter VM (connection failures, likely bot mitigation). Phases II–III assumed yt-dlp just works. Research: which footage sources actually work from a datacenter IP (chiefs.com, nfl.com, YouTube, others)? What bot mitigation do they use? Does the nflplusreplay extractor require an NFL+ subscription? What are the working authentication paths? What are the fallback sources when the primary is blocked? This is the highest-priority gap — the whole video operation depends on it.
5. **The missing corpus.** Phase III admitted it could not assemble the 100-video viral corpus without live platform access. Either assemble a real corpus now (with URLs, view counts, dates) or specify the exact procedure and tooling for the operator to build it in under 2 hours.
6. **Unverified surveillance tiers.** Tier 3 (faceless clip accounts) and Tier 4 (emerging threats) were never actually identified. Identify them for real: 10 accounts each, with URLs and why each was selected.
7. **The Texas problem.** Phase III's betting-affiliate math ignored that DraftKings/FanDuel don't operate in Texas, where the operator and much of his audience live. Redo the affiliate revenue math for a Texas-heavy audience. Which affiliate programs accept Texas traffic and pay on it?
8. **Surveillance cost math.** The $300/month X API surveillance estimate had a garbled formula. Redo it cleanly, then design the $0/month version (what do we lose, what do we keep).
9. **What did we not even ask?** List the 10 most important questions Phases I–III never asked, rank them by leverage, and answer the top 5.

---

## PART B — THE ARSENAL: 20 REPOSITORIES, EVALUATED FOR REAL

Find **20 open-source repositories** relevant to this operation. Spread them across these categories (minimum 2 per category):

- **A. Footage acquisition:** downloaders, stream capturers, replay-buffer tools, sports-site scrapers
- **B. Video analysis & telestration:** sports video analysis, player tracking, annotation/telestration tools
- **C. Automated video editing:** programmatic editing, captioning, vertical-format conversion, voiceover/speech tools
- **D. Social publishing & automation:** multi-platform publishers, schedulers, API wrappers (post-first, analytics-second)
- **E. Sports data:** NFL play-by-play feeds, odds data, stats APIs and clients
- **F. Algorithm & growth research:** social-algorithm analysis toolkits, virality research, audience analytics
- **G. Pipeline & infrastructure:** workflow orchestration, media processing pipelines, monitoring

For EACH repository, deliver:

1. URL, name, one-line description
2. **Evaluation:** stars, last commit date, maintainer responsiveness (open issues/PRs), license + commercial-use implications, language, key dependencies
3. **Quality verdict:** A/B/C grade with justification — would you bet the operation on this code?
4. **How we use it:** the exact role it plays in our pipeline (which lane, which step)
5. **Integration spec:** concrete steps to integrate it into the operator's VM workflow — install, configure, first working command
6. **Improve/build opportunity:** what is missing from it that we should build, fork, or contribute — the gap WE fill

Do not list repos from memory. Verify each one exists, is maintained, and does what you claim. Dead repos (no commits in 18+ months) may only appear if no maintained alternative exists, and must be flagged.

---

## PART C — INTEGRATION BLUEPRINT

1. From the 20, select the **5 highest-leverage** repos and write full integration blueprints: how each wires into the 60-second pipeline or the surveillance system from Phase III, with exact commands and config.
2. Identify **3 things we should BUILD ourselves** because no repo does them well (with build specs: language, architecture, interfaces, effort estimate).
3. Identify **2 repos worth forking** and improving (what we'd change and why).
4. Produce the **revised software stack**: the single definitive list of tools/repos for the operation after Phase IV, replacing anything Phase III specified that Part A or B superseded.

---

## OUTPUT FORMAT (STRICT)

1. **Gap audit report:** every crack found in Phases I–III, each with severity (critical/major/minor), the correct answer where determinable, and what remains unresolved.
2. **The 10 unasked questions**, ranked, top 5 answered.
3. **20 repository dossiers**, each with the 6 evaluation fields above. No exceptions, no short entries.
4. **Integration blueprints** for the top 5, build specs for the 3 build-worthy gaps, fork plans for the 2 fork candidates.
5. **Revised definitive software stack.**
6. **Revised 72-hour action plan** incorporating every correction from the gap audit.
7. **Master source list:** every URL with publication and retrieval dates.

Begin. All 500 agents deploy now, all lanes in parallel. Phase I mapped, Phase II verified, Phase III built. Phase IV makes it impeccable: no gaps, no dead code, no excuses. A+++++ or it doesn't ship.
