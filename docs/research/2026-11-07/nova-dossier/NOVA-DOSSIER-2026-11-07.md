# NOVA DOSSIER — 2026-11-07

**The single pickup document for Nova, the face and on-camera host of Galaxy Sports Edge (GSE).**
Any agent should be able to pick Nova up cold from this file: who she is, what is locked, how she is produced, what state everything is in, and what is pending. Read this first; the companion files in this folder carry the full source documents.

- **Status date:** 2026-11-07 (America/Chicago)
- **Author:** Motif (orchestration seat), from Garrett Baxley's standing record and the 2026-11-07 production runs
- **Canonical statement:** THIS DOSSIER IS CANONICAL for Nova the persona. It supersedes two conflicting documents already on `main` — `data/content-os/creators/NOVA_SOUL.md` and `docs/nova-production-spec.md` — whose Nova (identity / voice / palette) conflicts with Garrett's locked Nova below. That conflict has been on file since 2026-10-31 and is unresolved on main; until Garrett rules on those files, treat this dossier + the bible as the truth and those two files as stale. (Note: the repo also contains a separate software system that shares the name "Nova" — `apps/web/lib/nova/`, `scripts/nova/`, the convergence inventories. That is engine/agent infrastructure, NOT this persona. Do not mix them.)
- **Companion files in this folder** (`docs/research/2026-11-07/nova-dossier/`, branch `motif/nova-dossier-2026-11-07`):
  1. `NOVA-DOSSIER-2026-11-07.md` — this file
  2. `persona-nova-bible.md` — the bible, §§1–57, verbatim (the full design + decision history)
  3. `VOICE-LOCK.md` — the voice lock with its §45 amendment and §47 superseding decision, verbatim
  4. `personality-spec.md` — personality spec v1.1, verbatim
  5. `NOVA-UPDATE-V2-2026-11-07.md` — the Nov 7 prompt-architecture update (frozen identity block, motion beats, de-polish grade, route findings), verbatim
  6. `NOVA-REALISM-RESEARCH-PACKET-2026-11-07.md` — the realism research packet + 15-point defect checklist every take is graded against, verbatim

---

## 1. Who she is

Nova is GSE's AI host and the face of the brand: a woman in her late 20s (the bible says 28; the Soul Cast build describes her as 30 — the dossier keeps both numbers visible rather than silently picking one) who fronts the product — board presenter, roundup host, one of the two debate voices — because a person on camera carries the brand better than a logo or a founder's face. Garrett's bar (bible §21/§38): she is a **real person, every time** (bible §52/§53, HARD) — not a stills-plus-voiceover puppet, not a slideshow. Her credibility engine is radical record honesty: she only ever reports results the brand actually had, losses in the same register as wins, and she answers straight — smiling, no defensiveness — if anyone asks whether she is AI. She is. That disclosure is part of her charm, never a confession.

Personality (personality-spec v1.1, from @yung.planet / Mars as primary source): **dark look, warm person.** Gothic-alt styling carries a bubbly, quick-to-laugh, openly warm delivery. She talks TO the viewer, in short declarative bursts and staccato triplets, dry understatement on losses, one vivid concrete image per piece, numbers plain and honest — units, never dollars — and "no bet" said with the same energy as a pick. She has takes on teams, players, and coaches; she never claims a personal history she doesn't have ("the numbers do the thinking; she does the telling"). Settings are visual only — she never narrates where she is or claims to live anywhere shown on screen (bible §43).

## 2. The north star — Garrett's stated vision (2026-11-07 15:02 CT)

> Garrett's framing, in his words: the design archetype is **JARVIS (Iron Man) / Alfred (Batman)** — "the hyperintelligent support agent you talk to who can do anything, anticipates and supports, basically a human who is not physical." Nova is **the face of that kind of intelligence for GSE**. His full statement of the target (2026-11-07 ~15:00 CT): "a living, breathing, thinking, learning [character] that evolves and grows and learns and supports and helps" — the mind, the personality, the reasoning, the movement, the processing, and **empathy** ("for me, empathy is huge… meeting somebody wherever they're at in the conversation"), inflection, and real two-way conversation, in writing as much as in speech.

This is the direction of travel for everything in §9: Nova is being built from a content presenter toward that archetype — a persistent, learning, empathetic intelligence with a face. A deep-research run covering exactly this archetype (persona and character in language models, spoken-language science, empathy and anticipation, memory/growth, long-term trust, TTS femininity/prosody data, dialogue craft, trait-based character design, training datasets) is running now (see §9a); its findings will extend this dossier when they land.

