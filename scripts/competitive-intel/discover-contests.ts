#!/usr/bin/env node
/**
 * Contest id discovery.
 *
 * The usernames endpoint keys on a contest id that is not a sequence: neighbouring ids miss and
 * random sampling across the whole range misses. So ids are gathered from sources and then
 * VERIFIED, and only verified ids are written. A candidate that returns 200 with a body under
 * 200 bytes is an empty contest and is kept only when `--keep-empty` is passed.
 *
 * Sources, in the order they are tried:
 *   wayback   archived /api/contests/usernames and /usersummary URLs, which carry literal ids
 *   slate     /api/contests/{sport}/slates/?date=YYYY-MM-DD, the live listing. Its `id` field is
 *             a different id space from the one usernames takes, which is exactly why every
 *             candidate is verified before it is written
 *   probe     +/- N around every verified id, because contests of one slate are often created
 *             together even though the space as a whole is sparse
 *
 * Usage:
 *   npx tsx scripts/competitive-intel/discover-contests.ts --out .ci-out/ids.json --days 3
 *
 * Exit: 0 wrote candidates, 1 nothing verified, 2 usage.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const UA = "GSE-CompetitiveIntel/1.0 (+https://github.com/Beexly/Sports)";
const SPORT = Number(argOf("sport") ?? 5);
const DAYS = Number(argOf("days") ?? 3);
const PROBE = Number(argOf("probe") ?? 12);
const OUT = argOf("out");
const KEEP_EMPTY = process.argv.includes("--keep-empty");

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

interface Candidate {
  contestId: number;
  source: "wayback" | "slate" | "probe";
  bytes: number;
  verifiedAt: string;
}

if (!OUT) {
  console.error("usage: discover-contests.ts --out <file.json> [--sport 5] [--days 3] [--probe 12]");
  process.exit(2);
}

async function get(url: string, timeoutMs = 20000): Promise<{ status: number; bytes: number; text: string }> {
  const ctl = AbortSignal.timeout(timeoutMs);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ctl });
    const text = await res.text();
    return { status: res.status, bytes: text.length, text };
  } catch {
    return { status: 0, bytes: 0, text: "" };
  }
}

async function fromWayback(): Promise<Set<number>> {
  const ids = new Set<number>();
  for (const pattern of ["usernames", "usersummary"]) {
    const url =
      `http://web.archive.org/cdx/search/cdx?url=fantasylabs.com/api/contests/${pattern}*` +
      `&output=text&fl=original&collapse=urlkey&limit=2000`;
    const res = await get(url, 30000);
    if (res.status !== 200) {
      console.warn(`[discover] wayback ${pattern} unavailable (${res.status})`);
      continue;
    }
    for (const m of res.text.matchAll(/contests\/[a-z]+\/\d+\/(\d+)/g)) ids.add(Number(m[1]));
  }
  return ids;
}

async function fromSlates(): Promise<Set<number>> {
  const ids = new Set<number>();
  const today = Date.now();
  for (let d = -DAYS; d <= DAYS; d += 1) {
    const date = new Date(today + d * 86_400_000).toISOString().slice(0, 10);
    const res = await get(`https://www.fantasylabs.com/api/contests/${SPORT}/slates/?date=${date}`);
    if (res.status !== 200 || !res.text.trim().startsWith("[")) continue;
    for (const m of res.text.matchAll(/"id":(\d+)/g)) ids.add(Number(m[1]));
  }
  return ids;
}

async function verify(ids: Iterable<number>): Promise<Candidate[]> {
  const list = [...ids];
  const out: Candidate[] = [];
  const queue = [...list];
  const workers = Array.from({ length: 4 }, async () => {
    for (;;) {
      const id = queue.shift();
      if (id === undefined) return;
      const res = await get(`https://www.fantasylabs.com/api/contests/usernames/${SPORT}/${id}`);
      if (res.status !== 200) continue;
      if (res.bytes <= 200 && !KEEP_EMPTY) continue;
      out.push({ contestId: id, source: "probe", bytes: res.bytes, verifiedAt: new Date().toISOString() });
    }
  });
  await Promise.all(workers);
  return out;
}

async function main(): Promise<void> {
  const waybackIds = await fromWayback();
  const slateIds = await fromSlates();
  console.log(`[discover] candidates wayback ${waybackIds.size} slate ${slateIds.size}`);

  const verified: Candidate[] = [];
  for (const [source, ids] of [
    ["wayback", waybackIds],
    ["slate", slateIds],
  ] as const) {
    const hits = await verify(ids);
    for (const hit of hits) verified.push({ ...hit, source });
    console.log(`[discover] ${source}: ${hits.length}/${ids.size} verified`);
  }

  // Neighbour probe around what actually answered.
  const seeds = verified.map((v) => v.contestId);
  const neighbours = new Set<number>();
  for (const seed of seeds) for (let d = -PROBE; d <= PROBE; d += 1) if (d !== 0) neighbours.add(seed + d);
  for (const hit of verified) neighbours.delete(hit.contestId);
  const neighbourHits = await verify(neighbours);
  for (const hit of neighbourHits) verified.push({ ...hit, source: "probe" });
  console.log(`[discover] probe: ${neighbourHits.length}/${neighbours.size} verified`);

  verified.sort((a, b) => b.bytes - a.bytes);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify({ sport: SPORT, generatedAt: new Date().toISOString(), candidates: verified }, null, 1),
  );
  console.log(`[discover] wrote ${verified.length} verified id(s) -> ${OUT}`);
  console.log(`[discover] largest: ${verified.slice(0, 5).map((v) => `${v.contestId} (${v.bytes}b)`).join(", ")}`);
  if (verified.length === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
