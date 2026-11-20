#!/usr/bin/env node
/**
 * nanogpt-subscription-monitor.mjs
 *
 * Monitors NanoGPT Pro prepaid subscription (Cancels 2026-12-05):
 * - 60,000,000 Weekly Included Input-Token Units (resets Sunday 18:00 CT)
 * - 100 Daily Included Images (resets daily 18:00 CT)
 * - Fail-closed endpoint lock: https://nano-gpt.com/api/subscription/v1 (never PAYG /api/v1)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import os from "node:os";

export const NANOGPT_SUB_CUTOFF_ISO = "2026-12-05T00:00:00Z";
export const NANOGPT_SUB_BASE_URL = "https://nano-gpt.com/api/subscription/v1";
export const NANOGPT_USAGE_URL = "https://nano-gpt.com/api/management/v1/subscription/usage";
export const WEEKLY_INPUT_TOKEN_LIMIT = 60_000_000;
export const DAILY_IMAGE_LIMIT = 100;

function resolveNanoGptKey() {
  if (process.env.NANOGPT_API_KEY?.trim()) return process.env.NANOGPT_API_KEY.trim();
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(os.homedir(), ".hermes/.env"),
    resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData/Local"), "hermes/.env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(/^NANOGPT_API_KEY=(.+)$/m);
    if (m?.[1]?.trim() && !m[1].trim().startsWith("#")) {
      return m[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

export async function getNanoGptSubscriptionStatus({ env = process.env, nowMs = Date.now(), fetchImpl = globalThis.fetch } = {}) {
  const apiKey = env.NANOGPT_API_KEY || resolveNanoGptKey();
  const cutoffMs = Date.parse(env.NANOGPT_SUBSCRIPTION_CUTOFF || NANOGPT_SUB_CUTOFF_ISO);
  const activeWindow = nowMs < cutoffMs && String(env.NANOGPT_DISABLED ?? "false").toLowerCase() !== "true";
  const daysRemaining = Math.max(0, Number(((cutoffMs - nowMs) / 86_400_000).toFixed(2)));

  const baseStatus = {
    provider: "nanogpt-pro-sub",
    endpoint: NANOGPT_SUB_BASE_URL,
    cancelsAt: NANOGPT_SUB_CUTOFF_ISO,
    activeWindow,
    daysRemaining,
    weeklyInputUnitLimit: WEEKLY_INPUT_TOKEN_LIMIT,
    dailyImageLimit: DAILY_IMAGE_LIMIT,
    configured: Boolean(apiKey),
  };

  if (!apiKey) {
    return {
      ...baseStatus,
      status: "AUTH_KEY_NEEDED",
      message:
        "NanoGPT Pro prepaid subscription active until 2026-12-05 (0 / 60,000,000 weekly units, 0 / 100 daily images). Drop NANOGPT_API_KEY into %LOCALAPPDATA%\\hermes\\.env to enable automated /api/subscription/v1 dispatch.",
    };
  }

  try {
    const res = await fetchImpl(NANOGPT_USAGE_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return { ...baseStatus, status: `HTTP_${res.status}` };
    }
    const usage = await res.json();
    const weeklyUnitsUsed = Number(usage?.weeklyInputUnits ?? usage?.weekly_input_units ?? 0);
    const dailyImagesUsed = Number(usage?.dailyImages ?? usage?.daily_images ?? 0);
    const weeklyQuotaExceeded = weeklyUnitsUsed >= WEEKLY_INPUT_TOKEN_LIMIT;
    const dailyImageQuotaExceeded = dailyImagesUsed >= DAILY_IMAGE_LIMIT;
    return {
      ...baseStatus,
      status: weeklyQuotaExceeded || dailyImageQuotaExceeded ? "QUOTA_CEILING_REACHED" : "ACTIVE_OK",
      weeklyQuotaExceeded,
      dailyImageQuotaExceeded,
      usage,
    };
  } catch (err) {
    return {
      ...baseStatus,
      status: "UNREACHABLE",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function generateSubscriptionImage({ prompt, outPath, model = "hidream", fetchImpl = globalThis.fetch } = {}) {
  const apiKey = resolveNanoGptKey();
  if (!apiKey) {
    return { ok: false, status: "AUTH_KEY_NEEDED", message: "NANOGPT_API_KEY required for daily 100-image quota." };
  }
  if (Date.now() >= Date.parse(NANOGPT_SUB_CUTOFF_ISO)) {
    throw new Error("NANOGPT_EXPIRED: Blocking post-Dec-5 image call to avoid PAYG charge.");
  }
  const res = await fetchImpl(`${NANOGPT_SUB_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, n: 1 }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`NanoGPT subscription image HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }
  const payload = await res.json();
  const b64 = payload?.data?.[0]?.b64_json;
  if (outPath && b64) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, Buffer.from(b64, "base64"));
  }
  return { ok: true, model, outPath: outPath || null, url: payload?.data?.[0]?.url || null };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--status") || args.length === 0) {
    const st = await getNanoGptSubscriptionStatus();
    console.log(JSON.stringify(st, null, 2));
    return;
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("nanogpt-subscription-monitor.mjs")) {
  main().catch((err) => {
    console.error("[nanogpt-subscription-monitor] FAIL:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
