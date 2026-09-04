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
 *   node scripts/ops/chaos-run.mjs scripts/ops/chaos/c9-everything-before-ship-v2.txt
 *
 * The token is read from ~/.omniroute/config.json (contexts.localhost.accessToken)
 * if OMNIROUTE_TOKEN is not set, so normally there is nothing to export.
 *
 * FLAGS
 *   --url <endpoint>   full endpoint URL. Default http://127.0.0.1:20128/api/chaos/run
 *   --out <dir>        where to write results. Default scripts/ops/chaos/out
 *   --max-tokens <n>   per-model ceiling, sent as `maxTokens`. Default 4096.
 *   --timeout <sec>    default 900. A full 4096-token run measured ~31s, slowest
 *                      model ~33s, so this is enormous headroom on purpose.
 *   --header "K: V"    extra request header; repeatable. Auth already goes out as
 *                      `authorization: Bearer $OMNIROUTE_TOKEN` — use this only if
 *                      the router wants the token somewhere else instead.
 *   --raw              always print the untouched response body as well as the summary
 *
 * CONTRACT (supplied by the operator, 2026-09-04 — an earlier version of this
 * file GUESSED it and guessed wrong on every field):
 *   request   { "task": "...", "maxTokens": 4096 }      NOT "prompt"
 *   response  { "models": [ ... ] }                     NOT "results"
 *   entry     { providerId, providerName, modelId, status, content, durationMs, error }
 * 15 participants, all free-tier. 14 of 15 answer; openrouter/ling-3.0-flash-fin
 * is quota-exhausted upstream and fails fast (~250ms, genuine 429) until its free
 * window resets. A failing entry is REPORTED, never dropped — a run that quietly
 * shows 14 answers when 15 were asked is the kind of silence this tool exists to
 * avoid. The generic walker is kept as a fallback for a shape change.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";

const DEFAULT_URL = "http://127.0.0.1:20128/api/chaos/run";

