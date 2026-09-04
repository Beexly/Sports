#!/usr/bin/env node
/**
 * chaos-run.mjs — fire a Chaos Mode prompt file at the local OmniRoute router
 * and save every model's full answer to disk.
 *
 * WHY THIS EXISTS: the router binds 127.0.0.1 on the operator's own machine, so
 * an agent running in a cloud container cannot reach it. The operator runs this.
 * Node (not curl) because the operator is on Windows, where hand-escaping a 3 KB
 * JSON body into cmd.exe or PowerShell reliably mangles the prompt.
 *
 * USAGE
 *   set OMNIROUTE_TOKEN=oma_live_...            (PowerShell: $env:OMNIROUTE_TOKEN="oma_live_...")
 *   node scripts/ops/chaos-run.mjs scripts/ops/chaos/c1-edge-hunt.txt
 *   node scripts/ops/chaos-run.mjs scripts/ops/chaos/c6-clv-archive.txt
 *
 * FLAGS
 *   --url <endpoint>   full endpoint URL. Default http://127.0.0.1:20128/api/chaos/run
 *   --out <dir>        where to write results. Default scripts/ops/chaos/out
 *   --models a,b,c     forwarded as `models` in the body; omit to let the router decide
 *   --timeout <sec>    default 900 (chaos panels are slow; this is not a bug)
 *   --header "K: V"    extra request header; repeatable. Auth already goes out as
 *                      `authorization: Bearer $OMNIROUTE_TOKEN` — use this only if
 *                      the router wants the token somewhere else instead.
 *   --raw              always print the untouched response body as well as the summary
 *
 * HONESTY NOTE: this script was written WITHOUT the router's response schema in
 * hand. It parses JSON, then NDJSON, then gives up and prints the body verbatim.
 * It never invents a field. If the summary looks empty, the raw file on disk is
 * the source of truth — read that, and tell the author the real shape so the
 * summariser can be tightened.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

const DEFAULT_URL = "http://127.0.0.1:20128/api/chaos/run";

function parseArgs(argv) {
  const out = { file: null, url: DEFAULT_URL, dir: "scripts/ops/chaos/out", models: null, timeout: 900, raw: false, headers: [] };
  // A flag given as the LAST argument has no operand, and `argv[++i]` is then
  // `undefined`. Reject that here rather than letting the undefined travel —
  // it used to reach `h.indexOf(":")` and throw a bare TypeError that named
  // neither the flag nor the mistake.
  const operand = (i) => {
    const v = argv[i];
    if (v === undefined) fail(`${argv[i - 1]} requires a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = operand(++i);
    else if (a === "--out") out.dir = operand(++i);
    else if (a === "--models") out.models = operand(++i);
    else if (a === "--timeout") out.timeout = Number(operand(++i));
    else if (a === "--header") out.headers.push(operand(++i));
    else if (a === "--raw") out.raw = true;
    else if (a.startsWith("--")) fail(`unknown flag ${a}`);
    else if (out.file === null) out.file = a;
    else fail(`unexpected extra argument ${a}`);
  }
  return out;
}

function fail(msg) {
  process.stderr.write(`ERROR: ${msg}\n`);
  process.exit(1);
}

/** JSON, else NDJSON (one object per line), else null. */
function parseBody(text) {
  try {
    return { kind: "json", value: JSON.parse(text) };
  } catch {
    /* fall through */
  }
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const objs = [];
  for (const line of lines) {
    const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
    if (payload === "[DONE]") continue;
    try {
      objs.push(JSON.parse(payload));
    } catch {
      return null; // not NDJSON/SSE either
    }
  }
  return objs.length > 0 ? { kind: "ndjson", value: objs } : null;
}

/**
 * Pull out per-model answers WITHOUT assuming a schema. Walks the parsed body
 * for arrays of objects that carry both something model-name-ish and something
 * text-ish. Returns [] when nothing matches — which means "unrecognised", never
 * "the models said nothing".
 */
const NAME_KEYS = ["model", "model_id", "modelName", "name", "provider", "agent", "id"];
const TEXT_KEYS = ["text", "content", "answer", "output", "response", "message", "completion", "result"];

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

