SO-001: $19 product, Stripe 6oUdRb, $0 sales (cold X @SignaL_OriginHQ).
§
Neon: PROD gse-postgres/summer-brook-99380762. Access recipe + role caveats in the neon-db-access skill. snake_case tables w/ camelCase cols — quote camelCase. Never print conn strings. Node pg scripts need NODE_PATH=Sports-live/node_modules.
§
WebOperator: drive via node AppData/Local/hermes/scratch/wo-call.js <tool> [args_json]; browser_extract takes {refs} (@eN) only.
§
Roster: Hermes controls free workers via %LOCALAPPDATA%/hermes/scripts/workers.py. Orca fully removed 2026-10-14, Ollama 2026-10-09 — never reinstall. Parallel work = delegate_task or one of jules/devin/opencode/claude. Watch page dashboards/workers/index.html. Crons: 379a1798ce97 09:08 brief; 51283b90beeb bus-watchdog hourly.
§
GSE calibration (2026-09-30): Brier 0.2484 vs coin 0.25 — score only; RANKING monotone (<0.55=43.4%, >0.65=61.8%) but INFLATED ~5.2pt; fix=calibration map. trueProb in factorBreakdown->independentEdge. TS toolchain: tsc = node node_modules/typescript/bin/tsc --noEmit -p <pkg>; vitest = node node_modules/vitest/vitest.mjs run <test> from pkg dir; @sports root symlinks stale — alias in vitest.config.
§
Audit branch audit/reconciliation-2026-10-20 (Sports-wt-audit-20261020). Audit rules live in the autonomous-full-audit-workflow skill. Proximal bridge wired into causal-claim-gate.ts: bow-arc + proxies = publishable CAUSAL via PROXIMAL_BRIDGE. Raw Node imports repo .ts via reconciliation/ts-resolve-hook.mjs.
§
Hermes delegation.model = minimax/minimax-m3.1-flash:free (set via `hermes config set delegation.model ...`; the config file is write-protected to me, the CLI works). Subagents inherit it.
§
Roku IPTV: repo Beexly/roku-iptv. Live/vod/epg/setup at https://beexly.github.io/roku-iptv/. Pages serves .m3u as audio/x-mpegurl; gist/raw do not. CI=probe->deploy(artifact)->verify->summary, no commit-back; Pages build_type=workflow. ECP: launch is POST /launch/<id> (keypress/Launch 404s); screencap 404s on this TV.