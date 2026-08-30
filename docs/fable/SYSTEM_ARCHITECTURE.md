# System Architecture

FABLE is implemented as an evidence and governance layer over existing Sports repo capabilities.

Data flow:
1. Rights-gated source entries are maintained in `apps/web/lib/scraping/source-rights-registry.ts`.
2. NFL data ingestion remains in nflverse and package ingestion modules.
3. Metrics and calibration remain in existing web and prediction-engine modules.
4. New FABLE utilities provide pure functions for uncertainty ranking, local labeling manifests, drift statistics, parity checks, and AWS gates.
5. Docs and tests record what is proved versus what is blocked.

The new layer does not introduce another ingestion pipeline. It exposes missing primitives that can be imported by future routes, jobs, or dashboards after owner approval.
