# NOVA REALISM RESEARCH PACKET — 2026-11-07

Purpose: ground the "Nova natural presence" video lane (Google Flow, Omni 1.2 Flash) in real, verified research — papers, datasets, benchmarks, and books pulled live from the arXiv API, the Hugging Face API, Crossref, OpenLibrary, and the GitHub API on 2026-11-07. Every identifier below was returned by an actual API call in this run. Items that failed verification were discarded, not cited (see Gap Audit — including one whole parse batch whose title/ID pairs did not survive re-verification).

Garrett's brief for this lane: Nova must not look AI. Natural setting, natural crowd, fluid real movement — a college-game-day / hometown tailgate feel (Houston / Texans game as the test scene).

---

## 1. ARCHITECTURE — the Nova video pipeline as prompt layers

Flow (Omni 1.2 Flash) gives us: a text prompt, reusable character/subject ingredients (Nova was built as a character in the Nov 6 Flow project), generated native audio/speech, and ~8s clips. The pipeline is five layers; each layer owns specific prompt language and a specific QA gate. A take is not "done" when it renders — it is done when it passes Layer 5.

### Layer 1 — Scene grounding (where she is must be a real place, not a backdrop)
- Controls: location nouns with specific, lived-in detail (tailgate rows, folding chairs, grills, canopies in team colors, asphalt lot, stadium light towers behind), time of day, weather, light direction.
- Flow terms: front-load the prompt with the environment sentence before the character sentence; name the camera's physical position ("shot from within the crowd, at shoulder height").
- Research basis: VBench-2.0 (arXiv:2503.21755) — modern generators pass surface coherence and fail *intrinsic faithfulness* (physics and commonsense of the scene). Grounding detail is how a prompt buys faithfulness cheaply.
- Failure it prevents: floating "studio void" backgrounds, crowd wallpaper, impossible light.

### Layer 2 — Character consistency (she is the same person every take)
- Controls: Nova's Flow character/subject ingredient on every generation; the face master (`nova-face-master.jpg`) as reference where the UI accepts it; fixed wardrobe anchors per scene (same jersey, same jeans) so identity doesn't drift between clips.
- Flow terms: never generate Nova from text alone when an ingredient exists; one character reference per prompt, not a collage.
- Research basis: AMASS (arXiv:1904.03278) is the standing proof that identity lives in a parametric body model, not in per-frame appearance — the prompt-layer equivalent is: hold the identity anchors constant, vary everything else.
- Failure it prevents: face drift, age drift, "different woman every clip."

### Layer 3 — Motion direction (fluid movement is choreography, not adjectives)
- Controls: verb-level direction with acceleration language — "turns mid-laugh," "weight shifts to one foot," "cup hand changes as she gestures" — plus one secondary motion (breeze in hair, crowd crossing behind). Ban the word "cinematic" as a motion instruction; it buys camera gloss, not body truth.
- Flow terms: one primary action + one secondary motion per 8s clip. Two primary actions is where limb physics breaks.
- Research basis: Beyond MoCap (arXiv:2606.27547) — motion models trained on mocap corpora repeat common actions and fail the long tail; expect Flow to default to stock gestures unless the prompt specifies uncommon, specific ones. RoboWorM (arXiv:2610.33807) — movement realism is scored on consistency and *acceleration profile*, not poses: real limbs ease in and out; AI limbs move at constant velocity.
- Engine-training value: AMASS-class motion statistics (joint speed/acceleration ranges) are the reference distribution any future GSE athlete-motion work also needs.
- Failure it prevents: gesture loops, mannequin turns, constant-speed arms, frozen crowd.

### Layer 4 — Speech (mouths must articulate, not just move in time)
- Controls: one short line per clip (the tailgate test line: "Houston, we're live — let's talk Week 9"); conversational register, contractions, a breath or laugh beat before the line.
- Flow terms: put the spoken line in quotes in the prompt; keep it under ~10 words per 8s clip.
- Research basis: PVSync (arXiv:2610.09223) — lip movement can match speech *timing* while mismatching the actual sounds; PVSync's phoneme/viseme articulation scoring tracks human lip-sync rankings at Spearman 0.83 where the standard LSE-C metric manages 0.34. QA consequence: grade the mouth on *shapes*, not sync. GLARE (arXiv:2609.40317) — in any two-person framing, the non-speaking head must react (nods, smiles, timing-appropriate responses) or the scene reads synthetic.
- Failure it prevents: mumbling mouths, ventriloquist takes, dead-eyed listeners.

