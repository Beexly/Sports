/**
 * X / Twitter OAuth 1.0a signer — RFC 5849, HMAC-SHA1.
 *
 * Pure, deterministic, no network, no DOM, no format surprises.
 * Unit-testable in this environment with only Node built-ins.
 *
 * Usage:
 *   const authHeader = signOAuth1({
 *     method: "POST",
 *     hostname: "api.twitter.com",
 *     path: "/1.1/statuses/update.json",
 *     consumerKey,
 *     consumerSecret,
 *     accessTokenKey,
 *     accessTokenSecret,
 *     nonce,
 *     timestamp,
 *   })
 */

import { createHmac } from "crypto";

export interface SignOAuth1Params {
  method: string;
  hostname: string;
  path: string;
  consumerKey: string;
  consumerSecret: string;
  accessTokenKey?: string | null;
  accessTokenSecret?: string | null;
  nonce?: string;
  timestamp?: number;
  extraParams?: Record<string, string | string[] | null | undefined>;
}

/**
 * RFC 5849 percent encoding: unreserved chars pass through, everything else is %XX.
 */
function percentEncode(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (
      (c >= 0x41 && c <= 0x5A) ||
      (c >= 0x61 && c <= 0x7A) ||
      (c >= 0x30 && c <= 0x39) ||
      c === 0x2D ||
      c === 0x2E ||
      c === 0x5F ||
      c === 0x7E
    ) {
      out += s[i];
    } else {
      out += "%" + c.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

function collectParamEntries(
  params: Record<string, string | string[] | null | undefined>,
): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        entries.push([key, v]);
      }
    } else {
      entries.push([key, value]);
    }
  }
  return entries;
}

function buildAuthHeader(
  entries: Array<[string, string]>,
  signature: string,
): string {
  const parts = entries
    .map(
      ([k, v]) =>
        `${percentEncode(k)}="${percentEncode(v)}"`,
    )
    .join(", ");
  return `OAuth ${parts}, oauth_signature="${percentEncode(signature)}"`;
}

export function signOAuth1(
  p: SignOAuth1Params,
): string {
  const consumerSecret: string =
    p.consumerSecret +
    "&" +
    (p.accessTokenSecret ?? "");

  const nonce = p.nonce ?? Math.random().toString(36).slice(2, 16);
  const timestamp = String(
    p.timestamp ?? Math.floor(Date.now() / 1000),
  );

  // Collect ALL params: OAuth + extra (body/query) params
  const oauthParams: Record<string, string | null | undefined> = {
    oauth_consumer_key: p.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_version: "1.0",
    oauth_token: p.accessTokenKey ?? null,
  };

  const allParams: Record<string, string | string[] | null | undefined> = {
    ...oauthParams,
    ...(p.extraParams ?? {}),
  };

  const entries = collectParamEntries(allParams);

  // Build base string: METHOD&base_url&base_params
  const baseUrl = `https://${p.hostname}${p.path}`;
  const sigBase =
    p.method.toUpperCase() +
    "&" +
    percentEncode(baseUrl) +
    "&" +
    percentEncode(
      entries
        .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
        .sort()
        .join("&"),
    );

  const hmac = createHmac("sha1", consumerSecret);
  hmac.update(sigBase);
  const signature = hmac.digest("base64");

  return buildAuthHeader(entries, signature);
}

export interface BuildPostParams {
  status: string;
  reply_status_id?: string | null;
  auto_populate_reply_metadata?: boolean | null;
  features?: {
    edit_control?: { enabled: boolean } | null;
    settle_origin?: { status: "tweet" | "media_ids" } | null;
    possibly_sensitive?: boolean | null;
    quote_tweet?: { disabled: boolean } | null;
  } | null;
  entities?: {
    hashtags: Array<{ text: string }>;
    symbols: Array<{ text: string }>;
    user_mentions: Array<{ screen_name: string; id: number }>;
  } | null;
}

export async function postStatus(
  accessTokenKey: string,
  accessTokenSecret: string,
  consumerKey: string,
  consumerSecret: string,
  params: BuildPostParams,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const hostname = "api.twitter.com";
  const path = "/1.1/statuses/update.json";

  const bodyParams: Record<string, string | string[] | null | undefined> = {
    status: params.status,
  };
  if (params.reply_status_id) {
    bodyParams.reply_status_id = params.reply_status_id;
  }
  if (params.auto_populate_reply_metadata !== null && params.auto_populate_reply_metadata !== undefined) {
    bodyParams.auto_populate_reply_metadata = String(params.auto_populate_reply_metadata);
  }
  if (params.features) {
    bodyParams.features = JSON.stringify(params.features);
  }

  const authHeader = signOAuth1({
    method: "POST",
    hostname,
    path,
    consumerKey,
    consumerSecret,
    accessTokenKey,
    accessTokenSecret,
    extraParams: bodyParams,
  });

  const body = new URLSearchParams(
    Object.entries(bodyParams).map(([k, v]) => [k, String(v)]),
  ).toString();

  const url = `https://${hostname}${path}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return { success: false, error: `${resp.status} ${resp.statusText}: ${txt}` };
  }

  return { success: true, data: await resp.json() };
}

export type { SignOAuth1Params, BuildPostParams };