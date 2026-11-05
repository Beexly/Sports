#!/usr/bin/env node
/**
 * Sync live Stripe Products (and Account display name) with the active weekly
 * package catalog so Stripe Checkout NEVER displays stale prior-week matchups
 * (e.g. "Panthers @ Packers") or mangled non-ASCII characters ("?").
 */
import fs from "node:fs";

const STRIPE_API = "https://api.stripe.com/v1";

function loadStripeKey() {
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY.replace(/\\n|\\r/g, "").trim();
  }
  const envPath = process.argv[2];
  if (envPath && fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf8");
    const m =
      text.match(/^STRIPE_SECRET_KEY="([^"]+)"/m) ||
      text.match(/^STRIPE_SECRET_KEY=([^\r\n]+)/m);
    if (m && m[1]) return m[1].replace(/\\n|\\r/g, "").trim();
  }
  throw new Error("Missing STRIPE_SECRET_KEY");
}

async function stripeReq(key, method, path, params) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  return { status: res.status, data: await res.json() };
}

const WEEK9_PRODUCT_UPDATES = {
  prod_VX406TulqtZwJJ: {
    name: "Galaxy Sports Edge - Week 9 TNF Game Pack (Jaguars @ Ravens + Showdown DFS)",
    description:
      "Week 9 Thursday Night Football (Jacksonville Jaguars at Baltimore Ravens): Spread Pass Discipline Read + 10 Top-Confidence TNF Player Matchups (88/100), 3-Leg Correlated JAX @ BAL Same-Game Parlay, and DraftKings/FanDuel Showdown Captain lineups.",
  },
  prod_VX40XMRjV4FiJl: {
    name: "Galaxy Sports Edge - Week 9 Player Props, Anytime TD, Defense/IDP & SGP Pack",
    description:
      "Week 9 TNF (JAX @ BAL) through Sunday & Monday Night Football (TB @ KC): Top-Rated Skill & QB Player Props (up to 88/100), Goal-Line Anytime TDs, Linebacker Tackle-Funnel & Edge Sack Props, and 2-Leg/3-Leg Correlated Same-Game Parlays.",
  },
  prod_VX400OaIktCGLb: {
    name: "Galaxy Sports Edge - Week 9 Sunday & MNF Best Bets, 1Q/1H & RedZone DFS Pack",
    description:
      "Week 9 Sunday Main Slate, SNF (IND @ MIN), and MNF (TB @ KC): Locked Main-Line Spread, Moneyline & Total Calls (up to 85/100), 1Q/1H Opening Script Derivatives, Red-Zone Stall Kicker FGM Over 1.5 Reads, and RedZone DFS Lineups.",
  },
  prod_VX40T4RNpoNNIp: {
    name: "Galaxy Sports Edge - Week 9 All-Access Bundle (TNF JAX @ BAL + Sun-Mon + DFS)",
    description:
      "Complete Week 9 All-Access Pass: Unlocks TNF (JAX @ BAL) 10-Play Card (88/100), Sunday & MNF Main Game Lines, Skill/QB Props, Defense & IDP Pack, Anytime Touchdown Pack, Correlated SGPs, Kicking/1Q/1H Pack, and Full RedZone DFS.",
  },
};

async function main() {
  const key = loadStripeKey();

  const acct = await stripeReq(key, "GET", "/account");
  console.log("Stripe Account Before:", acct.status, {
    id: acct.data?.id,
    business_name: acct.data?.business_profile?.name,
    display_name: acct.data?.settings?.dashboard?.display_name,
  });

  if (acct.data?.id) {
    const updAcct = await stripeReq(key, "POST", `/accounts/${acct.data.id}`, {
      "business_profile[name]": "Galaxy Sports Edge",
      "settings[dashboard][display_name]": "Galaxy Sports Edge",
    });
    console.log(
      "Stripe Account Update:",
      updAcct.status,
      updAcct.data?.error ? updAcct.data.error.message : "Updated to Galaxy Sports Edge",
    );
  }

  const prods = await stripeReq(key, "GET", "/products?limit=100");
  const list = prods.data?.data ?? [];
  console.log(
    "Existing Stripe Products:",
    list.map((p) => ({ id: p.id, name: p.name, description: p.description })),
  );

  for (const [id, payload] of Object.entries(WEEK9_PRODUCT_UPDATES)) {
    const res = await stripeReq(key, "POST", `/products/${id}`, payload);
    console.log(`Updated ${id} -> [${res.status}] ${res.data?.name}`);
  }

  // Also check if any other active product has "Panthers", "Packers", "Week 8", or "?"
  for (const p of list) {
    if (WEEK9_PRODUCT_UPDATES[p.id]) continue;
    const combined = `${p.name || ""} ${p.description || ""}`;
    if (
      combined.includes("?") ||
      combined.includes("Panthers") ||
      combined.includes("Packers") ||
      combined.includes("Week 8")
    ) {
      const cleanedName = (p.name || "Galaxy Sports Edge Pack")
        .replace(/\?/g, "-")
        .replace(/Sunday Spotlight Game Pack \(Panthers @ Packers\)/gi, "Week 9 TNF Game Pack (Jaguars @ Ravens)")
        .replace(/Panthers @ Packers/gi, "Jaguars @ Ravens")
        .replace(/Carolina at Green Bay/gi, "Jacksonville at Baltimore")
        .replace(/Week 8/gi, "Week 9");
      const cleanedDesc = (p.description || "")
        .replace(/\?/g, "-")
        .replace(/Carolina at Green Bay/gi, "Jacksonville at Baltimore (Week 9 TNF)")
        .replace(/Panthers @ Packers/gi, "Jaguars @ Ravens")
        .replace(/Week 8/gi, "Week 9");
      const res = await stripeReq(key, "POST", `/products/${p.id}`, {
        name: cleanedName,
        description: cleanedDesc,
      });
      console.log(`Cleaned extra product ${p.id} -> [${res.status}] ${res.data?.name}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
