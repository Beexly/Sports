# Competitor Leak Audit — Galaxy Sports Edge

This is a recurring audit. The question it answers:

> **Can a competitor reconstruct Galaxy's engine from what we expose?**

Run this audit:

- Quarterly while pre-launch
- Before every significant public release
- After every major refactor that touches public surfaces
- After any incident where a leak is suspected

## Audit dimensions

### 1. What can a competitor infer from public pages?

Walk every public route in `apps/web/lib/routes-catalog.ts` and ask:

- Does this page describe a feature? ✅ Acceptable.
- Does this page describe a feature's numerical thresholds? ❌ Pull back.
- Does this page describe weights, decision trees, or scoring rules?
  ❌ Pull back.
- Does this page reveal where the model is most vulnerable (specific
  failure modes a competitor could exploit)? ❌ Pull back.
- Does this page reveal proprietary data sources by name? ⚠️ Acceptable
  if those sources are commodity (The Odds API), risky if proprietary.

**Current public routes count:** 107 (build output)

**Current audit verdict:** Acceptable. Pages describe categories,
patterns, and frameworks. Numerical thresholds remain server-side.

### 2. What formulas are visible in frontend code?

Run:

```bash
# Inspect bundled client code for proprietary identifiers
cd apps/web && npx next build && grep -rEi "weight|threshold|coefficient|calibrat" .next/static/chunks/*.js 2>/dev/null | head -30
```

- ❌ Hardcoded weights or thresholds in client bundles
- ❌ Coefficient values in JS
- ❌ Calibration rules in JS
- ⚠️ Function names that reveal internal logic

**Current verdict:** TBD on each audit pass. Last reviewed 2026-05-28
during initial build of binder — no obvious leaks detected; deeper
audit pending.

### 3. What API responses expose too much?

For every API route in `apps/web/app/api/`:

- ❓ Does the response include score derivation, only output?
- ❓ Does the response include source identifiers that reveal vendor?
- ❓ Does the response include factor weights or only resolved values?
- ❓ Does the response include error messages that leak schema /
  internal paths / system prompts?
- ❓ Are admin endpoints distinguishable from public ones by URL
  pattern (potentially aiding enumeration)?

**Action:** Review all `/api/*` routes against this checklist quarterly.

### 4. What route names reveal internal systems?

Grep public route paths in `routes-catalog.ts` for names that expose
internal architecture:

- ✅ `/picks`, `/today`, `/board` — user-friendly, generic
- ✅ `/parlay-mri`, `/market-mirage` — public feature names
- ⚠️ `/source-mesh`, `/signal-ledger`, `/evidence-vault` — these
  describe internal architecture; acceptable because Galaxy intentionally
  publishes these as trust signals, but be aware competitors learn
  vocabulary
- ❌ Routes like `/internal-*`, `/admin-*`, `/debug-*` that should not
  exist publicly

**Current verdict:** Acceptable. Internal architecture names are
intentionally published as part of the trust posture.

### 5. What docs are public?

