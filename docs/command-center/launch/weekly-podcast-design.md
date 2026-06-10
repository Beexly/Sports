# Weekly Podcast — design (founder ask, 2026-06-10)

**The show:** a weekly episode in Garrett's own voice, scripted from the platform's REAL week: the graded record (wins AND losses — trust-first), the pass-list discipline, what moved, the coming slate's posture. Working title placeholder: *The Galaxy Brief — Weekly* (naming = founder, GA-12).

**The tool (R&D'd):** [neuphonic/neutts-air](https://huggingface.co/neuphonic/neutts-air) — Apache-2.0, 0.5B Qwen-based TTS + NeuCodec, runs locally on CPU (GGML/llama.cpp or `pip install neutts`). Voice cloning from a 3–15s clean mono WAV + its transcript. Outputs carry the Perth perceptual watermark (inaudible provenance — a feature for us, not a bug).

## The pipeline (each step gated where it must be)
1. **Script draft (auto, weekly):** `scripts/podcast/generate-episode-script.mjs` composes the episode script from real DB data (settled picks, pass list, calibration state) through the content-engine posture: **status=DRAFT, banned-phrase compliance BLOCKER, engine never publishes.** No win-rate claim enters a script unless the calibration report supports it (the same rule as everywhere).
2. **Founder edit (the voice of the show is HIS):** Garrett rewrites/approves the script — his words, his judgment. The draft is raw material, exactly per the brand directive.
3. **Render (founder-gated by nature):** `scripts/podcast/render-episode.mjs` shells to the locally-installed NeuTTS Air with `PODCAST_VOICE_REF` (his WAV) + `PODCAST_VOICE_REF_TEXT`. If the model or the reference sample is absent, it exits with honest setup instructions — it can never render without his voice sample existing.
4. **Approve + publish (manual, always):** Garrett listens, then publishes — episode lands in the manifest; the RSS route serves it. **No autonomous publishing, ever** (hard line).

## What ships in code now (inert/gated)
- The script generator (real data, DRAFT-only, compliance-scanned).
- The render runner (honest-exit without model+sample; never auto-runs).
- `app/podcast/rss.xml` route + minimal episodes manifest — **gated `PODCAST_ENABLED` default-OFF, 404 until flipped**; feed metadata includes the platform-appropriate synthetic-media flags when required (see GA-13).
- A `/podcast` page stub behind the same flag (episode list + player), matured design tokens.

## GARRETT_ACTIONS additions
- **GA-11:** record the reference voice — 3–15s clean, mono, continuous natural speech WAV + exact transcript (~10 min incl. retakes). This is THE key to the whole pipeline.
- **GA-12:** name the show + pick the weekly cadence/day (~5 min).
- **GA-13:** platform policy pass before first publish — Spotify/Apple synthetic-content metadata requirements for own-voice clones (~20 min, one-time).
- **GA-14:** install NeuTTS Air locally (`pip install neutts` or llama.cpp GGML; ~15 min) — kept human because it's an environment install on the credentialed box (doctrine: no autonomous installs).

## Integrity notes (the lines that keep this safe)
- **Own voice only, with consent** — the only voice this pipeline will ever clone is the founder's own reference sample. No third-party voice, ever.
- Words are founder-approved before render; audio is founder-approved before publish (draft-only end to end).
- Watermarked outputs = provable provenance if ever questioned.
- No accuracy claims in any episode beyond what `_launch/CALIBRATION_REPORT.md` supports.
