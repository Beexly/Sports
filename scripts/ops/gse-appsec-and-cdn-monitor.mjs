#!/usr/bin/env node
/**
 * gse-appsec-and-cdn-monitor.mjs
 * Authorized GSE-only AppSec, DNS, Katana/Nuclei self-audit & Cloudflare CDN speed runner.
 * Fail-closed allowlist prevents scanning any third-party domain.
 * Zero anti-bot / CAPTCHA evasion tools are registered or permitted.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, "../..");
export const LOCAL_BIN_DIR = resolve(os.homedir(), ".local/bin");
export const NPM_BIN_DIR =
  process.platform === "win32" && process.env.APPDATA
    ? resolve(process.env.APPDATA, "npm")
    : resolve(os.homedir(), ".npm-global/bin");

export const AUTHORIZED_GSE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "galaxysportsedge.com",
  "www.galaxysportsedge.com",
  "api.galaxysportsedge.com",
]);

export const AUTHORIZED_GSE_WORKERS_SUFFIX = ".gse.workers.dev";
export const NUCLEI_TEMPLATE_PATH = resolve(REPO_ROOT, "infra/security/nuclei-gse-self-audit.yaml");

export const ANTI_EVASION_POLICY = Object.freeze({
  scraplingStealthBlocked: true,
  turnstileBypassForbidden: true,
  proxyRotationForbidden: true,
  authorizedSelfAuditOnly: true,
});

/**
 * Strictly validates that a target hostname or URL belongs exclusively to GSE assets.
 * Fails closed (`TARGET_NOT_IN_GSE_ALLOWLIST`) for any third-party or metadata host.
 */
export function assertAuthorizedGseTarget(targetInput) {
  const raw = String(targetInput ?? "").trim();
  if (!raw) throw new Error("TARGET_NOT_IN_GSE_ALLOWLIST: empty target");
  const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new Error(`TARGET_NOT_IN_GSE_ALLOWLIST: invalid URL '${raw}'`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`TARGET_NOT_IN_GSE_ALLOWLIST: credentials forbidden in target '${raw}'`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`TARGET_NOT_IN_GSE_ALLOWLIST: unsupported protocol '${parsed.protocol}'`);
  }
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (parsed.protocol === "http:" && !isLocal) {
    throw new Error(`TARGET_NOT_IN_GSE_ALLOWLIST: non-local target must use https '${raw}'`);
  }
  const allowed =
    AUTHORIZED_GSE_HOSTS.has(host) ||
    (host.endsWith(".galaxysportsedge.com") && !host.includes("..")) ||
    (host.endsWith(AUTHORIZED_GSE_WORKERS_SUFFIX) && !host.includes(".."));
  if (!allowed) {
    throw new Error(`TARGET_NOT_IN_GSE_ALLOWLIST: '${host}' is outside GSE authorized scope`);
  }
  return parsed.origin;
}

function resolveBinaryPath(names) {
  for (const name of names) {
    const inLocal = resolve(LOCAL_BIN_DIR, name);
    if (existsSync(inLocal)) return inLocal;
    const inNpm = resolve(NPM_BIN_DIR, name);
    if (existsSync(inNpm)) return inNpm;
  }
  return names[0];
}

function probeBinaryVersion(binPath, args) {
  const res = spawnSync(binPath, args, {
    encoding: "utf8",
    timeout: 12000,
    windowsHide: true,
  });
  const stripped = `${res.stdout || ""}\n${res.stderr || ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  const lines = stripped
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && /^[\x20-\x7E]+$/.test(l));
  const versionLine =
    lines.find((l) => /version|\bv?\d+\.\d+\.\d+/i.test(l)) || lines[0] || `exit_${res.status}`;
  return {
    available: res.status === 0,
    path: binPath,
    version: versionLine.slice(0, 120),
  };
}

export function getAppSecAndCdnToolStatus() {
  const nucleiBin = resolveBinaryPath(process.platform === "win32" ? ["nuclei.exe"] : ["nuclei"]);
  const katanaBin = resolveBinaryPath(process.platform === "win32" ? ["katana.exe"] : ["katana"]);
  const dnsxBin = resolveBinaryPath(process.platform === "win32" ? ["dnsx.exe"] : ["dnsx"]);
  const notifyBin = resolveBinaryPath(process.platform === "win32" ? ["notify.exe"] : ["notify"]);
  const cfstBin = resolveBinaryPath(process.platform === "win32" ? ["CloudflareST.exe"] : ["CloudflareST"]);

  return {
    generatedAt: new Date().toISOString(),
    antiEvasionPolicy: ANTI_EVASION_POLICY,
    selfAuditTemplateExists: existsSync(NUCLEI_TEMPLATE_PATH),
    tools: {
      nuclei: probeBinaryVersion(nucleiBin, ["-version", "-nc"]),
      katana: probeBinaryVersion(katanaBin, ["-version", "-nc"]),
      dnsx: probeBinaryVersion(dnsxBin, ["-version", "-nc"]),
      notify: probeBinaryVersion(notifyBin, ["-version"]),
      CloudflareST: probeBinaryVersion(cfstBin, ["-v"]),
    },
  };
}

export function runAuthorizedDnsSelfCheck(hosts = ["galaxysportsedge.com", "www.galaxysportsedge.com"]) {
  const validatedHosts = hosts.map((h) => new URL(assertAuthorizedGseTarget(h)).hostname);
  const dnsxBin = resolveBinaryPath(process.platform === "win32" ? ["dnsx.exe"] : ["dnsx"]);
  const res = spawnSync(dnsxBin, ["-a", "-aaaa", "-resp", "-silent", "-nc"], {
    input: `${validatedHosts.join("\n")}\n`,
    encoding: "utf8",
    timeout: 15000,
    windowsHide: true,
  });
  return {
    ok: res.status === 0,
    hosts: validatedHosts,
    records: `${res.stdout || ""}`
      .replace(/\x1b\[[0-9;]*m/g, "")
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0),
    stderr: `${res.stderr || ""}`.trim(),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const args = new Set(process.argv.slice(2));
  if (args.has("--dns-self-check")) {
    console.log(JSON.stringify(runAuthorizedDnsSelfCheck(), null, 2));
  } else {
    console.log(JSON.stringify(getAppSecAndCdnToolStatus(), null, 2));
  }
}
