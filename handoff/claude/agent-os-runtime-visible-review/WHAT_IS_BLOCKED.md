# WHAT IS BLOCKED (by design — and correctly)

All blocked behind `FORBIDDEN_EXTERNAL_ACTIONS` (on every agent) and/or NOT_WIRED status:

- **External actions of any kind** — `externalActionsAllowed: false` hardcoded for all 23
  agents.
- **Publishing / public claims** — `PUBLISH`, `CHANGE_PUBLIC_CLAIM`, `ENABLE_PUBLIC_PICKS`
  forbidden; `workflowCanPublish()` ⇒ literal `false`.
- **Model-weight changes** — `CHANGE_MODEL_WEIGHT` forbidden;
  `workflowCanChangeModelWeights()` ⇒ literal `false`; PRISM/ASCEND "cannot change weights."
- **Spend / deploy / external send** — `SPEND_MONEY`, `DEPLOY`, `SEND_EXTERNAL` forbidden.
- **Protected-source scraping** — `SCRAPE_PROTECTED_SOURCE` forbidden; workflow run plan
  blocks on `PROTECTED_SOURCE` events.
- **Browser control (PILOT)** — NOT_WIRED, HIGH risk, "remain blocked until RELAY/tool bus
  and domain allowlist exist." `ENABLE_BROWSER_CONTROL` forbidden.
- **Voice control (ECHO)** — NOT_WIRED, HIGH risk, "remain blocked until Ask Jarvis and audit
  trail exist." `ENABLE_VOICE_CONTROL` forbidden.
- **Tool router / MCP (RELAY)** — NOT_WIRED; `ENABLE_EXTERNAL_TOOL` forbidden; owner approval
  required.
- **Unsettled-season historical work** — `isSettledHistoricalSeason(2026,2026)=false`;
  workflow run plan blocks `UNSETTLED_SEASON`; projection features `excludesUnsettledSeasons`.
- **Unsafe identity merges** — name-only player merge → AMBIGUOUS (never merges);
  commence-time-only game join → `UNSAFE_COMMENCE_TIME_ONLY`.
- **BullMQ orchestration without Redis** — degrades to documented `MANUAL_NO_REDIS`, does not
  fake-run.

No evasion tooling was added to any registry. Every block is labeled, not hidden.
