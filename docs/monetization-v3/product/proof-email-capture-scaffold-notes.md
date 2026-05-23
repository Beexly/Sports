# Proof Email Capture Scaffold Notes

**Status:** Validation-only engineering scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-028

## What changed

The repo now has a non-persistent proof-surface email capture path:

- [proof-email-capture.ts](../../../apps/web/lib/proof-email-capture.ts) validates email, source page, source module, and optional UTM fields.
- [email-capture route](../../../apps/web/app/api/proof/email-capture/route.ts) parses requests, validates payloads, and returns HTTP 501 until subscriber storage is enabled.
- [proof-surface-email-capture.tsx](../../../apps/web/components/proof-surface-email-capture.tsx) submits to the validation endpoint and renders inline success or failure states.
- [proof-email-capture.test.ts](../../../apps/web/lib/proof-email-capture.test.ts) covers valid and invalid payload behavior.

## DEC-NEXT-028 - Add validation-only proof email capture scaffold

**Decision:** Add request validation for proof-surface email capture without enabling subscriber persistence.

**Rationale:** `product/public-proof-surface-monetization-spec.md` defines email capture as a quiet, reversible proof-surface monetization module. Validating payload shape now reduces future implementation risk while preserving the launch guardrail that no capture storage is active until the module is intentionally wired.

**Guardrails:**

- Do not enable `PROOF_SURFACE_EMAIL_CAPTURE_ENABLED` in production until subscriber storage, consent timestamping, duplicate handling, and failure logging exist.
- Do not send email from this endpoint.
- Do not add tracking pixels or paid-ad retargeting.
- Do not route users to checkout from this endpoint.

**Follow-up:** Replace HTTP 501 with persistence only after storage and consent handling are implemented.
