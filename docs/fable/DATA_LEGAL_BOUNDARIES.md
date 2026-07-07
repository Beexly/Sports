# Data And Legal Boundaries

Boundary source:
- `apps/web/lib/scraping/source-rights-registry.ts`
- Adapter: `apps/web/lib/fable/source-registry.ts`
- Test: `apps/web/lib/fable/source-registry.test.ts`

Rules:
- Source status in the registry is the current source of truth.
- Open or approved API sources may be used only according to their flags.
- Public fallback sources can support derived facts only when the registry allows it.
- Vendor candidates and permission-required sources remain blocked or conditional until written owner/legal approval exists.
- AWS storage inherits the same storage flag as local storage; moving storage to AWS does not change rights.

Current high-value allowed lane:
- nflverse is the primary NFL dataset lane with attribution required.

Current blocked or conditional lanes:
- Sources with permission requirements, technical controls, or manual-only status cannot be automated.
- Broadcast or pundit content is manual claim-accountability work unless a written license exists.

Machine-readable schema:
- `schemas/fable/source-registry-entry.schema.json`

Executable validation:

```bash
npm run fable:sources
```
