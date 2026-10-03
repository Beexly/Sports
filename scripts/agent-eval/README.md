# Thin agent evaluation harness

Deterministic regression for high-leverage paths. **No LLM required.** Not a research platform.

```bash
npm run agent:eval
```

Fixtures encode expected predicates (path selection, webhook status mapping, router cleared flags).
Add fixtures under `fixtures/*.json`; extend `run.mjs` predicates only when behavior is non-trivial.
