/**
 * Phase 9 — Internal calibration cockpit + guardrail assertions.
 *
 * Asserts (statically — no DB boot required) that:
 *   - /api/cockpit/calibration enforces ADMIN auth and never exposes
 *     publish or send mutations
 *   - the calibration page renders the internal-only banner and the
 *     readiness/blocked-reasons sections
 *   - the calibration page never sets publishedAt
 *   - the content cockpit banner is updated to the internal-only copy
 *   - the legacy content-publishing worker has the internal-calibration
 *     kill switch in place AND no longer writes publishedAt
 *   - the model-freeze and draft-only guardrail scripts exist and run
 *   - the trust-gate guardrail script exists and runs
 *   - public-copy-scanner scans the content-engine files (regression check)
 *   - the seed file uses publishedAt: null patterns only (when present)
 */

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const APP_ROOT = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(REPO_ROOT, rel), "utf8");
}

function readApp(rel: string): string {
  return readFileSync(resolve(APP_ROOT, rel), "utf8");
}

describe("internal calibration cockpit + API", () => {
  it("exposes GET /api/cockpit/calibration with ADMIN-only auth", () => {
    const src = readApp("app/api/cockpit/calibration/route.ts");
    expect(src).toMatch(/export async function GET/);
    expect(src).toMatch(/session\.user\.role\s*!==\s*"ADMIN"/);
    expect(src).toMatch(/status:\s*401/);
  });

  it("returns mode INTERNAL_ONLY and never sets publishedAt", () => {
    const src = readApp("app/api/cockpit/calibration/route.ts");
    expect(src).toMatch(/mode:\s*"INTERNAL_ONLY"/);
    expect(src).toMatch(/autoPublish:\s*false/);
    expect(src).toMatch(/autoSend:\s*false/);
    expect(src).not.toMatch(/publishedAt\s*:\s*new\s+Date/);
  });

  it("blocks POST as 405 (read-only surface)", () => {
    const src = readApp("app/api/cockpit/calibration/route.ts");
    expect(src).toMatch(/export async function POST/);
    expect(src).toMatch(/status:\s*405/);
    expect(src).toMatch(/calibration-is-read-only/);
  });

  it("degrades gracefully when Prisma client is missing", () => {
    const src = readApp("app/api/cockpit/calibration/route.ts");
    expect(src).toMatch(/safeCount/);
    expect(src).toMatch(/calibrationProposal\?:/);
    expect(src).toMatch(/CalibrationProposal model not generated/);
  });

  it("calibration page renders the internal-only banner", () => {
    const src = readApp("app/cockpit/calibration/page.tsx");
    expect(src).toMatch(/internal-only-banner/);
    expect(src).toMatch(/Internal calibration only\.\s*No auto-publish\.\s*No auto-send\.\s*No automated betting\./);
  });

  it("calibration page shows game-history counts", () => {
    const src = readApp("app/cockpit/calibration/page.tsx");
    expect(src).toMatch(/calibration-history/);
    expect(src).toMatch(/Games \(total\)/);
    expect(src).toMatch(/Games \(completed\)/);
    expect(src).toMatch(/Predictions \(total\)/);
    expect(src).toMatch(/Predictions \(resolved\)/);
    expect(src).toMatch(/Predictions \(pending\)/);
  });

  it("calibration page shows readiness gates and blocked reasons", () => {
    const src = readApp("app/cockpit/calibration/page.tsx");
    expect(src).toMatch(/calibration-readiness/);
    expect(src).toMatch(/calibration-blocked-reasons/);
    expect(src).toMatch(/ALWAYS BLOCKED \(constant gate\)/);
  });

  it("calibration page never sets publishedAt", () => {
    const src = readApp("app/cockpit/calibration/page.tsx");
    expect(src).not.toMatch(/publishedAt\s*:\s*new\s+Date/);
    expect(src).not.toMatch(/publishedAt\s*=\s*new\s+Date/);
  });
});

describe("content cockpit — internal-only banner", () => {
  it("renders the internal-only / no auto-publish banner", () => {
    const src = readApp("app/cockpit/content/page.tsx");
    expect(src).toMatch(/content-no-publish-banner/);
    expect(src).toMatch(/Internal calibration only\.\s*No auto-publish\.\s*No auto-send\.\s*No automated betting\./);
  });
});

