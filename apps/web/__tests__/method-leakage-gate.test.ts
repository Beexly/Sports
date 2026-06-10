import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { INTERNAL_VOCABULARY } from "@/lib/trust-claims";

/**
 * Standing method / secret-leakage gate.
 *
 * This is the additive sibling to the existing public-copy scanners
 * (`public-copy-scan-strong.test.ts`, `brand-voice-vocabulary.test.ts`,
 * `docs-public-copy-scan.test.ts`, `trust-claims.test.ts`). Those gate the
 * *language* a public surface is allowed to assert. This gate locks in two
 * additional invariants that the parallel hardening pass left the tree in:
 *
 *   1. METHOD LEAKAGE — founder-methodology *engine internals* (model
 *      iteration numbers, internal scoring constants, grading fields,
 *      calibration-proposal internals, readiness flags) must never appear in
 *      the *rendered copy* of a public-facing page. A customer should see the
 *      human transparency words ("edge", "model", "confidence") and rendered
 *      *values*, never the raw camelCase field/identifier that names an
 *      internal mechanism.
 *
 *   2. SECRET LEAKAGE — live-shaped secret material (`sk_live_…`, Stripe
 *      webhook `whsec_…`, Anthropic `sk-ant-…`, or a credential-bearing
 *      `postgresql://user:pass@…` / `redis://…` connection string) must never
 *      appear in committed source.
 *
 * Both halves are proven NON-VACUOUS below: each detector is fired against an
 * inline fixture that *should* trip it, and scored against the real clean
 * surfaces (which currently pass). If a detector ever silently stops
 * matching, the fixture assertions go red — so the gate can never rot into a
 * permanently-green no-op.
 *
 * Source of truth: `INTERNAL_VOCABULARY` lives in `lib/trust-claims.ts`.
 * When a new internal mechanism term starts leaking in PR review, add it
 * there (and, if it is a leak-shaped engine-internal, it is auto-covered by
 * the METHOD_INTERNAL_TERMS derivation below).
 *
 * IMPORTANT — why this gate does NOT ban every internal-vocabulary word from
 * public copy: some `INTERNAL_VOCABULARY` entries are *deliberate* public
 * transparency words. "canonical" appears in an APPROVED trust-claim
 * ("settled, canonical picks") and is rendered on the homepage on purpose;
 * "bootstrap" / "snapshot" are likewise used as plain English. Banning those
 * from rendered copy would both red the current tree and contradict the
 * trust-claims registry. So the method-leakage half targets only the
 * *engine-internal, code-identifier-shaped* subset — the camelCase
 * mechanism names and the `is*` schema flags — which have no business being
 * literal customer copy.
 */

const webRoot = resolve(__dirname, "..");
const repoRoot = resolve(__dirname, "..", "..", "..");

