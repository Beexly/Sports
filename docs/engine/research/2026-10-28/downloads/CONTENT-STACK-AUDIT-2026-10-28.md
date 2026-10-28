# CONTENT STACK AUDIT — 2026-10-28

Garrett's order: review content creators, repos, tools, and features to ensure maximum quality, effectiveness, and efficiency.
Method: corpus-first. Three lanes read Garrett's own mined corpus at content level (IG sweep, shared-items register, massive recon, gap report, package register, coverage ledger, GitHub audit, wiring map, the Content OS master + amendments/errata, the Nova tooling sweep, the cloud-agents repo batch). No web research. Lane reports: `~/workspace/gse-money-prep/stack-audit-2026-10-28/lane-a-creators.md`, `lane-b-repos.md`, `lane-c-tools-features.md`.

## THE VERDICT

**Extraction-rich, execution-poor.** The corpus knows far more than the operation uses:

- **~100 creators** cataloged; **5** wired into anything live; **~40** techniques cataloged-only.
- **~163 repos** known by name; **3** actually running (yt-dlp, Reclip, n8n).
- **88 tools** dispositioned; **3** verified running today (Reclip, the X qi-check pipeline, the morning sweep).
- **200 Content OS chains traced: 62 complete, 138 broken; 72 registered disconnections.**
- **266 coverage rows: 97 USED / 47 mentioned-not-wired / 122 NOT USED — 63.5% of everything cataloged carries no function.**
- **16 jobs specced, 0 enabled.** The designed volume (≈27.5 masters/week) is paper until the build phase starts.
- **Surfaces fully chained: 2 of 6** (X, Instagram). TikTok breaks at Publish; YouTube long-form has **no production path at all**; the site has **no deploy job** (W-72); email has no production path.

Nothing here is a discovery problem. The corpus already contains the playbooks, the verdicts, and the fixes — most ranked items below are executions of decisions already written down.

## CREATORS (Lane A)

Census: ~100 distinct creators (Instagram ~78, X ~20, **YouTube 0, TikTok 0 dossiered**). ~55 have a technique extracted at content level; ~25 are inventory-only. Wiring: WIRED-LIVE 5 (Nova's reference trio @itslilypod 203K / @yung.planet 774K / @godnotthisgirlagain 65K into Nova's build; @marc.kaz + @carterperez.dev into the shipped Intel bot) · WIRED-DESIGN ~18 (complete chains in the OS document only) · PARTIAL ~12 · NOT USED ~40.

