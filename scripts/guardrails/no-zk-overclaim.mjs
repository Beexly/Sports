#!/usr/bin/env node
/**
 * No-ZK-overclaim guardrail.
 *
 * The proof stack today is: SHA-256 Merkle receipts (live) + Pedersen
 * homomorphic commitments (Phase 0.5 — sealed side live: minted per frozen
 * slate, public hex on /api/verify/slate, opener held server-side). A true
 * zero-knowledge layer (Halo2 recursive) and a post-quantum layer (STARK
 * family) are ROADMAP items (docs/ops/ZK_PROOF_EVOLUTION_ROADMAP.md) —
 * designed, not live, not audited.
 *
 * Pedersen going live changes NOTHING about what may be claimed, which is
 * precisely why this header is kept current: a layer moving from dark to live
 * is the moment someone reaches for a stronger word. It is a commitment, not a
 * proof system — perfectly hiding, computationally binding under DLOG, and DLOG
 * falls to Shor, so it is NOT post-quantum. Neither is Halo2/IPA recursion,
 * which is also discrete-log based; only the STARK phase would be. The public
 * word for this layer is "commitment", always.
 *
 * This guard blocks any CUSTOMER-FACING surface from claiming "zero-knowledge",
 * "ZK proof", "post-quantum", or "quantum-resistant" until the corresponding
 * system is live and externally audited. Cryptographic overclaim is the exact
 * class of fabricated-credibility the brand cannot survive: a "ZK-verified"
 * badge over a Pedersen commitment is a false statement about what the customer
 * can verify.
 *
 * Internal design docs, the crypto packages themselves, and tests may discuss
 * these terms freely — the fence is the PUBLIC copy surface (apps/web/app +
 * components + customer-facing lib copy), same posture as commercial-copy-scan.
 *
 * When a ZK/PQ system genuinely ships (live + audited), move the specific
 * approved phrase into ALLOWED_PHRASES with a comment linking the audit — a
 * deliberate, reviewed unlock, never a silent one.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SCAN_TARGETS = [
  "apps/web/app",
  "apps/web/components",
  "apps/web/lib/media-revenue",
  "apps/web/lib/revenue",
  "apps/web/lib/content-engine",
  "apps/web/lib/glossary.ts",
];
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".mdx"]);
const SKIP_PARTS = new Set(["__tests__", "node_modules", ".next", "dist", "coverage"]);

/** Claim words that require a live, audited system behind them. */
const BANNED_CLAIMS = [
  "zero-knowledge",
  "zero knowledge",
  "zk proof",
  "zk-proof",
  "zk-snark",
  "zk snark",
  "zk-stark",
  "zk stark",
  "post-quantum",
  "post quantum",
  "quantum-resistant",
  "quantum resistant",
  "quantum-proof",
  "quantum proof",
];

/**
 * Deliberate unlocks only. Each entry must cite the audit/live-proof evidence
 * in a comment. Empty today — nothing ZK/PQ is live.
 */
const ALLOWED_PHRASES = [];

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_PARTS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (SOURCE_EXTS.has(extname(entry.name))) {
      yield full;
    }
  }
}

function findViolations(text, file) {
  const violations = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    for (const phrase of BANNED_CLAIMS) {
      if (!lower.includes(phrase)) continue;
      const allowed = ALLOWED_PHRASES.some((a) => line.includes(a));
      if (allowed) continue;
      violations.push({ file, line: i + 1, phrase, text: line.trim().slice(0, 140) });
    }
  }
  return violations;
}

async function main() {
  const violations = [];
  let scanned = 0;

  for (const target of SCAN_TARGETS) {
    const full = join(ROOT, target);
    let info;
    try {
      info = await stat(full);
    } catch {
      continue;
    }
    const files = [];
    if (info.isFile()) {
      files.push(full);
    } else {
      for await (const f of walk(full)) files.push(f);
    }
    for (const file of files) {
      scanned++;
      const text = await readFile(file, "utf8");
      violations.push(...findViolations(text, relative(ROOT, file)));
    }
  }

  if (violations.length > 0) {
    console.error(
      `[no-zk-overclaim] FAIL - ${violations.length} cryptographic overclaim(s) on public surfaces:`,
    );
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} — "${v.phrase}" in: ${v.text}`);
    }
    console.error(
      "  ZK / post-quantum language requires a LIVE, externally audited proof system.",
    );
    console.error(
      "  Current stack is Merkle (live) + Pedersen commitments (live, sealed side).",
    );
    console.error(
      "  Neither is a ZK proof system and neither is post-quantum. See docs/ops/ZK_PROOF_EVOLUTION_ROADMAP.md.",
    );
    process.exit(1);
  }

  console.log(
    `[no-zk-overclaim] OK - scanned ${scanned} file(s); no unbacked ZK/post-quantum claims on public surfaces.`,
  );
}

main().catch((err) => {
  console.error("[no-zk-overclaim] guardrail crashed:", err);
  process.exit(1);
});
