// Discover the wired STRIPE_PRO_MONTHLY_PRICE_ID by minting a NextAuth v5
// session for a throwaway test user and calling the live checkout endpoint.
// Read-only intent: only creates a Stripe checkout session + (maybe) a Stripe
// customer; everything is cleaned up later. Prints nothing secret.
import { loadEnv, getDb } from "./_db.mjs";
import { loadKey, stripeReq } from "./_lib.mjs";

loadEnv();
const ts = Number(process.argv[2] || Date.now());
const email = `test+launch-audit-${ts}@galaxysportsedge.com`;
const APP = "https://galaxysportsedge.com";

const db = getDb();
const key = loadKey();

// 1. Create throwaway user
const user = await db.user.upsert({
  where: { email },
  create: { email, name: "Launch Audit Bot", role: "USER" },
  update: {},
});
console.log("USER_ID:", user.id);
console.log("USER_EMAIL:", email);

// 2. Mint NextAuth v5 JWE session token
const secret = process.env["NEXTAUTH_SECRET"] || process.env["AUTH_SECRET"];
let encode;
try {
  ({ encode } = await import("next-auth/jwt"));
} catch (e) {
  console.log("ENCODE_IMPORT_ERR:", e.message.split("\n")[0]);
}

async function tryCheckout(cookieName) {
  const token = await encode({
    token: { sub: user.id, email, name: user.name, role: "USER" },
    secret,
    salt: cookieName,
    maxAge: 60 * 60,
  });
  const res = await fetch(`${APP}/api/subscriptions/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `${cookieName}=${token}`,
    },
    body: JSON.stringify({ tier: "PRO", interval: "month" }),
    redirect: "manual",
  });
  let body;
  try { body = await res.json(); } catch { body = await res.text(); }
  return { cookieName, status: res.status, body };
}

if (encode) {
  for (const name of ["__Secure-authjs.session-token", "authjs.session-token", "__Secure-next-auth.session-token", "next-auth.session-token"]) {
    try {
      const r = await tryCheckout(name);
      console.log(`CHECKOUT[${name}]: status=${r.status} body=${JSON.stringify(r.body)}`);
      const url = r.body && r.body.url;
      if (url) {
        const m = url.match(/\/(cs_[a-zA-Z0-9_]+)/) || url.match(/cs_[a-zA-Z0-9_]+/);
        const csId = m ? (m[1] || m[0]) : null;
        console.log("CHECKOUT_SESSION_ID:", csId);
        if (csId) {
          const sess = await stripeReq(key, "GET", `/checkout/sessions/${csId}?expand[]=line_items`);
          const li = sess.json.line_items?.data?.[0];
          console.log("WIRED_PRO_MONTHLY:", JSON.stringify({
            price_id: li?.price?.id,
            unit_amount: li?.price?.unit_amount,
            dollars: li?.price?.unit_amount != null ? (li.price.unit_amount/100).toFixed(2) : null,
            interval: li?.price?.recurring?.interval,
            customer: sess.json.customer,
            mode: sess.json.mode,
          }));
        }
        break;
      }
    } catch (e) {
      console.log(`CHECKOUT[${name}] ERR:`, e.message.split("\n")[0]);
    }
  }
}

await db.$disconnect();
