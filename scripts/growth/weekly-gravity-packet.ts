/**
 * weekly-gravity-packet.ts — R3 weekly public "gravity packet" assembler.
 *
 * Assembles a `GravityPacket` snapshot from whatever real data sources exist
 * on this branch today, and is honest in code comments (and in the packet
 * README) about which fields are real vs. placeholder pending a real wiring.
 *
 * RUN:
 *   npx tsx scripts/growth/weekly-gravity-packet.ts
 *
 * This is a plain Node script (not a Workflow script) — it shells out to git
 * directly and does normal Node fs/child_process calls.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { moatScore, type MoatInputs } from "../../apps/web/lib/growth/moat-score";

export type GravityPacket = {
  week: string;
  gitSha: string;
  moatScore: number;
  mrrCents: number;
  receiptsSigned7d: number;
  stressTestPass: boolean;
  cutoffNStar: number;
};

const CUTOFF_SUMMARY_PATH = join("formal", "receipts", "cutoff-matrix", "summary.txt");

/**
 * Reads `N_STAR=<n>` out of the cutoff-matrix summary if it exists on this
 * branch. That file lives on a separate, not-yet-merged formal branch, so on
 * this branch it will typically be absent — in which case we default to 0
 * and say so honestly rather than fabricate a number.
 */
export function readCutoffNStar(repoRoot: string): { value: number; isReal: boolean } {
  const path = join(repoRoot, CUTOFF_SUMMARY_PATH);
  if (!existsSync(path)) {
    return { value: 0, isReal: false };
  }
  const text = readFileSync(path, "utf8");
  const match = text.match(/N_STAR=(\d+)/);
  if (!match) {
    return { value: 0, isReal: false };
  }
  return { value: Number(match[1]), isReal: true };
}

function currentGitSha(repoRoot: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot }).toString().trim();
}

/** ISO week number (1-53) for a given date, in the form `YYYY-Www`. */
export function isoWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Fields marked PLACEHOLDER below have no real data source wired up on this
 * branch yet. They are stubbed with conservative defaults so the packet
 * shape is exercised end-to-end; a future change should replace each with a
 * real query once the source exists (SDK star count API, labeled-shadow
 * counter, live receipt-verify telemetry).
 */
export function buildGravityPacket(repoRoot: string, now: Date = new Date()): GravityPacket {
  const { value: cutoffNStar } = readCutoffNStar(repoRoot);

  const moatInputs: MoatInputs = {
    labeledShadowN: 0, // PLACEHOLDER: no labeled-shadow counter wired yet
    publicPacketStreakWeeks: 0, // PLACEHOLDER: computed from packet history once >1 exists
    sdkStars: 0, // PLACEHOLDER: no SDK-stars data source wired yet
    uniqueReceiptVerifies7d: 0, // PLACEHOLDER: no live receipt-verify telemetry wired yet
    distinctSurfacesGoverned: 0, // PLACEHOLDER: no governed-surface registry wired yet
    cutoffNStar,
  };

  return {
    week: isoWeekString(now),
    gitSha: currentGitSha(repoRoot),
    moatScore: moatScore(moatInputs),
    mrrCents: 0, // PLACEHOLDER: no billing data source wired yet
    receiptsSigned7d: 0, // PLACEHOLDER: no receipt-signing telemetry wired yet
    stressTestPass: false, // PLACEHOLDER: no stress-test runner wired yet
    cutoffNStar,
  };
}

export function packetFilePath(packetsDir: string, weekIso: string): string {
  // weekIso looks like "2026-W30"; the on-disk name compresses to "week-YYYYWW.json"
  const [year, wPart] = weekIso.split("-W");
  return join(packetsDir, `week-${year}${wPart}.json`);
}

/**
 * CI-lint concept (NOT wired to any CI workflow — owner opt-in only). A
 * future CI job MAY call this when the owner sets `REQUIRE_GRAVITY_PACKET=1`
 * to fail a build if a given week's packet is missing. This is intentionally
 * not a default gate: publishing cadence is a growth/DevRel concern, not a
 * correctness one, and should never block unrelated work without explicit
 * owner opt-in.
 */
export function isPacketMissingForWeek(weekIso: string, packetsDir: string): boolean {
  const path = packetFilePath(packetsDir, weekIso);
  return !existsSync(path);
}

const README_CONTENT = `# Weekly Gravity Packets

Each \`week-YYYYWW.json\` file is a snapshot produced by
\`scripts/growth/weekly-gravity-packet.ts\`, assembled from whatever real data
sources exist on the branch at the time it was run.

## Honest caveat: several fields are placeholders

The following inputs have no real data source wired up yet. Until they do,
the script stubs them with conservative defaults (usually 0 / false) rather
than fabricating numbers:

- \`sdkStars\` (moat-score input) — no SDK-stars data source wired yet.
- \`labeledShadowN\` (moat-score input) — no labeled-shadow counter wired yet.
- \`uniqueReceiptVerifies7d\` / \`receiptsSigned7d\` — no live receipt-verify
  telemetry wired yet.
- \`distinctSurfacesGoverned\` (moat-score input) — no governed-surface
  registry wired yet.
- \`mrrCents\` — no billing data source wired yet.
- \`stressTestPass\` — no stress-test runner wired yet.

\`cutoffNStar\` is real *only* when \`formal/receipts/cutoff-matrix/summary.txt\`
exists on the branch (it currently lives on a separate, not-yet-merged formal
branch); otherwise it defaults to 0 and is not real.

\`moatScore\` is a LEAD-TIME indicator, not a claim of permanent or defensible
uniqueness — see the doc comment on \`apps/web/lib/growth/moat-score.ts\`.

## CI lint (owner opt-in only)

\`isPacketMissingForWeek\` (exported from
\`scripts/growth/weekly-gravity-packet.ts\`) can be called by a future CI job
to fail a build if a week's packet is missing. This is NOT wired into any CI
workflow by default — it is owner opt-in via \`REQUIRE_GRAVITY_PACKET=1\`.
`;

function main(): void {
  const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim();
  const packetsDir = join(repoRoot, "docs", "formal", "packets");
  mkdirSync(packetsDir, { recursive: true });

  const packet = buildGravityPacket(repoRoot);
  const outPath = packetFilePath(packetsDir, packet.week);
  writeFileSync(outPath, JSON.stringify(packet, null, 2) + "\n", "utf8");

  const readmePath = join(packetsDir, "README.md");
  writeFileSync(readmePath, README_CONTENT, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);
  // eslint-disable-next-line no-console
  console.log(`Packets in dir: ${readdirSync(packetsDir).length}`);
}

if (require.main === module) {
  main();
}
