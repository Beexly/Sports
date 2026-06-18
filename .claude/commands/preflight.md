---
description: Pre-deploy go/no-go checklist
---
Run a pre-deploy check. Verify: production build passes, typecheck clean, migration status in sync, no stray console.logs or blocker TODOs, and env var parity between local and prod.
Output a go/no-go with the failing items listed. Do NOT deploy — report only.