## 3. Design lock (identity — frozen; bible §2 + v1.1 amendments)

This block is the recreation recipe. It goes FIRST, verbatim, in every generation prompt (NOVA-UPDATE-V2 §2), and identity descriptors are never varied — only outfit, setting, action, expression vary.

- **Face:** oval face, strong-soft jaw, full lips, dark brown eyes, **heavy black eyeliner (signature)**, dark brows
- **Marks:** nose ring in the **LEFT** nostril; small beauty mark below the **LEFT** eye
- **Hair:** black, long, middle part, loose waves; **deep-plum streak on the RIGHT side**; straight-across fringe (v1.1)
- **Build:** athletic-curvy; warm tan skin with real texture
- **Tattoo map (fixed placements — drift is the #1 AI-influencer tell):**
  - LEFT forearm: full sleeve, snake winding through roses (signature)
  - Right collarbone: script "watch the tape"
  - Right wrist: crescent moon + star (brand mark)
  - Left ankle: tiny dice pair
  - Neck moth + left-hand finger tattoos (v1.1)
- **Wardrobe palette:** black / charcoal / deep plum; vintage band tees, fitted blazers; team color as ONE accent item on game days only
- **Signature jewelry:** chunky silver chain necklace

## 4. Voice — RECONCILED STATE (read this before generating any audio)

**⚠ The top of VOICE-LOCK.md does NOT govern. The governing text is at the BOTTOM of that file.** The lock evolved in one day (Oct 28, 2026) and the file was never re-headed:

1. **Oct 28, 10:41 CT — original lock:** Callirrhoe (Google AI Studio, Gemini Flash TTS), style text = "lower warm alto, relaxed and confident… a little smoky and raspy, not bright, not bubbly cheerleader, not an announcer, no sales voice." Canonical takes: `voice/locked/callirrhoe-{reveal,loss,board}-canonical.wav`.
2. **Oct 28, 13:52 CT — §45 AMENDMENT (bible §45):** Garrett: the voice "doesn't fully fit our girl. She needs to be a bit more bubbly" + "more inflection — more changes in tone." The guardrail had flattened her. Style text REPLACED with: *"A real woman in her late 20s recording a casual TikTok: warm alto with a bubbly streak, genuinely happy to be talking to you, lots of natural inflection — her pitch rises and falls as she talks, emphasis landing on different words, playful and expressive, natural pauses and breaths, a little smoky underneath, conversational. Bubbly but real — never a fake cheerleader, never an announcer, no sales voice."*
3. **Oct 28, 14:07 CT — §47 SUPERSEDING DECISION (bible §47):** Garrett heard the A/B (Callirrhoe vs Zephyr, both under the amended style) and picked **Voice B — Zephyr**. **PRODUCTION VOICE = Zephyr + the §45 amended style text, pasted verbatim every generation.** Callirrhoe is RETIRED as the production voice; its canonical takes stay on file as history only. `personality-spec.md` §8 still says "Callirrhoe" — it predates §47 and is stale on this point.

**Production route (unchanged by §47):** Google AI Studio UI on Garrett's Google sign-in (https://aistudio.google.com/generate-speech), Gemini Flash TTS (the lock file names it "Gemini 3.8 Flash TTS" / gemini-3.8-flash-tts), single speech block, Speaker 1 only, free UI, no API key. QA before delivery: ffprobe duration + spot transcription; a drifted take is regenerated, never shipped.

**⚠ KNOWN DRIFT — 2026-11-07 takes (flagged, correction in flight):** all three Higgsfield videos produced on Nov 7 (presenter, golden-hour, rugged) carry audio generated with **Callirrhoe + the ORIGINAL (pre-§45) style text** and the old script — i.e., the retired recipe, not the §47 production voice. This was process drift, caught on review. A correction A/B is in flight (Nov 7): **Script A** rendered as (i) Callirrhoe + current style and (ii) Callirrhoe + adjusted-feminine style; **Script B** rendered as Zephyr + adjusted style. The three A/B WAVs have landed in `voice/candidates/`: `scriptA-callirrhoe-current-style.wav`, `scriptA-callirrhoe-adjusted-feminine.wav`, `scriptB-zephyr-adjusted-feminine.wav` — awaiting Garrett's ear. **Garrett's Nov 7 voice direction: slightly MORE FEMININE.** No video should be re-run with voice until Garrett picks from the A/B; when he does, VOICE-LOCK.md gets a new dated amendment and this dossier gets updated.

**Closed voice lanes, do not re-offer:** Kokoro (Bella/Sarah), Grok built-ins (Ara/Eve/Aurora/Luna), OpenRouter (Coral/Shimmer), Qwen (Cherry/Serena), Gemini Aoede, Sulafat (lost the §47 tiebreak process), Despina, Kore. A local Chatterbox build exists only as a possible future owned-voice hedge (personality-spec §8); it is not her voice and must never be silently substituted.

## 5. Production routes (verified 2026-11-07)

### 5a. Higgsfield Soul — her REPORTER / presenter route (primary)
- Character: **Soul character, Element ID `fe7f414f-aef3-4e55-9ee2-813e1d0bf0ba`** (Soul 2.0; trained Oct 27–28, bible §19/§30)
- Account: **@brutalistplanet1398, Plus Plan**, Google OAuth under baxley.garrett@gmail.com. Garrett bought a one-month subscription Nov 7 and signed in himself (13:04 CT); payment-failed banner gone, no payment wall.
- Route: the signed-in **WEB account** → My Elements → the Nova character → "Generate video element" (160 credits/run). Her voice WAV is attached in the flow via **Add voice → Upload audio**.
- **Motif-side Higgsfield API key is DEAD (401 since 2026-10-31)** — do not build on the API route; a working credential exists on Garrett's Windows side (Hermes). The web account is the working route.
- **Balance after Nov 7's three runs: 698 credits** (1,178 → 1,018 → 858 → 698; each run 160).

### 5b. Google Flow (Gemini Omni) — candid fan/social texture ONLY
- Flow **blocks the broadcaster/presenter role** for her — proven by elimination on Nov 7 (removal ladder, NOVA-UPDATE-V2 §7/§9): spoken AND silent presenter takes refused ("reputational risk or misrepresent current events," refunded), while the same woman as a **fan** at a fictional tailgate rendered on the first ladder step. Face, photorealism, and a central person are all fine in Flow once the presenter role is removed.
- Standing division: **Flow = candid fan/social moments. Higgsfield = reporter pieces (her actual job).**
- Flow state: project "Nov 06 - 02:43" (ID 8ed2deb4-4dea-4685-bff2-ab70d085ad4e), Ultra tier; balance 24,906 credits after Nov 7 diagnostics (reset Dec 5). Nova character exists there with nova-face-master.jpg as ingredient; an Aoede voice was attached in Flow during testing (not her production voice — see §4).

### 5c. Driven motion (prepared, not launched)
- Wan-Animate / AnimateAnyone class = performance transfer: needs a driving video, ~80GB-class VRAM — **not viable on current hardware** (fleet dissection 2026-10-28/29). Do not re-propose as "the fix" without that caveat.
- Prepared fallback: **EchoMimicV3 (still + audio) + LatentSync**, runbook at `personas/nova/motion/RUNBOOK.md` (local). Never launched.

### 5d. Identity lock (LoRA)
- Per the repos read Nov 7 (metrosir rule 1): a character-specific LoRA is the only reliable identity lock; prompting alone drifts. A Flux LoRA setup exists at `personas/nova/lora/` (local): `nova_flux_lora.yaml`, `train_nova_lora.py`, `RUNBOOK.md`, `dataset-staging/` (captioned stills nova01–nova14+ with MANIFEST.md). Bible §46 records a Kaggle training launch on Oct 28; **the trained model's current status is UNVERIFIED** — nobody has confirmed an artifact, its quality, or where it lives. Named gap (§9d).

## 6. How a piece is made (cold-start recipe)

1. **Prompt assembly** (NOVA-UPDATE-V2): frozen identity block (§3) FIRST, verbatim → variable slots {outfit} / {setting} / {action beats} / {expression} → concrete motion beats, never adjectives (§7 below) → de-polish grade block (§7) → avoid list travels inside the prompt pack.
2. **Shot rules:** medium shot default, face clear; 9:16 for social, 16:9 only for set/host pieces; one light-source story across Nova, crowd, and environment.
3. **Voice:** generate the line in AI Studio per §4 (Zephyr + §45 style, once Garrett rules on the pending A/B), download the WAV, attach it in the Higgsfield flow via Add voice.
4. **Generate** on the route that fits the format (§5): reporter → Higgsfield; candid fan → Flow.
5. **Grade** the take against the realism packet's 15-point defect checklist, motion first, muted and small (companion file 6).
6. **Hold for Garrett.** Nothing Nova posts without Garrett approving the specific piece (§8). Ever.

## 7. Garrett's standing format rulings (2026-11-07 — all standing)

- **Natural settings, never studio.** Game-day / tailgate / college-football environments. (The one studio take, §8, was rejected on exactly this.)
- **The rugged iPhone look is the football-setting format:** shot on a phone, handheld micro-shake, wind and real movement in frame, imperfect focus, natural light only, darker contrast, visible grain, real skin texture, muted colors, slightly imperfect framing. Standing root verdict (Nov 7, ~12:07 CT): output has been "still too polished, almost too HD" — LESS polished is the direction.
- **No camera push-in at the end; no subject stepping into the lens.** (Nov 7, 14:59 CT — take 2's ending hyper-focus is the anti-pattern.)
- **Motion is beat-based:** starts mid-laugh at an off-camera comment → turn to camera ending in a settle, not a stop → half-step with visible weight shift → line delivered with ONE small gesture → hair/fabric keep moving → ends on a grin, still breathing, **no freeze-frame ending**.
- **"Let's eat" is BANNED as a script line** (Nov 7, 14:59 CT — Garrett: "god awful"; a woman saying it doesn't work, and it wouldn't work from him either). It appears in the Nov 7 takes' audio and in the retired Update-v2 sample line — historical record only, never write it again.
- **Nothing posts without Garrett's approval of the specific piece** (standing since Oct; restated Nov 7, 13:53 CT). Engagement content is separately approved; Nova is not covered by blanket approvals.

## 8. Takes inventory — 2026-11-07 (all local, all HELD, nothing posted)

Local home: `~/workspace/gse-content-os/personas/nova/` (Motif's VM — see §10; media does not live in this repo).

| File | Route | What it is | State |
|---|---|---|---|
| `nova-higgsfield-presenter-1.mp4` | Higgsfield Soul | Studio presenter take, dark backdrop, SILENT (no voice attached) | **REJECTED by Garrett** (studio ≠ spec) |
| `nova-higgsfield-gameday-report-1.mp4` | Higgsfield Soul | Outdoor college game-day report, golden-hour light, Callirrhoe voice (drifted recipe, §4) | Held for Garrett |
| `nova-higgsfield-gameday-report-2-rugged.mp4` | Higgsfield Soul | Same report, rugged iPhone grade: overcast, wind, imperfect focus | Held for Garrett — **the format direction** |
| `nova-v2-tailgate-fan.mp4` | Flow | Candid fan moment (removal-ladder step 1), silent, 720p 8s, 24 credits | Diagnostic/proof take |
| `nova-test-a-fictional-bar.mp4` | Flow | Diagnostic: Nova alone, fictional neon sports bar — rendered | Diagnostic |
| `nova-test-b-houston-crowd.mp4` | Flow | Diagnostic: Houston tailgate crowd, no central character — rendered | Diagnostic |

**Known defects across the Higgsfield takes (Motif frame grades, Nov 7):**
- Plum streak and straight-across fringe **do not read** in the Higgsfield takes (identity holds on face + chain; hair reads as plain dark waves).
- Tattoo placement/design drifts: presenter take put a floral-looking tattoo on her RIGHT arm (lock = LEFT forearm sleeve); the rugged take's hair-push-back beat shows the forearm sleeve as colorful/mandala-leaning rather than snake-through-roses.
- A small lavalier mic appears on her blazer in the Higgsfield takes — reads reporter-authentic; currently accepted texture, not a defect to fix unless Garrett says so.
- Take 2 (golden-hour) ends with the push-in/step-in Garrett banned (§7). Rugged take's light and focus are the closest to spec so far.
- Audio on both report takes = retired Callirrhoe recipe + banned line (§4, §7) — **neither report take can post as-is** regardless of visuals.

Earlier media (Oct 27–28): stills and batches live locally — `nova-face-master.jpg` (the master reference), `training-stills/` (3), `expansion-gemini/` (21 files), `portraits/`, `portraits-v2/`, `portraits-v4/`, `tonight-2026-10-28/` (25 files), `salvaged-2026-10-28/` — plus the Oct 28 motion tests under `motion/`. Full media index: §10.

## 9. Pending items (with owners)

- **(a) Deep research — AI personality / humanization** (owner: Motif research lane; RUNNING as of Nov 7 ~15:00 CT). Scope per Garrett's Nov 7 order: not scripts only — "anything and everything that's making them real": the mind, personality, reasoning, movement, processing, **empathy**, inflection, two-way conversation, a character that maintains itself, evolves, grows, learns, supports, helps (§2). Primary sources only (books, PDFs, arXiv, Kaggle, OpenAlex, universities), hard data, provenance traced to origin. Deliverable: ONE document + a resulting **script+voice+character spec** that gets added to this dossier folder when it lands. Also PENDING with it: Google Drive upload of this dossier + research-library placement of the research document (Drive happens when the research deliverable lands).
- **(b) Voice A/B correction** (owner: Garrett's ear; takes generated by Motif). Three WAVs in `voice/candidates/` (§4). On his pick: VOICE-LOCK.md amendment + dossier update + re-run of the held report takes with the corrected voice and a clean script.
- **(c) Repo conflict** (owner: Garrett's ruling). `data/content-os/creators/NOVA_SOUL.md` and `docs/nova-production-spec.md` on main conflict with the locked Nova (§0). This dossier is canonical meanwhile; the two files need Garrett's word to fix, retire, or re-point at this dossier. Not edited by this push.
- **(d) LoRA status verification** (owner: Motif, unassigned date). Training assets exist locally (§5d); whether a trained Nova LoRA exists and works is unverified. Closing this = locating the Oct 28 Kaggle run's artifact and test-rendering against the frozen identity block.
- **(e) Remaining repo-study reads** (owner: Motif). From NOVA-UPDATE-V2 §8: content-level reads of DaanKieft/ai-influencer and RetroNyym/r-ai-influencer still owed; Higgsfield prompt skill + YouMind Seedance library were applied from prior dissections, not re-read Nov 7.
- **(f) Personality source #2** (owner: Garrett). "notthatgirl" is a named second personality source whose account the corpus does not hold (personality-spec §8); the spec gets a revision pass when he supplies it.
- **(g) Manifesto re-record** (owner: Motif, gated on (b)). Bible §47/§50/§51: the launch manifesto re-records chunked under Zephyr as v5 once the voice settles.

## 10. Where everything lives

- **This dossier (repo):** Beexly/Sports, branch `motif/nova-dossier-2026-11-07`, folder `docs/research/2026-11-07/nova-dossier/` (6 files, §0). Merges to main are Garrett's gate.
- **The bible (source of truth, full history):** local `~/workspace/gse-money-prep/persona-nova-bible.md` (§§1–57) + verbatim copy in this folder.
- **Nova's home (local, Motif's VM):** `~/workspace/gse-content-os/personas/nova/` — **~1.8 GB, 225 media files** (mp4/jpg/png/wav/mp3). Media does NOT go to the repo; this dossier + the index below is the map. Key subfolders: `voice/` (VOICE-LOCK.md, `locked/` canonical takes, `candidates/` incl. today's A/B), `lora/`, `motion/` (EchoMimicV3 runbook + Oct 28 tests), stills/portrait folders (§8), `diagnostic/`.
- **Research docs (local originals):** `NOVA-UPDATE-V2-2026-11-07.md`, `NOVA-REALISM-RESEARCH-PACKET-2026-11-07.md`, `AI-CHARACTER-REPOS-2026-11-07.md` (+ RAW/RAW2 sweep files), `launch-test-package.md` — all in Nova's home; the two Nov 7 docs are copied into this folder.
- **Fleet note:** `~/workspace/vendor/agent-bus/outbox/from-motif/NOVA-DOSSIER-NOTE-2026-11-07.md` points every agent here.
- **Daily record:** `~/memory/2026-11-07.md` carries the day's full Nova run log (Flow wall, removal ladder, Higgsfield reopening, takes, rulings, this dossier).
- **Google Drive:** dossier + research library placement PENDING (§9a) — lands with the deep-research deliverable.
- **Accounts (identifiers only, no credentials anywhere in this dossier):** Higgsfield @brutalistplanet1398 (Google OAuth, baxley.garrett@gmail.com); Google Flow/AI Studio under the same Google account (Ultra tier). Credential VALUES are never written to repo, bus, or memory — Secure Vault / destination-side use only.

## 11. Rules that bind every agent working on Nova

1. Nothing Nova posts without Garrett approving the specific piece.
2. Zephyr + the §45 style text is the production voice (§4) — if a take's audio says otherwise, it is drift; stop and flag.
3. The frozen identity block (§3) leads every prompt, verbatim; identity descriptors never vary.
4. Rugged iPhone format for football settings; no end push-in; no stepping into the lens; no studio.
5. "Let's eat" never appears in a Nova script again.
6. She only reports the brand's real graded record; losses get the same register as wins; she answers straight about being AI.
7. Verify in the artifact: a module, take, or training run is "done" only when its output has been read in the actual file/frame — never from a claim, a filename, or a commit title.
