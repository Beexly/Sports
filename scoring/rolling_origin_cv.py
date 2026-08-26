"""Rolling-origin blocked CV for sports — temporal ordering respected.
Source: Hyndman fpp3 ch 5.10; Blocked CV from Rob Hyndman's notes.
Usage: for each season t in [2015..2025], train on 1999..(t-1), test t.
Blocks: never random-split across seasons (would leak future into past).
Status: DESIGN — our existing harness uses this implicitly; now explicit.
"""
print("ROLLING-ORIGIN: block by season order; no leakage across time")