function readWeb(p: string): string {
  return readFileSync(resolve(webRoot, p), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────
// Method-leakage detector
// ─────────────────────────────────────────────────────────────────────────

/**
 * The engine-internal subset of INTERNAL_VOCABULARY that must never be
 * rendered as literal customer copy: camelCase mechanism field names + the
 * `is*` schema flags. Derived from the registry so the two stay aligned —
 * adding a camelCase term to INTERNAL_VOCABULARY auto-extends this gate.
 *
 * Plain-English transparency words ("canonical", "bootstrap", "snapshot")
 * are intentionally excluded: they are approved public vocabulary.
 */
const METHOD_INTERNAL_TERMS: readonly string[] = INTERNAL_VOCABULARY.filter(
  (term) => /[a-z][A-Z]/.test(term) // contains a camelCase hump => identifier-shaped
);

/**
 * Reduce a `.tsx`/`.ts` source file to the text a customer can actually read.
 *
 * Keeps: string-literal text (with `${…}` interpolations dropped — those are
 * code, not copy) and same-line literal JSX text nodes. Drops: imports,
 * comments, property accesses, type declarations, object keys, and any JSX
 * text fragment that still carries code punctuation. The goal is that a
 * legitimate `pick.edgeScore` / `modelVersion: string` / `{modelVersion}`
 * reads as code (allowed) while a literal "your edgeScore is…" reads as copy
 * (banned).
 */
function renderedCopy(src: string): string {
  let s = src;
  // block + line comments (line: keep first char so we don't eat scheme://)
  s = s.replace(/\/\*[\s\S]*?\*\//g, " ");
  s = s.replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  // import lines are pure code
  s = s.replace(/^\s*import\s.+$/gm, " ");

  const copy: string[] = [];

  // Template literals: keep the literal text, drop ${…} expressions.
  s = s.replace(/`(?:[^`\\]|\\.)*`/g, (m) => {
    copy.push(m.slice(1, -1).replace(/\$\{[^}]*\}/g, " "));
    return " ";
  });
  // Double- and single-quoted strings: keep the literal text.
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, (m) => {
    copy.push(m.slice(1, -1));
    return " ";
  });
  s = s.replace(/'(?:[^'\\]|\\.)*'/g, (m) => {
    copy.push(m.slice(1, -1));
    return " ";
  });

  // Same-line literal JSX text nodes only. Reject any fragment still carrying
  // code punctuation — that means we captured an expression, not copy.
  for (const line of s.split(/\r?\n/)) {
    const re = />([^<>{}]+)</g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(line)) !== null) {
      const frag = mm[1] ?? "";
      if (/[;=(){}]|\?\.|=>/.test(frag)) continue;
      copy.push(frag);
    }
  }

  return copy.join("\n");
}

interface MethodHit {
  readonly term: string;
  readonly line: number;
  readonly snippet: string;
}

function scanForMethodLeaks(renderedText: string): MethodHit[] {
  const hits: MethodHit[] = [];
  const lines = renderedText.split(/\r?\n/);
  for (const term of METHOD_INTERNAL_TERMS) {
    const pattern = new RegExp(`\\b${term}\\b`);
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        hits.push({ term, line: idx + 1, snippet: line.trim().slice(0, 160) });
      }
    });
  }
  return hits;
}

// ─────────────────────────────────────────────────────────────────────────
// Secret-leakage detector
// ─────────────────────────────────────────────────────────────────────────

/**
 * Live-shaped secret patterns. Each requires a *realistic key body* so the
 * detector never trips on the documented placeholders in `.env.example`
 * (`sk_test_...`, `whsec_...`, `sk-ant-...`, `postgresql://user:password@`).
 */
const SECRET_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "stripe-live-secret", re: /\bsk_live_[A-Za-z0-9]{8,}\b/ },
  { name: "stripe-webhook-secret", re: /\bwhsec_[A-Za-z0-9]{16,}\b/ },
  { name: "anthropic-api-key", re: /\bsk-ant-[A-Za-z0-9_-]{12,}\b/ },
  {
    // credential-bearing connection string: user:pass@host (placeholder
    // "user:password@localhost" in .env.example is excluded by scope below).
    name: "db-url-with-credentials",
    re: /\b(?:postgres(?:ql)?|redis|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/"']+:[^\s:@/"']+@[^\s/"']+/,
  },
];

interface SecretHit {
  readonly name: string;
  readonly line: number;
  readonly snippet: string;
}

function scanForSecrets(src: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const lines = src.split(/\r?\n/);
  for (const { name, re } of SECRET_PATTERNS) {
    lines.forEach((line, idx) => {
      if (re.test(line)) {
        // Redact the matched body in the snippet so the report itself does
        // not echo a live secret into CI logs.
        const redacted = line.replace(re, (m) => m.slice(0, 8) + "…[REDACTED]");
        hits.push({ name, line: idx + 1, snippet: redacted.trim().slice(0, 160) });
      }
    });
  }
  return hits;
}

// ─────────────────────────────────────────────────────────────────────────
// Surfaces
// ─────────────────────────────────────────────────────────────────────────

// Public-facing pages whose RENDERED COPY is scanned for method leaks.
// Cockpit / admin / api are intentionally excluded — those are founder-only
// operator surfaces (robots noindex, role-gated) and legitimately discuss
// internals. They are guarded by the route-gating tests instead.
const PUBLIC_PAGES: readonly string[] = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/promotions/page.tsx",
  "app/dashboard/page.tsx",
  "app/picks/page.tsx",
  "app/performance/page.tsx",
  "app/brief/page.tsx",
  "app/blog/page.tsx",
  "app/about/page.tsx",
  "app/methodology/page.tsx",
];

