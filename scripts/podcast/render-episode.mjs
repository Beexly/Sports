#!/usr/bin/env node
/**
 * render-episode — render an approved episode script in the FOUNDER'S voice (POD-01).
 *
 * Step 3 of the podcast pipeline (design:
 * docs/command-center/launch/weekly-podcast-design.md). Founder-invoked ONLY —
 * nothing schedules or auto-runs this. It physically cannot render until the
 * founder has done GA-11 (recorded his 3-15s reference WAV + transcript) and
 * GA-14 (installed NeuTTS Air locally) — when either is missing it exits 0
 * with the exact setup instructions instead of failing or faking.
 *
 * Voice policy (hard line): the ONLY voice this pipeline will ever clone is
 * the founder's own consented reference sample (PODCAST_VOICE_REF). Outputs
 * from NeuTTS Air carry the Perth perceptual watermark — inaudible provenance.
 *
 * Tool: neuphonic/neutts-air (Apache-2.0, ~0.5B Qwen-based + NeuCodec, runs
 * locally on CPU). Reference: https://huggingface.co/neuphonic/neutts-air
 *
 * Usage (from repo root, after founder edit/approval of the script):
 *   node scripts/podcast/render-episode.mjs apps/web/content/podcast/episodes/<date>-draft.md
 *
 * Env:
 *   PODCAST_VOICE_REF       absolute path to the founder's reference WAV (3-15s, mono, 16-44kHz)
 *   PODCAST_VOICE_REF_TEXT  the exact transcript of that WAV (or a path to a .txt containing it)
 *   PODCAST_PYTHON          python executable (default: "python")
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SETUP = `
[render-episode] Not ready to render yet — founder steps remain (by design):

  GA-11  Record your reference voice: 3-15 seconds of clean, continuous,
         natural speech. Mono WAV, 16-44 kHz. Save it and set:
           PODCAST_VOICE_REF=C:\\path\\to\\voice-ref.wav
           PODCAST_VOICE_REF_TEXT="the exact words you spoke in the clip"

  GA-14  Install NeuTTS Air locally (Apache-2.0, runs on CPU, your voice
         never leaves this machine):
           pip install neutts

  CONSENT  Create your voice-consent record (required before any render —
           per GSN_PODCAST_AND_VOICE_SYSTEM.md) and point to it:
           PODCAST_CONSENT_RECORD=C:\\path\\to\\voice-consent.json
           A minimal valid record:
             { "speakerName": "Garrett Baxley",
               "consentScope": "gsn_podcast_only",
               "consentText": "I consent to GSN rendering my own voice from scripts I approve.",
               "approvedVoiceModel": "neuphonic/neutts-air",
               "disclosureRequired": true,
               "createdAt": "<ISO date>" }

  Then re-run:
    node scripts/podcast/render-episode.mjs <path-to-approved-script.md>

  Nothing renders or publishes without you. That is the design.
`;

/**
 * Consent gate (GSN_PODCAST_AND_VOICE_SYSTEM.md): no render without an active
 * consent record for the founder's own voice. Returns null when missing,
 * malformed, out-of-scope, or revoked.
 */
export function loadConsentRecord(recordPath) {
  if (!recordPath || !existsSync(recordPath)) return null;
  try {
    const record = JSON.parse(readFileSync(recordPath, "utf8"));
    if (record.consentScope !== "gsn_podcast_only") return null;
    if (record.revokedAt) return null;
    if (!record.speakerName || !record.consentText) return null;
    return record;
  } catch {
    return null;
  }
}

/** Strip the draft markdown to plain spoken text (headers/meta dropped). */
export function scriptToSpokenText(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let inFrontmatter = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;
    if (trimmed.startsWith("#")) continue; // headings are structure, not speech
    if (trimmed.length === 0) continue;
    // List markers read as sentences.
    out.push(trimmed.replace(/^[-*]\s+/, ""));
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function resolveRefText(raw) {
  if (!raw) return null;
  if (raw.toLowerCase().endsWith(".txt") && existsSync(raw)) {
    return readFileSync(raw, "utf8").trim();
  }
  return raw.trim();
}

function main() {
  const scriptArg = process.argv[2];
  if (!scriptArg) {
    console.log("[render-episode] Usage: node scripts/podcast/render-episode.mjs <approved-script.md>");
    process.exit(0);
  }
  const scriptPath = path.resolve(scriptArg);
  if (!existsSync(scriptPath)) {
    console.error(`[render-episode] Script not found: ${scriptPath}`);
    process.exit(1);
  }

  const voiceRef = process.env.PODCAST_VOICE_REF;
  const refText = resolveRefText(process.env.PODCAST_VOICE_REF_TEXT);
  const consent = loadConsentRecord(process.env.PODCAST_CONSENT_RECORD);
  const python = process.env.PODCAST_PYTHON || "python";

  // No render without voice sample + transcript + an ACTIVE consent record.
  if (!voiceRef || !existsSync(voiceRef) || !refText || !consent) {
    console.log(SETUP);
    process.exit(0);
  }
  console.log(
    `[render-episode] Consent record active for ${consent.speakerName} (scope: ${consent.consentScope}).`
  );

  // Is NeuTTS Air installed? Honest check — never installs anything itself.
  const probe = spawnSync(python, ["-c", "import neuttsair"], { encoding: "utf8" });
  if (probe.status !== 0) {
    console.log(SETUP);
    process.exit(0);
  }

  const spoken = scriptToSpokenText(readFileSync(scriptPath, "utf8"));
  if (spoken.length === 0) {
    console.error("[render-episode] The script contains no spoken text after stripping structure.");
    process.exit(1);
  }

  const outWav = scriptPath.replace(/\.md$/i, ".wav");
  // Per the model card: NeuTTSAir(backbone) + infer(text, ref_audio, ref_text).
  const runner = `
import sys, soundfile as sf
from neuttsair.neutts import NeuTTSAir
text = open(sys.argv[1], encoding="utf-8").read()
tts = NeuTTSAir(backbone_repo="neuphonic/neutts-air-q4-gguf", backbone_device="cpu", codec_repo="neuphonic/neucodec", codec_device="cpu")
ref_codes = tts.encode_reference(sys.argv[2])
wav = tts.infer(text, ref_codes, sys.argv[3])
sf.write(sys.argv[4], wav, 24000)
print("wrote", sys.argv[4])
`;
  const tmp = mkdtempSync(path.join(os.tmpdir(), "gse-podcast-"));
  const runnerPath = path.join(tmp, "render.py");
  const textPath = path.join(tmp, "spoken.txt");
  const refTextPath = path.join(tmp, "ref.txt");
  writeFileSync(runnerPath, runner, "utf8");
  writeFileSync(textPath, spoken, "utf8");
  writeFileSync(refTextPath, refText, "utf8");

  console.log(`[render-episode] Rendering ${path.basename(scriptPath)} in your voice (local, CPU)...`);
  const render = spawnSync(python, [runnerPath, textPath, voiceRef, refTextPath, outWav], {
    stdio: "inherit",
    timeout: 30 * 60 * 1000,
  });
  if (render.status !== 0) {
    console.error("[render-episode] Render failed — see output above. Nothing was published.");
    process.exit(1);
  }
  console.log(`[render-episode] Done: ${outWav}`);
  console.log("[render-episode] Listen to it. If it's right, add the episode to apps/web/content/podcast/manifest.json yourself — publishing is your hand, always.");
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