### Layer 5 — Realism QA (every take graded against the defect checklist, §3)
- Controls: no take ships on "looks good." Each take is scored against the §3 checklist by a reviewer who did not write the prompt; one failing item = retake with the prompt edited at the layer that owns that defect.
- Research basis: VBench / VBench++ (arXiv:2311.17982 / 2411.13503) decompose "quality" into named dimensions (temporal flicker, motion smoothness, subject consistency, background consistency) — the checklist borrows that decomposition. IsoVRBench (arXiv:2610.17234) warns that preference judgments confound motion with visual fidelity and generator identity — so motion is scored separately, with the sound off and the frame small, before overall polish is judged.
- Failure it prevents: shipping the prettiest take instead of the truest one.

---

## 2. SOURCE TABLE — verified finds

| # | Name | Type | Original source (verified live 2026-11-07) | License / access | Technique or defect-list it contributes | How it changes the next Nova prompt / QA check |
|---|------|------|----------------------------------------------|------------------|--------------------------------------------|--------------------------------------------------|
| 1 | PVSync: A Unified Lip-Sync Expert for Timing and Articulation | Paper | arXiv:2610.09223 — https://arxiv.org/abs/2610.09223 | arXiv open | Lip-sync has two separable failures: offset (timing) and articulation (viseme shape). PVSync matches human quality rankings at ρ=0.83 vs LSE-C 0.34. | QA: grade Nova's mouth per sound class (closed-lip sounds must close), not just "in sync." Prompt: short lines with clear consonants for test takes. |
| 2 | GLARE: Generating Listening Heads with Appropriate Reactions | Paper | arXiv:2609.40317 — https://arxiv.org/abs/2609.40317 | arXiv open | Naturalness in dialogue scenes is a *listener* problem: when to react, how, with what type of response. | Any two-shot or crowd-interaction take: prompt an explicit reaction beat for the other person/Nova-as-listener. QA fails takes where the listener is static. |
| 3 | AnyTalk: Speech Animation for Arbitrary Characters | Paper | arXiv:2608.16143 — https://arxiv.org/abs/2608.16143 | arXiv open | Speech animation can be driven for arbitrary characters without character-specific training data — speech motion is a transferable layer, separable from identity. | Supports the architecture split: fix identity in Layer 2, direct speech in Layer 4, never trade one against the other in a single prompt rewrite. |
| 4 | MoSAT: Human Motion Generation from Spatial Audio and Textual Description | Paper | arXiv:2609.23797 — https://arxiv.org/abs/2609.23797 | arXiv open | Human motion is elicited by the acoustic environment (crowd noise, a shout, music) as much as by intent. | Tailgate prompts name the sound event she reacts to (a cheer swell from the stadium, a friend calling her name) — motion gets a cause. |
| 5 | Beyond MoCap: Scaling Motion Tokenizers with Synthetic Human Motion | Paper | arXiv:2606.27547 — https://arxiv.org/abs/2606.27547 | arXiv open | Mocap-trained motion models over-represent common, repetitive actions and fail the long tail of real behavior. | Prompt specific, uncommon micro-actions (shifting a cup between hands, brushing hair back mid-sentence) instead of generic "talking and gesturing." QA: flag any gesture that repeats identically twice in one clip. |
| 6 | AMASS: Archive of Motion Capture as Surface Shapes | Paper + dataset | arXiv:1904.03278 — https://arxiv.org/abs/1904.03278 | Paper open; dataset research license via MPI (see HF note, row 15) | The unified mocap corpus (SMPL+H parameters) — the reference statistics for real human joint motion. | Reference distribution for Layer 3: real gesture speeds and ranges. Engine-training value: same corpus class feeds athlete-motion modeling for GSE. |
| 7 | Towards Accurate Generative Models of Video: A New Metric & Challenges (the FVD paper, Unterthiner et al.) | Paper | arXiv:1812.01717 — https://arxiv.org/abs/1812.01717 | arXiv open | Fréchet Video Distance: realism is a *distributional* property — a take is real-like if its motion/appearance statistics sit inside the real-video distribution, not if any single frame is pretty. | QA: judge Nova takes side-by-side against a real phone-shot tailgate clip of the same scene class; stills are not evidence. |
| 8 | VBench | Benchmark paper | arXiv:2311.17982 — https://arxiv.org/abs/2311.17982 | arXiv open | Decomposes video quality into named dimensions incl. temporal flickering, motion smoothness, subject consistency, background consistency. | The §3 checklist's structure: score dimensions separately, never one global "realism" gut call. |
| 9 | VBench++ | Benchmark paper | arXiv:2411.13503 — https://arxiv.org/abs/2411.13503 | arXiv open | Extends VBench across generation modes and trustworthiness dimensions. | Adds the trustworthiness pass: does the take misrepresent anything (logos, signage, crowd composition) beyond looking real? |
| 10 | VBench-2.0: Intrinsic Faithfulness | Benchmark paper | arXiv:2503.21755 — https://arxiv.org/abs/2503.21755 | arXiv open | Current models look convincing and temporally coherent while violating physics and commonsense *inside* the scene. | QA item: one physics scan per take — liquid in the cup, cloth in the breeze, shadows agreeing with the sun. |
| 11 | RoboWorM: Evaluating Movement Realism, Consistency and Acceleration | Benchmark paper | arXiv:2610.33807 — https://arxiv.org/abs/2610.33807 | arXiv open | Movement realism is measurable via acceleration profiles; constant-velocity motion is a synthetic tell. | Prompt: give actions an ease ("turns quickly, then settles"). QA: watch hands/head at 2× speed — linear, unmodulated motion fails. |
| 12 | IsoVRBench: Video Reward Modeling Without Human Feedback | Paper | arXiv:2610.17234 — https://arxiv.org/abs/2610.17234 | arXiv open | Human preference scores confound motion quality with fidelity and generator identity (halo effects). | QA protocol: motion scored muted + small-frame first (halo removed), polish scored second. Engine-training value: the same confound warning applies to GSE preference/reward data design. |
| 13 | VOR-Bench: A Human Perception-Driven Benchmark | Benchmark paper | arXiv:2609.16878 — https://arxiv.org/abs/2609.16878 | arXiv open | Traditional metrics misalign with human perception; reference quality itself is questionable in standard benchmarks. | Justifies human grading of Nova takes over any automated score; keep a small set of *real* reference clips as the gold standard. |
| 14 | Media Intelligence Platform: Multimodal Detection of Synthetic and Manipulated Content | Paper | arXiv:2610.27974 — https://arxiv.org/abs/2610.27974 | arXiv open | Detector-side taxonomy: synthetic faces, forged video, fake audio are separate detection surfaces with separate traces. | §3 checklist splits by surface: face / body-motion / audio each get their own pass. If a detector class exists for it, assume the audience's eye has an analog. |
| 15 | realdream-ai/AMASS | Dataset (HF) | https://huggingface.co/datasets/realdream-ai/AMASS — HF API verified: 13,352 downloads, ungated, card license field EMPTY | HF mirror: no license stated on card. Original AMASS is a research-only license via the Max Planck Institute — treat the mirror as learn/reference only until the original license is honored. Status, not verdict. | The mocap corpus itself in HF form (SMPL sequences). | Downloadable reference for motion statistics work on this machine; do not train-and-ship against the mirror without the MPI license step. |
| 16 | luchaoqi/TalkingHeadBench | Dataset (HF) | https://huggingface.co/datasets/luchaoqi/TalkingHeadBench — HF API verified: MIT, 4,682 downloads, size 1K–10K, updated 2026-04-06 | MIT | A talking-head benchmark corpus in dataset form — generated heads organized for evaluation/detection work. | A ready-made "what generated heads look like" reference set for calibrating the §3 face/mouth checks. Engine-training value: benchmark-construction pattern mirrors the fleet's MCP tool-call QA needs. |
| 17 | datapointai/text-2-video-human-preferences-motion | Dataset (HF) | https://huggingface.co/datasets/datapointai/text-2-video-human-preferences-motion — HF API verified: CC-BY-4.0, gated-auto, n<1K, updated 2026-03-31 | CC-BY-4.0 (gated access form) | Human preference pairs specifically over *motion* in text-to-video outputs. | The template for a Nova preference log: pairs of takes, human picks the truer motion. Engine-training value: direct — this is reward-data shape, reusable for GSE ranking QA. |
| 18 | Rapidata/image-to-video-human-preference-seedance-1-pro | Dataset (HF) | https://huggingface.co/datasets/Rapidata/image-to-video-human-preference-seedance-1-pro — HF API verified: Apache-2.0, 831 downloads, n<1K, updated 2026-11-04 | Apache-2.0 | Fresh human-preference pairs for image-to-video (the exact mode used when animating a Nova still/reference). | Closest public preference data to the Flow image→video workflow; use its comparison dimensions when structuring Nova take reviews. |
| 19 | saeed-5959/celebv_hq_head_talking (CelebV-HQ mirror) | Dataset (HF) | https://huggingface.co/datasets/saeed-5959/celebv_hq_head_talking — HF API verified: 5,996 downloads, size 10K–100K, card license field EMPTY | No license stated on the HF card — reference/learn only until the original CelebV-HQ terms are checked. Status, not verdict. | Large high-quality talking-head video corpus — what real talking heads look like at scale. | Real-reference pool for Layer 5 side-by-side grading (the FVD logic, row 7, made practical). |
| 20 | guoyww/animatediff-motion-adapter-v1-5-2 | Model (HF) | https://huggingface.co/guoyww/animatediff-motion-adapter-v1-5-2 — HF API verified: 34,019 downloads, text-to-video motion adapter | Per model card (HF) | Motion is a separable, transferable module (a motion LoRA/adapter) independent of the appearance model — the open-source proof of the Layer 2/Layer 3 split. | Architectural confirmation only (Flow is closed — nothing to install). If a local fallback renderer is ever built, motion adapters are the mechanism. |
| 21 | blazickjp/arxiv-mcp-server | Tool (MCP server) | https://github.com/blazickjp/arxiv-mcp-server — GitHub API verified 2026-11-07 (confirmed on a clean re-call after two earlier calls disagreed): 3,259 stars, 262 forks, license Apache-2.0 (GitHub API value; a Glama listing says MIT — API wins), last pushed 2026-10-08 | Apache-2.0 | MCP bridge to arXiv: search_papers, download_paper, list_papers, read_paper tools. | Fleet-usable: this is how the "arXiv MCP" Garrett named actually exists. Candidate for the fleet MCP bus (port 4311 roster) so future packets like this one are one tool call, not a curl session. TEST before adopting (fleet rule). |
| 22 | Mori, "The Uncanny Valley" (trans. MacDorman & Kageki) | Paper (canonical) | Crossref verified: DOI 10.1109/MRA.2012.2192811, IEEE Robotics & Automation Magazine, June 2012 — https://doi.org/10.1109/MRA.2012.2192811 | Publisher (IEEE) | Near-human is the danger zone: familiarity collapses precisely when a synthetic human is *almost* right — the valley is deepest for moving faces. | Strategic rule for Nova: the tailgate test is the hardest possible setting (real crowd, real light). If a take lands in the valley, change the *shot* (distance, motion, documentary framing), not just the prompt adjectives. |
| 23 | Johansson, "Visual perception of biological motion and a model for its analysis" | Paper (canonical) | Crossref verified: DOI 10.3758/BF03212378, Perception & Psychophysics 14(2):201–211, 1973 — https://doi.org/10.3758/BF03212378 | Publisher (Springer/PsycNET) | Point-light displays: 10–12 joint lights in correct motion read instantly as a living person. Motion alone carries "alive." | The mute test in §3: if Nova's take, watched small and silent, doesn't read as a person *moving like a person*, no amount of texture fixes it. The single cheapest QA gate in this packet. |
| 24 | Rosenhahn, Klette & Metaxas (eds.), *Human Motion: Understanding, Modelling, Capture and Animation* | Book | Crossref verified: DOI 10.1007/978-1-4020-6693-1, Springer Netherlands, 2008 (print ISBN 978-1-4020-6692-4 from the volume's own front matter) | SpringerLink — purchase / institutional access; no legal free full text found | The advanced monograph on motion capture, modelling, and animation across computer vision, graphics, and biomechanics. | The deep reference behind Layer 3 — for when prompt-level motion direction needs real biomechanics (gait, gesture kinematics) rather than vibes. |
| 25 | Gibson, *The Ecological Approach to Visual Perception* | Book | OpenLibrary verified: James J. Gibson, first published 1979, Houghton Mifflin | Publisher reissue (Routledge/Taylor & Francis); library copies | Perception is of *events* and affordances in an ambient optic array — realism lives in the lawful structure of light and motion over time, not in static detail. | Why the packet weights motion and scene physics over skin texture: a pretty frame in an unlawful scene still reads wrong. Layer 1 + Layer 5 doctrine. |
| 26 | Jansson, Bergström & Epstein (eds.), *Perceiving Events and Objects* | Book | OpenLibrary verified: first published 1994, Lawrence Erlbaum Associates | Publisher / library | Contains the first extensive précis of Johansson's 1950 monograph *Configurations in Event Perception* plus four decades of his event-perception papers. | The accessible route to Johansson's full theory (the 1950 original is effectively out of print) — background reading for whoever owns the realism QA gate. |

Supporting verified endpoints (used in this run, available to the fleet):
- **CORE API** — https://api.core.ac.uk/v3 (verified live on a clean re-call: anonymous search returns HTTP 200 with real results — 4,200,503 total hits for "video generation"; no key needed for basic search) — the closest real "papers + full text" API to what "CAGL" was asked to be.
- **Semantic Scholar API** — https://api.semanticscholar.org/graph/v1 (real endpoint; this run's anonymous calls were rate-limited, HTTP 429 — an API key raises the limit) — paper search with fields.
- **Crossref API** — https://api.crossref.org (live; verified both DOIs above).

---

## 3. DEFECT CHECKLIST — grade every Nova take against this

Score each item PASS / FAIL. Any FAIL routes the retake to the owning layer. Motion items are scored first, muted and small (IsoVRBench halo rule).

**Motion (Layer 3)**
1. Constant-velocity limbs — any arm/head movement at unmodulated speed (RoboWorM acceleration tell).
2. Gesture loop — the same gesture repeated identically, or a "stock presenter" gesture set (Beyond MoCap long-tail failure).
3. Point-light test — muted, small: does the movement alone read as a living person (Johansson)? If not, FAIL regardless of texture.
4. Weight and settle — turns and steps end with a settle, not a stop; cups and objects in hand move *with* the hand's physics.
5. Uncaused stillness — anyone in frame frozen while the scene moves (crowd wallpaper).

**Face & speech (Layers 2, 4)**
6. Viseme mismatch — mouth shape wrong for the sound even when timing is right; closed-lip sounds (m, b, p) must visibly close (PVSync).
7. Sync offset — audio leads or trails the mouth by a perceptible step.
8. Listener death — in interaction shots, the non-speaker does not react (GLARE).
9. Valley check — face is near-real but one feature (eyes, teeth, skin specular) is off; a valley FAIL is fixed by reframing the shot, not by adding "photorealistic" to the prompt (Mori).
10. Identity drift — face, age, or hair changes within the clip or against the face master.

**Scene & physics (Layer 1)**
11. Intrinsic-faithfulness scan — one pass looking only for physics/commonsense breaks: liquid, cloth, shadows, reflections, crowd hands (VBench-2.0).
12. Background consistency — signage, faces, and objects in the crowd morph or duplicate between frames (VBench dimensions).
13. Light agreement — one light source story across Nova, crowd, and environment; no glamour key light in a daylight tailgate.
14. Audio surface — crowd noise is a place, not a loop; her voice sits *in* the space (distance, air), not on top of it (Media Intelligence Platform audio-forgery surface).

**Trust (Layer 5)**
15. No invented branding — team logos/colors stay generic-plausible; nothing in frame claims to be real footage of a real event. These clips are promo material, never dressed as captured video (standing video rule).

---

## 4. GAP AUDIT

**arXiv API** — 7 query routes run (talking-head × video generation; human motion synthesis; video benchmark × human preference; deepfake detection × video; temporal consistency; an FVD free-text query; targeted id_list verifications). Returned and used: 14 papers verified by direct id_list or raw-XML inspection (rows 1–14 above, incl. the VBench family). Known losses:
- The FVD free-text query syntax failed (OR-precedence returned book reviews) — replaced by direct id_list verification of arXiv:1812.01717, which succeeded.
- One candidate ID from memory (arXiv:2401.07726) resolved to an unrelated HLS paper — discarded.
- **One full parse batch (8 title/ID pairs incl. items titled "What Is a Good Motion" and "DeeCLIP") FAILED re-verification: the IDs resolve to unrelated papers (planetary physics, 4D segmentation). All 8 discarded, none cited.** This is the provenance rule working as designed.
- Two IDs from the final search parse (arXiv:2610.18485, 2610.09830) did not return in the verification batch — dropped, not cited.

**OpenAlex API** — 3 topic searches attempted (uncanny valley; video realism perception; motion naturalness). **All returned HTTP 429: the anonymous daily budget on this network's shared IP is exhausted ($0 remaining, resets midnight UTC, per OpenAlex's own error body). 0 OpenAlex records verified; no OpenAlex ID or DOI is cited anywhere in this packet.** The two canonical works that would have come from OpenAlex were instead verified via Crossref (rows 22–23). Retry path: re-run the three searches after midnight UTC or with an OpenAlex API key. Status, not verdict.

