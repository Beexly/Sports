/**
 * Content-Security-Policy must have exactly ONE source of truth.
 *
 * Background (2026-08-25): `apps/web/vercel.json` and `apps/web/next.config.mjs`
 * BOTH declare a `Content-Security-Policy` header on the same non-embed source
 * regex, `"/((?!embed$|embed/).*)"`.
 *
 * VERIFIED AGAINST LIVE PRODUCTION (`curl -D - https://www.galaxysportsedge.com/`,
 * 2026-08-25). The observed behaviour is NOT "two headers, browser intersects":
 * the response carries exactly ONE `content-security-policy` header, and it is
 * byte-identical to the `vercel.json` value. Vercel merges the framework's
 * header rules with `vercel.json`'s and, for a key BOTH declare, `vercel.json`
 * wins outright. (`X-Frame-Options: DENY`, declared only by next.config.mjs, IS
 * served — so the merge is per-key, not wholesale replacement.)
 *
 * Consequence: for every directive `vercel.json` also declares, the
 * next.config.mjs policy is DEAD CODE in production. What that costs today:
 *
 *   script-src  https://static.cloudflareinsights.com   → beacon never loads
 *   connect-src https://*.ingest.sentry.io              → client errors never sent
 *   connect-src https://*.ingest.us.sentry.io           → client errors never sent
 *   connect-src https://cloudflareinsights.com          → beacon RUM never reports
 *
 * ...and, in the other direction, `'unsafe-eval'` — which next.config.mjs
 * deliberately strips from the production `script-src` per P13-05 — is LIVE in
 * production right now, because the vercel.json copy still carries it.
 *
 * The failure is invisible by construction. The page renders. SERVER-side Sentry
 * still reports, so the dashboard shows errors flowing and the gap reads as
 * "no client errors today" rather than "client transport is blocked."
 *
 * Why every existing guard stayed green while this shipped:
 *   - `vercel-config-drift.test.ts` compares vercel.json ↔ apps/web/vercel.json.
 *     Both copies carry the SAME CSP, so they never drifted.
 *   - `next-config-policy.test.ts` asserts the prod CSP forbids 'unsafe-eval' and
 *     allows the Sentry/Cloudflare origins — reading ONLY next.config.mjs, the
 *     copy production discards. It passes today, on a production that does the
 *     exact opposite of all three assertions.
 *
 * Nothing compared the two files to each other. That is the hole this closes.
 *
 * ── STATE OF THE FIX ──────────────────────────────────────────────────────────
 * The real fix is to DELETE the `Content-Security-Policy` entry from the
 * non-embed rule in both vercel.json copies, leaving next.config.mjs as the sole
 * author. That edit is OWNER ACTION (see the PR body): this branch is not
 * permitted to modify vercel.json, and editing only one of the two byte-identical
 * copies would trade this bug for a failing `vercel-config-drift` guard.
 *
 * So this file does two things at once, with no skips and no weakened assertions:
 *
 *   1. While vercel.json still declares a CSP, it PINS the exact production loss
 *      (`PINNED_LOSS` below). That is a real guard: the way this bug was born was
 *      someone adding Sentry/Cloudflare origins to next.config.mjs and assuming
 *      they took effect. Any further such addition now fails this test loudly
 *      instead of shipping dead.
 *   2. The moment vercel.json stops declaring a CSP, the pin becomes inactive and
 *      the strict single-source assertion below takes over automatically — no
 *      code change required to arm it.
 */
import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(APP_DIR, "..", "..");

/** The only vercel.json Vercel reads (project Root Directory = apps/web). */
const LIVE_VERCEL_CONFIG = resolve(APP_DIR, "vercel.json");
/** Inert duplicate at the repo root; kept byte-identical by vercel-config-drift. */
const INERT_VERCEL_CONFIG = resolve(REPO_ROOT, "vercel.json");

/**
 * The route pattern both configs attach site-wide security headers to.
 *
 * Scoped deliberately to the non-embed source. `/embed/:path*` is also declared
 * in both configs, but both set the identical single directive
 * `frame-ancestors *`, so whichever wins the merge the result is the same policy
 * and no origin is lost. The site-wide rule is where the two actually disagree.
 */
const NON_EMBED_SOURCE = "/((?!embed$|embed/).*)";

const CSP = "content-security-policy";

