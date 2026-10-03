#!/usr/bin/env node
/**
 * Minimal The-Odds-API-shaped mock for staging chaos.
 * Modes via MOCK_ODDS_MODE: ok | 402 | 401 | 429 | 500 | empty | timeout
 *
 * Does NOT invent production-grade lines for live FIRE. `ok` returns a tiny
 * empty-events payload so the client path can be exercised without claiming edges.
 */

import http from "node:http";

const port = Number(process.env.PORT || 8080);
const mode = (process.env.MOCK_ODDS_MODE || "402").toLowerCase();

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "x-requests-remaining": mode === "402" ? "0" : "100",
    "x-requests-used": "1",
    ...headers,
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/health")) {
    send(res, 200, { ok: true, mode });
    return;
  }

  // Simulate hung upstream (client should AbortSignal.timeout).
  if (mode === "timeout") {
    // Hold connection open longer than ODDS_API_TIMEOUT_MS (15s).
    await new Promise((r) => setTimeout(r, 20_000));
    send(res, 200, []);
    return;
  }

  if (mode === "402") {
    send(res, 402, { message: "Payment required", error_code: "PAYMENT_REQUIRED" });
    return;
  }
  if (mode === "401") {
    send(res, 401, { message: "Invalid API key" });
    return;
  }
  if (mode === "429") {
    send(res, 429, { message: "Too many requests" }, { "retry-after": "1" });
    return;
  }
  if (mode === "500") {
    send(res, 500, { message: "Internal error" });
    return;
  }
  if (mode === "empty") {
    // Valid HTTP, zero events — tests "success but nothing usable".
    send(res, 200, []);
    return;
  }

  // mode === ok — empty list shaped like Odds API; not a certifiable slate.
  if (url.includes("/sports") && url.includes("/odds")) {
    send(res, 200, []);
    return;
  }
  if (url.includes("/sports") && !url.includes("/odds")) {
    send(res, 200, [
      {
        key: "baseball_mlb",
        group: "Baseball",
        title: "MLB",
        active: true,
      },
    ]);
    return;
  }
  if (url.includes("/scores") || url.includes("/events")) {
    send(res, 200, []);
    return;
  }

  send(res, 200, []);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[mock-odds-api] mode=${mode} listening on ${port}`);
});