**"CAGL API"** — **VERDICT: no research-paper/dataset API named CAGL exists, on the evidence available.** What the name actually resolves to (all verified this run):
- OSS Nokalva **CAGL** = Compile-and-Go Library for ASN.1 schemas (oss.com product page) — a telecom protocol compiler API, nothing to do with papers or datasets.
- **CagL** = a Helicobacter pylori protein (Springer Medicine literature).
- **CAGL1** = a Louisiana weather-station code in the Iowa Environmental Mesonet.
- GitHub API search for "cagl api": every repository inspected was unrelated (a tarot app, a Studio Ghibli catalog, personal backend projects); broader "CAGL" searches return place-name noise (Cagliari). No research API among them.
- Nearest-name real libraries: **CGAL** (Computational Geometry Algorithms Library, cgal.org) — real, but geometry, not scholarship; **CDL** (California Digital Library) — a library consortium, but its services are catalogs (Calisphere/UC Library Search), not a papers API.
- Most likely intent, given yesterday's context named it alongside arXiv/OpenAlex/HF: a papers/full-text API. The real services in that slot, all probed live this run, are **CORE** (api.core.ac.uk/v3 — anonymous full-text search verified working, HTTP 200 with results), **Semantic Scholar** (api.semanticscholar.org/graph/v1 — real endpoint, rate-limited at 429 on this run's anonymous calls), and **Crossref** (api.crossref.org — used for both DOI verifications). Recommendation: treat "CAGL" as CORE in future briefs unless Garrett names a different expansion. Nothing was invented to fill this slot.

