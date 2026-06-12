# Jarvis Tool Router

Code: `apps/web/lib/jarvis/tool-router.ts`. The router is a governed registry —
it does not execute anything. Every tool declares status, read/write surface,
risk, approval needs, and its next setup step.

## Registry (honest statuses)

| Tool | Category | Status | Write | Can run now |
|---|---|---|---|---|
| GitHub | SOURCE_CONTROL | DESIGNED | yes (gated) | no |
| Vercel | DEPLOYMENT | NOT_WIRED | yes (gated) | no |
| Gmail | COMMUNICATION | NOT_WIRED | yes (gated) | no |
| Calendar | CALENDAR | NOT_WIRED | yes (gated) | no |
| Contacts | COMMUNICATION | NOT_WIRED | no | no |
| WebSearch | SEARCH | PARTIAL | no | yes (session-dependent) |
| FileSearch | SEARCH | PARTIAL | no | yes (Claude Code sessions) |
| Vault | VAULT | WIRED | yes (gated) | reads yes, writes no |
| AirwaveData | DATA | PARTIAL | no | yes (demo ledger) |
| GSEData | DATA | WIRED | no | yes (DB reads) |
| GSNStudio | STUDIO | DESIGNED | yes (gated) | no |
| Browser | BROWSER | NOT_WIRED | yes (gated) | no |
| Voice_STT | VOICE | NOT_WIRED | no | no |
| Voice_TTS | VOICE | NOT_WIRED | no | no |
| Scheduler | SCHEDULER | PARTIAL | yes (gated) | no |

## Approval requirements

- **Invariant:** `canRunNow=false` and `approvalRequired=true` for every
  write-capable tool until an approval mechanism is wired.
- HIGH/CRITICAL-risk tools additionally require audit entries and scribe
  entries (`auditRequired`, `scribeRequired`).
- Browser automation must also pass the Scraping Clearance Engine; evasion
  tooling is never added to the registry (CLAUDE.md legal posture).

## Next wiring step

Route write requests through the action queue: tool call → ActionItem →
NEEDS_APPROVAL → owner sign-off → execution → audit entry → scribe entry.
