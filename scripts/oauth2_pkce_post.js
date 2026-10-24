#!/usr/bin/env node
/**
 * scripts/oauth2_pkce_post.js
 * Listens on both 127.0.0.1:80 and 127.0.0.1:3000 (or whichever redirect URI
 * is configured on X App 2092005252136394753Signal_Orig), opens the user's
 * logged-in Chrome browser to the X OAuth 2.0 authorization URL, exchanges
 * the returned `code` for an OAuth 2.0 user token, and posts the 4-part
 * GSE Engine thread to @GalaxySportsHQ.
 */

const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const CLIENT_ID = "YTFnVVFtTFFiMlZkQzVyRjFWVFo6MTpjaQ";
const CLIENT_SECRET = "OaAUnVvjItgwVkdiNJ21R6qusVtoh0h8zigSGj-nr32_T9vdsL";

const verifier = crypto.randomBytes(32).toString("base64url");
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
const state = crypto.randomBytes(16).toString("hex");

// Let's check what redirect URI is configured by starting servers on 80 and 3000
const REDIRECT_URI = process.argv[2] || "http://127.0.0.1";

const THREAD = [
  [
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
  [
    "👑 SNF IN LAMBEAU: GSE ENGINE #1 HAMMER (+10.8% GSE EDGE)",
    "",
    "🔥 DAL@GB Over 53.5 (-110) | GSE Proj: 56.5 pts",
    "🧀 Packers -1.5 / ML (-125) | GSE Margin: GB +4.5",
    "",
    "Jacobs OUT + Parsons, Hargrave, Overshown & Durant OUT = Lambeau track meet.",
    "",
    "https://www.galaxysportsedge.com/blog/nfl-week-6-late-sunday-snf-mnf-master-card",
  ].join("\n"),
  [
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
  [
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
];

async function exchangeCodeAndPost(code, redirectUri) {
  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed (${tokenRes.status}): ${tokenText}`);
  }
  const tokenData = JSON.parse(tokenText);
  const accessToken = tokenData.access_token;
  console.log("Successfully obtained OAuth 2.0 User Access Token! Scope:", tokenData.scope);

  // Save token in .env.local
  const envPath = path.join(__dirname, "..", ".env.local");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent += `\nX_OAUTH2_ACCESS_TOKEN=${accessToken}\n`;
  if (tokenData.refresh_token) {
    envContent += `X_OAUTH2_REFRESH_TOKEN=${tokenData.refresh_token}\n`;
  }
  fs.writeFileSync(envPath, envContent, "utf8");

  let replyToId = null;
  for (let i = 0; i < THREAD.length; i++) {
    const body = { text: THREAD[i] };
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }
    const postRes = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const postRaw = await postRes.text();
    if (!postRes.ok) {
      throw new Error(`Post ${i + 1} failed (${postRes.status}): ${postRaw}`);
    }
    const parsed = JSON.parse(postRaw);
    replyToId = parsed.data.id;
    console.log(`LIVE Tweet ${i + 1}: https://x.com/GalaxySportsHQ/status/${replyToId}`);
  }
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const code = u.searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Waiting for X OAuth 2.0 authorization code...</h2>");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<h1>✅ Galaxy Sports Edge Authorized! Posting thread to @GalaxySportsHQ right now — you can close this tab.</h1>");

  try {
    await exchangeCodeAndPost(code, REDIRECT_URI);
    console.log("ALL 4 TWEETS POSTED LIVE!");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
});

server.listen(80, "127.0.0.1", () => {
  const authUrl = new URL("https://x.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  console.log("Listening on http://127.0.0.1:80 ...");
  console.log("Opening Chrome to:", authUrl.toString());
  execFile("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [authUrl.toString()]);
});
