#!/usr/bin/env node
/**
 * neon-branch-hygiene.mjs
 *
 * Read-only audit of Neon project `summer-brook-99380762` branches.
 * Flags stale/idle non-primary branches over threshold without deleting anything.
 */
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";

const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID || "summer-brook-99380762";
const IDLE_DAYS_THRESHOLD = Number(process.env.NEON_IDLE_BRANCH_DAYS || 7);

function resolveNeonApiKey() {
  if (process.env.NEON_API_KEY?.trim()) return process.env.NEON_API_KEY.trim();
  if (process.env.NEON_API_TOKEN?.trim()) return process.env.NEON_API_TOKEN.trim();
  const localAppData = process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData/Local");
  for (const p of [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps/web/.env.local"),
    resolve(os.homedir(), ".hermes/.env"),
    resolve(localAppData, "hermes/.env"),
  ]) {
    if (!existsSync(p)) continue;
    const m = readFileSync(p, "utf8").match(/^NEON_API_(?:KEY|TOKEN)=([^\r\n]+)/m);
    if (m?.[1]?.trim()) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

async function main() {
  const apiKey = resolveNeonApiKey();
  if (!apiKey) {
    console.log(JSON.stringify({ ok: false, status: "NEON_API_KEY_MISSING", projectId: NEON_PROJECT_ID }, null, 2));
    return;
  }

  const res = await fetch(`https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.log(JSON.stringify({ ok: false, status: `HTTP_${res.status}`, projectId: NEON_PROJECT_ID }, null, 2));
    process.exit(1);
  }
  const data = await res.json();
  const branches = data?.branches || [];
  const nowMs = Date.now();
  const flaggedIdle = [];
  for (const b of branches) {
    if (b.primary || b.default) continue;
    const updatedMs = Date.parse(b.updated_at || b.created_at || "");
    const ageDays = Number.isFinite(updatedMs) ? Number(((nowMs - updatedMs) / 86_400_000).toFixed(1)) : null;
    if (ageDays !== null && ageDays >= IDLE_DAYS_THRESHOLD) {
      flaggedIdle.push({ id: b.id, name: b.name, state: b.current_state, ageDays });
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        projectId: NEON_PROJECT_ID,
        totalBranches: branches.length,
        idleDaysThreshold: IDLE_DAYS_THRESHOLD,
        flaggedIdleCount: flaggedIdle.length,
        flaggedIdle,
        actionTaken: "READ_ONLY_AUDIT_NO_DELETES",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("[neon-branch-hygiene] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