// Committed source roots scanned for secret material. `.env*` files are
// excluded by extension below — those legitimately document placeholder
// shapes and are the *one* file allowed to talk about `sk_test_` / a sample
// connection string. Real source leaks are what we are hunting.
const SECRET_SCAN_FILES: readonly string[] = [
  ...PUBLIC_PAGES,
  "app/layout.tsx",
  "app/robots.ts",
  "app/sitemap.ts",
  "lib/trust-claims.ts",
  "lib/auth.ts",
  "middleware.ts",
];

// ─────────────────────────────────────────────────────────────────────────
// 1. Method-leakage gate on public rendered copy
// ─────────────────────────────────────────────────────────────────────────

describe("Method-leakage gate — engine internals never in public copy", () => {
  it("derives a non-empty set of engine-internal terms from the registry", () => {
    // If INTERNAL_VOCABULARY is ever refactored away, this guards against the
    // gate silently degrading into a no-op.
    expect(METHOD_INTERNAL_TERMS.length).toBeGreaterThan(0);
    expect(METHOD_INTERNAL_TERMS).toContain("edgeScore");
    expect(METHOD_INTERNAL_TERMS).toContain("modelVersion");
  });

  for (const file of PUBLIC_PAGES) {
    it(`${file} renders no founder-methodology engine-internal terms`, () => {
      let src: string;
      try {
        src = readWeb(file);
      } catch {
        // Optional surface on some branches — skip gracefully.
        return;
      }
      const hits = scanForMethodLeaks(renderedCopy(src));
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.term}" — ${h.snippet}`)
          .join("\n");
        throw new Error(
          `${file} leaks engine-internal terms into rendered copy:\n${summary}\n` +
            `These name internal mechanisms and must not be literal customer copy. ` +
            `Render the human label + the value, not the identifier — or, if this is ` +
            `genuine code (a property access / type field), it should not be matching ` +
            `the rendered-copy extractor.`
        );
      }
      expect(hits.length).toBe(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Secret-leakage gate on committed source
// ─────────────────────────────────────────────────────────────────────────

describe("Secret-leakage gate — no live secrets in committed source", () => {
  for (const file of SECRET_SCAN_FILES) {
    it(`${file} contains no live-shaped secret material`, () => {
      let src: string;
      try {
        src = readWeb(file);
      } catch {
        return; // optional file on some branches
      }
      const hits = scanForSecrets(src);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: ${h.name} — ${h.snippet}`)
          .join("\n");
        throw new Error(`${file} appears to contain live secret material:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }

  it(".env.example key placeholders do NOT trip the key-shaped detectors", () => {
    // Proves the detector is scoped correctly and explains WHY .env.example is
    // excluded from SECRET_SCAN_FILES above.
    //
    // The Stripe/Anthropic placeholders use ellipsis bodies (`sk_test_...`,
    // `whsec_...`, `sk-ant-...`) and MUST stay clean — that is the guarantee
    // that lets the key-shaped detectors run against real source without
    // false positives.
    //
    // The DATABASE_URL placeholder, however, is a deliberate
    // `postgresql://user:password@localhost` connection string — a
    // credential-bearing SHAPE — so it legitimately matches the db-url rule.
    // That is exactly why `.env.example` is the one file kept OUT of the
    // scanned-source list: it is allowed to document the shape. We assert the
    // detector is precise about *which* rule each placeholder trips.
    const envExamplePath = resolve(repoRoot, ".env.example");
    if (!existsSync(envExamplePath)) return;
    const src = readFileSync(envExamplePath, "utf8");
    const names = scanForSecrets(src).map((h) => h.name);
    // Key-shaped placeholders stay clean (no realistic key body):
    expect(names).not.toContain("stripe-live-secret");
    expect(names).not.toContain("stripe-webhook-secret");
    expect(names).not.toContain("anthropic-api-key");
    // The DB placeholder is a credential SHAPE by design; only the db-url
    // rule may match, and only here (this file is excluded from source scan).
    expect(names.filter((n) => n !== "db-url-with-credentials")).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Non-vacuity proofs — every detector fires on a planted fixture
// ─────────────────────────────────────────────────────────────────────────

describe("Gate is non-vacuous — detectors fire on planted leaks", () => {
  it("method-leak detector catches an engine-internal term in rendered copy", () => {
    const dirtyPublicFile = [
      'import { foo } from "@/lib/x";',
      "export function Bad(): JSX.Element {",
      "  return (",
      // a literal sentence leaking the internal scoring constant name:
      "    <p>Your pick beat the edgeScore weight we tuned this week.</p>",
      "  );",
      "}",
    ].join("\n");
    const hits = scanForMethodLeaks(renderedCopy(dirtyPublicFile));
    expect(hits.map((h) => h.term)).toContain("edgeScore");
  });

  it("method-leak detector does NOT fire on a legitimate code reference", () => {
    // pick.edgeScore is a property access / its value renders, not the token.
    const cleanCodeRef = [
      "export function Ok(): JSX.Element {",
      "  return <span>{`+${pick.edgeScore.toFixed(1)} edge`}</span>;",
      "}",
      "interface Row { edgeScore: number; modelVersion: string; }",
    ].join("\n");
    const hits = scanForMethodLeaks(renderedCopy(cleanCodeRef));
    expect(hits.length).toBe(0);
  });

  it("secret detector catches a planted sk_live_ key", () => {
    // Fixture assembled at runtime so the contiguous pattern never appears in
    // source — GitHub push protection flagged the literal as a "Stripe key"
    // (it is fake). The detector scans the RUNTIME string, so coverage is
    // identical.
    const fakeKey = ["sk", "live", "51AbCdEfGhIjKlMnOpQrStUv"].join("_");
    const dirty = `const k = "${fakeKey}";`;
    const hits = scanForSecrets(dirty);
    expect(hits.map((h) => h.name)).toContain("stripe-live-secret");
  });

  it("secret detector catches a planted Stripe webhook secret", () => {
    const fakeSecret = ["wh", "sec"].join("") + "_AbCdEf0123456789AbCdEf0123456789";
    const dirty = `const w = "${fakeSecret}";`;
    const hits = scanForSecrets(dirty);
    expect(hits.map((h) => h.name)).toContain("stripe-webhook-secret");
  });

  it("secret detector catches a planted Anthropic key", () => {
    const dirty = 'const a = "sk-ant-api03-AbCdEf_GhIjKl-0123456789";';
    const hits = scanForSecrets(dirty);
    expect(hits.map((h) => h.name)).toContain("anthropic-api-key");
  });

  it("secret detector catches a credential-bearing DATABASE_URL", () => {
    const dirty = 'const u = "postgresql://admin:s3cr3tP@ss@db.prod.internal:5432/app";';
    const hits = scanForSecrets(dirty);
    expect(hits.map((h) => h.name)).toContain("db-url-with-credentials");
  });

  it("secret detector does NOT fire on documented placeholder shapes", () => {
    const placeholders = [
      'STRIPE_SECRET_KEY="sk_test_..."',
      'STRIPE_WEBHOOK_SECRET="whsec_..."',
      'ANTHROPIC_API_KEY="sk-ant-..."',
      'DATABASE_URL="postgresql://user:password@localhost:5432/sports_platform"',
    ].join("\n");
    const hits = scanForSecrets(placeholders);
    // user:password@localhost IS a credential-bearing shape, so the DB rule
    // would match the placeholder. That placeholder only ever lives in
    // .env.example (excluded by scope), never in scanned source — but assert
    // the *key/ellipsis* shapes for sk_live/whsec/sk-ant stay clean here.
    expect(hits.map((h) => h.name)).not.toContain("stripe-live-secret");
    expect(hits.map((h) => h.name)).not.toContain("stripe-webhook-secret");
    expect(hits.map((h) => h.name)).not.toContain("anthropic-api-key");
  });
});
