#!/usr/bin/env node
/**
 * fish-audio-tts.mjs
 * Fish Audio s2.1-pro-free TTS bridge (free promo through 2026-11-30T23:59:59Z).
 * Gracefully reports status / auth requirement when FISH_API_KEY is absent.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import os from "node:os";

export const FISH_PROMO_CUTOFF_ISO = "2026-11-30T23:59:59Z";
export const FISH_PROMO_MODEL = "s2.1-pro-free";

function resolveFishConfig() {
  let apiKey = (process.env.FISH_API_KEY || process.env.FISH_AUDIO_API_KEY || "").trim();
  let model = (process.env.FISH_AUDIO_TTS_MODEL || FISH_PROMO_MODEL).trim() || FISH_PROMO_MODEL;
  const repoRoot = resolve(
    dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
    "../.."
  );
  const candidates = [
    resolve(repoRoot, ".env.local"),
    resolve(repoRoot, ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
    resolve(os.homedir(), ".hermes/.env"),
    resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData/Local"), "hermes/.env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    if (!apiKey) {
      const m = raw.match(/^(?:FISH_API_KEY|FISH_AUDIO_API_KEY)=(.+)$/m);
      if (m?.[1]?.trim()) apiKey = m[1].trim().replace(/^["']|["']$/g, "");
    }
    const mm = raw.match(/^FISH_AUDIO_TTS_MODEL=(.+)$/m);
    if (mm?.[1]?.trim() && !process.env.FISH_AUDIO_TTS_MODEL) {
      model = mm[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return { apiKey, model };
}

export async function synthesizeBriefAudio({ text, outPath, format = "mp3", model, fetchImpl = globalThis.fetch } = {}) {
  const resolved = resolveFishConfig();
  const apiKey = resolved.apiKey;
  const effectiveModel = model || resolved.model || FISH_PROMO_MODEL;
  const promoActive = Date.now() < Date.parse(FISH_PROMO_CUTOFF_ISO);
  if (!apiKey) {
    return {
      ok: false,
      status: "AUTH_MISSING",
      promoActive,
      model: effectiveModel,
      message: "FISH_API_KEY / FISH_AUDIO_API_KEY not configured; Fish Audio s2.1-pro-free promo active until Nov 30, 2026.",
    };
  }
  const res = await fetchImpl("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model: effectiveModel,
    },
    body: JSON.stringify({ text, model: effectiveModel, format }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Fish Audio HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  return { ok: true, status: "SYNTHESIZED", model: effectiveModel, promoActive, bytes: buf.length, outPath };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--status") || args.length === 0) {
    const resolved = resolveFishConfig();
    const hasKey = Boolean(resolved.apiKey);
    const promoActive = Date.now() < Date.parse(FISH_PROMO_CUTOFF_ISO);
    console.log(JSON.stringify({ provider: "fish-audio", model: resolved.model, promoCutoff: FISH_PROMO_CUTOFF_ISO, promoActive, configured: hasKey }, null, 2));
    return;
  }
  const textIdx = args.indexOf("--text");
  const outIdx = args.indexOf("--out");
  const text = textIdx >= 0 ? args[textIdx + 1] : "Galaxy Sports Edge brief audio check.";
  const outPath = resolve(outIdx >= 0 ? args[outIdx + 1] : "reports/autonomous/brief-sample.mp3");
  const result = await synthesizeBriefAudio({ text, outPath });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok && result.status !== "AUTH_MISSING") process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("fish-audio-tts.mjs")) {
  main().catch((err) => {
    console.error("[fish-audio-tts] FAIL:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
