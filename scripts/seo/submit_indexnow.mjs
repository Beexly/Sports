#!/usr/bin/env node
/**
 * submit_indexnow.mjs
 *
 * Bulk IndexNow submission script for https://www.galaxysportsedge.com
 * (notifies Microsoft Bing / Copilot, ChatGPT Search indexers, DuckDuckGo,
 * Yandex, and Naver globally in one POST).
 *
 * Usage:
 *   node scripts/seo/submit_indexnow.mjs --dry-run
 *   node scripts/seo/submit_indexnow.mjs --live
 */

const HOST = "www.galaxysportsedge.com";
const ORIGIN = "https://" + HOST;
const INDEXNOW_KEY = process.env.GSE_INDEXNOW_KEY || "gse81de664a74c221fd9a0cfe7423seo";
const KEY_LOCATION = `${ORIGIN}/${INDEXNOW_KEY}.txt`;

const PRIORITY_URLS = [
  `${ORIGIN}/`,
  `${ORIGIN}/pricing`,
  `${ORIGIN}/picks`,
  `${ORIGIN}/props`,
  `${ORIGIN}/packages`,
  `${ORIGIN}/fantasy/dfs`,
  `${ORIGIN}/accountability`,
  `${ORIGIN}/record`,
  `${ORIGIN}/llms.txt`,
  `${ORIGIN}/llms-full.txt`,
  `${ORIGIN}/.well-known/agent-card.json`,
  `${ORIGIN}/.well-known/mcp/server-card.json`,
];

async function collectSitemapUrls() {
  try {
    const res = await fetch(`${ORIGIN}/sitemap.xml`);
    if (!res.ok) return PRIORITY_URLS;
    const xml = await res.text();
    const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    const merged = Array.from(new Set([...PRIORITY_URLS, ...matches])).filter((u) =>
      u.startsWith(ORIGIN),
    );
    return merged.slice(0, 10000);
  } catch {
    return PRIORITY_URLS;
  }
}

async function main() {
  const isLive = process.argv.includes("--live");
  const urlList = await collectSitemapUrls();
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  if (!isLive) {
    console.log(
      JSON.stringify(
        { mode: "dry-run", count: urlList.length, keyLocation: KEY_LOCATION, sample: urlList.slice(0, 12) },
        null,
        2,
      ),
    );
    return;
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  console.log(`IndexNow HTTP ${res.status} for ${urlList.length} URLs`);
  if (res.status !== 200 && res.status !== 202) {
    process.exitCode = 1;
  }
}

main();
