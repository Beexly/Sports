---
title: GSE Calibration Lab
emoji: 📉
colorFrom: indigo
colorTo: gray
sdk: gradio
app_file: app.py
pinned: false
short_description: Internal calibration analysis. Private Space + secrets required.
---

# GSE Calibration Lab

Internal calibration analysis for Galaxy Sports Edge.

> **This Space must be PRIVATE.** It displays calibration figures that have not
> cleared the PROVEN gate. The app refuses to start without
> `GSECAL_AUTH_USER` and `GSECAL_AUTH_PASS`, but that password-gates the page —
> it does not make the Space private. Both are required.

Analyses: production-parity Brier/ECE/Murphy, stratified ECE cancellation,
seeded bootstrap intervals, and the eligibility gate (read-only — it cannot
publish, promote, or flip anything).
