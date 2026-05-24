import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const WORKFLOW = resolve(repoRoot, ".github/workflows/nightly-content.yml");
const SCRIPT = resolve(repoRoot, "scripts/draft-nightly-content.mjs");

describe(".github/workflows/nightly-content.yml — operator-approved draft pipeline", () => {
  const src = readFileSync(WORKFLOW, "utf8");

  it("runs on a daily schedule + supports manual dispatch", () => {
    expect(src).toMatch(/schedule:\s*\n\s*-\s*cron:\s*["'][^"']+["']/);
    expect(src).toMatch(/workflow_dispatch:/);
  });

  it("uses concurrency group to prevent overlapping runs", () => {
    expect(src).toMatch(/concurrency:/);
    expect(src).toMatch(/group:\s*nightly-content/);
  });

  it("uses pinned versions of standard actions", () => {
    expect(src).toMatch(/actions\/checkout@v4/);
    expect(src).toMatch(/actions\/setup-node@v4/);
    expect(src).toMatch(/peter-evans\/create-pull-request@v7/);
  });

  it("reads ANTHROPIC_API_KEY from secrets (never hardcoded)", () => {
    expect(src).toMatch(/secrets\.ANTHROPIC_API_KEY/);
    expect(src).not.toMatch(/sk-ant-/);
  });

  it("targets _drafts/ as the add-paths root", () => {
    expect(src).toMatch(/add-paths:[\s\S]*_drafts\//);
  });

  it("has NO auto-merge, NO --auto, NO direct push to main", () => {
    expect(src).not.toMatch(/auto-merge/i);
    expect(src).not.toMatch(/--auto\b/);
    expect(src).not.toMatch(/gh\s+pr\s+merge/);
    // create-pull-request handles the branch+PR push; no manual git push to main.
    expect(src).not.toMatch(/git\s+push\s+(?:[\w-]+\s+)?origin\s+main\b/);
  });

  it("declares the minimum permissions needed for the PR step", () => {
    expect(src).toMatch(/permissions:[\s\S]*contents:\s*write/);
    expect(src).toMatch(/permissions:[\s\S]*pull-requests:\s*write/);
  });

  it("references the draft script", () => {
    expect(src).toMatch(/scripts\/draft-nightly-content\.mjs/);
  });

  it("injects DATABASE_URL + DIRECT_URL into the draft step env", () => {
    const draftStep = src.slice(src.indexOf("- name: Draft + review"));
    expect(draftStep).toMatch(/DATABASE_URL:\s*\$\{\{\s*secrets\.DATABASE_URL\s*\}\}/);
    expect(draftStep).toMatch(/DIRECT_URL:\s*\$\{\{\s*secrets\.DIRECT_URL\s*\}\}/);
  });

  it("builds a self-documenting PR body from telemetry + review JSON", () => {
    expect(src).toMatch(/id:\s*pr_body/);
    expect(src).toMatch(/telemetry_path/);
    expect(src).toMatch(/review_path/);
    expect(src).toMatch(/Run summary/);
    expect(src).toMatch(/Review verdict/);
  });

  it("uses the dynamic body output (not a hardcoded body)", () => {
    expect(src).toMatch(/body:\s*\$\{\{\s*steps\.pr_body\.outputs\.body\s*\}\}/);
  });
});

describe("scripts/draft-nightly-content.mjs — draft + review runner", () => {
  const src = readFileSync(SCRIPT, "utf8");

  it("imports the Anthropic SDK (no raw fetch path)", () => {
    expect(src).toMatch(/import\(["']@anthropic-ai\/sdk["']\)/);
    expect(src).not.toMatch(/fetch\(["']https:\/\/api\.anthropic\.com/);
  });

  it("uses canonical model aliases (no date suffixes)", () => {
    expect(src).toMatch(/claude-sonnet-4-6["']/);
    expect(src).toMatch(/claude-haiku-4-5["']/);
    expect(src).not.toMatch(/claude-[a-z-]+-\d-\d-20\d{6}/);
  });

  it("writes only into the _drafts/ directory", () => {
    expect(src).toMatch(/DRAFTS_DIR/);
    expect(src).toMatch(/_drafts/);
    // No writes anywhere else.
    expect(src).not.toMatch(/writeFile\([^,]*apps\/web/);
    expect(src).not.toMatch(/writeFile\([^,]*packages\//);
  });

  it("aborts when ANTHROPIC_API_KEY is missing", () => {
    expect(src).toMatch(/ANTHROPIC_API_KEY/);
    expect(src).toMatch(/abort\(/);
  });

  it("supports a --dry-run flag for local testing", () => {
    expect(src).toMatch(/--dry-run/);
    expect(src).toMatch(/DRY_RUN/);
  });

  it("uses output_config.format json_schema for both calls (no regex JSON parsing)", () => {
    // Count occurrences of json_schema usage — should be at least 2 (draft + review).
    const matches = src.match(/json_schema/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/\\\{\[\\s\\S\]\*\\\}/);
  });

  it("computes a verdict the same way the runtime reviewer does", () => {
    expect(src).toMatch(/REJECT|REVISE|READY/);
    expect(src).toMatch(/blockingFindings/);
  });

  it("does not write a publishedAt field anywhere", () => {
    expect(src).not.toMatch(/publishedAt\s*[:=]\s*new\s+Date/);
    expect(src).toMatch(/status:\s*DRAFT/);
  });

  it("uses Prisma when DATABASE_URL is set, fixture otherwise", () => {
    expect(src).toMatch(/loadPicks/);
    expect(src).toMatch(/DATABASE_URL/);
    expect(src).toMatch(/from\s+["']@prisma\/client["']|import\(["']@prisma\/client["']\)/);
    expect(src).toMatch(/falling back to fixture/i);
  });

  it("mirrors the picks-route shape: isPublished + isBootstrap:false + generatedAt window + game.sport include", () => {
    expect(src).toMatch(/isPublished:\s*true/);
    expect(src).toMatch(/isBootstrap:\s*false/);
    expect(src).toMatch(/generatedAt:\s*\{[\s\S]*gte[\s\S]*lt/);
    expect(src).toMatch(/include:\s*\{\s*game:\s*\{\s*include:\s*\{\s*sport:\s*true/);
  });

  it("extracts sources from each pick's factorBreakdown (ACTIVE-only)", () => {
    expect(src).toMatch(/extractSourcesFromFactorBreakdown/);
    expect(src).toMatch(/activationStatus\s*!==\s*["']ACTIVE["']/);
    expect(src).toMatch(/freshnessStatus\s*===\s*["']MISSING["']/);
  });

  it("emits a per-run telemetry summary the workflow's PR body can read", () => {
    expect(src).toMatch(/\.telemetry\.json/);
    expect(src).toMatch(/telemetryReport/);
    expect(src).toMatch(/totals/);
    expect(src).toMatch(/cacheReadInputTokens/);
    expect(src).toMatch(/cacheCreationInputTokens/);
  });

  it("disconnects Prisma cleanly even when the read throws", () => {
    expect(src).toMatch(/prisma\.\$disconnect/);
    // The disconnect lives in a finally so a throw in findMany doesn't leak a connection.
    expect(src).toMatch(/try\s*\{[\s\S]*findMany[\s\S]*\}\s*finally\s*\{[\s\S]*\$disconnect/);
  });

  it("has a cost pre-flight that queries claudeUsageLog for today's spend", () => {
    expect(src).toMatch(/estimateTodayCostFromDb/);
    expect(src).toMatch(/claudeUsageLog\.findMany/);
    expect(src).toMatch(/AI_DAILY_COST_CEILING_USD/);
  });

  it("writes a ceiling-skip sentinel file and exits 0 when ceiling is breached (no Claude calls)", () => {
    expect(src).toMatch(/ceiling-skip\.json/);
    expect(src).toMatch(/daily_cost_ceiling_breached/);
    expect(src).toMatch(/CEILING BREACH/);
    // Ceiling breach path must call process.exit(0) — graceful, not a failure.
    const breachIdx = src.indexOf("CEILING BREACH");
    const exitIdx = src.indexOf("process.exit(0)", breachIdx);
    expect(exitIdx).toBeGreaterThan(breachIdx);
  });

  it("has an inline pricing table mirroring ai-cost.ts (Haiku + Sonnet + Opus)", () => {
    expect(src).toMatch(/INLINE_PRICING/);
    expect(src).toMatch(/claude-haiku-4-5/);
    expect(src).toMatch(/claude-sonnet-4-6/);
    expect(src).toMatch(/claude-opus-4-7/);
    expect(src).toMatch(/cacheRead/);
    expect(src).toMatch(/cacheCreation/);
  });

  it("never calls Claude when the ceiling is already breached", () => {
    // The cost pre-flight and process.exit(0) must precede the Claude client
    // init + first messages.create call.
    const ceilingIdx = src.indexOf("CEILING BREACH");
    const claudeCallIdx = src.indexOf("client.messages.create");
    expect(ceilingIdx).toBeLessThan(claudeCallIdx);
  });
});
