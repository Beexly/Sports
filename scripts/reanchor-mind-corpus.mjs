#!/usr/bin/env node
/**
 * @file reanchor-mind-corpus.mjs
 * DETERMINISTIC RE-ANCHORING PASS over the MIND corpus.
 *
 * WHAT PROBLEM THIS SOLVES
 *
 * Some MIND records were extracted from a paper whose extraction now lives
 * in a different file, or whose `source_file` was overwritten by a summary
 * markdown table. The evidence_quote in such a record may be genuine
 * academic prose while the LINK to the document is wrong. This pass looks
 * for the true document by EXACT substring search over the paper corpus,
 * re-links the record only when it then passes all four admission layers,
 * and quarantine-marks the ones that cannot be re-anchored honestly.
 *
 * WHAT IT DOES NOT DO
 *
 *   - It does not weaken the gate. The verdict comes from the independent
 *     module `packages/prediction-engine/src/literature/literature-verification.ts`,
 *     imported unmodified. A record is re-anchored ONLY when that gate
 *     returns admitted === true after the re-link.
 *   - It does not touch the builder or the gate module.
 *   - It does not write over the corpus. Output is a new file.
 *   - It makes no network calls and calls no model. Same input, same bytes
 *     out: documents are indexed in sorted path order, candidates are tried
 *     in sorted path order, and the output preserves input record order.
 *     No wall-clock value is ever written into a record.
 *
 * WHY QUARANTINE IS SCOPED TO BROKEN LINKS (read this before changing it)
 *
 * The corpus carries three epistemic classes, and two of them fail the gate
 * for reasons that are NOT link defects:
 *
 *   CITABLE_VERIFIED        3,735 records. L1 passes for ALL of them -- the
 *                           quote IS verbatim in the document each names.
 *                           They fail on L2 (numeric containment) or L4
 *                           (domain entailment). That is a SEMANTIC defect,
 *                           not a provenance one. Re-labelling them
 *                           HONESTLY_UNCITED_PRIOR would assert that a
 *                           record whose quote is verbatim is uncited. That
 *                           assertion would be false, so this pass leaves
 *                           them alone and reports them separately.
 *   DERIVED_MARKET_SYNTHESIS 1,134 records. The quote is a synthesised
 *                           sentence describing a market row ("Pinnacle
 *                           closing price -363 and 296 ..."). It is not
 *                           paper prose and it cites nothing by design.
 *                           Quarantining it would mislabel a declared
 *                           synthesis as a broken citation.
 *
 * So QUARANTINED is reserved for records that CLAIM a citation and cannot
 * demonstrate it: their quote is in neither the document they name nor any
 * paper in the corpus. Those records get their unverifiable source_file
 * nulled (the old value is preserved in `quarantine_claimed_source`, never
 * silently kept as if it were evidence).
 *
 * `--semantic-as-quarantine` applies the blunt reading as well (quarantine
 * everything not admitted). It is opt-in and off by default because it
 * writes a false statement into the corpus for the 3,735 correctly-cited
 * records. It exists so the difference can be measured, not so it can be
 * shipped as the default.
 *
 * WHERE THE PAPER CORPUS ACTUALLY IS (verified, not assumed)
 *
 * The design note says the extractions live at
 * `docs/research/2026-09-21/arxiv-deep` (1,511 files) and that
 * `arxiv-deep/` + `arxiv-program/` at the repo root hold 1,532 + 1,773.
 * MEASURED on branch audit/reconciliation-2026-10-20:
 *
 *   docs/research/2026-09-21/arxiv-deep        1 file   (a REJECT stub)
 *   arxiv-deep/                               12 files
 *   arxiv-program/                            does not exist
 *   docs/arxiv-program/research/2026-09-21/arxiv-deep   1,511 files  <-- the real one
 *
 * So the directory is DISCOVERED at runtime from a candidate list and
 * admitted only if it holds at least MIN_PAPER_FILES markdown files. The
 * stub directory is rejected by that rule rather than by a hardcoded
 * exclusion. Nothing here depends on docs/agent-index/PAPER-CATALOG.md,
 * which does not exist on this branch.
 *
 * WHAT THE MEASUREMENT SAYS (2026-10-20, this corpus)
 *
 * The 1,511 extractions are CURATED SUMMARIES (sections "Research
 * question", "Method / model", "Verdict: ADAPT"), not full paper text.
 * 0 of the 397 broken-link records have an evidence_quote that appears
 * verbatim in any of them. The re-anchoring population is therefore
 * empty on this corpus, and the honest report is "re-anchored: 0". The
 * remaining gap is L2/L4 semantics, not broken links.
 *
 * USAGE
 *   node scripts/reanchor-mind-corpus.mjs
 *   node scripts/reanchor-mind-corpus.mjs --semantic-as-quarantine
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Import the INDEPENDENT gate, unmodified, via Node's native TS type
// stripping. The resolve hook is the same one reconciliation scripts use.
register(new URL("../reconciliation/ts-resolve-hook.mjs", import.meta.url));
const GATE_PATH = resolve(
  root,
  "packages/prediction-engine/src/literature/literature-verification.ts",
);
if (!existsSync(GATE_PATH)) {
  console.error(`FATAL: gate module not found at ${GATE_PATH}`);
  process.exit(2);
}
const { verifyRecord, SPORTS_VOCABULARY, CROSS_DOMAIN_EXCLUSION_TERMS } = await import(
  pathToFileURL(GATE_PATH).href
);

const CORPUS = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.jsonl");
const OUTPUT = resolve(root, "packages/prediction-engine/data/MIND_CORPUS_3000.reanchored.jsonl");

const FLAGS = new Set(process.argv.slice(2));
const SEMANTIC_AS_QUARANTINE = FLAGS.has("--semantic-as-quarantine");

/** Minimum quote length that may be searched. Shorter quotes are not
 *  distinctive enough to attribute to a document. */