The `docs/` folder is committed to the repo. If the repo becomes public
(or if a contributor's clone leaks), these docs are exposed.

- ✅ `docs/adr/` — intentionally publishable architectural reasoning
- ⚠️ `docs/brain/`, `docs/intelligence/`, `docs/journal/` — review
  per-file for sensitive details
- ⚠️ `docs/legal-ip/` — internal trade-secret inventory; **must remain
  in private repo only**. Do not open-source.
- ⚠️ `docs/security/` — repo security playbook; **must remain in
  private repo only**.

**Current verdict:** Acceptable while repo remains private. If the
repo ever goes public, sensitive `docs/` subtrees must be removed or
moved to a separate private repo.

### 6. What screenshots are risky?

- ✅ Marketing screenshots showing public surfaces
- ❌ Screenshots of `/cockpit/*` or `/admin/*` shared externally
- ❌ Screenshots of error pages exposing stack traces
- ❌ Screenshots of editor with `.env` files visible
- ⚠️ Screenshots showing chat history with AI tools that include
  Bucket B or C content

**Action:** Audit any public screenshot before posting. See
`AI_TOOL_CONFIDENTIALITY_POLICY.md`.

### 7. What demo data reveals proprietary scoring?

Stub mode and sample data are explicitly labeled. Verify:

- ✅ Sample data is generic — no real game outcomes or proprietary
  rankings
- ✅ Sample data has `SampleDataBanner` rendered on pages where active
- ❓ Does sample confidence-score variation match production
  distribution? If yes, that's a subtle leak.
- ❓ Does sample factor-trail content reveal real factor names with
  real weight intent? Verify generic.

**Action:** Per-stub audit on each sample-data change.

### 8. What package / source maps expose internals?

- ❓ Are production source maps published? **Default Next.js:** no.
  Verify `next.config.js` — `productionBrowserSourceMaps: false`
  (default).
- ❓ Are server code or API routes accessible via static file paths?
  No — Next.js routes API code server-side only.
- ❓ Are environment-specific build artifacts (e.g., `.env` baked into
  the build) shipped? No — Next.js only inlines `NEXT_PUBLIC_*` vars;
  verify no proprietary value is `NEXT_PUBLIC_*`.

**Action:** Build inspection per release.

### 9. Are admin routes discoverable?

- ✅ `/cockpit/*` requires ADMIN role server-side; unauthorized
  visitors are redirected
- ✅ `/admin/*` similar
- ✅ Cockpit metadata: `robots: { index: false, follow: false, nocache: true }`
- ❓ Is the cockpit URL pattern listed in `sitemap.ts`? Verify NO.
- ❓ Is the cockpit URL pattern in `robots.ts` disallow list? Verify.

**Action:** Verify sitemap and robots.ts exclude admin paths.

### 10. Are API endpoints rate-limited?

- ❌ Not yet implemented
- **Risk:** scraping all picks, all reports, all academy content
- **Mitigation:** add rate limiting via middleware before launch
  (`apps/web/middleware.ts`)

### 11. Can a competitor scrape all premium reports?

- ⚠️ Currently no premium-gated content; all content public
- Future: entitlement gates server-side; never client-side; rate limit
  per session; tier-based throttling

### 12. Can a competitor reconstruct the engine from frontend bundle?

This is the central question.

- ✅ Scoring runs server-side
- ✅ Factor weights never shipped to client
- ✅ Thresholds never shipped to client
- ✅ Reason-code taxonomies are public (intentional) but threshold-to-
  reason mapping is not
- ✅ Pick output (confidence, selection, factor trail summary) is
  shipped; the math behind the output is not

**Verdict:** Acceptable. The frontend reveals **what** the engine
decided. A competitor inspecting the bundle cannot reconstruct **how**
it decided.

---

## Audit log

| Date | Auditor | Findings | Actions |
|---|---|---|---|
| 2026-05-28 | Founder | Initial audit during binder creation. Public surface acceptable. Backend protection holds. Some procedural gaps (rate limiting, security.txt, branch protection) documented in `REPO_SECURITY_CHECKLIST.md`. | Tracked in `REPO_SECURITY_CHECKLIST.md` priority list. |

---

## Red lines

If any of the following are ever true, **stop and escalate**:

- A proprietary weight or threshold appears in client JavaScript
- An admin route is reachable without authentication
- API responses include factor weights, system prompts, or
  recalibration rules
- A source map exposing server code is published
- A contractor publishes Galaxy methodology details
- A screenshot of cockpit appears on social or in a portfolio
- The repo becomes public with `docs/legal-ip/` or `docs/security/`
  still inside it
- A production `.env` is committed
- An AI tool conversation containing Bucket C content is shared publicly

Any red-line breach triggers:

1. Immediate containment (rotate, revoke, take down)
2. Incident log entry (off-repo)
3. Boundary audit
4. Update relevant binder documents
