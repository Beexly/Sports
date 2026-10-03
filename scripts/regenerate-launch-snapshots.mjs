#!/usr/bin/env node
/**
 * regenerate-launch-snapshots.mjs
 *
 * Regenerates the static HTML snapshots in reports/launch-night/snapshots/
 * by fetching each critical route from a running dev server.
 *
 * Usage:
 *
 *   # In one terminal:
 *   npm run dev
 *
 *   # In another:
 *   node scripts/regenerate-launch-snapshots.mjs
 *   # or with a different host:
 *   APP_URL=http://localhost:3001 node scripts/regenerate-launch-snapshots.mjs
 *
 * The script intentionally has no Next.js dependencies — it's just
 * fetch() + writeFile(). It only saves the response body verbatim, so
 * the snapshots will match what a real browser would see.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// Routes we snapshot, mapped to output filenames.
const ROUTES = [
  ["/", "home.html"],
  ["/picks", "picks.html"],
  ["/performance", "performance.html"],
  ["/brief", "brief.html"],
  ["/dashboard", "dashboard.html"],
  ["/cockpit", "cockpit.html"],
  ["/cockpit/history", "cockpit-history.html"],
  ["/cockpit/brief", "cockpit-brief.html"],
  ["/cockpit/calibration", "cockpit-calibration.html"],
];

const OUTPUT_DIR = resolve(process.cwd(), "reports/launch-night/snapshots");

async function fetchRoute(path) {
  const url = `${APP_URL}${path}`;
  const start = Date.now();
  try {
    // redirect: "manual" so we can see 3xx responses and capture them
    // explicitly rather than silently following — useful for noticing
    // when /cockpit bounces to /auth/signin in stub mode.
    const res = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "regenerate-launch-snapshots",
      },
      redirect: "manual",
    });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body,
      ms: Date.now() - start,
      location: res.headers.get("location"),
    };
  } catch (err) {
    return { ok: false, status: 0, body: String(err), ms: Date.now() - start, location: null };
  }
}

function placeholderBody({ path, status, location, body }) {
  // For non-2xx responses, write a self-describing HTML placeholder so
  // the snapshot still serves as a useful artifact rather than dumping
  // a raw error page (or worse, an empty file).
  if (status === 0) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Snapshot error for ${path}</title></head>
<body style="font-family:system-ui;background:#0a0a0a;color:#ddd;padding:24px;">
  <h1>Snapshot fetch failed</h1>
  <p>Route: <code>${path}</code></p>
  <p>Reason: ${body.slice(0, 500)}</p>
</body></html>`;
  }
  if (status >= 300 && status < 400) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Redirect for ${path}</title></head>
<body style="font-family:system-ui;background:#0a0a0a;color:#ddd;padding:24px;">
  <h1>${path} → ${location ?? "(no Location header)"}</h1>
  <p>HTTP ${status}. The route redirected; capture the destination separately if needed.</p>
</body></html>`;
  }
  if (status === 503) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${path} — 503</title></head>
<body style="font-family:system-ui;background:#0a0a0a;color:#ddd;padding:24px;">
  <h1>${path}: 503 Service Unavailable</h1>
  <p>This is expected when the corresponding readiness gate is closed.</p>
  <pre style="background:#111;padding:12px;overflow:auto;">${body.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</pre>
</body></html>`;
  }
  if (status >= 400) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${path} — ${status}</title></head>
<body style="font-family:system-ui;background:#0a0a0a;color:#ddd;padding:24px;">
  <h1>${path}: HTTP ${status}</h1>
  <pre style="background:#111;padding:12px;overflow:auto;">${body.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</pre>
</body></html>`;
  }
  return body;
}

function bannerFor(path, status) {
  const time = new Date().toISOString();
  return `<!--
  Launch-night snapshot
  Route: ${path}
  Status: ${status}
  Source: ${APP_URL}${path}
  Generated: ${time}
-->\n`;
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  let ok = 0;
  let fail = 0;
  const lines = [];

  for (const [path, file] of ROUTES) {
    const result = await fetchRoute(path);
    const target = resolve(OUTPUT_DIR, file);
    const body = placeholderBody({ path, status: result.status, location: result.location, body: result.body });
    const content = bannerFor(path, result.status) + body;
    await writeFile(target, content, "utf8");
    // 2xx and 3xx are both "ok" for our purposes — a redirect to /auth/signin
    // when cockpit is admin-gated is the correct behavior, not a failure.
    const success = result.ok || (result.status >= 300 && result.status < 400) || result.status === 503;
    if (success) ok++;
    else fail++;
    const tag = success ? "OK" : "FAIL";
    console.log(`${tag.padEnd(5)} ${path.padEnd(28)} ${String(result.status).padEnd(4)} ${result.ms}ms  → ${file}`);
    lines.push({ path, file, status: result.status, ok: success });
  }

  // Rewrite index.html with a fresh table of the snapshots we just produced.
  const indexHtml = renderIndex(lines);
  await writeFile(resolve(OUTPUT_DIR, "index.html"), indexHtml, "utf8");
  console.log("---");
  console.log(`${ok} ok / ${fail} fail`);
  console.log(`Wrote ${ROUTES.length} snapshots + index.html to ${OUTPUT_DIR}`);
  process.exit(fail > 0 ? 1 : 0);
}

function statusBadgeColor(status) {
  if (status === 200) return "#2d6a4f"; // green
  if (status >= 300 && status < 400) return "#a36b00"; // amber
  if (status === 503) return "#7a4a00"; // orange
  if (status >= 400) return "#7a1e1e"; // red
  return "#3a3a3a"; // gray (0 / unknown)
}

function statusBadgeLabel(status) {
  if (status === 200) return "OK";
  if (status >= 300 && status < 400) return "REDIR";
  if (status === 503) return "GATED";
  if (status >= 400) return "ERR";
  return "DOWN";
}

function renderIndex(entries) {
  const time = new Date().toISOString();
  const rows = entries
    .map((e) => {
      const color = statusBadgeColor(e.status);
      const label = statusBadgeLabel(e.status);
      return `<tr>
        <td><code>${e.path}</code></td>
        <td><a href="${e.file}">${e.file}</a></td>
        <td><code>${e.status}</code></td>
        <td><span class="badge" style="background:${color}">${label}</span></td>
      </tr>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Launch-Night Snapshots</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #0a0a0a; color: #ddd; padding: 24px; max-width: 880px; margin: 0 auto; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { color: #888; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th, td { padding: 8px 12px; border-bottom: 1px solid #222; text-align: left; vertical-align: middle; }
    th { color: #888; text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }
    a { color: #6aa1ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { color: #ddd; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #fff;
      text-transform: uppercase;
    }
    .legend { color: #666; font-size: 11px; margin-top: 12px; }
    .legend code { color: #999; }
  </style>
</head>
<body>
  <h1>Launch-Night Snapshots</h1>
  <p>Regenerated ${time}. Source: <code>regenerate-launch-snapshots.mjs</code>.</p>
  <table>
    <thead><tr><th>Route</th><th>File</th><th>Status</th><th>Result</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="legend">
    Legend: <code>OK</code> = 200,
    <code>REDIR</code> = 3xx (expected for admin-gated pages without a session),
    <code>GATED</code> = 503 (expected when a readiness gate is closed),
    <code>ERR</code> = 4xx/5xx (investigate),
    <code>DOWN</code> = the dev server wasn't reachable.
  </p>
</body>
</html>
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