function extractAnswers(node, acc = [], depth = 0) {
  if (depth > 6 || node === null || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const item of node) extractAnswers(item, acc, depth + 1);
    return acc;
  }
  const name = pick(node, NAME_KEYS);
  let text = pick(node, TEXT_KEYS);
  // OpenAI-ish: { message: { content } } or { choices: [{ message: { content } }] }
  if (text === null && node.message && typeof node.message === "object") {
    text = pick(node.message, TEXT_KEYS);
  }
  if (name !== null && text !== null) {
    acc.push({ model: name, text });
    return acc; // do not also descend into a matched leaf
  }
  for (const v of Object.values(node)) extractAnswers(v, acc, depth + 1);
  return acc;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.file === null) fail("usage: node scripts/ops/chaos-run.mjs <prompt-file> [--url ...] [--out ...]");

  const token = process.env.OMNIROUTE_TOKEN ?? process.env.OMA_TOKEN ?? "";
  if (token.trim() === "") {
    fail("OMNIROUTE_TOKEN is not set. cmd:  set OMNIROUTE_TOKEN=oma_live_...\n" +
         "                       PowerShell:  $env:OMNIROUTE_TOKEN=\"oma_live_...\"");
  }

  const promptPath = resolve(process.cwd(), args.file);
  if (!existsSync(promptPath)) fail(`prompt file not found: ${promptPath}`);
  const prompt = readFileSync(promptPath, "utf8");
  if (prompt.trim() === "") fail(`prompt file is empty: ${promptPath}`);

  // Auth is sent as `authorization: Bearer <token>`. If this router wants a
  // different header instead, pass it rather than editing this file:
  //   --header "x-custom-auth: $OMNIROUTE_TOKEN"
  //
  // `authorization` and `content-type` are REFUSED rather than merged. These
  // values are spread into the request after the defaults, so accepting them
  // would let a --header silently replace the real credential (or the JSON
  // content type) with no indication at the call site that it had happened —
  // the run would just fail auth, or the router would reject the body, and the
  // cause would be invisible. --header exists to ADD a header for a router
  // whose auth scheme we do not know, never to replace one we do.
  const RESERVED = new Set(["authorization", "content-type"]);
  const extraHeaders = {};
  for (const h of args.headers) {
    const at = h.indexOf(":");
    if (at < 1) fail(`--header expects "Name: value", got ${JSON.stringify(h)}`);
    const name = h.slice(0, at).trim();
    if (name === "") fail(`--header has an empty name: ${JSON.stringify(h)}`);
    if (RESERVED.has(name.toLowerCase())) {
      fail(`--header may not set ${name}: it would silently override the value this ` +
           `script already sends.\nAuth goes out as "authorization: Bearer $OMNIROUTE_TOKEN". ` +
           `If the router wants the token\nunder a different name, add that name — ` +
           `e.g. --header "x-custom-auth: $OMNIROUTE_TOKEN".`);
    }
    extraHeaders[name] = h.slice(at + 1).trim();
  }

  const body = { prompt, mode: "chaos", stream: false };
  if (args.models !== null) body.models = args.models.split(",").map((m) => m.trim()).filter(Boolean);

  const label = basename(promptPath).replace(/\.txt$/i, "");
  process.stdout.write(`Firing ${label} (${prompt.length} chars) at ${args.url}\n`);
  process.stdout.write(`Timeout ${args.timeout}s. Chaos panels are slow — do not kill this early.\n\n`);

  const started = Date.now();
  let res;
  try {
    res = await fetch(args.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(args.timeout * 1000),
    });
  } catch (e) {
    fail(`request failed: ${e.message}\n` +
         `Is the OmniRoute router running and listening on ${new URL(args.url).host}?\n` +
         `If the endpoint path differs, pass it: --url http://127.0.0.1:20128/<real/path>`);
  }

  const text = await res.text();
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  const outDir = resolve(process.cwd(), args.dir);
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rawPath = resolve(outDir, `${label}-${stamp}.raw.txt`);
  writeFileSync(rawPath, text, "utf8");

  process.stdout.write(`HTTP ${res.status} in ${elapsed}s. Raw body -> ${rawPath}\n\n`);

  if (!res.ok) {
    process.stdout.write(text.slice(0, 4000));
    process.stdout.write(`\n\nHTTP ${res.status} is a router-side rejection, not a model answer.\n` +
      `404 -> wrong path, re-run with --url. 401/403 -> token. 400 -> body shape; send the\n` +
      `raw file above to the author so the request can be corrected.\n`);
    process.exit(1);
  }

  const parsed = parseBody(text);
  if (parsed === null) {
    process.stdout.write("Body is not JSON or NDJSON. Printing verbatim:\n\n");
    process.stdout.write(text);
    return;
  }

  const answers = extractAnswers(parsed.value);
  if (answers.length === 0) {
    process.stdout.write(`Parsed as ${parsed.kind}, but no {model, text} pairs recognised.\n` +
      `This means UNRECOGNISED SHAPE, not "no answers". Full body:\n\n`);
    process.stdout.write(JSON.stringify(parsed.value, null, 2).slice(0, 20000));
    return;
  }

  const mdPath = resolve(outDir, `${label}-${stamp}.md`);
  const md = [`# ${label}`, "", `Endpoint: ${args.url}`, `Elapsed: ${elapsed}s`, `Models answering: ${answers.length}`, "",
    "---", "", `## PROMPT SENT`, "", "```", prompt.trim(), "```", "",
    ...answers.flatMap((a, i) => ["---", "", `## ${i + 1}. ${a.model}`, "", a.text.trim(), ""])].join("\n");
  writeFileSync(mdPath, md, "utf8");

  process.stdout.write(`${answers.length} model answer(s). Readable transcript -> ${mdPath}\n\n`);
  for (const a of answers) {
    const words = a.text.trim().split(/\s+/).length;
    const head = a.text.trim().split("\n").find((l) => l.trim() !== "") ?? "";
    process.stdout.write(`  ${a.model.padEnd(28)} ${String(words).padStart(5)} words  ${head.slice(0, 90)}\n`);
  }

  process.stdout.write(
    `\nREMINDER: every line above is a HYPOTHESIS, not a finding. Nothing enters a doc\n` +
    `or the product until it is falsified against the 15,939-pick corpus, the live\n` +
    `graded picks, or a source we opened ourselves. See docs/ops/CHAOS_CAMPAIGN_2026-09-04.md.\n`);

  if (args.raw) {
    process.stdout.write(`\n--- RAW ---\n${text}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`ERROR: ${e.message}\n`);
  process.exit(1);
});
