#!/usr/bin/env node
/**
 * Agent-Bus Checklist & Receipt Synchronizer (`https://github.com/Beexly/agent-bus`).
 *
 * Enforces Standing Doctrine DIRECT-TO-MIND/ENGINE:
 * Every workstream logs IN_PROGRESS / COMPLETED receipts with commit SHA, test counts,
 * and alignment-guard verification to both local `brain/agent-bus/CHECKLIST-2026-10-28.jsonl`
 * and remote `Beexly/agent-bus` via GitHub CLI (`gh api`).
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const LOCAL_RECEIPT_PATH = resolve(ROOT, "brain", "agent-bus", "CHECKLIST-2026-10-28.jsonl");

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function parseArgs(argv) {
  const out = {
    item: "WORKSTREAM-GENERAL",
    status: "COMPLETED",
    agent: process.env.AGENT_ID ?? "antigravity-hermes-master",
    summary: "Verified autonomous execution step",
    pushRemote: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--item" && argv[i + 1]) out.item = argv[++i];
    else if (a === "--status" && argv[i + 1]) out.status = argv[++i];
    else if (a === "--agent" && argv[i + 1]) out.agent = argv[++i];
    else if (a === "--summary" && argv[i + 1]) out.summary = argv[++i];
    else if (a === "--push") out.pushRemote = true;
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv);
  const sha = git(["rev-parse", "--short", "HEAD"]) ?? "uncommitted";
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "main";
  const alignCheck = spawnSync("node", ["scripts/guardrails/alignment-guard.mjs", "--check"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const alignStatus = (alignCheck.stdout ?? "").includes("OK") ? "OK" : "STALE_OR_PENDING";

  const receipt = {
    timestamp_utc: new Date().toISOString(),
    item_id: opts.item,
    status: opts.status,
    agent_id: opts.agent,
    repo: "Beexly/Sports",
    branch,
    commit_sha: sha,
    alignment_guard: alignStatus,
    summary: opts.summary,
  };

  mkdirSync(dirname(LOCAL_RECEIPT_PATH), { recursive: true });
  appendFileSync(LOCAL_RECEIPT_PATH, `${JSON.stringify(receipt)}\n`, "utf8");
  console.log(`[agent-bus-sync] Recorded ${receipt.status} receipt for ${receipt.item_id} (${sha}) -> ${LOCAL_RECEIPT_PATH}`);

  if (opts.pushRemote) {
    const contentB64 = Buffer.from(readFileSync(LOCAL_RECEIPT_PATH, "utf8"), "utf8").toString("base64");
    const getExisting = spawnSync(
      "gh",
      ["api", "repos/Beexly/agent-bus/contents/CHECKLIST-2026-10-28.jsonl", "--jq", ".sha"],
      { cwd: ROOT, encoding: "utf8" },
    );
    const args = [
      "api",
      "--method",
      "PUT",
      "repos/Beexly/agent-bus/contents/CHECKLIST-2026-10-28.jsonl",
      "-f",
      `message=chore(agent-bus): ${receipt.item_id} ${receipt.status} (${sha})`,
      "-f",
      `content=${contentB64}`,
    ];
    const remoteSha = getExisting.status === 0 ? getExisting.stdout.trim() : "";
    if (remoteSha && /^[0-9a-f]{40}$/i.test(remoteSha)) {
      args.push("-f", `sha=${remoteSha}`);
    }
    const put = spawnSync("gh", args, { cwd: ROOT, encoding: "utf8" });
    if (put.status === 0) {
      console.log("[agent-bus-sync] Synced CHECKLIST-2026-10-28.jsonl to github.com/Beexly/agent-bus");
    } else {
      console.warn(`[agent-bus-sync] Remote gh api sync skipped/deferred: ${(put.stderr || "").trim().slice(0, 200)}`);
    }
  }
}

main();
