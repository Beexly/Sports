# Reasoning engine entry

`python reasoning_engine/emit_trace.py` gathers what this host can measure for PIT at CLE, week 4 2026, and writes `traces/cle-pit-week4-2026.json`.

Tools: EPA facets from the 2026 play-by-play (weeks before the game only), OL from injuries and the depth chart, tau from the fitted table, a live forecast if the free API answers, then `analyze()`.

A missing tool is a gap. The runner does not emit a pick or a probability. INVALID is a refusal, not a failed kill.