Highest-value unused creator value:
1. **Angus Sewell's Higgsfield persona pipeline** — Nova's launch playbook (build character → remake top-100 viral formats with her → profile originals' top commenters → lookalike seeding) sits in the corpus while Route C has no creator-operation spec (W-62).
2. **Standing Roundup host persona** (@sebastianhardy_ mechanic) — the OS Roundup is hostless by design; Nova is being built to be a face and is not written in as the host.
3. **Debate/roundtable format** (TradingAgents pattern) — bull/bear personas argue a pick, verdict at the end; matches the Reasoning Doctrine; no OS format has creators interact.
4. **Sequenced curriculum arc** (@wnbadata, the corpus's best-verified creator) — retention format and the skeleton of the first owned product in one build.
5. **Free recipe post as lead magnet** (@carm1nee) + **resource reels/storefront** (@ariacodez) — both point at a product lane that does not exist (W-57), the single break stranding the most creator value: **6 creator funnels exit into a checkout that isn't there.**
6. **11 corpus-proven formats have no OS template** (W-14) — including the single-image list graphic (cheapest format in the corpus; the OS's cheapest is an 8–12-slide carousel) and the product-UI demo reel (the most-repeated format in Garrett's own feed sample; needs no presenter, no script).

## REPOS (Lane B)

ADOPT reality check on the 11 carried ADOPT verdicts: **2 real** (yt-dlp — alive inside Reclip; n8n — real in the revenue lane, but the content-job substrate is undecided, W-71), **2 paper** (postiz, listmonk — design-wired, no installed instance or run anywhere on record; listmonk's main email chain is broken end-to-end, W-37), **7 unverifiable** (Ghost, web-check, awesome-osint, polar, Kats, alibaba/open-code-review, PostHog-cloud — no trace in the audit's source files; the verdict table itself is this lane's largest documentation gap). The cloud-agents batch's 4 ADOPT-CANDIDATEs (Ansible, WeKnora, Wigolo, SigNoz) are also all paper — proposed first uses, none stood up.

Starred repos: **2 of 30 wired**; 28 unwired (19 with named leverage, 9 residue).

Top unwired for the content operation: **lumify** (his only starred sports tool — MCP feed of scores/odds/splits into the packet; kills manual Fuel assembly; W-03, called the highest-leverage single miss), **Crawl4AI** (free collection workhorse), **Langfuse** (the quality loop is unmeasured without it), **gitleaks + security-audit chain** (absent while the estate carries live credential wounds on record), **WeKnora** (corpora as one cited knowledge base), **Wigolo** ($0 search/crawl; AGPL trap noted), **browser-use**, **Skills-Atlas + vercel-labs/skills**, **cinematic-ui** (the positive visual grammar; only the anti-slop lint was wired), **Hindsight + Zep** (memory that knows when facts expire), **FastMCP**, **TradingAgents**.

## TOOLS + FEATURES (Lane C)

Tool tiers: 46 named with a production function in the OS · 24 adopt-candidates with no OS function · 15 license-trapped/dead (F5-TTS NC weights, XTTS/Coqui defunct, buffalo_l non-commercial, CodeFormer NC, IP-Adapter-FaceID gone, InfiniteYou NC, LivePortrait NC, RouteLLM dormant) · 3 corpus-absent. Higgsfield is connected but dry-mode: auth verified, $0 spent, **per-generation cost unknown in the corpus** — and the OS state machine spends credits *before* Garrett's approval, with an unknown balance forcing a blind 1-piece/day cap.

Efficiency leaks (top 5 of 10 ranked):
1. Paid Firecrawl (5,000 credits/mo) was the OS default while the free Crawl4AI chain sat unbuilt; corrected only by errata E9.
2. Higgsfield spend-before-approval + unknown unit economics (above).
3. ≈$60/mo of fixed-seat consolidation identified in the corpus's own dossier math, unexecuted.
4. Gate 0 specced as per-piece frontier-model passes where the corpus documents $0 code checks + one batched cheap call; Gate 1's static prefix re-billed ~28×/week.
5. Duplicate pairs mandated "one, not both" and never decided: LiteLLM vs Helicone, n8n vs Windmill; Mixpost's $299 Pro carried as fallback behind $0 Postiz.

Quality risks (top 5 of 9): Higgsfield as the single home of Nova's identity (7-day output-URL retention; the LoRA hedge was unbuilt — **now in motion, Oct 28**) · X-API fallback resting on an **invalid bearer** (W-40) · Postiz OAuth verified for only 1 of 4 networks — variants can silently drop (W-36) · **12 tools with no license stated**, two load-bearing today (VoiceStudio, HyperFrames) · the OS text claiming its uniqueness gate and humanization pass are wired when the executing text lacks both (the Oct 23 failure class, inside the document itself) · Gate 1 scoring wholly unmeasured (no golden set).

Platform features documented but unused (12): TikTok AIGC toggle, IG per-post AI label + AI-profile label (unlabeled photoreal AI personas get de-recommended), YouTube AI-use attribute, C2PA signing, Postiz's 30+ networks (1 path used), IG collab posts, YouTube description affiliate slot ("designed, unused" in the OS's own words), and more in Lane C §2C.

## THE RANKED FIX LIST (unified)

Ordered by value per unit of work. "Spec" = document/spec work Motif can do inside the existing design; "Build" = waits on the OS build-phase go; "Garrett" = his gate (spend/approval).

1. **Write Angus's persona pipeline in as Route C's creator-operation spec** (W-62). Spec. The paid lookalike-seeding step stays Garrett-gated.
2. **Add the 11 missing format templates** (W-14), starting with the single-image list graphic and the product-UI demo reel. Spec.
3. **Name Nova as the standing Roundup host** in the creator file. Spec — one line, changes every episode.
4. **Decide the duplicate pairs in writing** (LiteLLM over Helicone per W-44; close Windmill and Mixpost as options or commit them). Spec.
5. **License-check the 12 unstated tools**, VoiceStudio and HyperFrames first (R-5). Motif, read-only checks.
6. **Wire the collection chain free-first**: Crawl4AI as Fuel workhorse, Firecrawl demoted to fallback, Wigolo A/B as its first use (W-02). Build.
7. **lumify into the packet Fuel stage** (W-03/C1) after a license check. Build.
8. **Langfuse + call tracing** so Gate scores and cost rules run on measured data (W-44). Build.
9. **Security chain**: gitleaks + audit skill into the repo workflow (W-55). Build — the estate's credential record makes this survival, not hygiene.
10. **Stand up the product lane** (W-57): curriculum arc as the first product skeleton; the 6 stranded creator funnels get an exit. Build + Garrett (monetization applications are in his name).
11. **WeKnora ingest** of the corpora as the cited, MCP-served knowledge base. Build.
12. **Name the 49** (below) and triage Stream D-2 in batches. Motif.
13. **TikTok/YouTube creator dossier pass** — 0 creators dossiered on the two video platforms while Nova is TikTok-first. Motif, read-only research; this is the audit's one named external gap.

## GAP AUDIT (per the standing rule — what this audit did NOT cover)

- **NOT EVALUATED:** the **49 repos** notated-not-evaluated (Stream D-2). They are counted in the corpus but named nowhere in the audit's source files. The name list lives in the Oct 13 harvest (`~/workspace/your_files/master-ledger-2026-10-13.md`, §E: the 90 chat-harvested repos). Closer: cross-reference that harvest against the evaluated set, then triage in batches — fix #12 above. The Stream D verdict table for the 31 evaluated (incl. the 7 unverifiable ADOPTs) is likewise outside the lane files and gets pulled in the same pass.
- **NOT CLASSIFIED:** **298 of 654** IG DM shares (Instagram 429 wall; re-pull kit preserved). Closer: re-run the preserved pull post-window.
- **NOT READ AT CONTENT LEVEL:** 36 of 40 round-2 feed posts · 10 round-2 ads · ~9 of ~26 Suggested tool posts · register items S7 (fully unread), S8 (identified, not dissected), S9 (logged only) · 8 items deferred by the 429 stop · ~8 of @codingknowledge's 20 repos untranscribed.
- **STALE:** IG Saved (50) + Liked (30) last read Oct 9–13. **NEVER READ:** X DMs, Garrett's own-post corpus (107 posts), his own IG following list.
- **PAST CAPTURE CAPS:** @angus.sewell following 200 of 789 (589 unseen) · @marc.kaz 200 of 4,279 (4,079 unseen).
- **NOT REGISTERED:** 264 of the 275 Oct 27 items never entered the PACKAGE-REGISTER.
- **NOT MEASURED:** Higgsfield per-generation cost and balance (W-63) · Gate 1 scoring (no golden set) · platform ad-revenue-sharing programs named anywhere: **0**.
- **NOT VERIFIABLE FROM THE CORPUS:** 7 of 11 ADOPT verdicts (above).
- Attacked in this audit itself: the three-lane census, the ADOPT reality check, the tool tiering, and the fix list. The remaining gaps each carry their closer above; none were silently dropped.
