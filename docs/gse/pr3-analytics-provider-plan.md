# GSE PR3 — Analytics Provider Plan

**Status:** Clarity npm bridge landed (gated off by default). Other providers still owner-gated.
**Ops:** `docs/ops/MICROSOFT_CLARITY.md`
**Source of truth:** `apps/web/lib/analytics/events.ts` (`track()` is inert).

> Clarity loads only when founder enables env flags. No project id = no network.
> `identify()` with PII remains forbidden. Cookie consent is not auto-granted.

## 1. Current state (PR2)

`apps/web/lib/analytics/events.ts` is a typed registry with a provider-agnostic
`track()` that returns its payload and does nothing else — no network, no PII. The
waitlist funnel events are already registered (see below).

## 2. Event list (already defined, no-op)

| Event | Fires when | Non-PII context |
|---|---|---|
| `waitlist_viewed` | `/waitlist` viewed | page/copyVersion |
| `waitlist_started` | first form interaction | copyVersion |
| `waitlist_submitted` | valid consented submit | role |
| `waitlist_consent_blocked` | submit without consent | — |
| `audit_offer_clicked` | decision-audit CTA | offer slug |
| `transparency_read` | backtest-truth section read | section |
| `research_brief_clicked` | research-brief CTA | brief id |
| `claim_gate_hit` | copy blocked by scanner | rule id |

Rule: payloads carry only non-identifying funnel context. Never the raw email,
name, or free-text. If a per-lead identifier is ever needed, send a salted hash,
not the address.

## 3. Provider candidates (owner choice; none default)

| Option | Pros | Cons / gate |
|---|---|---|
| **Keep no-op (default)** | zero PII, zero vendor, zero cost | no funnel metrics |
| **PostHog (EU/self-host)** | already present in the OSS stack (no-op without key); event-based | needs key + privacy review; ensure EU region / no PII |
| **Plausible / privacy-first** | cookieless, no PII, lightweight | server proxy for events; less funnel depth |
| **Server-side only sink** | leads stay first-party (write counts to the DB) | build it ourselves |

Recommendation: if any provider is approved, prefer a **privacy-first, no-cookie,
no-PII** option, wired behind a key so it stays a no-op until the owner sets it.

## 4. No-op fallback (must remain)

`track()` stays inert when no provider key is set. Wiring must be additive: a
provider dispatch inside `track()` guarded by `if (PROVIDER_KEY)`, so absence of a
key = current behavior exactly. The unit test "track is inert and returns payload"
must keep passing in the no-key path.

## 5. Privacy rules (binding)

- No PII in any event payload (no email/name/free-text).
- Consent-gated: do not emit identified events for a lead who hasn't consented.
- No third-party cookies; no cross-site identifiers.
- Honor Do-Not-Track; provide an opt-out.
- A DPA/privacy review precedes any vendor.

## 6. Owner gates (all BLOCKED)

- Choosing/enabling a provider and setting its key.
- Any change that makes `track()` perform a network call by default.
- Sending any identifier (even hashed) off-platform.

## 7. Exact next safe action

Keep `track()` no-op. If/when the owner picks a provider, implement the guarded
dispatch + privacy controls in a PR3 branch, keep the no-key path inert, add a test
that asserts no network call without a key, and stop before any deploy.
