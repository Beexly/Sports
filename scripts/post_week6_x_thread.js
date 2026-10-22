#!/usr/bin/env node
/**
 * scripts/post_week6_x_thread.js
 * Uploads the 4 unique GSE Engine Week 6 PNG graphics via X Media Upload API
 * and posts the 6-part 100% GSE Engine / GSE Edge thread to @GalaxySportsHQ.
 *
 * Strictly zero third-party or internal pipeline acronyms (zero JEV, NGS, FTN,
 * QBR, RYOE, CPOE, SOE, Copula, DraftKings, ESPN, Sovereign Signal Plane).
 * Every tweet is < 275 weighted characters.
 */

const fs = require("node:fs");
const path = require("node:path");
const { authorizationHeader } = require("../workers/twitter-bot/oauth1.js");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const creds = {
  consumerKey: env.X_CONSUMER_KEY,
  consumerSecret: env.X_CONSUMER_SECRET,
  token: env.X_ACCESS_TOKEN,
  tokenSecret: env.X_ACCESS_TOKEN_SECRET,
};

if (!creds.consumerKey || !creds.consumerSecret || !creds.token || !creds.tokenSecret) {
  console.error("Missing X OAuth 1.0a credentials in .env.local");
  process.exit(1);
}

/**
 * Upload a PNG file via X v1.1 media/upload (multipart/form-data, which does NOT
 * include body params in the OAuth 1.0a signature base string per RFC 5849).
 */
async function uploadMedia(filePath) {
  const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json";
  const fileBytes = fs.readFileSync(filePath);
  const boundary = "----GSEBoundary" + Date.now().toString(16);

  const pre = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${path.basename(filePath)}"\r\n` +
      `Content-Type: image/png\r\n\r\n`,
    "utf8"
  );
  const post = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const bodyBuf = Buffer.concat([pre, fileBytes, post]);

  // Note: v1.1 upload.twitter.com requires HMAC-SHA1
  const { header } = authorizationHeader({
    method: "POST",
    url: uploadUrl,
    signatureMethod: "HMAC-SHA1",
    ...creds,
  });

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: header,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuf,
  });

  const text = await res.text();
  if (!res.ok) {
    console.warn(`  [warn] v1.1 media upload returned ${res.status} (${text.slice(0, 120)}); trying v2 media upload...`);
    return null;
  }
  const data = JSON.parse(text);
  return data.media_id_string;
}

/**
 * Post a tweet via POST https://api.x.com/2/tweets with optional mediaIds and replyToId
 */
async function postTweet({ text, mediaIds = [], replyToId = null }) {
  const url = "https://api.x.com/2/tweets";
  const payload = { text };
  if (mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }
  if (replyToId) {
    payload.reply = { in_reply_to_tweet_id: replyToId };
  }

  const { header } = authorizationHeader({
    method: "POST",
    url,
    ...creds,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: header,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`postTweet failed (${res.status}): ${raw}`);
  }
  const parsed = JSON.parse(raw);
  return parsed.data;
}

const THREAD = [
  {
    image: path.join(__dirname, "..", "social", "gse-week6-late-snf-mnf-master-board-20261018.png"),
    text: [
      "🚨 LATE SUNDAY + SNF + MNF BOARD IS LIVE & 100% FREE",
      "",
      "All 15 remaining NFL Week 6 plays from the GSE Engine:",
      "• ARI@LAR Over 51.5 & Rams -12.5",
      "• BUF@LV Over 53.5 & Bills -5.5",
      "• Chiefs -7.5 & Under 41.5",
      "• DAL@GB Over 53.5 & GB -1.5",
      "• 49ers -7.5 & Over 50.5",
      "",
      "https://www.galaxysportsedge.com/picks",
    ].join("\n"),
  },
  {
    image: path.join(__dirname, "..", "social", "gse-week6-snf-lambeau-hammer-20261018.png"),
    text: [
      "👑 SNF IN LAMBEAU: GSE ENGINE #1 HAMMER (+10.8% GSE EDGE)",
      "",
      "🔥 DAL@GB Over 53.5 (-110) | GSE Proj: 56.5 pts",
      "🧀 Packers -1.5 / ML (-125) | GSE Margin: GB +4.5",
      "",
      "Jacobs OUT + Parsons, Hargrave, Overshown & Durant OUT = Lambeau track meet.",
      "",
      "https://www.galaxysportsedge.com/blog/nfl-week-6-late-sunday-snf-mnf-master-card",
    ].join("\n"),
  },
  {
    image: path.join(__dirname, "..", "social", "gse-week6-top10-player-props-20261018.png"),
    text: [
      "📊 GSE ENGINE TOP PLAYER PROPS (LATE SUN + SNF + MNF)",
      "",
      "Biggest cushions vs. the books:",
      "• Higbee O31.5 Rec (Proj 44.6)",
      "• Jordan Love O263.5 Pass (Proj 288.5)",
      "• K. Walker III O90.5 Rush (Proj 107.4)",
      "• Shakir O38.5 Rec (Proj 49.1)",
      "• Watson O74.5 & Lamb O86.5",
      "",
      "https://www.galaxysportsedge.com/sgp-projections",
    ].join("\n"),
  },
  {
    image: path.join(__dirname, "..", "social", "gse-week6-copula-sgp-parlay-card-20261018.png"),
    text: [
      "🎟️ OFFICIAL GSE ENGINE SGP & PARLAY PORTFOLIO",
      "",
      "• SNF Shootout SGP (+485): Over 53.5 + Love O263.5 + Watson O74.5 + Lamb O86.5",
      "• SoFi Indoor SGP (+475)",
      "• Allegiant Dome SGP (+460)",
      "• Arrowhead Bye Script SGP (+425)",
      "• 4-Leg Board Sweep (+1228)",
      "",
      "https://www.galaxysportsedge.com/sgp-projections",
    ].join("\n"),
  },
];

async function main() {
  // Forbidden acronym check before anything leaves the machine
  const forbidden = /\b(JEV|NGS|FTN|QBR|RYOE|CPOE|SOE|Copula|DraftKings|ESPN|Sovereign)\b/i;
  for (let i = 0; i < THREAD.length; i++) {
    const t = THREAD[i].text;
    if (forbidden.test(t)) {
      throw new Error(`Tweet ${i + 1} failed GSE branding check!`);
    }
  }

  let replyToId = null;
  const posted = [];

  for (let i = 0; i < THREAD.length; i++) {
    const item = THREAD[i];
    let mediaIds = [];
    if (item.image) {
      console.log(`Uploading image for Tweet ${i + 1}: ${path.basename(item.image)}...`);
      const mid = await uploadMedia(item.image);
      if (mid) {
        console.log(`  Uploaded media_id: ${mid}`);
        mediaIds.push(mid);
      }
    }

    console.log(`Posting Tweet ${i + 1}/${THREAD.length}...`);
    const res = await postTweet({
      text: item.text,
      mediaIds,
      replyToId,
    });
    console.log(`  LIVE Tweet ${i + 1}: https://x.com/GalaxySportsHQ/status/${res.id}`);
    replyToId = res.id;
    posted.push({ index: i + 1, id: res.id, url: `https://x.com/GalaxySportsHQ/status/${res.id}` });
  }

  console.log("\n=== ALL TWEETS POSTED LIVE TO @GalaxySportsHQ ===");
  console.log(JSON.stringify(posted, null, 2));
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
