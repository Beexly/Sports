#!/usr/bin/env node
/**
 * start-otel-collector.mjs
 * Validates and runs the Sentry Exporter OpenTelemetry Collector binary cleanly
 * without crash-looping when placeholder credentials have not yet been replaced.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import os from "node:os";

const REPO_ROOT = resolve(
  dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "../.."
);
const DEFAULT_CONFIG_PATH = resolve(REPO_ROOT, "infra/otel/collector-config.yaml");

const PLACEHOLDER_VALUES = new Set([
  "",
  "your-sentry-org-slug",
  "your-sentry-auth-token",
  "<your-org-slug>",
  "<your-sentry-auth-token>",
  "unset",
]);

function readEnvFiles() {
  const merged = { ...process.env };
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || resolve(home, "AppData/Local");
  const candidates = [
    resolve(REPO_ROOT, ".env.local"),
    resolve(REPO_ROOT, ".env"),
    resolve(home, ".hermes/.env"),
    resolve(localAppData, "hermes/.env"),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    let raw = "";
    try {
      raw = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!["SENTRY_ORG_SLUG", "SENTRY_AUTH_TOKEN", "LATITUDE_API_KEY"].includes(key)) continue;
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!merged[key] && val) merged[key] = val;
    }
  }
  return merged;
}

function findCollectorBinary() {
  const home = os.homedir();
  const localBin = resolve(
    home,
    ".local/bin",
    process.platform === "win32" ? "otelcol-contrib.exe" : "otelcol-contrib"
  );
  if (existsSync(localBin)) return localBin;
  const cmd = process.platform === "win32" ? "where" : "which";
  const binName = process.platform === "win32" ? "otelcol-contrib.exe" : "otelcol-contrib";
  const res = spawnSync(cmd, [binName], { encoding: "utf8", windowsHide: true });
  if (res.status === 0 && res.stdout?.trim()) {
    return res.stdout.trim().split(/\r?\n/)[0].trim();
  }
  return "";
}

function isPlaceholder(v) {
  return PLACEHOLDER_VALUES.has(String(v || "").trim());
}

async function main() {
  const args = process.argv.slice(2);
  const validateMode = args.includes("--validate") || !args.includes("--start");
  const collectorBinary = findCollectorBinary();
  const env = readEnvFiles();
  const orgConfigured = !isPlaceholder(env.SENTRY_ORG_SLUG);
  const tokenConfigured = !isPlaceholder(env.SENTRY_AUTH_TOKEN);
  const credentialsConfigured = orgConfigured && tokenConfigured;

  if (!collectorBinary) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          status: "COLLECTOR_BINARY_MISSING",
          collectorBinary: null,
          configPath: DEFAULT_CONFIG_PATH,
          configValid: false,
          credentialsConfigured,
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const validateEnv = {
    ...env,
    SENTRY_ORG_SLUG: orgConfigured ? env.SENTRY_ORG_SLUG : "placeholder-org",
    SENTRY_AUTH_TOKEN: tokenConfigured ? env.SENTRY_AUTH_TOKEN : "placeholder-token",
    LATITUDE_API_KEY: env.LATITUDE_API_KEY || "placeholder-latitude",
  };

  if (validateMode) {
    const ver = spawnSync(collectorBinary, ["--version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const val = spawnSync(
      collectorBinary,
      ["validate", `--config=${DEFAULT_CONFIG_PATH}`],
      {
        encoding: "utf8",
        env: validateEnv,
        windowsHide: true,
        timeout: 15000,
      }
    );
    const out = {
      ok: val.status === 0,
      collectorBinary,
      version: (ver.stdout || ver.stderr || "").trim().split(/\r?\n/)[0] || "",
      configPath: DEFAULT_CONFIG_PATH,
      configValid: val.status === 0,
      credentialsConfigured,
      validationOutput: val.status === 0 ? "VALID" : `${val.stdout || ""}\n${val.stderr || ""}`.trim().slice(0, 400),
    };
    console.log(JSON.stringify(out, null, 2));
    if (val.status !== 0) process.exit(1);
    return;
  }

  if (!credentialsConfigured) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          status: "PLACEHOLDER_AWAITING_BROWSER_AGENT",
          collectorBinary,
          configPath: DEFAULT_CONFIG_PATH,
          credentialsConfigured: false,
          message:
            "Replace placeholder SENTRY_ORG_SLUG and SENTRY_AUTH_TOKEN in c:\\Users\\Garrett\\Sports\\.env.local before live collector launch.",
        },
        null,
        2
      )
    );
    return;
  }

  const child = spawn(collectorBinary, [`--config=${DEFAULT_CONFIG_PATH}`], {
    stdio: "inherit",
    env: validateEnv,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error("[start-otel-collector] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
