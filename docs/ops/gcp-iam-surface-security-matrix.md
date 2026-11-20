# GCP IAM & Surface Security Matrix (Path 36 Course 4 + Path 4525)

Every internal and public GSE endpoint must obey strict least-privilege IAM and identity boundaries:

| Surface / Resource | Exposure | Identity Mechanism | Verification Enforcement |
|---|---|---|---|
| `https://www.galaxysportsedge.com` (`apps/web`) | Public Internet | Vercel Edge + Public Read / Session Unlock | Projections & market rankings only; official Stage-5 plays behind paid checkout / token unlock (`apps/web/lib/auth/`) |
| `/cockpit`, `/admin`, Internal Cloud Run | Private Operator Only | GCP Identity-Aware Proxy (IAP) + Allowlist | Server verifies `x-goog-iap-jwt-assertion` ES256 JWT (`apps/web/lib/auth/iap-jwt-verifier.ts`) against `IAP_AUDIENCE` |
| Pub/Sub Cloud Run Functions Gen 2 (`nodejs22`) | Private Eventarc Trigger | Dedicated Function SA (`roles/pubsub.subscriber` scoped) | Payload schema validation + DLQ isolation (`infra/gcp/pubsub-functions/schemas.ts`) |
| BigQuery `gse_analytics` | Internal Analytics Service | Dedicated Analytics SA (`roles/bigquery.dataEditor` dataset-scoped) | Partitioned/clustered reads only; zero `SELECT *`; zero `roles/owner` |
| GCS Raw Media / Snapshots | Private Bucket Only | Signed URLs (`<= 15m`) or Service Account IAM | Uniform bucket-level access (`PAP enforced`, zero `allUsers`) |
| AWS Bedrock Fallback | Internal Worker Dispatch | Startup Credit Account `034220092205` (`hq@galaxysportsedge.com`) | Fail-closed account assertion (`GSE_STARTUP_AWS_ACCOUNT_ID` in `bedrock.ts`) |

## Operational Guardrails
- Never grant `roles/editor`, `roles/owner`, or `allUsers` on internal Cloud Run, BigQuery, GCS, or Pub/Sub resources.
- Never allow a client-supplied email header to bypass `verifyIapJwtAssertion`.
