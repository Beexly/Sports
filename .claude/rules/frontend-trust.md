---
paths:
  - "apps/web/app/**/*.{ts,tsx}"
  - "apps/web/components/**/*.{ts,tsx}"
  - "apps/web/lib/seo/**"
---

# Public-surface rules

- Entitlements and audience projection are enforced server-side before data selection.
- Metadata, JSON-LD, OpenGraph, API payloads, and hidden DOM may not leak premium or gated fields.
- Empty, stale, unavailable, bootstrap, and permission-denied states are explicit and honest.
- No fake urgency, users, outcomes, authority, live state, or performance.
- Motion communicates information; reduced-motion and keyboard paths are mandatory.
- Preserve semantic headings, landmarks, focus behavior, text zoom, and mobile layout.
- Public copy must describe what code proves today, not roadmap intent.
