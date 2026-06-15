# WHAT IS UI-ONLY

- **`app/cockpit/page.tsx` → `OperatingRuntimeZone`** is a **read-only visualization** of
  `buildJarvisOperatingAssessment()` + `summarizeAgentHealth()`. It renders:
  company-health badge (red-bordered; never green), reality counts (Not Wired "not capacity",
  Draft Only "review-gated", Manual "human trigger", Operational "real/partial" = 0), three
  separated columns (Top risks / Owner decisions / Claude review), and the public-gate /
  calibration / revenue / memory status strings.
- It adds **no control that executes anything** — no button that runs a workflow, enables a
  gate, publishes, or changes a weight. It is pure display.
- Helper components `QuickStat` / `RuntimeList` are presentational.

This is the right kind of UI-only: it surfaces the honest model without granting the page any
new authority.
