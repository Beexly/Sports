# GSE — Advisor Decisions (locked)
> Decisions made under explicit founder delegation ("make the most intelligent decisions and keep moving
> forward"), 2026-06-03. Reversible by the founder at any time. Rationale recorded for auditability.

## D1 — Canonical repository: `C:\Users\Garrett\Sports-deploy-fix`
**Decision:** `Sports-deploy-fix` is the single source of truth for Galaxy Sports Edge. `Clouds-bruh` is
canonical for Lumera.

**Why:** Its git history matches the deployed live site `galaxysportsedge.com` (Edge Index, Founding pricing,
trust surfaces). The divergent copies — `OneDrive\Documents\Galaxy Sports Edge` (the smaller scaffold Codex
worked in), `C:\Users\Garrett\Sports`, `Sports_release_codex` — are older/parallel and were fragmenting effort
(see `RND_SYNTHESIS_2026.md` §4).

**Action taken / not taken:** All new work lands in `Sports-deploy-fix`. The other copies are **not deleted**
(deletion is irreversible and reserved for the founder) — recommend the founder archive or delete them once
satisfied nothing unmerged remains there.

## D2 — Brand: **Galaxy Sports Edge (GSE)**
**Decision:** Standardize on "Galaxy Sports Edge / GSE." Retire "GSN" as a verbal shorthand only.

**Why:** The codebase, the domain (`galaxysportsedge.com`), the live wordmark ("GALAXY / SPORTS EDGE"), and the
Org JSON-LD (`alternateName: "GSE"`) are all already GSE. A rename to "GSN" would be a large, risky sweep across
a *live* trust product (domain, OAuth callbacks, Stripe, SEO/canonical, brand assets) for zero product benefit.
The intelligent decision is to *not* do a disruptive rename.

**Action:** No code change needed — GSE is already canonical. If "GSN" ever surfaces in user-facing copy, treat
it as drift and correct to GSE.
