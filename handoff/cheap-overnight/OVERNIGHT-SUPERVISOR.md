# Overnight supervisor (canonical) — 2026-09-23

**Canonical overnight supervisor:** OmniRoute `watchdog-loop.ps1`
- Path: `C:\Users\Garrett\.omniroute\watchdog\watchdog-loop.ps1`
- Keep live PID **18756** (do not kill / do not double-start)

**OpenCode Zen workers:** leave live `space-bunny-free` (and pickle/mimo) jobs alone.

**Do not:**
- Invent or restore `Sports\scripts\ops\cheap-overnight-watchdog.ps1` as a fake Zen supervisor
- Enable or copy `.cagent` Hermes/GLM cheap-overnight keepalive/proxy/watchdog into Sports
- Start Cursor cloud for overnight capacity

**Later hygiene (eng bandwidth):** reintroduce a real Sports `scripts\ops\cheap-overnight-watchdog.ps1` OpenCode-Zen path, or document OmniRoute as the permanent canonical wrapper in-repo. Not blocking overnight capacity.

**Stale:** `Beexly-CheapOvernight-Keepalive` / `Proxy` scheduled tasks (point at missing Sports scripts; last ran ~2026-08-23). Leave disabled until Zen-native scripts exist.

Kill switch (when Sports script exists again): `handoff\cheap-overnight\DONE.md` = `STOP`.