**Hugging Face API** — Authenticated whoami verified (Garrett's account, Pro). 4 dataset searches (AMASS; human motion; talking head; video benchmark + human preference) returned ~35 dataset IDs; 5 were opened and verified at record level (rows 15–19) and 1 model (row 20). Not opened at record level: the remaining ~29 search hits (incl. ember-lab-berkeley/AMASS_Retargeted_for_G1, 7,006 downloads — a robotics retarget, out of scope for this lane). License gaps honestly flagged in-table: two HF mirrors (AMASS, CelebV-HQ) carry **no license on their cards** — their originals are license-gated research corpora; both are recorded as learn/reference-only status, per the nothing-killed rule.

**Books** — 3 books verified at record level (Crossref DOI for the Springer volume; OpenLibrary records for Gibson 1979 and the 1994 Johansson volume). 1 candidate discarded: a from-memory DOI for Szeliski's *Computer Vision: Algorithms and Applications* (2nd ed.) returned Crossref 404 and OpenLibrary search returned 0 — the book exists, but no identifier in this packet rests on an unverified route to it. Google Books API returned no usable records this run (empty totals). No legal free full text was found for any of the three cited books; routes are publisher/institutional/library, stated in-table.

**Not done / not wired** — This packet is research only: nothing was installed (the arXiv MCP server is a TEST candidate, not adopted), no dataset was downloaded, and no Flow prompt has been rewritten yet. The next step the packet enables: rebuild the Nova tailgate test prompt layer-by-layer per §1 and grade the take against §3.

**Verification note (added on a late-arriving duplicate result, 2026-11-07):** two invocations of the same GitHub/CORE/Semantic Scholar probe returned materially different values during this run (the same failure mode as the discarded arXiv parse batch). The three contested items were re-called cleanly, saved to disk, and parsed from the files: the arXiv MCP repo stats in row 21 (3,259 stars / 262 forks / pushed 2026-10-08), CORE's anonymous-search status (works, HTTP 200), and Semantic Scholar's status (429 rate-limited) are the re-verified values now in this packet. Lesson recorded for the fleet: any number that matters gets a second, file-backed call.

*Compiled 2026-11-07. All API calls were live in this run; counts and statuses are as observed at call time.*
