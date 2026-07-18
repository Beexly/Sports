import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createHash } from "node:crypto";
import {
  SEVERITY,
  CATEGORY,
  redactSensitive,
  checkLlmsTxt,
  checkHealth,
  checkProofLedger,
  checkProofReceipts,
  checkProofOpenApi,
  checkProofVerificationSpec,
  checkNewsSitemap,
  checkRobotsTxt,
  checkPage,
  checkPublicClaimHygiene,
  computeLeafHash,
  computeMerkleRoot,
  runAllChecks,
  CHECKS,
} from "./nightly-sentinel-checks.mjs";

// --- fixture server -------------------------------------------------------
// Plants exact status/body/content-type/delay per path so each test proves
// one specific PASS/WARN/FAIL classification against a real HTTP response,
// not a mocked object.

function startFixtureServer(routes) {
  const server = http.createServer((req, res) => {
    const route = routes[req.url];
    if (!route) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const send = () => {
      res.writeHead(route.status ?? 200, { "content-type": route.contentType ?? "application/json" });
      res.end(route.body ?? "");
    };
    if (route.delayMs) setTimeout(send, route.delayMs);
    else send();
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function withServer(routes, fn) {
  const { server, baseUrl } = await startFixtureServer(routes);
  try {
    await fn(baseUrl);
  } finally {
    // Force-drop any idle keep-alive sockets (e.g. left behind by an aborted
    // client request) instead of letting server.close() wait out Node's
    // default 5s keepAliveTimeout for a natural connection close.
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

function healthBody({ ok = true, db = "ok", ingestion = "ok", ingestionAge = 5 } = {}) {
  return JSON.stringify({
    ok,
    checks: { database: { status: db }, ingestion: { status: ingestion, ageMinutes: ingestionAge } },
  });
}

function buildValidSpec() {
  const vectors = [
    { pickId: "pick-1", canonicalPayload: "line=-3|sport=nfl" },
    { pickId: "pick-2", canonicalPayload: "line=+7|sport=nba" },
  ].map((v) => ({ ...v, leafHash: computeLeafHash(v.pickId, v.canonicalPayload) }));
  const root = computeMerkleRoot(vectors.map((v) => v.leafHash));
  return { vectors, merkle: { root } };
}

// --- llms.txt ---------------------------------------------------------

test("checkLlmsTxt: PASS on a non-empty 200 body", async () => {
  await withServer({ "/llms.txt": { status: 200, body: "# hello", contentType: "text/plain" } }, async (baseUrl) => {
    const result = await checkLlmsTxt(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkLlmsTxt: FAIL on an empty body", async () => {
  await withServer({ "/llms.txt": { status: 200, body: "", contentType: "text/plain" } }, async (baseUrl) => {
    const result = await checkLlmsTxt(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.equal(result.category, CATEGORY.ASSERTION);
  });
});

// --- /api/health --------------------------------------------------------

test("checkHealth: PASS when ok/db/ingestion are all healthy", async () => {
  await withServer({ "/api/health": { status: 200, body: healthBody() } }, async (baseUrl) => {
    const result = await checkHealth(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkHealth: FAIL when the database check is not ok", async () => {
  await withServer({ "/api/health": { status: 200, body: healthBody({ db: "degraded" }) } }, async (baseUrl) => {
    const result = await checkHealth(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.equal(result.category, CATEGORY.ASSERTION);
  });
});

test("checkHealth: WARN (not FAIL) when only ingestion is not ok", async () => {
  await withServer({ "/api/health": { status: 200, body: healthBody({ ingestion: "stale" }) } }, async (baseUrl) => {
    const result = await checkHealth(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.WARN);
  });
});

test("checkHealth: FAIL on malformed JSON", async () => {
  await withServer({ "/api/health": { status: 200, body: "{not json" } }, async (baseUrl) => {
    const result = await checkHealth(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.equal(result.category, CATEGORY.ASSERTION);
  });
});

// --- proof surface --------------------------------------------------------

test("checkProofLedger: PASS with a boolean ledger.published field", async () => {
  await withServer({ "/api/proof/ledger": { status: 200, body: JSON.stringify({ ledger: { published: false } }) } }, async (baseUrl) => {
    const result = await checkProofLedger(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkProofLedger: FAIL when ledger.published is missing", async () => {
  await withServer({ "/api/proof/ledger": { status: 200, body: JSON.stringify({}) } }, async (baseUrl) => {
    const result = await checkProofLedger(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
  });
});

test("checkProofLedger: FAIL when published exists but only at the top level (the real bug this regression-guards)", async () => {
  await withServer({ "/api/proof/ledger": { status: 200, body: JSON.stringify({ published: false }) } }, async (baseUrl) => {
    const result = await checkProofLedger(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
  });
});

test("checkProofReceipts: PASS with a JSON array", async () => {
  await withServer({ "/api/proof/receipts": { status: 200, body: JSON.stringify([{ id: "r1" }]) } }, async (baseUrl) => {
    const result = await checkProofReceipts(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkProofReceipts: FAIL when the body is a bare JSON scalar", async () => {
  await withServer({ "/api/proof/receipts": { status: 200, body: JSON.stringify("just a string") } }, async (baseUrl) => {
    const result = await checkProofReceipts(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
  });
});

test("checkProofOpenApi: PASS with an openapi version and a paths object", async () => {
  await withServer(
    { "/api/proof/openapi.json": { status: 200, body: JSON.stringify({ openapi: "3.0.0", paths: { "/x": {} } }) } },
    async (baseUrl) => {
      const result = await checkProofOpenApi(fetch, baseUrl, 2000);
      assert.equal(result.severity, SEVERITY.PASS);
    },
  );
});

test("checkProofOpenApi: FAIL when the openapi/swagger version field is missing", async () => {
  await withServer({ "/api/proof/openapi.json": { status: 200, body: JSON.stringify({ paths: {} }) } }, async (baseUrl) => {
    const result = await checkProofOpenApi(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
  });
});

// --- known-answer-vector recomputation ------------------------------------

test("computeLeafHash: matches the published GSE-PickCommit-v1 formula directly", () => {
  const expected = createHash("sha256").update("leaf:pick-42:sport=nfl|line=-3", "utf8").digest("hex");
  assert.equal(computeLeafHash("pick-42", "sport=nfl|line=-3"), expected);
});

test("computeMerkleRoot: duplicates the last node on an odd-length layer", () => {
  const a = "a".repeat(64), b = "b".repeat(64), c = "c".repeat(64);
  const node1 = createHash("sha256").update(`node:${a}:${b}`, "utf8").digest("hex");
  const node2 = createHash("sha256").update(`node:${c}:${c}`, "utf8").digest("hex");
  const expectedRoot = createHash("sha256").update(`node:${node1}:${node2}`, "utf8").digest("hex");
  assert.equal(computeMerkleRoot([a, b, c]), expectedRoot);
});

test("computeMerkleRoot: throws on an empty leaf set instead of returning a false root", () => {
  assert.throws(() => computeMerkleRoot([]), /empty leaf set/);
});

test("checkProofVerificationSpec: PASS when every leaf hash and the Merkle root independently recompute", async () => {
  const spec = buildValidSpec();
  await withServer({ "/api/proof/verification-spec.json": { status: 200, body: JSON.stringify(spec) } }, async (baseUrl) => {
    const result = await checkProofVerificationSpec(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkProofVerificationSpec: FAIL when a published leaf hash is tampered", async () => {
  const spec = buildValidSpec();
  spec.vectors[0].leafHash = "0".repeat(64);
  await withServer({ "/api/proof/verification-spec.json": { status: 200, body: JSON.stringify(spec) } }, async (baseUrl) => {
    const result = await checkProofVerificationSpec(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.match(result.detail, /Leaf-hash recomputation mismatch/);
  });
});

test("checkProofVerificationSpec: FAIL when the published Merkle root is tampered but leaves are untouched", async () => {
  const spec = buildValidSpec();
  spec.merkle.root = "1".repeat(64);
  await withServer({ "/api/proof/verification-spec.json": { status: 200, body: JSON.stringify(spec) } }, async (baseUrl) => {
    const result = await checkProofVerificationSpec(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.match(result.detail, /Merkle root recomputation mismatch/);
  });
});

test("checkProofVerificationSpec: FAIL (not a silent PASS) when the merkle.root field is absent entirely", async () => {
  // Regression guard: a PASS here must never claim Merkle-root verification
  // happened when the field wasn't even present to check.
  const spec = buildValidSpec();
  delete spec.merkle;
  await withServer({ "/api/proof/verification-spec.json": { status: 200, body: JSON.stringify(spec) } }, async (baseUrl) => {
    const result = await checkProofVerificationSpec(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.match(result.detail, /no 'merkle\.root' field/);
  });
});

test("checkProofVerificationSpec: FAIL when zero vectors are published", async () => {
  await withServer({ "/api/proof/verification-spec.json": { status: 200, body: JSON.stringify({ vectors: [] }) } }, async (baseUrl) => {
    const result = await checkProofVerificationSpec(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
  });
});

// --- sitemap / robots ------------------------------------------------------

test("checkNewsSitemap: PASS with url entries present", async () => {
  const body = `<?xml version="1.0"?><urlset><url><loc>https://x/1</loc></url><url><loc>https://x/2</loc></url></urlset>`;
  await withServer({ "/news-sitemap.xml": { status: 200, body, contentType: "application/xml" } }, async (baseUrl) => {
    const result = await checkNewsSitemap(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkNewsSitemap: WARN (not FAIL) on a well-formed but empty sitemap (LB-006)", async () => {
  const body = `<?xml version="1.0"?><urlset></urlset>`;
  await withServer({ "/news-sitemap.xml": { status: 200, body, contentType: "application/xml" } }, async (baseUrl) => {
    const result = await checkNewsSitemap(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.WARN);
  });
});

test("checkNewsSitemap: FAIL when the body doesn't look like a sitemap at all", async () => {
  await withServer({ "/news-sitemap.xml": { status: 200, body: "<html>oops</html>", contentType: "text/html" } }, async (baseUrl) => {
    const result = await checkNewsSitemap(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
  });
});

test("checkRobotsTxt: PASS when it advertises a sitemap", async () => {
  await withServer({ "/robots.txt": { status: 200, body: "Sitemap: https://x/sitemap.xml", contentType: "text/plain" } }, async (baseUrl) => {
    const result = await checkRobotsTxt(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkRobotsTxt: WARN when it doesn't mention a sitemap", async () => {
  await withServer({ "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /", contentType: "text/plain" } }, async (baseUrl) => {
    const result = await checkRobotsTxt(fetch, baseUrl, 2000);
    assert.equal(result.severity, SEVERITY.WARN);
  });
});

// --- generic page + public claim hygiene ------------------------------------

test("checkPage: PASS on 200", async () => {
  await withServer({ "/tools": { status: 200, body: "ok", contentType: "text/html" } }, async (baseUrl) => {
    const result = await checkPage(fetch, baseUrl, "/tools", 2000);
    assert.equal(result.severity, SEVERITY.PASS);
  });
});

test("checkPage: FAIL on a non-200 status", async () => {
  await withServer({ "/tools": { status: 500, body: "boom", contentType: "text/html" } }, async (baseUrl) => {
    const result = await checkPage(fetch, baseUrl, "/tools", 2000);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.equal(result.category, CATEGORY.ASSERTION);
  });
});

test("checkPublicClaimHygiene: PASS on clean copy across both scanned paths", async () => {
  await withServer(
    {
      "/": { status: 200, body: "<html>Real data, real odds.</html>", contentType: "text/html" },
      "/pricing": { status: 200, body: "<html>Pro plan $14.99/mo.</html>", contentType: "text/html" },
    },
    async (baseUrl) => {
      const result = await checkPublicClaimHygiene(fetch, baseUrl, 2000);
      assert.equal(result.severity, SEVERITY.PASS);
    },
  );
});

test("checkPublicClaimHygiene: FAIL when banned vocabulary is live", async () => {
  await withServer(
    {
      "/": { status: 200, body: "<html>This is a guaranteed winner.</html>", contentType: "text/html" },
      "/pricing": { status: 200, body: "<html>fine</html>", contentType: "text/html" },
    },
    async (baseUrl) => {
      const result = await checkPublicClaimHygiene(fetch, baseUrl, 2000);
      assert.equal(result.severity, SEVERITY.FAIL);
      assert.match(result.detail, /guaranteed/i);
    },
  );
});

// --- redaction --------------------------------------------------------------

test("redactSensitive: masks live/test Stripe keys, webhook secrets, and GitHub PATs", () => {
  assert.equal(redactSensitive("key=sk_live_abc123XYZ"), "key=sk_live_[REDACTED]");
  assert.equal(redactSensitive("key=sk_test_abc123XYZ"), "key=sk_test_[REDACTED]");
  assert.equal(redactSensitive("whsec_abcDEF123"), "whsec_[REDACTED]");
  assert.equal(redactSensitive("token ghp_abcdefghij1234567890"), "token ghp_[REDACTED]");
});

test("redactSensitive: masks Bearer/Basic auth header values", () => {
  const out = redactSensitive("Authorization: Bearer abcdefghijklmnopqrstuvwx");
  assert.ok(out.includes("[REDACTED]"));
  assert.ok(!out.includes("abcdefghijklmnopqrstuvwx"));
});

test("redactSensitive: masks generic api-key/secret/token/password value patterns", () => {
  const out = redactSensitive('apiKey: "abcdefghijklmnop1234"');
  assert.ok(out.includes("[REDACTED]"));
  assert.ok(!out.includes("abcdefghijklmnop1234"));
});

test("redactSensitive: passes non-strings through unchanged", () => {
  assert.equal(redactSensitive(42), 42);
  assert.equal(redactSensitive(null), null);
});

// --- transport / retry / runner classification ------------------------------

test("checkPage: retries once on transport failure and can succeed on the retry", async () => {
  let calls = 0;
  const flakyFetch = async () => {
    calls++;
    if (calls === 1) throw new Error("simulated transient network blip");
    return new Response("ok", { status: 200 });
  };
  const result = await checkPage(flakyFetch, "http://fixture.invalid", "/", 500);
  assert.equal(result.severity, SEVERITY.PASS);
  assert.equal(calls, 2);
});

test("checkPage: FAILs with TRANSPORT category after exhausting the retry", async () => {
  let calls = 0;
  const alwaysFailFetch = async () => {
    calls++;
    throw new Error("simulated persistent network failure");
  };
  const result = await checkPage(alwaysFailFetch, "http://fixture.invalid", "/", 500);
  assert.equal(result.severity, SEVERITY.FAIL);
  assert.equal(result.category, CATEGORY.TRANSPORT);
  assert.equal(calls, 2);
});

test("checkPage: TRANSPORT FAIL when the server never responds within the timeout", async () => {
  await withServer({ "/slow": { status: 200, body: "ok", delayMs: 400 } }, async (baseUrl) => {
    const result = await checkPage(fetch, baseUrl, "/slow", 100);
    assert.equal(result.severity, SEVERITY.FAIL);
    assert.equal(result.category, CATEGORY.TRANSPORT);
  });
});

test("runAllChecks: covers every registered check exactly once against a fully-healthy fixture", async () => {
  const spec = buildValidSpec();
  const routes = {
    "/llms.txt": { status: 200, body: "hello", contentType: "text/plain" },
    "/api/health": { status: 200, body: healthBody() },
    "/api/proof/ledger": { status: 200, body: JSON.stringify({ ledger: { published: false } }) },
    "/api/proof/receipts": { status: 200, body: JSON.stringify([]) },
    "/api/proof/verification-spec.json": { status: 200, body: JSON.stringify(spec) },
    "/api/proof/openapi.json": { status: 200, body: JSON.stringify({ openapi: "3.0.0", paths: {} }) },
    "/news-sitemap.xml": { status: 200, body: `<urlset><url><loc>x</loc></url></urlset>`, contentType: "application/xml" },
    "/robots.txt": { status: 200, body: "Sitemap: https://x/sitemap.xml", contentType: "text/plain" },
    "/": { status: 200, body: "<html>clean</html>", contentType: "text/html" },
    "/tools": { status: 200, body: "<html>clean</html>", contentType: "text/html" },
    "/sealed": { status: 200, body: "<html>clean</html>", contentType: "text/html" },
    "/how-we-make-money": { status: 200, body: "<html>clean</html>", contentType: "text/html" },
    "/watchlist": { status: 200, body: "<html>clean</html>", contentType: "text/html" },
    "/pricing": { status: 200, body: "<html>clean</html>", contentType: "text/html" },
  };
  await withServer(routes, async (baseUrl) => {
    const results = await runAllChecks({ fetchImpl: fetch, baseUrl, timeoutMs: 2000 });
    assert.equal(results.length, CHECKS.length);
    assert.deepEqual(
      results.map((r) => r.id).sort(),
      CHECKS.map((c) => c.id).sort(),
    );
    for (const r of results) {
      assert.notEqual(r.severity, SEVERITY.FAIL, `expected PASS/WARN, got FAIL for ${r.id}: ${r.detail}`);
    }
  });
});

test("runAllChecks: converts an unexpected throw inside a check into a RUNNER-category failure without crashing the run", async () => {
  // llms-txt's `await res.text()` call sits outside its own local try/catch,
  // so a broken response stream there exercises runAllChecks's own outer
  // catch (a RUNNER failure), not a per-check transport/assertion catch.
  const brokenFetch = async (url) => {
    if (String(url).endsWith("/llms.txt")) {
      return {
        status: 200,
        text: async () => {
          throw new Error("simulated broken response stream");
        },
      };
    }
    return { status: 200, text: async () => "{}" };
  };
  const results = await runAllChecks({ fetchImpl: brokenFetch, baseUrl: "http://fixture.invalid", timeoutMs: 500 });
  assert.equal(results.length, CHECKS.length);
  const llms = results.find((r) => r.id === "llms-txt");
  assert.equal(llms.severity, SEVERITY.FAIL);
  assert.equal(llms.category, CATEGORY.RUNNER);
});