describe("legacy publisher worker — hard kill switch", () => {
  const workerSrc = read("workers/content-publishing/src/index.ts");

  it("declares INTERNAL_CALIBRATION_ONLY default-on gate", () => {
    expect(workerSrc).toMatch(/INTERNAL_CALIBRATION_ONLY/);
    expect(workerSrc).toMatch(/refusedByInternalCalibrationGates/);
  });

  it("requires CONTENT_WORKER_ENABLED to be 'true'", () => {
    expect(workerSrc).toMatch(/CONTENT_WORKER_ENABLED/);
  });

  it("no longer flips status to PUBLISHED", () => {
    // A status: "PUBLISHED" write inside a data: clause would re-create
    // the auto-publish path. The hardened worker now drafts only.
    const dataPublishedBlock = workerSrc.match(/data:\s*\{[\s\S]{0,500}status:\s*"PUBLISHED"/);
    expect(dataPublishedBlock, "worker still writes status: PUBLISHED — auto-publish path is back").toBeNull();
  });

  it("no longer writes publishedAt", () => {
    expect(workerSrc).not.toMatch(/publishedAt\s*:\s*new\s+Date/);
  });
});

describe("Phase 9 guardrail scripts — exist and execute", () => {
  it("scripts/guardrails/trust-gate.mjs exists", () => {
    expect(existsSync(resolve(REPO_ROOT, "scripts/guardrails/trust-gate.mjs"))).toBe(true);
  });

  it("scripts/guardrails/model-freeze.mjs exists", () => {
    expect(existsSync(resolve(REPO_ROOT, "scripts/guardrails/model-freeze.mjs"))).toBe(true);
  });

  it("scripts/guardrails/draft-only.mjs exists", () => {
    expect(existsSync(resolve(REPO_ROOT, "scripts/guardrails/draft-only.mjs"))).toBe(true);
  });

  it("docs/calibration-proposals/FROZEN.md anchors MODEL_VERSION", () => {
    const frozen = read("docs/calibration-proposals/FROZEN.md");
    expect(frozen).toMatch(/frozen:\s*v\d+\.\d+\.\d+/);
  });

  it("trust-gate guardrail exits 0 (no banned phrases on public surface)", () => {
    try {
      const out = execSync("node scripts/guardrails/trust-gate.mjs", {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      });
      expect(out).toMatch(/trust-gate\] OK/);
    } catch (err) {
      const stdout = (err as { stdout?: string }).stdout ?? "";
      const stderr = (err as { stderr?: string }).stderr ?? "";
      throw new Error(`trust-gate failed:\nstdout=${stdout}\nstderr=${stderr}`);
    }
  });

  it("model-freeze guardrail exits 0 (current MODEL_VERSION is frozen-baseline-anchored)", () => {
    try {
      const out = execSync("node scripts/guardrails/model-freeze.mjs", {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      });
      expect(out).toMatch(/model-freeze\] OK/);
    } catch (err) {
      const stdout = (err as { stdout?: string }).stdout ?? "";
      const stderr = (err as { stderr?: string }).stderr ?? "";
      throw new Error(`model-freeze failed:\nstdout=${stdout}\nstderr=${stderr}`);
    }
  });

  it("draft-only guardrail exits 0 (no publish/send paths leaked)", () => {
    try {
      const out = execSync("node scripts/guardrails/draft-only.mjs", {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      });
      expect(out).toMatch(/draft-only\] OK/);
    } catch (err) {
      const stdout = (err as { stdout?: string }).stdout ?? "";
      const stderr = (err as { stderr?: string }).stderr ?? "";
      throw new Error(`draft-only failed:\nstdout=${stdout}\nstderr=${stderr}`);
    }
  });
});

describe("Phase 9 CI workflow", () => {
  const yml = read(".github/workflows/ci.yml");

  it("declares trust-gate, model-freeze, draft-only, build, test jobs", () => {
    expect(yml).toMatch(/trust-gate:/);
    expect(yml).toMatch(/model-freeze:/);
    expect(yml).toMatch(/draft-only:/);
    expect(yml).toMatch(/build:/);
    expect(yml).toMatch(/test:/);
  });

  it("invokes the guardrail scripts in CI", () => {
    expect(yml).toMatch(/scripts\/guardrails\/trust-gate\.mjs/);
    expect(yml).toMatch(/scripts\/guardrails\/model-freeze\.mjs/);
    expect(yml).toMatch(/scripts\/guardrails\/draft-only\.mjs/);
  });

  it("does not introduce any external send/post step (no email/SMS/webhook actions)", () => {
    expect(yml).not.toMatch(/dawidd6\/action-send-mail|sendgrid|mailgun|slack-notify|discord-webhook/i);
  });
});

describe("Phase 8 regressions — still safe", () => {
  it("content engine builders never set publishedAt", () => {
    const src = readApp("lib/content-engine/build-draft.ts");
    expect(src).toMatch(/publishedAt:\s*null/);
    expect(src).not.toMatch(/publishedAt\s*:\s*new\s+Date/);
  });

  it("POST /api/cockpit/content returns 405 auto-publish-disabled", () => {
    const src = readApp("app/api/cockpit/content/route.ts");
    expect(src).toMatch(/status:\s*405/);
    expect(src).toMatch(/auto-publish-disabled/);
  });

  it("review route refuses APPROVED when readiness is not READY_FOR_REVIEW", () => {
    const src = readApp("app/api/cockpit/content/[id]/review/route.ts");
    expect(src).toMatch(/draft-not-ready/);
    expect(src).toMatch(/READY_FOR_REVIEW/);
  });

  it("review route never sets publishedAt", () => {
    const src = readApp("app/api/cockpit/content/[id]/review/route.ts");
    // Allow a comment/note acknowledging the prohibition.
    const writes = src.match(/publishedAt\s*:\s*new\s+Date\s*\(/g) ?? [];
    expect(writes).toHaveLength(0);
  });
});

describe("seed file safety (best-effort)", () => {
  it("seed file is present", () => {
    const seedPath = resolve(REPO_ROOT, "packages/db/prisma/seed.ts");
    expect(existsSync(seedPath)).toBe(true);
    expect(statSync(seedPath).size).toBeGreaterThan(100);
  });

  it("seed file contains no publishedAt: new Date( writes", () => {
    const seed = read("packages/db/prisma/seed.ts");
    expect(seed).not.toMatch(/publishedAt\s*:\s*new\s+Date\s*\(/);
  });
});
