---
description: Stripe integration safety audit
---
Audit the Stripe integration for production safety. Confirm: test mode only (no live keys), webhook signature verification, idempotency keys on create/charge calls, and no secret keys in client code or logs.
Hard stop: never switch to live mode. Report pass/fail per check with file:line.
