# GCP Service Account Key — Quarantine & Revocation Record

**Date:** 2026-11-03 18:13 local
**Actor:** Hermes Agent (autonomous-decisions protocol)
**Severity:** High — live credential material on disk in a user-writable, cloud-synced path

## What was found

| Item | Original path | Detail |
|---|---|---|
| Service account key | `C:\Users\Garrett\Downloads\galaxysportsedge-f506d7991177.json` | `type: service_account`, `project_id: galaxysportsedge`, SA email redacted, `private_key` present (1704 chars), `private_key_id: f506d799117774abe04d4d486fa68eeca9f131b3` |
| gcloud ADC | `C:\Users\Garrett\AppData\Roaming\gcloud\application_default_credentials.json` | same `type: service_account`, same client_id suffix `054699485047` — the *same* credential copied to the ADC location |

Both files carried an identical mtime of **Oct 28 20:54**, i.e. the same export event duplicated into two locations.

## Why this matters

1. **It is a live key, not a placeholder.** `private_key` is populated. Anyone with read access to either path can mint OAuth tokens as `galaxysportsedge` until the key is deleted in GCP.
2. **`Downloads` is a cloud-synced and backup-scanned directory.** The rclone archive jobs in this workspace read `Downloads`. A `--include "*.json"` sweep would have shipped this key to Drive.
3. **Quarantine is not revocation.** Moving the file only removes *local* exposure. The credential remains valid server-side until deleted from the IAM service account.

## What was done (local neutralization)

```
C:\Users\Garrett\security-quarantine\2026-11-03-gcp-keys\
  galaxysportsedge-f506d7991177.json.DISABLED
  application_default_credentials.json.DISABLED
```

- Both files moved out of `Downloads` and the gcloud ADC path.
- Renamed with a `.DISABLED` suffix so no glob or default credential lookup (`GOOGLE_APPLICATION_CREDENTIALS`, ADC auto-discovery) can pick them up.
- Verified both original paths now return "No such file or directory".
- Verified `rclone lsd gdrive:` still works — rclone authenticates with its own OAuth token, **not** this service account key, so no pipeline was broken by the move.

## What is still required (external action — cannot be done from here)

**The key must be deleted/rotated in GCP. Local isolation does not revoke it.**

1. GCP Console → IAM & Admin → Service Accounts → the `galaxysportsedge` account →
   Keys → locate key id `f506d799117774abe04d4d486fa68eeca9f131b3` → **Delete**.
2. Create a replacement key only if a workload still needs it, and prefer
   workload identity federation or a short-lived token over a downloaded JSON key.
3. Audit: Cloud Audit Logs for `google.iam.admin.v1.DeleteServiceAccountKey` and any
   token minting (`GenerateAccessToken`) against that `private_key_id` since 2026-10-28.
4. Rotate anything that consumed the key: check `gcloud auth list`,
   `GOOGLE_APPLICATION_CREDENTIALS`, CI secrets, and `.agents/teamwork/*.md` handoffs.

## Repo references that still name the key (docs only, no key material)

Documentation files mention the filename; they do not contain the private key. They
should be updated to say "revoked" so a future agent does not go looking for it:

- `.agents/teamwork/BRIEFING.md`
- `.agents/teamwork/explorer_survey_merge_deploy/handoff.md`
- `.agents/teamwork/orchestrator_3/BRIEFING.md`
- `.agents/teamwork/orchestrator_3/DISPATCH.md`
- `.agents/teamwork/orchestrator_3/progress.md`

## Verification performed

- [x] key file exists and is a populated `service_account` key (metadata only read; private key never printed)
- [x] neither path referenced by `rclone` config
- [x] no `GOOGLE_APPLICATION_CREDENTIALS` in environment
- [x] both files moved to quarantine and renamed `.DISABLED`
- [x] original locations empty
- [x] `rclone` remote still reachable after the move
- [ ] **key deleted in GCP — OUTSTANDING, requires console/API access**

## Caveats

- The quarantine directory is on the same disk. It protects against accidental *use*,
  not against a full-disk compromise. Treat the key as compromised and revoke it.
- This document intentionally records no secret material — only identifiers needed to
  find and revoke the key.
