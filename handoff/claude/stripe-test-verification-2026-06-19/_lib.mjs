// Shared helper: load STRIPE_SECRET_KEY from .env.production.local and call Stripe REST.
// Never prints the secret. Read-only by default; writes only when called explicitly.
import { readFileSync } from "node:fs";

const ENV_PATH = new URL("../../../.env.production.local", import.meta.url);

export function loadKey() {
  const txt = readFileSync(ENV_PATH, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^STRIPE_SECRET_KEY=(.*)$/);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return v;
    }
  }
  throw new Error("STRIPE_SECRET_KEY not found in .env.production.local");
}

const STRIPE_API = "https://api.stripe.com/v1";

export async function stripeReq(key, method, path, body = null) {
  const url = `${STRIPE_API}${path}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const init = { method, headers };
  if (body) init.body = new URLSearchParams(body).toString();
  const res = await fetch(url, init);
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, ok: res.ok, json };
}

export function maskKey(key) {
  return key.slice(0, 12) + "..." + (key.startsWith("sk_live_") ? "[LIVE!]" : "[test]");
}