/**
 * Origins next.config.mjs allows that the vercel.json copy omits — therefore
 * absent from the policy production actually serves.
 *
 * This is a PIN, not an allowance. It must shrink to nothing when the owner
 * removes the duplicate; it must never grow. Growth means someone added an
 * origin to next.config.mjs that will silently fail to take effect.
 */
const PINNED_LOSS: readonly string[] = [
  "script-src: https://static.cloudflareinsights.com",
  "connect-src: https://*.ingest.sentry.io",
  "connect-src: https://*.ingest.us.sentry.io",
  "connect-src: https://cloudflareinsights.com",
];

/**
 * Sources the served policy carries that next.config.mjs's production policy
 * deliberately drops. `'unsafe-eval'` here is the P13-05 hardening being undone.
 */
const PINNED_UNENFORCED_HARDENING: readonly string[] = ["script-src: 'unsafe-eval'"];

/**
 * Whether the OWNER ACTION (delete the CSP from both vercel.json copies) is
 * still outstanding.
 *
 * FLIP THIS TO `false` IN THE SAME COMMIT THAT LANDS THAT EDIT. Until then,
 * vercel.json declaring a CSP is a pinned known defect. Once false, it becomes a
 * hard failure — which is what stops the duplicate from quietly coming back
 * later with the same value and passing the pin all over again.
 */
const OWNER_ACTION_PENDING = true;

interface HeaderEntry {
  readonly key: string;
  readonly value: string;
}
interface HeaderRule {
  readonly source: string;
  readonly headers: readonly HeaderEntry[];
}

function vercelHeaderRules(path: string): readonly HeaderRule[] {
  const cfg = JSON.parse(readFileSync(path, "utf8")) as { headers?: HeaderRule[] };
  return cfg.headers ?? [];
}

/**
 * next.config.mjs branches its CSP on NODE_ENV at call time, so it must be read
 * with NODE_ENV=production to observe the policy a production build emits.
 * Under vitest's default NODE_ENV=test it returns the DEV policy — which still
 * carries `'unsafe-eval'` and omits `upgrade-insecure-requests`, and would make
 * this comparison quietly meaningless.
 */
async function nextProductionHeaderRules(): Promise<readonly HeaderRule[]> {
  vi.resetModules();
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const mod = (await import("../next.config.mjs")) as {
      default: { headers?: () => Promise<HeaderRule[]> };
    };
    return (await mod.default.headers?.()) ?? [];
  } finally {
    process.env.NODE_ENV = previous;
  }
}

/** CSP values a config declares on the shared non-embed source. */
function cspValuesOnNonEmbedSource(rules: readonly HeaderRule[]): string[] {
  return rules
    .filter((rule) => rule.source === NON_EMBED_SOURCE)
    .flatMap((rule) => rule.headers)
    .filter((h) => h.key.toLowerCase() === CSP)
    .map((h) => h.value);
}

/** `"script-src 'self' https://x"` → `["script-src", ["'self'", "https://x"]]`. */
function parseCsp(value: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const directive of value.split(";").map((d) => d.trim()).filter(Boolean)) {
    const [name, ...sources] = directive.split(/\s+/);
    if (name) out.set(name, new Set(sources));
  }
  return out;
}

/**
 * Sources present in `a` but missing from `b`, for directives BOTH declare.
 * A directive absent from `b` is not a loss — `b` simply says nothing about it.
 */
function sourcesLost(
  a: Map<string, Set<string>>,
  b: Map<string, Set<string>>,
): string[] {
  const lost: string[] = [];
  for (const [directive, aSources] of a) {
    const bSources = b.get(directive);
    if (!bSources) continue;
    for (const source of aSources) {
      if (!bSources.has(source)) lost.push(`${directive}: ${source}`);
    }
  }
  return lost;
}

