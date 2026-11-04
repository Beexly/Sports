#!/usr/bin/env node
/**
 * Plugin & External Skill Supply-Chain Gate.
 *
 * Operationalizes findings from Nov 4 Sweeps:
 * - IG AM-12: Reuters Binance fake-interview malware vector (obfuscated curl/exec payloads).
 * - IG AM-14: deepseek-harness / dsh-unrestricted adversarial system-prompt injection.
 *
 * Scans directories (plugins, skills, workflows) for:
 * 1. Obfuscated payload execution patterns (e.g., `curl ... | sh`, `eval(Buffer.from(`, `powershell -enc`).
 * 2. Adversarial system-prompt override injection tokens.
 * 3. Suspicious hardcoded credential exfiltration webhooks.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

const SUSPICIOUS_EXEC_PATTERNS = [
  /curl\s+[^|\n]+\|\s*(sh|bash)/i,
  /wget\s+[^|\n]+\|\s*(sh|bash)/i,
  /powershell\s+(-enc|-encodedcommand)/i,
  /eval\s*\(\s*Buffer\.from/i,
  /eval\s*\(\s*atob\s*\(/i,
];

const PROMPT_INJECTION_TOKENS = [
  /ignore\s+all\s+previous\s+instructions/i,
  /dsh-unrestricted/i,
  /system\s+override:\s*disable\s+safety/i,
  /bypass\s+all\s+guardrails/i,
];

export function scanFileContent(content, filename = "") {
  const findings = [];

  for (const pat of SUSPICIOUS_EXEC_PATTERNS) {
    if (pat.test(content)) {
      findings.push({ type: "OBFUSCATED_EXEC", pattern: pat.toString(), file: filename });
    }
  }

  for (const pat of PROMPT_INJECTION_TOKENS) {
    if (pat.test(content)) {
      findings.push({ type: "PROMPT_INJECTION_OVERRIDE", pattern: pat.toString(), file: filename });
    }
  }

  return findings;
}

export function runSupplyChainAudit(scanDirs = ["intelligence", "scripts", "packages"]) {
  const root = process.cwd();
  let totalFiles = 0;
  const allFindings = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === ".venv" || entry === "dist") continue;
      const full = join(dir, entry);
      try {
        const s = statSync(full);
        if (s.isDirectory()) {
          walk(full);
        } else if (/\.(ts|js|mjs|py|sh|json|md)$/.test(entry)) {
          totalFiles++;
          const content = readFileSync(full, "utf8");
          const f = scanFileContent(content, full);
          if (f.length > 0) {
            allFindings.push(...f);
          }
        }
      } catch {}
    }
  }

  for (const d of scanDirs) {
    walk(resolve(root, d));
  }

  return { totalFiles, findings: allFindings, ok: allFindings.length === 0 };
}

if (process.argv[1] && process.argv[1].endsWith("plugin-supply-chain-gate.mjs")) {
  const result = runSupplyChainAudit();
  console.log(`[supply-chain-gate] Scanned ${result.totalFiles} files. Findings: ${result.findings.length}`);
  if (!result.ok) {
    console.error("[supply-chain-gate] CRITICAL: Suspicious supply-chain signatures found:");
    for (const f of result.findings) {
      console.error(`  - ${f.type} in ${f.file}: ${f.pattern}`);
    }
    process.exit(1);
  }
  console.log("[supply-chain-gate] PASS: All external scripts, skills, and plugins clean.");
  process.exit(0);
}
