#!/usr/bin/env node
/**
 * verify-aws-gse-isolation.mjs
 *
 * Verifies AWS/Bedrock credentials point strictly to the startup-credit
 * GSE account (034220092205 / hq@galaxysportsedge.com) and reports any expired
 * SSO/CLI login without printing credentials.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_ACCOUNT_ID = "034220092205";

function main() {
  const awsConfigPath = path.join(os.homedir(), ".aws", "config");
  const result = {
    expectedAccountId: EXPECTED_ACCOUNT_ID,
    expectedOwner: "hq@galaxysportsedge.com",
    awsConfigExists: fs.existsSync(awsConfigPath),
    configuredProfiles: {},
    nonStartupAccountsFound: [],
    stsCallerIdentity: null,
    authGateRequired: false,
    ok: false,
  };

  if (result.awsConfigExists) {
    const raw = fs.readFileSync(awsConfigPath, "utf8");
    let current = "default";
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      const secMatch = trimmed.match(/^\[(?:profile\s+)?([^\]]+)\]$/);
      if (secMatch) {
        current = secMatch[1].trim();
        result.configuredProfiles[current] ||= { accounts: [] };
        continue;
      }
      const acctMatches = trimmed.match(/\b(\d{12})\b/g);
      if (acctMatches) {
        result.configuredProfiles[current] ||= { accounts: [] };
        for (const acct of acctMatches) {
          if (!result.configuredProfiles[current].accounts.includes(acct)) {
            result.configuredProfiles[current].accounts.push(acct);
          }
          if (acct !== EXPECTED_ACCOUNT_ID && !result.nonStartupAccountsFound.includes(acct)) {
            result.nonStartupAccountsFound.push(acct);
          }
        }
      }
    }
  }

  const sts = spawnSync("aws", ["sts", "get-caller-identity", "--output", "json"], {
    encoding: "utf8",
    timeout: 10_000,
    shell: process.platform === "win32",
  });
  if (sts.status === 0 && sts.stdout.trim()) {
    try {
      const parsed = JSON.parse(sts.stdout);
      const acct = String(parsed.Account || "");
      result.stsCallerIdentity = {
        Account: acct,
        Arn: parsed.Arn ? String(parsed.Arn).replace(/:assumed-role\/.*/, ":assumed-role/<redacted>") : null,
      };
      if (acct && acct !== EXPECTED_ACCOUNT_ID && !result.nonStartupAccountsFound.includes(acct)) {
        result.nonStartupAccountsFound.push(acct);
      }
    } catch {
      result.stsCallerIdentity = { rawError: "Failed to parse STS JSON output" };
    }
  } else {
    const errText = `${sts.stderr || ""} ${sts.stdout || ""}`.trim();
    result.authGateRequired = /expired|reauthenticate|aws login|sso|Unable to locate credentials/i.test(errText);
    result.stsCallerIdentity = {
      status: sts.status,
      message: errText.slice(0, 240),
    };
  }

  const envAccountId = (process.env.AWS_ACCOUNT_ID || process.env.BEDROCK_AWS_ACCOUNT_ID || "").trim();
  if (envAccountId && envAccountId !== EXPECTED_ACCOUNT_ID) {
    result.nonStartupAccountsFound.push(envAccountId);
  }

  result.ok = result.awsConfigExists && result.nonStartupAccountsFound.length === 0;
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main();
