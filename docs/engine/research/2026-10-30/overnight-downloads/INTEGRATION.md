# freehire — integration smoke test (register S83)

Date: 2026-10-30. Lane: TEST verdict from the ON1 backlog dossier — sandbox-connect
freehire-mcp read-only and check search parity against freehire.me.
Repos: `strelov1/freehire-cli` (Go), `strelov1/freehire-mcp` (TypeScript), both
cloned into this directory. The main backend repo (`strelov1/freehire`, 132 MB)
failed to clone twice on this VM's network (HTTP/2 stream cancel, then early
EOF); it is not needed for integration — the CLI and MCP server are the
surfaces, and the backend is the hosted service at freehire.me.

**Bottom line:** the freehire API and the MCP tool surface are real and live.
The local MCP server builds, starts, handshakes, and dispatches — but it gates
every tool behind a freehire token, and no token exists on this VM (creating
one is Garrett's act in his own account; none was requested or used). All
read-only data below was verified anonymously against the same live API the
tools wrap. The prepared fleet-bus patch compiles and registers cleanly in a
scratch copy of the bus; the live bus was not touched.

---

## (a) What ran, with evidence

### 1. CLI (freehire-cli v0.28.0)

- No Go toolchain on this VM, so the CLI was installed the vendor's other
  documented way: the official prebuilt binary from the repo's own
  `install.sh` asset URL (`releases/latest/download/freehire_linux_amd64`,
  7.6 MB ELF) → `bin/freehire`.
- `freehire --version` → `freehire version v0.28.0`.
- `freehire auth status` → `error: not authenticated: run \`freehire auth login\``
  (exit 1) — correct documented behavior; `~/.freehire/creds.json` is absent
  and `FREEHIRE_TOKEN` is unset on this VM.
- **Failure point (environment, not freehire):** every CLI API call
  (`search`, `facets`) hangs to the CLI's 60 s context deadline —
  `error: Get "https://freehire.me/api/v1/agent/jobs/search?...": context deadline exceeded`,
  reproduced 3×, including with `GODEBUG=netdns=cgo+1` (binary is a static
  no-cgo build). The identical URLs answer `curl` in 3.5–6.8 s from the same
  VM. This VM egresses only through a proxy (`hatch-egress-proxy`); curl and
  npm use it, this Go binary's requests never complete. CLI search parity was
  therefore proven at the API layer (next section) instead of through the
  binary.

### 2. The API the CLI/MCP wrap — anonymous, live-verified via curl

Evidence files `evidence-rest-*.json` in this directory.

- **Search** — `GET /api/v1/agent/jobs/search?q=golang&description_format=markdown&limit=3`
  → 200. `meta.total = 3,855` golang postings; hits carry full markdown
  descriptions (top hit: "Golang Developer/IaC Developer", Arkhya Tech Inc.,
  Charlotte US). This is the exact endpoint and payload the CLI `search` and
  the MCP `search` tool return.
- **Facets** — `GET /api/v1/jobs/facets` → 200, 77 KB. `data.total =
  4,783,954` live postings — independently verifies the README's "4.7M+"
  figure (the reel's "3.3M" is stale). 29 facet families incl. `skills`,
  `countries`, `cities`, `source`, `work_mode`, `seniority`.
- **Job** — `GET /api/v1/jobs/golang-developer-russell-tobin-ivxd36l7` → 200,
  full record (Russell Tobin, Bellevue US, original ATS URL).
- **Company** — `GET /api/v1/companies/russell-tobin` → 200, payload carries
  20 open jobs.
- **Similar** — `GET /api/v1/jobs/<slug>/similar` → 200 with an empty list for
  that slug (route live; no similar results for that posting).
- **Market coverage** — `GET /api/v1/market/coverage` → 405 (POST-only route;
  not exercised — the CLI's `market-fit` uses it with a body).
- **Param discipline, demonstrated by the API itself:** a probe with
  `country=US` / `city=houston` came back with
  `meta.ignored_params: [{param: "country", did_you_mean: "countries"}, …]` —
  wrong names are ignored (search widens) and named in the response. The
  Houston probe therefore returned the unfiltered catalogue, which is why the
  bus patch below uses the verified plural facet names.

### 3. Local freehire-mcp server — real MCP client calls

- `npm ci` (142 packages) + `npm run build` (tsc) — clean. Server entry:
  `dist/index.js`, stdio transport.
- Drove it with an actual MCP client (official `@modelcontextprotocol/sdk`
  `Client` + `StdioClientTransport`; harness kept at
  `freehire-mcp/smoke-client.mjs`):
  - Handshake OK — server identifies as `{"name":"freehire","version":"0.8.0"}`.
  - `tools/list` → **45 tools** (full list with schemas:
    `evidence-tools-list.json`). Read set: `whoami, profile, facets, search,
    market_fit, job, company, check_jobs_open, similar_jobs, salary_stats,
    job_market_stats, list_filter_values, my, cv_list, …`. Write/send set:
    `apply, save, unsave, stage, note, subscribe, update_subscription,
    unsubscribe, cv_tailor, cv_edit, cv_render, experience_add_*, submit,
    contribute, jobs_add, jobs_edit, …`.
  - `tools/call` ×5, read-only only (full results:
    `evidence-tool-calls.json`):
    - `list_filter_values`, `salary_stats`, `check_jobs_open`, `search` →
      `isError` result: **"not authenticated: set FREEHIRE_TOKEN or run
      `freehire auth login`"**. Key finding: the local server gates **every**
      tool behind a token — including the five tools its README describes as
      forwarded to the *anonymous* hosted server. Without Garrett's token,
      the local server returns no job data at all.
    - `job_market_stats` with `work_mode` as a string → live MCP error
      `-32602` zod validation ("Expected array, received string") — proof
      the calls reach real dispatch, not a stub.
- **Hosted endpoint from this VM — unreachable in practice (documented, not
  a freehire defect):** `https://freehire.me/api/v1/mcp` via the SDK's
  Streamable HTTP transport timed out at the 60 s SDK limit; Node global
  fetch and undici (default dispatcher, `EnvHttpProxyAgent`, ipv6-first)
  all hang; even `curl` POSTs receive **zero bytes** at 45 s / 60 s / 120 s
  (connect 6 ms, TLS 4.1 s, TTFB never) while a GET on the same URL returns
  405 in 6.5 s and REST GETs succeed. POSTs to that route do not complete
  from this VM tonight; on any normal network the hosted endpoint is the
  zero-install path (README: read-only search tools, no key).

### Verdict on the TEST

Search parity: **confirmed at the API layer** — the anonymous agent search
endpoint returns the live catalogue with full descriptions, and the facets
total matches the project's public claim. MCP wiring: **server proven**;
**data through the local MCP server requires Garrett's freehire API token**
(his account → API keys), which is also the documented design. Nothing about
the apply path was touched.

---

## (b) Registering freehire on the fleet MCP bus — prepared, NOT applied

How the bus actually works (read from `~/workspace/mcp-servers/gse-spark-mcp`):
it is a **single in-process MCP server** (`src/server.ts`, SDK ^1.32, zod v4,
stateless Streamable HTTP on `localhost:4311/mcp`). It does **not** mount or
proxy external MCP servers — new capability is added as in-process
`server.tool(name, description, zodShape, handler)` blocks (the README's
"gse_echo pattern"), returning the shared `text()` helper shape. So
"registering freehire-mcp" on this bus means adding bus-native `freehire_*`
tools that call freehire's public REST API — the same routes verified above.

Prepared patch: **`freehire-bus-tools.snippet.ts`** (this directory). It adds,
following the bus's conventions exactly (env consts beside `PORT` /
`GSE_REPORT_PATH`, `server.tool` blocks in a new FREEHIRE section, `text()`
returns, `.describe()` on every param):

- `freehire_search` — query + `countries` / `cities` / `skills` facets →
  `GET /api/v1/agent/jobs/search` (output capped at 12,000 chars with a
  visible truncation note, since hits carry full descriptions)
- `freehire_facets` → `GET /api/v1/jobs/facets`
- `freehire_job` → `GET /api/v1/jobs/{slug}`
- `freehire_company` → `GET /api/v1/companies/{slug}`

`FREEHIRE_API_URL` / `FREEHIRE_TOKEN` are read from env only; the four tools
run anonymously, the token is wired in the helper solely so a future
approved account tool doesn't need rework. No write tool is in the patch.

**Verification (scratch copy only):** the bus was copied to `/tmp/bus-check`,
the snippet inserted, `npm run build` → **tsc clean**; booted on port 4319
with a sandbox `HOME` (so the live `fleet.db` was never opened): `/health` →
`ok`; `tools/list` → **13 tools = the existing 9 + the 4 new `freehire_*`**
(`evidence-bus-scratch-tools-list.txt`). Scratch server shut down; the live
bus and its `src/server.ts` are byte-identical to before.

To apply later (Garrett's go): paste the snippet's consts near the top of
`src/server.ts` and its tool block before the transport section, rebuild,
restart the bus. Note: on **this VM** the bus's Node `fetch` would hit the
same egress hang documented above for any outbound call — the tools are
correct for the Cloud Run deployment / any normal-network host, and that VM
egress limit is already the known state of this sandbox, not a patch defect.

For reference only — standard MCP hosts (Claude Code / Desktop) register the
upstream server directly, per freehire-mcp's README; this is **not** how the
fleet bus registers tools and was not used:

```json
{ "mcpServers": { "freehire": {
  "command": "npx", "args": ["-y", "freehire-mcp"],
  "env": { "FREEHIRE_TOKEN": "fhk_…" } } } }
```

---

## (c) Gate note — what may be wired vs. what stays off

- **Free to wire (read-only, anonymous):** `search`, `facets`, `job`,
  `company`, `similar_jobs`, `list_filter_values`, `salary_stats`,
  `job_market_stats`, `check_jobs_open`, `market_fit` — and the four bus
  tools in the prepared patch. These only read the public catalogue.
- **Gated sends — stay OFF until Garrett explicitly approves, each class:**
  - `apply` and the whole auto-apply surface — a real job application leaves
    the machine in Garrett's name. (By freehire's own design, queuing a new
    auto-apply attempt is website-only; the CLI/MCP can only review/approve
    an already-queued attempt — that approve call is still a send.)
  - Account-state writes: `save` / `unsave`, `stage`, `note`, `my`-tracking
    mutations, `subscribe` / `update_subscription` / `unsubscribe` (alerts
    deliver to email/Telegram/webhook — outbound channels), `contribute`,
    `submit`, all `cv_*` edit/render and `experience_*` writes, moderator
    `jobs_add` / `jobs_edit` / `submission_*`.
  - Creating the `fhk_…` API key or running `freehire auth login` — Garrett's
    account act, his tap. Until then the local MCP server stays in its
    (verified) not-authenticated state and the bus tools run anonymously.

## Remaining gaps

1. Main backend repo not cloned (132 MB; two network failures) — not needed
   for integration; retry only if self-hosting the crawler is ever wanted.
2. No live `tools/call` **data** response through the local MCP server —
   blocked on Garrett's token by the server's design (auth-gate responses
   and the REST-layer data proof are the evidence instead).
3. Hosted MCP endpoint POSTs do not complete from this VM (egress proxy
   behavior, documented above with timings).
4. The prepared bus patch is verified compiled + registered in a scratch
   copy only; it has not been applied to the live bus, per instructions.
