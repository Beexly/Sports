# Instagram For You Discovery Sweep — 2026-11-10 AM

**Run slot:** AM, Tue 2026-11-10 (America/Chicago)
**Surface:** Signed-in Instagram home For You / Suggested feed, fresh browser tab, https://www.instagram.com/ — signed in as @gbeexly, Home selected, Following unselected, "Suggested for you" posts present. Not Explore, not a profile grid, not search results.
**Method / times (runtime-measured):**
- Browser scroll 09:10–10:01 CST (51 min, harness-measured). Scrolled in feed order to 95 positions by design; feed was still loading at position 95, no block, no rate limit, no logout, no checkpoint. A Collections/save popup appeared twice (around positions 2 and 74) while inspecting timestamp links and was closed both times by clicking empty white space — no collection selected, nothing saved.
- Dedup: all 75 non-ad shortcodes (74 organic + 1 paid partnership) checked programmatically against `seen-index.md`, all prior reports in `reports/`, and `SHARED-ITEMS-REGISTER.md` — **73 NEW, 2 duplicates skipped** (position 4, @daughterofrobott `DfisgFLjG2A`, already dossiered as 2026-11-09 PM-17; position 14, @justinmendez.ai `DfhvvymIsTj`, already inventoried at 2026-11-09 PM position 88 and resolved there to meta/astryx).
- Post-level dissection: the first 40 NEW-plus-duplicate organic posts in feed order (positions 1–51) were read in full by the browser worker (captions, carousel slides where present, on-screen text; all reels were muted in post view with no transcript, so spoken content was not transcribed for any reel — named per dossier and in the gap audit). The first 20 NEW organic are dossiered below; the next 18 NEW posts in that read set (positions 30–51 subset) were also fully read and are filed as inventoried with one-line read notes in the appendix.
- Primary-source pass: Claude Fable 5.2 / Opus 5.5 resolved against Anthropic's Nov 9, 2026 release record as carried by multiple independent write-ups of the announcement and models overview (AM-01); the Saltline FPS figures traced to Felix Rieseberg's own Nov 9 post on X and labeled self-reported (AM-05); the gated "render" engine resolved to Voyager's **vork** at voyager.so and github.com/voyager-so/vork (AM-20); the $11.4M Nvidia cargo theft (inventoried position 51) checked against Mercury News reporting via multiple outlets. India Mode (inventoried position 34) found no independent source beyond its own caption link.
- Read-only: no likes, saves, follows, comments, DMs, sign-ups, or claims made. Comment gates ("render" AM-20, "YC" position 34, "CAR" position 41) were not engaged; every tool was resolved from the post itself or public sources instead. One allowed locator exception: the Astryx repo link in the duplicate post at position 14 came from a creator comment, exactly as in yesterday's run.
- Raw inventory: `raw/2026-11-10-AM/feed-inventory.md`.

**Count proof:** 95 feed positions seen → 20 sponsored ads excluded → 75 non-ad items (74 organic + 1 paid partnership) → 2 duplicates skipped → **73 NEW** → 20 selected and dossiered (first 20 NEW organic in feed order) → **53 inventoried-only with codes** (18 of them also fully read). All 75 non-ad items were saved with shortcodes at collection time; the 20 ads carry no shortcode by design and are recorded by advertiser + offer.

**Verified deadlines / free items this run:**
- **Claude Fable 5.2 extra paid-plan usage (AM-01): VERIFIED window, closing soon.** Fable 5.2 released Nov 9, 2026 at $8/$40 per million input/output tokens — exactly twice Opus 5.5's $4/$20. Independent launch coverage agrees Anthropic's own guidance is: keep Opus 5.5 as the everyday default, move up to Fable 5.2 when Opus falls short on hard, long work. Paid-plan inclusion is time-boxed: launch coverage puts the included-through date at **November 16, 2026**, with Enterprise roles auto-adding Fable 5.2 about seven days after release (~Nov 16) unless an admin opts out. This week's extra Fable usage in the post sits inside that window. No plan change or claim was made in this read-only run.
- **vork research preview (AM-20): free during the preview, no end date stated.** Source-available under the vork Preview License — explicitly *not* open source. Cloud-GPU rendering is the paid trap: it requires a paid Voyager workspace, billed by the second.
- **TTD x Diamond Gym drop (AM-03): today, Nov 10, 3 PM EST** — a merchandise drop recorded from the caption, not a free offer; nothing was bought.
- **Relevant ads (not counted):** @runwayapp, position 68 — create AI videos inside Claude by connecting Runway (GSE Content OS lane; recorded only). @coderabbitai, position 76 — overnight-agent code-change explainer (fleet lane). @meetgranola, position 60 — Granola AI notepad (already a connected service). @zapier, position 48 — IT-team automation, with a "$500k saved" advertiser claim left UNVERIFIED. @openai, position 62 — ChatGPT Business seat terms. @klaviyo, position 16 — customer-data marketing (Kit/client lane).

---

## DOSSIERS