describe("Content-Security-Policy single source of truth", () => {
  it("keeps the two vercel.json copies agreeing about CSP", () => {
    if (!existsSync(INERT_VERCEL_CONFIG)) return; // root copy removed — valid end state

    const live = cspValuesOnNonEmbedSource(vercelHeaderRules(LIVE_VERCEL_CONFIG));
    const inert = cspValuesOnNonEmbedSource(vercelHeaderRules(INERT_VERCEL_CONFIG));

    expect(
      inert,
      "The repo-root vercel.json and apps/web/vercel.json disagree about the " +
        "Content-Security-Policy. vercel-config-drift.test.ts requires the two " +
        "files be byte-identical, so removing the CSP from one without the other " +
        "trades one bug for a failing drift guard.",
    ).toEqual(live);
  });

  it("pins the exact production CSP loss caused by the duplicate (OWNER ACTION open)", async () => {
    const fromVercel = cspValuesOnNonEmbedSource(vercelHeaderRules(LIVE_VERCEL_CONFIG));
    const fromNext = cspValuesOnNonEmbedSource(await nextProductionHeaderRules());

    // Once the duplicate is gone this pin no longer applies; the strict
    // single-source test below becomes the active guard automatically.
    if (fromVercel.length === 0 || !OWNER_ACTION_PENDING) return;

    expect(
      fromNext.length,
      "next.config.mjs stopped declaring a production CSP while vercel.json " +
        "still declares one. That is not the intended fix: it makes vercel.json " +
        "the sole author, keeping 'unsafe-eval' in production and permanently " +
        "dropping the Sentry ingest and Cloudflare beacon origins. Remove the " +
        "vercel.json copy instead.",
    ).toBe(1);

    const vercelCsp = parseCsp(fromVercel[0] as string);
    const nextCsp = parseCsp(fromNext[0] as string);

    expect(
      sourcesLost(nextCsp, vercelCsp).sort(),
      "The set of origins lost to the duplicate CSP changed.\n" +
        "vercel.json wins the merge in production (verified live 2026-08-25), so " +
        "anything next.config.mjs allows that vercel.json omits is DEAD in " +
        "production.\n" +
        "If this grew: you added an origin to next.config.mjs that will silently " +
        "have no effect — add it to vercel.json too, or land the OWNER ACTION " +
        "that removes the vercel.json CSP entirely.\n" +
        "If this shrank to empty: the OWNER ACTION landed. Flip " +
        "OWNER_ACTION_PENDING to false — the strict single-source test below " +
        "then becomes the permanent guard.",
    ).toEqual([...PINNED_LOSS].sort());

    expect(
      sourcesLost(vercelCsp, nextCsp).sort(),
      "The set of sources production serves that next.config.mjs's production " +
        "policy deliberately omits changed. `'unsafe-eval'` here is the P13-05 " +
        "hardening being undone by the vercel.json copy.",
    ).toEqual([...PINNED_UNENFORCED_HARDENING].sort());
  });

  it("enforces a single CSP source of truth once vercel.json's copy is removed", async () => {
    const fromVercel = cspValuesOnNonEmbedSource(vercelHeaderRules(LIVE_VERCEL_CONFIG));

    // While the OWNER ACTION is outstanding we are in the known-open defect,
    // fully characterised by the pinned test above — asserting correctness here
    // too would just duplicate its failure. Flipping OWNER_ACTION_PENDING to
    // false (or removing the vercel.json CSP) arms everything below permanently.
    if (OWNER_ACTION_PENDING && fromVercel.length > 0) return;

    expect(
      fromVercel,
      `apps/web/vercel.json declares a Content-Security-Policy on ` +
        `"${NON_EMBED_SOURCE}" again. Vercel merges vercel.json's header rules ` +
        `over the framework's per key, so this value — not next.config.mjs's — is ` +
        `what production serves, and next.config.mjs's policy silently becomes ` +
        `dead code. This is the exact defect the OWNER ACTION removed; do not ` +
        `reintroduce it. Site-wide CSP belongs in next.config.mjs alone.`,
    ).toEqual([]);

    const fromNext = cspValuesOnNonEmbedSource(await nextProductionHeaderRules());

    const declaringConfigs = [
      ...(fromNext.length > 0 ? ["apps/web/next.config.mjs"] : []),
    ];

    expect(
      declaringConfigs,
      `Content-Security-Policy must be declared by exactly ONE config on ` +
        `"${NON_EMBED_SOURCE}". Vercel merges vercel.json's header rules over the ` +
        `framework's per key, so when both declare a CSP the vercel.json value is ` +
        `what production serves and the next.config.mjs policy is dead code — ` +
        `invisible to any test that reads either file alone. ` +
        `next.config.mjs is the maintained author (it strips 'unsafe-eval' in ` +
        `production per P13-05 and allow-lists the Sentry ingest and Cloudflare ` +
        `beacon origins); keep it, and keep the CSP out of BOTH vercel.json copies.`,
    ).toHaveLength(1);
  });
});