function parseArgs(argv) {
  const out = { file: null, url: DEFAULT_URL, dir: "scripts/ops/chaos/out", maxTokens: 4096, timeoutMs: 900_000, raw: false, headers: [] };
  // Two ways a valued flag can be left without a value, both of which used to
  // pass silently:
  //   --header          (last argument)  -> argv[++i] is undefined, which then
  //                     reached `h.indexOf(":")` as a bare TypeError naming
  //                     neither the flag nor the mistake.
  //   --url --raw       (next token is itself a flag) -> "--raw" was accepted
  //                     as the URL, AND --raw was swallowed, so the run fired
  //                     at a nonsense host with the flag silently dropped.
  // No value this script takes legitimately begins with "--", so treating a
  // "--" token as "missing value" is safe and catches the second case.
  const operand = (i) => {
    const flag = argv[i - 1];
    const v = argv[i];
    if (v === undefined) fail(`${flag} requires a value`);
    if (v.startsWith("--")) {
      fail(`${flag} requires a value, but the next argument is ${v}.\n` +
           `If ${v} was meant as its own flag, ${flag} is missing its value.`);
    }
    return v;
  };
  // --timeout is validated here so a bad value names itself. Left unchecked, an
  // invalid one reached `AbortSignal.timeout()` inside `fetch` and came back as
  // "request failed: ... Is the OmniRoute router running?", sending the operator
  // to debug their router over their own typo. Three distinct ways in, all
  // measured rather than assumed:
  //   "abc" / "-5" / "0"  -> NaN or non-positive; RangeError from Node.
  //   0.0001              -> 0.1 ms; RangeError, "must be an integer".
  //   4294967.295         -> WORSE than an error. Node's timers are 32-bit
  //                          SIGNED, so anything over 2^31-1 ms does not throw:
  //                          it warns and fires after 1 ms. The run aborts
  //                          instantly and nothing explains why.
  // Hence a 2^31-1 ceiling and a rounded integer millisecond, returned as ms so
  // the float never reaches AbortSignal at all.
  const MAX_TIMEOUT_MS = 2 ** 31 - 1;
  const parseTimeoutMs = (v) => {
    const n = Number(v);
    // Round rather than demand exact integrality: 1.001 * 1000 is
    // 1000.9999999999999 in binary floating point, and rejecting a plainly
    // valid 1001 ms for that reason is a false negative. The rounded integer
    // is what actually reaches AbortSignal, so the float never does.
    const ms = Math.round(n * 1000);
    if (!Number.isFinite(n) || n <= 0 || ms < 1 || ms > MAX_TIMEOUT_MS) {
      fail(`--timeout must be between 0.001 and ${MAX_TIMEOUT_MS / 1000} seconds ` +
           `(1 ms to ~24.8 days), got ${JSON.stringify(v)}.`);
    }
    return ms;
  };
  const positiveInt = (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) {
      fail(`--max-tokens must be a positive whole number, got ${JSON.stringify(v)}.`);
    }
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = operand(++i);
    else if (a === "--out") out.dir = operand(++i);
    else if (a === "--max-tokens") out.maxTokens = positiveInt(operand(++i));
    else if (a === "--timeout") out.timeoutMs = parseTimeoutMs(operand(++i));
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

/**
 * One entry of the documented `models` array:
 *   { providerId, providerName, modelId, status, content, durationMs, error }
 * `ok` is content-based, not status-based: a run that returned a status string
 * we have not seen before but DID return content is still an answer, and one
 * that reports success with an empty body is not. Judging by the payload rather
 * than by a label we may not recognise is the safer default in both directions.
 */
function normalizeEntry(e) {
  const text = typeof e?.content === "string" ? e.content : "";
  const model = String(e?.modelId ?? e?.providerId ?? "unknown");
  return {
    model,
    provider: String(e?.providerName ?? e?.providerId ?? ""),
    text,
    ok: text.trim() !== "",
    ms: Number.isFinite(e?.durationMs) ? e.durationMs : null,
    status: typeof e?.status === "string" ? e.status : "",
    error: typeof e?.error === "string" ? e.error : "",
  };
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

/**
 * The router already stores its own token, so making the operator export it by
 * hand is a step that exists only to be forgotten. Read it if present; return
 * null and let the caller's error message stand if anything is missing or
 * unreadable, because a config problem must not masquerade as a token problem.
 * Never logged or written to disk — only placed in the Authorization header.
 */
function tokenFromConfig() {
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (home === undefined || home === "") return null;
  const cfg = resolve(home, ".omniroute", "config.json");
  if (!existsSync(cfg)) return null;
  try {
    const t = JSON.parse(readFileSync(cfg, "utf8"))?.contexts?.localhost?.accessToken;
    return typeof t === "string" && t.trim() !== "" ? t : null;
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.file === null) fail("usage: node scripts/ops/chaos-run.mjs <prompt-file> [--url ...] [--out ...]");

  const token = (process.env.OMNIROUTE_TOKEN ?? process.env.OMA_TOKEN ?? tokenFromConfig() ?? "");
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

  const body = { task: prompt, maxTokens: args.maxTokens };

  const label = basename(promptPath).replace(/\.txt$/i, "");
  process.stdout.write(`Firing ${label} (${prompt.length} chars) at ${args.url}\n`);
  process.stdout.write(`Timeout ${args.timeoutMs / 1000}s. Chaos panels are slow — do not kill this early.\n\n`);

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
      signal: AbortSignal.timeout(args.timeoutMs),
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

  // Documented shape first; the generic walker only as a fallback if it changes.
  const entries = Array.isArray(parsed.value?.models) ? parsed.value.models : null;
  const answers = entries !== null ? entries.map(normalizeEntry) : extractAnswers(parsed.value).map(
    (a) => ({ model: a.model, provider: "", text: a.text, ok: true, ms: null, error: "" }));

  if (answers.length === 0) {
    process.stdout.write(`Parsed as ${parsed.kind}, but no model entries recognised.\n` +
      `This means UNRECOGNISED SHAPE, not "no answers" — the contract may have changed.\n` +
      `Full body:\n\n`);
    process.stdout.write(JSON.stringify(parsed.value, null, 2).slice(0, 20000));
    return;
  }

  const ok = answers.filter((a) => a.ok);
  const bad = answers.filter((a) => !a.ok);

  const mdPath = resolve(outDir, `${label}-${stamp}.md`);
  const md = [`# ${label}`, "", `Endpoint: ${args.url}`, `Elapsed: ${elapsed}s`,
    `Answered: ${ok.length} of ${answers.length}${bad.length > 0 ? ` (${bad.length} failed)` : ""}`, "",
    ...(bad.length > 0 ? ["## Failed", "", ...bad.map((a) => `- **${a.model}** (${a.provider}) — ${a.error || a.status || "no content"}`), ""] : []),
    "---", "", `## PROMPT SENT`, "", "```", prompt.trim(), "```", "",
    ...ok.flatMap((a, i) => ["---", "", `## ${i + 1}. ${a.model}${a.provider ? ` — ${a.provider}` : ""}`, "", a.text.trim(), ""])].join("\n");
  writeFileSync(mdPath, md, "utf8");

  process.stdout.write(`${ok.length} of ${answers.length} answered` +
    `${bad.length > 0 ? `, ${bad.length} FAILED` : ""}. Transcript -> ${mdPath}\n\n`);
  for (const a of answers) {
    const secs = a.ms === null ? "" : `${(a.ms / 1000).toFixed(1)}s`.padStart(7);
    if (!a.ok) {
      process.stdout.write(`  ${a.model.padEnd(30)}${secs}  FAILED  ${(a.error || a.status || "no content").slice(0, 60)}\n`);
      continue;
    }
    const words = a.text.trim().split(/\s+/).length;
    const head = a.text.trim().split("\n").find((l) => l.trim() !== "") ?? "";
    process.stdout.write(`  ${a.model.padEnd(30)}${secs}  ${String(words).padStart(5)}w  ${head.slice(0, 64)}\n`);
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
