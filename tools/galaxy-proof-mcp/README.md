# Galaxy Proof MCP

**Let any AI agent prove Galaxy Sports Edge's track record to itself — trusting no one.**

Galaxy Sports Edge commits every pick to a tamper-evident, hash-chained receipt *before* kickoff. This MCP server turns that public [Proof API](https://www.galaxysportsedge.com/llms.txt) into tools any MCP-capable AI (Claude Desktop, Claude Code, Cursor, etc.) can call — so when a user asks an agent *"is Galaxy Sports Edge legit? is their record real?"*, the agent doesn't have to take anyone's word for it. It **fetches the raw receipts and recomputes the SHA-256 commitments locally**, in its own process, using `node:crypto`. Galaxy's server is trusted only to serve the data — never for the verdict.

As far as we know, this is the first sports-prediction record an AI agent can **independently and trustlessly** audit.

## Why this matters

- **AI-native trust.** As people increasingly ask AI agents to vet products, "our record is verifiable by the agent itself" is a moat no unverifiable competitor can match.
- **Distribution.** Listed in an MCP registry, this becomes a discoverable tool agents reach for when evaluating sports-prediction services.
- **Integrity, honestly scoped.** The server proves the record wasn't *altered after commitment*. It makes **no** win-rate or accuracy claim — the ledger reports an honest unpublished/empty state until a substantiated record exists, and this server surfaces that verbatim.

## The 7 tools

| Tool | What it does |
|---|---|
| `get_record_summary` | The ledger snapshot + verification map (`/api/proof/ledger`). Honest unpublished state until substantiated. |
| `list_settled_receipts` | Enumerate settled, kicked-off receipts (`/api/proof/receipts`) — each with its leaf preimage. |
| `verify_receipt_local` | **Trustless.** Recompute `sha256("leaf:"+pickId+":"+payload)` locally and compare to the published `contentHash`. |
| `verify_receipt_via_api` | Cross-check one hash against Galaxy's own verifier (`/api/verify`). |
| `get_verification_spec` | The exact algorithm + known-answer test vectors (`/api/proof/verification-spec.json`). |
| `get_openapi_contract` | The formal OpenAPI 3.1 contract (`/api/proof/openapi.json`). |
| `audit_record_trustlessly` | **The full self-audit.** Paginate every settled receipt, recompute every leaf hash locally, compute the Merkle root, and report how many verify + any mismatches. |

## The trustless guarantee (how the math works)

Each receipt's commitment is `contentHash = sha256("leaf:" + pickId + ":" + payload)`, and the receipt hands you the `payload` (the leaf preimage). The set is committed as a Merkle tree with `sha256("node:" + left + ":" + right)` (last leaf duplicated on odd layers; empty set → `sha256("")`). `verify_receipt_local` and `audit_record_trustlessly` reproduce exactly this — so a `matches: true` is *your* result, not Galaxy's assertion.

## Install & build

```bash
npm install
npm run build
```

## Configure your MCP client

Point it at the built entry (`dist/index.js`). Example (Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "galaxy-proof": {
      "command": "node",
      "args": ["/absolute/path/to/galaxy-proof-mcp/dist/index.js"],
      "env": {
        "GSE_PROOF_BASE_URL": "https://www.galaxysportsedge.com"
      }
    }
  }
}
```

`GSE_PROOF_BASE_URL` defaults to `https://www.galaxysportsedge.com`. Override it to a **Vercel Preview** URL to test before the Proof surface is live in production.

## Status note (read this)

The Proof surface (`/llms.txt`, `/api/proof/*`) ships on the `claude/glass-ledger-edge-engine` branch. Until that branch is deployed to `www.galaxysportsedge.com`, the fetch-based tools will return an honest **404 "Proof surface not deployed"** message (the trustless `verify_receipt_local` math works regardless, since it needs no network). Once the branch is deployed — or if you point `GSE_PROOF_BASE_URL` at a Preview deploy — all tools go live.

## Guarantees & non-claims

- Read-only: every call is a public, no-auth `GET`. Nothing mutates state, spends money, or exposes a pre-kickoff pick.
- No performance claims: this server verifies **integrity and existence**, never win rate, ROI, or edge.
