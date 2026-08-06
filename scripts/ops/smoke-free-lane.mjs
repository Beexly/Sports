#!/usr/bin/env node
/**
 * Smoke: free-lane + (optional) content generator path.
 *
 * Never commit secrets. Run with env from Vercel Production or local:
 *
 *   CONTENT_FREE_LANE_ENABLED=true \
 *   CEREBRAS_API_KEY=... \
 *   ANTHROPIC_API_KEY=... \
 *   node scripts/ops/smoke-free-lane.mjs
 *
 * Exit 0 = Cerebras path returned text with non-claude modelName.
 * Exit 2 = lane disabled or missing key.
 * Exit 1 = request failed.
 */
import { createRequire } from "node:module";

const enabled = process.env.CONTENT_FREE_LANE_ENABLED === "true";
const cerebrasKey = process.env.CEREBRAS_API_KEY?.trim();
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

if (!enabled || !cerebrasKey) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "free_lane_off",
      hint: "Set CONTENT_FREE_LANE_ENABLED=true and CEREBRAS_API_KEY",
    }),
  );
  process.exit(2);
}

if (!anthropicKey) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "anthropic_missing",
      hint: "ANTHROPIC_API_KEY still required for fallback",
    }),
  );
  process.exit(2);
}

const body = {
  model: process.env.CEREBRAS_SMOKE_MODEL || "gpt-oss-120b",
  max_tokens: 64,
  temperature: 0,
  messages: [
    {
      role: "system",
      content: "Reply with a single JSON object: {\"ok\":true,\"lane\":\"cerebras\"}. No other text.",
    },
    { role: "user", content: "ping free-lane smoke" },
  ],
};

const started = Date.now();
const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cerebrasKey}`,
  },
  body: JSON.stringify(body),
});
const durationMs = Date.now() - started;
const text = await res.text();

if (!res.ok) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "cerebras_http",
      status: res.status,
      durationMs,
      body: text.slice(0, 400),
    }),
  );
  process.exit(1);
}

let modelName = body.model;
try {
  const json = JSON.parse(text);
  modelName = json.model || modelName;
  const content = json.choices?.[0]?.message?.content ?? "";
  const looksClaude = String(modelName).startsWith("claude-");
  console.log(
    JSON.stringify({
      ok: true,
      lane: "cerebras",
      modelName,
      durationMs,
      contentPreview: String(content).slice(0, 120),
      anthropicFallbackRequired: false,
      note: looksClaude
        ? "unexpected claude model id on cerebras endpoint"
        : "free-lane transport healthy — app wire uses generateContentMessages surface=content",
    }),
  );
  process.exit(looksClaude ? 1 : 0);
} catch (e) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "parse",
      durationMs,
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
}

// silence unused in some bundlers
void createRequire;