### AM-01 — Claude Fable 5.2 dropped; Anthropic itself says keep Opus 5.5 for everyday work — @voxaris_ai (recreator; origin: Anthropic) — FIND OF THE RUN (routing decision)
Post: https://www.instagram.com/p/Dfj90EuxHIj/ · Feed position 1 · Reel, Nov 10, 2026 · On-screen: a screen-recorded article about Fable/Opus; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A faithful short explainer of a real launch. Verified this run: Anthropic released **Claude Fable 5.2** (and Mythos 5.2, the same model with cyber/bio safeguards removed, restricted to vetted organizations) on **November 9, 2026**. Fable 5.2 is the tier *above* Opus 5.5 for big, hard, long jobs — huge codebases, deep research, agents that run for hours. The post's central claim matches Anthropic's own positioning as carried by independent launch coverage: Opus 5.5 remains the recommended default for everyday work, and Fable is the step-up when Opus falls short on your own evaluations. The post's price claim also checks: Fable 5.2 is $8/$40 per million input/output tokens, exactly twice Opus 5.5's $4/$20 — and 20% cheaper than Fable 5.1 was.
2. **WHERE TO FIND IT** — Anthropic's Nov 9, 2026 announcement ("Claude Fable 5.2 and Mythos 5.2") and the Claude models overview (API IDs `claude-fable-5-2`, `claude-opus-5-5`), as cited across the launch coverage checked this run. Post URL above; @voxaris_ai is a recreator, Anthropic is the origin.
3. **HOW TO USE IT** — No install: a routing rule. Default everyday seats/jobs to Opus 5.5; route a job to Fable 5.2 only when it is long, hard, and open-ended (large-codebase work, deep research, multi-hour agents). Batch mode halves Fable to $4/$20 per launch coverage. Paid-plan seats get extra Fable usage inside the launch window (see deadlines above — through ~Nov 16).
4. **WHICH SYSTEM IT PLUGS INTO** — **His model-routing stack, directly, and this week.** Garrett's fleet runs Claude-family seats for verdicts, deep math, and adversarial review. This launch gives that stack a clean two-tier rule with a verified 2x price step: Opus 5.5 stays the default workhorse; Fable 5.2 becomes the named escalation seat for the jobs Opus visibly fails — instead of paying Fable prices for emails, captions, and quick coding. It replaces nothing; it prices the top rung.
5. **CREATIVE ANGLES** — (a) The launch coverage notes a result shape worth stealing for the fleet's own eval discipline: on Anthropic's FrontierCode 2.0, Fable at *high* effort roughly matched Opus at *max* effort at about half the cost per task (vendor-reported). The routing question is therefore not "which model" but "which model at which effort" — a two-axis table the fleet can measure on its own graded tasks. (b) Pair with AM-05: the Saltline run's bill was dominated by cached input, not output — long agent runs are an input-economics problem, and a 2x-output-price model punishes exactly the wrong axis if the workload is input-heavy. Route by token shape, not by prestige. (c) Mythos 5.2's vetted-only cyber/bio lane is a Family Shield fact: the unrestricted tier exists, is application-gated, and is not something this household needs — filed so the name is recognized if it appears in a feed claim later.
6. **RISKS AND LIMITS** — Every benchmark in the launch record is **Anthropic-reported**; independent coverage checked this run says so explicitly and ran no head-to-head of its own. Fable 5.2 still loses some tasks (ProgramBench goes to Opus 5.5 in Anthropic's own table). Fable's safeguards block high-risk cyber work and most research biology — a capability limit, not just a price. The plan-inclusion window is short and the Enterprise auto-add (~Nov 16) is an opt-out trap for seat admins. The post itself is accurate, which is rare enough to note — but it is still a summary; the models overview governs.
7. **FIRST TEST AND VERDICT** — Smallest real test, inside the free window: take three already-graded hard fleet jobs (one large-codebase task, one deep-research task, one multi-hour agent run) and re-run each once on Fable 5.2 at high effort; compare accepted-output rate and cost per accepted task against the recorded Opus 5.5 results. Kill criterion: no accepted-output gain on at least two of three, or cost per accepted task above 1.5x Opus. **Verdict: TEST** — the window closes ~Nov 16, so this is the rare sweep find with a real deadline.
8. **ENGINE-TRAINING VALUE** — Real for the routing layer, not the sports model: (model, effort, task class, accepted?, cost) rows from the §7 test are exactly the labeled data a model router trains on, and Anthropic's published 14-benchmark table (with its effort and safeguards conditions named) is a vendor-reported prior for that table — labeled as vendor data, never as ground truth. For the GSE prediction engine itself: none directly.

### AM-02 — Second 91 Freeway construction weekend canceled; culvert project finished early — @cbsla (news)
Post: https://www.instagram.com/p/Dfia4TUiIUx/ · Feed position 2 · Reel, Nov 9, 2026 · Caption truncated in the post pane; on-screen headline carries the completion news; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A local-news reel: the eastbound SR-91 culvert replacement between Orange County and Corona (a $6 million project just west of Green River Road, per the caption) finished during the first weekend window, so the second scheduled weekend closure was canceled.
2. **WHERE TO FIND IT** — Post URL above; origin is CBS LA's own reporting as posted.
3. **HOW TO USE IT** — As a news record.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Filed complete, and paired with AM-16: two of this morning's first 23 positions cover the same 91 Freeway project from opposite ends of the weekend — the feed's local-news cluster, not two separate stories.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Caption truncated in the post pane; the $6 million figure and work hours are the post's own, not independently checked this run.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-03 — TTD x Diamond Gym collection, drop live today Nov 10 at 3 PM EST — @haddy_abdel + @ttdathletics (merch drop)
Post: https://www.instagram.com/p/DfiJF3yyQmb/ · Feed position 5 · Reel, Nov 9, 2026 · Caption truncated in the pane; visual: heavy barbell squat at Diamond Gym; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A one-day-out announcement for a gym-apparel collection drop, with the full preview on the TTD site and the drop time stated plainly in the caption.
2. **WHERE TO FIND IT** — Post URL above; the TTD site as named in the caption (no URL in the post).
3. **HOW TO USE IT** — As a record of a timed drop; nothing was bought (read-only run).
4. **WHICH SYSTEM IT PLUGS INTO** — None for Garrett's systems. Filed complete: the drop mechanic itself (one-day warning, fixed clock time, full preview off-platform) is the standard limited-drop shape his own merch lanes would use, noted at pattern level only.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Caption truncated; no prices or inventory in the post.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-04 — James Harden takes a fall, Cavs vs Hornets — @bleacherreport + @houseofhighlights (highlight)
Post: https://www.instagram.com/p/DfiyHIAuxbt/ · Feed position 6 · Reel, Nov 9, 2026 · On-screen scoreboard fragment shows Cleveland in the 3rd; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A short highlight/mishap clip of James Harden on the floor during a Cavaliers game, posted as comedy, not analysis. No stats, no injury claim in the post.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a sports record.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS (NBA lane) at filing level only: a fall with no injury claim carries no availability signal, and the dossier records that absence explicitly so nobody downstream upgrades a comedy clip into a health input.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Nothing checkable in the post; nothing asserted beyond the clip.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only (a negative example: viral fall clip, zero labeled availability data).

### AM-05 — Saltline: an Anthropic staffer's Fable 5.2 built a playable FPS in one run — @eluna.ai (recreator; origin: Felix Rieseberg, Anthropic)
Post: https://www.instagram.com/p/DfjPScPKulC/ · Feed position 8 · Reel, Nov 10, 2026 · Caption truncated in the pane after the token figures; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A second Fable 5.2 post in the first eight positions — this one about the demo, not the launch. Traced to origin this run: Felix Rieseberg, who builds products at Anthropic, posted **Saltline** on X on Nov 9, 2026 — a small browser-playable FPS built from one short prompt with no human feedback, models/sounds/textures generated from scratch. His reported bill: **about 8 hours, about $550 at API prices, ~445 million input tokens and ~2.7 million output tokens, heavily cached.** The Instagram caption's figures match his post exactly. What the numbers actually show, once traced: input outnumbers output roughly 165-to-1 — the run's cost was an *input/context* cost (cached reads of a growing codebase), not a generation cost.
2. **WHERE TO FIND IT** — Origin: Felix Rieseberg's Nov 9, 2026 posts on X (the Saltline post and the prompt post minutes later), and the Saltline Claude Artifact. Post URL above for the recreator version.
3. **HOW TO USE IT** — As a measured-shape case study, not a recipe: the prompt asked for a tiny level with maximal visual quality — small scope was the decision that made one-shot possible. The tool that ran the eight hours was not named by Rieseberg (he noted only that his instruction file was empty), so there is no stack to copy.
4. **WHICH SYSTEM IT PLUGS INTO** — **Agent fleet infrastructure — as a budgeting doctrine.** Garrett's long agent runs (overnight builds, sweep dissections) have the same token shape as Saltline: enormous cached input, small output. Two consequences: (a) cache behavior, not output price, is the first-order cost lever for fleet runs; (b) "one prompt, no feedback, small scope" is a legitimate test shape for bounded artifacts — and its honest price at frontier tier is ~$550 and 8 hours for a *tiny* level, which calibrates any "the agent will just build it" estimate.
5. **CREATIVE ANGLES** — (a) Pair with AM-01's effort finding: Saltline ran on the launch-day model at unknown effort; re-running a Saltline-*shaped* task (tiny scope, one prompt) on Fable at high vs Opus at max is a clean, self-grading fleet benchmark — the artifact either plays or it doesn't. (b) The 165:1 input:output ratio is a diagnostic: any fleet job whose ratio looks like that is paying for re-reading, and the fix is context discipline (smaller working sets, summaries at boundaries), not a cheaper model.
6. **RISKS AND LIMITS** — **Self-reported and unaudited:** the figures are Rieseberg's own, rounded; independent coverage checked this run states plainly that nobody outside Anthropic has audited the run and that Claude labels artifact pages as user-generated and unverified. He is an Anthropic employee demoing his employer's launch-day model — the demo is real evidence the artifact exists and plays in a browser, and no evidence at all about typical cost or success rate. "Close to a professional game" is the recreator's gloss, not a finding.
7. **FIRST TEST AND VERDICT** — No test of Saltline itself. The transferable test is folded into AM-01 §7 (same graded jobs, cost shape recorded per run so the input:output ratio is measured, not assumed). **Verdict: LEARN-ONLY.**
8. **ENGINE-TRAINING VALUE** — One labeled cost row for the fleet's routing dataset: (frontier model, one-shot, tiny-scope build, 445M input cached / 2.7M output, ~$550, success) — self-reported status attached. For the sports engine: none.

### AM-06 — "Championship teams aren't built by playing it safe" — @pitchingninja (Sage-branded offseason retrospective)
Post: https://www.instagram.com/p/DfkMHvjhVcF/ · Feed position 9 · Reel, Nov 10, 2026 · On-screen: a "most impactful acquisitions" retrospective frame; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A branded content reel (hashtags name Sage) looking back at the 2026 offseason trades and acquisitions that shaped the postseason, framed as bold-move doctrine. The post names no specific trade, player, or number in its caption — the payload is the framing, not a dataset.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a content-format record.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS (MLB lane), one line: an established baseball account packaging an offseason retrospective as a sponsor-branded segment is the exact shape of a sellable GSE segment — retrospective + doctrine line + sponsor tag — filed as a format observation, not a signal.
5. **CREATIVE ANGLES** — None offered beyond §4.
6. **RISKS AND LIMITS** — The retrospective's actual selections live in the muted video, which was not transcribed; nothing in the caption is checkable.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: LEARN-ONLY** (format only).
8. **ENGINE-TRAINING VALUE** — none — context only (no labeled move/outcome rows are recoverable from a muted retrospective).

### AM-07 — "'I can make this better at home' is becoming a personality trait" — @feelwellbyanna (wellness reel)
Post: https://www.instagram.com/p/DfcwNkNs394/ · Feed position 10 · Reel, Nov 7, 2026 · Video frame loads black in post view; spoken content not transcribed — audio muted and frame black.
1. **WHAT IT IS** — A caption-only wellness/homemade reel. The caption is the entire recoverable payload; the video itself could not be seen in this run's post view.
2. **WHERE TO FIND IT** — Post URL above. This creator recurs in the sweep (a 2026-10-30 backlog sighting carried the same "video payload unread" limitation).
3. **HOW TO USE IT** — As a record at caption level.
4. **WHICH SYSTEM IT PLUGS INTO** — None.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Frame-black limitation, stated plainly: any claim about the video's content would be invention.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-08 — Man washing windshields at a Houston traffic light — @thatbeeree (local clip)
Post: https://www.instagram.com/p/Dfi0XnhpxFr/ · Feed position 11 · Reel, Nov 9, 2026 · On-screen text places it in Houston; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A dashboard-view clip of a man washing car windshields at a traffic light, captioned as an only-in-Houston moment with an "moving like AI" joke. No tool, offer, or claim.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a local color record.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Filed complete: a Houston street-level sighting in a Kingwood-based feed — the For You graph's local layer working as expected.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — None material.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-09 — "the im good bro meme may be MASSIVE" — @timthetatman (streamer meme reel)
Post: https://www.instagram.com/p/Dfc0Li8AH1o/ · Feed position 13 · Reel, Nov 7, 2026 · Frame loads black in post view; spoken content not transcribed — audio muted and frame black.
1. **WHAT IT IS** — A caption-only meme call from a major streamer: a prediction that a specific meme format will blow up. The meme itself is in the black-loading video and was not seen.
2. **WHERE TO FIND IT** — Post URL above. (A second @timthetatman post from the same meme sits at inventoried position 89.)
3. **HOW TO USE IT** — As a record at caption level.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS at filing level only: meme-velocity calls from large streamers are distribution weather, not content inputs — noted, not acted on.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Payload video unread (black frame); the "may be MASSIVE" call is the creator's, UNVERIFIED by definition.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-10 — Ten-minute breakfast, anti-inflammatory framing — @thewholeedit_ (wellness reel)
Post: https://www.instagram.com/p/DfdfiF9tQKJ/ · Feed position 15 · Reel, Nov 7, 2026 · Audio is a Tate McRae track; frame loads black in post view; spoken content not transcribed — audio muted and frame black. A link lives on the creator's page (not a comment gate; not followed).
1. **WHAT IT IS** — A caption-only wellness reel: a ten-minute breakfast presented under anti-inflammatory / remission hashtags. No recipe, ingredient list, or claim detail is in the caption — all of it would be in the unread video or behind the page link.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a record at caption level.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Health-claim adjacency is noted and left alone: remission framing in hashtags is marketing, not evidence, and this sweep does not grade it.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Video unread (black frame); health framing UNVERIFIED and ungraded by design.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-11 — "Christian Braun has never missed a free throw against the Rockets" — @spacecityhn + @houstonrockets (broadcast trivia)
Post: https://www.instagram.com/p/DfjNgoBhmpR/ · Feed position 17 · Reel, Nov 10, 2026 · Frame loads black in post view; spoken content not transcribed — audio muted and frame black. The trivia line is attributed in the caption to broadcaster Craig Ackerman.
1. **WHAT IT IS** — A Rockets-broadcast trivia claim packaged as a hype reel: a named opponent's career free-throw record against Houston, stated without a number, a date range, or an attempt count in the caption.
2. **WHERE TO FIND IT** — Post URL above; the claim's origin is the broadcast booth as quoted, not a stats page.
3. **HOW TO USE IT** — As a record at caption level.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE reasoning engine, trust track, as a *negative* filing: "never missed" claims without attempt counts are exactly the narrative class the engine must weight at zero until a denominator exists. A streak on 4 attempts and a streak on 40 are different facts wearing the same sentence.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Claim UNVERIFIED this run; no attempt count exists in the post to verify against even in principle. Frame black; nothing else recoverable.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only (an unlabeled streak claim with no denominator cannot become a training row; its value is the refusal pattern in §4).

### AM-12 — Small plane flips while taxiing at John Wayne Airport — @ktla5news (news)
Post: https://www.instagram.com/p/DfiVCElFO6k/ · Feed position 18 · Reel, Nov 9, 2026 · On-screen headline names the airport; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A news reel with a complete caption: a Cessna 172 flipped over while taxiing at John Wayne Airport in Orange County on Saturday, possibly after jet blast from a nearby United Airlines flight; both people aboard were uninjured; the incident is under investigation.
2. **WHERE TO FIND IT** — Post URL above; origin is KTLA's reporting as posted.
3. **HOW TO USE IT** — As a news record.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Filed complete: unlike several of this morning's news items, this caption is self-contained — cause stated as *possible*, injuries stated, investigation status stated. A model caption, noted as such.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — The jet-blast cause is explicitly preliminary in the post itself; filed at that strength, no stronger.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-13 — Jefferson: 3 catches on 11 targets; Wentz line in the frame — @nfloncbs (stat-box clip)
Post: https://www.instagram.com/p/DfjH6D2uLw1/ · Feed position 19 · Reel, Nov 9, 2026 · On-screen stat box in the frame: the QB line reads 8 completions on 25 attempts for 81 yards, no touchdowns, 2 interceptions (as shown); spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A Vikings passing-failure clip with its evidence in the frame: the receiver's target volume (11) against his catches (3), and the quarterback's full line beside it. Unlike AM-11, this post carries denominators — usage and efficiency are both visible, so the clip is a data-bearing sports post, not a hype post.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a sports record at in-post level: the numbers are the post's own broadcast graphic, not an official box score checked this run.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS + the reasoning engine's usage layer, at filing strength: a star receiver drawing 11 targets and converting 3 is a QB-receiver connection failure, and the engine's weekly cycle reads exactly this layer (usage first, then health, then matchup) — the post is a clean example of a usage signal that needs no narrative translation.
5. **CREATIVE ANGLES** — (a) The AM-11/AM-13 pair is a ready-made teaching contrast for the trust track: same feed, same hour — one denominator-free streak claim, one fully-denominated stat box. Filed together, they are the smallest possible labeled pair for "what counts as evidence."
6. **RISKS AND LIMITS** — Numbers are an in-post broadcast graphic, UNVERIFIED against an official box score this run; no game date is named in the caption. Nothing here is upgraded past that.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY** (with the §5 teaching-pair value noted).
8. **ENGINE-TRAINING VALUE** — The *shape* is a labeled row — (receiver targets, receptions, QB attempts/completions/yards/TD/INT) is precisely a usage+efficiency tuple the engine trains on — but the *values* are unverified this run, so no row is created from them. Shape noted; values refused. That distinction is the doctrine working as intended.

### AM-14 — "Hmm..." — a laptop photo grid of tech founders — @johngmarzo (photo reel)
Post: https://www.instagram.com/p/DfjERilTaHd/ · Feed position 21 · Reel, Nov 9, 2026 · Visual: a finger pointing at a laptop screen showing a photo grid including three recognizable tech executives; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A one-word-caption reaction post: a grid of famous tech faces on a laptop, offered without a stated claim, argument, or source. Whatever the post is "about" lives in the muted audio or the viewer's own inference.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a record at visual level.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Filed complete, and filed *as* incomplete: the dossier records that no claim was recoverable rather than inventing one from famous faces.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — No claim, no caption, no transcript — the maximum-honesty filing is this short one.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-15 — Creature File No. 007: Pumpkin Things — @escapehalloween (event world-building)
Post: https://www.instagram.com/p/DfiEV72CRjn/ · Feed position 22 · Reel, Nov 9, 2026 · On-screen: a mock field-file card (species, habitat, threat level, sighting confirmed); spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A Halloween festival building its world in-feed: a giant pumpkin creature presented as a numbered "creature file" with species classification and a threat rating, captioned as unusual sightings reported at the event.
2. **WHERE TO FIND IT** — Post URL above. (A 2027 passes / deposit offer visible under "more posts from" this account belongs to a different post and is not part of this one — recorded so it is never misattributed.)
3. **HOW TO USE IT** — As a content-format record.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS, format lane: the field-file card (numbered specimen, habitat, threat level, sighting status) is a reusable scouting-report costume — the same card shape with a player, a matchup, or a prop in the specimen slot would read instantly to this audience. Noted as a format, not adopted as a design.
5. **CREATIVE ANGLES** — None offered beyond §4.
6. **RISKS AND LIMITS** — None material; event fiction presented as event fiction.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-16 — Drivers go through a fence to escape 91 Freeway gridlock — @abc7la (news)
Post: https://www.instagram.com/p/Dfh-0aeAoV_/ · Feed position 23 · Reel, Nov 9, 2026 · On-screen text names the gridlock and its end; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — The other half of AM-02's story: the weekend closure between Anaheim Hills and Corona produced gridlock severe enough that drivers cut through a fence to escape it, before the culvert project finished early and the second weekend was canceled.
2. **WHERE TO FIND IT** — Post URL above; origin is ABC7 LA's reporting as posted.
3. **HOW TO USE IT** — As a news record.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Filed with AM-02 as one event seen twice: disruption first (position 23's footage is the older, weekend side), resolution second (position 2) — the feed delivered them out of chronological order, which the pair-filing corrects.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Video of drivers breaching a fence is presented by the post as fact of the weekend; not independently checked this run.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-17 — Kevin McGonigle's Rookie of the Year interview moment — @mlb (official clip)
Post: https://www.instagram.com/p/DfivfwCtoYA/ · Feed position 24 · Reel, Nov 9, 2026 · Frame loads black in post view; spoken content not transcribed — audio muted and frame black.
1. **WHAT IT IS** — An official MLB clip of a light moment from Tigers prospect Kevin McGonigle's ROY interview. The interview content itself is in the black-loading, muted video and was not recovered.
2. **WHERE TO FIND IT** — Post URL above. A companion character reel about the same player sits at inventoried position 30 (@tigers + @mlb) — the pair is one prospect-spotlight cluster, filed together in the appendix.
3. **HOW TO USE IT** — As a sports record at caption level.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS (MLB lane) at filing level: a Rookie of the Year interview for a top prospect is awards-season narrative; nothing in the recoverable payload carries a performance number.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Video unread (black frame); the ROY framing is the post's own.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only (an awards-narrative sighting with no labeled performance row recoverable).

### AM-18 — The Suns broadcast cannot believe the Wemby finger roll — @bleacherreport + @houseofhighlights (highlight)
Post: https://www.instagram.com/p/DfjBPyXpbrf/ · Feed position 26 · Reel per feed label, Nov 9, 2026 · Post-page media area loads blank/white, so on-screen text was not readable on the post page; spoken content not transcribed — audio muted / media blank.
1. **WHAT IT IS** — A single-play highlight: a Victor Wembanyama finger roll that drew an audible disbelief reaction from the Suns broadcast, per the caption. The play itself could not be viewed in this run's post page.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — As a sports record at caption level.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE Content OS (NBA lane) at filing level only. A broadcaster-reaction clip is a *distribution* artifact (the reaction is the shareable unit), noted at that level; it carries no performance data.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — Media blank on the post page; the filing rests on the caption and feed frame only.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-19 — James Hetfield hands his own wristband to a fan, Zurich — @pubity (aggregator clip)
Post: https://www.instagram.com/p/Dfj61ZqNrgT/ · Feed position 28 · Reel, Nov 10, 2026 · On-screen text restates the moment; via @pilot8481 per the caption; spoken content not transcribed — audio muted.
1. **WHAT IT IS** — A fan-moment clip from Metallica's show at Letzigrund Stadium in Zurich: Hetfield walks to the barrier, takes off his own wristband, and puts it on a fan's wrist. The caption's only claim is the moment itself and the fan's stated intention never to wash the wristband.
2. **WHERE TO FIND IT** — Post URL above; original filmer credited in the caption.
3. **HOW TO USE IT** — As a human-interest record.
4. **WHICH SYSTEM IT PLUGS INTO** — None. Filed complete: a clean, self-limiting aggregator post — what happened, where, who filmed it — with no inflated claim attached.
5. **CREATIVE ANGLES** — None offered.
6. **RISKS AND LIMITS** — None material beyond single-source aggregator status.
7. **FIRST TEST AND VERDICT** — No test. **Verdict: CONTEXT-ONLY.**
8. **ENGINE-TRAINING VALUE** — none — context only.

### AM-20 — The agent writes the scene as code, renders it, and revises it — @gittrend.io (recreator; origin: Voyager) — resolved: **vork** — FIND OF THE RUN (tool)
Post: https://www.instagram.com/p/DfgBvfzj3Wy/ · Feed position 29 · Reel, Nov 8, 2026 · Frame loads black in post view; spoken content not transcribed — audio muted and frame black. Gate: comment "render" for the repo link (one line; not engaged — the engine was resolved from the caption's own description against public sources).
1. **WHAT IT IS** — The caption describes, almost word for word, **vork**: a *headless* 3D and VFX engine built for agents instead of humans. There is no editor, no timeline, no window. An agent writes a scene as a JSON document / code (meshes, lights, cameras, materials, animation), runs a render command, *looks at the resulting image*, and revises the code until the frame is right. The kernel deliberately holds only what an agent cannot write on the fly — geometry, ray queries, GPU execution — while materials, cameras, light propagation, simulation, and compositing are small programs the agent writes per shot (its showcase example bends light around a black hole inside the scene program, not the engine). Written in Rust and Slang; renders through Vulkan and Metal. Version 0.1.0, research preview, released November 6, 2026. The getting-started help is ~2,500 tokens including a complete first scene — the whole API fits in an agent's context with no documentation retrieval.
2. **WHERE TO FIND IT** — Origin: Voyager (Nullframe, Inc.). Project page: https://voyager.so/vork · Technical write-up by the makers: https://voyager.so/blog/what-is-vork · Repo: https://github.com/voyager-so/vork · Install (from the project): `curl -fL https://github.com/voyager-so/vork/releases/latest/download/install.sh` then `vork setup`; first commands `vork help`, `vork init my-shot`, `vork render scene.json --profile std/draft --out render.png`. @gittrend.io is a recreator; the gated link was never needed.
3. **HOW TO USE IT** — Hand the repo's "paste this to your agent" paragraph to a coding agent; the agent initializes a shot, reads the built-in help (`vork help limits` lists what does *not* work, readable *before* committing to a shot), renders a draft, inspects the image, and iterates. Requirements are the gate: a recent NVIDIA GPU with a hardware-ray-tracing Vulkan driver on Linux (Ubuntu 22.04+) or Windows 10/11, **or** Apple Silicon with Metal (bundled Slang toolchain targets macOS 26; Intel Macs unsupported; data-center A100–B300 lines lack the required ray tracing). Scene authoring and help work without a GPU; rendering does not. No local GPU? Voyager leases cloud GPUs billed by the second — from a **paid** workspace.
4. **WHICH SYSTEM IT PLUGS INTO** — **GSE Content OS, in the telestration / explainer-graphics seat — with the standing video rule as its boundary.** Garrett's rule is absolute: sports video uses real footage, short clips, commentary-led; AI graphics are never a substitute for footage. vork does not touch that rule — it is not a video generator and produces no fake footage. Its seat is the graphics layer *around* real footage: rendered diagrams, formation schematics, data-driven 3D explainers, and VFX compositing *onto* real footage (one of its shipped examples does exactly that), all produced by an agent in a write-render-inspect loop with no editor seat and no human in a GUI. That loop is also a fleet-infrastructure pattern: it is the verification-as-a-skill shape (surface, drive, observe, revise) applied to rendering, and its `help limits` honesty (a machine-readable list of what the tool cannot do, readable before work starts) is a design Garrett's own tools should copy. It replaces no current tool; it extends the Content OS where today there is only "ask a video model and hope."
5. **CREATIVE ANGLES** — (a) **Telestration without a telestrator:** a scene program can draw a route tree, a coverage rotation, or a blitz path as true 3D over a composited still from real footage — the agent iterates on the render until lines and labels sit correctly, which is precisely the step current AI video tools fail silently. (b) **Pair with AM-01/AM-05 economics:** vork's loop burns *local GPU seconds*, not frontier tokens, for its iterations — the expensive model writes the scene program once; the cheap loop renders and inspects. That is the free-first doctrine expressed as an architecture. (c) Second-order: the same engine renders simulation *visualizations* — a GSE simulation's output (a play's outcome distribution as moving geometry) is a scene program away from being a watchable explainer instead of a table. (d) Its benchmark honesty is a template: vork's README states its timings are "not equal-quality speedups," lists failed quality comparisons, and separates setup/warmup from render time — the exact reporting standard the fleet's own benchmark lane is supposed to meet.
6. **RISKS AND LIMITS** — **License trap, named plainly: vork is source-available, NOT open source** — the caption's #opensource tag is wrong. It is free during the research preview, including commercial use, under the vork Preview License; what happens to pricing and terms when the preview ends is unstated, so nothing load-bearing should be built on it until that resolves. **Maturity:** v0.1.0, API "moving quickly" per the makers; fog and volumes are ignored (with a warning); heavy transparency and dense interiors can fail; its path tracer is slower than Blender Cycles in the makers' own measured cases, and Blender remains the better tool for most 3D work today *by the makers' own admission*. **Benchmarks are the vendor's:** the million-bird flock (97 seconds on one L4) excludes 244s setup and 166s warmup, and its Blender comparison is an extrapolation from eight warm frames, which the README itself flags — impressive and honestly labeled, still vendor numbers. **Hardware gate is real for Garrett specifically:** his standing urgent need is a new computer; vork's test waits on a machine with a qualifying GPU or Apple Silicon, and the cloud-GPU route is paid. npm/PyPI packaging was unpublished at the makers' last note.
7. **FIRST TEST AND VERDICT** — Smallest real test, staged for the first qualifying machine (or a single bounded cloud-GPU session if Garrett ever approves the spend — not assumed): install vork, run `vork help` and `vork help limits`, render one shipped example at draft profile, then have an agent produce *one* original scene — a simple 3D formation diagram — through the write-render-inspect loop with no human GUI help. Kill criteria: install or example render fails on the qualifying machine; the agent cannot converge on the diagram in five render iterations; or any preview-license term blocks commercial Content OS use. **Verdict: TEST** — the deepest tool find of the run; the test is cheap in everything except the hardware Garrett already needs.
8. **ENGINE-TRAINING VALUE** — Indirect but real: vork scenes are JSON + programs, so every (scene program, rendered frame, human/agent accept-reject) triple from §5 work is a labeled pair for training the fleet's own visual-verification judgment — the same accept/reject signal the verification lane runs on. For the sports prediction engine: the §5(c) simulation-visualization path would turn existing labeled simulation outputs into reviewable film, which improves *human and agent grading* of those outputs; it creates no new sports labels itself. Filed honestly at that strength.

---

## APPENDIX — Inventoried items with read notes (53)

**Also fully read this run (18 NEW, positions 30–51 subset) — one-line read notes; full browser notes are the source for any future deep-dive:**
- Pos 30 · @tigers + @mlb · https://www.instagram.com/p/DfinoJuuNZm/ · Kevin McGonigle character reel ("humble, driven, relentless") — companion to AM-17, same prospect cluster; frame black, caption is the payload.
- Pos 31 · @eztattooing + @inkedabroad + 2 others · https://www.instagram.com/p/DfagXumhO8G/ · Tattoo-supply promo; discount code INKEDABROAD in the caption (not engaged); caption truncated.
- Pos 33 · @kpixtv + @cbsla + 2 others · https://www.instagram.com/p/Dfi4gABEgEu/ · Boat-fire rescue off Montecito: two people rescued uninjured at Butterfly Beach, per the Montecito Fire Department via the caption — complete, self-contained news caption.
- Pos 34 · @parasmadan.in · https://www.instagram.com/p/Dfj5EUGCvrH/ · "India Mode": a gag/solidarity website that makes a visitor experience extreme-AQI conditions, built after seeing 2000+ AQI readings in Indian cities; live link in the caption (indiamode.vercel.app); "YC" DM gate also present, not engaged. No independent source found this run — the site itself is the only source; filed as a concept sighting (an empathy-by-interface pattern: make the data *felt*, not charted), CONTEXT-ONLY at backlog level.
- Pos 35 · @escapehalloween · https://www.instagram.com/p/DfidiI6APGv/ · Disco Lines set recap at the Big Top; frame black.
- Pos 36 · @aiboy.ai · https://www.instagram.com/p/DffVuYwh6OJ/ · AI-labeled content reel; caption truncated to a "how is this legal" fragment; frame black — payload unrecoverable beyond the AI-content label.
- Pos 37 · @jackiengroves + @yourhopecity + 2 others · https://www.instagram.com/p/Dff3lpDEaA2/ · Hope City Vision Weekend testimonial reel; no post-page visual captured.
- Pos 39 · @brandonmbarber + @yourhopecity + 2 others · https://www.instagram.com/p/Dfhak55TQ5D/ · Hope City Men's Night recap; frame black.
- Pos 40 · @halfchinesetogi + @togi · https://www.instagram.com/p/DfetO2CAgKa/ · Motivational "Togi Mentality" reel; on-screen lines about fear and potential; caption truncated.
- Pos 41 · @albert.olgaard · https://www.instagram.com/p/DfjN3PqgcTd/ · Fable 5.2 + Higgsfield game-building claim; "CAR" comment gate for the prompt, not engaged. Third Fable sighting of the morning (with AM-01, AM-05) — the launch *is* today's feed weather. The Higgsfield pairing is the creator's; no primary source checked for this specific workflow.
- Pos 42 · @realdonaldtrump · https://www.instagram.com/p/DfFP91Dh4EE/ · Endorsement post for Aaron Flint, Montana's 1st Congressional District (dated Oct 29 in the post view).
- Pos 44 · @southsixmedia + @ivx.sh0t + 3 others · https://www.instagram.com/p/DfhovglRvm2/ · INNA concert recap, Warehouse Live, Houston — local live-music documentation.
- Pos 45 · @torebekovvv_00 · https://www.instagram.com/p/DcstfHzI-s0/ · Hooded hiker by a turquoise mountain lake; one-emoji caption (Aug 31 post resurfacing).
- Pos 46 · @robertgreeneofficial + @dailystoicpodcast + 2 others · https://www.instagram.com/p/DfhzN-Rt2Hg/ · Robert Greene's new book *The Law of the Sublime* discussed with Ryan Holiday; episode on YouTube/Apple Podcasts per the caption.
- Pos 47 · @houseofhighlights · https://www.instagram.com/p/Dfi1y4eNhyw/ · Luka mid-game dance clip; frame black on the post page.
- Pos 49 · @johnsummit · https://www.instagram.com/p/Dffg5ysvbwp/ · Austin DJ set with flame jets; caption is the payload.
- Pos 50 · @yung.planet · https://www.instagram.com/p/Dfh1iDRh3mV/ · Nova-reference account sighting: fall-outfit post with a Ragged Priest discount code (MARS15) in the caption; sighting only, as in prior runs.
- Pos 51 · @realnewsnobullshit · https://www.instagram.com/p/DfiN_cTP_Ls/ · **Nvidia cargo theft — core VERIFIED this run.** The post's account (six pallets of Nvidia hardware, ~$11.4M reported value, picked up in Oakland Aug 29 bound for Fort Worth, trail lost in San Bernardino County) matches Mercury News reporting (Nov 5) carried by multiple outlets checked this run: grand-theft report filed Sept 13, no arrests or recovery announced as of Nov 6–7, the specific hardware never publicly identified, and police have not themselves confirmed the $11.4M valuation (it is a reported value). The post's China-smuggling framing reflects a Berkeley professor's warning in the coverage, and the DOJ-prosecutions line reflects the FBI's separate cargo-theft advisory — context, not established facts of this case. Filed LEARN-ONLY at backlog level: the Family Shield / supply-chain lesson is the carrier-impersonation pattern the FBI advisory describes — a truck showing the *expected* company's logo was itself the attack.

**Feed-level only (35 NEW, positions 52–95 subset; payloads in the raw inventory):** @meatdad1 (holiday prime rib), @cbsla mariachi proposal, @ironclad_gym, @abc7la LAX jet incident, @elevationworship ×2, @jdub_montoya SEMA cruise, @houseofhighlights ×3 more, @memezar, @hexumlite_, @cbsnews e-bike battery fire, @kyrenballard 115 MPH exit-velocity claim (as posted, UNVERIFIED), @tsn_official Luka in Atlanta, @nfloncbs punters, @dailymail baggage handler, @knowgood, @perrishoward Ray-Ban Meta paid partnership, @scottypatina Hope City Worship, @kanyewestlover911, @jettfranzen, @bleacherreport ×2 (Daniels back; Celebrini wizardry), @barstoolgruden, @neutonic Black Friday promo, @davidyeomansweather ocean-current explainer, @adamwolfefitness recipe with macros as posted, @yahoosports Luka 2018-draft trash talk, @into_the_woods_i_wander elk rut, @timthetatman second meme post, @realdonaldtrump uncaptioned, @funnyhoodvidz, @ianasher EDC Orlando, and the position-95 @houseofhighlights duo clip. Every one is in the seen index with its code for later recovery.

**Duplicates skipped (2):** Pos 4 @daughterofrobott `DfisgFLjG2A` (= 2026-11-09 PM-17, same 19-slide carousel) and Pos 14 @justinmendez.ai `DfhvvymIsTj` (= inventoried 2026-11-09 PM pos 88, Astryx). The Astryx duplicate's fresh deep read this run confirms yesterday's resolution and adds one update: secondary trackers this run put meta/astryx at ~20.2K stars (Nov 10) with the charts packages still canary-only and the system still in beta, MIT, React 19 + StyleX, 150+ components — the "give the repo link to your agent" workflow in the caption remains the item's actual pitch, and yesterday's TEST-adjacent filing stands unrevised.

---

## SYNTHESIS

**The feed's headline today is a launch, seen three times.** Positions 1, 8, and 41 are all Claude Fable 5.2 within the first 41 posts: the explainer (AM-01), the demo (AM-05), and a Higgsfield mashup behind a comment gate. That density is itself the signal — when a model launch occupies three of the morning's first 41 organic posts, the routing decision it forces (AM-01: Opus 5.5 default, Fable as the priced escalation seat) is not a research item, it is this week's operations. It also has the run's only hard deadline: the paid-plan inclusion window closes around **November 16**, which puts AM-01's three-job test ahead of everything else in the test order.

**The two deep finds compose.** vork (AM-20) and the Fable economics (AM-01 + AM-05) are the same doctrine from opposite ends: spend frontier tokens on the *one* hard act of authorship (the scene program, the hard job), and let cheap loops (local GPU renders, cached-input agent runs) do the iterating. Saltline's 165:1 input:output ratio and vork's 2,500-token API both say the same thing — the winning shape is a small, complete specification plus a fast inspect-and-revise loop. That is Garrett's verification doctrine wearing two different costumes in one morning's feed, and it is the strongest cross-item pattern this run produced.

**Pairs the feed made on its own:** AM-02 + AM-16 are one freeway project delivered out of order (resolution at position 2, disruption at position 23); AM-11 + AM-13 are a trust-track teaching pair (a denominator-free streak claim vs a fully denominated stat box, one hour apart); AM-17 + position 30 are one prospect cluster (@mlb interview + @tigers character reel). Filing pairs together, as this report does, is what keeps a twice-told item from becoming two false signals.

**What changes a workflow he already runs:** AM-01, immediately — the fleet's Claude seats get a named two-tier rule with a verified 2x price step and a test that fits inside the free window. vork changes nothing yet — it is GPU-gated by the same missing computer that gates yesterday's Unsloth/Qwen test (2026-11-09 PM-02), and the two tests should be staged together when that machine exists: one qualifying GPU box unlocks both the local browser-hands test and the headless-render test, in that order (browser hands first — read-only sweeps are a live, recurring cost; rendering is an expansion).

**Proposed test order:** (1) AM-01 Fable-vs-Opus three-job test — deadline-bound (~Nov 16), zero new hardware. (2) AM-20 vork install + one original formation-diagram scene — staged behind the new-computer need, bundled with the held Unsloth test. (3) Nothing else in this run earns a test; the remaining 18 dossiers are honestly CONTEXT/LEARN-ONLY filings, and forcing tests onto them would be padding.

**Feed pattern:** a launch-dominated morning — AI-tool content clustered at the top (positions 1, 8, 14, 29, 41 are all model/tool posts), sports and local news in the middle band, worship/lifestyle recurring in the 37–61 stretch (Hope City appears three times), and highlight accounts thickening toward the tail. The two gated tool posts of the morning (vork, Astryx) both resolved *without* engaging their gates, which is the no-messaging rule working as designed.

---

## GAP AUDIT

- Total feed items seen: **95** (74 organic + 1 paid partnership + 20 sponsored ads).
- Ads excluded from the count: **20** sponsored ads (recorded by advertiser + offer in the raw inventory; 6 flagged relevant: Runway-in-Claude, CodeRabbit, Granola, Zapier, ChatGPT Business, Klaviyo). The 1 paid partnership (position 74) was counted with the non-ad items for dedup and filed as inventoried.
- Duplicates skipped: **2** (positions 4 and 14, named above with their prior-run locations).
- New posts selected and dossiered: **20** (AM-01–AM-20, feed positions 1–29 subset, first 20 NEW organic in order).
- Posts fully dissected: **40** read in full (the 20 dossiered + 18 inventoried-with-read-notes + the 2 duplicates, which were also opened and read before dedup was applied). Carousel completeness note: the one true carousel in the read set, the duplicate at position 4 (19 slides), was advanced through in full but slides 3–5, 7–10, 12–15, 17–18 were not individually described in separate views — that limitation is the browser worker's own, recorded here rather than smoothed over.
- Posts inventoried-only: **53 of the 73 NEW** (18 with full read notes in the appendix; 35 at feed level), **all 53 saved with shortcodes** — inventoried-with-codes = 53/53 for the inventoried set, and 75/75 for all non-ad items. **No inventory loss this run.**
- Blocked items: **0.** 429 / rate-limit stops: **0.** Feed exhaustion: no — the feed was still loading at position 95. Collections popup: 2 appearances, both dismissed neutrally, nothing saved.
- Spoken-content gap (the run's largest): **all reels in the read set were muted in post view with no transcript**, so spoken content was not transcribed for any of the 40 read posts; several frames also loaded black/blank (AM-07, AM-09, AM-10, AM-11, AM-17, AM-18, AM-20 among them), leaving those dossiers at caption + on-screen-text level, each labeled in place. What would close it: a browser route with audible playback or post-level transcripts, or a vision/audio-capable local read pass (the held Unsloth/Qwen test, 2026-11-09 PM-02, is aimed at exactly this wall).
- Caption truncations: 6 in the read set (positions 2, 5, 8, 31, 40, and 51; filed at visible strength each time).
- Primary sources checked: **5 clusters** — Anthropic Fable 5.2/Opus 5.5 launch record (AM-01), Rieseberg's Saltline posts (AM-05), Voyager's vork project page + makers' write-up + repo record (AM-20), Mercury News Nvidia-theft reporting via multiple outlets (position 51), and the meta/astryx tracker record for the duplicate update (position 14).
- Claims left UNVERIFIED: Saltline's cost/time/token figures (self-reported by an Anthropic employee, unaudited — labeled in AM-05); vork's performance figures (vendor-reported, setup/warmup excluded — labeled in AM-20); Anthropic's benchmark table (vendor-reported — labeled in AM-01); the Braun free-throw streak (no denominator exists in the post — AM-11); the Jefferson/Wentz numbers (in-post broadcast graphic, not checked against an official box score — AM-13); the Zapier ad's savings claim; the 115 MPH exit-velocity claim (position 67); India Mode's premise figures (the post's own — position 34). What would close each: an independent benchmark run (AM-01/AM-05/AM-20 — the §7 tests), an official box-score pull (AM-13), a stats-page pull with attempt counts (AM-11) — all available to a later pass; none was silently upgraded in this one.
- Unresolved items: **1** — India Mode's provenance (no source beyond its own caption link found; filed as a concept sighting, recoverable by its URL in the seen index). The gated vork repo, by contrast, *was* resolved without engaging the gate.