const MIN_SEARCHABLE_QUOTE_LEN = 15;
/** A directory must hold at least this many .md files to count as a paper
 *  corpus. The 1-file REJECT stub fails this; the real 1,511-file dir passes. */
const MIN_PAPER_FILES = 20;
/** Gram length and stride for the inverted-substring prefilter. */
const GRAM = 16;
const STRIDE = 8;

/**
 * Database-row dumps are not prose and must never be re-anchored to a paper.
 * Kept from the task spec; this corpus happens to express its derived rows as
 * narration instead, which is why DERIVED_MARKET_SYNTHESIS is also excluded
 * by class below.
 */
const DB_ROW_QUOTE =
  /^(ASSOCIATION_ONLY|WITHHELD|INSUFFICIENT|AGREED)\s*-\s*\d+\s*-\s*0\.\d+/;

// ---------------------------------------------------------------- helpers

const ms = (t0) => performance.now() - t0;
const round1 = (n) => Math.round(n * 10) / 10;

/** sha256(text) first 16 hex chars -- same scheme the builder uses. */
function docHash(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function readJsonl(path) {
  const records = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim()) records.push(JSON.parse(line));
  }
  return records;
}

/** FNV-1a over GRAM chars starting at `i`. */
function gramHash(s, i) {
  let h = 0x811c9dc5;
  for (let k = 0; k < GRAM; k++) {
    h ^= s.charCodeAt(i + k);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : "n/a";
}

function layerCounts(list) {
  const counts = {};
  for (const layers of list) for (const l of layers) counts[l] = (counts[l] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// ------------------------------------------------- 1. discover paper corpus

/**
 * Candidate directories, in the order they were claimed. Each is verified
 * against the filesystem; a claim that does not hold is reported, not used.
 */
const PAPER_DIR_CANDIDATES = [
  "docs/arxiv-program/research/2026-09-21/arxiv-deep", // verified: 1,511 files
  "docs/research/2026-09-21/arxiv-deep", // claimed: 1,511 files; actually 1 stub
  "arxiv-deep", // claimed: 1,532 files; actually 12
  "arxiv-program", // claimed: 1,773 files; absent
];

function discoverPaperDirs() {
  const found = [];
  const rejected = [];
  for (const rel of PAPER_DIR_CANDIDATES) {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) {
      rejected.push({ rel, why: "absent" });
      continue;
    }
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      rejected.push({ rel, why: "unreadable" });
      continue;
    }
    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
    if (files.length < MIN_PAPER_FILES) {
      rejected.push({ rel, why: `${files.length} .md file(s) < ${MIN_PAPER_FILES} floor` });
      continue;
    }
    found.push({ rel, abs, files });
  }
  return { found, rejected };
}

const tDiscover = performance.now();
const { found: paperDirs, rejected: paperDirRejects } = discoverPaperDirs();
const discoverMs = ms(tDiscover);

if (paperDirs.length === 0) {
  console.error("FATAL: no paper corpus directory found; refusing to run a vacuous pass.");
  for (const r of paperDirRejects) console.error(`  rejected ${r.rel}: ${r.why}`);
  process.exit(2);
}

// ------------------------------------------------------ 2. build the index

const tIndex = performance.now();
const docs = []; // { rel, text, start, end }
const parts = [];
let cursor = 0;
for (const dir of paperDirs) {
  for (const name of dir.files) {
    const rel = `${dir.rel}/${name}`;
    const text = readFileSync(join(dir.abs, name), "utf8");
    docs.push({ rel, text, start: cursor, end: cursor + text.length });
    parts.push(text);
    cursor += text.length + 1; // +1 for the joiner newline below
  }
}
const buffer = parts.join("\n");
docs.forEach((d, i) => {
  d.start = i === 0 ? 0 : docs[i - 1].end + 1;
  d.end = d.start + d.text.length;
});

/** hash -> doc indices. Windows are taken at STRIDE, relative to each doc. */
const gramIndex = new Map();
let windows = 0;
for (let d = 0; d < docs.length; d++) {
  const { start, end } = docs[d];
  for (let p = start; p + GRAM <= end; p += STRIDE) {
    const h = gramHash(buffer, p);
    const bucket = gramIndex.get(h);
    if (bucket === undefined) gramIndex.set(h, [d]);
    else bucket.push(d);
    windows++;
  }
}
const indexMs = ms(tIndex);
const bufferBytes = Buffer.byteLength(buffer, "utf8");

/** Map a global buffer offset to a doc index (docs are ordered, disjoint). */
function docAt(offset) {
  let lo = 0;
  let hi = docs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const d = docs[mid];
    if (offset < d.start) hi = mid - 1;
    else if (offset >= d.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/**
 * Every doc that contains `quote` as an EXACT substring, in sorted path
 * order. Uses the gram index to shortlist, then confirms by exact includes()
 * so a hash collision can never produce a false attribution.
 */
function findContainingDocs(quote) {
  const candidates = new Set();
  if (quote.length >= GRAM + STRIDE) {
    for (let off = 0; off < STRIDE; off++) {
      const bucket = gramIndex.get(gramHash(quote, off));
      if (bucket) for (const d of bucket) candidates.add(d);
    }
  } else {
    // Too short to guarantee a stride-aligned window: scan the buffer.
    let at = buffer.indexOf(quote);
    while (at !== -1) {
      const d = docAt(at);
      if (d !== -1) candidates.add(d);
      at = buffer.indexOf(quote, at + 1);
    }
  }
  const out = [];
  for (const d of candidates) {
    const idx = docs[d].text.indexOf(quote);
    if (idx !== -1) out.push({ doc: docs[d], index: idx });
  }
  out.sort((a, b) => a.doc.rel.localeCompare(b.doc.rel));
  return out;
}

// ------------------------------------------------------------ 3. corpus in

const records = readJsonl(CORPUS);

/**
 * The library the gate resolves against. Keyed by repo-relative path (which
 * the gate treats as authoritative) and, for records that carry no path, by
 * basename. Paths are added in sorted order so a basename collision resolves
 * the same way on every run.
 */
const library = new Map();
const recordPaths = [...new Set(records.map((r) => r.source_path).filter(Boolean))].sort();
for (const rel of recordPaths) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, "utf8");
  library.set(rel, text);
  const base = basename(rel);
  if (!library.has(base)) library.set(base, text);
}
for (const d of docs) {
  library.set(d.rel, d.text);
  const base = basename(d.rel);
  if (!library.has(base)) library.set(base, d.text);
}

// ------------------------------------------------------------ 4. selftest

/**
 * A pass that reports "found nothing" is only credible if the search that
 * found nothing provably works. These two controls run against the SAME
 * index and the SAME gate the real pass uses:
 *
 *   A  INDEX INTEGRITY  take a known 48-char slice out of papers spread
 *      across the corpus and require findContainingDocs to return exactly
 *      that document at an offset where the slice round-trips.
 *   B  END TO END       take a real passage, wrap it in a record with a
 *      bogus source, and require the anchor+gate path to ADMIT it. If B
 *      cannot pass, the pass could never re-anchor anything and the zero
 *      would be an artifact of a broken harness, not a finding.
 *
 * Exits non-zero if either control fails.
 */
function selftest() {
  let failures = 0;
  const say = (ok, msg) => {
    if (!ok) failures++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${msg}`);
  };

  console.log("=== SELFTEST: does the search machinery actually work? ===");
  console.log("");
  console.log("A. index integrity (known slice -> expected document)");
  const step = Math.max(1, Math.floor(docs.length / 25));
  let probes = 0;
  for (let i = 0; i < docs.length; i += step) {
    const d = docs[i];
    if (d.text.length < 300) continue;
    const at = Math.min(120, Math.floor(d.text.length / 2));
    const probe = d.text.slice(at, at + 48);
    const hits = findContainingDocs(probe);
    probes++;
    const ok = hits.some(
      (h) =>
        h.doc.rel === d.rel &&
        h.doc.text.slice(h.index, h.index + probe.length) === probe,
    );
    if (!ok) console.log(`        missed in ${d.rel}`);
    say(ok, `${d.rel} @${at}`);
  }
  console.log(`  -- ${probes} probes, ${failures} failures`);

  console.log("");
  console.log("B. end to end (real passage, bogus source -> must be admitted)");
  let admittedSample = null;
  for (const d of docs) {
    if (CROSS_DOMAIN_EXCLUSION_TERMS.some((t) => d.text.toLowerCase().includes(t.toLowerCase()))) continue;
    const limit = Math.min(d.text.length - 120, 40000);
    for (let at = 100; at < limit; at += 37) {
      const q = d.text.slice(at, at + 90).trim();
      if (q.length < 60) continue;
      const numMatch = q.match(/(?:^|\s)(\d{1,3})(?:\.\d+)?(?=\s|$|[.,;%])/);
      if (!numMatch) continue;
      const magnitude = Number(numMatch[1]);
      if (!q.includes(String(magnitude))) continue;
      if (!SPORTS_VOCABULARY.some((t) => q.toLowerCase().includes(t.toLowerCase()))) continue;

      const synthetic = {
        item_id: "SELFTEST:SYNTHETIC",
        title: "selftest",
        source_file: "SELFTEST_BOGUS_SOURCE", // deliberately wrong
        source_path: null,
        evidence_quote: q,
        mechanism_quote: q,
        evidence_span: { start_char: null, end_char: null },
        numeric_claim: { value: magnitude },
        parsed_float_magnitude: magnitude,
        applicable_context_fields: ["market_steam_velocity_pts_hr"],
        record_class: "HONESTLY_UNCITED_PRIOR",
      };
      const trial = anchorTrial(synthetic, { rel: d.rel, text: d.text, offset: d.text.indexOf(q) });
      const verdict = verifyRecord(trial, library);
      if (verdict.admitted) {
        admittedSample = { rel: d.rel, start: trial.evidence_span.start_char, end: trial.evidence_span.end_char, quote: q };
        break;
      }
    }
    if (admittedSample) break;
  }

  if (admittedSample) {
    const roundTrip =
      library.get(admittedSample.rel).slice(admittedSample.start, admittedSample.end) ===
      admittedSample.quote;
    say(true, `synthetic record admitted and re-anchored to ${admittedSample.rel}`);
    say(roundTrip, `L3 round-trip: source.slice(${admittedSample.start}, ${admittedSample.end}) === quote`);
  } else {
    say(false, "no synthetic record could be admitted; the re-anchor path is unproven");
  }

  console.log("");
  console.log(failures === 0 ? "SELFTEST: ALL CONTROLS PASSED" : `SELFTEST: ${failures} FAILURE(S)`);
  return failures;
}

if (FLAGS.has("--selftest")) {
  const t = performance.now();
  const failures = selftest();
  console.log(`selftest time ${round1(ms(t))} ms`);
  process.exit(failures === 0 ? 0 : 1);
}

// --------------------------------------------------------- 5. the pass

const report = {
  examined: records.length,
  admittedBefore: 0,
  admittedAfter: 0,
  reanchoredMoved: 0,
  reanchoredInPlace: 0,
  quarantined: 0,
  unchangedAdmitted: 0,
  linkVerifiedSemanticFail: 0,
  unchangedDerived: 0,
  belowSearchFloor: 0,
  candidatesFoundButRejected: 0,
  semanticAsQuarantine: SEMANTIC_AS_QUARANTINE,
};
const quarantineLayers = []; // failed_layers of each quarantined record
const semanticLayers = []; // failed_layers of link-verified semantic failures
const movedSamples = [];
const quarantineSamples = [];

const tSearch = performance.now();
let searchCalls = 0;

for (const record of records) {
  const before = verifyRecord(record, library);
  if (before.admitted) report.admittedBefore++;

  const quote = (record.evidence_quote ?? "").trim();

  // ---- already admitted: nothing to repair ----
  if (before.admitted) {
    report.unchangedAdmitted++;
    record.status = "ADMITTED_UNCHANGED";
    continue;
  }

  // ---- self-declared synthesis: not a citation, never re-anchor or quarantine ----
  const isDerivedClass = record.record_class === "DERIVED_MARKET_SYNTHESIS";
  if (isDerivedClass || DB_ROW_QUOTE.test(quote)) {
    report.unchangedDerived++;
    record.status = "UNCHANGED_DERIVED_SYNTHESIS";
    continue;
  }

  // ---- 4a. is the link merely un-anchored? (quote in the doc it names) ----
  // A record can pass L1 and still fail L3 when its span is null. If the
  // quote is exactly in the named document, the document is RIGHT and the
  // fix is to compute the offsets -- not to move the record.
  const currentSource = record.source_path
    ? library.get(record.source_path)
    : record.source_file
      ? library.get(record.source_file)
      : undefined;

  const offsetInCurrent = currentSource?.indexOf(quote) ?? -1;
  if (currentSource !== undefined && quote.length >= MIN_SEARCHABLE_QUOTE_LEN && offsetInCurrent !== -1) {
    const trial = anchorTrial(record, {
      rel: record.source_path ?? record.source_file,
      text: currentSource,
      offset: offsetInCurrent,
    });
    const verdict = verifyRecord(trial, library);
    if (verdict.admitted) {
      applyTrial(record, trial);
      record.status = "REANCHORED_IN_PLACE";
      report.reanchoredInPlace++;
      continue;
    }
    // The quote anchors here, but the claim it carries does not entail.
    // That is semantic, not a broken link: leave the record untouched.
    report.linkVerifiedSemanticFail++;
    semanticLayers.push(verdict.failed_layers);
    record.status = "LINK_VERIFIED_SEMANTIC_FAIL";
    if (SEMANTIC_AS_QUARANTINE) quarantine(record, verdict, "quote anchors, claim does not entail");
    continue;
  }

  // ---- 4b. broken link: search the paper corpus for the true document ----
  if (quote.length < MIN_SEARCHABLE_QUOTE_LEN) {
    report.belowSearchFloor++;
    quarantine(record, before, "quote shorter than search floor; link unverifiable");
    continue;
  }

  searchCalls++;
  const candidates = findContainingDocs(quote);

  let accepted = null;
  let bestVerdict = null;
  for (const cand of candidates) {
    const trial = anchorTrial(record, { rel: cand.doc.rel, text: cand.doc.text, offset: cand.index });
    const verdict = verifyRecord(trial, library);
    if (verdict.admitted) {
      accepted = trial;
      bestVerdict = verdict;
      break;
    }
    bestVerdict = bestVerdict ?? verdict;
  }

  if (accepted) {
    const fromSource = record.source_path ?? record.source_file ?? null;
    applyTrial(record, accepted);
    record.status = "REANCHORED_MOVED";
    report.reanchoredMoved++;
    if (movedSamples.length < 10) {
      movedSamples.push({ item_id: record.item_id, from: fromSource, to: record.source_path });
    }
    continue;
  }

  if (candidates.length > 0) report.candidatesFoundButRejected++;

  // ---- 4c. cannot be re-anchored: quarantine, keep the old claim visible ----
  report.quarantined++;
  quarantineLayers.push(bestVerdict ? bestVerdict.failed_layers : before.failed_layers);
  quarantine(
    record,
    bestVerdict ?? before,
    candidates.length > 0
      ? `quote found in ${candidates.length} paper(s) but the claim failed the gate there too`
      : "no document in the paper corpus contains the quote",
  );
  if (quarantineSamples.length < 10) {
    quarantineSamples.push({
      item_id: record.item_id,
      claimed: record.quarantine_claimed_source,
      layers: record.quarantine_reason,
    });
  }
}

const searchMs = ms(tSearch);

/**
 * Build the candidate record: new document link, exact offsets, and the
 * citable class. Nothing is written to the real record until the gate
 * accepts it.
 *
 * `offset` is the quote's index WITHIN doc.text (not within the shared
 * index buffer), and end = offset + quote.length, so L3's
 * source.slice(start, end) === quote holds by construction.
 */
function anchorTrial(record, doc) {
  const quote = record.evidence_quote.trim();
  const trial = { ...record };
  trial.source_file = basename(doc.rel);
  trial.source_path = doc.rel;
  trial.source_doc_hash = docHash(doc.text);
  trial.evidence_span = {
    start_char: doc.offset,
    end_char: doc.offset + quote.length,
    verification_tier: "MSVH_S1_EXACT",
  };
  const mechanism = (record.mechanism_quote ?? "").trim();
  if (mechanism.length > 0) {
    const mIdx = doc.text.indexOf(mechanism);
    trial.mechanism_span =
      mIdx === -1
        ? { start_char: null, end_char: null, verification_tier: "MSVH_S0_UNCITED" }
        : { start_char: mIdx, end_char: mIdx + mechanism.length, verification_tier: "MSVH_S1_EXACT" };
  }
  trial.record_class = "CITABLE_VERIFIED";
  trial.citable = true;
  trial.verification_tier = "MSVH_S1_EXACT";
  delete trial.status;
  delete trial.quarantine_reason;
  return trial;
}

/** Commit an accepted trial's anchoring fields onto the real record. */
function applyTrial(record, trial) {
  record.source_file = trial.source_file;
  record.source_path = trial.source_path;
  record.source_doc_hash = trial.source_doc_hash;
  record.evidence_span = trial.evidence_span;
  record.mechanism_span = trial.mechanism_span;
  record.record_class = trial.record_class;
  record.citable = trial.citable;
  record.verification_tier = trial.verification_tier;
  delete record.quarantine_reason;
  delete record.quarantine_claimed_source;
}

/**
 * Quarantine: the record keeps its text, loses the claim it cannot support.
 * The unverifiable source is nulled rather than silently kept, and the old
 * value is preserved under `quarantine_claimed_source` so nothing is erased.
 */
function quarantine(record, verdict, why) {
  if (record.status !== "QUARANTINED") {
    record.quarantine_claimed_source = record.source_file ?? null;
  }
  record.record_class = "HONESTLY_UNCITED_PRIOR";
  record.verification_tier = "MSVH_S0_UNCITED";
  record.citable = false;
  record.evidence_span = { start_char: null, end_char: null, verification_tier: "MSVH_S0_UNCITED" };
  record.mechanism_span = { start_char: null, end_char: null, verification_tier: "MSVH_S0_UNCITED" };
  record.source_file = null;
  record.source_path = null;
  record.source_doc_hash = null;
  record.status = "QUARANTINED";
  const layers = verdict?.failed_layers?.length ? verdict.failed_layers.join("+") : "UNKNOWN";
  record.quarantine_reason = `${layers}: ${why}`;
}

// ------------------------------------------------------------- 5. output

// Re-verify only the records this pass actually changed. Every other record
// is byte-identical to its input, so its verdict cannot have moved.
for (const record of records) {
  const changed = record.status === "REANCHORED_MOVED" || record.status === "REANCHORED_IN_PLACE";
  if (changed && verifyRecord(record, library).admitted) report.admittedAfter++;
}
report.admittedAfter += report.unchangedAdmitted;

const lines = records.map((r) => JSON.stringify(r));
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${lines.join("\n")}\n`, "utf8");

// ------------------------------------------------------------- 6. report

const out = [];
out.push("=== RE-ANCHORING PASS: MIND CORPUS ===");
out.push("");
out.push("paper corpus (verified on disk, not assumed):");
for (const d of paperDirs) {
  out.push(`  USED      ${d.rel}  (${d.files.length} .md files)`);
}
for (const r of paperDirRejects) {
  out.push(`  REJECTED  ${r.rel}  (${r.why})`);
}
out.push(`  indexed: ${docs.length} docs, ${(bufferBytes / 1048576).toFixed(1)} MB, ${windows.toLocaleString("en-US")} ${GRAM}-gram windows`);
out.push(`  index build ${round1(indexMs)} ms  (discovery ${round1(discoverMs)} ms)`);
out.push(`  quote search ${round1(searchMs)} ms over ${searchCalls} searched records`);
out.push("");
out.push("records:");
out.push(`  examined                       ${report.examined}`);
out.push(`  admitted before this pass      ${report.admittedBefore}`);
out.push(`  RE-ANCHORED (link moved)       ${report.reanchoredMoved}`);
out.push(`  RE-ANCHORED (span in place)    ${report.reanchoredInPlace}`);
out.push(`  QUARANTINED                    ${report.quarantined}`);
out.push(`  unchanged, already admitted    ${report.unchangedAdmitted}`);
out.push(`  unchanged, link OK / semantic  ${report.linkVerifiedSemanticFail}`);
out.push(`  unchanged, declared synthesis  ${report.unchangedDerived}`);
out.push(`  below search floor             ${report.belowSearchFloor}`);
out.push(`  quote found but gate refused   ${report.candidatesFoundButRejected}`);
out.push(`  admitted after this pass       ${report.admittedAfter}  (${pct(report.admittedAfter, report.examined)})`);
out.push("");
out.push("quarantined, by failed layer:");
const ql = layerCounts(quarantineLayers);
if (ql.length === 0) out.push("  (none)");
for (const [l, n] of ql) out.push(`  ${l.padEnd(20)} ${String(n).padStart(5)}  (${pct(n, report.quarantined)} of quarantined)`);
out.push("");
out.push("link-verified records that fail on semantics (NOT quarantined by default):");
const sl = layerCounts(semanticLayers);
if (sl.length === 0) out.push("  (none)");
for (const [l, n] of sl) out.push(`  ${l.padEnd(20)} ${String(n).padStart(5)}`);
out.push("");
if (movedSamples.length) {
  out.push("re-anchored samples:");
  for (const s of movedSamples) out.push(`  ${s.item_id}: ${s.from} -> ${s.to}`);
  out.push("");
}
if (quarantineSamples.length) {
  out.push("quarantined samples:");
  for (const s of quarantineSamples.slice(0, 5)) out.push(`  ${s.item_id} (claimed ${s.claimed}): ${s.layers}`);
  out.push("");
}
out.push(`output: ${OUTPUT}`);
out.push(`        ${lines.length} records, ${readFileSync(OUTPUT, "utf8").length} bytes`);
if (!SEMANTIC_AS_QUARANTINE) {
  out.push("");
  out.push("note: --semantic-as-quarantine not set, so records whose quote is verbatim");
  out.push("      in the document they name are left intact even when L2/L4 fail.");
}
console.log(out.join("\n"));
